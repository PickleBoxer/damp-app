/**
 * TanStack Query hooks for Docker operations
 */

import { useQuery } from '@tanstack/react-query';
import * as dockerApi from './docker-api';

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
    queryFn: dockerApi.getDockerStatus,
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get Docker system info (CPU, RAM, disk)
 * Polls every 15 seconds with 10s cache to reduce overhead
 */
export function useDockerInfo() {
  return useQuery({
    queryKey: dockerKeys.info(),
    queryFn: dockerApi.getDockerInfo,
    refetchInterval: 15000, // Poll every 15 seconds
    staleTime: 10000, // Cache for 10 seconds
    refetchOnWindowFocus: true,
    retry: 1, // Only retry once on failure
  });
}
