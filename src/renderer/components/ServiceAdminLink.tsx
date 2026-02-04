/**
 * ServiceAdminLink - Admin URL button for services with web UIs
 *
 * Displays a button to open admin interfaces like phpMyAdmin, Adminer, Mailpit, etc.
 * Only renders for services that have admin URLs and only when the service is running.
 */

import { IconAlertTriangle, IconExternalLink, IconLoader2 } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@renderer/components/ui/button';
import { bundledServiceContainerStateQueryOptions } from '@renderer/services';
import { getServiceAdminUrl, hasAdminUrl } from '@renderer/utils/credentials';
import { ServiceId } from '@shared/types/service';

interface ServiceAdminLinkProps {
  /** The service to display admin link for */
  serviceId: ServiceId;
  /** Project ID (bundled services only) */
  projectId: string;
  /** Project domain for URL generation */
  projectDomain: string;
}

export function ServiceAdminLink({
  serviceId,
  projectId,
  projectDomain,
}: Readonly<ServiceAdminLinkProps>) {
  // Fetch container state
  const { data: containerState, isLoading } = useQuery(
    bundledServiceContainerStateQueryOptions(projectId, serviceId)
  );

  // Check if this service has an admin URL
  const serviceHasAdminUrl = hasAdminUrl(serviceId);

  // Early return if service doesn't have admin URL
  if (!serviceHasAdminUrl) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <IconLoader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Service must be running
  if (!containerState?.exists || !containerState?.running) {
    return (
      <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
        <IconAlertTriangle className="text-muted-foreground h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-xs">Service must be running to access admin UI.</p>
      </div>
    );
  }

  const adminUrl = getServiceAdminUrl(serviceId, projectDomain);

  if (!adminUrl) {
    return null;
  }

  const handleOpenUrl = async () => {
    try {
      await window.electronWindow.openExternal(adminUrl);
      toast.success('Opening in browser...');
    } catch {
      toast.error('Failed to open URL');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-full justify-start gap-2 px-0"
      onClick={handleOpenUrl}
    >
      <IconExternalLink className="h-4 w-4" />
      <span className="text-xs">Open Web UI</span>
      <span className="text-muted-foreground ml-auto max-w-45 truncate text-xs">{adminUrl}</span>
    </Button>
  );
}
