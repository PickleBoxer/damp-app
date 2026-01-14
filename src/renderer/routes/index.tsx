import { ContainerStateIndicator } from '@renderer/components/ContainerStateIndicator';
import { ServiceIcon } from '@renderer/components/ServiceIcon';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@renderer/components/ui/carousel';
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@renderer/components/ui/empty';
import { Marquee3D } from '@renderer/components/ui/marquee-3d';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { dockerStatusQueryOptions } from '@renderer/docker';
import { useDashboardData, type DashboardService } from '@renderer/hooks/use-dashboard-data';
import { useInstallService, useStartService, useStopService } from '@renderer/hooks/use-services';
import { projectsQueryOptions } from '@renderer/projects';
import { servicesQueryOptions } from '@renderer/services';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  Loader2,
  Play,
  Settings,
  Square,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    // Non-blocking parallel prefetch - starts loading but doesn't wait
    // Status is now fetched per-component using individual queries
    void Promise.all([
      queryClient.prefetchQuery(servicesQueryOptions()),
      queryClient.prefetchQuery(projectsQueryOptions()),
    ]);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const {
    runningServices,
    runningProjects,
    allServices,
    allProjects,
    isLoadingServices,
    isLoadingProjects,
  } = useDashboardData();

  const { data: dockerStatus } = useQuery(dockerStatusQueryOptions());
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const startMutation = useStartService();
  const stopMutation = useStopService();

  const installedServices = allServices.filter(s => s.exists);
  const runningCount = runningServices.length;
  const stoppedServicesCount = installedServices.filter(s => !s.running).length;

  // Combine required services with installed services for carousel display
  const allRequiredServices = allServices.filter(s => s.required);
  const otherInstalledServices = installedServices.filter(s => !s.required);
  const displayServices = [...allRequiredServices, ...otherInstalledServices];

  // Initialize and update carousel scroll state
  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    // Update state on carousel events
    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    // Initialize state
    updateScrollState();

    carouselApi.on('select', updateScrollState);
    carouselApi.on('reInit', updateScrollState);

    return () => {
      carouselApi.off('select', updateScrollState);
      carouselApi.off('reInit', updateScrollState);
    };
  }, [carouselApi]);

  const handleStartAll = async () => {
    const servicesToStart = installedServices.filter(s => !s.running);

    try {
      await Promise.all(servicesToStart.map(s => startMutation.mutateAsync(s.id)));
      toast.success('All services started');
    } catch {
      toast.error('Failed to start some services');
    }
  };

  const handleStopAll = async () => {
    const servicesToStop = runningServices;

    try {
      await Promise.all(servicesToStop.map(s => stopMutation.mutateAsync(s.id)));
      toast.success('All services stopped');
    } catch {
      toast.error('Failed to stop some services');
    }
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 p-6">
        {/* Feature Highlight Banner */}
        <div className="relative flex h-30 w-full flex-col items-center justify-center overflow-hidden bg-linear-65 from-orange-400 via-purple-600 to-blue-500">
          <Marquee3D className="pl-95" pauseOnHover>
            {allServices.map(service => (
              <Card
                key={service.id}
                className="w-64 border-white/30 bg-white/20 py-0 text-white opacity-90 backdrop-blur-sm"
              >
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center self-start rounded-lg">
                    <ServiceIcon serviceId={service.id} className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <CardTitle className="text-base font-semibold text-white drop-shadow-lg">
                      {service.display_name}
                    </CardTitle>
                    <CardDescription className="text-xs text-white drop-shadow-md">
                      {service.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </Marquee3D>

          <div className="absolute bottom-4 left-4 z-10">
            <h2 className="text-lg font-bold text-white drop-shadow-lg">Local services</h2>
            <p className="mb-2 text-sm text-white drop-shadow-md">
              Run local databases and dev tools instantly.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 text-white hover:bg-white/30"
                asChild
              >
                <Link to="/services">Browse services</Link>
              </Button>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/30 hover:text-white dark:hover:bg-white/30"
                size="sm"
                onClick={() =>
                  (globalThis as unknown as Window).electronWindow.openExternal(
                    'https://getdamp.app/docs/services'
                  )
                }
              >
                Learn more
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-4">
          {/* Services Cards */}
          <div className="grid flex-1 grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center rounded border p-4">
              <p className="text-center text-sm font-medium">Installed Services</p>
              <p className="text-2xl font-bold">
                {isLoadingServices ? 0 : installedServices.length}
              </p>
            </div>
            <div className="group/services relative flex flex-col">
              <div className="flex h-full flex-col items-center justify-center rounded border p-4">
                <p className="text-center text-sm font-medium">Running Services</p>
                <p className="text-2xl font-bold">{isLoadingServices ? 0 : runningCount}</p>
              </div>
              {/* Quick Actions */}
              <TooltipProvider>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover/services:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={
                          !dockerStatus?.isRunning ||
                          stoppedServicesCount === 0 ||
                          startMutation.isPending ||
                          stopMutation.isPending
                        }
                        onClick={handleStartAll}
                      >
                        {startMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                        ) : (
                          <Play className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Start All Services</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={
                          !dockerStatus?.isRunning ||
                          runningCount === 0 ||
                          startMutation.isPending ||
                          stopMutation.isPending
                        }
                        onClick={handleStopAll}
                      >
                        {stopMutation.isPending ? (
                          <Loader2 className="text-destructive h-4 w-4 animate-spin" />
                        ) : (
                          <Square className="text-destructive h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Stop All Services</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={
                          !dockerStatus?.isRunning ||
                          startMutation.isPending ||
                          stopMutation.isPending
                        }
                        asChild
                      >
                        <Link to="/services">
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manage Services</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </div>

          {/* Projects Column */}
          <div className="flex flex-1 items-center justify-between rounded border p-4">
            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium">Projects Status</p>
                <p className="text-muted-foreground text-xs">Local projects overview</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-card flex flex-col items-center justify-center gap-1 rounded-lg p-3">
                <span className="text-2xl font-bold text-yellow-500">
                  {isLoadingProjects ? 0 : (allProjects?.length ?? 0)}
                </span>
                <span className="text-xs">Created</span>
              </div>
              <div className="bg-card flex flex-col items-center justify-center gap-1 rounded-lg p-3">
                <span className="text-2xl font-bold text-green-500">
                  {isLoadingProjects ? 0 : runningProjects.length}
                </span>
                <span className="text-xs">Running</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Carousel Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Your Local Services</h2>
              <p className="text-muted-foreground text-sm">
                Quickly view and manage installed services.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => carouselApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => carouselApi?.scrollNext()}
                disabled={!canScrollNext}
                className="h-10 w-10"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {displayServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center">
              <Empty className="gap-3 p-0 md:p-0">
                <EmptyHeader>
                  <EmptyTitle>No services installed</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" asChild className="text-muted-foreground" size="sm">
                    <Link to="/services">
                      Browse Services <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Carousel
              setApi={setCarouselApi}
              opts={{
                align: 'start',
                containScroll: 'trimSnaps',
                skipSnaps: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {displayServices.map(service => (
                  <CarouselItem className="basis-1/2 p-3" key={service.id}>
                    <ServiceStatusCard service={service} isRequired={service.required} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function ServiceStatusCard({
  service,
  isRequired,
}: {
  readonly service: DashboardService;
  readonly isRequired?: boolean;
}) {
  const startMutation = useStartService();
  const stopMutation = useStopService();
  const installMutation = useInstallService();
  const isInstalled = service.exists;
  const isRunning = service.running;
  const actionLoading =
    startMutation.isPending || stopMutation.isPending || installMutation.isPending;

  const handleAction = async (action: 'start' | 'stop' | 'install') => {
    try {
      if (action === 'install') {
        await installMutation.mutateAsync({ serviceId: service.id });
        toast.success(`${service.display_name} installed`);
      } else if (action === 'start') {
        await startMutation.mutateAsync(service.id);
        toast.success(`${service.display_name} started`);
      } else {
        await stopMutation.mutateAsync(service.id);
        toast.success(`${service.display_name} stopped`);
      }
    } catch {
      toast.error(`Failed to ${action} service`);
    }
  };

  const renderActionButton = () => {
    if (!isInstalled) {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={() => handleAction('install')}
          disabled={actionLoading}
          className="flex-1"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Install
        </Button>
      );
    }

    if (isRunning) {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleAction('stop')}
          disabled={actionLoading}
          className="flex-1"
        >
          <Square className="text-destructive mr-1.5 h-3.5 w-3.5" />
          Stop
        </Button>
      );
    }

    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => handleAction('start')}
        disabled={actionLoading}
        className="flex-1"
      >
        <Play className="mr-1.5 h-3.5 w-3.5" />
        Start
      </Button>
    );
  };

  return (
    <Card data-size="sm" className="group/card flex h-full w-full flex-col">
      {/* Card Header with border-bottom */}
      <CardHeader className="@container/card-header flex-1 border-b">
        <div className="flex items-start justify-between gap-3">
          {/* Icon and Title Section */}
          <div className="flex flex-1 items-start gap-3">
            <ServiceIcon serviceId={service.id} className="mt-0.5 h-5 w-5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm leading-none font-semibold">
                  {service.display_name}
                </CardTitle>
                {isRequired && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Required service</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <CardDescription className="text-xs leading-snug">
                {service.description}
              </CardDescription>
            </div>
          </div>

          {/* Status Indicator (top-right) */}
          <div className="flex shrink-0 items-center gap-1.5">
            <ContainerStateIndicator
              status={
                isInstalled
                  ? {
                      container_id: null,
                      container_name: null,
                      running: isRunning,
                      health_status: service.health_status,
                      exists: true,
                      state: isRunning ? 'running' : 'exited',
                      ports: [],
                    }
                  : null
              }
            />
          </div>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="flex flex-col gap-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          {renderActionButton()}
          <Button variant="outline" size="sm" asChild className="px-2">
            <Link to="/services/$serviceId" params={{ serviceId: service.id }}>
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
