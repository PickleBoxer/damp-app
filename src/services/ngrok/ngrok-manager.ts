/**
 * Ngrok Docker manager
 * Manages ngrok tunnel containers for projects
 */

import Docker from 'dockerode';
import { z } from 'zod';
import type { Project } from '../../types/project';
import { dockerManager } from '../docker/docker-manager';
import { ngrokStateManager, type NgrokStatus } from './ngrok-state-manager';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ngrok-manager');

const NGROK_IMAGE = 'ngrok/ngrok:latest';
const NETWORK_NAME = 'damp-network';

// Zod schema for ngrok API response validation
const ngrokApiResponseSchema = z.object({
  tunnels: z.array(
    z.object({
      public_url: z.string().url(),
      proto: z.string(),
      config: z.object({}).passthrough().optional(),
      metrics: z.object({}).passthrough().optional(),
    })
  ),
});

/**
 * Ngrok manager class
 */
class NgrokManager {
  private readonly docker: Docker;

  constructor() {
    this.docker = new Docker();
  }
  /**
   * Start ngrok tunnel for a project
   */
  async startTunnel(
    project: Project,
    authToken: string,
    region?: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      // Check if Docker is available
      const isDockerRunning = await dockerManager.isDockerAvailable();
      if (!isDockerRunning) {
        return {
          success: false,
          error: 'Docker is not running. Please start Docker Desktop.',
        };
      }

      // Check if tunnel already exists (but allow retry if error)
      const existingState = ngrokStateManager.getState(project.id);
      if (existingState && existingState.status !== 'stopped' && existingState.status !== 'error') {
        return {
          success: false,
          error: 'Tunnel is already running for this project',
        };
      }

      // Clear any previous error state
      if (existingState?.status === 'error') {
        ngrokStateManager.deleteState(project.id);
      }

      // Set starting state
      ngrokStateManager.setState(project.id, {
        projectId: project.id,
        containerId: '',
        publicUrl: '',
        status: 'starting',
        startedAt: Date.now(),
        region,
      });

      // Ensure network exists
      await dockerManager.ensureNetworkExists();

      // Pull ngrok image if not present
      try {
        await dockerManager.pullImage(NGROK_IMAGE);
      } catch (error) {
        logger.error('Failed to pull ngrok image', { projectId: project.id, error });
        ngrokStateManager.updateState(project.id, {
          status: 'error',
          error: 'Failed to pull ngrok image. Check your internet connection.',
        });
        return {
          success: false,
          error: 'Failed to pull ngrok image',
        };
      }

      // Generate container name
      const containerName = `${project.containerName}_ngrok`;

      // Remove existing container if it exists
      try {
        const existingContainer = this.docker.getContainer(containerName);
        await existingContainer.remove({ v: false, force: true });
      } catch {
        // Ignore if container doesn't exist
      }

      // Build environment variables
      const env = [`NGROK_AUTHTOKEN=${authToken}`];
      if (region) {
        env.push(`NGROK_REGION=${region}`);
      }

      // Create ngrok container with custom command
      const container = await this.docker.createContainer({
        name: containerName,
        Image: NGROK_IMAGE,
        Env: env,
        Cmd: ['http', `${project.containerName}:${project.forwardedPort}`],
        ExposedPorts: {
          '4040/tcp': {},
        },
        HostConfig: {
          PortBindings: {
            '4040/tcp': [{ HostPort: '0' }], // Random host port
          },
          RestartPolicy: {
            Name: 'no',
          },
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [NETWORK_NAME]: {},
          },
        },
        Labels: {
          'com.damp.managed': 'true',
          'com.damp.type': 'ngrok-tunnel',
          'com.damp.project-id': project.id,
        },
      });

      const containerId = container.id;

      // Start container
      await container.start();

      // Update state with container ID
      ngrokStateManager.updateState(project.id, {
        containerId,
        status: 'starting',
      });

      // Wait for ngrok to initialize and get public URL
      const publicUrl = await this.waitForPublicUrl(containerId, 30000);

      if (publicUrl) {
        ngrokStateManager.updateState(project.id, {
          publicUrl,
          status: 'active',
        });

        logger.info('Ngrok tunnel started successfully', {
          projectId: project.id,
          projectName: project.name,
          publicUrl,
        });

        return {
          success: true,
          data: { publicUrl, containerId },
        };
      } else {
        // Failed to get public URL
        ngrokStateManager.updateState(project.id, {
          status: 'error',
          error: 'Failed to retrieve public URL from ngrok',
        });

        // Clean up container
        try {
          const container = this.docker.getContainer(containerId);
          await container.stop({ t: 10 });
          await container.remove({ v: false, force: true });
        } catch {
          // Ignore cleanup errors
        }

        return {
          success: false,
          error: 'Failed to start ngrok tunnel. Check your auth token and project status.',
        };
      }
    } catch (error) {
      logger.error('Failed to start ngrok tunnel', {
        projectId: project.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Update state to error
      ngrokStateManager.updateState(project.id, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop ngrok tunnel for a project
   */
  async stopTunnel(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const state = ngrokStateManager.getState(projectId);

      if (!state || !state.containerId) {
        return {
          success: false,
          error: 'No active tunnel found for this project',
        };
      }

      // Stop and remove container
      try {
        const container = this.docker.getContainer(state.containerId);
        await container.stop({ t: 10 });
        await container.remove({ v: false, force: true });
      } catch (error) {
        logger.warn('Failed to stop/remove container', { projectId, error });
        // Continue to clean up state
      }

      // Update state
      ngrokStateManager.updateState(projectId, {
        status: 'stopped',
        publicUrl: '',
      });

      logger.info('Ngrok tunnel stopped', { projectId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to stop ngrok tunnel', { projectId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get tunnel status for a project
   */
  async getTunnelStatus(projectId: string): Promise<{
    success: boolean;
    data?: { status: NgrokStatus; containerId?: string; error?: string; publicUrl?: string };
    error?: string;
  }> {
    try {
      const state = ngrokStateManager.getState(projectId);

      if (!state) {
        return {
          success: true,
          data: { status: 'stopped' },
        };
      }

      // Verify container is actually running if status is active
      if (state.status === 'active' && state.containerId) {
        try {
          const container = this.docker.getContainer(state.containerId);
          const containerInfo = await container.inspect();
          if (!containerInfo.State.Running) {
            // Container stopped unexpectedly
            ngrokStateManager.updateState(projectId, {
              status: 'stopped',
              publicUrl: '',
            });
            return {
              success: true,
              data: { status: 'stopped' },
            };
          }
        } catch {
          // Container doesn't exist
          ngrokStateManager.updateState(projectId, {
            status: 'stopped',
            publicUrl: '',
          });
          return {
            success: true,
            data: { status: 'stopped' },
          };
        }
      }

      return {
        success: true,
        data: {
          status: state.status,
          containerId: state.containerId,
          error: state.error,
          publicUrl: state.publicUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to get tunnel status', { projectId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Wait for ngrok to initialize and retrieve public URL
   */
  private async waitForPublicUrl(containerId: string, timeoutMs = 30000): Promise<string | null> {
    const startTime = Date.now();
    const pollInterval = 1000; // Check every 1 second

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get container port mapping for ngrok API (port 4040)
        const container = this.docker.getContainer(containerId);
        const containerInfo = await container.inspect();

        if (!containerInfo.State.Running) {
          logger.error('Ngrok container stopped unexpectedly', { containerId });
          return null;
        }

        // Find the exposed port for 4040
        const ports = containerInfo.NetworkSettings.Ports;
        const ngrokApiPort = ports?.['4040/tcp']?.[0]?.HostPort;

        if (ngrokApiPort) {
          // Query ngrok API for tunnels
          const response = await fetch(`http://localhost:${ngrokApiPort}/api/tunnels`);
          if (response.ok) {
            try {
              const rawData = await response.json();
              const data = ngrokApiResponseSchema.parse(rawData);

              // Find HTTPS tunnel
              const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
              if (httpsTunnel?.public_url) {
                return httpsTunnel.public_url;
              }
            } catch (zodError) {
              logger.warn('Invalid ngrok API response format', {
                containerId,
                error: zodError instanceof Error ? zodError.message : String(zodError),
              });
            }
          }
        }
      } catch (error) {
        // Ignore errors during polling
        logger.debug('Waiting for ngrok to start...', { containerId, error });
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    logger.error('Timeout waiting for ngrok public URL', {
      containerId,
      timeoutMs,
    });
    return null;
  }

  /**
   * Cleanup stopped tunnels (call this periodically or on project stop)
   */
  async cleanupStoppedTunnels(): Promise<void> {
    const states = ngrokStateManager.getAllStates();

    for (const state of states) {
      if (state.containerId) {
        try {
          const container = this.docker.getContainer(state.containerId);
          const containerInfo = await container.inspect();
          if (!containerInfo.State.Running) {
            // Container is not running, clean up state
            ngrokStateManager.updateState(state.projectId, {
              status: 'stopped',
              publicUrl: '',
            });
            logger.debug('Cleaned up stopped tunnel', { projectId: state.projectId });
          }
        } catch {
          // Container doesn't exist, clean up state
          ngrokStateManager.updateState(state.projectId, {
            status: 'stopped',
            publicUrl: '',
          });
          logger.debug('Cleaned up orphaned tunnel state', { projectId: state.projectId });
        }
      }
    }
  }

  /**
   * Check if there are any active tunnels being tracked
   */
  hasActiveTunnels(): boolean {
    const states = ngrokStateManager.getAllStates();
    return states.some(state => state.status === 'active' || state.status === 'starting');
  }

  /**
   * Stop all active tunnels (call on app shutdown)
   */
  async stopAllTunnels(): Promise<void> {
    const states = ngrokStateManager.getAllStates();
    logger.info('Stopping all ngrok tunnels', { count: states.length });

    const stopPromises = states
      .filter(state => state.status === 'active' || state.status === 'starting')
      .map(state => this.stopTunnel(state.projectId));

    await Promise.allSettled(stopPromises);
    logger.info('All ngrok tunnels stopped');
  }
}

export const ngrokManager = new NgrokManager();
