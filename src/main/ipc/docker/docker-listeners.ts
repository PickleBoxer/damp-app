import { ipcMain } from 'electron';
import {
  DOCKER_STATUS_CHANNEL,
  DOCKER_INFO_CHANNEL,
  DOCKER_ENSURE_NETWORK_CHANNEL,
  DOCKER_NETWORK_STATUS_CHANNEL,
} from './docker-channels';
import {
  isDockerAvailable,
  getManagedContainersStats,
  ensureNetworkExists,
  checkNetworkExists,
} from '@main/core/docker';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('docker-ipc');

// Prevent duplicate listener registration
let listenersAdded = false;

export function addDockerListeners() {
  if (listenersAdded) return;
  listenersAdded = true;
  ipcMain.handle(
    DOCKER_STATUS_CHANNEL,
    async (): Promise<{ isRunning: boolean; error?: string }> => {
      try {
        const isRunning = await isDockerAvailable();
        if (isRunning) {
          logger.debug('Docker is running');
          return { isRunning: true };
        } else {
          return {
            isRunning: false,
            error: 'Docker daemon is not responding',
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Docker error', { error: errorMessage });
        return {
          isRunning: false,
          error: errorMessage,
        };
      }
    }
  );

  ipcMain.handle(
    DOCKER_INFO_CHANNEL,
    async (): Promise<{
      cpus: number;
      cpuUsagePercent: number;
      memTotal: number;
      memUsed: number;
    }> => {
      try {
        const stats = await getManagedContainersStats();
        logger.debug('Docker info retrieved');
        return stats;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Docker info error', { error: errorMessage });
        throw new Error(`Failed to get Docker info: ${errorMessage}`);
      }
    }
  );

  ipcMain.handle(DOCKER_ENSURE_NETWORK_CHANNEL, async (): Promise<void> => {
    try {
      await ensureNetworkExists();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Docker ensure network error', { error: errorMessage });
      throw new Error(`Failed to ensure network exists: ${errorMessage}`);
    }
  });

  ipcMain.handle(
    DOCKER_NETWORK_STATUS_CHANNEL,
    async (): Promise<{ exists: boolean; dockerAvailable: boolean }> => {
      try {
        // First check if Docker is available
        const dockerAvailable = await isDockerAvailable();

        if (!dockerAvailable) {
          return { exists: false, dockerAvailable: false };
        }

        // Check if network exists
        const exists = await checkNetworkExists();
        return { exists, dockerAvailable: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Docker network status error', { error: errorMessage });
        return { exists: false, dockerAvailable: false };
      }
    }
  );
}
