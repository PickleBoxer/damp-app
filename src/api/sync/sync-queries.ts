/**
 * React Query hooks for volume sync operations
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import * as syncApi from './sync-api';

/**
 * Query keys for sync operations
 */
export const syncKeys = {
  all: ['syncs'] as const,
  activeSyncs: () => [...syncKeys.all, 'active'] as const,
};

/**
 * Type for active sync state (just direction, no progress)
 */
export interface ActiveSync {
  direction: 'to' | 'from';
}

/**
 * Hook to get all active syncs
 * Returns a Map of projectId -> ActiveSync
 */
export function useActiveSyncs() {
  return useQuery<Map<string, ActiveSync>>({
    queryKey: syncKeys.activeSyncs(),
    queryFn: () => new Map(), // Initialize with empty map
    staleTime: Infinity, // Never auto-refetch, only update via setQueryData
    gcTime: Infinity, // Keep in cache forever
  });
}

/**
 * Hook to sync files from Docker volume to local folder
 */
export function useSyncFromVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, options }: { projectId: string; options?: syncApi.SyncOptions }) =>
      syncApi.syncFromVolume(projectId, options),
    onMutate: ({ projectId }) => {
      // Check if project already has an active sync
      const activeSyncs = queryClient.getQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs());
      if (activeSyncs?.has(projectId)) {
        // Project already syncing, cancel this mutation
        throw new Error('Sync already in progress for this project');
      }
      
      // Immediately add to active syncs to prevent duplicate clicks
      queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
        const newMap = new Map(oldMap || []);
        newMap.set(projectId, { direction: 'from' });
        return newMap;
      });
    },
    onSuccess: (result, { projectId }) => {
      if (!result.success) {
        // Only handle setup errors (Docker not running, project not found)
        // These fail immediately before sync starts, so we need to clean up
        toast.error(result.error || 'Failed to start sync from volume');
        queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
          const newMap = new Map(oldMap || []);
          newMap.delete(projectId);
          return newMap;
        });
      }
      // On success, sync is running - IPC progress events will handle state updates
    },
    onError: (error: Error, { projectId }) => {
      // Only handle mutation errors (onMutate threw error)
      toast.error(`${error.message}`);
      // Clean up if we added to active syncs but mutation failed
      queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
        const newMap = new Map(oldMap || []);
        newMap.delete(projectId);
        return newMap;
      });
    },
  });
}

/**
 * Hook to sync files from local folder to Docker volume
 */
export function useSyncToVolume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, options }: { projectId: string; options?: syncApi.SyncOptions }) =>
      syncApi.syncToVolume(projectId, options),
    onMutate: ({ projectId }) => {
      // Check if project already has an active sync
      const activeSyncs = queryClient.getQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs());
      if (activeSyncs?.has(projectId)) {
        // Project already syncing, cancel this mutation
        throw new Error('Sync already in progress for this project');
      }
      
      // Immediately add to active syncs to prevent duplicate clicks
      queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
        const newMap = new Map(oldMap || []);
        newMap.set(projectId, { direction: 'to' });
        return newMap;
      });
    },
    onSuccess: (result, { projectId }) => {
      if (!result.success) {
        // Only handle setup errors (Docker not running, project not found)
        // These fail immediately before sync starts, so we need to clean up
        toast.error(result.error || 'Failed to start sync to volume');
        queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
          const newMap = new Map(oldMap || []);
          newMap.delete(projectId);
          return newMap;
        });
      }
      // On success, sync is running - IPC progress events will handle state updates
    },
    onError: (error: Error, { projectId }) => {
      // Only handle mutation errors (onMutate threw error)
      toast.error(`${error.message}`);
      // Clean up if we added to active syncs but mutation failed
      queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
        const newMap = new Map(oldMap || []);
        newMap.delete(projectId);
        return newMap;
      });
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
      // Update active syncs in cache
      queryClient.setQueryData<Map<string, ActiveSync>>(syncKeys.activeSyncs(), oldMap => {
        const newMap = new Map(oldMap || []);

        if (progress.status === 'started') {
          // Add to active syncs when started
          newMap.set(projectId, { direction });
        } else if (progress.status === 'completed') {
          // Remove from active syncs when finished
          newMap.delete(projectId);
          // Show success toast
          toast.success(
            direction === 'from' ? 'Sync from volume completed' : 'Sync to volume completed'
          );
        } else if (progress.status === 'failed') {
          // Remove from active syncs when failed
          newMap.delete(projectId);
          // Show error toast
          toast.error(direction === 'from' ? 'Sync from volume failed' : 'Sync to volume failed');
        }

        return newMap;
      });
    });

    return cleanup;
  }, [queryClient]);
}

/**
 * Hook to get sync status for a specific project
 */
export function useProjectSyncStatus(projectId: string) {
  const { data: activeSyncs } = useActiveSyncs();
  return activeSyncs?.get(projectId) ?? null;
}
