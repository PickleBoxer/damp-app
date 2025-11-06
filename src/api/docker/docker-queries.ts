/**
 * TanStack Query hooks for Docker operations
 */

import { useQuery } from '@tanstack/react-query';
import * as dockerApi from './docker-api';

// Query keys
export const dockerKeys = {
  all: ['docker'] as const,
  status: () => [...dockerKeys.all, 'status'] as const,
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
