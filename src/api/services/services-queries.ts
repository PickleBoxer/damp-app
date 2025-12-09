/**
 * TanStack Query hooks for service management
 * Provides reactive data fetching and mutations for services
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  queryOptions,
  useSuspenseQuery,
} from '@tanstack/react-query';
import type { ServiceId, CustomConfig, InstallOptions, PullProgress } from '../../types/service';
import * as servicesApi from './services-api';
import { useEffect, useState } from 'react';

// Query keys
export const servicesKeys = {
  all: ['services'] as const,
  lists: () => [...servicesKeys.all, 'list'] as const,
  list: (filters?: string) => [...servicesKeys.lists(), filters] as const,
  details: () => [...servicesKeys.all, 'detail'] as const,
  detail: (id: ServiceId) => [...servicesKeys.details(), id] as const,
};

/**
 * Query options for all services - use this in loaders
 */
export const servicesQueryOptions = () =>
  queryOptions({
    queryKey: servicesKeys.lists(),
    queryFn: servicesApi.getAllServices,
  });

/**
 * Query options for a specific service - use this in loaders
 */
export const serviceQueryOptions = (serviceId: ServiceId) =>
  queryOptions({
    queryKey: servicesKeys.detail(serviceId),
    queryFn: () => servicesApi.getService(serviceId),
  });

/**
 * Hook to fetch all services
 */
export function useServices(options?: { refetchInterval?: number; staleTime?: number }) {
  return useQuery({
    ...servicesQueryOptions(),
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
  });
}

/**
 * Hook to fetch all services with suspense (preferred for SSR)
 */
export function useSuspenseServices() {
  return useSuspenseQuery(servicesQueryOptions());
}

/**
 * Hook to fetch a specific service
 */
export function useService(serviceId: ServiceId, options?: { refetchInterval?: number | false }) {
  return useQuery({
    ...serviceQueryOptions(serviceId),
    enabled: !!serviceId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Hook to fetch a specific service with suspense (preferred for SSR)
 */
export function useSuspenseService(serviceId: ServiceId) {
  return useSuspenseQuery(serviceQueryOptions(serviceId));
}

/**
 * Hook to install a service
 */
export function useInstallService() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<ServiceId, PullProgress | null>>(
    {} as Record<ServiceId, PullProgress | null>
  );

  // Subscribe to progress events
  useEffect(() => {
    const cleanup = servicesApi.subscribeToInstallProgress((serviceId, progressData) => {
      setProgress(prev => ({
        ...prev,
        [serviceId]: progressData,
      }));
    });

    return cleanup;
  }, []);

  const mutation = useMutation({
    mutationFn: ({ serviceId, options }: { serviceId: ServiceId; options?: InstallOptions }) =>
      servicesApi.installService(serviceId, options),
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(variables.serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });

      // Clear progress for this service
      setProgress(prev => ({
        ...prev,
        [variables.serviceId]: null,
      }));
    },
    onError: (error, variables) => {
      console.error(`Failed to install service ${variables.serviceId}:`, error);

      // Clear progress on error
      setProgress(prev => ({
        ...prev,
        [variables.serviceId]: null,
      }));
    },
  });

  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook to uninstall a service
 */
export function useUninstallService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      removeVolumes = false,
    }: {
      serviceId: ServiceId;
      removeVolumes?: boolean;
    }) => servicesApi.uninstallService(serviceId, removeVolumes),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(variables.serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });
    },
  });
}

/**
 * Hook to start a service
 */
export function useStartService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: ServiceId) => servicesApi.startService(serviceId),
    onSuccess: (data, serviceId) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });
    },
  });
}

/**
 * Hook to stop a service
 */
export function useStopService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: ServiceId) => servicesApi.stopService(serviceId),
    onSuccess: (data, serviceId) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });
    },
  });
}

/**
 * Hook to restart a service
 */
export function useRestartService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: ServiceId) => servicesApi.restartService(serviceId),
    onSuccess: (data, serviceId) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });
    },
  });
}

/**
 * Hook to update service configuration
 */
export function useUpdateServiceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      customConfig,
    }: {
      serviceId: ServiceId;
      customConfig: CustomConfig;
    }) => servicesApi.updateServiceConfig(serviceId, customConfig),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(variables.serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.lists() });
    },
  });
}

/**
 * Hook to stop all running services
 */
export function useStopAllServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => servicesApi.stopAllServices(),
    onSuccess: () => {
      // Invalidate all service queries to refetch updated states
      void queryClient.invalidateQueries({ queryKey: servicesKeys.all });
    },
  });
}

/**
 * Hook to start all installed services
 */
export function useStartAllServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => servicesApi.startAllServices(),
    onSuccess: () => {
      // Invalidate all service queries to refetch updated states
      void queryClient.invalidateQueries({ queryKey: servicesKeys.all });
    },
  });
}

/**
 * Helper hook to get service status
 */
export function useServiceStatus(serviceId: ServiceId) {
  const { data: service } = useService(serviceId);

  return {
    isInstalled: service?.state.installed ?? false,
    isEnabled: service?.state.enabled ?? false,
    isRunning: service?.state.container_status?.running ?? false,
    containerStatus: service?.state.container_status,
    customConfig: service?.state.custom_config,
  };
}
