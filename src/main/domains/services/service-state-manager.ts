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
  PullProgress,
} from '@shared/types/service';
import type { Result } from '@shared/types/result';
import type { ContainerState, PortMapping } from '@shared/types/container';
import { ServiceId } from '@shared/types/service';
import {
  buildServiceContainerLabels,
  buildServiceVolumeLabels,
  LABEL_KEYS,
  RESOURCE_TYPES,
} from '@shared/constants/labels';
import { createLogger } from '@main/utils/logger';
import {
  getServiceDefinition,
  getAllServiceDefinitions,
  POST_INSTALL_HOOKS,
} from './service-definitions';
import {
  isDockerAvailable,
  pullImage,
  createContainer,
  startContainer,
  getContainerStateByLabel,
  removeContainer,
  stopContainer,
  restartContainer,
  removeServiceVolumes,
} from '@main/core/docker';
import { serviceStorage } from '@main/core/storage/service-storage';
import { syncProjectsToCaddy } from '@main/core/reverse-proxy/caddy-config';

const logger = createLogger('ServiceStateManager');

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
      logger.error('Failed to initialize service state manager:', { error });
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
   * Does NOT include Docker container status
   */
  async getAllServices(): Promise<ServiceDefinition[]> {
    this.ensureInitialized();

    const definitions = getAllServiceDefinitions();

    return definitions;
  }

  /**
   * Get container status for a specific service using label-based lookup
   */
  async getServiceContainerState(serviceId: ServiceId): Promise<ContainerState | null> {
    this.ensureInitialized();

    const definition = getServiceDefinition(serviceId);
    if (!definition) {
      return null;
    }

    try {
      // Use unified container state query (single call instead of find + inspect)
      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );

      return {
        running: containerState.running,
        exists: containerState.exists,
        container_id: containerState.container_id,
        container_name: containerState.container_name,
        state: containerState.state,
        ports: containerState.ports,
        health_status: containerState.health_status ?? 'none',
      };
    } catch (error) {
      logger.error('Failed to get service container state', { serviceId, error });
      return {
        running: false,
        exists: false,
        container_id: null,
        container_name: null,
        state: null,
        ports: [],
        health_status: 'none',
      };
    }
  }

  /**
   * Get service by ID with definition and custom config (no container state)
   * Use getServiceContainerState() separately for Docker container status
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

    return {
      ...definition, // Spread all ServiceDefinition properties
      custom_config: state.custom_config,
    };
  }

  /**
   * Install a service
   */
  async installService(
    serviceId: ServiceId,
    options?: InstallOptions,
    onProgress?: (progress: PullProgress) => void
  ): Promise<Result<{ message?: string; container_id: string; ports?: PortMapping[] }>> {
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
      const dockerAvailable = await isDockerAvailable();
      if (!dockerAvailable) {
        return {
          success: false,
          error: 'Docker is not running. Please start Docker and try again.',
        };
      }

      // Pull image
      logger.info(`Pulling image ${definition.default_config.image}...`);
      await pullImage(definition.default_config.image, onProgress);

      // Create container with port resolution
      logger.info(`Creating container for ${serviceId}...`);

      // Build service labels
      const containerLabels = buildServiceContainerLabels(serviceId, definition.service_type);
      const volumeBindings = definition.default_config.volume_bindings || [];
      const volumeLabelsMap = new Map(
        volumeBindings.map(binding => {
          const volumeName = binding.split(':')[0];
          return [volumeName, buildServiceVolumeLabels(serviceId, volumeName)];
        })
      );

      const containerId = await createContainer(
        definition.default_config,
        {
          serviceId,
          serviceType: definition.service_type,
          labels: containerLabels,
          volumeLabelsMap,
        },
        options?.custom_config
      );

      // Start container if requested
      if (options?.start_immediately !== false) {
        logger.info(`Starting container ${containerId}...`);
        await startContainer(containerId);
      }

      // Get actual port mappings after creation using label-based lookup
      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
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
          const currentStatus = await getContainerStateByLabel(
            LABEL_KEYS.SERVICE_ID,
            serviceId,
            RESOURCE_TYPES.SERVICE_CONTAINER
          );

          if (currentStatus?.exists && currentStatus.container_id && !currentStatus.running) {
            logger.info(`Starting container for post-install hook...`);
            await startContainer(currentStatus.container_id);
          }

          // Execute hook with context
          logger.info(`Running post-install hook for ${serviceId}...`);
          const hookResult = await postInstallHook({
            serviceId,
            containerId,
            customConfig,
          });

          // Store metadata if provided
          if (hookResult.data) {
            await serviceStorage.updateServiceState(serviceId, {
              custom_config: {
                ...customConfig,
                metadata: hookResult.data,
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
          logger.error(`Post-install hook failed for ${serviceId}:`, { error });
        }
      }

      logger.info(
        `Service ${serviceId} installed successfully. ${definition.post_install_message || ''}`
      );

      return {
        success: true,
        data: {
          message: definition.post_install_message ?? undefined,
          container_id: containerId,
          ports: containerState?.ports,
        },
      };
    } catch (error) {
      logger.error(`Failed to install service ${serviceId}:`, { error });
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
  ): Promise<Result<{ message: string }>> {
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

      // Check if container exists in Docker using label-based lookup
      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );
      if (!containerState?.exists) {
        return {
          success: false,
          error: `Service ${serviceId} is not installed`,
        };
      }

      if (containerState.container_id) {
        // Remove container (but not volumes yet)
        await removeContainer(containerState.container_id, false);
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
            await removeServiceVolumes(volumeNames);
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
      logger.error(`Failed to uninstall service ${serviceId}:`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Start a service
   */
  async startService(serviceId: ServiceId): Promise<Result<{ message: string }>> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );

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

      await startContainer(containerState.container_id);

      // If Caddy was started, sync all projects (requires project storage)
      if (serviceId === ServiceId.Caddy) {
        // Import projectStorage dynamically to avoid circular dependency
        const { projectStorage } = await import('@main/core/storage/project-storage');
        const projects = projectStorage.getAllProjects();
        syncProjectsToCaddy(projects).catch(error => {
          logger.warn('Failed to sync projects to Caddy on startup:', error);
        });
      }

      logger.info(`Service ${serviceId} started successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} started successfully` },
      };
    } catch (error) {
      logger.error(`Failed to start service ${serviceId}:`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop a service
   */
  async stopService(serviceId: ServiceId): Promise<Result<{ message: string }>> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );

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

      await stopContainer(containerState.container_id);

      logger.info(`Service ${serviceId} stopped successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} stopped successfully` },
      };
    } catch (error) {
      logger.error(`Failed to stop service ${serviceId}:`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Restart a service
   */
  async restartService(serviceId: ServiceId): Promise<Result<{ message: string }>> {
    this.ensureInitialized();

    try {
      const definition = getServiceDefinition(serviceId);
      if (!definition) {
        return {
          success: false,
          error: `Service ${serviceId} not found`,
        };
      }

      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );

      if (!containerState?.exists || !containerState.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      await restartContainer(containerState.container_id);

      logger.info(`Service ${serviceId} restarted successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} restarted successfully` },
      };
    } catch (error) {
      logger.error(`Failed to restart service ${serviceId}:`, { error });
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
  ): Promise<Result<{ message: string }>> {
    this.ensureInitialized();

    try {
      // Check if service is installed using label-based lookup
      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.SERVICE_ID,
        serviceId,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );

      if (containerState) {
        if (!containerState.exists) {
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
      logger.error(`Failed to update service ${serviceId} configuration:`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const serviceStateManager = new ServiceStateManager();
