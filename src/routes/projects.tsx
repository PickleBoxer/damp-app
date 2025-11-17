import { createFileRoute, Outlet, useNavigate, useMatches } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowUpRightIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Badge } from '@/components/ui/badge';
import { useSuspenseProjects, projectsQueryOptions } from '@/api/projects/projects-queries';
import { ProjectIcon } from '@/components/ProjectIcon';
import { CreateProjectWizard } from '@/components/CreateProjectWizard';
import type { Project } from '@/types/project';
import { TbFolderCode } from 'react-icons/tb';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

function ProjectsPage() {
  const navigate = useNavigate();
  const matches = useMatches();
  const projectMatch = matches.find(match => match.id === '/projects/$projectId');
  const selectedProjectId = projectMatch?.params
    ? (projectMatch.params as { projectId: string }).projectId
    : undefined;
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data: projects } = useSuspenseProjects();

  const handleSelectProject = (project: Project) => {
    navigate({
      to: '/projects/$projectId',
      params: { projectId: project.id },
    });
  };

  // No need for retry handler or renderProjectList - suspense handles loading/errors

  if (!projects || projects.length === 0) {
    return (
      <div className="flex h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TbFolderCode />
            </EmptyMedia>
            <EmptyTitle>No Projects Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t created any projects yet. Get started by creating your first project.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={() => setIsWizardOpen(true)}>Create Project</Button>
              <Button disabled variant="outline">
                Learn More <ArrowUpRightIcon />
              </Button>
            </div>
          </EmptyContent>
        </Empty>

        <CreateProjectWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your development projects</p>
          </div>
          <Button size="sm" onClick={() => setIsWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
        <div className="flex h-full">
          {/* Left side - Project List (50%) */}
          <div className="flex w-1/2 flex-col border-r p-4">
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {projects.map(project => (
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
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right side - Project Detail (50%) */}
          <div className="flex w-1/2 flex-col">
            <Outlet />
          </div>
        </div>
      </div>

      <CreateProjectWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
    </>
  );
}

export const Route = createFileRoute('/projects')({
  loader: ({ context }) => {
    // Prefetch projects in the loader for instant rendering
    return context.queryClient.ensureQueryData(projectsQueryOptions());
  },
  component: ProjectsPage,
});
