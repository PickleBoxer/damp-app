import { createFileRoute } from '@tanstack/react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  useSuspenseProject,
  useDeleteProject,
  useCopyProjectToVolume,
  projectQueryOptions,
} from '@/api/projects/projects-queries';
import { ProjectIcon } from '@/components/ProjectIcon';
import { ProjectActions } from '@/components/ProjectActions';

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { data: project } = useSuspenseProject(projectId);
  const deleteProjectMutation = useDeleteProject();
  const copyToVolumeMutation = useCopyProjectToVolume();

  const handleOpenVSCode = () => {
    if (project) {
      // Open VS Code with devcontainer
      console.log('Opening VS Code for project:', project.path);
      // TODO: Implement via IPC call
    }
  };

  const handleCopyToVolume = () => {
    if (project) {
      copyToVolumeMutation.mutate(project.id);
    }
  };

  const handleDelete = () => {
    if (project && confirm(`Delete project "${project.name}"?`)) {
      deleteProjectMutation.mutate({
        projectId: project.id,
        removeVolume: false,
        removeFolder: false,
      });
    }
  };

  // Suspense handles loading state, project is guaranteed to exist
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-lg p-3">
              <ProjectIcon projectType={project.type} className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <p className="text-muted-foreground mt-1">{project.domain}</p>
            </div>
          </div>
          <ProjectActions
            project={project}
            onOpenVSCode={handleOpenVSCode}
            onCopyToVolume={handleCopyToVolume}
            onDelete={handleDelete}
          />
        </div>

        <Separator />

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">
            {project.type.replaceAll('-', ' ')}
          </Badge>
          <Badge variant={project.devcontainerCreated ? 'default' : 'secondary'}>
            Devcontainer: {project.devcontainerCreated ? 'Created' : 'Not Created'}
          </Badge>
          <Badge variant={project.volumeCopied ? 'default' : 'secondary'}>
            Volume: {project.volumeCopied ? 'Ready' : 'Not Copied'}
          </Badge>
        </div>

        <Separator />

        {/* Configuration Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configuration</h3>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">Project Path</div>
              <div className="font-mono text-sm">{project.path}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">Volume Name</div>
              <div className="font-mono text-sm">{project.volumeName}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">PHP Version</div>
              <div className="text-sm">{project.phpVersion}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">Node Version</div>
              <div className="text-sm">{project.nodeVersion}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">Network</div>
              <div className="text-sm">{project.networkName}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">Forwarded Port</div>
              <div className="text-sm">{project.forwardedPort}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground text-sm">Claude AI</div>
              <div className="text-sm">{project.enableClaudeAi ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* PHP Extensions */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">PHP Extensions</h3>
          <div className="flex flex-wrap gap-2">
            {project.phpExtensions?.map(ext => (
              <Badge key={ext} variant="secondary">
                {ext}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Commands */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Commands</h3>

          <div className="space-y-2">
            <div className="text-muted-foreground text-sm">Post-Start Command</div>
            <div className="bg-muted rounded-md p-3 font-mono text-sm">
              {project.postStartCommand}
            </div>
          </div>

          {project.postCreateCommand && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Post-Create Command</div>
              <div className="bg-muted rounded-md p-3 font-mono text-sm">
                {project.postCreateCommand}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Timestamps */}
        <div className="text-muted-foreground space-y-1 text-xs">
          <div>Created: {new Date(project.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(project.updatedAt).toLocaleString()}</div>
        </div>
      </div>
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
