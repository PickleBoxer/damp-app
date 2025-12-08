import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ServiceInfo } from '@/types/service';
import {
  useInstallService,
  useStartService,
  useStopService,
  useRestartService,
  useUninstallService,
} from '@/api/services/services-queries';
import { useDockerStatus } from '@/api/docker/docker-queries';

interface ServiceActionsProps {
  service: ServiceInfo;
}

export default function ServiceActions({ service }: ServiceActionsProps) {
  const installMutation = useInstallService();
  const startMutation = useStartService();
  const stopMutation = useStopService();
  const restartMutation = useRestartService();
  const uninstallMutation = useUninstallService();

  const { data: dockerStatus, isLoading: isDockerLoading } = useDockerStatus();
  const isDockerRunning = dockerStatus?.isRunning === true;

  const toastIdRef = useRef<string | number | null>(null);

  // Show progress in toast during installation
  useEffect(() => {
    const progress = installMutation.progress[service.definition.id];

    if (installMutation.isPending && progress) {
      const message = progress.progress
        ? `${progress.status}: ${progress.progress}`
        : progress.status;

      if (toastIdRef.current) {
        toast.loading(message, { id: toastIdRef.current });
      } else {
        toastIdRef.current = toast.loading(message);
      }
    } else if (!installMutation.isPending && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [installMutation.progress, installMutation.isPending, service.definition.id]);

  const isLoading =
    installMutation.isPending ||
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    uninstallMutation.isPending;

  const isActionDisabled = isLoading || isDockerLoading || !isDockerRunning;

  const handleInstall = async () => {
    try {
      const result = await installMutation.mutateAsync({
        serviceId: service.definition.id,
        options: { start_immediately: true },
      });
      if (result?.success) {
        toast.success(
          service.definition.post_install_message ||
            `${service.definition.display_name} installed successfully`
        );
      } else {
        toast.error(`Failed to install ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      toast.error(`Failed to install ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleStart = async () => {
    try {
      const result = await startMutation.mutateAsync(service.definition.id);
      if (result?.success) {
        toast.success(`${service.definition.display_name} started successfully`);
      } else {
        toast.error(`Failed to start ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      toast.error(`Failed to start ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleStop = async () => {
    try {
      const result = await stopMutation.mutateAsync(service.definition.id);
      if (result?.success) {
        toast.success(`${service.definition.display_name} stopped successfully`);
      } else {
        toast.error(`Failed to stop ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      toast.error(`Failed to stop ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleRestart = async () => {
    try {
      const result = await restartMutation.mutateAsync(service.definition.id);
      if (result?.success) {
        toast.success(`${service.definition.display_name} restarted successfully`);
      } else {
        toast.error(`Failed to restart ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      toast.error(`Failed to restart ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleUninstall = async () => {
    try {
      const result = await uninstallMutation.mutateAsync({
        serviceId: service.definition.id,
        removeVolumes: false,
      });
      if (result?.success) {
        toast.success(`${service.definition.display_name} uninstalled successfully`);
      } else {
        toast.error(`Failed to uninstall ${service.definition.display_name}`, {
          description: result?.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      toast.error(`Failed to uninstall ${service.definition.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const isInstalled = service.state.installed;
  const isRunning = service.state.container_status?.running ?? false;

  return (
    <div className="flex flex-wrap gap-2">
      {!isInstalled && (
        <Button onClick={handleInstall} disabled={isActionDisabled} size="sm" className="flex-1">
          {installMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Install
        </Button>
      )}

      {isInstalled && !isRunning && (
        <>
          <Button onClick={handleStart} disabled={isActionDisabled} size="sm" className="flex-1">
            {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start
          </Button>
          <Button
            onClick={handleUninstall}
            disabled={isActionDisabled}
            size="sm"
            variant="destructive"
          >
            {uninstallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uninstall
          </Button>
        </>
      )}

      {isInstalled && isRunning && (
        <>
          <Button
            onClick={handleStop}
            disabled={isActionDisabled}
            variant="secondary"
            className="flex-1"
          >
            {stopMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stop
          </Button>
          <Button onClick={handleRestart} disabled={isActionDisabled}>
            {restartMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restart
          </Button>
          <Button onClick={handleUninstall} disabled={isActionDisabled} variant="destructive">
            {uninstallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uninstall
          </Button>
        </>
      )}
    </div>
  );
}
