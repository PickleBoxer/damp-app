import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useSuspenseService, serviceQueryOptions } from '@/api/services/services-queries';
import { ServiceId, ServiceInfo } from '@/types/service';
import { HealthBadge } from '@/components/HealthBadge';
import ServiceActions from '@/components/ServiceActions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServiceIcon } from '@/components/ServiceIcon';
import {
  downloadCaddyCertificate,
  hasServiceUI,
  getServiceUIUrl,
} from '@/helpers/services_helpers';
import {
  Download,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Network,
  MonitorSmartphone,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { openUrl } from '@/helpers/shell_helpers';

// Helper function to get status badge styles
function getStatusBadgeStyles(service: ServiceInfo): string {
  if (service.state.container_status?.running) {
    return 'bg-primary text-primary-foreground';
  }

  if (service.state.installed) {
    return 'bg-secondary text-secondary-foreground';
  }

  return 'border-input bg-background border';
}

// Helper function to get status text
function getStatusText(service: ServiceInfo): string {
  if (service.state.container_status?.running) {
    return 'Running';
  }

  if (service.state.installed) {
    return 'Stopped';
  }

  return 'Not Installed';
}

// Helper function to get the actual external port for a service
function getServicePort(service: ServiceInfo, portIndex: number = 0): string {
  // Try to get the actual mapped port from state config
  const actualPort = service.state.custom_config?.ports?.[portIndex]?.[0];
  // Fallback to default port from definition
  const defaultPort = service.definition.default_config.ports?.[portIndex]?.[0];

  return actualPort || defaultPort || 'N/A';
}

// Copy to clipboard component
function CopyButton({ text, label }: { text: string; label: string }) {
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
  return (
    service.state.custom_config?.environment_vars ||
    service.definition.default_config.environment_vars
  );
}

// Helper function to parse env vars into an object
function parseEnvVars(envVars: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  envVars.forEach(envVar => {
    const [key, ...valueParts] = envVar.split('=');
    parsed[key] = valueParts.join('=');
  });
  return parsed;
}

// Helper function to format environment variables as Laravel .env format
function formatAsLaravelEnv(service: ServiceInfo, host: string, port: string): string {
  const envVars = parseEnvVars(getEnvironmentVars(service));

  switch (service.definition.id) {
    case ServiceId.MySQL:
    case ServiceId.MariaDB: {
      const dbType = service.definition.id === ServiceId.MySQL ? 'mysql' : 'mariadb';
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
  const containerName = `damp-${service.definition.id}`;
  const port = getServicePort(service, 0);
  const internalPort = service.definition.default_config.ports?.[0]?.[1] || port;

  // Docker network connection
  const dockerConnection = `${containerName}:${internalPort}`;

  // Host connection
  const hostConnection = `localhost:${port}`;

  // Format as Laravel .env configuration
  const dockerEnvConfig = formatAsLaravelEnv(service, containerName, internalPort);
  const hostEnvConfig = formatAsLaravelEnv(service, 'localhost', port);

  return (
    <Tabs defaultValue="docker" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="docker" className="gap-2">
          <Network className="h-4 w-4" />
          Docker Network
        </TabsTrigger>
        <TabsTrigger value="host" className="gap-2">
          <MonitorSmartphone className="h-4 w-4" />
          Host Machine
        </TabsTrigger>
      </TabsList>

      <TabsContent value="docker" className="mt-4 space-y-4">
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground mb-2 text-xs">
              Connection string for Docker containers:
            </p>
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <code className="font-mono text-sm select-text">{dockerConnection}</code>
              <CopyButton text={dockerConnection} label="Connection string" />
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs">Add to your .env file:</p>
            <div className="bg-muted/50 relative rounded-lg p-3">
              <div className="absolute top-3 right-3">
                <CopyButton text={dockerEnvConfig} label=".env configuration" />
              </div>
              <pre className="pr-10 font-mono text-xs whitespace-pre-wrap select-text">
                {dockerEnvConfig}
              </pre>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="host" className="mt-4 space-y-4">
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground mb-2 text-xs">
              Connection string from host machine:
            </p>
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <code className="font-mono text-sm select-text">{hostConnection}</code>
              <CopyButton text={hostConnection} label="Connection string" />
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs">Add to your .env file:</p>
            <div className="bg-muted/50 relative rounded-lg p-3">
              <div className="absolute top-3 right-3">
                <CopyButton text={hostEnvConfig} label=".env configuration" />
              </div>
              <pre className="pr-10 font-mono text-xs whitespace-pre-wrap select-text">
                {hostEnvConfig}
              </pre>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// Service details component
function ServiceDetails({ service }: { readonly service: ServiceInfo }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    try {
      const result = await downloadCaddyCertificate();
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

    const result = await openUrl(uiUrl);
    if (result.success) {
      toast.success('Opening service UI in browser');
    } else {
      toast.error('Failed to open UI', {
        description: result.error || 'An unknown error occurred',
      });
    }
  };

  const isCaddy = service.definition.id === ServiceId.Caddy;
  const certInstalled =
    (service.state.custom_config?.metadata?.certInstalled as boolean | undefined) ?? false;
  const showUIButton =
    hasServiceUI(service.definition.id) && service.state.container_status?.running;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Service Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ServiceIcon serviceId={service.definition.id} className="h-12 w-12" />
              <div>
                <h2 className="text-2xl font-bold">{service.definition.display_name}</h2>
                <p className="text-muted-foreground text-sm">{service.definition.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {service.state.container_status?.health_status && (
                <HealthBadge status={service.state.container_status.health_status} />
              )}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeStyles(service)}`}
              >
                {getStatusText(service)}
              </span>
            </div>
          </div>

          {isCaddy && service.state.installed && (
            <>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {certInstalled ? (
                    <>
                      <ShieldCheck className="text-primary h-4 w-4" />
                      <span className="text-sm font-medium">SSL Certificate</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground text-sm font-medium">
                        SSL Certificate
                      </span>
                    </>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    certInstalled
                      ? 'bg-primary text-primary-foreground'
                      : 'border-input bg-background border'
                  }`}
                >
                  {certInstalled ? 'Installed' : 'Not Installed'}
                </span>
              </div>

              <div className="bg-muted/50 space-y-2 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  Caddy automatically manages SSL certificates for your projects. If you experience
                  any connection issues with HTTPS, you can manually download and install the root
                  certificate to your system's trusted store.
                </p>
              </div>
            </>
          )}

          {/* Connection Information */}
          {!isCaddy &&
            service.state.installed &&
            service.definition.default_config.ports.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Connection</h3>
                <ConnectionInfo service={service} />
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 p-4">
        {showUIButton && (
          <Button variant="default" onClick={handleOpenUI} size="sm" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Web UI
          </Button>
        )}
        {isCaddy && service.state.installed && (
          <Button
            variant="secondary"
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            size="sm"
            className="w-full"
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
  const { data: service } = useSuspenseService(serviceId as ServiceId);

  if (!service) {
    return null;
  }

  // Render service details
  return <ServiceDetails service={service} />;
}

export const Route = createFileRoute('/services/$serviceId')({
  loader: ({ context, params }) => {
    // Prefetch service data in the loader
    context.queryClient.ensureQueryData(serviceQueryOptions(params.serviceId as ServiceId));
  },
  component: ServiceDetailPage,
});
