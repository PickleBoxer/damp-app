import { createFileRoute } from '@tanstack/react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useSuspenseProject,
  useDeleteProject,
  projectQueryOptions,
} from '@/api/projects/projects-queries';
import { ProjectIcon } from '@/components/ProjectIcon';
import { ProjectPreview } from '@/components/ProjectPreview';
import { Globe, FolderOpen, Terminal, Sparkles, Code, Trash2 } from 'lucide-react';
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
  const { projectId } = Route.useParams();
  const { data: project } = useSuspenseProject(projectId);
  const deleteProjectMutation = useDeleteProject();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [removeFolder, setRemoveFolder] = useState(false);

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
    deleteProjectMutation.mutate({
      projectId: project.id,
      removeVolume: false,
      removeFolder,
    });
    setShowDeleteDialog(false);
    setRemoveFolder(false);
  };

  // Suspense handles loading state, project is guaranteed to exist
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        {/* Safari Preview with Hover Expansion */}
        <ProjectPreview project={project} />
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
              <div className="grid grid-cols-6 gap-3">
                <Button
                  variant="outline"
                  className="col-span-3 h-8.5 gap-1.5 text-[0.8125rem]"
                  onClick={handleOpenTerminal}
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Open Terminal
                </Button>
                <Button
                  variant="outline"
                  className="col-span-3 h-8.5 gap-1.5 text-[0.8125rem]"
                  onClick={handleOpenTinker}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Open Tinker
                </Button>
                <Button
                  className="col-span-5 h-8.5 gap-1.5 text-[0.8125rem]"
                  onClick={handleOpenVSCode}
                >
                  <Code className="mr-2 h-4 w-4" />
                  Open in VS Code
                </Button>
                <Button
                  variant="destructive"
                  className="col-span-1 h-8.5"
                  aria-label="Remove Site"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Separator />

              {/* Status */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {project.type.replaceAll('-', ' ')}
                  </Badge>
                  <Badge variant="secondary">PHP {project.phpVersion}</Badge>
                  <Badge variant="secondary">Node {project.nodeVersion}</Badge>
                </div>
              </div>

              <Separator />

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
                    <span className="text-muted-foreground">Forwarded Port</span>
                    <span>{project.forwardedPort}</span>
                  </div>
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

              <Separator />

              {/* Commands */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Commands</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-muted-foreground mb-1 text-xs">Post-Start Command</div>
                    <div className="bg-muted rounded-md p-3 font-mono text-sm break-all">
                      {project.postStartCommand}
                    </div>
                  </div>
                  {project.postCreateCommand && (
                    <div>
                      <div className="text-muted-foreground mb-1 text-xs">Post-Create Command</div>
                      <div className="bg-muted rounded-md p-3 font-mono text-sm break-all">
                        {project.postCreateCommand}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="text-muted-foreground space-y-1 text-xs">
                <div>Created: {new Date(project.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(project.updatedAt).toLocaleString()}</div>
              </div>
            </TabsContent>

            {/* Environment Tab */}
            <TabsContent value="environment" className="mt-4 space-y-4">
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Environment variables configuration coming soon
                </p>
              </div>
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
    </ScrollArea>
  );
}

export const Route = createFileRoute('/projects/$projectId')({
  loader: ({ context, params }) => {
    // Prefetch project data in the loader for instant rendering
    return context.queryClient.ensureQueryData(projectQueryOptions(params.projectId));
  },
  component: ProjectDetailPage,
});
