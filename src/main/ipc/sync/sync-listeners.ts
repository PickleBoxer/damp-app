/**
 * IPC listeners for volume sync operations
 * Handles sync operations between Docker volumes and local folders
 */

import { ipcMain, BrowserWindow } from 'electron';
import { z } from 'zod';
import { SYNC_FROM_VOLUME, SYNC_TO_VOLUME, SYNC_CANCEL, SYNC_PROGRESS } from './sync-channels';
import {
  isDockerAvailable,
  stopAndRemoveContainer,
  syncFromVolume,
  syncToVolume,
} from '@main/core/docker';
import { createLogger } from '@main/utils/logger';
import { syncQueue } from '@main/domains/projects/sync-queue';

const logger = createLogger('sync-ipc');

// Define types locally
interface SyncOptions {
  includeNodeModules?: boolean;
  includeVendor?: boolean;
}

interface SyncResult {
  success: boolean;
  error?: string;
}

// Validation schemas
const projectIdSchema = z.string().refine(
  val => {
    // UUID v4 regex pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  },
  { message: 'Invalid project ID format' }
);
const syncOptionsSchema = z
  .object({
    includeNodeModules: z.boolean().optional(),
    includeVendor: z.boolean().optional(),
  })
  .optional();

// Track active sync containers for cancellation support
const activeSyncContainers = new Map<string, string>(); // projectId -> containerId

/**
 * Add sync event listeners
 */
export function addSyncListeners(mainWindow: BrowserWindow): void {
  // Remove existing handlers to prevent duplicates
  ipcMain.removeHandler(SYNC_FROM_VOLUME);
  ipcMain.removeHandler(SYNC_TO_VOLUME);
  ipcMain.removeHandler(SYNC_CANCEL);

  // Lazy-load and initialize project state manager once
  let projectManagerPromise: Promise<
    typeof import('@main/domains/projects/project-state-manager')
  > | null = null;
  let isProjectManagerInitialized = false;
  let initializationPromise: Promise<void> | null = null;

  const getProjectManager = async () => {
    projectManagerPromise ??= import('@main/domains/projects/project-state-manager');
    const module = await projectManagerPromise;

    // Initialize once with guard against race conditions
    if (!isProjectManagerInitialized) {
      initializationPromise ??= module.projectStateManager.initialize().then(() => {
        isProjectManagerInitialized = true;
      });
      await initializationPromise;
    }

    return module;
  };

  /**
   * Sync from Docker volume to local folder
   */
  ipcMain.handle(
    SYNC_FROM_VOLUME,
    async (_event, projectId: string, options: SyncOptions = {}): Promise<SyncResult> => {
      // Validate inputs
      try {
        projectIdSchema.parse(projectId);
        syncOptionsSchema.parse(options);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.issues.map(issue => issue.message).join(', ');
          return { success: false, error: `Invalid input: ${errorMessage}` };
        }
      }

      // Check if Docker is running
      const isDockerRunning = await isDockerAvailable();
      if (!isDockerRunning) {
        logger.error('Docker is not available');
        return {
          success: false,
          error: 'Docker is not running. Please start Docker Desktop.',
        };
      }

      // Get project details
      try {
        const { projectStateManager } = await getProjectManager();
        const project = await projectStateManager.getProject(projectId);

        if (!project) {
          return {
            success: false,
            error: `Project with ID "${projectId}" not found`,
          };
        }

        // Notify that sync has started
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          mainWindow.webContents &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'from', { status: 'started' });
        }

        // Execute sync from volume to local folder with queue management
        await syncQueue.execute(projectId, async () => {
          await syncFromVolume(
            project.volumeName,
            project.path,
            project.id,
            {
              includeNodeModules: options.includeNodeModules ?? false,
              includeVendor: options.includeVendor ?? false,
            },
            containerId => {
              // Track container for cancellation support
              activeSyncContainers.set(projectId, containerId);
            },
            progress => {
              // Forward progress updates to renderer
              if (
                mainWindow &&
                !mainWindow.isDestroyed() &&
                mainWindow.webContents &&
                !mainWindow.webContents.isDestroyed()
              ) {
                mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'from', {
                  status: 'progress',
                  percentage: progress.percentage,
                  bytesTransferred: progress.bytes,
                });
              }
            }
          );
        });

        // Sync completed successfully
        activeSyncContainers.delete(projectId);
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          mainWindow.webContents &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'from', {
            status: 'completed',
          });
        }

        // Return immediately - sync runs in background
        return { success: true };
      } catch (error) {
        logger.error('Failed to get project details for sync from volume', { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  /**
   * Sync from local folder to Docker volume
   */
  ipcMain.handle(
    SYNC_TO_VOLUME,
    async (_event, projectId: string, options: SyncOptions = {}): Promise<SyncResult> => {
      // Validate inputs
      try {
        projectIdSchema.parse(projectId);
        syncOptionsSchema.parse(options);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.issues.map(issue => issue.message).join(', ');
          return { success: false, error: `Invalid input: ${errorMessage}` };
        }
      }

      // Check if Docker is running
      const isDockerRunning = await isDockerAvailable();
      if (!isDockerRunning) {
        return {
          success: false,
          error: 'Docker is not running. Please start Docker Desktop.',
        };
      }

      // Get project details
      try {
        const { projectStateManager } = await getProjectManager();
        const project = await projectStateManager.getProject(projectId);

        if (!project) {
          return {
            success: false,
            error: `Project with ID "${projectId}" not found`,
          };
        }

        // Notify that sync has started
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          mainWindow.webContents &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'to', { status: 'started' });
        }

        // Execute sync from local folder to volume with queue management
        await syncQueue.execute(projectId, async () => {
          await syncToVolume(
            project.path,
            project.volumeName,
            project.id,
            {
              includeNodeModules: options.includeNodeModules ?? false,
              includeVendor: options.includeVendor ?? false,
            },
            containerId => {
              // Track container for cancellation support
              activeSyncContainers.set(projectId, containerId);
            },
            progress => {
              // Forward progress updates to renderer
              if (
                mainWindow &&
                !mainWindow.isDestroyed() &&
                mainWindow.webContents &&
                !mainWindow.webContents.isDestroyed()
              ) {
                mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'to', {
                  status: 'progress',
                  percentage: progress.percentage,
                  bytesTransferred: progress.bytes,
                });
              }
            }
          );
        });

        // Sync completed successfully
        activeSyncContainers.delete(projectId);
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          mainWindow.webContents &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'to', { status: 'completed' });
        }

        // Return immediately - sync runs in background
        return { success: true };
      } catch (error) {
        // Clean up on error
        activeSyncContainers.delete(projectId);

        // Notify renderer of failure
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          mainWindow.webContents &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'to', { status: 'failed' });
        }

        logger.error('Failed to get project details for sync to volume', { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  /**
   * Cancel an in-progress or queued sync operation
   */
  ipcMain.handle(SYNC_CANCEL, async (_event, projectId: string): Promise<SyncResult> => {
    // Validate input
    try {
      projectIdSchema.parse(projectId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map(issue => issue.message).join(', ');
        return { success: false, error: `Invalid input: ${errorMessage}` };
      }
    }

    try {
      // Try to cancel from queue first (if not yet started)
      if (syncQueue.cancel(projectId)) {
        logger.info(`Cancelled queued sync for project ${projectId}`);
        return { success: true };
      }

      // Stop running container if exists
      const containerId = activeSyncContainers.get(projectId);
      if (!containerId) {
        return { success: false, error: 'No active sync found for this project' };
      }

      logger.info(`Stopping active sync container ${containerId} for project ${projectId}`);

      await stopAndRemoveContainer(containerId, 2);

      // Clean up tracking
      activeSyncContainers.delete(projectId);

      // Notify renderer that sync was cancelled
      if (
        mainWindow &&
        !mainWindow.isDestroyed() &&
        mainWindow.webContents &&
        !mainWindow.webContents.isDestroyed()
      ) {
        mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'from', { status: 'failed' });
      }

      logger.info(`Successfully cancelled sync for project ${projectId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel sync', { error, projectId });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
