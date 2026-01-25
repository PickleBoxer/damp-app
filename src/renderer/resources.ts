/**
 * Query keys and query options for Docker resources
 */

import type { DockerResource } from '@shared/types/resource';
import { queryOptions } from '@tanstack/react-query';

// Direct access to IPC API exposed via preload script
const resourcesApi = (globalThis as unknown as Window).resources;

/** Query keys for resources */
export const resourcesKeys = {
  all: () => ['resources'] as const,
};

/** Query options for all Docker resources */
export const resourcesQueryOptions = () =>
  queryOptions({
    queryKey: resourcesKeys.all(),
    queryFn: () => resourcesApi.getAll(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: false, // No auto-refresh - Docker events handle updates
    refetchOnWindowFocus: true, // Refresh when user returns to the app
  });

/** Get count of orphaned resources */
export function getOrphanCount(resources: DockerResource[]): number {
  return resources.filter(r => r.isOrphan).length;
}

/** Get count of services needing updates */
export function getUpdateCount(resources: DockerResource[]): number {
  return resources.filter(r => r.needsUpdate).length;
}

/** Get orphaned resources */
export function getOrphanedResources(resources: DockerResource[]): DockerResource[] {
  return resources.filter(r => r.isOrphan);
}

/** Get services needing updates */
export function getServicesNeedingUpdate(resources: DockerResource[]): DockerResource[] {
  return resources.filter(r => r.needsUpdate);
}
