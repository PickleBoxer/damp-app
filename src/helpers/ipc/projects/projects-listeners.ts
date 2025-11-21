/**
 * IPC listeners for project operations
 * Handles all project-related IPC calls from renderer process
 */

import { ipcMain, BrowserWindow } from 'electron';
import type { CreateProjectInput, UpdateProjectInput } from '../../../types/project';
import { projectStateManager } from '../../../services/projects/project-state-manager';
import * as CHANNELS from './projects-channels';

/**
 * Add project event listeners
 */
export function addProjectsListeners(mainWindow: BrowserWindow): void {
  // Initialize project manager on first use
  let initPromise: Promise<void> | null = null;
  const ensureInitialized = async () => {
    if (!initPromise) {
      initPromise = projectStateManager.initialize();
    }
    await initPromise;
  };

  // Lazy-load docker manager only when needed (not on app startup)
  let dockerManagerPromise: Promise<
    typeof import('../../../services/docker/docker-manager')
  > | null = null;
  const getDockerManager = async () => {
    if (!dockerManagerPromise) {
      dockerManagerPromise = import('../../../services/docker/docker-manager');
    }
    return dockerManagerPromise;
  };

  /**
   * Get all projects
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_ALL, async () => {
    try {
      await ensureInitialized();
      return await projectStateManager.getAllProjects();
    } catch (error) {
      console.error('Failed to get all projects:', error);
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
      console.error(`Failed to get project ${projectId}:`, error);
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
      const onProgress = (progress: unknown) => {
        mainWindow.webContents.send(CHANNELS.PROJECTS_COPY_PROGRESS, input.name, progress);
      };

      return await projectStateManager.createProject(input, onProgress);
    } catch (error) {
      console.error('Failed to create project:', error);
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
      console.error(`Failed to update project ${input.id}:`, error);
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
        return await projectStateManager.deleteProject(projectId, removeVolume, removeFolder);
      } catch (error) {
        console.error(`Failed to delete project ${projectId}:`, error);
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
      return await projectStateManager.reorderProjects(projectIds);
    } catch (error) {
      console.error('Failed to reorder projects:', error);
      throw error;
    }
  });

  /**
   * Copy project files to volume
   */
  ipcMain.handle(CHANNELS.PROJECTS_COPY_TO_VOLUME, async (_event, projectId: string) => {
    try {
      await ensureInitialized();

      // Progress callback to send updates to renderer
      const onProgress = (progress: unknown) => {
        mainWindow.webContents.send(CHANNELS.PROJECTS_COPY_PROGRESS, projectId, progress);
      };

      return await projectStateManager.copyProjectToVolume(projectId, onProgress);
    } catch (error) {
      console.error(`Failed to copy project ${projectId} to volume:`, error);
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
      console.error('Failed to select folder:', error);
      throw error;
    }
  });

  /**
   * Detect Laravel in folder
   */
  ipcMain.handle(CHANNELS.PROJECTS_DETECT_LARAVEL, async (_event, folderPath: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.detectLaravel(folderPath);
    } catch (error) {
      console.error(`Failed to detect Laravel in ${folderPath}:`, error);
      throw error;
    }
  });

  /**
   * Check if devcontainer exists
   */
  ipcMain.handle(CHANNELS.PROJECTS_DEVCONTAINER_EXISTS, async (_event, folderPath: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.devcontainerExists(folderPath);
    } catch (error) {
      console.error(`Failed to check devcontainer existence in ${folderPath}:`, error);
      throw error;
    }
  });

  /**
   * Get container status for a project
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_CONTAINER_STATUS, async (_event, projectId: string) => {
    try {
      await ensureInitialized();
      const projects = await projectStateManager.getAllProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return { running: false, exists: false };
      }

      // Generate container name from project name
      const containerName = `${project.name.toLowerCase().replaceAll(/\s+/g, '_')}_devcontainer`;
      const dockerModule = await getDockerManager();
      const status = await dockerModule.dockerManager.getContainerStatus(containerName);

      return {
        running: status?.running || false,
        exists: status?.exists || false,
        ports: status?.ports || [],
      };
    } catch (error) {
      console.error('Failed to get container status:', error);
      return { running: false, exists: false };
    }
  });
}
