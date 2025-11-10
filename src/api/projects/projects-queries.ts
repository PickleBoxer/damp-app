/**
 * React Query hooks for projects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
