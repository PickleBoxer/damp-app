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

// Typed reference to the Services API exposed via preload script
const servicesApi = (globalThis as unknown as Window).services;

/**
 * Ensures the Services API is available before usage
 * This allows the module to be imported in test environments without immediate failure
 */
function ensureServicesApi() {
  if (!servicesApi) {
    throw new Error(
      'Services API is not available. Ensure the preload script is properly configured.'
    );
  }
}

/**
 * Get all services with their current state
 */
export async function getAllServices(): Promise<ServiceInfo[]> {
  ensureServicesApi();
  const result = await servicesApi.getAllServices();
  return result as ServiceInfo[];
}

/**
 * Get a specific service by ID
 */
export async function getService(serviceId: ServiceId): Promise<ServiceInfo | null> {
  ensureServicesApi();
  const result = await servicesApi.getService(serviceId);
  return result as ServiceInfo | null;
}

/**
 * Install a service
 */
export async function installService(
  serviceId: ServiceId,
  options?: InstallOptions
): Promise<ServiceOperationResult> {
  ensureServicesApi();
  const result = await servicesApi.installService(serviceId, options);
  return result as ServiceOperationResult;
}

/**
 * Uninstall a service
 */
export async function uninstallService(
  serviceId: ServiceId,
  // TODO: expose option in UI
  removeVolumes = false
): Promise<ServiceOperationResult> {
  ensureServicesApi();
  const result = await servicesApi.uninstallService(serviceId, removeVolumes);
  return result as ServiceOperationResult;
}

/**
 * Start a service
 */
export async function startService(serviceId: ServiceId): Promise<ServiceOperationResult> {
  ensureServicesApi();
  const result = await servicesApi.startService(serviceId);
  return result as ServiceOperationResult;
}

/**
 * Stop a service
 */
export async function stopService(serviceId: ServiceId): Promise<ServiceOperationResult> {
  ensureServicesApi();
  const result = await servicesApi.stopService(serviceId);
  return result as ServiceOperationResult;
}

/**
 * Restart a service
 */
export async function restartService(serviceId: ServiceId): Promise<ServiceOperationResult> {
  ensureServicesApi();
  const result = await servicesApi.restartService(serviceId);
  return result as ServiceOperationResult;
}

/**
 * Update service configuration
 */
export async function updateServiceConfig(
  serviceId: ServiceId,
  customConfig: CustomConfig
): Promise<ServiceOperationResult> {
  ensureServicesApi();
  const result = await servicesApi.updateConfig(serviceId, customConfig);
  return result as ServiceOperationResult;
}

/**
 * Stop all running services
 */
export async function stopAllServices(): Promise<{
  success: boolean;
  results: Array<{ serviceId: ServiceId; success: boolean; error?: string }>;
}> {
  ensureServicesApi();

  // Get all services first
  const services = await getAllServices();

  // Filter for running services only
  const runningServices = services.filter(
    service => service.state.container_status?.running === true
  );

  if (runningServices.length === 0) {
    return { success: true, results: [] };
  }

  // Stop all running services in parallel
  const results = await Promise.allSettled(
    runningServices.map(service => stopService(service.definition.id))
  );

  // Map results to include service IDs
  const mappedResults = runningServices.map((service, index) => {
    const result = results[index];
    if (result.status === 'fulfilled') {
      return {
        serviceId: service.definition.id,
        success: result.value.success,
        error: result.value.error,
      };
    } else {
      return {
        serviceId: service.definition.id,
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });

  const allSuccessful = mappedResults.every(r => r.success);

  return {
    success: allSuccessful,
    results: mappedResults,
  };
}

/**
 * Start all installed services
 */
export async function startAllServices(): Promise<{
  success: boolean;
  results: Array<{ serviceId: ServiceId; success: boolean; error?: string }>;
}> {
  ensureServicesApi();

  // Get all services first
  const services = await getAllServices();

  // Filter for installed but not running services
  const stoppedServices = services.filter(
    service => service.state.installed && !service.state.container_status?.running
  );

  if (stoppedServices.length === 0) {
    return { success: true, results: [] };
  }

  // Start all stopped services in parallel
  const results = await Promise.allSettled(
    stoppedServices.map(service => startService(service.definition.id))
  );

  // Map results to include service IDs
  const mappedResults = stoppedServices.map((service, index) => {
    const result = results[index];
    if (result.status === 'fulfilled') {
      return {
        serviceId: service.definition.id,
        success: result.value.success,
        error: result.value.error,
      };
    } else {
      return {
        serviceId: service.definition.id,
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });

  const allSuccessful = mappedResults.every(r => r.success);

  return {
    success: allSuccessful,
    results: mappedResults,
  };
}

/**
 * Subscribe to installation progress events
 */
export function subscribeToInstallProgress(
  callback: (serviceId: ServiceId, progress: PullProgress) => void
): () => void {
  ensureServicesApi();
  return servicesApi.onInstallProgress((serviceId: string, progress: unknown) => {
    callback(serviceId as ServiceId, progress as PullProgress);
  });
}
