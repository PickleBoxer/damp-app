/**
 * Service state manager
 * Coordinates between service registry, Docker manager, and storage
 */

import type {
  ServiceState,
  ServiceInfo,
  ServiceDefinition,
  CustomConfig,
  InstallOptions,
  ServiceOperationResult,
  PullProgress,
} from '@shared/types/service';
import type { ContainerStateData } from '@shared/types/container';
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
            custom_config: null,
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
   * Get all services with their definitions only (no state)
   * Does NOT include Docker container status - use getServicesState() for that
   */
  async getAllServices(): Promise<ServiceDefinition[]> {
    this.ensureInitialized();

    const definitions = getAllServiceDefinitions();

    return definitions;
  }

  /**
   * Get bulk status for all services using a single Docker API call
   * More efficient than calling getService() for each service individually
   */
  async getServicesState(): Promise<ContainerStateData[]> {
    this.ensureInitialized();

    const definitions = getAllServiceDefinitions();
    const containerNames: string[] = [];
    const serviceIdToContainerName = new Map<ServiceId, string>();

    // Collect all container names
    for (const definition of definitions) {
      const state = serviceStorage.getServiceState(definition.id);
      const containerName =
        state?.custom_config?.container_name || definition.default_config.container_name;
      containerNames.push(containerName);
      serviceIdToContainerName.set(definition.id, containerName);
    }

    // Single Docker API call to get all container statuses
    const containersState = await dockerManager.getAllContainerState(containerNames);

    // Build status array for all services
    const statuses: ContainerStateData[] = [];
    for (const definition of definitions) {
      const containerName = serviceIdToContainerName.get(definition.id);
      const containerState = containerName ? containersState.get(containerName) : null;

      statuses.push({
        // Standard container data from Docker
        id: definition.id,
        running: containerState?.running ?? false,
        exists: containerState?.exists ?? false,
        state: containerState?.state ?? null,
        ports: containerState?.ports ?? [],
        health_status: containerState?.health_status ?? 'none',
      });
    }

    return statuses;
  }

  /**
   * Get service by ID with full state including container status
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

    // Get container status from Docker (single source of truth)
    const containerState = await dockerManager.getContainerState(
      state.custom_config?.container_name || definition.default_config.container_name
    );

    // Compute installed/enabled from Docker state
    const installed = containerState?.exists ?? false;
    const enabled = installed && (definition.required || containerState?.running === true);

    return {
      ...definition, // Spread all ServiceDefinition properties
      installed,
      enabled,
      custom_config: state.custom_config,
      container_status: containerState,
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
      const containerState = await dockerManager.getContainerState(
        options?.custom_config?.container_name || definition.default_config.container_name
      );

      // Save custom config with actual ports
      const customConfig: CustomConfig = {
        ...options?.custom_config,
        ports: containerState?.ports || definition.default_config.ports,
      };

      // Update service state - only persist custom_config (user preferences)
      const newState: ServiceState = {
        id: serviceId,
        custom_config: customConfig,
      };

      await serviceStorage.setServiceState(serviceId, newState);

      // Run post-install hook if defined
      const postInstallHook = POST_INSTALL_HOOKS[serviceId];
      if (postInstallHook) {
        try {
          // Ensure container is running before executing hook
          const currentStatus = await dockerManager.getContainerState(
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
          ports: containerState?.ports,
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
      const containerName =
        state?.custom_config?.container_name || definition.default_config.container_name;

      // Check if container exists in Docker
      const containerState = await dockerManager.getContainerState(containerName);
      if (!containerState?.exists) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      if (containerState.container_id) {
        // Remove container (but not volumes yet)
        await dockerManager.removeContainer(containerState.container_id, false);
      }

      // Remove volumes if requested
      if (removeVolumes && state?.custom_config?.volume_bindings) {
        const volumeBindings = state.custom_config.volume_bindings;
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

      // Clear custom config (user preferences) - Docker state is ephemeral
      const newState: ServiceState = {
        id: serviceId,
        custom_config: null,
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
      const containerName =
        state?.custom_config?.container_name || definition.default_config.container_name;

      const containerState = await dockerManager.getContainerState(containerName);

      if (!containerState?.exists || !containerState.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      if (containerState.running) {
        return {
          success: true,
          data: { message: `Service ${serviceId} is already running` },
        };
      }

      await dockerManager.startContainer(containerState.container_id);

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
      const containerName =
        state?.custom_config?.container_name || definition.default_config.container_name;

      const containerState = await dockerManager.getContainerState(containerName);

      if (!containerState?.exists || !containerState.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      if (!containerState.running) {
        return {
          success: true,
          data: { message: `Service ${serviceId} is already stopped` },
        };
      }

      await dockerManager.stopContainer(containerState.container_id);

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
      const containerName =
        state?.custom_config?.container_name || definition.default_config.container_name;

      const containerState = await dockerManager.getContainerState(containerName);

      if (!containerState?.exists || !containerState.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      await dockerManager.restartContainer(containerState.container_id);

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
      const containerName =
        state?.custom_config?.container_name ||
        getServiceDefinition(serviceId)?.default_config.container_name;

      if (containerName) {
        const containerState = await dockerManager.getContainerState(containerName);
        if (!containerState?.exists) {
          return {
            success: false,
            error: `Service ${serviceId} is not installed`,
          };
        }
        if (containerState?.running) {
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
