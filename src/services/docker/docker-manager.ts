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
  ContainerStatus,
  PortMapping,
} from '../../types/service';
import { getAvailablePorts } from './port-checker';

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
        HostConfig: {
          PortBindings: this.buildPortBindings(portMappings),
          Binds: finalConfig.volume_bindings,
          RestartPolicy: {
            Name: 'unless-stopped',
          },
        },
      };

      // Create volumes if specified
      if (finalConfig.data_volume) {
        await this.ensureVolumeExists(finalConfig.data_volume);
      }

      // Create container
      const container = await this.docker.createContainer(containerConfig);
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
   * Get container status
   */
  async getContainerStatus(containerName: string): Promise<ContainerStatus | null> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const container = containers.find(c => c.Names.includes(`/${containerName}`));

      if (!container) {
        return {
          exists: false,
          running: false,
          container_id: null,
          state: null,
          ports: [],
        };
      }

      // Parse port mappings
      const ports: PortMapping[] = [];
      if (container.Ports) {
        for (const port of container.Ports) {
          if (port.PublicPort && port.PrivatePort) {
            ports.push([port.PublicPort.toString(), port.PrivatePort.toString()]);
          }
        }
      }

      return {
        exists: true,
        running: container.State === 'running',
        container_id: container.Id,
        state: container.State,
        ports,
      };
    } catch (error) {
      console.error(`Failed to get container status: ${error}`);
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
}

// Export singleton instance
export const dockerManager = new DockerManager();
