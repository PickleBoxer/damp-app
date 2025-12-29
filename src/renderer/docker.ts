/** Query keys and query options for Docker operations */

import { queryOptions } from '@tanstack/react-query';

// Direct access to IPC API exposed via preload script
const dockerApi = (globalThis as unknown as Window).docker;

/** Query keys for Docker */
export const dockerKeys = {
  all: ['docker'] as const,
  status: () => [...dockerKeys.all, 'status'] as const,
  info: () => [...dockerKeys.all, 'info'] as const,
  networkStatus: () => [...dockerKeys.all, 'network-status'] as const,
};

/**
 * Query options for Docker daemon status
 * Polls every 5 seconds to detect when Docker starts/stops
 */
export const dockerStatusQueryOptions = () =>
  queryOptions({
    queryKey: dockerKeys.status(),
    queryFn: () => dockerApi.getStatus(),
    refetchInterval: 5000, // Poll every 5 seconds
    initialData: { isRunning: false }, // Assume not running initially
  });

/**
 * Query options for Docker system info (CPU, RAM, disk)
 * Polls every 15 seconds to reduce overhead
 */
export const dockerInfoQueryOptions = (dockerIsRunning: boolean, showStats = true) =>
  queryOptions({
    queryKey: dockerKeys.info(),
    queryFn: () => dockerApi.getInfo(),
    refetchInterval: dockerIsRunning && showStats ? 15000 : false, // Only poll when Docker is running AND stats are shown
    enabled: dockerIsRunning && showStats, // Only run when Docker is running AND stats are shown
  });

/**
 * Query options for Docker network status
 * Only polls when Docker is running and network doesn't exist (every 15 seconds)
 */
export const dockerNetworkStatusQueryOptions = (dockerIsRunning: boolean) =>
  queryOptions({
    queryKey: dockerKeys.networkStatus(),
    queryFn: () => dockerApi.getNetworkStatus(),
    refetchInterval: query => {
      // Only poll if network doesn't exist - stop polling once it exists
      return query.state.data?.exists === false ? 15000 : false;
    },
    enabled: dockerIsRunning, // Only run when Docker is running
  });
