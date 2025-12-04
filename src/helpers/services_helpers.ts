/**
 * Helper functions for service operations in renderer process
 */

import { ServiceId, ServiceInfo } from '@/types/service';

/**
 * Service UI configuration - maps services to their web UI ports
 */
const SERVICE_UI_PORTS: Partial<Record<ServiceId, { portIndex: number; path?: string }>> = {
  [ServiceId.Mailpit]: { portIndex: 1 }, // Port 8025 (second port)
  [ServiceId.RabbitMQ]: { portIndex: 1 }, // Port 15672 (Management UI)
  [ServiceId.MinIO]: { portIndex: 1 }, // Port 8900 (Console)
  [ServiceId.RustFS]: { portIndex: 1 }, // Port 9001 (Console)
  [ServiceId.Meilisearch]: { portIndex: 0 }, // Port 7700 (Web UI)
  [ServiceId.Typesense]: { portIndex: 0 }, // Port 8108 (Has API endpoints that work in browser)
};

/**
 * Check if a service has a web UI
 */
export function hasServiceUI(serviceId: ServiceId): boolean {
  return serviceId in SERVICE_UI_PORTS;
}

/**
 * Get the web UI URL for a service
 */
export function getServiceUIUrl(service: ServiceInfo): string | null {
  const uiConfig = SERVICE_UI_PORTS[service.definition.id];
  if (!uiConfig) return null;

  // Get the actual port from service state (custom or default)
  const actualPort =
    service.state.custom_config?.ports?.[uiConfig.portIndex]?.[0] ||
    service.definition.default_config.ports?.[uiConfig.portIndex]?.[0];

  if (!actualPort) return null;

  const path = uiConfig.path || '';
  return `http://localhost:${actualPort}${path}`;
}

/**
 * Download Caddy SSL certificate
 * Opens a save dialog and downloads the certificate to the selected location
 */
export async function downloadCaddyCertificate(): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  try {
    return (await window.services.downloadCaddyCertificate()) as {
      success: boolean;
      path?: string;
      error?: string;
    };
  } catch (error) {
    console.error('Failed to download certificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
