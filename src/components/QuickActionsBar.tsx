/**
 * Quick actions bar for dashboard
 */

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useStopAllServices, useStartAllServices } from '@/api/services/services-queries';
import { toast } from 'sonner';
import { Square, Play, Loader2, Zap } from 'lucide-react';

interface QuickActionsBarProps {
  readonly runningServicesCount: number;
  readonly stoppedServicesCount: number;
}

export default function QuickActionsBar({
  runningServicesCount,
  stoppedServicesCount,
}: Readonly<QuickActionsBarProps>) {
  const stopAllMutation = useStopAllServices();
  const startAllMutation = useStartAllServices();

  const handleStopAll = async () => {
    try {
      const result = await stopAllMutation.mutateAsync();

      if (result.success) {
        toast.success('All services stopped', {
          description: `Stopped ${result.results.length} service(s)`,
        });
      } else {
        const failedCount = result.results.filter(r => !r.success).length;
        const successCount = result.results.filter(r => r.success).length;

        if (successCount > 0) {
          toast.warning('Some services failed to stop', {
            description: `Stopped ${successCount}, failed ${failedCount}`,
          });
        } else {
          toast.error('Failed to stop services');
        }
      }
    } catch (error) {
      toast.error('Failed to stop services', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleStartAll = async () => {
    try {
      const result = await startAllMutation.mutateAsync();

      if (result.success) {
        toast.success('All services started', {
          description: `Started ${result.results.length} service(s)`,
        });
      } else {
        const failedCount = result.results.filter(r => !r.success).length;
        const successCount = result.results.filter(r => r.success).length;

        if (successCount > 0) {
          toast.warning('Some services failed to start', {
            description: `Started ${successCount}, failed ${failedCount}`,
          });
        } else {
          toast.error('Failed to start services');
        }
      }
    } catch (error) {
      toast.error('Failed to start services', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
          <Zap className="text-primary h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Quick Actions</h3>
          <p className="text-muted-foreground text-sm">
            {runningServicesCount} running • {stoppedServicesCount} stopped
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {stoppedServicesCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={startAllMutation.isPending}
                className="gap-2"
              >
                {startAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start all services?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will start {stoppedServicesCount} stopped service(s). This may take a few
                  moments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartAll}>Start All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {runningServicesCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={stopAllMutation.isPending}
                className="gap-2"
              >
                {stopAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop all services?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will stop {runningServicesCount} running service(s). You can restart them
                  anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStopAll}>Stop All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
