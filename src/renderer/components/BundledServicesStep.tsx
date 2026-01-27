/**
 * Bundled Services Step for Create Project Wizard
 * Allows users to select optional services to embed in their project's docker-compose
 */

import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@renderer/components/ui/collapsible';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import type { BundledService, BundledServiceCredentials } from '@shared/types/project';
import type { ServiceDefinition, ServiceId } from '@shared/types/service';
import { ChevronDown, Database, HardDrive, Info, Mail, MessageSquare, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BundledServicesStepProps {
  selectedServices: BundledService[];
  onServicesChange: (services: BundledService[]) => void;
}

type ServiceCategory = 'database' | 'cache' | 'email' | 'search' | 'queue';

const CATEGORY_ICONS: Record<ServiceCategory, React.ComponentType<{ className?: string }>> = {
  database: Database,
  cache: HardDrive,
  email: Mail,
  search: Search,
  queue: MessageSquare,
};

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  database: 'Database',
  cache: 'Cache',
  email: 'Email',
  search: 'Search',
  queue: 'Queue',
};

const CATEGORY_ORDER: ServiceCategory[] = ['database', 'cache', 'email', 'search', 'queue'];

// Default database credentials
const DEFAULT_CREDENTIALS: BundledServiceCredentials = {
  database: 'development',
  username: 'developer',
  password: 'developer',
  rootPassword: 'root',
};

export function BundledServicesStep({
  selectedServices,
  onServicesChange,
}: Readonly<BundledServicesStepProps>) {
  const [bundleableServices, setBundleableServices] = useState<Record<string, ServiceDefinition[]>>(
    {}
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['database']));
  const [credentialsExpanded, setCredentialsExpanded] = useState(false);

  // Fetch bundleable services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesApi = (globalThis as unknown as Window).services;
        const services = await servicesApi.getBundleableServices();
        setBundleableServices(services);
      } catch (error) {
        console.error('Failed to fetch bundleable services:', error);
      }
    };
    fetchServices();
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const isServiceSelected = (serviceId: ServiceId): boolean => {
    return selectedServices.some(s => s.serviceId === serviceId);
  };

  const getSelectedService = (serviceId: ServiceId): BundledService | undefined => {
    return selectedServices.find(s => s.serviceId === serviceId);
  };

  const toggleService = (service: ServiceDefinition) => {
    const isSelected = isServiceSelected(service.id);

    if (isSelected) {
      // Remove service
      onServicesChange(selectedServices.filter(s => s.serviceId !== service.id));
    } else if (service.service_type === 'database') {
      // For database services, check if another database is already selected
      // Remove any existing database and add this one
      const withoutDatabases = selectedServices.filter(s => {
        const svc = Object.values(bundleableServices)
          .flat()
          .find(def => def.id === s.serviceId);
        return svc?.service_type !== 'database';
      });

      onServicesChange([
        ...withoutDatabases,
        {
          serviceId: service.id,
          customCredentials: { ...DEFAULT_CREDENTIALS },
        },
      ]);
    } else {
      // Add service without credentials
      onServicesChange([...selectedServices, { serviceId: service.id }]);
    }
  };

  const updateCredentials = (
    serviceId: ServiceId,
    field: keyof BundledServiceCredentials,
    value: string
  ) => {
    onServicesChange(
      selectedServices.map(s => {
        if (s.serviceId === serviceId) {
          return {
            ...s,
            customCredentials: {
              ...DEFAULT_CREDENTIALS,
              ...s.customCredentials,
              [field]: value,
            },
          };
        }
        return s;
      })
    );
  };

  const selectedDatabaseService = selectedServices.find(s => {
    const svc = Object.values(bundleableServices)
      .flat()
      .find(def => def.id === s.serviceId);
    return svc?.service_type === 'database';
  });

  // Map service_type to our categories
  const getCategory = (serviceType: string): ServiceCategory | null => {
    if (serviceType === 'database') {
      return 'database';
    }
    if (serviceType === 'cache') return 'cache';
    if (serviceType === 'email') return 'email';
    if (serviceType === 'search') return 'search';
    if (serviceType === 'queue') return 'queue';
    return null;
  };

  // Group services by our categories
  const groupedServices: Record<ServiceCategory, ServiceDefinition[]> = {
    database: [],
    cache: [],
    email: [],
    search: [],
    queue: [],
  };

  for (const services of Object.values(bundleableServices)) {
    for (const service of services) {
      // Skip admin tools (phpMyAdmin, Adminer) - they'll be auto-added with database
      if (service.linkedDatabaseService) continue;

      const category = getCategory(service.service_type);
      if (category) {
        groupedServices[category].push(service);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground mb-4 text-sm">
        Select optional services to bundle with your project. These will run as part of your
        devcontainer and are accessible via Docker DNS.
      </div>

      {CATEGORY_ORDER.map(category => {
        const services = groupedServices[category];
        if (services.length === 0) return null;

        const CategoryIcon = CATEGORY_ICONS[category];
        const categoryLabel = CATEGORY_LABELS[category];
        const isExpanded = expandedCategories.has(category);

        return (
          <Collapsible
            key={category}
            open={isExpanded}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-3 transition-colors">
              <div className="flex items-center gap-2">
                <CategoryIcon className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">{categoryLabel}</span>
                <span className="text-muted-foreground text-xs">
                  ({services.filter(s => isServiceSelected(s.id)).length}/{services.length})
                </span>
              </div>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-2 pl-6">
                {services.map(service => {
                  const isSelected = isServiceSelected(service.id);
                  const isDatabase = category === 'database';
                  const otherDatabaseSelected =
                    isDatabase &&
                    selectedDatabaseService &&
                    selectedDatabaseService.serviceId !== service.id;

                  const getCardClassName = () => {
                    if (isSelected) return 'border-primary bg-primary/5';
                    if (otherDatabaseSelected) return 'border-muted bg-muted/30 opacity-50';
                    return 'border-border hover:border-primary/50';
                  };

                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${getCardClassName()}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{service.display_name}</span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{service.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Database Credentials */}
      {selectedDatabaseService && (
        <Collapsible open={credentialsExpanded} onOpenChange={setCredentialsExpanded}>
          <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-3 transition-colors">
            <div className="flex items-center gap-2">
              <Database className="text-muted-foreground h-4 w-4" />
              <span className="font-medium">Database Credentials</span>
            </div>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform ${credentialsExpanded ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="db-name" className="text-xs">
                  Database Name
                </Label>
                <Input
                  id="db-name"
                  value={
                    getSelectedService(selectedDatabaseService.serviceId)?.customCredentials
                      ?.database || DEFAULT_CREDENTIALS.database
                  }
                  onChange={e =>
                    updateCredentials(selectedDatabaseService.serviceId, 'database', e.target.value)
                  }
                  placeholder="development"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="db-user" className="text-xs">
                  Username
                </Label>
                <Input
                  id="db-user"
                  value={
                    getSelectedService(selectedDatabaseService.serviceId)?.customCredentials
                      ?.username || DEFAULT_CREDENTIALS.username
                  }
                  onChange={e =>
                    updateCredentials(selectedDatabaseService.serviceId, 'username', e.target.value)
                  }
                  placeholder="developer"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="db-pass" className="text-xs">
                  Password
                </Label>
                <Input
                  id="db-pass"
                  value={
                    getSelectedService(selectedDatabaseService.serviceId)?.customCredentials
                      ?.password || DEFAULT_CREDENTIALS.password
                  }
                  onChange={e =>
                    updateCredentials(selectedDatabaseService.serviceId, 'password', e.target.value)
                  }
                  placeholder="developer"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="db-root-pass" className="text-xs">
                  Root Password
                </Label>
                <Input
                  id="db-root-pass"
                  value={
                    getSelectedService(selectedDatabaseService.serviceId)?.customCredentials
                      ?.rootPassword || DEFAULT_CREDENTIALS.rootPassword
                  }
                  onChange={e =>
                    updateCredentials(
                      selectedDatabaseService.serviceId,
                      'rootPassword',
                      e.target.value
                    )
                  }
                  placeholder="root"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {selectedServices.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          No bundled services selected. Your project will use global DAMP services.
        </div>
      )}
    </div>
  );
}
