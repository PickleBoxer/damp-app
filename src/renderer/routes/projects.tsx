import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
  ErrorComponent,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { usePanelSizes } from '@renderer/hooks/use-panel-sizes';
import { useQuery, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Plus, GripVertical, Loader2 } from 'lucide-react';
import { FaLink } from 'react-icons/fa6';
import { Button } from '@renderer/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@renderer/components/ui/tooltip';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel } from '@renderer/components/ui/resizable';
import { ResizableHandleWithControls } from '@renderer/components/ResizableHandleWithControls';
import { projectsQueryOptions, projectContainerStateQueryOptions } from '@renderer/projects';
import { useReorderProjects } from '@renderer/hooks/use-projects';
import { useProjectSyncStatus } from '@renderer/hooks/use-sync';
import { ProjectIcon } from '@renderer/components/ProjectIcon';
import { CreateProjectWizard } from '@renderer/components/CreateProjectWizard';
import { ContainerStateIndicator } from '@renderer/components/ContainerStateIndicator';
import type { Project } from '@shared/types/project';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const Route = createFileRoute('/projects')({
  loader: async ({ context: { queryClient } }) => {
    // Non-blocking prefetch - starts loading but doesn't wait
    void queryClient.prefetchQuery(projectsQueryOptions());
  },
  errorComponent: ProjectsErrorComponent,
  component: ProjectsPage,
});

interface SortableProjectItemProps {
  project: Project;
  isSelected: boolean;
}

function SortableProjectItem({ project, isSelected }: Readonly<SortableProjectItemProps>) {
  // Each project fetches its own container state
  const { data: state } = useQuery(projectContainerStateQueryOptions(project.id));
  // Get sync status for this project
  const { data: syncStatus } = useProjectSyncStatus(project.id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/project relative ${isSelected ? 'bg-primary/5' : ''}`}
    >
      <div className="bg-primary/5 absolute top-0 left-0 flex h-full w-0 cursor-grab items-center justify-center overflow-hidden opacity-0 transition-all duration-200 group-hover/project:w-8 group-hover/project:opacity-100 active:cursor-grabbing">
        <GripVertical className="text-muted-foreground h-4 w-4" {...attributes} {...listeners} />
      </div>
      <div className="transition-all duration-200 group-hover/project:pl-8">
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="hover:bg-primary/5 flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-colors duration-200"
        >
          <div className="flex w-full flex-1 items-center gap-3">
            <ProjectIcon projectType={project.type} className="h-10 w-10" />
            <div className="w-full truncate">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold capitalize">{project.name}</span>
                <div className="flex items-center gap-1.5">
                  {syncStatus && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="rounded-full p-0.5">
                          <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Syncing {syncStatus.direction === 'from' ? 'from' : 'to'} volume
                        {syncStatus.percentage !== undefined && ` (${syncStatus.percentage}%)`}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <ContainerStateIndicator status={state} />
                </div>
              </div>
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <FaLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.domain}</span>
              </p>
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

  // Use regular query with loading state
  const { data: projects, isLoading, isError, error } = useQuery(projectsQueryOptions());

  const [projectOrder, setProjectOrder] = useState<string[]>([]);
  const reorderMutation = useReorderProjects();
  const { initialSizes, saveSizes, resetSizes, equalSplit, resetKey } = usePanelSizes(
    'projects',
    [45, 55]
  );

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

  return (
    <>
      <ResizablePanelGroup
        key={resetKey}
        direction="horizontal"
        className="h-full"
        onLayout={saveSizes}
      >
        {/* Left side - Project List */}
        <ResizablePanel defaultSize={initialSizes[0]}>
          <div className="flex h-full flex-col">
            {/* Header Bar */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
              <h2 className="text-sm font-semibold tracking-wide">Projects</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleAddProject} className="h-7">
                    Add
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add new project</TooltipContent>
              </Tooltip>
            </div>

            <ScrollArea className="h-0 flex-1 [&_[data-radix-scroll-area-viewport]>:first-child]:block!">
              <div className="flex w-full flex-1 flex-col">
                {/* Loading State */}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="text-muted-foreground/40 mb-4 h-12 w-12 animate-spin" />
                    <p className="text-muted-foreground text-sm">Loading projects...</p>
                  </div>
                )}

                {/* Error State */}
                {isError && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-destructive mb-2 text-sm font-medium">
                      Failed to load projects
                    </p>
                    <p className="text-muted-foreground text-xs">{error.message}</p>
                  </div>
                )}

                {/* Sortable Project List */}
                {!isLoading && !isError && projects && projects.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  >
                    <SortableContext
                      items={sortedProjects.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedProjects.map(project => (
                        <SortableProjectItem
                          key={project.id}
                          project={project}
                          isSelected={selectedProjectId === project.id}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandleWithControls onReset={resetSizes} onEqualSplit={equalSplit} />

        {/* Right side - Project Detail */}
        <ResizablePanel defaultSize={initialSizes[1]}>
          <div className="h-full overflow-hidden">
            <Outlet />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <CreateProjectWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
    </>
  );
}

function ProjectsErrorComponent({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <p className="text-destructive text-sm font-medium">Failed to load projects</p>
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
