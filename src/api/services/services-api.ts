/**
 * Services API wrapper
 * Provides type-safe wrappers around IPC calls to the main process
 */

import type {
  ServiceId,
  ServiceInfo,
  ServiceOperationResult,
  CustomConfig,
  InstallOptions,
  PullProgress,
} from '../../types/service';

// Helper to access services API with proper typing
const getServicesAPI = () => {
  const api = (globalThis as typeof globalThis & Window).services;
  if (!api) {
    throw new Error('Services API is not available. Ensure the preload script has initialized it.');
  }

  return api;
};

/**
 * Get all services with their current state
 */
export async function getAllServices(): Promise<ServiceInfo[]> {
  const result = await getServicesAPI().getAllServices();
  return result as ServiceInfo[];
}

/**
 * Get a specific service by ID
 */
export async function getService(serviceId: ServiceId): Promise<ServiceInfo | null> {
  const result = await getServicesAPI().getService(serviceId);
  return result as ServiceInfo | null;
}

/**
 * Install a service
 */
export async function installService(
  serviceId: ServiceId,
  options?: InstallOptions
): Promise<ServiceOperationResult> {
  const result = await getServicesAPI().installService(serviceId, options);
  return result as ServiceOperationResult;
}

/**
 * Uninstall a service
 */
export async function uninstallService(
  serviceId: ServiceId,
  removeVolumes = false
): Promise<ServiceOperationResult> {
  const result = await getServicesAPI().uninstallService(serviceId, removeVolumes);
  return result as ServiceOperationResult;
}

/**
 * Start a service
 */
export async function startService(serviceId: ServiceId): Promise<ServiceOperationResult> {
  const result = await getServicesAPI().startService(serviceId);
  return result as ServiceOperationResult;
}

/**
 * Stop a service
 */
export async function stopService(serviceId: ServiceId): Promise<ServiceOperationResult> {
  const result = await getServicesAPI().stopService(serviceId);
  return result as ServiceOperationResult;
}

/**
 * Restart a service
 */
export async function restartService(serviceId: ServiceId): Promise<ServiceOperationResult> {
  const result = await getServicesAPI().restartService(serviceId);
  return result as ServiceOperationResult;
}

/**
 * Update service configuration
 */
export async function updateServiceConfig(
  serviceId: ServiceId,
  customConfig: CustomConfig
): Promise<ServiceOperationResult> {
  const result = await getServicesAPI().updateConfig(serviceId, customConfig);
  return result as ServiceOperationResult;
}

/**
 * Subscribe to installation progress events
 */
export function subscribeToInstallProgress(
  callback: (serviceId: ServiceId, progress: PullProgress) => void
): () => void {
  return getServicesAPI().onInstallProgress((serviceId: string, progress: unknown) => {
    callback(serviceId as ServiceId, progress as PullProgress);
  });
}
