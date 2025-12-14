/**
 * React Query hooks for projects
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@shared/types/project';
import { selectFolder, subscribeToCopyProgress } from './projects-helpers';

// Direct access to IPC API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;

/**
 * Query keys for projects
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  batchStatus: (ids: string[]) => [...projectKeys.all, 'batch-status', ids] as const,
  port: (id: string) => [...projectKeys.all, 'port', id] as const,
};

/**
 * Query options for all projects - use this in loaders
 */
export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: projectKeys.lists(),
    queryFn: () => projectsApi.getAllProjects(),
    staleTime: 5 * 1000,
  });

/**
 * Query options for a specific project - use this in loaders
 */
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
    staleTime: 5 * 1000,
  });

/**
 * Get all projects
 */
export function useProjects() {
  return useQuery(projectsQueryOptions());
}

/**
 * Get container status for multiple projects in a single batch call (OPTIMIZED)
 *
 * This is a major performance optimization that reduces IPC overhead:
 * - Instead of N IPC calls (one per project), makes only 1 batch IPC call
 * - Reduces polling frequency from N×interval to 1×interval
 * - Automatically pauses polling when page is not visible
 *
 * @param projectIds - Array of project IDs to check status for
 * @param options.enabled - Whether to actively fetch status (default: true)
 * @param options.pollingInterval - How often to poll in ms (default: 10000, 0 = no polling)
 */
export function useProjectsBatchStatus(
  projectIds: string[],
  options?: { enabled?: boolean; pollingInterval?: number }
) {
  return useQuery({
    queryKey: projectKeys.batchStatus(projectIds),
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      return await projectsApi.getBatchContainerStatus(projectIds);
    },
    enabled: options?.enabled !== false && projectIds.length > 0,
    refetchInterval: options?.pollingInterval ?? 10000, // Poll every 10 seconds by default
    staleTime: 5000, // Consider data fresh for 5 seconds
    gcTime: 60000, // Keep in cache for 60 seconds
    refetchOnWindowFocus: true, // Refetch when returning to app
  });
}

/**
 * Discover forwarded localhost port for a project's container (LAZY LOADED)
 *
 * This is separated from status check for performance:
 * - Only runs when explicitly enabled (e.g., when user opens Preview tab)
 * - Port discovery is expensive (~2s to scan dynamic port range)
 * - List views don't need ports, only detail view preview needs it
 * - Long cache time since port rarely changes once container is running
 *
 * @param projectId - Project ID to discover port for
 * @param options.enabled - Whether to actively discover port (default: false)
 */
export function useProjectPort(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectKeys.port(projectId || ''),
    queryFn: async () => {
      if (!projectId) return null;

      const project = await projectsApi.getProject(projectId);
      if (!project) return null;

      // Call IPC to discover port in main process (no CORS restrictions)
      return await projectsApi.discoverPort(project.containerName);
    },
    enabled: options?.enabled === true && !!projectId,
    staleTime: 5 * 60 * 1000, // Port rarely changes, cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch port on focus (it's stable)
  });
}

/**
 * Create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, CreateProjectInput>({
    mutationFn: async (input: CreateProjectInput) => {
      const result = await projectsApi.createProject(input);
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      toast.success('Project created successfully', {
        description: `${variables.name} is ready to use`,
      });
    },
    onError: error => {
      toast.error('Failed to create project', {
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, UpdateProjectInput>({
    mutationFn: (input: UpdateProjectInput) => projectsApi.updateProject(input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      toast.success('Project updated successfully', {
        description: 'Your changes have been saved',
      });
    },
    onError: error => {
      toast.error('Failed to update project', {
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { projectId: string; removeVolume?: boolean; removeFolder?: boolean }
  >({
    mutationFn: ({ projectId, removeVolume, removeFolder }) =>
      projectsApi.deleteProject(projectId, removeVolume, removeFolder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project deleted successfully', {
        description: 'The project has been removed',
      });
    },
    onError: error => {
      toast.error('Failed to delete project', {
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
}

/**
 * Reorder projects
 */
export function useReorderProjects() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[], { previousProjects?: Project[] } | undefined>({
    mutationFn: (projectIds: string[]) => projectsApi.reorderProjects(projectIds),
    onMutate: async (newOrder: string[]) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.lists());

      // Optimistically update to the new order
      if (previousProjects) {
        const reorderedProjects = newOrder
          .map(id => previousProjects.find(p => p.id === id))
          .filter((p): p is Project => p !== undefined)
          .map((p, index) => ({ ...p, order: index }));

        queryClient.setQueryData(projectKeys.lists(), reorderedProjects);
      }

      // Return a context object with the snapshotted value
      return { previousProjects };
    },
    onError: (error, _newOrder, context) => {
      // Rollback to the previous value on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }

      toast.error('Failed to reorder projects', {
        description: error.message || 'An unexpected error occurred',
      });
    },
    onSuccess: () => {
      toast.success('Projects reordered successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Re-export value-adding API functions (dialog interactions & event subscriptions)
 */
export { selectFolder, subscribeToCopyProgress };
