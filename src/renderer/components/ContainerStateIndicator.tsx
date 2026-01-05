/**
 * Container Status Indicator Component
 * Standardized status icon for both projects and services
 * Shows running state and health status with color coding
 */

import { HiOutlineStatusOnline } from 'react-icons/hi';
import type { ContainerState } from '@shared/types/container';

interface ContainerStateIndicatorProps {
  /** Container status object */
  status?: ContainerState | null;
  /** Optional custom className */
  className?: string;
}

export function ContainerStateIndicator({
  status,
  className = '',
}: Readonly<ContainerStateIndicatorProps>) {
  const running = status?.running ?? false;
  const healthStatus = status?.health_status ?? 'none';

  // Determine status color and title based on running state and health
  let statusColor = 'text-muted-foreground/40'; // Stopped
  let statusTitle = 'Stopped';

  if (running) {
    if (healthStatus === 'healthy') {
      statusColor = 'text-emerald-500';
      statusTitle = 'Running (Healthy)';
    } else if (healthStatus === 'unhealthy') {
      statusColor = 'text-orange-500';
      statusTitle = 'Running (Unhealthy)';
    } else if (healthStatus === 'starting') {
      statusColor = 'text-orange-500';
      statusTitle = 'Running (Health Check Starting)';
    } else {
      statusColor = 'text-green-500';
      statusTitle = 'Running';
    }
  }

  return (
    <HiOutlineStatusOnline
      className={`h-3.5 w-3.5 shrink-0 ${statusColor} ${className}`}
      title={statusTitle}
    />
  );
}
