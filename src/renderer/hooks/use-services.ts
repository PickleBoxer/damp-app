/** Mutation hooks for service management */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServiceId, CustomConfig, InstallOptions, PullProgress } from '@shared/types/service';
import { useEffect, useState } from 'react';
import { servicesKeys } from '@renderer/services';

// Direct access to IPC API exposed via preload script
const servicesApi = (globalThis as unknown as Window).services;

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
        queryKey: servicesKeys.containerState(variables.serviceId),
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
        queryKey: servicesKeys.containerState(variables.serviceId),
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
        queryKey: servicesKeys.containerState(serviceId),
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
        queryKey: servicesKeys.containerState(serviceId),
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
        queryKey: servicesKeys.containerState(serviceId),
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
