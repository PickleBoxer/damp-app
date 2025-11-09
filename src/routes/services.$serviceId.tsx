import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useService } from '@/api/services/services-queries';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceId, ServiceInfo } from '@/types/service';
import { HealthBadge } from '@/components/HealthBadge';
import ServiceActions from '@/components/ServiceActions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadCaddyCertificate } from '@/helpers/services_helpers';
import { Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to get status badge styles
function getStatusBadgeStyles(service: ServiceInfo): string {
  if (service.state.container_status?.running) {
    return 'bg-primary text-primary-foreground';
  }

  if (service.state.installed) {
    return 'bg-secondary text-secondary-foreground';
  }

  return 'border-input bg-background border';
}

// Helper function to get status text
function getStatusText(service: ServiceInfo): string {
  if (service.state.container_status?.running) {
    return 'Running';
  }

  if (service.state.installed) {
    return 'Stopped';
  }

  return 'Not Installed';
}

// Helper function to get the actual external port for a service
function getServicePort(service: ServiceInfo, portIndex: number = 0): string {
  // Try to get the actual mapped port from state config
  const actualPort = service.state.custom_config?.ports?.[portIndex]?.[0];
  // Fallback to default port from definition
  const defaultPort = service.definition.default_config.ports?.[portIndex]?.[0];

  return actualPort || defaultPort || 'N/A';
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>
          <Skeleton className="h-6 w-48" />
        </SheetTitle>
        <SheetDescription asChild>
          <Skeleton className="mt-2 h-4 w-full" />
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </SheetContent>
  );
}

// Not found component
function ServiceNotFound() {
  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Service Not Found</SheetTitle>
        <SheetDescription>The requested service could not be found.</SheetDescription>
      </SheetHeader>
    </SheetContent>
  );
}

// Service details component
function ServiceDetails({ service }: { readonly service: ServiceInfo }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    try {
      const result = await downloadCaddyCertificate();
      if (result.success) {
        toast.success('Certificate downloaded successfully', {
          description: result.path ? `Saved to: ${result.path}` : 'Certificate has been saved',
        });
      } else {
        toast.error('Failed to download certificate', {
          description: result.error || 'An unknown error occurred',
        });
      }
    } catch (error) {
      toast.error('Failed to download certificate', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const isCaddy = service.definition.id === ServiceId.Caddy;
  const certInstalled =
    (service.state.custom_config?.metadata?.certInstalled as boolean | undefined) ?? false;

  return (
    <SheetContent className="flex h-full flex-col gap-4 p-0">
      <SheetHeader className="flex flex-col gap-1.5 p-4">
        <SheetTitle>{service.definition.display_name}</SheetTitle>
        <SheetDescription>{service.definition.description}</SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 px-4">
        <div className="grid auto-rows-min gap-6">
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Type</span>
              <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs font-medium capitalize">
                {service.definition.service_type}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <span
                className={`rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeStyles(service)}`}
              >
                {getStatusText(service)}
              </span>
            </div>

            {service.state.container_status?.health_status && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Health</span>
                <HealthBadge status={service.state.container_status.health_status} />
              </div>
            )}

            {isCaddy && service.state.installed && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SSL Certificate</span>
                <div className="flex items-center gap-2">
                  {certInstalled ? (
                    <>
                      <ShieldCheck className="text-primary h-4 w-4" />
                      <span className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium">
                        Installed
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="text-muted-foreground h-4 w-4" />
                      <span className="border-input bg-background rounded-md border px-2 py-1 text-xs font-medium">
                        Not Installed
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {service.definition.default_config.ports.length > 0 && (
            <div className="grid gap-3">
              <h4 className="mb-3 text-sm font-semibold">Port Mappings</h4>
              <div className="space-y-2">
                {service.definition.default_config.ports.map(([, internal], index) => {
                  const actualPort = getServicePort(service, index);
                  return (
                    <div
                      key={`${actualPort}-${internal}`}
                      className="bg-muted/50 flex items-center justify-between rounded-md p-2 text-sm"
                    >
                      <span className="text-muted-foreground">Host Port</span>
                      <span className="font-mono font-medium">{actualPort}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">Container Port</span>
                      <span className="font-mono font-medium">{internal}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {service.definition.default_config.environment_vars.length > 0 && (
            <div className="grid gap-3">
              <h4 className="mb-3 text-sm font-semibold">Environment Variables</h4>
              <div className="bg-muted/50 max-h-48 space-y-1 overflow-y-auto rounded-md p-3">
                {service.definition.default_config.environment_vars.map((envVar, index) => {
                  const [key, ...valueParts] = envVar.split('=');
                  const value = valueParts.join('=');
                  return (
                    <div key={`${key}-${index}`} className="font-mono text-xs">
                      <span className="text-muted-foreground">{key}=</span>
                      <span>{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <SheetFooter className="mt-auto flex flex-col gap-2 p-4 sm:flex-col">
        {isCaddy && service.state.installed && (
          <Button
            variant="outline"
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Downloading...' : 'Download SSL Certificate'}
          </Button>
        )}
        <ServiceActions service={service} />
        <SheetClose asChild>
          <Button variant="outline">Close</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

function ServiceDetailSheet() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: service, isLoading, error } = useService(serviceId as ServiceId);
  const [open, setOpen] = useState(true);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(false);
      // Delay navigation to allow exit animation to complete
      setTimeout(() => {
        navigate({ to: '/services' });
      }, 200); // Match the Sheet's exit animation duration
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <LoadingSkeleton />
      </Sheet>
    );
  }

  // Render error or not found state
  if (error || !service) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <ServiceNotFound />
      </Sheet>
    );
  }

  // Render service details
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <ServiceDetails service={service} />
    </Sheet>
  );
}

export const Route = createFileRoute('/services/$serviceId')({
  component: ServiceDetailSheet,
});
