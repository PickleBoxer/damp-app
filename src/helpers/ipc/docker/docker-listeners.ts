import { ipcMain } from 'electron';
import Docker from 'dockerode';
import { DOCKER_STATUS_CHANNEL } from './docker-channels';
import type { DockerStatus } from './docker-context';

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
}
