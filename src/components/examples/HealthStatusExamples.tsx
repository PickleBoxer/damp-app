/**
 * Example usage of health status in the UI
 *
 * This file demonstrates how to display health status for services.
 * You can integrate this into your services list, service details page, or anywhere else.
 */

import { HealthBadge, HealthIcon } from '@/components/HealthBadge';
import type { ServiceInfo } from '@/types/service';

/**
 * Example 1: Display health badge in a service list
 */
export function ServiceListItemExample({ service }: { service: ServiceInfo }) {
  const healthStatus = service.state.container_status?.health_status;

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <h3>{service.definition.display_name}</h3>
        <p className="text-muted-foreground text-sm">{service.definition.description}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Show running status */}
        {service.state.container_status?.running ? (
          <span className="text-green-600">Running</span>
        ) : (
          <span className="text-gray-600">Stopped</span>
        )}
        {/* Show health status badge */}
        <HealthBadge status={healthStatus} />
      </div>
    </div>
  );
}

/**
 * Example 2: Compact health icon in a table
 */
export function ServiceTableRowExample({ service }: { service: ServiceInfo }) {
  const healthStatus = service.state.container_status?.health_status;

  return (
    <tr>
      <td>{service.definition.display_name}</td>
      <td>{service.state.container_status?.running ? 'Running' : 'Stopped'}</td>
      <td>
        <HealthIcon status={healthStatus} />
      </td>
    </tr>
  );
}

/**
 * Example 3: Full service details with health
 */
export function ServiceDetailsExample({ service }: { service: ServiceInfo }) {
  const containerStatus = service.state.container_status;

  return (
    <div className="space-y-4">
      <h2>{service.definition.display_name}</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">Status</p>
          <p>{containerStatus?.running ? 'Running' : 'Stopped'}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Health</p>
          <HealthBadge status={containerStatus?.health_status} />
        </div>

        <div>
          <p className="text-sm font-medium">Container ID</p>
          <p className="font-mono text-xs">
            {containerStatus?.container_id?.slice(0, 12) || 'N/A'}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Ports</p>
          <div className="space-y-1">
            {containerStatus?.ports?.map(([external, internal]) => (
              <p key={`${external}-${internal}`} className="text-sm">
                {external} → {internal}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 4: Health status indicator with tooltip
 */
export function ServiceCardExample({ service }: { service: ServiceInfo }) {
  const healthStatus = service.state.container_status?.health_status;

  const healthTooltip = {
    healthy: 'Container health check passed',
    unhealthy: 'Container health check failed',
    starting: 'Container is initializing, health check pending',
    none: 'No health check configured',
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{service.definition.display_name}</h3>
          <p className="text-muted-foreground text-sm">{service.definition.description}</p>
        </div>

        {healthStatus && healthStatus !== 'none' && (
          <div title={healthTooltip[healthStatus]}>
            <HealthBadge status={healthStatus} />
          </div>
        )}
      </div>

      {/* Additional service info */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <span
          className={service.state.container_status?.running ? 'text-green-600' : 'text-gray-600'}
        >
          {service.state.container_status?.running ? '● Running' : '○ Stopped'}
        </span>
        {service.state.installed && <span className="text-muted-foreground">Installed</span>}
      </div>
    </div>
  );
}
