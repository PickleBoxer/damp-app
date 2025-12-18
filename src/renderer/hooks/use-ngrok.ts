/**
 * TanStack Query hooks for ngrok tunnel management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Direct access to IPC API exposed via preload script
const ngrokApi = (globalThis as unknown as Window).ngrok;

export type NgrokStatus = 'starting' | 'active' | 'stopped' | 'error';

/**
 * Query key factory for ngrok queries
 */
export const ngrokKeys = {
  all: ['ngrok'] as const,
  status: (projectId: string) => ['ngrok', 'status', projectId] as const,
  url: (projectId: string) => ['ngrok', 'url', projectId] as const,
  allActiveTunnels: (projectIds: string[]) =>
    ['ngrok', 'all-active-tunnels', ...projectIds] as const,
};

/**
 * Hook to start ngrok tunnel for a project
 */
export function useStartNgrokTunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      authToken,
      region,
    }: {
      projectId: string;
      authToken: string;
      region?: string;
    }) => {
      const result = await ngrokApi.startTunnel(projectId, authToken, region);
      if (!result.success) {
        throw new Error(result.error || 'Failed to start ngrok tunnel');
      }
      return result.data;
    },
    onMutate: async variables => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ngrokKeys.status(variables.projectId) });

      // Optimistically update to 'starting' state
      queryClient.setQueryData(ngrokKeys.status(variables.projectId), {
        status: 'starting' as NgrokStatus,
        containerId: undefined,
        error: undefined,
        publicUrl: undefined,
      });
    },
    onSuccess: (_data, variables) => {
      toast.success('Ngrok tunnel started successfully!');
      // Invalidate status and URL queries
      queryClient.invalidateQueries({ queryKey: ngrokKeys.status(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: ngrokKeys.url(variables.projectId) });
      // Enable and invalidate the aggregated active tunnels query for footer
      queryClient.invalidateQueries({ queryKey: ['ngrok', 'all-active-tunnels'] });
      // Force refetch to enable polling now that a tunnel is active
      queryClient.refetchQueries({ queryKey: ['ngrok', 'all-active-tunnels'] });
    },
    onError: (error: Error, variables) => {
      // Immediately update cache with error state for instant UI feedback
      queryClient.setQueryData(ngrokKeys.status(variables.projectId), {
        status: 'error' as NgrokStatus,
        containerId: undefined,
        error: error.message,
        publicUrl: undefined,
      });
      toast.error(error.message || 'Failed to start ngrok tunnel');
    },
  });
}

/**
 * Hook to stop ngrok tunnel for a project
 */
export function useStopNgrokTunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await ngrokApi.stopTunnel(projectId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop ngrok tunnel');
      }
      return result;
    },
    onMutate: async projectId => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ngrokKeys.status(projectId) });

      // Optimistically update to 'stopped' state
      queryClient.setQueryData(ngrokKeys.status(projectId), {
        status: 'stopped' as NgrokStatus,
        containerId: undefined,
        error: undefined,
        publicUrl: undefined,
      });
    },
    onSuccess: (_data, projectId) => {
      toast.info('Ngrok tunnel stopped');
      // Invalidate status and URL queries
      queryClient.invalidateQueries({ queryKey: ngrokKeys.status(projectId) });
      queryClient.invalidateQueries({ queryKey: ngrokKeys.url(projectId) });
      // Invalidate the aggregated active tunnels query for footer
      queryClient.invalidateQueries({ queryKey: ['ngrok', 'all-active-tunnels'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop ngrok tunnel');
    },
  });
}

/**
 * Hook to get ngrok tunnel status for a project
 * Polls when status is 'starting' or 'active'
 */
export function useNgrokStatus(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ngrokKeys.status(projectId),
    queryFn: async () => {
      const result = await ngrokApi.getStatus(projectId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get ngrok status');
      }
      return result.data as
        | {
            status: NgrokStatus;
            containerId?: string;
            error?: string;
            publicUrl?: string;
          }
        | undefined;
    },
    refetchInterval: query => {
      const data = query.state.data;
      // Poll every 5 seconds when starting or active
      if (data?.status === 'starting' || data?.status === 'active') {
        return 5000;
      }
      // Poll once after 2 seconds on error to sync state, then stop
      if (data?.status === 'error' && query.state.dataUpdatedAt > Date.now() - 2000) {
        return 2000;
      }
      return false; // Don't poll when stopped or after error sync
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to get all active ngrok tunnels across all projects
 * Uses a single query that fetches statuses for all projects in parallel
 * This is the single source of truth for the footer indicator
 * Completely dormant until a tunnel is started (lazy evaluation)
 */
export function useActiveNgrokTunnels(projectIds: string[]) {
  return useQuery({
    queryKey: ['ngrok', 'all-active-tunnels', ...projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) {
        return [];
      }

      // Fetch all statuses in parallel (only for projects, Docker will cache state)
      const statusPromises = projectIds.map(async projectId => {
        try {
          const result = await ngrokApi.getStatus(projectId);
          if (result.success && result.data) {
            const status = result.data.status;
            if (status === 'active' || status === 'starting') {
              return {
                id: projectId,
                status: status as NgrokStatus,
                publicUrl: result.data.publicUrl,
              };
            }
          }
        } catch {
          // Silently ignore errors for individual projects
        }
        return null;
      });

      const results = await Promise.allSettled(statusPromises);

      // Filter out null results and extract fulfilled values
      const activeTunnels: Array<{
        id: string;
        status: NgrokStatus;
        publicUrl?: string;
      }> = [];

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value !== null) {
          activeTunnels.push(result.value);
        }
      }

      return activeTunnels;
    },
    // Intelligent refetch: only poll if there are active/starting tunnels
    refetchInterval: query => {
      const data = query.state.data;
      if (data && data.length > 0) {
        // Some tunnels are active, poll every 5 seconds
        return 5000;
      }
      // No active tunnels, stop polling completely
      return false;
    },
    staleTime: 4000,
    // Enabled but won't fetch on mount - waits for mutation to trigger refetch
    enabled: projectIds.length > 0,
    // Never fetch automatically on mount/focus/reconnect
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Start with empty array (no loading, no fetching)
    initialData: [],
    // Allow manual refetch to work even though auto-refetch is disabled
    notifyOnChangeProps: 'all',
  });
}
