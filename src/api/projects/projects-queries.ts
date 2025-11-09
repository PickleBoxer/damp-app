/**
 * React Query hooks for projects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
};

/**
 * Get all projects
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: projectsApi.getAllProjects,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get a specific project
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId || ''),
    queryFn: () => projectsApi.getProject(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectOperationResult, Error, CreateProjectInput>({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
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
    onError: (_error, _newOrder, context) => {
      // Rollback to the previous value on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
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
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
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
