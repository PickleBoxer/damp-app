/** Query keys and query options for services */

import type { ServiceId } from '@shared/types/service';
import { queryOptions } from '@tanstack/react-query';

// Direct access to IPC API exposed via preload script
const servicesApi = (globalThis as unknown as Window).services;

/** Query keys for services */
export const servicesKeys = {
  list: () => ['services'] as const,
  detail: (id: ServiceId) => ['services', id] as const,
  states: () => ['services', 'states'] as const,
  containerState: (id: ServiceId) => ['services', 'states', id] as const,
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

/** Query options for a specific service's container state */
export const serviceContainerStateQueryOptions = (serviceId: ServiceId) =>
  queryOptions({
    queryKey: servicesKeys.containerState(serviceId),
    queryFn: () => servicesApi.getServiceContainerState(serviceId),
    staleTime: Infinity, // Pure event-driven - Docker events handle updates
    refetchInterval: false, // No polling - Docker events provide real-time updates
  });

/** Query options for Caddy certificate installation status */
export const caddyCertStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['services', 'caddy', 'certInstalled'] as const,
    queryFn: () => servicesApi.getCaddyCertInstalled(),
    staleTime: Infinity, // Only changes when user installs cert
    refetchInterval: false,
  });
