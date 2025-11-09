import { createFileRoute, Outlet, useNavigate, useMatches } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/api/projects/projects-queries';
import { ProjectIcon } from '@/components/ProjectIcon';
import { CreateProjectWizard } from '@/components/CreateProjectWizard';
import type { Project } from '@/types/project';

function ProjectsPage() {
  const navigate = useNavigate();
  const matches = useMatches();
  const projectMatch = matches.find(match => match.id === '/projects/$projectId');
  const selectedProjectId = projectMatch?.params
    ? (projectMatch.params as { projectId: string }).projectId
    : undefined;
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data: projects, isLoading, error, isError } = useProjects();

  const handleSelectProject = (project: Project) => {
    navigate({
      to: '/projects/$projectId',
      params: { projectId: project.id },
    });
  };

  const renderProjectList = () => {
    if (isLoading) {
      return (
        <>
          {[0, 1, 2, 3].map(index => (
            <Item variant="outline" key={`skeleton-${index}`} className="bg-muted/30">
              <ItemMedia variant="icon">
                <Skeleton className="h-6 w-6 rounded" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  <Skeleton className="h-4 w-32" />
                </ItemTitle>
                <Skeleton className="mt-2 h-3 w-48" />
              </ItemContent>
            </Item>
          ))}
        </>
      );
    }

    if (isError) {
      return (
        <div className="text-destructive flex h-full items-center justify-center p-8 text-center">
          <div>
            <p className="mb-4">Failed to load projects</p>
            <p className="text-sm">{error?.message || 'Please try again later'}</p>
          </div>
        </div>
      );
    }

    if (!projects || projects.length === 0) {
      return (
        <div className="text-muted-foreground flex h-full items-center justify-center p-8 text-center">
          <div>
            <p className="mb-4">No projects yet</p>
            <Button size="sm" onClick={() => setIsWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
          </div>
        </div>
      );
    }

    return projects.map(project => (
      <Item
        variant="outline"
        key={project.id}
        onClick={() => handleSelectProject(project)}
        className={`bg-muted/30 hover:bg-accent cursor-pointer p-2.5 transition-colors ${
          selectedProjectId === project.id ? 'ring-primary ring-2' : ''
        }`}
      >
        <ItemMedia className="bg-primary/10 rounded-md p-2">
          <ProjectIcon projectType={project.type} className="h-6 w-6" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{project.name}</ItemTitle>
          <ItemDescription className="line-clamp-1">{project.domain}</ItemDescription>
        </ItemContent>
        <div className="flex flex-col gap-1">
          {project.devcontainerCreated && (
            <Badge variant="secondary" className="text-xs">
              Devcontainer
            </Badge>
          )}
          {project.volumeCopied && (
            <Badge variant="default" className="text-xs">
              Volume Ready
            </Badge>
          )}
        </div>
      </Item>
    ));
  };

  return (
    <>
      <div className="flex h-full">
        {/* Left side - Project List (50%) */}
        <div className="flex w-1/2 flex-col border-r p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage your development projects</p>
            </div>
            <Button size="sm" onClick={() => setIsWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2">{renderProjectList()}</div>
          </ScrollArea>
        </div>

        {/* Right side - Project Detail (50%) */}
        <div className="flex w-1/2 flex-col">
          <Outlet />
        </div>
      </div>

      <CreateProjectWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
    </>
  );
}

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
});
