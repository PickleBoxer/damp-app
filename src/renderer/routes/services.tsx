import { useQuery, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  createFileRoute,
  Outlet,
  Link,
  useMatches,
  ErrorComponent,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { usePanelSizes } from '@renderer/hooks/use-panel-sizes';
import { PackageOpen, Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel } from '@renderer/components/ui/resizable';
import { ResizableHandleWithControls } from '@renderer/components/ResizableHandleWithControls';

import { servicesQueryOptions, serviceContainerStateQueryOptions } from '@renderer/services';
// useQuery already imported above
import { ServiceIcon } from '@renderer/components/ServiceIcon';
import { ContainerStateIndicator } from '@renderer/components/ContainerStateIndicator';
import type { ServiceType, ServiceId } from '@shared/types/service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { Button } from '@renderer/components/ui/button';

export const Route = createFileRoute('/services')({
  loader: async ({ context: { queryClient } }) => {
    // Non-blocking prefetch - starts loading but doesn't wait
    void queryClient.prefetchQuery(servicesQueryOptions());
  },
  errorComponent: ServicesErrorComponent,
  component: ServicesPage,
});

// Service type tabs to display (in order)
const SERVICE_TYPE_TABS: { value: ServiceType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'database', label: 'Database' },
  { value: 'email', label: 'Email' },
  { value: 'cache', label: 'Cache' },
  { value: 'storage', label: 'Storage' },
  { value: 'search', label: 'Search' },
  { value: 'queue', label: 'Queue' },
];

interface ServiceListItemProps {
  serviceId: ServiceId;
  displayName: string;
  description: string;
  isSelected: boolean;
  isRequired?: boolean;
}

function ServiceListItem({
  serviceId,
  displayName,
  description,
  isSelected,
  isRequired,
}: Readonly<ServiceListItemProps>) {
  // Each service fetches its own container state
  const { data: state } = useQuery(serviceContainerStateQueryOptions(serviceId));

  return (
    <div
      className={`group/service relative w-full ${
        isSelected ? 'bg-primary/5' : ''
      } ${state?.exists ? '' : 'opacity-50'}`}
    >
      <Link
        to="/services/$serviceId"
        params={{ serviceId }}
        className="hover:bg-primary/5 flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-colors duration-200"
      >
        <div className="flex w-full flex-1 items-center gap-3">
          <ServiceIcon serviceId={serviceId} className="h-10 w-10" />
          <div className="w-full truncate">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{displayName}</span>
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
              <ContainerStateIndicator status={state} />
            </div>
            <p className="text-muted-foreground truncate text-xs">{description}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ServicesPage() {
  const matches = useMatches();
  const serviceMatch = matches.find(
    match =>
      typeof match.id === 'string' && match.id.startsWith('/services/') && match.id !== '/services'
  );
  const selectedServiceId = serviceMatch?.params
    ? (serviceMatch.params as { serviceId: string }).serviceId
    : undefined;

  // Use regular query with loading state
  const { data: services, isLoading, isError, error } = useQuery(servicesQueryOptions());

  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const { initialSizes, saveSizes, resetSizes, equalSplit, resetKey } = usePanelSizes(
    'services',
    [45, 55]
  );

  // Memoize filtered services
  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (selectedType === 'all') return services;
    return services.filter(s => s.service_type === selectedType);
  }, [services, selectedType]);

  return (
    <ResizablePanelGroup
      key={resetKey}
      direction="horizontal"
      className="h-full"
      onLayout={saveSizes}
    >
      {/* Left side - Service List */}
      <ResizablePanel defaultSize={initialSizes[0]}>
        <div className="flex h-full flex-col">
          {/* Header Bar */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <h2 className="text-sm font-semibold tracking-wide">Services</h2>
            <Select
              value={selectedType}
              onValueChange={(v: string) => setSelectedType(v as ServiceType | 'all')}
            >
              <SelectTrigger className="h-7 w-fit gap-1 px-2 py-1 text-xs">
                <span className="text-[10px] font-medium">Type:</span>
                <SelectValue className="text-xs" />
              </SelectTrigger>
              <SelectContent align="end">
                {SERVICE_TYPE_TABS.map(tab => (
                  <SelectItem key={tab.value} value={tab.value} className="py-1 text-xs">
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-0 flex-1 [&_[data-radix-scroll-area-viewport]>:first-child]:block!">
            <div className="flex w-full flex-1 flex-col">
              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="text-muted-foreground/40 mb-4 h-12 w-12 animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading services...</p>
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-destructive mb-2 text-sm font-medium">
                    Failed to load services
                  </p>
                  <p className="text-muted-foreground text-xs">{(error as Error).message}</p>
                </div>
              )}

              {/* Service List */}
              {!isLoading && !isError && filteredServices.length > 0 && (
                <>
                  {filteredServices.map(service => (
                    <ServiceListItem
                      key={service.id}
                      serviceId={service.id}
                      displayName={service.display_name}
                      description={service.description}
                      isSelected={selectedServiceId === service.id}
                      isRequired={service.required}
                    />
                  ))}
                </>
              )}

              {/* Empty State */}
              {!isLoading && !isError && filteredServices.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center p-8 text-center"
                  role="status"
                >
                  <PackageOpen
                    className="text-muted-foreground/40 mb-4 h-12 w-12"
                    aria-hidden="true"
                  />
                  <h3 className="mb-2 text-sm font-semibold">No services found</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm text-xs">
                    {selectedType === 'all'
                      ? 'No services are available. Services may not be installed or configured.'
                      : `No ${SERVICE_TYPE_TABS.find(t => t.value === selectedType)?.label.toLowerCase()} services found.`}
                  </p>
                  {selectedType !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedType('all')}
                      className="h-8 text-xs"
                    >
                      Clear filter
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandleWithControls onReset={resetSizes} onEqualSplit={equalSplit} />

      {/* Right side - Service Detail */}
      <ResizablePanel defaultSize={initialSizes[1]}>
        <div className="h-full overflow-hidden">
          <Outlet />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function ServicesErrorComponent({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <p className="text-destructive text-sm font-medium">Failed to load services</p>
        <p className="text-muted-foreground text-xs">{error.message}</p>
        <Button
          onClick={() => {
            queryErrorResetBoundary.reset();
            router.invalidate();
          }}
          variant="outline"
          size="sm"
        >
          Retry
        </Button>
        <ErrorComponent error={error} />
      </div>
    </div>
  );
}
