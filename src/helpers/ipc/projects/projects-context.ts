/**
 * IPC context exposer for projects
 * Exposes project management APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { CreateProjectInput, UpdateProjectInput } from '../../../types/project';
import * as CHANNELS from './projects-channels';

export interface ProjectsContext {
  /**
   * Get all projects
   */
  getAllProjects: () => Promise<unknown>;

  /**
   * Get a specific project by ID
   */
  getProject: (projectId: string) => Promise<unknown>;

  /**
   * Create a new project
   */
  createProject: (input: CreateProjectInput) => Promise<unknown>;

  /**
   * Update a project
   */
  updateProject: (input: UpdateProjectInput) => Promise<unknown>;

  /**
   * Delete a project
   */
  deleteProject: (
    projectId: string,
    removeVolume?: boolean,
    removeFolder?: boolean
  ) => Promise<unknown>;

  /**
   * Reorder projects
   */
  reorderProjects: (projectIds: string[]) => Promise<unknown>;

  /**
   * Copy project files to volume
   */
  copyProjectToVolume: (projectId: string) => Promise<unknown>;

  /**
   * Open folder selection dialog
   */
  selectFolder: (defaultPath?: string) => Promise<unknown>;

  /**
   * Detect Laravel in folder
   */
  detectLaravel: (folderPath: string) => Promise<unknown>;

  /**
   * Check if devcontainer exists
   */
  devcontainerExists: (folderPath: string) => Promise<unknown>;

  /**
   * Get container status for multiple projects in a single call (optimized)
   */
  getBatchContainerStatus: (projectIds: string[]) => Promise<
    Array<{
      projectId: string;
      running: boolean;
      exists: boolean;
      ports: Array<[string, string]>;
    }>
  >;

  /**
   * Discover the forwarded localhost port for a container
   * Scans ports 8080-8090 and checks X-Container-Name header
   */
  discoverPort: (containerName: string) => Promise<number | null>;

  /**
   * Subscribe to volume copy progress events
   */
  onCopyProgress: (callback: (projectId: string, progress: unknown) => void) => () => void;
}

/**
 * Expose projects context to renderer
 */
export function exposeProjectsContext(): void {
  const projectsApi: ProjectsContext = {
    getAllProjects: () => ipcRenderer.invoke(CHANNELS.PROJECTS_GET_ALL),

    getProject: (projectId: string) => ipcRenderer.invoke(CHANNELS.PROJECTS_GET_ONE, projectId),

    createProject: (input: CreateProjectInput) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_CREATE, input),

    updateProject: (input: UpdateProjectInput) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_UPDATE, input),

    deleteProject: (projectId: string, removeVolume = false, removeFolder = false) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_DELETE, projectId, removeVolume, removeFolder),

    reorderProjects: (projectIds: string[]) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_REORDER, projectIds),

    copyProjectToVolume: (projectId: string) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_COPY_TO_VOLUME, projectId),

    selectFolder: (defaultPath?: string) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_SELECT_FOLDER, defaultPath),

    detectLaravel: (folderPath: string) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_DETECT_LARAVEL, folderPath),

    devcontainerExists: (folderPath: string) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_DEVCONTAINER_EXISTS, folderPath),

    getBatchContainerStatus: (projectIds: string[]) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_GET_BATCH_STATUS, projectIds),

    discoverPort: (containerName: string) =>
      ipcRenderer.invoke(CHANNELS.PROJECTS_DISCOVER_PORT, containerName),

    onCopyProgress: callback => {
      const listener = (_event: unknown, projectId: string, progress: unknown) => {
        callback(projectId, progress);
      };
      ipcRenderer.on(CHANNELS.PROJECTS_COPY_PROGRESS, listener);

      // Return cleanup function
      return () => {
        ipcRenderer.off(CHANNELS.PROJECTS_COPY_PROGRESS, listener);
      };
    },
  };

  contextBridge.exposeInMainWorld('projects', projectsApi);
}
