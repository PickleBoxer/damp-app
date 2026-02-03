/**
 * Service state manager
 * Coordinates between service registry and Docker
 * Docker containers are the single source of truth for all runtime state
 */

import { BaseStateManager } from '@main/core/base-state-manager';
import {
  createContainer,
  getVolumeNamesFromBindings,
  isDockerAvailable,
  pullImage,
  removeContainer,
  removeServiceVolumes,
  removeServiceVolumesByLabel,
  restartContainer,
  startContainer,
  stopContainer,
} from '@main/core/docker';
import { syncProjectsToCaddy } from '@main/core/reverse-proxy/caddy-config';
import { appSettingsStorage } from '@main/core/storage/app-settings-storage';
import { buildServiceContainerLabels, buildServiceVolumeLabels } from '@shared/constants/labels';
import type { ContainerState, PortMapping } from '@shared/types/container';
import type { Result } from '@shared/types/result';
import type { InstallOptions, ServiceDefinition, ServiceInfo } from '@shared/types/service';
import { ServiceId } from '@shared/types/service';
import { getServiceContainerState } from './container';
import {
  getAllServiceDefinitions,
  getServiceDefinition,
  POST_INSTALL_HOOKS,
} from './service-definitions';

/**
 * Service state manager class
 * Docker is the single source of truth - no persistent state storage needed
 */
class ServiceStateManager extends BaseStateManager {
  constructor() {
    super('ServiceStateManager');
  }

  /**
   * Initialize the service manager
   */
  protected async _initialize(): Promise<void> {
    // Initialize app settings (for certInstalled flag)
    await appSettingsStorage.initialize();
    this.logger.info('Service state manager initialized');
  }

  /**
   * Get all service definitions
   * Does NOT include Docker container status - use getServiceContainerState() for that
   */
  async getAllServices(): Promise<ServiceDefinition[]> {
    this.ensureInitialized();
    return getAllServiceDefinitions();
  }

  /**
   * Get container status for a specific service using label-based lookup
   * @param serviceId - The service ID
   * @param projectId - Optional project ID for bundled services
   */
  async getServiceContainerState(
    serviceId: ServiceId,
    projectId?: string
  ): Promise<ContainerState | null> {
    this.ensureInitialized();

    const definition = getServiceDefinition(serviceId);
    if (!definition) {
      return null;
    }

    try {
      return await getServiceContainerState(serviceId, projectId);
    } catch (error) {
      this.logger.error('Failed to get service container state', { serviceId, projectId, error });
      return {
        running: false,
        exists: false,
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
   * Get service by ID (returns definition only)
   * Use getServiceContainerState() separately for Docker container status
   */
  async getService(serviceId: ServiceId): Promise<ServiceInfo | null> {
    this.ensureInitialized();

    const definition = getServiceDefinition(serviceId);
    if (!definition) {
      return null;
    }

    return definition;
  }

  /**
   * Check if Caddy SSL certificate is installed on host
   */
  getCaddyCertInstalled(): boolean {
    this.ensureInitialized();
    return appSettingsStorage.getCaddyCertInstalled();
  }

  /**
   * Set Caddy SSL certificate installed status
   */
  async setCaddyCertInstalled(installed: boolean): Promise<void> {
    this.ensureInitialized();
    await appSettingsStorage.setCaddyCertInstalled(installed);
  }

  /**
   * Install a service
   */
  async installService(
    serviceId: ServiceId,
    options?: InstallOptions
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
      this.logger.info(`Pulling image ${definition.default_config.image}...`);
      await pullImage(definition.default_config.image);

      // Create container with port resolution
      this.logger.info(`Creating container for ${serviceId}...`);

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
        this.logger.info(`Starting container ${containerId}...`);
        await startContainer(containerId);
      }

      // Get actual port mappings after creation using label-based lookup
      const containerState = await getServiceContainerState(serviceId);

      // Run post-install hook if defined
      const postInstallHook = POST_INSTALL_HOOKS[serviceId];
      if (postInstallHook) {
        try {
          // Ensure container is running before executing hook
          const currentStatus = await getServiceContainerState(serviceId);

          if (currentStatus?.exists && currentStatus.container_id && !currentStatus.running) {
            this.logger.info(`Starting container for post-install hook...`);
            await startContainer(currentStatus.container_id);
          }

          // Execute hook with context
          this.logger.info(`Running post-install hook for ${serviceId}...`);
          const hookResult = await postInstallHook({
            serviceId,
            containerId,
            customConfig: options?.custom_config || null,
          });

          // For Caddy, store certInstalled in app settings
          if (serviceId === ServiceId.Caddy && hookResult.data?.certInstalled) {
            await appSettingsStorage.setCaddyCertInstalled(true);
          }

          // Log hook results (backend only - user not notified)
          if (hookResult.success) {
            this.logger.info(
              `Post-install hook completed successfully: ${hookResult.message || ''}`
            );
          } else {
            this.logger.warn(`Post-install hook failed: ${hookResult.message || 'Unknown error'}`);
          }
        } catch (error) {
          // Graceful failure - service is still installed
          this.logger.error(`Post-install hook failed for ${serviceId}:`, { error });
        }
      }

      this.logger.info(
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
      this.logger.error(`Failed to install service ${serviceId}:`, { error });
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
    removeVolumes = true
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

      // Check if container exists in Docker using label-based lookup
      const containerState = await getServiceContainerState(serviceId);
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
      if (removeVolumes) {
        // First try to remove by label (works for volumes created after labeling system)
        await removeServiceVolumesByLabel(serviceId);

        // Also try removing by name from definition (fallback for pre-labeled volumes)
        const volumeBindings = definition.default_config.volume_bindings || [];
        const volumeNames = getVolumeNamesFromBindings(volumeBindings);
        if (volumeNames.length > 0) {
          this.logger.info(`Also attempting removal by name: ${volumeNames.join(', ')}`);
          await removeServiceVolumes(volumeNames);
        }
      }

      // Reset certInstalled if uninstalling Caddy
      if (serviceId === ServiceId.Caddy) {
        await appSettingsStorage.setCaddyCertInstalled(false);
      }

      this.logger.info(`Service ${serviceId} uninstalled successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} uninstalled successfully` },
      };
    } catch (error) {
      this.logger.error(`Failed to uninstall service ${serviceId}:`, { error });
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

      const containerState = await getServiceContainerState(serviceId);

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
          this.logger.warn('Failed to sync projects to Caddy on startup:', error);
        });
      }

      this.logger.info(`Service ${serviceId} started successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} started successfully` },
      };
    } catch (error) {
      this.logger.error(`Failed to start service ${serviceId}:`, { error });
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

      const containerState = await getServiceContainerState(serviceId);

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

      this.logger.info(`Service ${serviceId} stopped successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} stopped successfully` },
      };
    } catch (error) {
      this.logger.error(`Failed to stop service ${serviceId}:`, { error });
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

      const containerState = await getServiceContainerState(serviceId);

      if (!containerState?.exists || !containerState.container_id) {
        return {
          success: false,
          error: `Container for service ${serviceId} does not exist`,
        };
      }

      await restartContainer(containerState.container_id);

      this.logger.info(`Service ${serviceId} restarted successfully`);

      return {
        success: true,
        data: { message: `Service ${serviceId} restarted successfully` },
      };
    } catch (error) {
      this.logger.error(`Failed to restart service ${serviceId}:`, { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const serviceStateManager = new ServiceStateManager();
