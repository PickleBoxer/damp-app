/**
 * Dashboard service card component
 * Displays a running service with quick stop/restart actions
 */

import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ServiceIcon } from '@/components/ServiceIcon';
import { HealthBadge } from '@/components/HealthBadge';
import { useStopService, useRestartService } from '@/api/services/services-queries';
import { toast } from 'sonner';
import { Loader2, Square, RotateCw, ExternalLink } from 'lucide-react';
import type { ServiceInfo } from '@/types/service';

interface DashboardServiceCardProps {
  readonly service: ServiceInfo;
}

export default function DashboardServiceCard({ service }: Readonly<DashboardServiceCardProps>) {
  const stopMutation = useStopService();
  const restartMutation = useRestartService();

  const isLoading = stopMutation.isPending || restartMutation.isPending;

  const handleStop = async () => {
    try {
      const result = await stopMutation.mutateAsync(service.definition.id);
      if (result?.success) {
        toast.success(`${service.definition.display_name} stopped`);
      } else {
        toast.error(`Failed to stop ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error(`Failed to stop ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleRestart = async () => {
    try {
      const result = await restartMutation.mutateAsync(service.definition.id);
      if (result?.success) {
        toast.success(`${service.definition.display_name} restarted`);
      } else {
        toast.error(`Failed to restart ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error(`Failed to restart ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="group bg-background/50 hover:border-foreground/20 hover:bg-background flex items-center gap-4 rounded-lg border p-3 transition-all">
      {/* Service icon */}
      <div className="shrink-0">
        <ServiceIcon serviceId={service.definition.id} className="h-8 w-8 opacity-80" />
      </div>

      {/* Service info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium">{service.definition.display_name}</h3>
          <HealthBadge status={service.state.container_status?.health_status} variant="minimal" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleStop}
          disabled={isLoading}
          title="Stop"
        >
          {stopMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRestart}
          disabled={isLoading}
          title="Restart"
        >
          {restartMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCw className="h-4 w-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View Details">
          <Link to="/services/$serviceId" params={{ serviceId: service.definition.id }}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
