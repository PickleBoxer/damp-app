import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useSuspenseProject,
  useDeleteProject,
  useProjectsBatchStatus,
  useProjectPort,
  projectQueryOptions,
} from '@/api/projects/projects-queries';
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
} from 'lucide-react';
import { VscTerminal } from 'react-icons/vsc';
import { VscVscode } from 'react-icons/vsc';
import { Separator } from '@/components/ui/separator';
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
import { useState } from 'react';

function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const { data: project } = useSuspenseProject(projectId);
  const deleteProjectMutation = useDeleteProject();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [removeFolder, setRemoveFolder] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const isVisible = useDocumentVisibility();

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
              <Button
                size="icon"
                variant="outline"
                className="h-8.5 w-8.5 shrink-0"
                title="Open site in browser"
                onClick={handleOpenBrowser}
              >
                <Globe className="text-muted-foreground h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8.5 w-8.5 shrink-0"
                title="Open site folder"
                onClick={handleOpenFolder}
              >
                <FolderOpen className="text-muted-foreground h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground h-8.5 w-8.5 shrink-0"
                title="Delete project"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
                {/* Configuration */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Configuration</h3>
                  <div className="space-y-2 text-sm">
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
                </div>

                {/* PHP Extensions */}
                {project.phpExtensions && project.phpExtensions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">PHP Extensions</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.phpExtensions.map(ext => (
                          <Badge key={ext} variant="secondary">
                            {ext}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Volume Sync Tab */}
              <TabsContent value="volumes" className="mt-4 space-y-4">
                <div className="rounded-md border border-dashed p-8 text-center">
                  <p className="text-muted-foreground text-sm">Volume sync settings coming soon</p>
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
          className="hover:bg-muted/50 flex h-10 w-full items-center justify-between px-4 transition-colors"
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
