/**
 * Bundled Services Step for Create Project Wizard
 * Minimal, modern design for optional per-project services
 */

import { Checkbox } from '@renderer/components/ui/checkbox';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import type { BundledService, BundledServiceCredentials } from '@shared/types/project';
import { ServiceId, type ServiceDefinition } from '@shared/types/service';
import { IconChevronRight, IconDatabase, IconPackage, IconWorld } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface BundledServicesStepProps {
  selectedServices: BundledService[];
  onServicesChange: (services: BundledService[]) => void;
  onAutoAdvance?: () => void;
}

type ServiceMode = 'global' | 'bundled';
type DatabaseAdminTool = 'none' | 'phpmyadmin' | 'adminer';

const ADMIN_TOOL_LABELS: Record<DatabaseAdminTool, string> = {
  none: 'None',
  phpmyadmin: 'phpMyAdmin',
  adminer: 'Adminer',
};

const DEFAULT_CREDENTIALS: BundledServiceCredentials = {
  database: 'development',
  username: 'developer',
  password: 'developer',
  rootPassword: 'root',
};

export function BundledServicesStep({
  selectedServices,
  onServicesChange,
  onAutoAdvance,
}: Readonly<BundledServicesStepProps>) {
  const [bundleableServices, setBundleableServices] = useState<Record<string, ServiceDefinition[]>>(
    {}
  );
  const [serviceMode, setServiceMode] = useState<ServiceMode>(
    selectedServices.length > 0 ? 'bundled' : 'global'
  );
  const [showCredentials, setShowCredentials] = useState(false);

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

  const handleModeSelect = (mode: ServiceMode) => {
    setServiceMode(mode);
    if (mode === 'global') {
      onServicesChange([]);
      onAutoAdvance?.();
    }
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
      let updatedServices = selectedServices.filter(s => s.serviceId !== service.id);
      if (service.service_type === 'database') {
        updatedServices = updatedServices.filter(
          s => s.serviceId !== ServiceId.PhpMyAdmin && s.serviceId !== ServiceId.Adminer
        );
      }
      onServicesChange(updatedServices);
    } else if (service.service_type === 'database') {
      const withoutDatabases = selectedServices.filter(s => {
        const svc = Object.values(bundleableServices)
          .flat()
          .find(def => def.id === s.serviceId);
        return svc?.service_type !== 'database' || svc?.linkedDatabaseService;
      });
      const withoutAdminTools = withoutDatabases.filter(
        s => s.serviceId !== ServiceId.PhpMyAdmin && s.serviceId !== ServiceId.Adminer
      );
      onServicesChange([
        ...withoutAdminTools,
        { serviceId: service.id, customCredentials: { ...DEFAULT_CREDENTIALS } },
      ]);
    } else {
      onServicesChange([...selectedServices, { serviceId: service.id }]);
    }
  };

  const handleAdminToolChange = (tool: DatabaseAdminTool) => {
    let updatedServices = selectedServices.filter(
      s => s.serviceId !== ServiceId.PhpMyAdmin && s.serviceId !== ServiceId.Adminer
    );
    if (tool === 'phpmyadmin') {
      updatedServices = [...updatedServices, { serviceId: ServiceId.PhpMyAdmin }];
    } else if (tool === 'adminer') {
      updatedServices = [...updatedServices, { serviceId: ServiceId.Adminer }];
    }
    onServicesChange(updatedServices);
  };

  const getSelectedAdminTool = (): DatabaseAdminTool => {
    if (isServiceSelected(ServiceId.PhpMyAdmin)) return 'phpmyadmin';
    if (isServiceSelected(ServiceId.Adminer)) return 'adminer';
    return 'none';
  };

  const updateCredentials = (
    serviceId: ServiceId,
    field: keyof BundledServiceCredentials,
    value: string
  ) => {
    onServicesChange(
      selectedServices.map(s =>
        s.serviceId === serviceId
          ? {
              ...s,
              customCredentials: { ...DEFAULT_CREDENTIALS, ...s.customCredentials, [field]: value },
            }
          : s
      )
    );
  };

  const selectedDatabaseService = selectedServices.find(s => {
    const svc = Object.values(bundleableServices)
      .flat()
      .find(def => def.id === s.serviceId);
    return svc?.service_type === 'database' && !svc?.linkedDatabaseService;
  });

  const databaseServices = Object.values(bundleableServices)
    .flat()
    .filter(s => s.service_type === 'database' && !s.linkedDatabaseService);

  const otherServices = Object.values(bundleableServices)
    .flat()
    .filter(s => s.service_type !== 'database' && !s.linkedDatabaseService);

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleModeSelect('global')}
          className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all ${
            serviceMode === 'global'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <IconWorld className="h-8 w-8 text-blue-500" />
          <div>
            <p className="font-medium">Global Services</p>
            <p className="text-muted-foreground text-xs">Shared across projects</p>
          </div>
          <IconChevronRight className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        <button
          type="button"
          onClick={() => handleModeSelect('bundled')}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all ${
            serviceMode === 'bundled'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <IconPackage className="h-8 w-8 text-orange-500" />
          <div>
            <p className="font-medium">Bundled Services</p>
            <p className="text-muted-foreground text-xs">Isolated per project</p>
          </div>
        </button>
      </div>

      {/* Bundled Services Configuration */}
      {serviceMode === 'bundled' && (
        <div className="space-y-4 pt-2">
          {/* Database Selection */}
          {databaseServices.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                Database
              </Label>
              <div className="flex flex-wrap gap-2">
                {databaseServices.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                      isServiceSelected(service.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {service.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Database Options */}
          {selectedDatabaseService && (
            <div className="bg-muted/30 space-y-3 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">Admin:</span>
                <div className="flex gap-1">
                  {(['none', 'phpmyadmin', 'adminer'] as const).map(tool => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => handleAdminToolChange(tool)}
                      className={`rounded px-2 py-1 text-xs transition-all ${
                        getSelectedAdminTool() === tool
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {ADMIN_TOOL_LABELS[tool]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
              >
                <IconDatabase className="h-3 w-3" />
                {showCredentials ? 'Hide' : 'Edit'} credentials
              </button>

              {showCredentials && (
                <div className="grid grid-cols-2 gap-2">
                  {(['database', 'username', 'password', 'rootPassword'] as const).map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-muted-foreground text-[10px] capitalize">
                        {field === 'rootPassword' ? 'Root Password' : field}
                      </Label>
                      <Input
                        value={
                          getSelectedService(selectedDatabaseService.serviceId)
                            ?.customCredentials?.[field] || DEFAULT_CREDENTIALS[field]
                        }
                        onChange={e =>
                          updateCredentials(
                            selectedDatabaseService.serviceId,
                            field,
                            e.target.value
                          )
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other Services */}
          {otherServices.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-wide uppercase">
                Additional Services
              </Label>
              <div className="flex flex-wrap gap-2">
                {otherServices.map(service => (
                  <label
                    key={service.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                      isServiceSelected(service.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={isServiceSelected(service.id)}
                      onCheckedChange={() => toggleService(service)}
                      className="h-3.5 w-3.5"
                    />
                    {service.display_name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedServices.filter(
            s => s.serviceId !== ServiceId.PhpMyAdmin && s.serviceId !== ServiceId.Adminer
          ).length === 0 && (
            <p className="text-muted-foreground text-center text-xs">
              Select services to bundle with your project
            </p>
          )}
        </div>
      )}
    </div>
  );
}
