import { contextBridge, ipcRenderer } from 'electron';
import {
  DOCKER_STATUS_CHANNEL,
  DOCKER_NETWORK_NAME_CHANNEL,
  DOCKER_ENSURE_NETWORK_CHANNEL,
  DOCKER_CONNECT_TO_NETWORK_CHANNEL,
  DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL,
} from './docker-channels';

export interface DockerStatus {
  isRunning: boolean;
  error?: string;
}

export interface DockerContext {
  getStatus: () => Promise<DockerStatus>;
  getNetworkName: () => Promise<string>;
  ensureNetwork: () => Promise<void>;
  connectToNetwork: (containerIdOrName: string) => Promise<void>;
  disconnectFromNetwork: (containerIdOrName: string) => Promise<void>;
}

export function exposeDockerContext() {
  contextBridge.exposeInMainWorld('docker', {
    getStatus: () => ipcRenderer.invoke(DOCKER_STATUS_CHANNEL),
    getNetworkName: () => ipcRenderer.invoke(DOCKER_NETWORK_NAME_CHANNEL),
    ensureNetwork: () => ipcRenderer.invoke(DOCKER_ENSURE_NETWORK_CHANNEL),
    connectToNetwork: (containerIdOrName: string) =>
      ipcRenderer.invoke(DOCKER_CONNECT_TO_NETWORK_CHANNEL, containerIdOrName),
    disconnectFromNetwork: (containerIdOrName: string) =>
      ipcRenderer.invoke(DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL, containerIdOrName),
  });
}
