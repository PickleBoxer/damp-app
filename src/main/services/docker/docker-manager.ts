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
import { getAvailablePorts } from './port-checker';
import * as tar from 'tar-stream';

/**
 * Docker manager singleton
 */
class DockerManager {
  private readonly docker: Docker;

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
          Labels: {
            'com.damp.managed': 'true',
            'com.damp.description': 'Shared network for DAMP services and projects',
          },
        });
        console.log(`Created Docker network: ${DAMP_NETWORK_NAME}`);
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
   * Get Docker version information
   */
  async getDockerVersion(): Promise<unknown> {
    try {
      return await this.docker.version();
    } catch (error) {
      throw new Error(`Failed to get Docker version: ${error}`);
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
        console.log(`Image ${imageName} already exists locally`);
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
                console.log(`Successfully pulled image: ${imageName}`);
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
  async createContainer(config: ServiceConfig, customConfig?: CustomConfig): Promise<string> {
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
        await this.ensureVolumesExist(volumeNames);
      }

      // Create container
      const container = await this.docker.createContainer(containerConfig);
      console.log(`Container ${container.id} created and connected to ${DAMP_NETWORK_NAME}`);
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
      console.log(`Container ${containerId} started successfully`);
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
      console.log(`Container ${containerId} stopped successfully`);
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
      console.log(`Container ${containerId} restarted successfully`);
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
      console.log(`Container ${containerId} removed successfully`);
    } catch (error) {
      throw new Error(`Failed to remove container: ${error}`);
    }
  }

  /**
   * Get container status for multiple containers in a single Docker API call
   * More efficient than calling getContainerState multiple times
   */
  async getAllContainerState(containerNames: string[]): Promise<Map<string, ContainerState>> {
    const statusMap = new Map<string, ContainerState>();

    try {
      // Single Docker API call to get all containers
      const containers = await this.docker.listContainers({ all: true });

      // Create lookup set for efficient checking
      const existingContainerNames = new Set(containers.map(c => c.Names[0]?.replace('/', '')));

      // Process each requested container
      for (const containerName of containerNames) {
        if (!existingContainerNames.has(containerName)) {
          // Container doesn't exist
          statusMap.set(containerName, {
            exists: false,
            running: false,
            container_id: null,
            state: null,
            ports: [],
            health_status: 'none',
          });
        } else {
          // Container exists, get detailed status using getContainerState
          const status = await this.getContainerState(containerName);
          if (status) {
            statusMap.set(containerName, status);
          } else {
            // Fallback if getContainerState returns null
            statusMap.set(containerName, {
              exists: false,
              running: false,
              container_id: null,
              state: null,
              ports: [],
              health_status: 'none',
            });
          }
        }
      }

      return statusMap;
    } catch (error) {
      console.error(`Failed to get bulk container statuses: ${error}`);
      // Return default status for all containers on error
      for (const containerName of containerNames) {
        statusMap.set(containerName, {
          exists: false,
          running: false,
          container_id: null,
          state: null,
          ports: [],
          health_status: 'none',
        });
      }
      return statusMap;
    }
  }

  /**
   * Get container status by directly inspecting the container
   * More efficient than listing all containers first
   */
  async getContainerState(containerName: string): Promise<ContainerState | null> {
    try {
      // Get container directly by name (more efficient than listing all)
      const container = this.docker.getContainer(containerName);

      // Inspect the container to get detailed status
      const inspection = await container.inspect();

      // Parse port mappings from inspection
      const ports: PortMapping[] = [];
      if (inspection.NetworkSettings?.Ports) {
        for (const [internalPort, bindings] of Object.entries(inspection.NetworkSettings.Ports)) {
          if (bindings && bindings.length > 0) {
            const hostPort = bindings[0].HostPort;
            const containerPort = internalPort.split('/')[0]; // Remove '/tcp' suffix
            if (hostPort && containerPort) {
              ports.push([hostPort, containerPort]);
            }
          }
        }
      }

      // Parse health status
      let healthStatus: 'starting' | 'healthy' | 'unhealthy' | 'none' = 'none';
      if (inspection.State?.Health) {
        const healthState = inspection.State.Health.Status;
        if (healthState === 'healthy') {
          healthStatus = 'healthy';
        } else if (healthState === 'unhealthy') {
          healthStatus = 'unhealthy';
        } else if (healthState === 'starting') {
          healthStatus = 'starting';
        }
      }

      return {
        exists: true,
        running: inspection.State.Running,
        container_id: inspection.Id,
        state: inspection.State.Status,
        ports,
        health_status: healthStatus,
      };
    } catch (error) {
      // Container doesn't exist or other error
      if (error instanceof Error && error.message.includes('no such container')) {
        return {
          exists: false,
          running: false,
          container_id: null,
          state: null,
          ports: [],
          health_status: 'none',
        };
      }

      console.error(`Failed to get container status for ${containerName}: ${error}`);
      return null;
    }
  }

  /**
   * Ensure a Docker volume exists
   */
  private async ensureVolumeExists(volumeName: string): Promise<void> {
    try {
      const volumes = await this.docker.listVolumes({
        filters: { name: [volumeName] },
      });

      if (!volumes.Volumes?.some(v => v.Name === volumeName)) {
        await this.docker.createVolume({ Name: volumeName });
        console.log(`Created volume: ${volumeName}`);
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
  private async ensureVolumesExist(volumeNames: string[]): Promise<void> {
    for (const volumeName of volumeNames) {
      await this.ensureVolumeExists(volumeName);
    }
  }

  /**
   * Remove a Docker volume
   */
  async removeVolume(volumeName: string): Promise<void> {
    try {
      const volume = this.docker.getVolume(volumeName);
      await volume.remove();
      console.log(`Removed volume: ${volumeName}`);
    } catch (error) {
      // Ignore if volume doesn't exist (status code 404)
      if (
        error instanceof Error &&
        (error.message.includes('no such volume') ||
          (error as { statusCode?: number }).statusCode === 404)
      ) {
        console.log(`Volume ${volumeName} does not exist, skipping removal`);
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
        console.error(`Failed to remove volume ${volumeName}: ${error}`);
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
   * Get container logs
   */
  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
      return logs.toString();
    } catch (error) {
      throw new Error(`Failed to get container logs: ${error}`);
    }
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
          console.warn('Failed to close log stream:', error);
        }
      };
    } catch (error) {
      throw new Error(
        `Failed to stream logs from container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
export const dockerManager = new DockerManager();
