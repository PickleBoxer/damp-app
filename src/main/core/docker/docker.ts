/**
 * Core Docker client and system operations
 * Shared Docker instance used by all Docker modules
 */

import Docker from 'dockerode';
import { LABEL_KEYS } from '@shared/constants/labels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('Docker');

/**
 * Shared Docker client instance
 * Used by container, network, and volume modules
 */
export const docker = new Docker();

/**
 * Docker operation timeout constants (in milliseconds)
 */
export const DOCKER_TIMEOUTS = {
  /** Timeout for Docker daemon ping operation */
  PING: 3000,
  /** Timeout for Docker info retrieval */
  INFO: 3000,
  /** Timeout for listing containers */
  LIST_CONTAINERS: 3000,
  /** Timeout for getting container stats */
  CONTAINER_STATS: 2000,
} as const;

/**
 * Check if Docker is available and running
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Docker system stats including CPU and memory usage for managed containers
 */
export async function getManagedContainersStats(): Promise<{
  cpus: number;
  cpuUsagePercent: number;
  memTotal: number;
  memUsed: number;
}> {
  try {
    // Get Docker info with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Docker info timeout (${DOCKER_TIMEOUTS.INFO}ms)`)),
        DOCKER_TIMEOUTS.INFO
      )
    );

    const info = await Promise.race([docker.info(), timeoutPromise]);

    // Get running managed containers for CPU and memory calculation
    let cpuUsagePercent = 0;
    let memoryUsed = 0;

    try {
      // List containers with timeout
      const listTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`List containers timeout (${DOCKER_TIMEOUTS.LIST_CONTAINERS}ms)`)),
          DOCKER_TIMEOUTS.LIST_CONTAINERS
        )
      );

      // Filter containers to only app-managed containers
      const containers = await Promise.race([
        docker.listContainers({
          all: false,
          filters: {
            label: [`${LABEL_KEYS.MANAGED}=true`],
          },
        }),
        listTimeoutPromise,
      ]);

      if (containers.length > 0) {
        // Get stats for all running containers
        const statsPromises = containers.map(async containerInfo => {
          try {
            const container = docker.getContainer(containerInfo.Id);

            // Get stats with timeout
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

    return {
      cpus: info.NCPU || 0,
      cpuUsagePercent: Math.round(cpuUsagePercent * 100) / 100, // Round to 2 decimals
      memTotal: info.MemTotal || 0,
      memUsed: memoryUsed,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get Docker system stats', { error: errorMessage });
    throw new Error(`Failed to get Docker system stats: ${errorMessage}`);
  }
}
