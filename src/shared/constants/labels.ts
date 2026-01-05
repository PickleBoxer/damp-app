/**
 * Centralized Docker container and volume label management
 * Single source of truth for all DAMP resource labeling
 */

import type { ServiceId, ServiceType } from '@shared/types/service';

// Label namespace prefix (Docker best practice)
export const LABEL_NAMESPACE = 'com.pickleboxer.damp' as const;

/**
 * Label keys - centralized constants for all DAMP labels
 */
export const LABEL_KEYS = {
  // Common labels
  MANAGED: `${LABEL_NAMESPACE}.managed`,
  TYPE: `${LABEL_NAMESPACE}.type`,
  DESCRIPTION: `${LABEL_NAMESPACE}.description`,

  // Service labels
  SERVICE_ID: `${LABEL_NAMESPACE}.service-id`,
  SERVICE_TYPE: `${LABEL_NAMESPACE}.service-type`,

  // Project labels
  PROJECT_ID: `${LABEL_NAMESPACE}.project-id`,
  PROJECT_NAME: `${LABEL_NAMESPACE}.project-name`,

  // Helper container labels
  OPERATION: `${LABEL_NAMESPACE}.operation`,
  VOLUME: `${LABEL_NAMESPACE}.volume`,
  EPHEMERAL: `${LABEL_NAMESPACE}.ephemeral`,
} as const;

/**
 * Helper operation types for temporary containers
 */
export const HELPER_OPERATIONS = {
  VOLUME_COPY: 'volume-copy',
  VOLUME_SYNC_TO: 'volume-sync-to',
  VOLUME_SYNC_FROM: 'volume-sync-from',
  LARAVEL_INSTALL: 'laravel-install',
  LARAVEL_FLATTEN: 'laravel-flatten',
} as const;

export type HelperOperation = (typeof HELPER_OPERATIONS)[keyof typeof HELPER_OPERATIONS];

/**
 * Resource type values
 */
export const RESOURCE_TYPES = {
  SERVICE_CONTAINER: 'service-container',
  SERVICE_VOLUME: 'service-volume',
  PROJECT_CONTAINER: 'project-container',
  PROJECT_VOLUME: 'project-volume',
  HELPER_CONTAINER: 'helper-container',
  NGROK_TUNNEL: 'ngrok-tunnel',
  NETWORK: 'network',
} as const;

/**
 * Build labels for service containers
 */
export function buildServiceContainerLabels(
  serviceId: ServiceId,
  serviceType: ServiceType
): Record<string, string> {
  if (!serviceId || typeof serviceId !== 'string') {
    throw new Error('Service ID is required and must be a non-empty string');
  }
  if (!serviceType || typeof serviceType !== 'string') {
    throw new Error('Service type is required and must be a non-empty string');
  }

  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.SERVICE_CONTAINER,
    [LABEL_KEYS.SERVICE_ID]: serviceId,
    [LABEL_KEYS.SERVICE_TYPE]: serviceType,
  };
}

/**
 * Build labels for service volumes
 */
export function buildServiceVolumeLabels(
  serviceId: ServiceId,
  volumeName: string
): Record<string, string> {
  if (!serviceId || typeof serviceId !== 'string') {
    throw new Error('Service ID is required and must be a non-empty string');
  }
  if (!volumeName || typeof volumeName !== 'string') {
    throw new Error('Volume name is required and must be a non-empty string');
  }

  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.SERVICE_VOLUME,
    [LABEL_KEYS.SERVICE_ID]: serviceId,
    [LABEL_KEYS.VOLUME]: volumeName,
  };
}

/**
 * Build labels for project containers (used in devcontainer.json runArgs)
 * Returns object for programmatic use - convert to CLI flags when needed
 */
export function buildProjectContainerLabels(
  projectId: string,
  projectName: string
): Record<string, string> {
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a non-empty string');
  }
  if (!projectName || typeof projectName !== 'string') {
    throw new Error('Project name is required and must be a non-empty string');
  }

  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.PROJECT_CONTAINER,
    [LABEL_KEYS.PROJECT_ID]: projectId,
    [LABEL_KEYS.PROJECT_NAME]: projectName,
  };
}

/**
 * Build labels for project volumes
 */
export function buildProjectVolumeLabels(
  projectId: string,
  volumeName: string
): Record<string, string> {
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a non-empty string');
  }
  if (!volumeName || typeof volumeName !== 'string') {
    throw new Error('Volume name is required and must be a non-empty string');
  }

  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.PROJECT_VOLUME,
    [LABEL_KEYS.PROJECT_ID]: projectId,
    [LABEL_KEYS.VOLUME]: volumeName,
  };
}

/**
 * Build labels for helper/temporary containers
 */
export function buildHelperContainerLabels(
  operation: HelperOperation,
  volumeName: string,
  projectId: string
): Record<string, string> {
  if (!operation || typeof operation !== 'string') {
    throw new Error('Operation is required and must be a non-empty string');
  }
  if (!volumeName || typeof volumeName !== 'string') {
    throw new Error('Volume name is required and must be a non-empty string');
  }
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a non-empty string');
  }

  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.HELPER_CONTAINER,
    [LABEL_KEYS.OPERATION]: operation,
    [LABEL_KEYS.VOLUME]: volumeName,
    [LABEL_KEYS.PROJECT_ID]: projectId,
    [LABEL_KEYS.EPHEMERAL]: 'true',
  };
}

/**
 * Build labels for ngrok tunnel containers
 */
export function buildNgrokLabels(projectId: string): Record<string, string> {
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a non-empty string');
  }

  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.NGROK_TUNNEL,
    [LABEL_KEYS.PROJECT_ID]: projectId,
  };
}

/**
 * Build labels for DAMP network
 */
export function buildNetworkLabels(): Record<string, string> {
  return {
    [LABEL_KEYS.MANAGED]: 'true',
    [LABEL_KEYS.TYPE]: RESOURCE_TYPES.NETWORK,
    [LABEL_KEYS.DESCRIPTION]: 'Shared network for DAMP services and projects',
  };
}
