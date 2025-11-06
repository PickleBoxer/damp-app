import { contextBridge, ipcRenderer } from 'electron';
import { DOCKER_STATUS_CHANNEL } from './docker-channels';

export interface DockerStatus {
  isRunning: boolean;
  error?: string;
}

export interface DockerContext {
  getStatus: () => Promise<DockerStatus>;
}

export function exposeDockerContext() {
  contextBridge.exposeInMainWorld('docker', {
    getStatus: () => ipcRenderer.invoke(DOCKER_STATUS_CHANNEL),
  });
}
