/**
 * Health status badge component for displaying Docker container health
 */

import { cn } from '@/utils/tailwind';

interface HealthBadgeProps {
  status?: 'starting' | 'healthy' | 'unhealthy' | 'none';
  className?: string;
}

/**
 * Displays a health status badge with appropriate styling and icon
 */
export function HealthBadge({ status, className }: HealthBadgeProps) {
  // Don't show badge if no health check is configured
  if (!status || status === 'none') {
    return null;
  }

  const badges = {
    healthy: {
      text: '✓ Healthy',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    unhealthy: {
      text: '✗ Unhealthy',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    starting: {
      text: '⟳ Starting',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
  };

  const badge = badges[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium',
        badge.bgColor,
        badge.textColor,
        badge.borderColor,
        className
      )}
    >
      {badge.text}
    </span>
  );
}

/**
 * Compact health status icon (without text) for space-constrained UIs
 */
export function HealthIcon({ status, className }: HealthBadgeProps) {
  if (!status || status === 'none') {
    return null;
  }

  const icons = {
    healthy: { icon: '✓', color: 'text-green-600 dark:text-green-400' },
    unhealthy: { icon: '✗', color: 'text-red-600 dark:text-red-400' },
    starting: { icon: '⟳', color: 'text-yellow-600 dark:text-yellow-400' },
  };

  const icon = icons[status];

  return <span className={cn('text-sm font-bold', icon.color, className)}>{icon.icon}</span>;
}
