import React from 'react';
import { createFileRoute, useNavigate, Outlet } from '@tanstack/react-router';
import { ShieldAlertIcon, TriangleAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useServices } from '@/api/services/services-queries';
import { Skeleton } from '@/components/ui/skeleton';
import type { ServiceType } from '@/types/service';
import { Badge } from '@/components/ui/badge';

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
  const navigate = useNavigate();
  const {
    data: services,
    isLoading,
    error,
  } = useServices({
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const [selectedType, setSelectedType] = React.useState<ServiceType | 'all'>('all');

  // Memoize filtered services
  const filteredServices = React.useMemo(() => {
    if (!services) return [];
    if (selectedType === 'all') return services;
    return services.filter(s => s.definition.service_type === selectedType);
  }, [services, selectedType]);

  // Type-safe tab change handler
  const handleTabChange = (value: string) => {
    setSelectedType(value as ServiceType | 'all');
  };

  if (error)
    return (
      <Empty className="from-muted/50 to-background h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>Error loading services</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <>
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manage Services</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              View, install, and control services for your local development environment.
            </p>
          </div>
        </div>
        <Tabs
          value={selectedType}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div>
            <TabsList className="flex-shrink-0">
              {SERVICE_TYPE_TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:text-secondary-foreground hover:text-muted-foreground/70 dark:hover:text-muted-foreground/70 inline-flex items-center justify-center rounded-md border-none px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-xs"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value={selectedType} className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {isLoading ? (
                  <>
                    {[0, 1, 2, 3, 4].map(index => (
                      <Item
                        variant="outline"
                        key={`skeleton-${index}`}
                        className="bg-muted/30 transition-transform duration-200"
                      >
                        <ItemMedia variant="icon">
                          <Skeleton className="h-6 w-6 rounded" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>
                            <Skeleton className="h-4 w-32" />
                          </ItemTitle>
                          <ItemDescription>
                            <Skeleton className="mt-2 h-3 w-48" />
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Skeleton className="h-8 w-20 rounded" />
                        </ItemActions>
                      </Item>
                    ))}
                  </>
                ) : filteredServices.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ShieldAlertIcon />
                      </EmptyMedia>
                      <EmptyTitle>No services found</EmptyTitle>
                      <EmptyDescription>No services match the selected filter.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  filteredServices.map(service => (
                    <Item
                      variant="outline"
                      key={service.definition.id}
                      onClick={() =>
                        navigate({
                          to: '/services/$serviceId',
                          params: { serviceId: service.definition.id },
                        })
                      }
                      className={`bg-muted/30 hover:bg-accent flex w-full cursor-pointer transition-colors ${service.state.installed ? '' : 'bg-transparent opacity-50'}`}
                    >
                      <ItemMedia variant="icon">
                        <ShieldAlertIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{service.definition.display_name}</ItemTitle>
                        <ItemDescription>{service.definition.description}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Badge
                          variant={
                            service.state.container_status?.running ? 'default' : 'secondary'
                          }
                        >
                          {service.state.container_status?.running ? 'Running' : 'Stopped'}
                        </Badge>
                      </ItemActions>
                    </Item>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      <Outlet />
    </>
  );
}

export const Route = createFileRoute('/services')({
  component: ServicesPage,
});
