import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useService, serviceQueryOptions } from '@/api/services/services-queries';
import { ServiceId, ServiceInfo } from '@/types/service';
import { HealthBadge } from '@/components/HealthBadge';
import { useDocumentVisibility } from '@/hooks/use-document-visibility';
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
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  return (
    service.state.custom_config?.environment_vars ||
    service.definition.default_config.environment_vars
  );
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
  const [dockerOpen, setDockerOpen] = useState(true);
  const [hostOpen, setHostOpen] = useState(false);

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
    <div className="space-y-3">
      {/* Docker Network Section */}
      <Collapsible open={dockerOpen} onOpenChange={setDockerOpen}>
        <div className="border-border bg-card overflow-hidden rounded-md border">
          <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center justify-between px-4 py-3 transition-colors">
            <div className="flex items-center gap-2">
              <Network className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">Docker Network</span>
              <span className="text-muted-foreground text-xs">(Container to Container)</span>
            </div>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform ${dockerOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-border space-y-3 border-t px-4 py-3">
              <div>
                <p className="text-muted-foreground mb-2 text-xs">Connection string:</p>
                <div className="bg-background border-border flex items-center justify-between overflow-hidden rounded-md border">
                  <code className="text-foreground flex-1 truncate p-2 font-mono text-sm outline-none select-text">
                    {dockerConnection}
                  </code>
                  <div className="px-2">
                    <CopyButton text={dockerConnection} label="Connection string" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2 text-xs">Environment configuration:</p>
                <div className="bg-background border-border relative overflow-hidden rounded-md border">
                  <div className="absolute top-3 right-3 z-10">
                    <CopyButton text={dockerEnvConfig} label=".env configuration" />
                  </div>
                  <pre className="text-foreground flex-1 p-2 pr-12 font-mono text-sm leading-relaxed whitespace-pre-wrap outline-none select-text">
                    {dockerEnvConfig}
                  </pre>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Host Machine Section */}
      <Collapsible open={hostOpen} onOpenChange={setHostOpen}>
        <div className="border-border bg-card overflow-hidden rounded-md border">
          <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center justify-between px-4 py-3 transition-colors">
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">Host Machine</span>
              <span className="text-muted-foreground text-xs">(Local Development)</span>
            </div>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform ${hostOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-border space-y-3 border-t px-4 py-3">
              <div>
                <p className="text-muted-foreground mb-2 text-xs">Connection string:</p>
                <div className="bg-background border-border flex items-center justify-between overflow-hidden rounded-md border">
                  <code className="text-foreground flex-1 truncate p-2 font-mono text-sm outline-none select-text">
                    {hostConnection}
                  </code>
                  <div className="px-2">
                    <CopyButton text={hostConnection} label="Connection string" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2 text-xs">Environment configuration:</p>
                <div className="bg-background border-border relative overflow-hidden rounded-md border">
                  <div className="absolute top-3 right-3 z-10">
                    <CopyButton text={hostEnvConfig} label=".env configuration" />
                  </div>
                  <pre className="text-foreground flex-1 p-2 pr-12 font-mono text-sm leading-relaxed whitespace-pre-wrap outline-none select-text">
                    {hostEnvConfig}
                  </pre>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

// Service Info Card Component
function ServiceInfoCard({ service }: { readonly service: ServiceInfo }) {
  const port = getServicePort(service, 0);
  const isRunning = service.state.container_status?.running;
  const healthStatus = service.state.container_status?.health_status;

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
            <span className="text-foreground text-sm font-medium">{getStatusText(service)}</span>
          </div>

          {/* Port Info */}
          {service.state.installed && service.definition.default_config.ports.length > 0 && (
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

  const isCaddy = service.definition.id === ServiceId.Caddy;
  const certInstalled =
    (service.state.custom_config?.metadata?.certInstalled as boolean | undefined) ?? false;
  const showUIButton =
    hasServiceUI(service.definition.id) && service.state.container_status?.running;

  return (
    <div className="flex h-full flex-col">
      {/* Service Header */}
      <div className="bg-background border-border border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <ServiceIcon serviceId={service.definition.id} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-md font-semibold">
              {service.definition.display_name}
            </h1>
            <p className="text-muted-foreground text-xs">{service.definition.description}</p>
          </div>
        </div>
      </div>

      {/* Service Info Card */}
      <ServiceInfoCard service={service} />

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
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

              <div className="bg-primary/5 space-y-2 rounded-lg p-4">
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
                <ConnectionInfo service={service} />
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 p-4">
        {showUIButton && (
          <Button variant="ghost" onClick={handleOpenUI} size="sm" className="w-full border">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Web UI
          </Button>
        )}
        {isCaddy && service.state.installed && (
          <Button
            variant="secondary"
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="w-full"
            size="sm"
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
  const isVisible = useDocumentVisibility();
  
  // Use polling to keep health status updated (only when tab is visible)
  const { data: service } = useService(serviceId as ServiceId, {
    refetchInterval: isVisible ? 3000 : false, // Poll every 3 seconds when visible
  });

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
