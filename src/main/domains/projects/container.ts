/**
 * Project container lookup utilities
 * Domain-specific container operations for projects
 */

import { findContainerByLabels, getContainerState } from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import type { ContainerState } from '@shared/types/container';
import type Docker from 'dockerode';

/**
 * Find project container by projectId
 * @param projectId - The project ID to find
 * @returns Container info or null if not found
 */
export async function findProjectContainer(
  projectId: string
): Promise<Docker.ContainerInfo | null> {
  return findContainerByLabels([
    `${LABEL_KEYS.PROJECT_ID}=${projectId}`,
    `${LABEL_KEYS.TYPE}=${RESOURCE_TYPES.PROJECT_CONTAINER}`,
  ]);
}

/**
 * Get project container state
 * Combines findProjectContainer + getContainerState in one operation
 * @param projectId - The project ID
 * @returns Container state
 */
export async function getProjectContainerState(projectId: string): Promise<ContainerState> {
  const containerInfo = await findProjectContainer(projectId);

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
