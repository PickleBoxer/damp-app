import { HealthBadge } from '@renderer/components/HealthBadge';
import ServiceActions from '@renderer/components/ServiceActions';
import { ServiceIcon } from '@renderer/components/ServiceIcon';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@renderer/components/ui/item';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Separator } from '@renderer/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { serviceContainerStateQueryOptions, serviceQueryOptions } from '@renderer/services';
import { getServiceUIUrl, hasServiceUI } from '@renderer/utils/services/ui';
import { ServiceId, ServiceInfo } from '@shared/types/service';
import { useQuery, useQueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  ErrorComponent,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import {
  Check,
  Container,
  Copy,
  Download,
  ExternalLink,
  MonitorSmartphone,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/services/$serviceId')({
  loader: ({ context: { queryClient }, params: { serviceId } }) =>
    queryClient.ensureQueryData(serviceQueryOptions(serviceId as ServiceId)),
  errorComponent: ServiceDetailErrorComponent,
  component: ServiceDetailPage,
});

// Helper function to get status text
function getStatusText(isRunning?: boolean, exists?: boolean): string {
  if (isRunning) {
    return 'Running';
  }

  if (exists) {
    return 'Stopped';
  }

  return 'Not Installed';
}

// Helper function to get the actual external port for a service
function getServicePort(service: ServiceInfo, portIndex = 0): string {
  // Try to get the actual mapped port from state config
  const actualPort = service.custom_config?.ports?.[portIndex]?.[0];
  // Fallback to default port from definition
  const defaultPort = service.default_config.ports?.[portIndex]?.[0];

  return actualPort || defaultPort || 'N/A';
}

// Copy to clipboard component
function CopyButton({ text, label }: { readonly text: string; readonly label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

// Helper function to get actual environment variables (custom or default)
function getEnvironmentVars(service: ServiceInfo): string[] {
  return service.custom_config?.environment_vars || service.default_config.environment_vars;
}

// Helper function to parse env vars into an object
function parseEnvVars(envVars: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const envVar of envVars) {
    const [key, ...valueParts] = envVar.split('=');
    parsed[key] = valueParts.join('=');
  }
  return parsed;
}

// Helper function to format environment variables as Laravel .env format
function formatAsLaravelEnv(service: ServiceInfo, host: string, port: string): string {
  const envVars = parseEnvVars(getEnvironmentVars(service));

  switch (service.id) {
    case ServiceId.MySQL:
    case ServiceId.MariaDB: {
      const dbType = service.id === ServiceId.MySQL ? 'mysql' : 'mariadb';
      return [
        `DB_CONNECTION=${dbType}`,
        `DB_HOST=${host}`,
        `DB_PORT=${port}`,
        `DB_DATABASE=${envVars.MYSQL_DATABASE || 'development'}`,
        `DB_USERNAME=${envVars.MYSQL_USER || 'developer'}`,
        `DB_PASSWORD=${envVars.MYSQL_PASSWORD || 'devpassword'}`,
      ].join('\n');
    }

    case ServiceId.PostgreSQL:
      return [
        'DB_CONNECTION=pgsql',
        `DB_HOST=${host}`,
        `DB_PORT=${port}`,
        `DB_DATABASE=${envVars.POSTGRES_DB || 'development'}`,
        `DB_USERNAME=${envVars.POSTGRES_USER || 'postgres'}`,
        `DB_PASSWORD=${envVars.POSTGRES_PASSWORD || 'postgres'}`,
      ].join('\n');

    case ServiceId.MongoDB: {
      const username = envVars.MONGODB_INITDB_ROOT_USERNAME || 'root';
      const password = envVars.MONGODB_INITDB_ROOT_PASSWORD || 'rootpassword';
      return [
        `MONGODB_HOST=${host}`,
        `MONGODB_PORT=${port}`,
        `MONGODB_USERNAME=${username}`,
        `MONGODB_PASSWORD=${password}`,
      ].join('\n');
    }

    case ServiceId.Redis:
    case ServiceId.Valkey:
      return [
        `REDIS_HOST=${host}`,
        `REDIS_PORT=${port}`,
        'REDIS_PASSWORD=null',
        'REDIS_CLIENT=phpredis',
      ].join('\n');

    case ServiceId.Memcached:
      return [
        `MEMCACHED_HOST=${host}`,
        `MEMCACHED_PORT=${port}`,
        'MEMCACHED_PERSISTENT_ID=null',
        'MEMCACHED_USERNAME=null',
        'MEMCACHED_PASSWORD=null',
      ].join('\n');

    case ServiceId.Mailpit: {
      const smtpPort = envVars.MP_SMTP_BIND_ADDR?.split(':')[1] || '1025';
      return ['MAIL_MAILER=smtp', `MAIL_HOST=${host}`, `MAIL_PORT=${smtpPort}`].join('\n');
    }

    case ServiceId.Typesense: {
      const apiKey = envVars.TYPESENSE_API_KEY || 'xyz';
      return [
        `TYPESENSE_HOST=${host}`,
        `TYPESENSE_PORT=${port}`,
        'TYPESENSE_PROTOCOL=http',
        `TYPESENSE_API_KEY=${apiKey}`,
      ].join('\n');
    }

    case ServiceId.Meilisearch: {
      const masterKey = envVars.MEILI_MASTER_KEY || 'masterkey';
      return [`MEILISEARCH_HOST=http://${host}:${port}`, `MEILISEARCH_KEY=${masterKey}`].join('\n');
    }

    case ServiceId.RabbitMQ: {
      const user = envVars.RABBITMQ_DEFAULT_USER || 'rabbitmq';
      const pass = envVars.RABBITMQ_DEFAULT_PASS || 'rabbitmq';
      return [
        `RABBITMQ_HOST=${host}`,
        `RABBITMQ_PORT=${port}`,
        `RABBITMQ_USER=${user}`,
        `RABBITMQ_PASSWORD=${pass}`,
        'RABBITMQ_VHOST=/',
      ].join('\n');
    }

    case ServiceId.MinIO: {
      const accessKey = envVars.MINIO_ROOT_USER || 'root';
      const secretKey = envVars.MINIO_ROOT_PASSWORD || 'password';
      return [
        `AWS_ENDPOINT=http://${host}:${port}`,
        `AWS_ACCESS_KEY_ID=${accessKey}`,
        `AWS_SECRET_ACCESS_KEY=${secretKey}`,
        'AWS_DEFAULT_REGION=us-east-1',
        'AWS_BUCKET=local',
        'AWS_USE_PATH_STYLE_ENDPOINT=true',
      ].join('\n');
    }

    case ServiceId.RustFS: {
      const accessKey = envVars.RUSTFS_ACCESS_KEY || 'damp';
      const secretKey = envVars.RUSTFS_SECRET_KEY || 'password';
      return [
        `AWS_ENDPOINT=http://${host}:${port}`,
        `AWS_ACCESS_KEY_ID=${accessKey}`,
        `AWS_SECRET_ACCESS_KEY=${secretKey}`,
        'AWS_DEFAULT_REGION=us-east-1',
        'AWS_BUCKET=local',
        'AWS_USE_PATH_STYLE_ENDPOINT=true',
      ].join('\n');
    }

    default:
      // For services without specific mappings, show host and port
      return `SERVICE_HOST=${host}\nSERVICE_PORT=${port}`;
  }
}

// Connection info component
function ConnectionInfo({ service }: { readonly service: ServiceInfo }) {
  const { data: state } = useQuery(serviceContainerStateQueryOptions(service.id));

  // Use actual container name from Docker, fallback to display format
  const containerName = state?.container_name || `damp-${service.id}`;
  const port = getServicePort(service, 0);
  const internalPort = service.default_config.ports?.[0]?.[1] || port;

  // Docker network connection
  const dockerConnection = `${containerName}:${internalPort}`;

  // Host connection
  const hostConnection = `localhost:${port}`;

  // Format as Laravel .env configuration
  const dockerEnvConfig = formatAsLaravelEnv(service, containerName, internalPort);
  const hostEnvConfig = formatAsLaravelEnv(service, 'localhost', port);

  return (
    <Card size="sm" className="mx-auto w-full">
      <CardContent>
        <Tabs defaultValue="devcontainer" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="devcontainer" className="flex-1">
              <Container className="mr-2 h-4 w-4" />
              Inside Devcontainer
            </TabsTrigger>
            <TabsTrigger value="local" className="flex-1">
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              Local Machine
            </TabsTrigger>
          </TabsList>

          {/* Inside Devcontainer Tab */}
          <TabsContent value="devcontainer" className="mt-4 space-y-4">
            <Item variant="default" size="sm">
              <ItemContent>
                <ItemTitle>Docker Network Connection</ItemTitle>
                <p className="text-muted-foreground text-xs">
                  Use this connection when connecting from within your devcontainer
                </p>
              </ItemContent>
            </Item>

            <Separator />

            <div className="space-y-2 px-1.5">
              <p className="text-muted-foreground text-xs font-medium">Connection String</p>
              <div className="bg-background border-border flex items-center justify-between overflow-hidden border">
                <code className="text-foreground flex-1 truncate p-2 font-mono text-xs outline-none select-text">
                  {dockerConnection}
                </code>
                <div className="px-2">
                  <CopyButton text={dockerConnection} label="Connection string" />
                </div>
              </div>
            </div>

            <div className="space-y-2 px-1.5">
              <p className="text-muted-foreground text-xs font-medium">Environment Configuration</p>
              <div className="bg-background border-border relative overflow-hidden border">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={dockerEnvConfig} label=".env configuration" />
                </div>
                <pre className="text-foreground flex-1 p-2 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none select-text">
                  {dockerEnvConfig}
                </pre>
              </div>
            </div>

            <Separator />

            <div className="bg-primary/5 space-y-1 p-3 text-xs">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Inside Devcontainer:</strong> Services
                communicate via Docker&apos;s internal network using container names. This is the
                recommended way to connect from your application running in a devcontainer.
              </p>
            </div>
          </TabsContent>

          {/* Local Machine Tab */}
          <TabsContent value="local" className="mt-4 space-y-4">
            <Item variant="default" size="sm">
              <ItemContent>
                <ItemTitle>Local Machine Connection</ItemTitle>
                <p className="text-muted-foreground text-xs">
                  Use this connection when developing directly on your host machine
                </p>
              </ItemContent>
            </Item>

            <Separator />

            <div className="space-y-2 px-1.5">
              <p className="text-muted-foreground text-xs font-medium">Connection String</p>
              <div className="bg-background border-border flex items-center justify-between overflow-hidden border">
                <code className="text-foreground flex-1 truncate p-2 font-mono text-xs outline-none select-text">
                  {hostConnection}
                </code>
                <div className="px-2">
                  <CopyButton text={hostConnection} label="Connection string" />
                </div>
              </div>
            </div>

            <div className="space-y-2 px-1.5">
              <p className="text-muted-foreground text-xs font-medium">Environment Configuration</p>
              <div className="bg-background border-border relative overflow-hidden border">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={hostEnvConfig} label=".env configuration" />
                </div>
                <pre className="text-foreground flex-1 p-2 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none select-text">
                  {hostEnvConfig}
                </pre>
              </div>
            </div>

            <Separator />

            <div className="bg-primary/5 space-y-1 p-3 text-xs">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Local Machine:</strong> Services are exposed on
                localhost through port mapping. Use this when running your application directly on
                your host machine outside of a container.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Service Info Card Component
function ServiceInfoCard({ service }: { readonly service: ServiceInfo }) {
  const { data: state } = useQuery(serviceContainerStateQueryOptions(service.id));
  const port = getServicePort(service, 0);
  const isRunning = state?.running;
  const healthStatus = state?.health_status;

  return (
    <div className="bg-muted/30 dark:bg-muted/10 border-border border-b px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Status Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isRunning
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : 'bg-muted-foreground/40 dark:bg-muted-foreground/30'
              }`}
            />
            <span className="text-foreground text-sm font-medium">
              {getStatusText(isRunning, state?.exists)}
            </span>
          </div>

          {/* Port Info */}
          {state?.exists && service.default_config.ports.length > 0 && (
            <>
              <div className="bg-border h-4 w-px" />
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs">Port:</span>
                <span className="text-foreground font-mono text-xs font-medium">{port}</span>
              </div>
            </>
          )}
        </div>

        {/* Health Badge */}
        {healthStatus && healthStatus !== 'none' && (
          <div className="flex items-center gap-2">
            <HealthBadge status={healthStatus} variant="minimal" />
          </div>
        )}
      </div>
    </div>
  );
}

// Service details component
function ServiceDetails({ service }: { readonly service: ServiceInfo }) {
  const { data: state } = useQuery(serviceContainerStateQueryOptions(service.id));
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    try {
      // Direct IPC call to download certificate
      const servicesApi = (globalThis as unknown as Window).services;
      const result = (await servicesApi.downloadCaddyCertificate()) as {
        success: boolean;
        path?: string;
        error?: string;
      };

      if (result.success) {
        toast.success('Certificate downloaded successfully', {
          description: result.path ? `Saved to: ${result.path}` : 'Certificate has been saved',
        });
      } else {
        toast.error('Failed to download certificate', {
          description: result.error || 'An unknown error occurred',
        });
      }
    } catch (error) {
      toast.error('Failed to download certificate', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenUI = async () => {
    const uiUrl = getServiceUIUrl(service);
    if (!uiUrl) {
      toast.error('No UI available for this service');
      return;
    }

    try {
      const result = await globalThis.window.electronWindow.openExternal(uiUrl);
      if (result.success) {
        toast.success('Opening service UI in browser');
      } else {
        toast.error('Failed to open UI', {
          description: result.error || 'An unknown error occurred',
        });
      }
    } catch (error) {
      toast.error('Failed to open UI', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const isCaddy = service.id === ServiceId.Caddy;
  const certInstalled =
    (service.custom_config?.metadata?.certInstalled as boolean | undefined) ?? false;
  const showUIButton = hasServiceUI(service.id) && state?.running;

  return (
    <div className="flex h-full flex-col">
      {/* Service Header */}
      <div className="bg-background border-border border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <ServiceIcon serviceId={service.id} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-md font-semibold">{service.display_name}</h1>
            <p className="text-muted-foreground text-xs">{service.description}</p>
          </div>
        </div>
      </div>

      {/* Service Info Card */}
      <ServiceInfoCard service={service} />

      <ScrollArea className="h-0 flex-1">
        <div className="flex-1 space-y-4">
          {isCaddy && state?.exists && (
            <div className="p-4">
              <Card size="sm" className="mx-auto w-full">
                <CardContent>
                  <div className="space-y-4">
                    <Item variant="default" size="sm">
                      <ItemMedia>
                        <ShieldCheck className="text-primary size-5" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>SSL Certificate</ItemTitle>
                        <p className="text-muted-foreground text-xs">
                          Caddy automatically manages SSL certificates for your projects
                        </p>
                      </ItemContent>
                      <ItemActions>
                        <Badge variant={certInstalled ? 'default' : 'secondary'}>
                          {certInstalled ? 'Installed' : 'Not Installed'}
                        </Badge>
                      </ItemActions>
                    </Item>

                    <Separator />

                    <div className="bg-primary/5 space-y-1 p-3 text-xs">
                      <p className="text-muted-foreground">
                        If you experience any connection issues with HTTPS, you can manually
                        download and install the root certificate to your system&apos;s trusted
                        store using the button below.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Connection Information */}
          {!isCaddy && state?.exists && service.default_config.ports.length > 0 && (
            <div className="p-4">
              <ConnectionInfo service={service} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 p-4">
        {showUIButton && (
          <Button variant="ghost" onClick={handleOpenUI} size="lg" className="border-border w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Web UI
          </Button>
        )}
        {isCaddy && state?.exists && (
          <Button
            variant="ghost"
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="border-border w-full"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Downloading...' : 'Download Certificate'}
          </Button>
        )}
        <ServiceActions service={service} />
      </div>
    </div>
  );
}

function ServiceDetailPage() {
  const { serviceId } = Route.useParams();

  // Use suspense query - data is guaranteed by loader
  const { data: service } = useSuspenseQuery(serviceQueryOptions(serviceId as ServiceId));

  // Render service details
  return <ServiceDetails service={service} />;
}

function ServiceDetailErrorComponent({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <p className="text-destructive text-sm font-medium">Failed to load service</p>
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
