/**
 * TanStack Query hooks for Docker operations
 */

import { useQuery } from '@tanstack/react-query';

// Direct access to IPC API exposed via preload script
const dockerApi = (globalThis as unknown as Window).docker;

// Query keys
export const dockerKeys = {
  all: ['docker'] as const,
  status: () => [...dockerKeys.all, 'status'] as const,
  info: () => [...dockerKeys.all, 'info'] as const,
};

/**
 * Hook to check Docker daemon status
 * Polls every 5 seconds to detect when Docker starts/stops
 */
export function useDockerStatus() {
  return useQuery({
    queryKey: dockerKeys.status(),
    queryFn: () => dockerApi.getStatus(),
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 1000,
  });
}

/**
 * Hook to get Docker system info (CPU, RAM, disk)
 * Polls every 15 seconds with 10s cache to reduce overhead
 */
export function useDockerInfo() {
  return useQuery({
    queryKey: dockerKeys.info(),
    queryFn: () => dockerApi.getInfo(),
    refetchInterval: 15000, // Poll every 15 seconds
  });
}
