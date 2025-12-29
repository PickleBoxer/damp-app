/**
 * Docker manager using dockerode
 * Handles all Docker operations for service containers
 */

import Docker from 'dockerode';
import type { ContainerCreateOptions } from 'dockerode';
import type {
  ServiceConfig,
  CustomConfig,
  PullProgress,
  ContainerState,
} from '@shared/types/service';
import type { PortMapping } from '@shared/types/container';
import { DAMP_NETWORK_NAME } from '@shared/constants/docker';
import { buildNetworkLabels, LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { getAvailablePorts } from './port-checker';
import * as tar from 'tar-stream';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('DockerManager');

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
 * Docker manager singleton
 */
class DockerManager {
  readonly docker: Docker;

  constructor() {
    // Initialize Docker client - will use default socket/pipe
    this.docker = new Docker();
  }

  /**
   * Check if Docker is available and running
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the shared DAMP network exists
   * Creates a bridge network if it doesn't exist
   */
  async ensureNetworkExists(): Promise<void> {
    try {
      const networks = await this.docker.listNetworks({
        filters: { name: [DAMP_NETWORK_NAME] },
      });

      // Check if network already exists
      const networkExists = networks.some(net => net.Name === DAMP_NETWORK_NAME);

      if (!networkExists) {
        await this.docker.createNetwork({
          Name: DAMP_NETWORK_NAME,
          Driver: 'bridge',
          CheckDuplicate: true,
          Labels: buildNetworkLabels(),
        });
        logger.info(`Created Docker network: ${DAMP_NETWORK_NAME}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to ensure network exists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if the DAMP network exists
   * @returns true if network exists, false otherwise
   */
  async checkNetworkExists(): Promise<boolean> {
    try {
      const networks = await this.docker.listNetworks({
        filters: { name: [DAMP_NETWORK_NAME] },
      });
      return networks.some(net => net.Name === DAMP_NETWORK_NAME);
    } catch {
      return false;
    }
  }

  /**
   * Pull Docker image with progress callback
   */
  async pullImage(imageName: string, onProgress?: (progress: PullProgress) => void): Promise<void> {
    try {
      // Check if image already exists
      const images = await this.docker.listImages({
        filters: { reference: [imageName] },
      });

      if (images.length > 0) {
        logger.info(`Image ${imageName} already exists locally`);
        return;
      }

      return new Promise((resolve, reject) => {
        this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(new Error(`Failed to pull image: ${err.message}`));
            return;
          }

          if (!stream) {
            reject(new Error('No stream returned from pull'));
            return;
          }

          // Follow progress
          this.docker.modem.followProgress(
            stream,
            (err: Error | null) => {
              if (err) {
                reject(new Error(`Failed to pull image: ${err.message}`));
              } else {
                logger.info(`Successfully pulled image: ${imageName}`);
                resolve();
              }
            },
            event => {
              // Send progress updates
              if (onProgress && event) {
                onProgress({
                  status: event.status || '',
                  progress: event.progress,
                  id: event.id,
                });
              }
            }
          );
        });
      });
    } catch (error) {
      throw new Error(`Failed to pull image ${imageName}: ${error}`);
    }
  }

  /**
   * Create and configure a container
   */
  async createContainer(
    config: ServiceConfig,
    metadata?: {
      serviceId: string;
      serviceType: string;
      labels?: Record<string, string>;
      volumeLabelsMap?: Map<string, Record<string, string>>;
    },
    customConfig?: CustomConfig
  ): Promise<string> {
    try {
      // Ensure the shared network exists
      await this.ensureNetworkExists();

      // Merge default and custom configs
      const finalConfig = this.mergeConfigs(config, customConfig);

      // Check and adjust ports if needed
      const portMappings = await this.resolvePortMappings(finalConfig.ports);

      // Build container configuration
      const containerConfig: ContainerCreateOptions = {
        name: finalConfig.container_name,
        Image: finalConfig.image,
        Env: finalConfig.environment_vars,
        ExposedPorts: this.buildExposedPorts(portMappings),
        Labels: metadata?.labels,
        Healthcheck: finalConfig.healthcheck
          ? {
              Test: finalConfig.healthcheck.test,
              Retries: finalConfig.healthcheck.retries,
              Timeout: finalConfig.healthcheck.timeout,
              Interval: finalConfig.healthcheck.interval,
              StartPeriod: finalConfig.healthcheck.start_period,
            }
          : undefined,
        HostConfig: {
          PortBindings: this.buildPortBindings(portMappings),
          Binds: finalConfig.volume_bindings,
          RestartPolicy: {
            Name: 'unless-stopped',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [DAMP_NETWORK_NAME]: {},
          },
        },
      };

      // Create all volumes from volume bindings
      const volumeNames = this.getVolumeNamesFromBindings(finalConfig.volume_bindings || []);
      if (volumeNames.length > 0) {
        // Use volumeLabelsMap from metadata if provided, otherwise build from container labels
        const volumeLabelsMap =
          metadata?.volumeLabelsMap ||
          (metadata?.labels
            ? new Map(volumeNames.map(name => [name, metadata.labels!]))
            : undefined);
        await this.ensureVolumesExist(volumeNames, volumeLabelsMap);
      }

      // Create container
      const container = await this.docker.createContainer(containerConfig);
      logger.info(`Container ${container.id} created and connected to ${DAMP_NETWORK_NAME}`);
      return container.id;
    } catch (error) {
      throw new Error(`Failed to create container: ${error}`);
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
      logger.info(`Container ${containerId} started successfully`);
    } catch (error) {
      throw new Error(`Failed to start container: ${error}`);
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 10 }); // 10 second timeout
      logger.info(`Container ${containerId} stopped successfully`);
    } catch (error) {
      throw new Error(`Failed to stop container: ${error}`);
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.restart({ t: 10 }); // 10 second timeout
      logger.info(`Container ${containerId} restarted successfully`);
    } catch (error) {
      throw new Error(`Failed to restart container: ${error}`);
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId: string, removeVolumes = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);

      // Stop container if running
      try {
        const info = await container.inspect();
        if (info.State.Running) {
          await container.stop({ t: 10 });
        }
      } catch {
        // Container might not exist or already stopped
      }

      // Remove container
      await container.remove({ v: removeVolumes, force: true });
      logger.info(`Container ${containerId} removed successfully`);
    } catch (error) {
      throw new Error(`Failed to remove container: ${error}`);
    }
  }

  /**
   * Get container status by inspecting the container
   * Accepts both container name and container ID
   */
  async getContainerState(containerNameOrId: string): Promise<ContainerState> {
    try {
      const container = this.docker.getContainer(containerNameOrId);
      const inspection = await container.inspect();

      // Parse port mappings from NetworkSettings.Ports
      const ports: PortMapping[] = Object.entries(inspection.NetworkSettings.Ports || {})
        .filter(([, bindings]) => bindings?.[0])
        .map(([internalPort, bindings]) => [bindings![0].HostPort, internalPort.split('/')[0]]);

      // Map health status to our enum
      const healthStatusMap: Record<string, 'starting' | 'healthy' | 'unhealthy'> = {
        starting: 'starting',
        healthy: 'healthy',
        unhealthy: 'unhealthy',
      };
      const healthStatus = inspection.State.Health?.Status
        ? healthStatusMap[inspection.State.Health.Status] || 'none'
        : 'none';

      return {
        exists: true,
        running: inspection.State.Running,
        container_id: inspection.Id,
        state: inspection.State.Status,
        ports,
        health_status: healthStatus,
      };
    } catch (error) {
      logger.error('Failed to get container status', { containerNameOrId, error });
      return {
        exists: false,
        running: false,
        container_id: null,
        state: null,
        ports: [],
        health_status: 'none',
      };
    }
  }

  /**
   * Ensure a Docker volume exists
   */
  private async ensureVolumeExists(
    volumeName: string,
    labels?: Record<string, string>
  ): Promise<void> {
    try {
      const volumes = await this.docker.listVolumes({
        filters: { name: [volumeName] },
      });

      if (!volumes.Volumes?.some(v => v.Name === volumeName)) {
        await this.docker.createVolume({ Name: volumeName, Labels: labels });
        logger.info(`Created volume: ${volumeName}`);
      }
    } catch (error) {
      throw new Error(`Failed to create volume ${volumeName}: ${error}`);
    }
  }

  /**
   * Extract volume names from volume bindings
   * @example ['damp_caddy_data:/data', 'damp_caddy_config:/config'] => ['damp_caddy_data', 'damp_caddy_config']
   */
  private getVolumeNamesFromBindings(volumeBindings: string[]): string[] {
    return volumeBindings
      .map(binding => {
        const parts = binding.split(':');
        return parts.length >= 2 ? parts[0] : null;
      })
      .filter((name): name is string => name !== null && !name.startsWith('/'));
  }

  /**
   * Ensure multiple Docker volumes exist
   */
  private async ensureVolumesExist(
    volumeNames: string[],
    labelsMap?: Map<string, Record<string, string>>
  ): Promise<void> {
    for (const volumeName of volumeNames) {
      const labels = labelsMap?.get(volumeName);
      await this.ensureVolumeExists(volumeName, labels);
    }
  }

  /**
   * Remove a Docker volume
   */
  async removeVolume(volumeName: string): Promise<void> {
    try {
      const volume = this.docker.getVolume(volumeName);
      await volume.remove();
      logger.info(`Removed volume: ${volumeName}`);
    } catch (error) {
      // Ignore if volume doesn't exist (status code 404)
      if (
        error instanceof Error &&
        (error.message.includes('no such volume') ||
          (error as { statusCode?: number }).statusCode === 404)
      ) {
        logger.info(`Volume ${volumeName} does not exist, skipping removal`);
      } else if (
        error instanceof Error &&
        (error.message.includes('volume is in use') ||
          (error as { statusCode?: number }).statusCode === 409)
      ) {
        throw new Error(`Cannot remove volume ${volumeName}: volume is in use by a container`);
      } else {
        throw new Error(`Failed to remove volume ${volumeName}: ${error}`);
      }
    }
  }

  /**
   * Remove multiple service volumes
   */
  async removeServiceVolumes(volumeNames: string[]): Promise<void> {
    for (const volumeName of volumeNames) {
      try {
        await this.removeVolume(volumeName);
      } catch (error) {
        logger.error('Failed to remove volume', { volumeName, error });
      }
    }
  }

  /**
   * Merge default and custom configurations
   */
  private mergeConfigs(defaultConfig: ServiceConfig, customConfig?: CustomConfig): ServiceConfig {
    if (!customConfig) return defaultConfig;

    return {
      ...defaultConfig,
      container_name: customConfig.container_name || defaultConfig.container_name,
      ports: customConfig.ports || defaultConfig.ports,
      environment_vars: customConfig.environment_vars
        ? [...defaultConfig.environment_vars, ...customConfig.environment_vars]
        : defaultConfig.environment_vars,
      volume_bindings: customConfig.volume_bindings || defaultConfig.volume_bindings,
    };
  }

  /**
   * Resolve port mappings, adjusting for conflicts
   */
  private async resolvePortMappings(ports: PortMapping[]): Promise<PortMapping[]> {
    const externalPorts = ports.map(([external]) => Number.parseInt(external, 10));
    const availablePorts = await getAvailablePorts(externalPorts);

    return ports.map(([external, internal]) => {
      const desiredPort = Number.parseInt(external, 10);
      const actualPort = availablePorts.get(desiredPort);
      if (actualPort === undefined) {
        throw new Error(`No available port mapping found for port ${desiredPort}`);
      }
      return [actualPort.toString(), internal];
    });
  }

  /**
   * Build ExposedPorts object for Docker
   */
  private buildExposedPorts(ports: PortMapping[]): Record<string, Record<string, never>> {
    const exposedPorts: Record<string, Record<string, never>> = {};
    for (const [, internal] of ports) {
      exposedPorts[`${internal}/tcp`] = {};
    }
    return exposedPorts;
  }

  /**
   * Build PortBindings object for Docker
   */
  private buildPortBindings(ports: PortMapping[]): Record<
    string,
    Array<{
      HostIp: string;
      HostPort: string;
    }>
  > {
    const portBindings: Record<string, Array<{ HostIp: string; HostPort: string }>> = {};
    for (const [external, internal] of ports) {
      portBindings[`${internal}/tcp`] = [
        {
          // Making the host IP configurable (e.g., default to "127.0.0.1" for localhost-only)
          HostIp: '0.0.0.0',
          HostPort: external,
        },
      ];
    }
    return portBindings;
  }

  /**
   * Execute a command inside a container
   * @param containerIdOrName Container ID or name
   * @param cmd Command to execute (e.g., ['ls', '-la', '/data'])
   * @returns Object with exitCode, stdout, and stderr
   */
  async execCommand(
    containerIdOrName: string,
    cmd: string[]
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const container = this.docker.getContainer(containerIdOrName);

      // Create exec instance
      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
      });

      // Start exec and capture output
      return new Promise((resolve, reject) => {
        exec.start({ Detach: false }, (err, stream) => {
          if (err) {
            reject(new Error(`Failed to start exec: ${err.message}`));
            return;
          }

          if (!stream) {
            reject(new Error('No stream returned from exec'));
            return;
          }

          let stdout = '';
          let stderr = '';

          // Demultiplex stdout and stderr
          const stdoutStream = {
            write: (chunk: Buffer): boolean => {
              stdout += chunk.toString();
              return true;
            },
          };

          const stderrStream = {
            write: (chunk: Buffer): boolean => {
              stderr += chunk.toString();
              return true;
            },
          };

          this.docker.modem.demuxStream(
            stream,
            stdoutStream as NodeJS.WritableStream,
            stderrStream as NodeJS.WritableStream
          );

          stream.on('end', async () => {
            try {
              const inspection = await exec.inspect();
              if (inspection.ExitCode == null) {
                reject(new Error('Exit code not available from exec inspection'));
                return;
              }
              resolve({
                exitCode: inspection.ExitCode,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
              });
            } catch (error) {
              reject(new Error(`Failed to inspect exec: ${error}`));
            }
          });

          stream.on('error', (error: Error) => {
            reject(new Error(`Stream error: ${error.message}`));
          });
        });
      });
    } catch (error) {
      throw new Error(
        `Failed to execute command in container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a file from a container
   * @param containerIdOrName Container ID or name
   * @param containerPath Path to file inside container (e.g., '/data/caddy/pki/authorities/local/root.crt')
   * @returns File content as Buffer
   */
  async getFileFromContainer(containerIdOrName: string, containerPath: string): Promise<Buffer> {
    try {
      const container = this.docker.getContainer(containerIdOrName);

      // Get archive stream (tar format)
      const stream = await container.getArchive({
        path: containerPath,
      });

      // Collect stream data
      const chunks: Buffer[] = [];
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
      let totalSize = 0;
      for await (const chunk of stream) {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE} bytes`);
        }
        chunks.push(chunk as Buffer);
      }

      const tarBuffer = Buffer.concat(chunks);

      // Extract file content from tar archive
      const extract = tar.extract();

      return new Promise((resolve, reject) => {
        let fileContent: Buffer | null = null;

        extract.on('entry', (header, entryStream, next) => {
          const chunks: Buffer[] = [];
          entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          entryStream.on('end', () => {
            fileContent ??= Buffer.concat(chunks);
            next();
          });
          entryStream.resume();
        });

        extract.on('finish', () => {
          if (fileContent) {
            resolve(fileContent);
          } else {
            reject(new Error(`File not found in archive: ${containerPath}`));
          }
        });

        extract.on('error', (error: Error) => {
          reject(new Error(`Failed to extract file: ${error.message}`));
        });

        // Pipe tar buffer to extract
        extract.end(tarBuffer);
      });
    } catch (error) {
      throw new Error(
        `Failed to get file from container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stream container logs in real-time
   * @param containerIdOrName Container ID or name
   * @param onLog Callback for each log line
   * @param tail Number of historical lines to include (default: 100)
   * @returns Function to stop streaming
   */
  async streamContainerLogs(
    containerIdOrName: string,
    onLog: (line: string, stream: 'stdout' | 'stderr') => void,
    tail = 100
  ): Promise<() => void> {
    try {
      const container = this.docker.getContainer(containerIdOrName);

      // Get log stream
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail,
        timestamps: false, // Don't include Docker timestamps - cleaner output
      });

      // Demultiplex stdout and stderr
      const stdoutStream = {
        write: (chunk: Buffer): boolean => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            onLog(line.trim(), 'stdout');
          }
          return true;
        },
      };

      const stderrStream = {
        write: (chunk: Buffer): boolean => {
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            onLog(line.trim(), 'stderr');
          }
          return true;
        },
      };

      this.docker.modem.demuxStream(
        stream,
        stdoutStream as NodeJS.WritableStream,
        stderrStream as NodeJS.WritableStream
      );

      // Return cleanup function
      return () => {
        try {
          if ('destroy' in stream && typeof stream.destroy === 'function') {
            stream.destroy();
          } else if ('end' in stream && typeof stream.end === 'function') {
            (stream as unknown as NodeJS.WritableStream).end();
          }
        } catch (error) {
          logger.warn('Failed to close log stream', { error });
        }
      };
    } catch (error) {
      throw new Error(
        `Failed to stream logs from container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Generic method to find container by any label key-value pair
   * Works for projects, services, helpers, and ngrok tunnels
   */
  async findContainerByLabel(
    labelKey: string,
    labelValue: string,
    resourceType?: string
  ): Promise<Docker.ContainerInfo | null> {
    try {
      const filters: string[] = [`${labelKey}=${labelValue}`];

      if (resourceType) {
        filters.push(`${LABEL_KEYS.TYPE}=${resourceType}`);
      }

      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: filters },
      });

      return containers[0] || null;
    } catch (error) {
      logger.error('Failed to find container by label', { labelKey, labelValue, error });
      return null;
    }
  }

  /**
   * Get container state by label (combines find + inspect in 1 operation)
   * More efficient than calling findContainerByLabel + getContainerState separately
   */
  async getContainerStateByLabel(
    labelKey: string,
    labelValue: string,
    resourceType?: string
  ): Promise<ContainerState> {
    const containerInfo = await this.findContainerByLabel(labelKey, labelValue, resourceType);

    if (!containerInfo) {
      return {
        exists: false,
        running: false,
        state: null,
        container_id: null,
        ports: [],
        health_status: 'none',
      };
    }

    return this.getContainerState(containerInfo.Id);
  }

  /**
   * Get Docker system stats including CPU and memory usage for managed containers
   */
  async getManagedContainersStats(): Promise<{
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

      const info = await Promise.race([this.docker.info(), timeoutPromise]);

      // Get running managed containers for CPU and memory calculation
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

        // Filter containers to only app-managed containers
        const containers = await Promise.race([
          this.docker.listContainers({
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
              const container = this.docker.getContainer(containerInfo.Id);

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

  /**
   * Remove containers matching the specified labels
   */
  async removeContainersByLabels(labels: string[]): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: labels },
      });

      for (const containerInfo of containers) {
        try {
          const container = this.docker.getContainer(containerInfo.Id);
          await container.remove({ v: false, force: true });
        } catch (error) {
          // Ignore individual container removal failures
          logger.debug('Failed to remove container', { containerId: containerInfo.Id, error });
        }
      }
    } catch (error) {
      logger.error('Failed to remove containers by labels', { labels, error });
      throw error;
    }
  }

  /**
   * Stop and remove a container
   */
  async stopAndRemoveContainer(containerId: string, stopTimeout = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: stopTimeout });
      await container.remove({ v: false, force: true });
    } catch (error) {
      // Log but don't throw - container might already be stopped/removed
      logger.debug('Failed to stop/remove container', { containerId, error });
    }
  }

  /**
   * Check if a container is running
   */
  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      return containerInfo.State.Running;
    } catch {
      return false;
    }
  }

  /**
   * Get the host port mapped to a container port
   */
  async getContainerHostPort(containerId: string, containerPort: string): Promise<string | null> {
    try {
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      const ports = containerInfo.NetworkSettings.Ports;
      const hostPort = ports?.[containerPort]?.[0]?.HostPort;
      return hostPort || null;
    } catch (error) {
      logger.debug('Failed to get container host port', { containerId, containerPort, error });
      return null;
    }
  }

  /**
   * Get all DAMP-managed containers grouped by type
   */
  async getAllManagedContainers(): Promise<{
    projects: Docker.ContainerInfo[];
    services: Docker.ContainerInfo[];
    helpers: Docker.ContainerInfo[];
    ngrok: Docker.ContainerInfo[];
  }> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: [`${LABEL_KEYS.MANAGED}=true`],
        },
      });

      return {
        projects: containers.filter(
          c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.PROJECT_CONTAINER
        ),
        services: containers.filter(
          c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.SERVICE_CONTAINER
        ),
        helpers: containers.filter(
          c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.HELPER_CONTAINER
        ),
        ngrok: containers.filter(c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.NGROK_TUNNEL),
      };
    } catch (error) {
      logger.error('Failed to get all managed containers', { error });
      return { projects: [], services: [], helpers: [], ngrok: [] };
    }
  }
}

// Export singleton instance
export const dockerManager = new DockerManager();
