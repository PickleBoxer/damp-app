/**
 * IPC listeners for volume sync operations
 * Handles sync operations between Docker volumes and local folders
 */

import { ipcMain, BrowserWindow } from 'electron';
import { z } from 'zod';
import Docker from 'dockerode';
import { SYNC_FROM_VOLUME, SYNC_TO_VOLUME, SYNC_PROGRESS } from './sync-channels';
import type { SyncOptions, SyncResult } from './sync-context';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('sync-ipc');

const docker = new Docker();

// Validation schemas
const projectIdSchema = z.string().uuid();
const syncOptionsSchema = z
  .object({
    includeNodeModules: z.boolean().optional(),
    includeVendor: z.boolean().optional(),
  })
  .optional();

/**
 * Add sync event listeners
 */
export function addSyncListeners(mainWindow: BrowserWindow): void {
  // Remove existing handlers to prevent duplicates
  ipcMain.removeHandler(SYNC_FROM_VOLUME);
  ipcMain.removeHandler(SYNC_TO_VOLUME);

  // Lazy-load and initialize project state manager once
  let projectManagerPromise: Promise<
    typeof import('../../../services/projects/project-state-manager')
  > | null = null;
  let isProjectManagerInitialized = false;
  let initializationPromise: Promise<void> | null = null;

  const getProjectManager = async () => {
    projectManagerPromise ??= import('../../../services/projects/project-state-manager');
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

  let volumeManagerPromise: Promise<
    typeof import('../../../services/projects/volume-manager')
  > | null = null;
  const getVolumeManager = async () => {
    volumeManagerPromise ??= import('../../../services/projects/volume-manager');
    return volumeManagerPromise;
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
      try {
        await docker.ping();
      } catch (error) {
        logger.error('Docker ping failed', { error });
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

        // Execute sync from volume to local folder asynchronously (non-blocking)
        // Don't await - let it run in background and notify when done
        const { volumeManager } = await getVolumeManager();
        volumeManager
          .syncFromVolume(project.volumeName, project.path, {
            includeNodeModules: options.includeNodeModules ?? false,
            includeVendor: options.includeVendor ?? false,
          })
          .then(() => {
            // Notify that sync has completed
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
          })
          .catch((error: unknown) => {
            logger.error('Failed to sync from volume', { error });
            // Notify that sync has failed
            if (
              mainWindow &&
              !mainWindow.isDestroyed() &&
              mainWindow.webContents &&
              !mainWindow.webContents.isDestroyed()
            ) {
              mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'from', { status: 'failed' });
            }
          });

        // Return immediately - sync runs in background
        return { success: true };
      } catch (error) {
        console.error('Failed to get project details:', error);
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
      try {
        await docker.ping();
      } catch {
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

        // Execute sync from local folder to volume asynchronously (non-blocking)
        // Don't await - let it run in background and notify when done
        const { volumeManager } = await getVolumeManager();
        volumeManager
          .syncToVolume(project.path, project.volumeName, {
            includeNodeModules: options.includeNodeModules ?? false,
            includeVendor: options.includeVendor ?? false,
          })
          .then(() => {
            // Notify that sync has completed
            if (
              mainWindow &&
              !mainWindow.isDestroyed() &&
              mainWindow.webContents &&
              !mainWindow.webContents.isDestroyed()
            ) {
              mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'to', { status: 'completed' });
            }
          })
          .catch((error: unknown) => {
            logger.error('Failed to sync to volume', { error });
            // Notify that sync has failed
            if (
              mainWindow &&
              !mainWindow.isDestroyed() &&
              mainWindow.webContents &&
              !mainWindow.webContents.isDestroyed()
            ) {
              mainWindow.webContents.send(SYNC_PROGRESS, projectId, 'to', { status: 'failed' });
            }
          });

        // Return immediately - sync runs in background
        return { success: true };
      } catch (error) {
        console.error('Failed to get project details:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );
}
