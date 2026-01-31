/**
 * Service container lookup utilities
 * Domain-specific container operations for services (standalone and bundled)
 */

import { findContainerByLabels, getContainerState } from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import type { ContainerState } from '@shared/types/container';
import type Docker from 'dockerode';

/**
 * Find service container by serviceId (standalone or bundled)
 * Unified approach using labels - works for both service and bundled-service containers
 * @param serviceId - The service ID to find
 * @param projectId - Optional project ID for bundled services
 * @returns Container info or null if not found
 */
export async function findServiceContainer(
  serviceId: string,
  projectId?: string
): Promise<Docker.ContainerInfo | null> {
  const labels: string[] = [
    `${LABEL_KEYS.SERVICE_ID}=${serviceId}`,
    `${LABEL_KEYS.TYPE}=${RESOURCE_TYPES.SERVICE_CONTAINER}`,
  ];

  // Add project filter for bundled services
  if (projectId) {
    labels.push(`${LABEL_KEYS.PROJECT_ID}=${projectId}`);
  }

  return findContainerByLabels(labels);
}

/**
 * Get service container state (standalone or bundled)
 * Combines findServiceContainer + getContainerState in one operation
 * @param serviceId - The service ID
 * @param projectId - Optional project ID for bundled services
 * @returns Container state
 */
export async function getServiceContainerState(
  serviceId: string,
  projectId?: string
): Promise<ContainerState> {
  const containerInfo = await findServiceContainer(serviceId, projectId);

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
