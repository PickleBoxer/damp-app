import { contextBridge, ipcRenderer } from 'electron';
import type { DockerContext } from '@shared/types/ipc';
import {
  DOCKER_STATUS_CHANNEL,
  DOCKER_INFO_CHANNEL,
  DOCKER_ENSURE_NETWORK_CHANNEL,
  DOCKER_NETWORK_STATUS_CHANNEL,
} from './docker-channels';

export function exposeDockerContext() {
  const dockerApi: DockerContext = {
    getStatus: () => ipcRenderer.invoke(DOCKER_STATUS_CHANNEL),
    getInfo: () => ipcRenderer.invoke(DOCKER_INFO_CHANNEL),
    ensureNetwork: () => ipcRenderer.invoke(DOCKER_ENSURE_NETWORK_CHANNEL),
    getNetworkStatus: () => ipcRenderer.invoke(DOCKER_NETWORK_STATUS_CHANNEL),
  };

  contextBridge.exposeInMainWorld('docker', dockerApi);
}
