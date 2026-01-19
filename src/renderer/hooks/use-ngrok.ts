/**
 * TanStack Query hooks for ngrok tunnel management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NgrokStatusData } from '@shared/types/ngrok';

// Re-export types for convenience
export type { NgrokStatus, NgrokStatusData } from '@shared/types/ngrok';

// Direct access to IPC API exposed via preload script
const ngrokApi = (globalThis as unknown as Window).ngrok;

/**
 * Query key factory for ngrok queries
 */
export const ngrokKeys = {
  status: (projectId: string) => ['ngrok', projectId] as const,
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
      return { projectId, data: result.data };
    },
    onSuccess: async ({ projectId, data }) => {
      // Use status data returned by backend (no extra IPC call needed)
      if (data) {
        queryClient.setQueryData(ngrokKeys.status(projectId), data);
      }
      toast.success('Ngrok tunnel started successfully!');
    },
    onError: (error: Error) => {
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
      return { projectId, data: result.data };
    },
    onSuccess: async ({ projectId, data }) => {
      // Use status data returned by backend (no extra IPC call needed)
      if (data) {
        queryClient.setQueryData(ngrokKeys.status(projectId), data);
      }
      toast.info('Ngrok tunnel stopped');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop ngrok tunnel');
    },
  });
}

/**
 * Hook to get ngrok tunnel status for a project
 * Polls aggressively when starting (2s), slowly when active (15s)
 * Uses non-blocking startup configuration and 5-minute garbage collection
 */
export function useNgrokStatus(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ngrokKeys.status(projectId),
    queryFn: async () => {
      const result = await ngrokApi.getStatus(projectId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get ngrok status');
      }
      return result.data ?? ({ status: 'stopped' } satisfies NgrokStatusData);
    },
    refetchInterval: query => {
      const data = query.state.data;
      // Minimal polling while starting (before tunnel becomes active)
      // Events handle active/stopped/crashed states
      if (data?.status === 'starting') {
        return 5000; // 5s fallback while container initializes
      }
      // No polling needed - Docker events provide real-time updates
      return false;
    },
    // Non-blocking startup configuration
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
    initialData: { status: 'stopped' } satisfies NgrokStatusData,
    staleTime: 25000,
    // Default gcTime is 5 minutes - queries auto-cleanup after going inactive
    enabled: options?.enabled ?? true,
  });
}
