import { ServiceIcon } from '@renderer/components/ServiceIcon';
import { Button } from '@renderer/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@renderer/components/ui/collapsible';
import { Input } from '@renderer/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Skeleton } from '@renderer/components/ui/skeleton';
import {
  bundledServiceContainerStateQueryOptions,
  serviceContainerStateQueryOptions,
  serviceQueryOptions,
} from '@renderer/services';
import type { ServiceId } from '@shared/types/service';
import {
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconRefresh,
  IconUpload,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

interface DatabaseOperationsProps {
  readonly serviceId: ServiceId;
  readonly projectId?: string;
}

export function DatabaseOperations({ serviceId, projectId }: DatabaseOperationsProps) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [customDatabaseName, setCustomDatabaseName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDumping, setIsDumping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch service info (cached from route loader - no performance cost)
  const { data: service } = useQuery(serviceQueryOptions(serviceId));

  const isDatabase = service?.service_type === 'database';

  // Fetch container state - use different hooks based on bundled vs standalone
  const standaloneQuery = useQuery({
    ...serviceContainerStateQueryOptions(serviceId),
    enabled: !projectId && isDatabase,
  });
  const bundledQuery = useQuery({
    ...bundledServiceContainerStateQueryOptions(projectId!, serviceId),
    enabled: !!projectId && isDatabase,
  });

  // Early return if not a database service (after all hooks are called)
  if (!isDatabase) {
    return null;
  }

  const containerState = projectId ? bundledQuery.data : standaloneQuery.data;
  const isStateLoading = projectId ? bundledQuery.isLoading : standaloneQuery.isLoading;

  const servicesApi = (globalThis as unknown as Window).services;
  const isRunning = containerState?.running || false;
  const healthStatus = containerState?.health_status || 'none';
  const isDisabled = !isRunning || (healthStatus !== 'healthy' && healthStatus !== 'none');
  const isComponentLoading = isStateLoading;

  const getDisabledMessage = () => {
    if (isRunning) {
      return `Service is ${healthStatus}. Wait for healthy status.`;
    }
    return 'Start the service to use database operations.';
  };

  const handleFetchDatabases = async () => {
    setIsLoading(true);
    try {
      const dbs = await servicesApi.listDatabases(serviceId, projectId);

      setDatabases(dbs);
      if (dbs.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbs[0]);
      }
      toast.success(`Found ${dbs.length} database(s)`);
    } catch (error) {
      toast.error('Failed to fetch databases', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setDatabases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDumpDatabase = async () => {
    if (!selectedDatabase) return;

    setIsDumping(true);
    try {
      const result = await servicesApi.dumpDatabase(serviceId, selectedDatabase, projectId);

      if (result.success) {
        toast.success('Dump created', { description: result.path });
      } else {
        toast.error('Failed to create dump', { description: result.error });
      }
    } catch (error) {
      toast.error('Failed to create dump', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsDumping(false);
    }
  };

  const handleRestoreDatabase = async () => {
    const targetDatabase = customDatabaseName.trim() || selectedDatabase;

    if (!targetDatabase) {
      toast.error('Please select or enter a database name', {
        description: 'You must specify a target database before restoring',
      });
      return;
    }

    setIsRestoring(true);
    try {
      const result = await servicesApi.restoreDatabase(serviceId, targetDatabase, projectId);

      if (result.success) {
        toast.success('Database restored', {
          description: `Restored to database: ${targetDatabase}`,
        });
        // Clear custom input and refresh database list
        setCustomDatabaseName('');
        await handleFetchDatabases();
      } else {
        toast.error('Failed to restore', { description: result.error });
      }
    } catch (error) {
      toast.error('Failed to restore', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="hover:bg-muted/50 border-border flex items-center justify-between rounded-lg border p-3 transition-colors">
          <div className="flex items-center gap-3">
            <ServiceIcon serviceId={serviceId} className="h-4 w-4" />
            <div className="text-left">
              <h3 className="text-sm font-medium">Backup & Restore</h3>
              <p className="text-muted-foreground text-xs">
                {isComponentLoading ? 'Loading...' : 'Database operations'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground text-xs">
              {databases.length > 0 &&
                `${databases.length} database${databases.length === 1 ? '' : 's'}`}
            </div>
            {isExpanded ? (
              <IconChevronDown className="h-4 w-4" />
            ) : (
              <IconChevronRight className="h-4 w-4" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-border rounded-b-lg border border-t-0 p-3">
          {isComponentLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}
          {!isComponentLoading && isDisabled && (
            <p className="text-muted-foreground text-xs">{getDisabledMessage()}</p>
          )}
          {!isComponentLoading && !isDisabled && (
            <div className="space-y-3">
              {' '}
              <div className="flex gap-2">
                <Select
                  value={selectedDatabase}
                  onValueChange={setSelectedDatabase}
                  disabled={databases.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select database" />
                  </SelectTrigger>
                  <SelectContent>
                    {databases.map(db => (
                      <SelectItem key={db} value={db}>
                        {db}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFetchDatabases}
                  disabled={isLoading}
                  title="Fetch databases"
                >
                  <IconRefresh className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="custom-db-name" className="text-muted-foreground text-xs">
                  Or enter custom database name for restore:
                </label>
                <Input
                  id="custom-db-name"
                  type="text"
                  placeholder="e.g., staging_db, test_db"
                  value={customDatabaseName}
                  onChange={e => setCustomDatabaseName(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleDumpDatabase}
                  disabled={!selectedDatabase || isDumping}
                  className="flex-1"
                  size="sm"
                >
                  <IconDownload className="mr-2 size-4" />
                  {isDumping ? 'Dumping...' : 'Dump'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRestoreDatabase}
                  disabled={(!selectedDatabase && !customDatabaseName.trim()) || isRestoring}
                  className="flex-1"
                  size="sm"
                >
                  <IconUpload className="mr-2 size-4" />
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
