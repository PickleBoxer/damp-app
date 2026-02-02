/**
 * Docker container operations
 * Handles all container lifecycle and execution operations
 */

import { appSettingsStorage } from '@main/core/storage/app-settings-storage';
import { createLogger } from '@main/utils/logger';
import { DAMP_NETWORK_NAME } from '@shared/constants/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import type { ContainerState, PortMapping } from '@shared/types/container';
import type { CustomConfig, ServiceConfig } from '@shared/types/service';
import type { ContainerCreateOptions } from 'dockerode';
import Docker from 'dockerode';
import * as tar from 'tar-stream';
import { docker } from './docker';
import { ensureNetworkExists } from './network';
import { getAvailablePorts } from './port-checker';
import { ensureVolumesExist, getVolumeNamesFromBindings } from './volume';

const logger = createLogger('Container');

/** One week in milliseconds */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pull Docker image with configurable options
 * - By default, only pulls if image doesn't exist locally
 * - Automatically forces pull for :latest tags if last pull was over a week ago
 * - Use force=true to always pull regardless of tag or age
 *
 * @param imageName Docker image name (e.g., 'alpine:latest', 'mysql:8.0')
 * @param force Force pull even if image exists (overrides age check)
 */
export async function pullImage(imageName: string, force?: boolean): Promise<void> {
  // Auto-force for :latest tags (or images without explicit tag, which default to latest)
  const isLatestTag = imageName.endsWith(':latest') || !imageName.includes(':');

  try {
    // Check if image already exists
    const images = await docker.listImages({
      filters: { reference: [imageName] },
    });

    const imageExists = images.length > 0;

    // Determine if we should force pull
    let shouldForce = force ?? false;

    if (isLatestTag && imageExists && !force) {
      // For latest tags, check when we last pulled this image (not image build time)
      const lastPullTime = appSettingsStorage.getImageLastPullTime(imageName);
      const oneWeekAgo = Date.now() - ONE_WEEK_MS;

      if (lastPullTime === null) {
        // Never tracked - pull to establish baseline and record the time
        shouldForce = true;
        logger.info(`Image ${imageName} pull time unknown, pulling to establish baseline`);
      } else if (lastPullTime < oneWeekAgo) {
        shouldForce = true;
        logger.info(`Image ${imageName} was last pulled over a week ago, forcing pull`);
      } else {
        logger.debug(`Image ${imageName} was pulled recently, skipping pull`);
        return;
      }
    } else if (!shouldForce && imageExists) {
      // Non-latest tag or force not specified: skip if exists
      logger.debug(`Image ${imageName} already exists locally`);
      return;
    }

    logger.info(`Pulling image ${imageName}${shouldForce ? ' (forced)' : ''}...`);

    return new Promise((resolve, reject) => {
      docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(new Error(`Failed to pull image ${imageName}: ${err.message}`));
          return;
        }

        docker.modem.followProgress(stream, async err => {
          if (err) {
            reject(new Error(`Failed to pull image ${imageName}: ${err.message}`));
          } else {
            // Record the pull time for future age checks
            await appSettingsStorage.setImageLastPullTime(imageName);
            logger.info(`Successfully pulled image ${imageName}`);
            resolve();
          }
        });
      });
    });
  } catch (error) {
    throw new Error(
      `Failed to pull image ${imageName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create and configure a container
 */
export async function createContainer(
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
    await ensureNetworkExists();

    // Merge default and custom configs
    const finalConfig = mergeConfigs(config, customConfig);

    // Check and adjust ports if needed
    const portMappings = await resolvePortMappings(finalConfig.ports);

    // Build container configuration
    const containerConfig: ContainerCreateOptions = {
      Image: finalConfig.image,
      Env: finalConfig.environment_vars,
      ExposedPorts: buildExposedPorts(portMappings),
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
        PortBindings: buildPortBindings(portMappings),
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
    const volumeNames = getVolumeNamesFromBindings(finalConfig.volume_bindings || []);
    if (volumeNames.length > 0) {
      // Use volumeLabelsMap from metadata if provided, otherwise build from container labels
      const volumeLabelsMap =
        metadata?.volumeLabelsMap ||
        (metadata?.labels ? new Map(volumeNames.map(name => [name, metadata.labels!])) : undefined);
      await ensureVolumesExist(volumeNames, volumeLabelsMap);
    }

    // Create container
    const container = await docker.createContainer(containerConfig);
    logger.info(`Container ${container.id} created and connected to ${DAMP_NETWORK_NAME}`);
    return container.id;
  } catch (error) {
    throw new Error(`Failed to create container: ${error}`);
  }
}

/**
 * Start a container
 */
export async function startContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.start();
    logger.info(`Container ${containerId} started successfully`);
  } catch (error) {
    throw new Error(`Failed to start container: ${error}`);
  }
}

/**
 * Stop a container
 */
export async function stopContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 }); // 10 second timeout
    logger.info(`Container ${containerId} stopped successfully`);
  } catch (error) {
    throw new Error(`Failed to stop container: ${error}`);
  }
}

/**
 * Restart a container
 */
export async function restartContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.restart({ t: 10 }); // 10 second timeout
    logger.info(`Container ${containerId} restarted successfully`);
  } catch (error) {
    throw new Error(`Failed to restart container: ${error}`);
  }
}

/**
 * Remove a container
 * Uses force flag to automatically handle running containers (SIGKILL)
 */
export async function removeContainer(containerId: string, removeVolumes = false): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    // Force remove handles running containers automatically (faster than explicit stop)
    await container.remove({ v: removeVolumes, force: true });
    logger.info(`Container ${containerId} removed successfully`);
  } catch (error) {
    throw new Error(`Failed to remove container: ${error}`);
  }
}

/**
 * Stop and remove a container
 */
export async function stopAndRemoveContainer(containerId: string, stopTimeout = 10): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: stopTimeout });
    await container.remove({ v: false, force: true });
  } catch (error) {
    // Log but don't throw - container might already be stopped/removed
    logger.debug('Failed to stop/remove container', { containerId, error });
  }
}

/**
 * Remove containers matching the specified labels
 */
export async function removeContainersByLabels(labels: string[]): Promise<void> {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: labels },
    });

    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id);
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
 * Get container status by inspecting the container
 * Accepts both container name and container ID
 */
export async function getContainerState(containerNameOrId: string): Promise<ContainerState> {
  try {
    const container = docker.getContainer(containerNameOrId);
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

    // Extract container name (remove leading '/')
    const containerName = inspection.Name?.replace(/^\//, '') || null;

    // Extract environment variables from container config
    const environmentVars = inspection.Config.Env || [];

    return {
      exists: true,
      running: inspection.State.Running,
      container_id: inspection.Id,
      container_name: containerName,
      state: inspection.State.Status,
      ports,
      health_status: healthStatus,
      environment_vars: environmentVars,
    };
  } catch (error) {
    logger.error('Failed to get container status', { containerNameOrId, error });
    return {
      exists: false,
      running: false,
      container_id: null,
      container_name: null,
      state: null,
      ports: [],
      health_status: 'none',
      environment_vars: [],
    };
  }
}

/**
 * Base function to find container by multiple label filters
 * This is the foundational function for all label-based container lookups
 * @param labels - Array of label filters in "key=value" format
 * @returns Container info or null if not found
 */
export async function findContainerByLabels(
  labels: string[]
): Promise<Docker.ContainerInfo | null> {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: labels },
    });

    return containers[0] || null;
  } catch (error) {
    logger.error('Failed to find container by labels', { labels, error });
    return null;
  }
}

/**
 * Get container state by labels (combines find + inspect in 1 operation)
 * More efficient than calling findContainerByLabels + getContainerState separately
 * @param labels - Array of label filters in "key=value" format
 * @returns Container state
 */
export async function getContainerStateByLabels(labels: string[]): Promise<ContainerState> {
  const containerInfo = await findContainerByLabels(labels);

  if (!containerInfo) {
    return {
      exists: false,
      running: false,
      state: null,
      container_id: null,
      container_name: null,
      ports: [],
      health_status: 'none',
      environment_vars: [],
    };
  }

  return getContainerState(containerInfo.Id);
}

/**
 * Wait for container to reach running state
 * Polls container state until it's running or reaches a fatal state
 */
export async function waitForContainerRunning(
  containerIdOrName: string,
  timeoutMs = 60000
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < timeoutMs) {
    const state = await getContainerState(containerIdOrName);

    // Container doesn't exist
    if (!state.exists) {
      return false;
    }

    // Fatal states - container won't recover
    if (state.state === 'exited' || state.state === 'dead') {
      logger.error(`Container ${containerIdOrName} entered fatal state: ${state.state}`);
      return false;
    }

    // Success - container is running
    if (state.running && state.state === 'running') {
      return true;
    }

    // Still initializing/restarting - wait and retry
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  logger.error(`Timeout waiting for container ${containerIdOrName} to reach running state`);
  return false;
}

/**
 * Check if a container is running
 */
export async function isContainerRunning(containerId: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();
    return containerInfo.State.Running;
  } catch {
    return false;
  }
}

/**
 * Get the host port mapped to a container port
 */
export async function getContainerHostPort(
  containerId: string,
  containerPort: string
): Promise<string | null> {
  try {
    const container = docker.getContainer(containerId);
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
export async function getAllManagedContainers(): Promise<{
  projects: Docker.ContainerInfo[];
  services: Docker.ContainerInfo[];
  bundledServices: Docker.ContainerInfo[];
  helpers: Docker.ContainerInfo[];
  ngrok: Docker.ContainerInfo[];
}> {
  try {
    const containers = await docker.listContainers({
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
      bundledServices: containers.filter(
        c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.BUNDLED_SERVICE_CONTAINER
      ),
      helpers: containers.filter(
        c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.HELPER_CONTAINER
      ),
      ngrok: containers.filter(c => c.Labels[LABEL_KEYS.TYPE] === RESOURCE_TYPES.NGROK_TUNNEL),
    };
  } catch (error) {
    logger.error('Failed to get all managed containers', { error });
    return { projects: [], services: [], bundledServices: [], helpers: [], ngrok: [] };
  }
}

/**
 * Execute a command inside a container
 * @param containerIdOrName Container ID or name
 * @param cmd Command to execute (e.g., ['ls', '-la', '/data'])
 * @returns Object with exitCode, stdout, and stderr
 */
export async function execCommand(
  containerIdOrName: string,
  cmd: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const container = docker.getContainer(containerIdOrName);

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

        docker.modem.demuxStream(
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
export async function getFileFromContainer(
  containerIdOrName: string,
  containerPath: string
): Promise<Buffer> {
  try {
    const container = docker.getContainer(containerIdOrName);

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
 * Upload a file to a container using Docker's putArchive API
 * More secure and efficient than shell commands for large files
 * @param containerIdOrName Container ID or name
 * @param fileContent File content as Buffer
 * @param containerPath Full path where file should be placed (e.g., '/tmp/restore.dump')
 */
export async function putFileToContainer(
  containerIdOrName: string,
  fileContent: Buffer,
  containerPath: string
): Promise<void> {
  try {
    const container = docker.getContainer(containerIdOrName);

    // Extract directory and filename from path
    const lastSlash = containerPath.lastIndexOf('/');
    const directory = containerPath.slice(0, lastSlash) || '/';
    const filename = containerPath.slice(lastSlash + 1);

    // Create tar archive containing the file
    const pack = tar.pack();

    // Add file to archive
    pack.entry({ name: filename, size: fileContent.length }, fileContent);
    pack.finalize();

    // Upload tar archive to container
    await container.putArchive(pack, { path: directory });

    logger.debug('File uploaded to container', {
      container: containerIdOrName,
      path: containerPath,
      size: fileContent.length,
    });
  } catch (error) {
    throw new Error(
      `Failed to upload file to container ${containerIdOrName}: ${error instanceof Error ? error.message : String(error)}`
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
export async function streamContainerLogs(
  containerIdOrName: string,
  onLog: (line: string, stream: 'stdout' | 'stderr') => void,
  tail = 100
): Promise<() => void> {
  try {
    const container = docker.getContainer(containerIdOrName);

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

    docker.modem.demuxStream(
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

// ====================
// Private Helper Functions
// ====================

/**
 * Merge default and custom configurations
 */
function mergeConfigs(defaultConfig: ServiceConfig, customConfig?: CustomConfig): ServiceConfig {
  if (!customConfig) return defaultConfig;

  return {
    ...defaultConfig,
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
async function resolvePortMappings(ports: PortMapping[]): Promise<PortMapping[]> {
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
function buildExposedPorts(ports: PortMapping[]): Record<string, Record<string, never>> {
  const exposedPorts: Record<string, Record<string, never>> = {};
  for (const [, internal] of ports) {
    exposedPorts[`${internal}/tcp`] = {};
  }
  return exposedPorts;
}

/**
 * Build PortBindings object for Docker
 */
function buildPortBindings(ports: PortMapping[]): Record<
  string,
  {
    HostIp: string;
    HostPort: string;
  }[]
> {
  const portBindings: Record<string, { HostIp: string; HostPort: string }[]> = {};
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
