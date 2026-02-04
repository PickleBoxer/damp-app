import { DatabaseOperations } from '@renderer/components/DatabaseOperations';
import { cn } from '@renderer/components/lib/utils';
import { ProjectIcon } from '@renderer/components/ProjectIcon';
import { ProjectLogs, type ProjectLogsRef } from '@renderer/components/ProjectLogs';
import { ProjectPreview } from '@renderer/components/ProjectPreview';
import { ServiceAdminLink } from '@renderer/components/ServiceAdminLink';
import { ServiceCredentials } from '@renderer/components/ServiceCredentials';
import { ServiceIcon } from '@renderer/components/ServiceIcon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@renderer/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@renderer/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { Label } from '@renderer/components/ui/label';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip';
import { dockerStatusQueryOptions } from '@renderer/docker';
import { useNgrokStatus, useStartNgrokTunnel, useStopNgrokTunnel } from '@renderer/hooks/use-ngrok';
import { useDeleteProject } from '@renderer/hooks/use-projects';
import { useSettings } from '@renderer/hooks/use-settings';
import {
  useCancelSync,
  useProjectSyncStatus,
  useSyncFromVolume,
  useSyncToVolume,
} from '@renderer/hooks/use-sync';
import { projectContainerStateQueryOptions, projectQueryOptions } from '@renderer/projects';
import { servicesQueryOptions } from '@renderer/services';
import { getSettings } from '@renderer/utils/settings';
import { PREINSTALLED_PHP_EXTENSIONS } from '@shared/constants/php-extensions';
import { ServiceId } from '@shared/types/service';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDatabase,
  IconDotsVertical,
  IconDownload,
  IconExternalLink,
  IconFolderCode,
  IconFolderOpen,
  IconLoader2,
  IconPlayerPlay,
  IconSparkles,
  IconSquare,
  IconTerminal,
  IconTrash,
  IconUpload,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { useQuery, useQueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  ErrorComponent,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { SiClaude, SiNodedotjs, SiPhp } from 'react-icons/si';
import { VscTerminal, VscVscode } from 'react-icons/vsc';
import { toast } from 'sonner';

export const Route = createFileRoute('/projects/$projectId')({
  loader: ({ context: { queryClient }, params: { projectId } }) =>
    queryClient.ensureQueryData(projectQueryOptions(projectId)),
  errorComponent: ProjectDetailErrorComponent,
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();

  // Use suspense query - data is guaranteed by loader
  const { data: project } = useSuspenseQuery(projectQueryOptions(projectId));

  // Fetch all service definitions using TanStack Query (non-blocking, cached)
  const { data: allServices } = useSuspenseQuery(servicesQueryOptions());
  const serviceDefinitions = new Map(allServices.map(s => [s.id, s]));

  const deleteProjectMutation = useDeleteProject();
  const syncFromVolumeMutation = useSyncFromVolume();
  const syncToVolumeMutation = useSyncToVolume();
  const cancelSyncMutation = useCancelSync();
  const startNgrokMutation = useStartNgrokTunnel();
  const stopNgrokMutation = useStopNgrokTunnel();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [removeFolder, setRemoveFolder] = useState(false);
  const [removeVolume, setRemoveVolume] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [includeNodeModules, setIncludeNodeModules] = useState(false);
  const [includeVendor, setIncludeVendor] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<ServiceId>>(new Set());
  const projectLogsRef = useRef<ProjectLogsRef>(null);

  // Close console and clear logs when navigating to a different project
  useEffect(() => {
    projectLogsRef.current?.clear();
  }, [projectId]);

  // Load settings for ngrok token check
  const { hasNgrokToken } = useSettings();

  // Check Docker status
  const { data: dockerStatus } = useQuery(dockerStatusQueryOptions());

  // Get sync status for this project
  const { data: syncStatus } = useProjectSyncStatus(projectId);

  // Get ngrok tunnel status
  const { data: ngrokStatusData } = useNgrokStatus(projectId);

  // Use per-project container state - real-time updates via Docker events
  const { data: projectState } = useQuery(projectContainerStateQueryOptions(projectId));

  // Derived state
  const isDockerRunning = dockerStatus?.isRunning ?? false;
  const ngrokStatus = ngrokStatusData?.status || 'stopped';
  const ngrokPublicUrl = ngrokStatusData?.publicUrl;
  const containerState = projectState;
  const isRunning = containerState?.running || false;
  const isHealthy =
    containerState?.health_status === 'healthy' || containerState?.health_status === 'none';
  const isReady = isRunning && isHealthy;

  // Show toast notification when ngrok error occurs
  useEffect(() => {
    if (ngrokStatus === 'error' && ngrokStatusData?.error) {
      toast.error('Tunnel Error', {
        description: ngrokStatusData.error,
        id: `ngrok-error-${projectId}`,
      });
    }
  }, [ngrokStatus, ngrokStatusData?.error, projectId]);

  const handleOpenVSCode = async () => {
    const settings = await getSettings();
    const result = await window.shell.openEditor(project.id, {
      defaultEditor: settings.defaultEditor,
      defaultTerminal: settings.defaultTerminal,
    });
    if (result.success) {
      toast.success('Opening in VS Code...');
    } else {
      toast.error(result.error || 'Failed to open VS Code');
    }
  };

  const handleOpenBrowser = async () => {
    const url = project.domain.startsWith('http') ? project.domain : `http://${project.domain}`;
    try {
      const result = await window.electronWindow.openExternal(url);
      if (result.success) {
        toast.success('Opening in browser...');
      } else {
        toast.error('Failed to open browser', {
          description: result.error || 'An unknown error occurred',
        });
      }
    } catch (error) {
      toast.error('Failed to open browser', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Get database admin tool info (phpMyAdmin or Adminer) if bundled
  const getDatabaseAdminTool = () => {
    const bundledServices = project.bundledServices ?? [];
    const phpMyAdmin = bundledServices.find(s => s.serviceId === ServiceId.PhpMyAdmin);
    if (phpMyAdmin) {
      return { name: 'phpMyAdmin', subdomain: 'phpmyadmin' };
    }
    const adminer = bundledServices.find(s => s.serviceId === ServiceId.Adminer);
    if (adminer) {
      return { name: 'Adminer', subdomain: 'adminer' };
    }
    return null;
  };

  // Helper to get service display name
  const getServiceDisplayName = (serviceId: ServiceId): string => {
    const names: Record<ServiceId, string> = {
      [ServiceId.MariaDB]: 'MariaDB',
      [ServiceId.MySQL]: 'MySQL',
      [ServiceId.PostgreSQL]: 'PostgreSQL',
      [ServiceId.MongoDB]: 'MongoDB',
      [ServiceId.Redis]: 'Redis',
      [ServiceId.PhpMyAdmin]: 'phpMyAdmin',
      [ServiceId.Adminer]: 'Adminer',
      [ServiceId.Mailpit]: 'Mailpit',
      [ServiceId.Caddy]: 'Caddy',
      [ServiceId.Meilisearch]: 'Meilisearch',
      [ServiceId.MinIO]: 'MinIO',
      [ServiceId.Memcached]: 'Memcached',
      [ServiceId.RabbitMQ]: 'RabbitMQ',
      [ServiceId.Typesense]: 'Typesense',
      [ServiceId.Valkey]: 'Valkey',
      [ServiceId.RustFS]: 'RustFS',
    };
    return names[serviceId] || serviceId;
  };

  // Toggle expanded state for a service
  const toggleServiceExpanded = (serviceId: ServiceId) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const databaseAdminTool = getDatabaseAdminTool();

  const handleOpenDatabaseAdmin = async () => {
    if (!databaseAdminTool) return;
    const baseDomain = project.domain.replace(/^https?:\/\//, '');
    const url = `http://${databaseAdminTool.subdomain}.${baseDomain}`;
    try {
      const result = await window.electronWindow.openExternal(url);
      if (result.success) {
        toast.success(`Opening ${databaseAdminTool.name}...`);
      } else {
        toast.error(`Failed to open ${databaseAdminTool.name}`, {
          description: result.error || 'An unknown error occurred',
        });
      }
    } catch (error) {
      toast.error(`Failed to open ${databaseAdminTool.name}`, {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const handleOpenFolder = async () => {
    const result = await window.shell.openFolder(project.id);
    if (result.success) {
      toast.success('Opening folder...');
    } else {
      toast.error(result.error || 'Failed to open folder');
    }
  };

  const handleOpenTerminal = async () => {
    const settings = await getSettings();
    const result = await window.shell.openTerminal(project.id, {
      defaultEditor: settings.defaultEditor,
      defaultTerminal: settings.defaultTerminal,
    });
    if (result.success) {
      toast.success('Opening terminal...');
    } else {
      toast.error(result.error || 'Failed to open terminal');
    }
  };

  const handleOpenTinker = async () => {
    const settings = await getSettings();
    const result = await window.shell.openTinker(project.id, {
      defaultEditor: settings.defaultEditor,
      defaultTerminal: settings.defaultTerminal,
    });
    if (result.success) {
      toast.success('Opening Tinker...');
    } else {
      toast.error(result.error || 'Failed to open Tinker');
    }
  };

  const handleDelete = () => {
    deleteProjectMutation.mutate(
      {
        projectId: project.id,
        removeVolume,
        removeFolder,
      },
      {
        onSuccess: () => {
          // Navigate to projects list after successful deletion
          navigate({ to: '/projects' });
        },
      }
    );
    setShowDeleteDialog(false);
    setRemoveFolder(false);
    setRemoveVolume(false);
  };

  const handleSyncFromVolume = () => {
    syncFromVolumeMutation.mutate({
      projectId: project.id,
      options: {
        includeNodeModules,
        includeVendor,
      },
    });
  };

  const handleSyncToVolume = () => {
    syncToVolumeMutation.mutate({
      projectId: project.id,
      options: {
        includeNodeModules,
        includeVendor,
      },
    });
  };

  const handleStartNgrok = async () => {
    const settings = await getSettings();
    if (!settings.ngrokAuthToken) {
      toast.error('Please configure ngrok auth token in Settings first');
      return;
    }
    startNgrokMutation.mutate({
      projectId: project.id,
      authToken: settings.ngrokAuthToken,
      region: settings.ngrokRegion,
    });
  };

  const handleStopNgrok = () => {
    stopNgrokMutation.mutate(project.id);
  };

  const handleCopyUrl = async () => {
    if (ngrokPublicUrl) {
      try {
        await navigator.clipboard.writeText(ngrokPublicUrl);
        toast.success('URL copied to clipboard!');
      } catch {
        toast.error('Failed to copy URL');
      }
    }
  };

  const handleOpenPublicUrl = async () => {
    if (ngrokPublicUrl) {
      try {
        const result = await window.electronWindow.openExternal(ngrokPublicUrl);
        if (result.success) {
          toast.success('Opening in browser...');
        } else {
          toast.error('Failed to open URL', {
            description: result.error || 'An unknown error occurred',
          });
        }
      } catch (error) {
        toast.error('Failed to open URL', {
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
    }
  };

  // Suspense handles loading state, project is guaranteed to exist
  return (
    <div className="flex h-full flex-col">
      <ScrollArea
        className={`${consoleExpanded ? 'h-1/2' : 'flex-1'} min-h-1/2 transition-all [&_[data-radix-scroll-area-viewport]>:first-child]:h-full`}
      >
        <div className="flex h-full flex-1 flex-col space-y-4 p-2">
          {/* Safari Preview with Hover Expansion */}
          <ProjectPreview project={project} isRunning={isRunning} isReady={isReady} />
          {/* Compact Project Header */}
          <div className="z-10 -mt-7 mb-0 flex items-baseline justify-between px-2">
            <div className="bg-background z-10 flex items-center p-2">
              <ProjectIcon projectType={project.type} className="h-11 w-11" />
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="hover:bg-accent [&:hover>svg]:text-foreground h-8.5 w-8.5 shrink-0 transition-colors [&>svg]:transition-colors"
                    onClick={handleOpenBrowser}
                  >
                    <IconWorld className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open site in browser</TooltipContent>
              </Tooltip>
              {databaseAdminTool && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="hover:bg-accent [&:hover>svg]:text-foreground h-8.5 w-8.5 shrink-0 transition-colors [&>svg]:transition-colors"
                      onClick={handleOpenDatabaseAdmin}
                    >
                      <IconDatabase className="text-muted-foreground h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open {databaseAdminTool.name}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="hover:bg-accent [&:hover>svg]:text-foreground h-8.5 w-8.5 shrink-0 transition-colors [&>svg]:transition-colors"
                    onClick={handleOpenFolder}
                  >
                    <IconFolderOpen className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open site folder</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="hover:bg-accent [&:hover>svg]:text-foreground relative h-8.5 w-8.5 shrink-0 transition-colors [&>svg]:transition-colors"
                    aria-label="More actions"
                  >
                    {syncStatus ? (
                      <IconLoader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    ) : (
                      <IconDotsVertical className="text-muted-foreground h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Volume Sync Sub-menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <IconFolderCode className="mr-2 h-4 w-4" />
                      <span>Volume Sync</span>
                      {syncStatus && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          {syncStatus.percentage ?? 0}%
                        </span>
                      )}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52">
                      <DropdownMenuLabel>Options</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={includeNodeModules}
                        onCheckedChange={setIncludeNodeModules}
                        onSelect={e => e.preventDefault()}
                      >
                        <span className="font-mono text-xs">node_modules</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={includeVendor}
                        onCheckedChange={setIncludeVendor}
                        onSelect={e => e.preventDefault()}
                      >
                        <span className="font-mono text-xs">vendor</span>
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {syncStatus ? (
                        <DropdownMenuItem
                          onClick={() => cancelSyncMutation.mutate(projectId)}
                          disabled={cancelSyncMutation.isPending}
                        >
                          <IconX className="mr-2 h-4 w-4" />
                          Cancel Sync
                          <span className="text-muted-foreground ml-auto text-xs">
                            {syncStatus.percentage ?? 0}%
                          </span>
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={handleSyncFromVolume}
                            disabled={!isDockerRunning || !!syncStatus}
                          >
                            <IconDownload className="mr-2 h-4 w-4" />
                            Sync From Volume
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleSyncToVolume}
                            disabled={!isDockerRunning || !!syncStatus}
                          >
                            <IconUpload className="mr-2 h-4 w-4" />
                            Sync To Volume
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Share Online Sub-menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <IconWorld className="mr-2 h-4 w-4" />
                      <span>Share Online</span>
                      {ngrokStatus === 'active' && (
                        <span className="ml-auto text-xs text-green-500">Online</span>
                      )}
                      {ngrokStatus === 'error' && (
                        <span className="text-destructive ml-auto text-xs">Error</span>
                      )}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {ngrokStatus === 'active' && ngrokPublicUrl && (
                        <>
                          <DropdownMenuItem disabled className="font-mono text-xs opacity-100">
                            {ngrokPublicUrl.length > 35
                              ? `${ngrokPublicUrl.substring(0, 35)}...`
                              : ngrokPublicUrl}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleCopyUrl}>
                            <IconCopy className="mr-2 h-4 w-4" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleOpenPublicUrl}>
                            <IconExternalLink className="mr-2 h-4 w-4" />
                            Open in Browser
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleStopNgrok}
                            disabled={stopNgrokMutation.isPending}
                          >
                            {stopNgrokMutation.isPending ? (
                              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <IconSquare className="mr-2 h-4 w-4" />
                            )}
                            Stop Sharing
                          </DropdownMenuItem>
                        </>
                      )}
                      {ngrokStatus === 'error' && ngrokStatusData?.error && (
                        <>
                          <DropdownMenuItem disabled className="text-destructive">
                            <IconAlertTriangle className="mr-2 h-4 w-4" />
                            {ngrokStatusData.error.length > 30
                              ? `${ngrokStatusData.error.substring(0, 30)}...`
                              : ngrokStatusData.error}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleStartNgrok}
                            disabled={
                              !isDockerRunning ||
                              !isRunning ||
                              startNgrokMutation.isPending ||
                              !hasNgrokToken
                            }
                          >
                            <IconPlayerPlay className="mr-2 h-4 w-4" />
                            Retry
                          </DropdownMenuItem>
                        </>
                      )}
                      {(ngrokStatus === 'stopped' || ngrokStatus === 'starting') && (
                        <DropdownMenuItem
                          onClick={handleStartNgrok}
                          disabled={
                            !isDockerRunning ||
                            !isRunning ||
                            ngrokStatus === 'starting' ||
                            startNgrokMutation.isPending ||
                            !hasNgrokToken
                          }
                        >
                          {startNgrokMutation.isPending || ngrokStatus === 'starting' ? (
                            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <IconPlayerPlay className="mr-2 h-4 w-4" />
                          )}
                          Start Sharing
                        </DropdownMenuItem>
                      )}
                      {!hasNgrokToken && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                            Configure ngrok token in Settings
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isRunning && hasNgrokToken && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                            Start project to enable sharing
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  {/* Delete Project */}
                  <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                    <IconTrash className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-start justify-between px-2">
            <div className="flex-1">
              <h2 className="text-2xl font-bold capitalize">{project.name}</h2>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-2">
            {/* Tabs for Actions/Environment/Volume Sync */}
            <Tabs defaultValue="actions" className="flex w-full flex-col gap-4 px-2">
              <TabsList className="bg-muted text-muted-foreground inline-flex h-8 w-full items-center justify-center rounded-lg p-0.75">
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="environment">Environment</TabsTrigger>
                {project.bundledServices && project.bundledServices.length > 0 && (
                  <TabsTrigger value="services">Services</TabsTrigger>
                )}
              </TabsList>

              {/* Actions Tab */}
              <TabsContent value="actions" className="flex flex-col gap-4">
                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-8.5 gap-1.5"
                      onClick={handleOpenTerminal}
                    >
                      <IconTerminal className="mr-2 h-4 w-4" />
                      Open Terminal
                    </Button>
                    <Button variant="outline" className="h-8.5 gap-1.5" onClick={handleOpenTinker}>
                      <IconSparkles className="mr-2 h-4 w-4" />
                      Open Tinker
                    </Button>
                  </div>
                  <Button
                    className="h-8.5 gap-1.5 bg-[#007ACC] text-white hover:bg-[#005A9E]"
                    onClick={handleOpenVSCode}
                  >
                    <VscVscode className="mr-2 h-4 w-4" />
                    Open in VS Code
                  </Button>
                </div>
              </TabsContent>

              {/* Environment Tab */}
              <TabsContent value="environment" className="flex flex-col gap-4">
                {/* Runtime Versions - Always Visible */}
                <div className="space-y-3">
                  {/* PHP Version */}
                  <div className="flex items-center justify-between border p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 dark:bg-indigo-950/30">
                        <SiPhp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">PHP Version</p>
                        <p className="text-muted-foreground text-xs">Runtime environment</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {project.phpVersion}
                    </Badge>
                  </div>

                  {/* Node Version */}
                  <div className="flex items-center justify-between border p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 dark:bg-green-950/30">
                        <SiNodedotjs className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">Node Version</p>
                        <p className="text-muted-foreground text-xs">Runtime environment</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {project.nodeVersion || 'lts'}
                    </Badge>
                  </div>

                  {/* Claude Code CLI Status */}
                  <div className="flex items-center justify-between border p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 dark:bg-orange-950/30">
                        <SiClaude className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">Claude Code</p>
                        <p className="text-muted-foreground text-xs">
                          Deep coding at terminal velocity
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {project.enableClaudeAi ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                {/* Configuration and PHP Extensions */}
                <Accordion key={project.id} type="single" collapsible>
                  {/* Configuration Section */}
                  <AccordionItem value="configuration">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="text-sm font-medium">Configuration</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 p-4">
                      <div className="space-y-2 pt-2 text-sm">
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Domain</span>
                          <span className="font-mono">{project.domain}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Project Path</span>
                          <span className="font-mono break-all">{project.path}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Volume Name</span>
                          <span className="font-mono">{project.volumeName}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Network</span>
                          <span className="font-mono">{project.networkName}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Container Port</span>
                          <span>{project.forwardedPort}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Claude AI</span>
                          <span>{project.enableClaudeAi ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* PHP Extensions Section */}
                  <AccordionItem value="php-extensions">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="text-sm font-medium">PHP Extensions</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-4">
                      {/* Pre-installed Extensions */}
                      <div className="space-y-2">
                        <div className="text-muted-foreground text-xs font-medium">
                          Pre-installed
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PREINSTALLED_PHP_EXTENSIONS.map(ext => (
                            <Badge key={ext} variant="secondary" className="font-mono">
                              {ext}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Additional Extensions */}
                      {project.phpExtensions && project.phpExtensions.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-muted-foreground text-xs font-medium">
                            Additional
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {project.phpExtensions.map(ext => (
                              <Badge key={ext} variant="default" className="font-mono">
                                {ext}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Services Tab - Only shown when project has bundled services */}
              {project.bundledServices && project.bundledServices.length > 0 && (
                <TabsContent value="services" className="flex flex-col gap-2">
                  {/* Bundled Services List with Collapsible */}
                  {project.bundledServices.map(service => {
                    const isExpanded = expandedServices.has(service.serviceId);
                    const serviceDef = serviceDefinitions.get(service.serviceId);
                    const isDatabase = serviceDef?.service_type === 'database';

                    return (
                      <Collapsible
                        key={service.serviceId}
                        open={isExpanded}
                        onOpenChange={() => toggleServiceExpanded(service.serviceId)}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="hover:bg-accent flex w-full items-center justify-between border p-3 text-left transition-colors">
                            <div className="flex items-center gap-3">
                              <ServiceIcon serviceId={service.serviceId} className="h-6 w-6" />
                              <div>
                                <p className="text-foreground text-sm font-medium">
                                  {getServiceDisplayName(service.serviceId)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {isDatabase ? 'Database service' : 'View credentials'}
                                </p>
                              </div>
                            </div>
                            <IconChevronDown
                              className={cn(
                                'text-muted-foreground h-4 w-4 transition-transform',
                                !isExpanded && '-rotate-90'
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 border-x border-b px-4 py-3">
                          {/* Service Credentials */}
                          <ServiceCredentials
                            serviceId={service.serviceId}
                            projectId={project.id}
                            projectName={project.name}
                          />

                          {/* Admin Link (phpMyAdmin, Adminer, Mailpit) */}
                          <ServiceAdminLink
                            serviceId={service.serviceId}
                            projectId={project.id}
                            projectDomain={project.domain}
                          />

                          {/* Database Operations */}
                          <DatabaseOperations
                            serviceId={service.serviceId}
                            projectId={project.id}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </ScrollArea>

      {/* Expandable Logs Panel */}
      <div
        className={`border-t ${consoleExpanded ? 'h-1/2' : 'h-10'} flex max-h-1/2 flex-col transition-all`}
      >
        {/* Logs Header */}
        <button
          onClick={() => setConsoleExpanded(!consoleExpanded)}
          className="hover:bg-primary/5 flex h-10 w-full items-center justify-between px-4 transition-colors"
        >
          <div className="flex items-center gap-2">
            <VscTerminal className="h-4 w-4" />
            <span className="text-sm font-medium">Logs</span>
          </div>
          {consoleExpanded ? (
            <IconChevronDown className="h-4 w-4" />
          ) : (
            <IconChevronUp className="h-4 w-4" />
          )}
        </button>

        {/* Logs Content */}
        <div className={`flex-1 overflow-hidden ${!consoleExpanded ? 'hidden' : ''}`}>
          <ProjectLogs ref={projectLogsRef} projectId={project.id} isActive={consoleExpanded} />
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project &quot;{project.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Choose what to delete:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeVolume"
                checked={removeVolume}
                onCheckedChange={(checked: boolean) => setRemoveVolume(checked === true)}
              />
              <Label htmlFor="removeVolume" className="cursor-pointer text-xs font-normal">
                Delete Docker volume
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeFolder"
                checked={removeFolder}
                onCheckedChange={(checked: boolean) => setRemoveFolder(checked === true)}
              />
              <Label htmlFor="removeFolder" className="cursor-pointer text-xs font-normal">
                Delete project folder
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant={'destructive'}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectDetailErrorComponent({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <p className="text-destructive text-sm font-medium">Failed to load project</p>
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
