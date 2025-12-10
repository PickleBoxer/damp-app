import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { Empty, EmptyHeader, EmptyTitle, EmptyContent } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Marquee3D } from '@/components/ui/marquee-3d';
import { ServiceIcon } from '@/components/ServiceIcon';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useDockerStatus } from '@/api/docker/docker-queries';
import {
  Play,
  Square,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Settings,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  useStartService,
  useStopService,
  useInstallService,
} from '@/api/services/services-queries';
import { toast } from 'sonner';

function DashboardPage() {
  const { runningServices, runningProjects, allServices, allProjects, mandatoryServices } =
    useDashboardData();

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
        <div className="relative flex h-[120px] w-full flex-col items-center justify-center overflow-hidden rounded-md bg-linear-65 from-orange-400 via-purple-600 to-blue-500">
          <Marquee3D className="pl-95" pauseOnHover>
            {allServices.map(service => (
              <Card
                key={service.definition.id}
                className="w-64 rounded-md border-white/30 bg-white/20 py-0 text-white opacity-90 backdrop-blur-sm"
              >
                <CardHeader className="flex flex-row items-center gap-4 rounded-md p-4">
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
          {/* Quick Actions */}
          <TooltipProvider>
            <div className="flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!dockerStatus?.isRunning || stoppedServicesCount === 0}
                    onClick={handleStartAll}
                  >
                    <Play className="h-4 w-4 text-emerald-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Start All Services</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!dockerStatus?.isRunning || runningCount === 0}
                    onClick={handleStopAll}
                  >
                    <Square className="text-destructive h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Stop All Services</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" disabled={!dockerStatus?.isRunning} asChild>
                    <Link to="/services">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Manage Services</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Services Cards */}
          <div className="grid flex-1 grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center rounded-md border p-4">
              <p className="text-center text-sm font-medium">Installed Services</p>
              <p className="text-2xl font-bold">{installedServices.length}</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-md border p-4">
              <p className="text-center text-sm font-medium">Running Services</p>
              <p className="text-2xl font-bold">{runningCount}</p>
            </div>
          </div>

          {/* Projects Column */}
          <div className="flex flex-1 items-center justify-between rounded-md border p-4">
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
                className="h-10 w-10 rounded-md"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => carouselApi?.scrollNext()}
                disabled={!canScrollNext}
                className="h-10 w-10 rounded-md"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {mandatoryServices.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-900/20 dark:bg-amber-950/10 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs">
                Some required services need attention to ensure proper functionality.
              </AlertDescription>
            </Alert>
          )}
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
                  <CarouselItem className="basis-1/2" key={service.definition.id}>
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

  const getStatusBadge = () => {
    if (!isInstalled) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-400" />
        </div>
      );
    }
    if (isRunning) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-orange-400" />
      </div>
    );
  };

  return (
    <Card
      className={`bg-background group relative gap-0 rounded-md p-0 ${isMandatory && !isInstalled ? 'border-amber-200 dark:border-amber-900/30' : ''}`}
    >
      {isMandatory && !isInstalled && (
        <div className="absolute top-0 left-0 z-10 overflow-hidden">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <AlertCircle className="absolute top-1 left-1 h-3 w-3 text-amber-400" />
          </div>
        </div>
      )}
      <CardHeader className="flex flex-row items-center gap-4 rounded-t-md p-4">
        <ServiceIcon serviceId={service.definition.id} className="h-6 w-6" />
        <div className="flex flex-1 flex-col justify-center">
          <CardTitle className="text-base font-semibold">
            {service.definition.display_name}
          </CardTitle>
          <CardDescription className="text-xs">{service.definition.description}</CardDescription>
        </div>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="bg-card flex flex-row items-center justify-between gap-2 rounded-b-md border-t px-4 py-2">
        {!isInstalled ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAction('install')}
            disabled={actionLoading}
            className="flex flex-row items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
        ) : isRunning ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAction('stop')}
            disabled={actionLoading}
            className="flex flex-row items-center gap-2"
          >
            <Square className="text-destructive h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAction('start')}
            disabled={actionLoading}
            className="flex flex-row items-center gap-2"
          >
            <Play className="h-4 w-4 text-emerald-500" />
            Start
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="group flex flex-row items-center gap-1"
        >
          <Link to="/services/$serviceId" params={{ serviceId: service.definition.id }}>
            <Settings className="h-4 w-4 group-hover:animate-spin" />
          </Link>
        </Button>
      </CardContent>
      {isMandatory && (
        <div className="h-0 overflow-hidden border-t border-amber-100 bg-amber-50/30 px-4 opacity-0 transition-all duration-200 group-hover:h-auto group-hover:py-2 group-hover:opacity-100 dark:border-amber-900/20 dark:bg-amber-950/5">
          <p className="flex items-center gap-1.5 text-[10px] text-amber-400">
            <AlertCircle className="h-3 w-3" />
            This service is required for the application to function properly
          </p>
        </div>
      )}
    </Card>
  );
}

export const Route = createFileRoute('/')({
  component: DashboardPage,
});
