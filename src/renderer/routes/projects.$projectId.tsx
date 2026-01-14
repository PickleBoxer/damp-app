import { ProjectIcon } from '@renderer/components/ProjectIcon';
import { ProjectLogs, type ProjectLogsRef } from '@renderer/components/ProjectLogs';
import { ProjectPreview } from '@renderer/components/ProjectPreview';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@renderer/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
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
import { Input } from '@renderer/components/ui/input';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@renderer/components/ui/item';
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
import { getSettings } from '@renderer/utils/settings';
import { PREINSTALLED_PHP_EXTENSIONS } from '@shared/constants/php-extensions';
import { useQuery, useQueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  ErrorComponent,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  Loader2,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IoInformationCircle, IoWarning } from 'react-icons/io5';
import { SiClaude, SiNodedotjs, SiPhp } from 'react-icons/si';
import { TbWorld } from 'react-icons/tb';
import { VscDebugStart, VscDebugStop, VscTerminal, VscVscode } from 'react-icons/vsc';
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

  const deleteProjectMutation = useDeleteProject();
  const syncFromVolumeMutation = useSyncFromVolume();
  const syncToVolumeMutation = useSyncToVolume();
  const cancelSyncMutation = useCancelSync();
  const startNgrokMutation = useStartNgrokTunnel();
  const stopNgrokMutation = useStopNgrokTunnel();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [removeFolder, setRemoveFolder] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [includeNodeModules, setIncludeNodeModules] = useState(false);
  const [includeVendor, setIncludeVendor] = useState(false);
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
        removeVolume: false,
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
                    className="h-8.5 w-8.5 shrink-0"
                    onClick={handleOpenBrowser}
                  >
                    <Globe className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open site in browser</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8.5 w-8.5 shrink-0"
                    onClick={handleOpenFolder}
                  >
                    <FolderOpen className="text-muted-foreground h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open site folder</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground h-8.5 w-8.5 shrink-0"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete project</TooltipContent>
              </Tooltip>
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
                <TabsTrigger value="volumes">Volume Sync</TabsTrigger>
                <TabsTrigger value="ngrok">Share Online</TabsTrigger>
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
                      <Terminal className="mr-2 h-4 w-4" />
                      Open Terminal
                    </Button>
                    <Button variant="outline" className="h-8.5 gap-1.5" onClick={handleOpenTinker}>
                      <Sparkles className="mr-2 h-4 w-4" />
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

              {/* Volume Sync Tab */}
              <TabsContent value="volumes" className="flex flex-col gap-4">
                <Tabs defaultValue="from-volume" className="flex w-full flex-col gap-4">
                  <TabsList className="bg-muted text-muted-foreground inline-flex h-8 w-full items-center justify-center rounded-lg p-0.75">
                    <TabsTrigger value="from-volume">From Volume</TabsTrigger>
                    <TabsTrigger value="to-volume">To Volume</TabsTrigger>
                  </TabsList>

                  {/* From Volume Tab */}
                  <TabsContent value="from-volume" className="flex flex-col gap-4">
                    <Item variant="outline" size="sm">
                      <ItemMedia>
                        <Download className="h-4 w-4" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>Sync from Volume</ItemTitle>
                        <p className="text-muted-foreground text-xs">
                          Copy files from Docker volume to your local folder
                        </p>
                      </ItemContent>
                      <ItemActions>
                        {syncStatus?.direction === 'from' ? (
                          <div className="flex items-center gap-2">
                            {syncStatus.percentage !== undefined && (
                              <span className="text-muted-foreground text-xs">
                                {syncStatus.percentage}%
                              </span>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelSyncMutation.mutate(projectId)}
                              disabled={cancelSyncMutation.isPending}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSyncFromVolume}
                            disabled={!isDockerRunning || !!syncStatus}
                          >
                            {syncStatus ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            Sync Now
                          </Button>
                        )}
                      </ItemActions>
                    </Item>

                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Options</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Sync node_modules"
                              id="sync-node-modules-from"
                              checked={includeNodeModules}
                              onCheckedChange={(checked: boolean) =>
                                setIncludeNodeModules(checked === true)
                              }
                            />
                            <label
                              htmlFor="sync-node-modules-from"
                              className="cursor-pointer text-xs select-none"
                            >
                              Include <code className="text-xs">node_modules</code>
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Sync vendor"
                              id="sync-vendor-from"
                              checked={includeVendor}
                              onCheckedChange={(checked: boolean) =>
                                setIncludeVendor(checked === true)
                              }
                            />
                            <label
                              htmlFor="sync-vendor-from"
                              className="cursor-pointer text-xs select-none"
                            >
                              Include <code className="text-xs">vendor</code>
                            </label>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          *Large folders may slow down sync
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium">Volume Name</p>
                        <code className="bg-muted text-muted-foreground block rounded border px-2 py-1.5 text-xs">
                          {project.volumeName}
                        </code>
                      </div>
                    </div>
                  </TabsContent>

                  {/* To Volume Tab */}
                  <TabsContent value="to-volume" className="flex flex-col gap-4">
                    <Item variant="outline" size="sm">
                      <ItemMedia>
                        <Upload className="h-4 w-4" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>Sync to Volume</ItemTitle>
                        <p className="text-muted-foreground text-xs">
                          Copy files from your local folder to Docker volume
                        </p>
                      </ItemContent>
                      <ItemActions>
                        {syncStatus?.direction === 'to' ? (
                          <div className="flex items-center gap-2">
                            {syncStatus.percentage !== undefined && (
                              <span className="text-muted-foreground text-xs">
                                {syncStatus.percentage}%
                              </span>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelSyncMutation.mutate(projectId)}
                              disabled={cancelSyncMutation.isPending}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSyncToVolume}
                            disabled={!isDockerRunning || !!syncStatus}
                          >
                            {syncStatus ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            Sync Now
                          </Button>
                        )}
                      </ItemActions>
                    </Item>

                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Options</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Sync node_modules"
                              id="sync-node-modules-to"
                              checked={includeNodeModules}
                              onCheckedChange={(checked: boolean) =>
                                setIncludeNodeModules(checked === true)
                              }
                            />
                            <label
                              htmlFor="sync-node-modules-to"
                              className="cursor-pointer text-xs select-none"
                            >
                              Include <code className="text-xs">node_modules</code>
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Sync vendor"
                              id="sync-vendor-to"
                              checked={includeVendor}
                              onCheckedChange={(checked: boolean) =>
                                setIncludeVendor(checked === true)
                              }
                            />
                            <label
                              htmlFor="sync-vendor-to"
                              className="cursor-pointer text-xs select-none"
                            >
                              Include <code className="text-xs">vendor</code>
                            </label>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          *Large folders may slow down sync
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium">Volume Name</p>
                        <code className="bg-muted text-muted-foreground block rounded border px-2 py-1.5 text-xs">
                          {project.volumeName}
                        </code>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Share Online Tab (Ngrok) */}
              <TabsContent value="ngrok" className="flex flex-col gap-4">
                {/* Tunnel Control Item */}
                <Item variant="outline" size="sm">
                  <ItemMedia>
                    <TbWorld className="h-4 w-4" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Ngrok Tunnel</ItemTitle>
                    <p className="text-muted-foreground text-xs">
                      Share your project online securely
                    </p>
                  </ItemContent>
                  <ItemActions>
                    <Badge
                      variant={
                        ngrokStatus === 'active'
                          ? 'default'
                          : ngrokStatus === 'error'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="capitalize"
                    >
                      {ngrokStatus}
                    </Badge>
                  </ItemActions>
                </Item>

                {/* Active Tunnel Info */}
                {ngrokStatus === 'active' && ngrokPublicUrl && (
                  <div className="space-y-3 rounded-lg border bg-green-50/50 p-4 dark:bg-green-950/20">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      <p className="text-sm font-medium">Tunnel Active</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Public URL</p>
                      <div className="flex gap-2">
                        <Input
                          value={ngrokPublicUrl}
                          readOnly
                          className="flex-1 font-mono text-xs"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={handleCopyUrl}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy URL</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={handleOpenPublicUrl}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open in browser</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {ngrokStatus === 'error' && ngrokStatusData?.error && (
                  <Alert variant="destructive">
                    <IoWarning className="h-4 w-4" />
                    <AlertTitle>Tunnel Error</AlertTitle>
                    <AlertDescription>{ngrokStatusData.error}</AlertDescription>
                  </Alert>
                )}

                {/* Control Actions */}
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Tunnel Controls</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleStartNgrok}
                      disabled={
                        !isDockerRunning ||
                        !isRunning ||
                        ngrokStatus === 'starting' ||
                        ngrokStatus === 'active' ||
                        startNgrokMutation.isPending ||
                        !hasNgrokToken
                      }
                    >
                      {startNgrokMutation.isPending || ngrokStatus === 'starting' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <VscDebugStart className="mr-2 h-4 w-4" />
                      )}
                      Start
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStopNgrok}
                      disabled={
                        ngrokStatus === 'stopped' ||
                        ngrokStatus === 'error' ||
                        stopNgrokMutation.isPending
                      }
                    >
                      {stopNgrokMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <VscDebugStop className="mr-2 h-4 w-4" />
                      )}
                      Stop
                    </Button>
                  </div>
                </div>

                {/* Info/Warning Messages */}
                <div className="space-y-2">
                  {!hasNgrokToken && (
                    <Alert>
                      <IoInformationCircle className="h-4 w-4" />
                      <AlertTitle>Configuration Required</AlertTitle>
                      <AlertDescription>
                        Please configure your ngrok auth token in Settings to use this feature.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isRunning && (
                    <Alert>
                      <IoInformationCircle className="h-4 w-4" />
                      <AlertTitle>Project Not Running</AlertTitle>
                      <AlertDescription>
                        The project container must be running to start an ngrok tunnel.
                      </AlertDescription>
                    </Alert>
                  )}

                  {ngrokStatus === 'stopped' && hasNgrokToken && isRunning && isDockerRunning && (
                    <div className="text-muted-foreground rounded-lg border p-3 text-xs">
                      <p className="mb-2 font-medium">About ngrok tunnels:</p>
                      <ul className="ml-4 list-disc space-y-1">
                        <li>Creates a secure public URL to your local project</li>
                        <li>Useful for testing webhooks or sharing with clients</li>
                        <li>URL changes each time you restart the tunnel</li>
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
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
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
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
          <div className="flex items-center justify-center space-x-2">
            <Checkbox
              id="removeFolder"
              checked={removeFolder}
              onCheckedChange={(checked: boolean) => setRemoveFolder(checked === true)}
            />
            <Label htmlFor="removeFolder" className="cursor-pointer text-xs font-normal">
              Delete project folder
            </Label>
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
