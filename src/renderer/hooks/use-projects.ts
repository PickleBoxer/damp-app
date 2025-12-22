/** Mutation hooks for project management */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@shared/types/project';
import { projectKeys } from '@renderer/projects';

// Direct access to IPC API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;

/** Creates a new project */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CreateProjectInput>({
    mutationFn: async (input: CreateProjectInput) => {
      const result = await projectsApi.createProject(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });

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

  return useMutation<unknown, Error, UpdateProjectInput>({
    mutationFn: async (input: UpdateProjectInput) => {
      const result = await projectsApi.updateProject(input);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });

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
    unknown,
    Error,
    { projectId: string; removeVolume?: boolean; removeFolder?: boolean }
  >({
    mutationFn: async ({ projectId, removeVolume, removeFolder }) => {
      const result = await projectsApi.deleteProject(projectId, removeVolume, removeFolder);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
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

  return useMutation<unknown, Error, string[], { previousProjects?: Project[] } | undefined>({
    mutationFn: async (projectIds: string[]) => {
      const result = await projectsApi.reorderProjects(projectIds);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reorder projects');
      }
      return result.data;
    },
    onMutate: async (newOrder: string[]) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.list() });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.list());

      // Optimistically update to the new order
      if (previousProjects) {
        const reorderedProjects = newOrder
          .map(id => previousProjects.find(p => p.id === id))
          .filter((p): p is Project => p !== undefined)
          .map((p, index) => ({ ...p, order: index }));

        queryClient.setQueryData(projectKeys.list(), reorderedProjects);
      }

      // Return a context object with the snapshotted value
      return { previousProjects };
    },
    onError: (error, _newOrder, context) => {
      // Rollback to the previous value on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.list(), context.previousProjects);
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
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}
