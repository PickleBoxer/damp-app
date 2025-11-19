import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Plus, Search, GripVertical, Globe, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  useSuspenseProjects,
  projectsQueryOptions,
  useReorderProjects,
  useProjectContainerStatus,
} from '@/api/projects/projects-queries';
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableProjectItemProps {
  project: Project;
  isSelected: boolean;
}

function SortableProjectItem({ project, isSelected }: SortableProjectItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get container status with polling for list view
  const { data: containerStatus } = useProjectContainerStatus(project.id, {
    enabled: true,
    pollingInterval: 10000, // Poll every 10 seconds
  });
  const isRunning = containerStatus?.running || false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative border-b ${
        isSelected ? 'border-r-primary -bg-primary/5 border-r-2' : ''
      }`}
    >
      <div className="absolute top-0 left-0 flex h-full w-8 cursor-grab items-center justify-center opacity-40 transition-opacity hover:opacity-100 active:cursor-grabbing">
        <GripVertical className="text-muted-foreground h-4 w-4" {...attributes} {...listeners} />
      </div>
      <div className="pl-6">
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-transform duration-200 hover:translate-x-2 focus-visible:translate-x-2"
        >
          <div className="flex flex-1 items-center gap-3">
            <div className="bg-primary/10 rounded-md p-2">
              <ProjectIcon projectType={project.type} className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold capitalize">{project.name}</span>
                <Badge variant="secondary" className="text-xs">
                  PHP {project.phpVersion}
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                <Globe className="h-3 w-3" />
                {project.domain}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {isRunning ? (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">Running</span>
                  </>
                ) : (
                  <>
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">Ready to start</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const matches = useMatches();
  // Check if any match starts with '/projects/' and is not just '/projects'
  const projectMatch = matches.find(
    match =>
      typeof match.id === 'string' && match.id.startsWith('/projects/') && match.id !== '/projects'
  );
  const selectedProjectId = projectMatch?.params
    ? (projectMatch.params as { projectId: string }).projectId
    : undefined;
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projects } = useSuspenseProjects();
  const [projectOrder, setProjectOrder] = useState<string[]>([]);
  const reorderMutation = useReorderProjects();

  // Initialize or update project order when projects change
  const sortedProjects = useMemo(() => {
    if (!projects) return [];

    // If we have a custom order, apply it
    if (projectOrder.length > 0) {
      const orderMap = new Map(projectOrder.map((id, index) => [id, index]));
      return [...projects].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    }

    // Otherwise, return projects as-is
    return projects;
  }, [projects, projectOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedProjects.findIndex(item => item.id === active.id);
      const newIndex = sortedProjects.findIndex(item => item.id === over.id);
      const reordered = arrayMove(sortedProjects, oldIndex, newIndex);
      const newOrder = reordered.map(p => p.id);
      setProjectOrder(newOrder);

      // Persist the new order to the backend
      reorderMutation.mutate(newOrder);
    }
  };

  const handleAddProject = () => {
    setIsWizardOpen(true);
  };

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return sortedProjects;
    const query = searchQuery.toLowerCase();
    return sortedProjects.filter(
      project =>
        project.name.toLowerCase().includes(query) ||
        project.domain.toLowerCase().includes(query) ||
        project.type.toLowerCase().includes(query)
    );
  }, [sortedProjects, searchQuery]);

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
                Learn More <ArrowUpRight />
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
        {/* Search Bar */}
        <div className="relative border-y">
          <Input
            className="bg-background dark:bg-background flex h-10 w-full min-w-0 border-0 px-3 py-1 pt-4 pr-2 pb-4 pl-12 text-xs shadow-xs outline-none focus-visible:ring-0"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className="pointer-events-none absolute top-1/2 left-6 size-4 -translate-y-1/2 opacity-50 select-none" />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Project List */}
          <div className="flex w-80 flex-col border-r">
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {/* Add Site Button */}
                <button
                  onClick={handleAddProject}
                  className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-4 border-b p-3 text-left transition-transform duration-200 focus-visible:translate-x-2"
                >
                  <div className="flex flex-1 items-center justify-center gap-3">
                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                      <Plus className="h-8 w-8" />
                      <span className="text-xs">Add Project</span>
                    </div>
                  </div>
                </button>

                {/* Sortable Project List */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={filteredProjects.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredProjects.map(project => (
                      <SortableProjectItem
                        key={project.id}
                        project={project}
                        isSelected={selectedProjectId === project.id}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>
          </div>

          {/* Right side - Project Detail */}
          <div className="flex-1 overflow-hidden">
            {selectedProjectId ? (
              <Outlet />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <TbFolderCode />
                    </EmptyMedia>
                    <EmptyTitle>No Project Selected</EmptyTitle>
                    <EmptyDescription>
                      Select a project from the list to view its details and manage its
                      configuration.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
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
