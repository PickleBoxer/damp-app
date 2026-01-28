/**
 * Resources IPC listeners
 * Handles Docker resource management operations
 */

import { getAllManagedContainers, removeContainer } from '@main/core/docker/container';
import { docker } from '@main/core/docker/docker';
import { getAllManagedVolumes, removeVolume } from '@main/core/docker/volume';
import { projectStorage } from '@main/core/storage/project-storage';
import { serviceStorage } from '@main/core/storage/service-storage';
import { projectStateManager } from '@main/domains/projects/project-state-manager';
import { getServiceDefinition } from '@main/domains/services/service-definitions';
import { serviceStateManager } from '@main/domains/services/service-state-manager';
import { createLogger } from '@main/utils/logger';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import type { DockerResource } from '@shared/types/resource';
import type { ServiceId } from '@shared/types/service';
import { ipcMain } from 'electron';
import { z } from 'zod';
import {
  RESOURCES_DELETE,
  RESOURCES_GET_ALL,
  RESOURCES_PRUNE_ORPHANS,
  RESOURCES_UPDATE_SERVICE,
} from './resources-channels';

const logger = createLogger('ResourcesListeners');

// Validation schemas
const deleteResourceSchema = z.object({
  type: z.enum(['container', 'volume']),
  id: z.string().min(1),
});

const updateServiceSchema = z.object({
  serviceId: z.string().min(1),
});

const pruneOrphansSchema = z.object({
  containerIds: z.array(z.string()).optional(),
  volumeNames: z.array(z.string()).optional(),
});

/**
 * Mapping of internal category names to user-friendly display names
 */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  helper: 'Helper',
  ngrok: 'Ngrok',
  unknown: 'Uncategorized',
};

/**
 * Determine owner ID and display name for a resource
 */
function getOwnerInfo(
  projectId: string | undefined,
  serviceId: string | undefined,
  category: DockerResource['category'],
  projects: { id: string; name: string }[]
): { ownerId: string; ownerDisplayName: string } {
  const ownerId = projectId || serviceId || category || 'uncategorized';
  let ownerDisplayName: string;

  if (projectId) {
    const project = projects.find(p => p.id === projectId);
    ownerDisplayName = project?.name || projectId;
  } else if (serviceId) {
    ownerDisplayName = serviceId;
  } else {
    // Use readable category name
    ownerDisplayName = CATEGORY_DISPLAY_NAMES[category] || category;
  }

  return { ownerId, ownerDisplayName };
}

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
      ...containerGroups.bundled,
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
        // Not orphan if project exists or is currently being created
        isOrphan =
          !projects.some(p => p.id === projectId) &&
          !projectStateManager.isPendingProject(projectId);
      } else if (type === RESOURCE_TYPES.SERVICE_CONTAINER && serviceId) {
        category = 'service';
        isOrphan = !serviceStates[serviceId];

        // Check if service definition has changed
        if (!isOrphan) {
          needsUpdate = await hasServiceDefinitionChanged(serviceId, container.Id);
        }
      } else if (type === RESOURCE_TYPES.BUNDLED_SERVICE_CONTAINER && projectId) {
        category = 'bundled';
        // Not orphan if project exists or is currently being created
        isOrphan =
          !projects.some(p => p.id === projectId) &&
          !projectStateManager.isPendingProject(projectId);
      } else if (type === RESOURCE_TYPES.HELPER_CONTAINER) {
        category = 'helper';
      } else if (type === RESOURCE_TYPES.NGROK_TUNNEL) {
        category = 'ngrok';
      }

      const containerName =
        container.Names?.[0]?.replace(/^\//, '') || container.Id.substring(0, 12);

      // Determine owner ID and display name
      const { ownerId, ownerDisplayName } = getOwnerInfo(projectId, serviceId, category, projects);

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
        // Not orphan if project exists or is currently being created
        isOrphan =
          !projects.some(p => p.id === projectId) &&
          !projectStateManager.isPendingProject(projectId);
      } else if (type === RESOURCE_TYPES.SERVICE_VOLUME && serviceId) {
        category = 'service';
        // Volume is orphaned if there's no container for this service
        const hasContainer = allContainers.some(
          c => c.Labels?.[LABEL_KEYS.SERVICE_ID] === serviceId
        );
        isOrphan = !hasContainer;
      }

      // Determine owner ID and display name
      const { ownerId, ownerDisplayName } = getOwnerInfo(projectId, serviceId, category, projects);

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

    // Compare environment variables using key/value parsing
    const parseEnv = (env: string[] | undefined | null): Map<string, string> => {
      const map = new Map<string, string>();
      if (!env) return map;
      for (const entry of env) {
        const idx = entry.indexOf('=');
        if (idx === -1) {
          // Variable without an explicit value
          map.set(entry, '');
        } else {
          const key = entry.slice(0, idx);
          const value = entry.slice(idx + 1);
          map.set(key, value);
        }
      }
      return map;
    };

    const currentEnvMap = parseEnv(inspect.Config.Env);
    const definitionEnvMap = parseEnv(definition.default_config.environment_vars);

    // Check for missing or changed variables relative to the definition
    for (const [key, definitionValue] of definitionEnvMap.entries()) {
      const currentValue = currentEnvMap.get(key);
      if (currentValue === undefined || currentValue !== definitionValue) {
        logger.debug(
          `Service ${serviceId} missing or changed environment variable: ${key}=${definitionValue}`
        );
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
    const uninstallResult = await serviceStateManager.uninstallService(serviceId, true);
    if (!uninstallResult.success) {
      throw new Error(uninstallResult.error || 'Failed to uninstall service');
    }

    // Reinstall service with new definition
    const installResult = await serviceStateManager.installService(serviceId);
    if (!installResult.success) {
      throw new Error(installResult.error || 'Failed to install service');
    }

    logger.info(`Service ${serviceId} updated successfully`);
  } catch (error) {
    logger.error(`Failed to update service ${serviceId}`, { error });
    throw error;
  }
}

/**
 * Batch delete containers in parallel
 */
async function batchDeleteContainers(containerIds: string[]): Promise<{
  deleted: string[];
  failed: string[];
}> {
  const deleted: string[] = [];
  const failed: string[] = [];

  logger.info(`Batch deleting ${containerIds.length} containers...`);

  await Promise.allSettled(
    containerIds.map(async id => {
      try {
        await removeContainer(id, true);
        deleted.push(id);
        logger.debug(`Deleted container: ${id}`);
      } catch (error) {
        failed.push(id);
        logger.error(`Failed to delete container ${id}`, { error });
      }
    })
  );

  return { deleted, failed };
}

/**
 * Batch delete volumes in parallel
 */
async function batchDeleteVolumes(volumeNames: string[]): Promise<{
  deleted: string[];
  failed: string[];
}> {
  const deleted: string[] = [];
  const failed: string[] = [];

  logger.info(`Batch deleting ${volumeNames.length} volumes...`);

  await Promise.allSettled(
    volumeNames.map(async name => {
      try {
        await removeVolume(name);
        deleted.push(name);
        logger.debug(`Deleted volume: ${name}`);
      } catch (error) {
        failed.push(name);
        logger.error(`Failed to delete volume ${name}`, { error });
      }
    })
  );

  return { deleted, failed };
}

/**
 * Batch prune orphaned resources using Docker APIs
 * Much faster than sequential deletion (parallel operations instead of N sequential calls)
 */
async function pruneOrphans(
  containerIds?: string[],
  volumeNames?: string[]
): Promise<{
  deletedContainers: string[];
  deletedVolumes: string[];
  failedContainers: string[];
  failedVolumes: string[];
}> {
  const containerResults =
    containerIds && containerIds.length > 0
      ? await batchDeleteContainers(containerIds)
      : { deleted: [], failed: [] };

  const volumeResults =
    volumeNames && volumeNames.length > 0
      ? await batchDeleteVolumes(volumeNames)
      : { deleted: [], failed: [] };

  logger.info(
    `Batch prune completed: ${containerResults.deleted.length} containers, ${volumeResults.deleted.length} volumes deleted`
  );

  return {
    deletedContainers: containerResults.deleted,
    deletedVolumes: volumeResults.deleted,
    failedContainers: containerResults.failed,
    failedVolumes: volumeResults.failed,
  };
}

/**
 * Register resource IPC listeners
 */
export function addResourcesListeners() {
  ipcMain.handle(RESOURCES_GET_ALL, async () => {
    return await getAllResources();
  });

  ipcMain.handle(RESOURCES_DELETE, async (_event, payload) => {
    const { type, id } = deleteResourceSchema.parse(payload);
    await deleteResource(type, id);
  });

  ipcMain.handle(RESOURCES_UPDATE_SERVICE, async (_event, payload) => {
    const { serviceId } = updateServiceSchema.parse(payload);
    await updateService(serviceId as ServiceId);
  });

  ipcMain.handle(RESOURCES_PRUNE_ORPHANS, async (_event, payload) => {
    const { containerIds, volumeNames } = pruneOrphansSchema.parse(payload);
    return await pruneOrphans(containerIds, volumeNames);
  });
}
