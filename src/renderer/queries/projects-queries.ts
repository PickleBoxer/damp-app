/**
 * React Query hooks for projects
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  FolderSelectionResult,
} from '@shared/types/project';

// Direct access to IPC API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;
const dockerEventsApi = (globalThis as unknown as Window).dockerEvents;

/**
 * Query keys for projects
 */
export const projectKeys = {
  lists: () => ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  statuses: () => ['projects', 'statuses'] as const,
  port: (id: string) => ['projects', 'port', id] as const,
};

/**
 * Query options for all projects - use this in loaders
 */
export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: projectKeys.lists(),
    queryFn: () => projectsApi.getAllProjects(),
    refetchInterval: 60000, // 60s polling as fallback safety net
    staleTime: Infinity, // Never consider stale - events drive updates
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
    refetchInterval: 60000, // 60s polling as fallback safety net
    staleTime: Infinity, // Never consider stale - events drive updates
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
 * This is an event-driven query optimized for real-time updates:
 * - Docker events provide real-time updates (primary mechanism)
 * - Polling at 60s serves as fallback safety net only
 * - Non-blocking on app initialization (no stale/gc time limits)
 * - Single query key for all projects (no array in key)
 * - Automatically refetches on Docker container events
 *
 * @param projectIds - Array of project IDs to check status for
 * @param options.enabled - Whether to actively fetch status (default: true)
 */
export function useProjectsStatuses(projectIds: string[], options?: { enabled?: boolean }) {
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: projectKeys.statuses(),
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      return await projectsApi.getBatchContainerStatus(projectIds);
    },
    enabled: options?.enabled !== false && projectIds.length > 0,
    refetchInterval: 60000, // 60s polling as fallback safety net
    staleTime: Infinity, // Never consider stale - events drive updates
    gcTime: Infinity, // Keep in cache indefinitely
    refetchOnWindowFocus: false, // Don't refetch on focus - events handle updates
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
 * Open folder selection dialog
 * Direct access to dialog interaction
 */
export async function selectFolder(defaultPath?: string): Promise<FolderSelectionResult> {
  return await projectsApi.selectFolder(defaultPath);
}

/**
 * Hook to subscribe to Docker container events and invalidate affected project queries
 *
 * This enables event-driven real-time updates:
 * - Listens to container start/stop/die/health events from Docker daemon
 * - Matches event's containerName to find the affected project ID
 * - Invalidates project-specific queries (detail, port) for targeted refetches
 * - Invalidates project list and statuses for global updates
 * - Non-blocking: events trigger background refetches via React Query
 *
 * Usage: Call once at the app root level or in ProjectsPage layout
 */
export function useDockerContainerEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to Docker container events
    const unsubscribe = dockerEventsApi.onEvent(event => {
      // Log event for debugging
      console.debug('[Docker Event]', event.action, event.containerName);

      // Get cached projects to map containerName → projectId
      const cachedProjects = queryClient.getQueryData<Project[]>(projectKeys.lists());

      // Find the affected project by matching containerName
      const affectedProject = cachedProjects?.find(
        project => project.containerName === event.containerName
      );

      if (affectedProject) {
        // Invalidate project-specific queries for this container
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(affectedProject.id),
          refetchType: 'active',
        });

        queryClient.invalidateQueries({
          queryKey: projectKeys.port(affectedProject.id),
          refetchType: 'active',
        });
      }

      // Always invalidate projects list (affects all views showing projects)
      queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
        refetchType: 'active',
      });

      // Invalidate batch status query (fallback for unmatched containers)
      queryClient.invalidateQueries({
        queryKey: projectKeys.statuses(),
        refetchType: 'active',
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
}
