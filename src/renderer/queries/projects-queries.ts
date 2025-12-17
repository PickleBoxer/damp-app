/** TanStack Query hooks for project management */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  FolderSelectionResult,
} from '@shared/types/project';

// Direct access to IPC API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;

/** Query keys for projects */
export const projectKeys = {
  lists: () => ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  statuses: () => ['projects', 'statuses'] as const,
  containerStatus: (id: string) => ['projects', 'statuses', id] as const,
  port: (id: string) => ['projects', 'port', id] as const,
};

/** Query options for all projects - use in loaders */
export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: projectKeys.lists(),
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

/** Query options for a specific project's container status */
export const projectContainerStatusQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: projectKeys.containerStatus(projectId),
    queryFn: () => projectsApi.getProjectContainerStatus(projectId),
    staleTime: Infinity, // Pure event-driven - Docker events handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });

/** Fetches all projects */
export function useProjects() {
  return useQuery(projectsQueryOptions());
}

/**
 * Fetches a specific project's container status (running state, health).
 * Pure event-driven - Docker events provide real-time updates.
 */
export function useProjectContainerStatus(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...projectContainerStatusQueryOptions(projectId),
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Discovers forwarded localhost port for a project container.
 * Lazy-loaded, only runs when enabled (expensive operation ~2s).
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

/** Creates a new project */
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

/** Updates an existing project */
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

/** Deletes a project */
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

/** Reorders projects with optimistic updates */
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

/** Opens folder selection dialog */
export async function selectFolder(defaultPath?: string): Promise<FolderSelectionResult> {
  return await projectsApi.selectFolder(defaultPath);
}
