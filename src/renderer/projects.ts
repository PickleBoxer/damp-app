/** Query keys and query options for projects */

import { queryOptions } from '@tanstack/react-query';

// Direct access to IPC API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;

/** Query keys for projects */
export const projectKeys = {
  list: () => ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  states: () => ['projects', 'states'] as const,
  containerState: (id: string) => ['projects', 'states', id] as const,
};

/** Query options for all projects - use in loaders */
export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.getAllProjects(),
    staleTime: Infinity, // Pure event-driven - mutations handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });

/** Query options for a specific project - use in loaders */
export const projectQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const project = await projectsApi.getProject(projectId);
      if (!project) {
        throw new Error(`Project with ID "${projectId}" not found`);
      }
      return project;
    },
    staleTime: Infinity, // Pure event-driven - Docker events handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });

/** Query options for a specific project's container state */
export const projectContainerStateQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: projectKeys.containerState(projectId),
    queryFn: () => projectsApi.getProjectContainerState(projectId),
    staleTime: Infinity, // Pure event-driven - Docker events handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });
