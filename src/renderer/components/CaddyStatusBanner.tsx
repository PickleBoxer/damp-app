/**
 * Caddy web server status notification banner
 * Shows warning when Docker or Caddy service is not running
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@renderer/components/ui/button';
import { AlertTriangle, Loader2, Download, Play } from 'lucide-react';
import { toast } from 'sonner';
import { dockerStatusQueryOptions } from '@renderer/docker';
import { serviceQueryOptions, serviceContainerStateQueryOptions } from '@renderer/services';
import { useInstallService, useStartService } from '@renderer/hooks/use-services';
import { ServiceId } from '@shared/types/service';

export default function CaddyStatusBanner() {
  const queryClient = useQueryClient();
  const { data: dockerStatus, isLoading: isDockerLoading } = useQuery(dockerStatusQueryOptions());
  const { isLoading: isCaddyLoading } = useQuery(serviceQueryOptions(ServiceId.Caddy));
  const { data: caddyState } = useQuery(serviceContainerStateQueryOptions(ServiceId.Caddy));
  const installMutation = useInstallService();
  const startMutation = useStartService();

  const isDockerRunning = dockerStatus?.isRunning === true;
  const isCaddyInstalled = caddyState?.exists ?? false;
  const isCaddyRunning = caddyState?.running ?? false;

  // Don't render during loading (non-blocking)
  if (isDockerLoading || isCaddyLoading) {
    return null;
  }

  // Don't render if Docker is running and Caddy is running
  if (isDockerRunning && isCaddyRunning) {
    return null;
  }

  const handleInstall = async () => {
    try {
      await installMutation.mutateAsync({
        serviceId: ServiceId.Caddy,
        options: { start_immediately: true },
      });
      toast.success('Web server installed successfully');
      // Invalidate Caddy service query to refresh data
      await queryClient.invalidateQueries({
        queryKey: ['services', 'detail', ServiceId.Caddy],
      });
    } catch (error) {
      toast.error('Failed to install web server', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(ServiceId.Caddy);
      toast.success('Web server started successfully');
      // Invalidate Caddy service query to refresh data
      await queryClient.invalidateQueries({
        queryKey: ['services', 'detail', ServiceId.Caddy],
      });
    } catch (error) {
      toast.error('Failed to start web server', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Show Docker warning first (prerequisite)
  if (!isDockerRunning) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Docker is not running
          </span>
        </div>
      </div>
    );
  }

  // Show Caddy warning if Docker is running but Caddy is not
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Web server not running
        </span>
      </div>
      {isCaddyInstalled ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-2 text-[10px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
          onClick={handleStart}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? (
            <>
              Starting
              <Loader2 className="ml-1 h-2.5 w-2.5 animate-spin" />
            </>
          ) : (
            <>
              Start
              <Play className="ml-1 h-2.5 w-2.5" />
            </>
          )}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-2 text-[10px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
          onClick={handleInstall}
          disabled={installMutation.isPending}
        >
          {installMutation.isPending ? (
            <>
              Installing
              <Loader2 className="ml-1 h-2.5 w-2.5 animate-spin" />
            </>
          ) : (
            <>
              Install
              <Download className="ml-1 h-2.5 w-2.5" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
