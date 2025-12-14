import { contextBridge, ipcRenderer } from 'electron';
import type { DockerContext } from '@shared/types/ipc';
import {
  DOCKER_STATUS_CHANNEL,
  DOCKER_INFO_CHANNEL,
  DOCKER_NETWORK_NAME_CHANNEL,
  DOCKER_ENSURE_NETWORK_CHANNEL,
  DOCKER_CONNECT_TO_NETWORK_CHANNEL,
  DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL,
} from './docker-channels';

export function exposeDockerContext() {
  const dockerApi: DockerContext = {
    getStatus: () => ipcRenderer.invoke(DOCKER_STATUS_CHANNEL),
    getInfo: () => ipcRenderer.invoke(DOCKER_INFO_CHANNEL),
    getNetworkName: () => ipcRenderer.invoke(DOCKER_NETWORK_NAME_CHANNEL),
    ensureNetwork: () => ipcRenderer.invoke(DOCKER_ENSURE_NETWORK_CHANNEL),
    connectToNetwork: (containerIdOrName: string) =>
      ipcRenderer.invoke(DOCKER_CONNECT_TO_NETWORK_CHANNEL, containerIdOrName),
    disconnectFromNetwork: (containerIdOrName: string) =>
      ipcRenderer.invoke(DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL, containerIdOrName),
  };

  contextBridge.exposeInMainWorld('docker', dockerApi);
}
