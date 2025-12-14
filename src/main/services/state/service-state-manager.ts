/**
 * Service state manager
 * Coordinates between service registry, Docker manager, and storage
 */

import type {
  ServiceState,
  ServiceInfo,
  CustomConfig,
  InstallOptions,
  ServiceOperationResult,
  PullProgress,
} from '@shared/types/service';
import { ServiceId } from '@shared/types/service';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('ServiceStateManager');
import {
  getServiceDefinition,
  getAllServiceDefinitions,
  POST_INSTALL_HOOKS,
} from '../registry/service-definitions';
import { dockerManager } from '../docker/docker-manager';
import { serviceStorage } from './service-storage';
import { syncProjectsToCaddy } from '../docker/caddy-config';

/**
 * Service state manager class
 */
class ServiceStateManager {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the service manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Return existing initialization promise if already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize storage
      await serviceStorage.initialize();

      // Initialize default states for all services
      const definitions = getAllServiceDefinitions();
      for (const definition of definitions) {
        if (!serviceStorage.hasService(definition.id)) {
          const defaultState: ServiceState = {
            id: definition.id,
            installed: false,
            enabled: definition.required, // Required services enabled by default
            custom_config: null,
            container_status: null,
          };
          await serviceStorage.setServiceState(definition.id, defaultState);
        }
      }

      this.initialized = true;
      logger.info('Service state manager initialized');
    } catch (error) {
      logger.error('Failed to initialize service state manager:', error);
      throw error;
    }
  }

  /**
   * Check initialization
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Service manager not initialized. Call initialize() first.');
    }
  }

  /**
   * Get all services with their current state
   */
  async getAllServices(): Promise<ServiceInfo[]> {
    this.ensureInitialized();

    const definitions = getAllServiceDefinitions();
    const serviceInfos: ServiceInfo[] = [];

    for (const definition of definitions) {
      const state = serviceStorage.getServiceState(definition.id);
      if (state) {
        try {
          // Update container status
          const containerStatus = await dockerManager.getContainerStatus(
            state.custom_config?.container_name || definition.default_config.container_name
          );

          const updatedState: ServiceState = {
            ...state,
            container_status: containerStatus,
          };

          serviceInfos.push({
            definition,
            state: updatedState,
          });
        } catch (error) {
          logger.error(`Failed to get container status for service ${definition.id}:`, error);

          // Return service with existing state if Docker check fails
          serviceInfos.push({
            definition,
            state,
          });
        }
      }
    }

    return serviceInfos;
  }

  /**
   * Get service by ID
   */
  async getService(serviceId: ServiceId): Promise<ServiceInfo | null> {
    this.ensureInitialized();

    const definition = getServiceDefinition(serviceId);
    if (!definition) {
      return null;
    }

    const state = serviceStorage.getServiceState(serviceId);
    if (!state) {
      return null;
    }

    // Update container status
    const containerStatus = await dockerManager.getContainerStatus(
      state.custom_config?.container_name || definition.default_config.container_name
    );

    const updatedState: ServiceState = {
      ...state,
      container_status: containerStatus,
    };

    return {
      definition,
      state: updatedState,
    };
  }

  /**
   * Install a service
   */
  async installService(
    serviceId: ServiceId,
    options?: InstallOptions,
    onProgress?: (progress: PullProgress) => void
  ): Promise<ServiceOperationResult> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      // Check if Docker is available
      const dockerAvailable = await dockerManager.isDockerAvailable();
      if (!dockerAvailable) {
        return {
          success: false,
          error: 'Docker is not running. Please start Docker and try again.',
        };
      }

      // Pull image
      logger.info(`Pulling image ${definition.default_config.image}...`);
      await dockerManager.pullImage(definition.default_config.image, onProgress);

      // Create container with port resolution
      logger.info(`Creating container for ${serviceId}...`);
      const containerId = await dockerManager.createContainer(
        definition.default_config,
        options?.custom_config
      );

      // Start container if requested
      if (options?.start_immediately !== false) {
        logger.info(`Starting container ${containerId}...`);
        await dockerManager.startContainer(containerId);
      }

      // Get actual port mappings after creation
      const containerStatus = await dockerManager.getContainerStatus(
        options?.custom_config?.container_name || definition.default_config.container_name
      );

      // Save custom config with actual ports
      const customConfig: CustomConfig = {
        ...options?.custom_config,
        ports: containerStatus?.ports || definition.default_config.ports,
      };

      // Update service state
      const newState: ServiceState = {
        id: serviceId,
        installed: true,
        enabled: true,
        custom_config: customConfig,
        container_status: containerStatus,
      };

      await serviceStorage.setServiceState(serviceId, newState);

      // Run post-install hook if defined
      const postInstallHook = POST_INSTALL_HOOKS[serviceId];
      if (postInstallHook) {
        try {
          // Ensure container is running before executing hook
          const currentStatus = await dockerManager.getContainerStatus(
            options?.custom_config?.container_name || definition.default_config.container_name
          );

          if (currentStatus?.exists && currentStatus.container_id && !currentStatus.running) {
            logger.info(`Starting container for post-install hook...`);
            await dockerManager.startContainer(currentStatus.container_id);
          }

          // Execute hook with context
          logger.info(`Running post-install hook for ${serviceId}...`);
          const hookResult = await postInstallHook({
            serviceId,
            containerId,
            containerName:
              options?.custom_config?.container_name || definition.default_config.container_name,
            customConfig,
          });

          // Store metadata if provided
          if (hookResult.metadata) {
            await serviceStorage.updateServiceState(serviceId, {
              custom_config: {
                ...customConfig,
                metadata: hookResult.metadata,
              },
            });
          }

          // Log hook results (backend only - user not notified)
          if (hookResult.success) {
            logger.info(`Post-install hook completed successfully: ${hookResult.message || ''}`);
          } else {
            logger.warn(`Post-install hook failed: ${hookResult.message || 'Unknown error'}`);
          }
        } catch (error) {
          // Graceful failure - service is still installed
          logger.error(`Post-install hook failed for ${serviceId}:`, error);
        }
      }

      logger.info(
        `Service ${serviceId} installed successfully. ${definition.post_install_message || ''}`
      );

      return {
        success: true,
        data: {
          message: definition.post_install_message,
          container_id: containerId,
          ports: containerStatus?.ports,
        },
      };
    } catch (error) {
      logger.error(`Failed to install service ${serviceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Uninstall a service
   */
  async uninstallService(
    serviceId: ServiceId,
    removeVolumes = false
  ): Promise<ServiceOperationResult> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const state = serviceStorage.getServiceState(serviceId);
      if (!state?.installed) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      const containerName =
        state.custom_config?.container_name || definition.default_config.container_name;

      // Get container status
      const containerStatus = await dockerManager.getContainerStatus(containerName);

      if (containerStatus?.exists && containerStatus.container_id) {
        // Remove container (but not volumes yet)
        await dockerManager.removeContainer(containerStatus.container_id, false);
      }

      // Remove volumes if requested
      if (removeVolumes) {
        const volumeBindings =
          state.custom_config?.volume_bindings || definition.default_config.volume_bindings;
        if (volumeBindings && volumeBindings.length > 0) {
          // Extract volume names and remove them
          const volumeNames = volumeBindings
            .map(binding => {
              const parts = binding.split(':');
              return parts.length >= 2 ? parts[0] : null;
            })
            .filter((name): name is string => name !== null && !name.startsWith('/'));

          if (volumeNames.length > 0) {
            await dockerManager.removeServiceVolumes(volumeNames);
          }
        }
      }

      // Update service state
      const newState: ServiceState = {
        ...state,
        installed: false,
        enabled: false,
        custom_config: null,
        container_status: null,
      };

      await serviceStorage.setServiceState(serviceId, newState);

      logger.info(`Service ${serviceId} uninstalled successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} uninstalled successfully` },
      };
    } catch (error) {
      logger.error(`Failed to uninstall service ${serviceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start a service
   */
  async startService(serviceId: ServiceId): Promise<ServiceOperationResult> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const state = serviceStorage.getServiceState(serviceId);
      if (!state?.installed) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      const containerName =
        state.custom_config?.container_name || definition.default_config.container_name;

      const containerStatus = await dockerManager.getContainerStatus(containerName);

      if (!containerStatus?.exists || !containerStatus.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      if (containerStatus.running) {
        return {
          success: true,
          data: { message: `Service ${serviceId} is already running` },
        };
      }

      await dockerManager.startContainer(containerStatus.container_id);

      // Update state
      await serviceStorage.updateServiceState(serviceId, {
        enabled: true,
      });

      // If Caddy was started, sync all projects
      if (serviceId === ServiceId.Caddy) {
        syncProjectsToCaddy().catch(error => {
          logger.warn('Failed to sync projects to Caddy on startup:', error);
        });
      }

      logger.info(`Service ${serviceId} started successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} started successfully` },
      };
    } catch (error) {
      logger.error(`Failed to start service ${serviceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop a service
   */
  async stopService(serviceId: ServiceId): Promise<ServiceOperationResult> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const state = serviceStorage.getServiceState(serviceId);
      if (!state?.installed) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      const containerName =
        state.custom_config?.container_name || definition.default_config.container_name;

      const containerStatus = await dockerManager.getContainerStatus(containerName);

      if (!containerStatus?.exists || !containerStatus.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      if (!containerStatus.running) {
        return {
          success: true,
          data: { message: `Service ${serviceId} is already stopped` },
        };
      }

      await dockerManager.stopContainer(containerStatus.container_id);

      // Update state
      await serviceStorage.updateServiceState(serviceId, {
        enabled: false,
      });

      logger.info(`Service ${serviceId} stopped successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} stopped successfully` },
      };
    } catch (error) {
      logger.error(`Failed to stop service ${serviceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Restart a service
   */
  async restartService(serviceId: ServiceId): Promise<ServiceOperationResult> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const state = serviceStorage.getServiceState(serviceId);
      if (!state?.installed) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      const containerName =
        state.custom_config?.container_name || definition.default_config.container_name;

      const containerStatus = await dockerManager.getContainerStatus(containerName);

      if (!containerStatus?.exists || !containerStatus.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      await dockerManager.restartContainer(containerStatus.container_id);

      logger.info(`Service ${serviceId} restarted successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} restarted successfully` },
      };
    } catch (error) {
      logger.error(`Failed to restart service ${serviceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update service configuration
   */
  async updateServiceConfig(
    serviceId: ServiceId,
    customConfig: CustomConfig
  ): Promise<ServiceOperationResult> {
    this.ensureInitialized();

    try {
      const state = serviceStorage.getServiceState(serviceId);
      if (!state?.installed) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      const containerName =
        state.custom_config?.container_name ||
        getServiceDefinition(serviceId)?.default_config.container_name;

      if (containerName) {
        const containerStatus = await dockerManager.getContainerStatus(containerName);
        if (containerStatus?.running) {
          logger.warn(
            `Service ${serviceId} is running. Configuration changes require container recreation to take effect.`
          );
        }
      }

      await serviceStorage.updateServiceState(serviceId, {
        custom_config: customConfig,
      });

      logger.info(`Service ${serviceId} configuration updated`);

      return {
        success: true,
        data: {
          message: `Service ${serviceId} configuration updated. Recreate the container for changes to take effect.`,
        },
      };
    } catch (error) {
      logger.error(`Failed to update service ${serviceId} configuration:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const serviceStateManager = new ServiceStateManager();
