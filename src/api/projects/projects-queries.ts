/**
 * React Query hooks for projects
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectOperationResult,
} from '../../types/project';
import * as projectsApi from './projects-api';

/**
 * Query keys for projects
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: unknown) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  containerStatus: (id: string) => [...projectKeys.all, 'container-status', id] as const,
};

/**
 * Query options for all projects - use this in loaders
 */
export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: projectKeys.lists(),
    queryFn: projectsApi.getAllProjects,
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
 * Get all projects with suspense (preferred when using loaders)
 */
export function useSuspenseProjects() {
  return useSuspenseQuery(projectsQueryOptions());
}

/**
 * Get a specific project
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    ...projectQueryOptions(projectId || ''),
    enabled: !!projectId,
  });
}

/**
 * Get a specific project with suspense (preferred when using loaders)
 */
export function useSuspenseProject(projectId: string) {
  return useSuspenseQuery(projectQueryOptions(projectId));
}

/**
 * Get container status for a project
 *
 * Performance notes:
 * - Lazy initialization: Docker manager is only loaded on first status check
 * - Non-blocking: IPC calls are async and don't block app startup
 * - Configurable polling: Can disable polling entirely or adjust interval per use case
 * - Cached results: Uses React Query cache to minimize redundant checks
 *
 * @param projectId - Project ID to check status for
 * @param options.enabled - Whether to actively fetch status (default: true)
 * @param options.pollingInterval - How often to poll in ms (default: 10000, 0 = no polling)
 */
export function useProjectContainerStatus(
  projectId: string | undefined,
  options?: { enabled?: boolean; pollingInterval?: number }
) {
  return useQuery({
    queryKey: projectKeys.containerStatus(projectId || ''),
    queryFn: () => projectsApi.getContainerStatus(projectId || ''),
    enabled: options?.enabled !== false && !!projectId,
    refetchInterval: options?.pollingInterval ?? 10000, // Poll every 10 seconds by default
    staleTime: 8000, // Consider data fresh for 8 seconds
    gcTime: 30000, // Keep in cache for 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus to keep data fresh
  });
}

/**
 * Create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectOperationResult, Error, CreateProjectInput>({
    mutationFn: projectsApi.createProject,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      if (data.success) {
        toast.success('Project created successfully', {
          description: `${variables.name} is ready to use`,
        });
      } else if (data.error) {
        toast.error('Failed to create project', {
          description: data.error,
        });
      } else {
        toast.error('Failed to create project', {
          description: 'An unexpected response was received',
        });
      }
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

  return useMutation<ProjectOperationResult, Error, UpdateProjectInput>({
    mutationFn: projectsApi.updateProject,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      if (data.success) {
        toast.success('Project updated successfully', {
          description: 'Your changes have been saved',
        });
      } else if (data.error) {
        toast.error('Failed to update project', {
          description: data.error,
        });
      } else {
        toast.error('Failed to update project', {
          description: 'An unexpected response was received',
        });
      }
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
    ProjectOperationResult,
    Error,
    { projectId: string; removeVolume?: boolean; removeFolder?: boolean }
  >({
    mutationFn: ({ projectId, removeVolume, removeFolder }) =>
      projectsApi.deleteProject(projectId, removeVolume, removeFolder),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      if (data.success) {
        toast.success('Project deleted successfully', {
          description: 'The project has been removed',
        });
      } else if (data.error) {
        toast.error('Failed to delete project', {
          description: data.error,
        });
      } else {
        toast.error('Failed to delete project', {
          description: 'An unexpected response was received',
        });
      }
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

  return useMutation<
    ProjectOperationResult,
    Error,
    string[],
    { previousProjects?: Project[] } | undefined
  >({
    mutationFn: projectsApi.reorderProjects,
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
    onSuccess: data => {
      if (data.success) {
        toast.success('Projects reordered successfully');
      } else if (data.error) {
        toast.error('Failed to reorder projects', {
          description: data.error,
        });
      } else {
        toast.error('Failed to reorder projects', {
          description: 'An unexpected response was received',
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Copy project files to volume
 */
export function useCopyProjectToVolume() {
  const queryClient = useQueryClient();

  return useMutation<ProjectOperationResult, Error, string>({
    mutationFn: projectsApi.copyProjectToVolume,
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });

      if (data.success) {
        toast.success('Files copied to volume successfully', {
          description: 'Your project files are now available in the volume',
        });
      } else if (data.error) {
        toast.error('Failed to copy files to volume', {
          description: data.error,
        });
      } else {
        toast.error('Failed to copy files to volume', {
          description: 'An unexpected response was received',
        });
      }
    },
    onError: error => {
      toast.error('Failed to copy files to volume', {
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
}

/**
 * Select folder dialog
 */
export function useSelectFolder() {
  return useMutation({
    mutationFn: (defaultPath?: string) => projectsApi.selectFolder(defaultPath),
  });
}

/**
 * Detect Laravel in folder
 */
export function useDetectLaravel() {
  return useMutation({
    mutationFn: (folderPath: string) => projectsApi.detectLaravel(folderPath),
  });
}

/**
 * Check if devcontainer exists
 */
export function useDevcontainerExists() {
  return useMutation({
    mutationFn: (folderPath: string) => projectsApi.devcontainerExists(folderPath),
  });
}
