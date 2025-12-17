/** TanStack Query hooks for service management */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import type { ServiceId, CustomConfig, InstallOptions, PullProgress } from '@shared/types/service';
import { useEffect, useState } from 'react';

// Direct access to IPC API exposed via preload script
const servicesApi = (globalThis as unknown as Window).services;

// Query keys
export const servicesKeys = {
  list: () => ['services'] as const,
  detail: (id: ServiceId) => ['services', id] as const,
  statuses: () => ['services', 'statuses'] as const,
  containerStatus: (id: ServiceId) => ['services', 'statuses', id] as const,
};

/** Query options for all services - use in loaders */
export const servicesQueryOptions = () =>
  queryOptions({
    queryKey: servicesKeys.list(),
    queryFn: () => servicesApi.getAllServices(),
    staleTime: Infinity, // Pure event-driven - mutations handle updates
    refetchInterval: false, // No polling - definitions only change on install/uninstall
  });

/** Query options for a specific service - use in loaders */
export const serviceQueryOptions = (serviceId: ServiceId) =>
  queryOptions({
    queryKey: servicesKeys.detail(serviceId),
    queryFn: () => servicesApi.getService(serviceId),
    staleTime: Infinity, // Pure event-driven - Docker events handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });

/** Query options for a specific service's container status */
export const serviceContainerStatusQueryOptions = (serviceId: ServiceId) =>
  queryOptions({
    queryKey: servicesKeys.containerStatus(serviceId),
    queryFn: () => servicesApi.getServiceContainerStatus(serviceId),
    staleTime: Infinity, // Pure event-driven - Docker events handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });

/** Fetches all services (definitions only, no Docker status) */
export function useServices(options?: { refetchInterval?: number; staleTime?: number }) {
  return useQuery({
    ...servicesQueryOptions(),
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime,
  });
}

/**
 * Fetches a specific service's container status (running state, health).
 * Pure event-driven - Docker events provide real-time updates.
 */
export function useServiceContainerStatus(serviceId: ServiceId, options?: { enabled?: boolean }) {
  return useQuery({
    ...serviceContainerStatusQueryOptions(serviceId),
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: true,
  });
}

/** Fetches a specific service */
export function useService(serviceId: ServiceId, options?: { refetchInterval?: number | false }) {
  return useQuery({
    ...serviceQueryOptions(serviceId),
    enabled: !!serviceId,
    refetchInterval: options?.refetchInterval,
  });
}

/** Installs a service with progress tracking */
export function useInstallService() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<ServiceId, PullProgress | null>>(
    {} as Record<ServiceId, PullProgress | null>
  );

  // Subscribe to progress events
  useEffect(() => {
    const cleanup = servicesApi.onInstallProgress((serviceId: string, progress: unknown) => {
      setProgress(prev => ({
        ...prev,
        [serviceId as ServiceId]: progress as PullProgress,
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
      void queryClient.invalidateQueries({ queryKey: servicesKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.containerStatus(variables.serviceId),
      });

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

/** Uninstalls a service */
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
      void queryClient.invalidateQueries({ queryKey: servicesKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.containerStatus(variables.serviceId),
      });
    },
  });
}

/** Starts a service */
export function useStartService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: ServiceId) => servicesApi.startService(serviceId),
    onSuccess: (data, serviceId) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.containerStatus(serviceId),
      });
    },
  });
}

/** Stops a service */
export function useStopService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: ServiceId) => servicesApi.stopService(serviceId),
    onSuccess: (data, serviceId) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.containerStatus(serviceId),
      });
    },
  });
}

/** Restarts a service */
export function useRestartService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: ServiceId) => servicesApi.restartService(serviceId),
    onSuccess: (data, serviceId) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.containerStatus(serviceId),
      });
    },
  });
}

/** Updates service configuration */
export function useUpdateServiceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      customConfig,
    }: {
      serviceId: ServiceId;
      customConfig: CustomConfig;
    }) => servicesApi.updateConfig(serviceId, customConfig),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: servicesKeys.detail(variables.serviceId),
      });
      void queryClient.invalidateQueries({ queryKey: servicesKeys.list() });
    },
  });
}
