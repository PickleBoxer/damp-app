/**
 * Health status badge component for displaying Docker container health
 */

import { cn } from '@renderer/components/lib/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface HealthBadgeProps {
  status?: 'starting' | 'healthy' | 'unhealthy' | 'none';
  className?: string;
  variant?: 'default' | 'minimal';
}

/**
 * Displays a health status badge with appropriate styling and icon
 */
export function HealthBadge({ status, className, variant = 'default' }: HealthBadgeProps) {
  // Don't show badge if no health check is configured
  if (!status || status === 'none') {
    return null;
  }

  const badges = {
    healthy: {
      text: 'Healthy',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-900',
    },
    unhealthy: {
      text: 'Unhealthy',
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/50',
      border: 'border-red-200 dark:border-red-900',
    },
    starting: {
      text: 'Starting',
      icon: Loader2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-900',
    },
  };

  const badge = badges[status];
  const Icon = badge.icon;

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Icon className={cn('h-3.5 w-3.5', badge.color, status === 'starting' && 'animate-spin')} />
        <span className={cn('text-xs font-medium', badge.color)}>{badge.text}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        badge.bg,
        badge.color,
        badge.border,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'starting' && 'animate-spin')} />
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
    healthy: { Icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
    unhealthy: { Icon: XCircle, color: 'text-red-600 dark:text-red-400' },
    starting: { Icon: Loader2, color: 'text-amber-600 dark:text-amber-400' },
  };

  const { Icon, color } = icons[status];

  return (
    <Icon className={cn('h-4 w-4', color, status === 'starting' && 'animate-spin', className)} />
  );
}
