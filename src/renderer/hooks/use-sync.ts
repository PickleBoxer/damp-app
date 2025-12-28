/**
 * React Query hooks for volume sync operations
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Direct access to IPC API exposed via preload script
const syncApi = (globalThis as unknown as Window).sync;

// Types
export interface SyncOptions {
  includeNodeModules?: boolean;
  includeVendor?: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

/**
 * Query keys for sync operations
 */
export const syncKeys = {
  status: (projectId: string) => ['syncs', projectId] as const,
};

/**
 * Type for active sync state (direction + optional progress)
 */
export interface ActiveSync {
  direction: 'to' | 'from';
  percentage?: number;
  bytesTransferred?: number;
}

/**
 * Hook to get sync status for a specific project
 * Returns null when no sync is active, ActiveSync object when syncing
 * Query is created lazily on first call and auto-garbage-collected 5 minutes after sync completes
 */
export function useProjectSyncStatus(projectId: string) {
  return useQuery<ActiveSync | null>({
    queryKey: syncKeys.status(projectId),
    queryFn: () => null, // Initialize with no active sync
    staleTime: Infinity, // Never auto-refetch, only update via setQueryData
    // gcTime defaults to 5 minutes - query auto-cleans after sync completes
  });
}

/**
 * Hook to sync files from Docker volume to local folder
 */
export function useSyncFromVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, options }: { projectId: string; options?: SyncOptions }) =>
      syncApi.fromVolume(projectId, options),
    onMutate: ({ projectId }) => {
      // Check if project already has an active sync
      const currentSync = queryClient.getQueryData<ActiveSync | null>(syncKeys.status(projectId));
      if (currentSync !== null) {
        // Project already syncing, cancel this mutation
        throw new Error('Sync already in progress for this project');
      }

      // Immediately set sync status to prevent duplicate clicks
      queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), {
        direction: 'from',
      });
    },
    onSuccess: (result, { projectId }) => {
      if (!result.success) {
        // Only handle setup errors (Docker not running, project not found)
        // These fail immediately before sync starts, so we need to clean up
        toast.error(result.error || 'Failed to start sync from volume');
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
      }
      // On success, sync is running - IPC progress events will handle state updates
    },
    onError: (error: Error, { projectId }) => {
      // Only handle mutation errors (onMutate threw error)
      toast.error(`${error.message}`);
      // Clean up if we set sync status but mutation failed
      queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
    },
  });
}

/**
 * Hook to sync files from local folder to Docker volume
 */
export function useSyncToVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, options }: { projectId: string; options?: SyncOptions }) =>
      syncApi.toVolume(projectId, options),
    onMutate: ({ projectId }) => {
      // Check if project already has an active sync
      const currentSync = queryClient.getQueryData<ActiveSync | null>(syncKeys.status(projectId));
      if (currentSync !== null) {
        // Project already syncing, cancel this mutation
        throw new Error('Sync already in progress for this project');
      }

      // Immediately set sync status to prevent duplicate clicks
      queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), {
        direction: 'to',
      });
    },
    onSuccess: (result, { projectId }) => {
      if (!result.success) {
        // Only handle setup errors (Docker not running, project not found)
        // These fail immediately before sync starts, so we need to clean up
        toast.error(result.error || 'Failed to start sync to volume');
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
      }
      // On success, sync is running - IPC progress events will handle state updates
    },
    onError: (error: Error, { projectId }) => {
      // Only handle mutation errors (onMutate threw error)
      toast.error(`${error.message}`);
      // Clean up if we set sync status but mutation failed
      queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
    },
  });
}

/**
 * Hook to listen for sync status updates
 * Updates the active syncs map in React Query cache
 */
export function useSyncProgress() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Setup status listener
    const cleanup = syncApi.onSyncProgress((projectId, direction, progress) => {
      // Update individual project sync status in cache
      if (progress.status === 'started') {
        // Set sync status when started
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), { direction });
      } else if (progress.status === 'progress') {
        // Update with progress data
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), prev =>
          prev
            ? {
                ...prev,
                percentage: progress.percentage,
                bytesTransferred: progress.bytesTransferred,
              }
            : prev
        );
      } else if (progress.status === 'completed') {
        // Clear sync status when finished
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
        // Show success toast
        toast.success(
          direction === 'from' ? 'Sync from volume completed' : 'Sync to volume completed'
        );
      } else if (progress.status === 'failed') {
        // Clear sync status when failed
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
        // Show error toast
        toast.error(direction === 'from' ? 'Sync from volume failed' : 'Sync to volume failed');
      }
    });

    return cleanup;
  }, [queryClient]);
}

/**
 * Hook to cancel an in-progress sync operation
 */
export function useCancelSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => syncApi.cancel(projectId),
    onSuccess: (result, projectId) => {
      if (result.success) {
        // Clear sync status immediately
        queryClient.setQueryData<ActiveSync | null>(syncKeys.status(projectId), null);
        toast.info('Sync cancelled');
      } else {
        toast.error(result.error || 'Failed to cancel sync');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel sync: ${error.message}`);
    },
  });
}
