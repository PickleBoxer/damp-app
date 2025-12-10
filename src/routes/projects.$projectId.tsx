import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SiClaude, SiNodedotjs, SiPhp } from 'react-icons/si';
import { LuFolderSync } from 'react-icons/lu';
import { IoInformationCircle, IoWarning } from 'react-icons/io5';
import {
  useSuspenseProject,
  useDeleteProject,
  useProjectsBatchStatus,
  useProjectPort,
  projectQueryOptions,
} from '@/api/projects/projects-queries';
import { useDockerStatus } from '@/api/docker/docker-queries';
import { useSyncFromVolume, useSyncToVolume, useProjectSyncStatus } from '@/api/sync/sync-queries';
import { useNgrokStatus, useStartNgrokTunnel, useStopNgrokTunnel } from '@/api/ngrok/ngrok-queries';
import { useDocumentVisibility } from '@/hooks/use-document-visibility';
import { ProjectIcon } from '@/components/ProjectIcon';
import { ProjectPreview } from '@/components/ProjectPreview';
import { ProjectLogs } from '@/components/ProjectLogs';
import {
  Globe,
  FolderOpen,
  Terminal,
  Sparkles,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Upload,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { VscDebugStop, VscDebugStart } from 'react-icons/vsc';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { VscTerminal, VscVscode } from 'react-icons/vsc';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  openProjectFolder,
  openProjectInBrowser,
  openProjectInEditor,
  openProjectTerminal,
  openProjectTinker,
} from '@/helpers/shell_helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useState } from 'react';
import { getSettings } from '@/helpers/settings_helpers';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';

function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const { data: project } = useSuspenseProject(projectId);
  const deleteProjectMutation = useDeleteProject();
  const syncFromVolumeMutation = useSyncFromVolume();
  const syncToVolumeMutation = useSyncToVolume();
  const startNgrokMutation = useStartNgrokTunnel();
  const stopNgrokMutation = useStopNgrokTunnel();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [removeFolder, setRemoveFolder] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [includeNodeModules, setIncludeNodeModules] = useState(false);
  const [includeVendor, setIncludeVendor] = useState(false);
  const isVisible = useDocumentVisibility();

  // Check Docker status
  const { data: dockerStatus } = useDockerStatus();
  const isDockerRunning = dockerStatus?.isRunning ?? false;

  // Get sync status for this project
  const syncStatus = useProjectSyncStatus(projectId);

  // Get ngrok tunnel status
  const { data: ngrokStatusData } = useNgrokStatus(projectId, { enabled: isVisible });
  const ngrokStatus = ngrokStatusData?.status || 'stopped';
  const ngrokPublicUrl = ngrokStatusData?.publicUrl;

  // Use batch status (same as list view) - non-blocking, shares cache
  const { data: batchStatus } = useProjectsBatchStatus([projectId], {
    enabled: isVisible,
    pollingInterval: isVisible ? 10000 : 0, // 0 disables polling when not visible
  });
  const containerStatus = batchStatus?.[0];
  const isRunning = containerStatus?.running || false;

  // Lazy load port discovery - only when container is running (OPTIMIZED)
  // This is the ONLY potentially slow operation, but it's lazy and non-blocking
  const { data: forwardedLocalhostPort } = useProjectPort(projectId, {
    enabled: isRunning, // Only discover port when container is actually running
  });

  const handleOpenVSCode = async () => {
    const result = await openProjectInEditor(project.id);
    if (result.success) {
      toast.success('Opening in VS Code...');
    } else {
      toast.error(result.error || 'Failed to open VS Code');
    }
  };

  const handleOpenBrowser = async () => {
    const result = await openProjectInBrowser(project.id);
    if (result.success) {
      toast.success('Opening in browser...');
    } else {
      toast.error(result.error || 'Failed to open browser');
    }
  };

  const handleOpenFolder = async () => {
    const result = await openProjectFolder(project.id);
    if (result.success) {
      toast.success('Opening folder...');
    } else {
      toast.error(result.error || 'Failed to open folder');
    }
  };

  const handleOpenTerminal = async () => {
    const result = await openProjectTerminal(project.id);
    if (result.success) {
      toast.success('Opening terminal...');
    } else {
      toast.error(result.error || 'Failed to open terminal');
    }
  };

  const handleOpenTinker = async () => {
    const result = await openProjectTinker(project.id);
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
        onSuccess: data => {
          if (data.success) {
            // Navigate to projects list after successful deletion
            navigate({ to: '/projects' });
          }
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

  const handleStartNgrok = () => {
    const settings = getSettings();
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
      } catch (error) {
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
      <ScrollArea className={`${consoleExpanded ? 'h-1/2' : 'flex-1'} min-h-1/2 transition-all`}>
        <div className="space-y-4 p-2">
          {/* Safari Preview with Hover Expansion */}
          <ProjectPreview
            project={project}
            forwardedLocalhostPort={forwardedLocalhostPort}
            isRunning={isRunning}
          />
          {/* Compact Project Header */}
          <div className="z-10 -mt-7 mb-0 flex items-baseline justify-between px-2">
            <div className="bg-background z-10 flex items-center rounded-md p-2">
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
              <TabsList className="bg-muted text-muted-foreground inline-flex h-8 w-full items-center justify-center rounded-lg p-[3px]">
                <TabsTrigger
                  value="actions"
                  className="text-foreground dark:text-muted-foreground hover:text-muted-foreground/70 dark:hover:text-muted-foreground/70 data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:text-secondary-foreground dark:data-[state=active]:text-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-all"
                >
                  Actions
                </TabsTrigger>
                <TabsTrigger
                  value="environment"
                  className="text-foreground dark:text-muted-foreground hover:text-muted-foreground/70 dark:hover:text-muted-foreground/70 data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:text-secondary-foreground dark:data-[state=active]:text-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-all"
                >
                  Environment
                </TabsTrigger>
                <TabsTrigger
                  value="volumes"
                  className="text-foreground dark:text-muted-foreground hover:text-muted-foreground/70 dark:hover:text-muted-foreground/70 data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:text-secondary-foreground dark:data-[state=active]:text-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-all"
                >
                  Volume Sync
                </TabsTrigger>
                <TabsTrigger
                  value="ngrok"
                  className="text-foreground dark:text-muted-foreground hover:text-muted-foreground/70 dark:hover:text-muted-foreground/70 data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:text-secondary-foreground dark:data-[state=active]:text-foreground inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-all"
                >
                  Share Online
                </TabsTrigger>
              </TabsList>

              {/* Actions Tab */}
              <TabsContent value="actions" className="flex flex-col gap-4">
                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-8.5 gap-1.5 text-[0.8125rem]"
                      onClick={handleOpenTerminal}
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Open Terminal
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8.5 gap-1.5 text-[0.8125rem]"
                      onClick={handleOpenTinker}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Open Tinker
                    </Button>
                  </div>
                  <Button
                    className="h-8.5 gap-1.5 bg-[#007ACC] text-[0.8125rem] text-white hover:bg-[#005A9E]"
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
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-indigo-100 p-2 dark:bg-indigo-950/30">
                        <SiPhp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">PHP Version</p>
                        <p className="text-muted-foreground text-xs">Runtime environment</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-md font-mono">
                      {project.phpVersion}
                    </Badge>
                  </div>

                  {/* Node Version */}
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-green-100 p-2 dark:bg-green-950/30">
                        <SiNodedotjs className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">Node Version</p>
                        <p className="text-muted-foreground text-xs">Runtime environment</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-md font-mono">
                      {project.nodeVersion || 'lts'}
                    </Badge>
                  </div>

                  {/* Claude Code CLI Status */}
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-orange-100 p-2 dark:bg-orange-950/30">
                        <SiClaude className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">Claude Code</p>
                        <p className="text-muted-foreground text-xs">
                          Deep coding at terminal velocity
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-md font-mono">
                      {project.enableClaudeAi ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                {/* Configuration and PHP Extensions */}
                <Accordion type="single" collapsible className="w-full">
                  {/* Configuration Section */}
                  <AccordionItem value="configuration">
                    <AccordionTrigger className="hover:bg-muted/50 bg-card p-2">
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
                        {forwardedLocalhostPort && (
                          <div className="grid grid-cols-[140px_1fr] gap-2">
                            <span className="text-muted-foreground">Localhost Port</span>
                            <span className="font-mono">
                              localhost:{forwardedLocalhostPort}
                              <Badge variant="outline" className="ml-2 text-xs">
                                VS Code forwarded
                              </Badge>
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-muted-foreground">Claude AI</span>
                          <span>{project.enableClaudeAi ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* PHP Extensions Section */}
                  {project.phpExtensions && project.phpExtensions.length > 0 && (
                    <AccordionItem value="php-extensions">
                      <AccordionTrigger className="hover:bg-muted/50 bg-card p-2">
                        <span className="text-sm font-medium">
                          PHP Extensions ({project.phpExtensions.length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {project.phpExtensions.map(ext => (
                            <Badge key={ext} variant="secondary">
                              {ext}
                            </Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </TabsContent>

              {/* Volume Sync Tab */}
              <TabsContent value="volumes" className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <Alert className="rounded-md">
                    <LuFolderSync className="h-4 w-4" />
                    <AlertTitle>Volume Sync</AlertTitle>
                    <AlertDescription>
                      <div className="text-muted-foreground space-y-2">
                        <p>Sync files between the Docker volume and your local folder.</p>
                        <div className="flex flex-row gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Sync node_modules"
                              id="sync-node-modules"
                              checked={includeNodeModules}
                              onCheckedChange={checked => setIncludeNodeModules(checked === true)}
                            />
                            <label
                              htmlFor="sync-node-modules"
                              className="cursor-pointer text-xs select-none"
                            >
                              Sync <code>node_modules</code>
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Sync vendor"
                              id="sync-vendor"
                              checked={includeVendor}
                              onCheckedChange={checked => setIncludeVendor(checked === true)}
                            />
                            <label
                              htmlFor="sync-vendor"
                              className="cursor-pointer text-xs select-none"
                            >
                              Sync <code>vendor</code>
                            </label>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          *Large folders may slow down sync. Disable above to skip them.
                        </p>
                        <p className="text-xs">Volume: </p>
                        <pre className="rounded-md bg-neutral-950 px-2 py-1">
                          <code className="text-white select-text">{project.volumeName}</code>
                        </pre>
                      </div>
                    </AlertDescription>
                  </Alert>
                  {/* Sync Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-md"
                      onClick={handleSyncFromVolume}
                      disabled={
                        !isDockerRunning ||
                        syncFromVolumeMutation.isPending ||
                        syncToVolumeMutation.isPending ||
                        !!syncStatus
                      }
                    >
                      {syncFromVolumeMutation.isPending || syncStatus?.direction === 'from' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Sync from Volume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-md"
                      onClick={handleSyncToVolume}
                      disabled={
                        !isDockerRunning ||
                        syncFromVolumeMutation.isPending ||
                        syncToVolumeMutation.isPending ||
                        !!syncStatus
                      }
                    >
                      {syncToVolumeMutation.isPending || syncStatus?.direction === 'to' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Sync to Volume
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Share Online Tab (Ngrok) */}
              <TabsContent value="ngrok" className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <Alert className="rounded-md">
                    <IoInformationCircle className="h-4 w-4" />
                    <AlertTitle>Share Project Online</AlertTitle>
                    <AlertDescription>
                      <div className="text-muted-foreground space-y-2">
                        <p>
                          Use ngrok to create a secure tunnel and share your project with anyone.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Status Badge */}
                  <Item variant="outline" size="sm">
                    <ItemMedia></ItemMedia>
                    <ItemContent>
                      <ItemTitle>Status</ItemTitle>
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

                  {/* Public URL Display (when active) */}
                  {ngrokStatus === 'active' && ngrokPublicUrl && (
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Public URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={ngrokPublicUrl}
                          readOnly
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleCopyUrl}
                          title="Copy URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleOpenPublicUrl}
                          title="Open in browser"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Error Message (when error) */}
                  {ngrokStatus === 'error' && ngrokStatusData?.error && (
                    <Alert variant="destructive" className="rounded-md">
                      <AlertDescription>{ngrokStatusData.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Control Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full rounded-md"
                      onClick={handleStartNgrok}
                      disabled={
                        !isDockerRunning ||
                        !isRunning ||
                        ngrokStatus === 'starting' ||
                        ngrokStatus === 'active' ||
                        startNgrokMutation.isPending
                      }
                    >
                      {startNgrokMutation.isPending || ngrokStatus === 'starting' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <VscDebugStart className="mr-2 h-4 w-4" />
                      )}
                      Start Tunnel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-md"
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
                      Stop Tunnel
                    </Button>
                  </div>

                  {!getSettings().ngrokAuthToken && (
                    <Alert className="rounded-md">
                      <IoWarning className="h-4 w-4" />
                      <AlertDescription className="text-muted-foreground text-sm">
                        Please configure your ngrok auth token in Settings to use this feature.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isRunning && (
                    <Alert className="rounded-md">
                      <IoWarning className="h-4 w-4" />
                      <AlertDescription className="text-muted-foreground text-sm">
                        The project container must be running to start an ngrok tunnel.
                      </AlertDescription>
                    </Alert>
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
        {consoleExpanded && (
          <div className="flex-1 overflow-hidden">
            <ProjectLogs key={project.id} projectId={project.id} />
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project "{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Choose what to delete:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="removeFolder"
              checked={removeFolder}
              onCheckedChange={checked => setRemoveFolder(checked === true)}
            />
            <Label htmlFor="removeFolder" className="cursor-pointer text-sm font-normal">
              Delete project folder
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute('/projects/$projectId')({
  loader: ({ context, params }) => {
    // Prefetch project data in the loader for instant rendering
    return context.queryClient.ensureQueryData(projectQueryOptions(params.projectId));
  },
  component: ProjectDetailPage,
});
