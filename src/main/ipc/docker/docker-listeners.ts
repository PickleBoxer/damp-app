import { ipcMain } from 'electron';
import Docker from 'dockerode';
import {
  DOCKER_STATUS_CHANNEL,
  DOCKER_INFO_CHANNEL,
  DOCKER_ENSURE_NETWORK_CHANNEL,
  DOCKER_NETWORK_STATUS_CHANNEL,
} from './docker-channels';
import { dockerManager } from '@main/services/docker/docker-manager';
import { DOCKER_TIMEOUTS } from './docker-constants';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('docker-ipc');

const docker = new Docker();

// Prevent duplicate listener registration
let listenersAdded = false;

export function addDockerListeners() {
  if (listenersAdded) return;
  listenersAdded = true;
  ipcMain.handle(
    DOCKER_STATUS_CHANNEL,
    async (): Promise<{ isRunning: boolean; error?: string }> => {
      try {
        // Ping Docker daemon with timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Docker ping timeout (${DOCKER_TIMEOUTS.PING}ms)`)),
            DOCKER_TIMEOUTS.PING
          )
        );

        await Promise.race([docker.ping(), timeoutPromise]);
        logger.debug('Docker is running');
        return { isRunning: true };
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
        // Get Docker info with timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Docker info timeout (${DOCKER_TIMEOUTS.INFO}ms)`)),
            DOCKER_TIMEOUTS.INFO
          )
        );

        const info = await Promise.race([docker.info(), timeoutPromise]);
        logger.debug('Docker info retrieved');

        // Get running containers for CPU and memory calculation
        let cpuUsagePercent = 0;
        let memoryUsed = 0;

        try {
          // List containers with timeout
          const listTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error(`List containers timeout (${DOCKER_TIMEOUTS.LIST_CONTAINERS}ms)`)),
              DOCKER_TIMEOUTS.LIST_CONTAINERS
            )
          );
          const containers = await Promise.race([
            docker.listContainers({ all: false }),
            listTimeoutPromise,
          ]);

          if (containers.length > 0) {
            // Get stats for all running containers
            const statsPromises = containers.map(async containerInfo => {
              try {
                const container = docker.getContainer(containerInfo.Id);

                // Get stats with timeout (2s per container)
                const statsTimeoutPromise = new Promise<never>((_, reject) =>
                  setTimeout(
                    () =>
                      reject(
                        new Error(`Container stats timeout (${DOCKER_TIMEOUTS.CONTAINER_STATS}ms)`)
                      ),
                    DOCKER_TIMEOUTS.CONTAINER_STATS
                  )
                );
                const stats = await Promise.race([
                  container.stats({ stream: false }),
                  statsTimeoutPromise,
                ]);

                // Calculate CPU percentage
                const cpuDelta =
                  stats.cpu_stats.cpu_usage.total_usage -
                  (stats.precpu_stats.cpu_usage?.total_usage || 0);
                const systemDelta =
                  stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
                const cpuCount = stats.cpu_stats.online_cpus || info.NCPU || 1;

                let cpuPercent = 0;
                if (systemDelta > 0 && cpuDelta > 0) {
                  cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100;
                }

                // Get memory usage
                const memUsage = stats.memory_stats.usage || 0;

                return { cpu: cpuPercent, memory: memUsage };
              } catch {
                return { cpu: 0, memory: 0 };
              }
            });

            const allStats = await Promise.all(statsPromises);
            cpuUsagePercent = allStats.reduce((sum, stat) => sum + stat.cpu, 0);
            memoryUsed = allStats.reduce((sum, stat) => sum + stat.memory, 0);
          }
        } catch (error) {
          logger.warn('Failed to get container stats', { error });
        }

        // Extract relevant stats
        return {
          cpus: info.NCPU || 0,
          cpuUsagePercent: Math.round(cpuUsagePercent * 100) / 100, // Round to 2 decimals
          memTotal: info.MemTotal || 0,
          memUsed: memoryUsed, // Actual memory used by containers
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Docker info error', { error: errorMessage });
        throw new Error(`Failed to get Docker info: ${errorMessage}`);
      }
    }
  );

  ipcMain.handle(DOCKER_ENSURE_NETWORK_CHANNEL, async (): Promise<void> => {
    try {
      await dockerManager.ensureNetworkExists();
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
        const dockerAvailable = await dockerManager.isDockerAvailable();

        if (!dockerAvailable) {
          return { exists: false, dockerAvailable: false };
        }

        // Check if network exists
        const exists = await dockerManager.checkNetworkExists();
        return { exists, dockerAvailable: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Docker network status error', { error: errorMessage });
        return { exists: false, dockerAvailable: false };
      }
    }
  );
}
