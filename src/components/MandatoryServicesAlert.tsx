/**
 * Mandatory services notification banner
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ServiceIcon } from '@/components/ServiceIcon';
import { HealthBadge } from '@/components/HealthBadge';
import { useInstallService, useStartService } from '@/api/services/services-queries';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Download, Play } from 'lucide-react';
import type { ServiceInfo } from '@/types/service';

interface MandatoryServicesAlertProps {
  readonly mandatoryServices: ServiceInfo[];
}

export default function MandatoryServicesAlert({
  mandatoryServices,
}: Readonly<MandatoryServicesAlertProps>) {
  const installMutation = useInstallService();
  const startMutation = useStartService();

  const notInstalledServices = mandatoryServices.filter(s => !s.state.installed);
  const installedButStoppedServices = mandatoryServices.filter(
    s => s.state.installed && !s.state.container_status?.running
  );

  if (notInstalledServices.length === 0 && installedButStoppedServices.length === 0) {
    return null;
  }

  const handleInstall = async (serviceId: string) => {
    try {
      const result = await installMutation.mutateAsync({
        serviceId: serviceId as never,
        options: { start_immediately: true },
      });
      if (result?.success) {
        toast.success('Service installed successfully');
      } else {
        toast.error('Failed to install service', {
          description: result?.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error('Failed to install service', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleStart = async (serviceId: string) => {
    try {
      const result = await startMutation.mutateAsync(serviceId as never);
      if (result?.success) {
        toast.success('Service started successfully');
      } else {
        toast.error('Failed to start service', {
          description: result?.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error('Failed to start service', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Alert
      variant="destructive"
      className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20"
    >
      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-lg font-semibold text-orange-900 dark:text-orange-100">
        Required Services
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-4 text-orange-800 dark:text-orange-200">
        <p className="text-sm">
          The following services are required for the application to work correctly:
        </p>

        <div className="space-y-2">
          {notInstalledServices.map(service => (
            <div
              key={service.definition.id}
              className="bg-background/80 flex items-center justify-between rounded-lg border border-orange-200 p-3 dark:border-orange-900"
            >
              <div className="flex items-center gap-3">
                <ServiceIcon serviceId={service.definition.id} className="h-8 w-8 opacity-80" />
                <div>
                  <p className="font-medium">{service.definition.display_name}</p>
                  <p className="text-muted-foreground text-xs">{service.definition.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleInstall(service.definition.id)}
                disabled={installMutation.isPending}
                className="gap-2"
              >
                {installMutation.isPending &&
                installMutation.variables?.serviceId === service.definition.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Install
              </Button>
            </div>
          ))}

          {installedButStoppedServices.map(service => (
            <div
              key={service.definition.id}
              className="bg-background/80 flex items-center justify-between rounded-lg border border-orange-200 p-3 dark:border-orange-900"
            >
              <div className="flex items-center gap-3">
                <ServiceIcon serviceId={service.definition.id} className="h-8 w-8 opacity-80" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{service.definition.display_name}</p>
                    <HealthBadge
                      status={service.state.container_status?.health_status}
                      variant="minimal"
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Service is installed but not running
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleStart(service.definition.id)}
                disabled={startMutation.isPending}
                className="gap-2"
              >
                {startMutation.isPending && startMutation.variables === service.definition.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start
              </Button>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
