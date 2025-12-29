/**
 * IPC listeners for project operations
 * Handles all project-related IPC calls from renderer process
 */

import { ipcMain, BrowserWindow } from 'electron';
import { z } from 'zod';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  VolumeCopyProgress,
} from '@shared/types/project';
import { projectStateManager } from '@main/domains/projects/project-state-manager';
import * as CHANNELS from './projects-channels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('projects-ipc');

// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation schemas
const projectIdSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format');
const projectIdsSchema = z.array(z.string().regex(UUID_REGEX, 'Invalid UUID format'));

// Prevent duplicate listener registration
let listenersAdded = false;

/**
 * Add project event listeners
 */
export function addProjectsListeners(mainWindow: BrowserWindow): void {
  if (listenersAdded) return;
  listenersAdded = true;
  // Initialize project manager on first use
  let initPromise: Promise<void> | null = null;
  const ensureInitialized = async () => {
    initPromise ??= projectStateManager.initialize();
    await initPromise;
  };

  /**
   * Get all projects
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_ALL, async () => {
    try {
      await ensureInitialized();
      return await projectStateManager.getAllProjects();
    } catch (error) {
      logger.error('Failed to get all projects', { error });
      throw error;
    }
  });

  /**
   * Get a specific project
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_ONE, async (_event, projectId: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.getProject(projectId);
    } catch (error) {
      logger.error('Failed to get project', { projectId, error });
      throw error;
    }
  });

  /**
   * Create a project
   */
  ipcMain.handle(CHANNELS.PROJECTS_CREATE, async (_event, input: CreateProjectInput) => {
    try {
      await ensureInitialized();

      // Progress callback to send updates to renderer
      const onProgress = (progress: VolumeCopyProgress) => {
        if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send(CHANNELS.PROJECTS_COPY_PROGRESS, input.name, progress);
        }
      };

      return await projectStateManager.createProject(input, onProgress);
    } catch (error) {
      logger.error('Failed to create project', { error });
      throw error;
    }
  });

  /**
   * Update a project
   */
  ipcMain.handle(CHANNELS.PROJECTS_UPDATE, async (_event, input: UpdateProjectInput) => {
    try {
      await ensureInitialized();
      return await projectStateManager.updateProject(input);
    } catch (error) {
      logger.error('Failed to update project', { projectId: input.id, error });
      throw error;
    }
  });

  /**
   * Delete a project
   */
  ipcMain.handle(
    CHANNELS.PROJECTS_DELETE,
    async (_event, projectId: string, removeVolume = false, removeFolder = false) => {
      try {
        await ensureInitialized();
        // Validate projectId
        projectIdSchema.parse(projectId);
        return await projectStateManager.deleteProject(projectId, removeVolume, removeFolder);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.issues.map(issue => issue.message).join(', ');
          logger.error('Invalid project ID', { error: errorMessage });
          throw new Error(`Invalid project ID: ${errorMessage}`);
        }
        logger.error('Failed to delete project', { projectId, error });
        throw error;
      }
    }
  );

  /**
   * Reorder projects
   */
  ipcMain.handle(CHANNELS.PROJECTS_REORDER, async (_event, projectIds: string[]) => {
    try {
      await ensureInitialized();
      // Validate projectIds array
      projectIdsSchema.parse(projectIds);
      return await projectStateManager.reorderProjects(projectIds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map(issue => issue.message).join(', ');
        logger.error('Invalid project IDs', { error: errorMessage });
        throw new Error(`Invalid project IDs: ${errorMessage}`);
      }
      logger.error('Failed to reorder projects', { error });
      throw error;
    }
  });

  /**
   * Open folder selection dialog
   */
  ipcMain.handle(CHANNELS.PROJECTS_SELECT_FOLDER, async (_event, defaultPath?: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.selectFolder(defaultPath);
    } catch (error) {
      logger.error('Failed to select folder', { error });
      throw error;
    }
  });

  /**
   * Get container status for a specific project
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_CONTAINER_STATE, async (_event, projectId: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.getProjectContainerState(projectId);
    } catch (error) {
      logger.error('Failed to get project container state', { projectId, error });
      throw error;
    }
  });
}
