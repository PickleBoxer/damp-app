/**
 * IPC context exposer for projects
 * Exposes project management APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ProjectsContext } from '@shared/types/ipc';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  FolderSelectionResult,
  LaravelDetectionResult,
  VolumeCopyProgress,
} from '@shared/types/project';
import * as CHANNELS from './projects-channels';

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
      const listener = (_event: unknown, projectId: string, progress: VolumeCopyProgress) => {
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
