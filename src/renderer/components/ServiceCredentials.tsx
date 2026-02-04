/**
 * ServiceCredentials - Self-contained credential display component
 *
 * Fetches its own data via TanStack Query and displays credentials
 * for any service that has them.
 */

import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconLoader2,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@renderer/components/ui/button';
import { Card, CardContent } from '@renderer/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip';
import {
  bundledServiceContainerStateQueryOptions,
  serviceContainerStateQueryOptions,
} from '@renderer/services';
import { parseEnvVars } from '@renderer/utils/container';
import { extractServiceCredentials, hasCredentials } from '@renderer/utils/credentials';
import { ServiceId } from '@shared/types/service';

interface ServiceCredentialsProps {
  /** The service to display credentials for */
  serviceId: ServiceId;
  /** Project ID if this is a bundled service */
  projectId?: string;
  /** Project name for host generation (bundled services only) */
  projectName?: string;
}

/** Copy button for credential values */
function CopyButton({ text, label }: Readonly<{ text: string; label: string }>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
      {copied ? (
        <IconCheck className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <IconCopy className="text-muted-foreground h-3.5 w-3.5" />
      )}
    </Button>
  );
}

/** Single credential row */
function CredentialRow({
  label,
  value,
  copyLabel,
}: Readonly<{
  label: string;
  value: string;
  copyLabel: string;
}>) {
  return (
    <div className="border-border/50 flex items-center justify-between border-b py-2 last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</span>
        <code className="text-foreground font-mono text-xs">{value}</code>
      </div>
      <CopyButton text={value} label={copyLabel} />
    </div>
  );
}

export function ServiceCredentials({
  serviceId,
  projectId,
  projectName,
}: Readonly<ServiceCredentialsProps>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBundled = !!projectId;

  // Fetch container state for bundled services (with projectId)
  const { data: bundledState, isLoading: isBundledLoading } = useQuery({
    ...bundledServiceContainerStateQueryOptions(projectId ?? '', serviceId),
    enabled: isBundled,
  });

  // Fetch container state for standalone services
  const { data: standaloneState, isLoading: isStandaloneLoading } = useQuery({
    ...serviceContainerStateQueryOptions(serviceId),
    enabled: !isBundled,
  });

  // Use the appropriate state based on context
  const containerState = isBundled ? bundledState : standaloneState;
  const isLoading = isBundled ? isBundledLoading : isStandaloneLoading;

  // Check if this service has credentials to display
  const serviceHasCredentials = hasCredentials(serviceId);

  // Early return if service doesn't have credentials
  if (!serviceHasCredentials) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <IconLoader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Service must be running to view credentials
  if (!containerState?.exists || !containerState?.running) {
    return (
      <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
        <IconAlertTriangle className="text-muted-foreground h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-xs">
          Service must be running to view credentials.
        </p>
      </div>
    );
  }

  // Extract credentials from container environment
  const envVars = parseEnvVars(containerState.environment_vars);
  const credentials = extractServiceCredentials(serviceId, envVars, {
    projectName: projectName,
  });

  // No credentials available
  if (credentials.length === 0) {
    return null;
  }

  return (
    <Card size="sm" className="w-full">
      <CardContent>
        <div className="space-y-3">
          {/* Credentials Section */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between gap-2 text-left transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-2">
              <IconShieldCheck className="text-primary h-4 w-4" />
              <h3 className="text-foreground text-sm font-semibold">Authentication Credentials</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconAlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">
                    ⚠️ Local Development Only - These credentials are not secure for production use
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {isExpanded ? (
              <IconChevronDown className="text-muted-foreground h-4 w-4" />
            ) : (
              <IconChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <div className="space-y-0">
              {credentials.map(cred => (
                <CredentialRow
                  key={`${cred.label}-${cred.value}`}
                  label={cred.label}
                  value={cred.value}
                  copyLabel={cred.copyLabel}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
