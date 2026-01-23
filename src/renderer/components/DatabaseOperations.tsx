import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Input } from '@renderer/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import type { ContainerState } from '@shared/types/container';
import type { ServiceInfo } from '@shared/types/service';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface DatabaseOperationsProps {
  readonly service: ServiceInfo;
  readonly isRunning: boolean;
  readonly healthStatus: ContainerState['health_status'];
}

function getDisabledMessage(
  isRunning: boolean,
  healthStatus: ContainerState['health_status']
): string {
  if (!isRunning) {
    return 'Start the service to use database operations.';
  }
  return `Service is ${healthStatus}. Wait for healthy status.`;
}

export function DatabaseOperations({ service, isRunning, healthStatus }: DatabaseOperationsProps) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [customDatabaseName, setCustomDatabaseName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDumping, setIsDumping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    setDatabases([]);
    setSelectedDatabase('');
    setCustomDatabaseName('');
    setIsLoading(false);
    setIsDumping(false);
    setIsRestoring(false);
  }, [service.id]);

  if (!service.databaseConfig) return null;

  const servicesApi = (globalThis as unknown as Window).services;
  const isDisabled = !isRunning || (healthStatus !== 'healthy' && healthStatus !== 'none');

  const handleFetchDatabases = async () => {
    setIsLoading(true);
    try {
      const dbs = await servicesApi.listDatabases(service.id);
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
      const result = await servicesApi.dumpDatabase(service.id, selectedDatabase);
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
      const result = await servicesApi.restoreDatabase(service.id, targetDatabase);
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
    <Card size="sm">
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Database Operations</h3>
            <p className="text-muted-foreground text-xs">Backup and restore databases</p>
          </div>
          {isDisabled ? (
            <p className="text-muted-foreground text-xs">
              {getDisabledMessage(isRunning, healthStatus)}
            </p>
          ) : (
            <>
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
                  <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                  <Download className="mr-2 size-4" />
                  {isDumping ? 'Dumping...' : 'Dump'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRestoreDatabase}
                  disabled={(!selectedDatabase && !customDatabaseName.trim()) || isRestoring}
                  className="flex-1"
                  size="sm"
                >
                  <Upload className="mr-2 size-4" />
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
