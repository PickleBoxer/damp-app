import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@renderer/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from '@renderer/components/ui/carousel';
import { Empty, EmptyHeader, EmptyTitle, EmptyContent } from '@renderer/components/ui/empty';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { Marquee3D } from '@renderer/components/ui/marquee-3d';
import { ServiceIcon } from '@renderer/components/ServiceIcon';
import { useDashboardData } from '@renderer/hooks/use-dashboard-data';
import { useDockerStatus } from '@renderer/queries/docker-queries';
import {
  Play,
  Square,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Settings,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import {
  useStartService,
  useStopService,
  useInstallService,
} from '@renderer/queries/services-queries';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { runningServices, runningProjects, allServices, allProjects } = useDashboardData();

  const { data: dockerStatus } = useDockerStatus();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const startMutation = useStartService();
  const stopMutation = useStopService();

  const installedServices = allServices.filter(s => s.state.installed);
  const runningCount = runningServices.length;
  const stoppedServicesCount = installedServices.filter(
    s => !s.state.container_status?.running
  ).length;

  // Combine mandatory services with installed services for carousel display
  const allMandatoryServices = allServices.filter(s => s.definition.required);
  const otherInstalledServices = installedServices.filter(s => !s.definition.required);
  const displayServices = [...allMandatoryServices, ...otherInstalledServices];

  // Initialize and update carousel scroll state
  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    // Initialize state immediately
    setCanScrollPrev(carouselApi.canScrollPrev());
    setCanScrollNext(carouselApi.canScrollNext());

    // Update state on carousel events
    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    carouselApi.on('select', updateScrollState);
    carouselApi.on('reInit', updateScrollState);

    return () => {
      carouselApi.off('select', updateScrollState);
      carouselApi.off('reInit', updateScrollState);
    };
  }, [carouselApi]);

  const handleStartAll = async () => {
    const servicesToStart = installedServices.filter(s => !s.state.container_status?.running);

    try {
      await Promise.all(servicesToStart.map(s => startMutation.mutateAsync(s.definition.id)));
      toast.success('All services started');
    } catch {
      toast.error('Failed to start some services');
    }
  };

  const handleStopAll = async () => {
    const servicesToStop = runningServices;

    try {
      await Promise.all(servicesToStop.map(s => stopMutation.mutateAsync(s.definition.id)));
      toast.success('All services stopped');
    } catch {
      toast.error('Failed to stop some services');
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        {/* Feature Highlight Banner */}
        <div className="relative flex h-[120px] w-full flex-col items-center justify-center overflow-hidden bg-linear-65 from-orange-400 via-purple-600 to-blue-500">
          <Marquee3D className="pl-95" pauseOnHover>
            {allServices.map(service => (
              <Card
                key={service.definition.id}
                className="w-64 border-white/30 bg-white/20 py-0 text-white opacity-90 backdrop-blur-sm"
              >
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center self-start rounded-lg">
                    <ServiceIcon serviceId={service.definition.id} className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <CardTitle className="text-base font-semibold text-white drop-shadow-lg">
                      {service.definition.display_name}
                    </CardTitle>
                    <CardDescription className="text-xs text-white drop-shadow-md">
                      {service.definition.description}
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
                className="bg-white/20 hover:bg-white/30"
                asChild
              >
                <Link to="/services">Browse services</Link>
              </Button>
              <Button
                variant="ghost"
                className="hover:bg-white/30"
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
            <div className="flex flex-col items-center justify-center border p-4">
              <p className="text-center text-sm font-medium">Installed Services</p>
              <p className="text-2xl font-bold">{installedServices.length}</p>
            </div>
            <div className="group/services relative flex flex-col">
              <div className="flex h-full flex-col items-center justify-center border p-4">
                <p className="text-center text-sm font-medium">Running Services</p>
                <p className="text-2xl font-bold">{runningCount}</p>
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
          <div className="flex flex-1 items-center justify-between border p-4">
            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium">Projects Status</p>
                <p className="text-muted-foreground text-xs">Local projects overview</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-card flex flex-col items-center justify-center gap-1 rounded-lg p-3">
                <span className="text-2xl font-bold text-yellow-500">
                  {allProjects?.length ?? 0}
                </span>
                <span className="text-accent-foreground text-xs">Created</span>
              </div>
              <div className="bg-card flex flex-col items-center justify-center gap-1 rounded-lg p-3">
                <span className="text-2xl font-bold text-green-500">{runningProjects.length}</span>
                <span className="text-accent-foreground text-xs">Running</span>
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
            >
              <CarouselContent>
                {displayServices.map(service => (
                  <CarouselItem className="flex basis-1/2" key={service.definition.id}>
                    <ServiceStatusCard
                      service={service}
                      isMandatory={service.definition.required}
                    />
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
  isMandatory,
}: {
  readonly service: {
    definition: { id: string; display_name: string; description: string };
    state: { installed: boolean; container_status: { running: boolean } | null };
  };
  readonly isMandatory?: boolean;
}) {
  const startMutation = useStartService();
  const stopMutation = useStopService();
  const installMutation = useInstallService();
  const isInstalled = service.state.installed;
  const isRunning = service.state.container_status?.running ?? false;
  const actionLoading =
    startMutation.isPending || stopMutation.isPending || installMutation.isPending;

  const handleAction = async (action: 'start' | 'stop' | 'install') => {
    try {
      if (action === 'install') {
        await installMutation.mutateAsync({ serviceId: service.definition.id });
        toast.success(`${service.definition.display_name} installed`);
      } else if (action === 'start') {
        await startMutation.mutateAsync(service.definition.id);
        toast.success(`${service.definition.display_name} started`);
      } else {
        await stopMutation.mutateAsync(service.definition.id);
        toast.success(`${service.definition.display_name} stopped`);
      }
    } catch {
      toast.error(`Failed to ${action} service`);
    }
  };

  return (
    <Card data-size="sm" className="group/card flex h-full w-full flex-col">
      {/* Card Header with border-bottom */}
      <CardHeader className="@container/card-header flex-1 border-b">
        <div className="flex items-start justify-between gap-3">
          {/* Icon and Title Section */}
          <div className="flex flex-1 items-start gap-3">
            <ServiceIcon serviceId={service.definition.id} className="mt-0.5 h-5 w-5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <CardTitle className="text-sm leading-none font-semibold">
                {service.definition.display_name}
              </CardTitle>
              <CardDescription className="text-xs leading-snug">
                {service.definition.description}
              </CardDescription>
            </div>
          </div>

          {/* Status Indicator (top-right) */}
          <div className="flex shrink-0 items-center gap-2">
            {isMandatory && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Required service</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  !isInstalled
                    ? 'bg-muted-foreground/40'
                    : isRunning
                      ? 'animate-pulse bg-emerald-500'
                      : 'bg-orange-400'
                }`}
              />
              <span className="text-xs font-medium">
                {!isInstalled ? 'Not Installed' : isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="flex flex-col gap-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isInstalled ? (
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
          ) : isRunning ? (
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
          ) : (
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
          )}
          <Button variant="outline" size="sm" asChild className="px-2">
            <Link to="/services/$serviceId" params={{ serviceId: service.definition.id }}>
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
