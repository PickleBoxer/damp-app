/**
 * Service UI configuration and helpers
 */

import type { PortMapping } from '@shared/types/container';
import { ServiceId, ServiceInfo } from '@shared/types/service';

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
 * @param service - The service definition
 * @param containerPorts - Optional actual port mappings from container state
 */
export function getServiceUIUrl(
  service: ServiceInfo,
  containerPorts?: PortMapping[]
): string | null {
  const uiConfig = SERVICE_UI_PORTS[service.id];
  if (!uiConfig) return null;

  // Get the actual port from container state, fallback to default
  const actualPort =
    containerPorts?.[uiConfig.portIndex]?.[0] ||
    service.default_config.ports?.[uiConfig.portIndex]?.[0];

  if (!actualPort) return null;

  const path = uiConfig.path || '';
  return `http://localhost:${actualPort}${path}`;
}
