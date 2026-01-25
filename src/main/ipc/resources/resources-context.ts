import type { ResourcesContext } from '@shared/types/ipc';
import { contextBridge, ipcRenderer } from 'electron';
import {
  RESOURCES_DELETE,
  RESOURCES_GET_ALL,
  RESOURCES_UPDATE_SERVICE,
} from './resources-channels';

export function exposeResourcesContext() {
  const resourcesApi: ResourcesContext = {
    getAll: () => ipcRenderer.invoke(RESOURCES_GET_ALL),
    deleteResource: (type: string, id: string) =>
      ipcRenderer.invoke(RESOURCES_DELETE, { type, id }),
    updateService: (serviceId: string) =>
      ipcRenderer.invoke(RESOURCES_UPDATE_SERVICE, { serviceId }),
  };

  contextBridge.exposeInMainWorld('resources', resourcesApi);
}
