import { ipcMain } from 'electron';
import Docker from 'dockerode';
import {
  DOCKER_STATUS_CHANNEL,
  DOCKER_NETWORK_NAME_CHANNEL,
  DOCKER_ENSURE_NETWORK_CHANNEL,
  DOCKER_CONNECT_TO_NETWORK_CHANNEL,
  DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL,
} from './docker-channels';
import type { DockerStatus } from './docker-context';
import { dockerManager } from '../../../services/docker/docker-manager';

const docker = new Docker();

export function addDockerListeners() {
  ipcMain.handle(DOCKER_STATUS_CHANNEL, async (): Promise<DockerStatus> => {
    try {
      // Ping Docker daemon with timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Docker ping timeout (3s)')), 3000)
      );

      await Promise.race([docker.ping(), timeoutPromise]);
      console.log('✅ Docker is running');
      return { isRunning: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Docker error:', errorMessage);
      return {
        isRunning: false,
        error: errorMessage,
      };
    }
  });

  ipcMain.handle(DOCKER_NETWORK_NAME_CHANNEL, async (): Promise<string> => {
    return dockerManager.getNetworkName();
  });

  ipcMain.handle(DOCKER_ENSURE_NETWORK_CHANNEL, async (): Promise<void> => {
    await dockerManager.ensureNetworkExists();
  });

  ipcMain.handle(
    DOCKER_CONNECT_TO_NETWORK_CHANNEL,
    async (_event, containerIdOrName: string): Promise<void> => {
      await dockerManager.connectContainerToNetwork(containerIdOrName);
    }
  );

  ipcMain.handle(
    DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL,
    async (_event, containerIdOrName: string): Promise<void> => {
      await dockerManager.disconnectContainerFromNetwork(containerIdOrName);
    }
  );
}
