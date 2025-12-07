import React from 'react';
import { createFileRoute, Outlet, Link, useMatches } from '@tanstack/react-router';
import { Filter, PackageOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useServices, servicesQueryOptions } from '@/api/services/services-queries';
import { ServiceIcon } from '@/components/ServiceIcon';
import { HiOutlineStatusOnline } from 'react-icons/hi';
import type { ServiceType } from '@/types/service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Service type tabs to display (in order)
const SERVICE_TYPE_TABS: Array<{ value: ServiceType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Web' },
  { value: 'database', label: 'Database' },
  { value: 'email', label: 'Email' },
  { value: 'cache', label: 'Cache' },
  { value: 'storage', label: 'Storage' },
  { value: 'search', label: 'Search' },
  { value: 'queue', label: 'Queue' },
];

function ServicesPage() {
  const matches = useMatches();
  const serviceMatch = matches.find(
    match =>
      typeof match.id === 'string' && match.id.startsWith('/services/') && match.id !== '/services'
  );
  const selectedServiceId = serviceMatch?.params
    ? (serviceMatch.params as { serviceId: string }).serviceId
    : undefined;

  const { data: services, isLoading, error } = useServices({
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const [selectedType, setSelectedType] = React.useState<ServiceType | 'all'>('all');

  // Memoize filtered services
  const filteredServices = React.useMemo(() => {
    if (!services) return [];
    if (selectedType === 'all') return services;
    return services.filter(s => s.definition.service_type === selectedType);
  }, [services, selectedType]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left side - Service List */}
      <ResizablePanel defaultSize={40}>
        <div className="flex h-full flex-col">
          {/* Header Bar */}
          <div className="flex h-12 items-center justify-between border-b px-4">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Services</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  <Filter className="h-3.5 w-3.5" />
                  {selectedType === 'all'
                    ? 'All'
                    : SERVICE_TYPE_TABS.find(t => t.value === selectedType)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={selectedType}
                  onValueChange={v => setSelectedType(v as ServiceType | 'all')}
                >
                  {SERVICE_TYPE_TABS.map(tab => (
                    <DropdownMenuRadioItem key={tab.value} value={tab.value}>
                      {tab.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center">
                <p className="text-destructive text-sm font-medium">Failed to load services</p>
                <p className="text-muted-foreground mt-1 text-xs">{error.message}</p>
              </div>
            </div>
          )}

          {!error && (
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {/* Loading State */}
                {isLoading && (
                <>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="border-b p-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted h-10 w-10 animate-pulse rounded-md" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                          <div className="bg-muted h-3 w-40 animate-pulse rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Service List */}
              {!isLoading && filteredServices.length > 0 && (
                <>
                  {filteredServices.map(service => (
                    <div
                      key={service.definition.id}
                      className={`group/service relative ${
                        selectedServiceId === service.definition.id ? 'bg-primary/5' : ''
                      } ${!service.state.installed ? 'opacity-50' : ''}`}
                    >
                      <Link
                        to="/services/$serviceId"
                        params={{ serviceId: service.definition.id }}
                        className="hover:bg-primary/5 flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-colors duration-200"
                      >
                        <div className="flex flex-1 items-center gap-3">
                          <ServiceIcon serviceId={service.definition.id} className="h-10 w-10" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold">
                                {service.definition.display_name}
                              </span>
                              {service.state.installed && (
                                <HiOutlineStatusOnline
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    service.state.container_status?.running
                                      ? 'text-green-500'
                                      : 'text-muted-foreground/40'
                                  }`}
                                  title={
                                    service.state.container_status?.running ? 'Running' : 'Stopped'
                                  }
                                />
                              )}
                            </div>
                            <p className="text-muted-foreground truncate text-xs">
                              {service.definition.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </>
              )}

              {/* Empty State */}
              {!isLoading && filteredServices.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center" role="status">
                  <PackageOpen className="text-muted-foreground/40 mb-4 h-12 w-12" aria-hidden="true" />
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
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right side - Service Detail */}
      <ResizablePanel defaultSize={60}>
        <div className="h-full overflow-hidden">
          <Outlet />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export const Route = createFileRoute('/services')({
  loader: ({ context }) => {
    // Prefetch services in the loader for instant rendering
    return context.queryClient.ensureQueryData(servicesQueryOptions());
  },
  component: ServicesPage,
});
