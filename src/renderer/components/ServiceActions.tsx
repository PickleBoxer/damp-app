import { useEffect, useRef } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ServiceInfo } from '@shared/types/service';
import { useQuery } from '@tanstack/react-query';
import { dockerStatusQueryOptions } from '@renderer/docker';
import { serviceContainerStateQueryOptions } from '@renderer/services';
import {
  useInstallService,
  useStartService,
  useStopService,
  useRestartService,
  useUninstallService,
} from '@renderer/hooks/use-services';

interface ServiceActionsProps {
  readonly service: ServiceInfo;
}

export default function ServiceActions({ service }: Readonly<ServiceActionsProps>) {
  const installMutation = useInstallService();
  const startMutation = useStartService();
  const stopMutation = useStopService();
  const restartMutation = useRestartService();
  const uninstallMutation = useUninstallService();

  const { data: dockerStatus, isLoading: isDockerLoading } = useQuery(dockerStatusQueryOptions());
  const { data: state } = useQuery(serviceContainerStateQueryOptions(service.id));
  const isDockerRunning = dockerStatus?.isRunning === true;

  const toastIdRef = useRef<string | number | null>(null);

  // Show progress in toast during installation
  useEffect(() => {
    const progress = installMutation.progress[service.id];

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
  }, [installMutation.progress, installMutation.isPending, service.id]);

  const isLoading =
    installMutation.isPending ||
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    uninstallMutation.isPending;

  const isActionDisabled = isLoading || isDockerLoading || !isDockerRunning;

  const handleInstall = async () => {
    try {
      await installMutation.mutateAsync({
        serviceId: service.id,
        options: { start_immediately: true },
      });
      toast.success(
        service.post_install_message || `${service.display_name} installed successfully`
      );
    } catch (error) {
      toast.error(`Failed to install ${service.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync(service.id);
      toast.success(`${service.display_name} started successfully`);
    } catch (error) {
      toast.error(`Failed to start ${service.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleStop = async () => {
    try {
      await stopMutation.mutateAsync(service.id);
      toast.success(`${service.display_name} stopped successfully`);
    } catch (error) {
      toast.error(`Failed to stop ${service.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleRestart = async () => {
    try {
      await restartMutation.mutateAsync(service.id);
      toast.success(`${service.display_name} restarted successfully`);
    } catch (error) {
      toast.error(`Failed to restart ${service.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleUninstall = async () => {
    try {
      await uninstallMutation.mutateAsync({
        serviceId: service.id,
        removeVolumes: false,
      });
      toast.success(`${service.display_name} uninstalled successfully`);
    } catch (error) {
      toast.error(`Failed to uninstall ${service.display_name}`, {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const isInstalled = state?.exists ?? false;
  const isRunning = state?.running ?? false;

  return (
    <div className="flex flex-wrap gap-2">
      {!isInstalled && (
        <Button
          onClick={handleInstall}
          size="lg"
          disabled={isActionDisabled}
          className="h-8.5 flex-1"
        >
          {installMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Install
        </Button>
      )}

      {isInstalled && !isRunning && (
        <>
          <Button
            onClick={handleStart}
            size="lg"
            disabled={isActionDisabled}
            className="h-8.5 flex-1"
          >
            {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start
          </Button>
          <Button
            onClick={handleUninstall}
            disabled={isActionDisabled}
            size="lg"
            variant="destructive"
            className="h-8.5"
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
            className="h-8.5 flex-1"
            size="lg"
          >
            {stopMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stop
          </Button>
          <Button onClick={handleRestart} size="lg" disabled={isActionDisabled} className="h-8.5">
            {restartMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Restart
          </Button>
          <Button
            onClick={handleUninstall}
            size="lg"
            disabled={isActionDisabled}
            variant="destructive"
            className="h-8.5"
          >
            {uninstallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uninstall
          </Button>
        </>
      )}
    </div>
  );
}
