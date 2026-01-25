/**
 * Resources IPC listeners
 * Handles Docker resource management operations
 */

import { getAllManagedContainers, removeContainer } from '@main/core/docker/container';
import { docker } from '@main/core/docker/docker';
import { getAllManagedVolumes, removeVolume } from '@main/core/docker/volume';
import { projectStorage } from '@main/core/storage/project-storage';
import { serviceStorage } from '@main/core/storage/service-storage';
import { getServiceDefinition } from '@main/domains/services/service-definitions';
import { serviceStateManager } from '@main/domains/services/service-state-manager';
import { createLogger } from '@main/utils/logger';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import type { DockerResource } from '@shared/types/resource';
import type { ServiceId } from '@shared/types/service';
import { ipcMain } from 'electron';
import {
  RESOURCES_DELETE,
  RESOURCES_GET_ALL,
  RESOURCES_UPDATE_SERVICE,
} from './resources-channels';

const logger = createLogger('ResourcesListeners');

/**
 * Get all DAMP-managed Docker resources with enriched metadata
 */
async function getAllResources(): Promise<DockerResource[]> {
  try {
    const [containerGroups, volumes] = await Promise.all([
      getAllManagedContainers(),
      getAllManagedVolumes(),
    ]);

    const projects = projectStorage.getAllProjects();
    const serviceStates = serviceStorage.getAllServiceStates();

    const resources: DockerResource[] = [];

    // Process containers
    const allContainers = [
      ...containerGroups.projects,
      ...containerGroups.services,
      ...containerGroups.helpers,
      ...containerGroups.ngrok,
    ];

    for (const container of allContainers) {
      const labels = container.Labels || {};
      const type = labels[LABEL_KEYS.TYPE];
      const projectId = labels[LABEL_KEYS.PROJECT_ID];
      const serviceId = labels[LABEL_KEYS.SERVICE_ID] as ServiceId | undefined;

      let isOrphan = false;
      let needsUpdate = false;
      let category: DockerResource['category'] = 'unknown';

      if (type === RESOURCE_TYPES.PROJECT_CONTAINER && projectId) {
        category = 'project';
        isOrphan = !projects.some(p => p.id === projectId);
      } else if (type === RESOURCE_TYPES.SERVICE_CONTAINER && serviceId) {
        category = 'service';
        isOrphan = !serviceStates[serviceId];

        // Check if service definition has changed
        if (!isOrphan) {
          needsUpdate = await hasServiceDefinitionChanged(serviceId, container.Id);
        }
      } else if (type === RESOURCE_TYPES.HELPER_CONTAINER) {
        category = 'helper';
      } else if (type === RESOURCE_TYPES.NGROK_TUNNEL) {
        category = 'ngrok';
      }

      const containerName = container.Names?.[0]?.replace(/^\//, '') || container.Id.substring(0, 12);

      // Determine owner ID and display name
      const ownerId = projectId || serviceId || category || 'uncategorized';
      let ownerDisplayName = ownerId;

      if (projectId) {
        const project = projects.find(p => p.id === projectId);
        ownerDisplayName = project?.name || projectId;
      } else if (serviceId) {
        ownerDisplayName = serviceId;
      } else {
        // Use readable category name
        const categoryMap: Record<string, string> = {
          helper: 'Helper',
          ngrok: 'Ngrok',
          unknown: 'Uncategorized',
        };
        ownerDisplayName = categoryMap[category] || category;
      }

      resources.push({
        id: container.Id,
        name: containerName,
        type: 'container',
        category,
        status: container.State,
        isOrphan,
        needsUpdate,
        labels,
        createdAt: container.Created * 1000,
        ownerId,
        ownerDisplayName,
      });
    }

    // Process volumes
    for (const volume of volumes) {
      const labels = volume.labels || {};
      const type = labels[LABEL_KEYS.TYPE];
      const projectId = labels[LABEL_KEYS.PROJECT_ID];
      const serviceId = labels[LABEL_KEYS.SERVICE_ID];

      let isOrphan = false;
      let category: DockerResource['category'] = 'unknown';

      if (type === RESOURCE_TYPES.PROJECT_VOLUME && projectId) {
        category = 'project';
        isOrphan = !projects.some(p => p.id === projectId);
      } else if (type === RESOURCE_TYPES.SERVICE_VOLUME && serviceId) {
        category = 'service';
        // Volume is orphaned if there's no container for this service
        const hasContainer = allContainers.some(
          c => c.Labels?.[LABEL_KEYS.SERVICE_ID] === serviceId
        );
        isOrphan = !hasContainer;
      }

      // Determine owner ID and display name
      const ownerId = projectId || serviceId || category || 'uncategorized';
      let ownerDisplayName = ownerId;

      if (projectId) {
        const project = projects.find(p => p.id === projectId);
        ownerDisplayName = project?.name || projectId;
      } else if (serviceId) {
        ownerDisplayName = serviceId;
      } else {
        // Use readable category name
        const categoryMap: Record<string, string> = {
          helper: 'Helper',
          ngrok: 'Ngrok',
          unknown: 'Uncategorized',
        };
        ownerDisplayName = categoryMap[category] || category;
      }

      resources.push({
        id: volume.name,
        name: volume.name,
        type: 'volume',
        category,
        status: 'active',
        isOrphan,
        needsUpdate: false,
        labels,
        createdAt: 0,
        ownerId,
        ownerDisplayName,
      });
    }

    return resources;
  } catch (error) {
    logger.error('Failed to get all resources', { error });
    throw error;
  }
}

/**
 * Check if service definition has changed compared to running container
 */
async function hasServiceDefinitionChanged(
  serviceId: ServiceId,
  containerId: string
): Promise<boolean> {
  try {
    const definition = getServiceDefinition(serviceId);
    if (!definition) {
      return false;
    }

    const container = docker.getContainer(containerId);
    const inspect = await container.inspect();

    // Compare image
    const currentImage = inspect.Config.Image;
    const definitionImage = definition.default_config.image;
    if (currentImage !== definitionImage) {
      logger.debug(`Service ${serviceId} has image change: ${currentImage} -> ${definitionImage}`);
      return true;
    }

    // Compare environment variables (check if defined vars exist with same values in container)
    const currentEnv = new Set(inspect.Config.Env || []);
    const definitionEnv = definition.default_config.environment_vars || [];

    for (const envVar of definitionEnv) {
      if (!currentEnv.has(envVar)) {
        logger.debug(`Service ${serviceId} missing or changed environment variable: ${envVar}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error(`Failed to check service definition changes for ${serviceId}`, { error });
    return false;
  }
}

/**
 * Delete a Docker resource
 */
async function deleteResource(type: string, id: string): Promise<void> {
  try {
    if (type === 'container') {
      await removeContainer(id, true);
      logger.info(`Deleted container: ${id}`);
    } else if (type === 'volume') {
      await removeVolume(id);
      logger.info(`Deleted volume: ${id}`);
    } else {
      throw new Error(`Unknown resource type: ${type}`);
    }
  } catch (error) {
    logger.error(`Failed to delete ${type} ${id}`, { error });
    throw error;
  }
}

/**
 * Update a service by uninstalling and reinstalling with new definition
 */
async function updateService(serviceId: ServiceId): Promise<void> {
  try {
    logger.info(`Updating service: ${serviceId}`);

    // Uninstall service (stops container)
    await serviceStateManager.uninstallService(serviceId, true);

    // Reinstall service with new definition
    await serviceStateManager.installService(serviceId);

    logger.info(`Service ${serviceId} updated successfully`);
  } catch (error) {
    logger.error(`Failed to update service ${serviceId}`, { error });
    throw error;
  }
}

/**
 * Register resource IPC listeners
 */
export function addResourcesListeners() {
  ipcMain.handle(RESOURCES_GET_ALL, async () => {
    return await getAllResources();
  });

  ipcMain.handle(RESOURCES_DELETE, async (_event, { type, id }) => {
    await deleteResource(type, id);
  });

  ipcMain.handle(RESOURCES_UPDATE_SERVICE, async (_event, { serviceId }) => {
    await updateService(serviceId);
  });
}
