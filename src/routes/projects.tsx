import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Plus, GripVertical, Loader2 } from 'lucide-react';
import { HiOutlineStatusOnline } from 'react-icons/hi';
import { FaLink } from 'react-icons/fa6';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import {
  useProjects,
  useReorderProjects,
  useProjectsBatchStatus,
} from '@/api/projects/projects-queries';
import { useActiveSyncs } from '@/api/sync/sync-queries';
import { useDocumentVisibility } from '@/hooks/use-document-visibility';
import { ProjectIcon } from '@/components/ProjectIcon';
import { CreateProjectWizard } from '@/components/CreateProjectWizard';
import type { Project } from '@/types/project';
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

interface SortableProjectItemProps {
  project: Project;
  isSelected: boolean;
  isRunning?: boolean;
  isLoading?: boolean;
  isSyncing?: boolean;
}

function SortableProjectItem({
  project,
  isSelected,
  isRunning,
  isLoading,
  isSyncing,
}: Readonly<SortableProjectItemProps>) {
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
      <div className="absolute bg-primary/5 top-0 left-0 flex h-full w-0 cursor-grab items-center justify-center overflow-hidden opacity-0 transition-all duration-200 group-hover/project:w-8 group-hover/project:opacity-100 active:cursor-grabbing">
        <GripVertical className="text-muted-foreground h-4 w-4" {...attributes} {...listeners} />
      </div>
      <div className="transition-all duration-200 group-hover/project:pl-8">
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="hover:bg-primary/5 flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-colors duration-200"
        >
          <div className="flex flex-1 items-center gap-3">
            <div className="relative">
              <ProjectIcon projectType={project.type} className="h-10 w-10" />
              {isSyncing && (
                <div className="bg-background absolute -bottom-1 -right-1 rounded-full p-0.5">
                  <Loader2 className="text-primary h-3 w-3 animate-spin" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold capitalize">{project.name}</span>
                {!isLoading && (
                  <HiOutlineStatusOnline
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isRunning ? 'text-green-500' : 'text-muted-foreground/40'
                    }`}
                    title={isRunning ? 'Running' : 'Stopped'}
                  />
                )}
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

  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const [projectOrder, setProjectOrder] = useState<string[]>([]);
  const reorderMutation = useReorderProjects();
  const isVisible = useDocumentVisibility();

  // Get active syncs
  const { data: activeSyncs } = useActiveSyncs();

  // Get all project IDs for batch status check
  const projectIds = useMemo(() => projects?.map(p => p.id) || [], [projects]);

  // Fetch all container statuses in a single batch call (OPTIMIZED)
  // Only polls when page is visible to save resources
  const { data: batchStatus, isLoading: isStatusLoading } = useProjectsBatchStatus(projectIds, {
    enabled: projectIds.length > 0 && isVisible,
    pollingInterval: isVisible ? 10000 : 0, // Only poll when visible, 0 disables polling
  });

  // Create a map for quick lookup of status by project ID
  const statusMap = useMemo(() => {
    if (!batchStatus) return new Map();
    return new Map(batchStatus.map(status => [status.projectId, status]));
  }, [batchStatus]);

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
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left side - Project List */}
        <ResizablePanel defaultSize={40}>
          <div className="flex h-full flex-col">
            {/* Header Bar */}
            <div className="flex h-12 items-center justify-between border-b px-4">
              <h2 className="text-sm font-semibold tracking-wide uppercase">Projects</h2>
              <button
                onClick={handleAddProject}
                className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                title="Add new project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {/* Loading State */}
                {isProjectsLoading && (
                  <>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="border-b p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted h-10 w-10 animate-pulse rounded-md" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                            <div className="bg-muted h-3 w-32 animate-pulse rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Sortable Project List */}
                {!isProjectsLoading && projects && projects.length > 0 && (
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
                      {sortedProjects.map(project => {
                        const projectStatus = statusMap.get(project.id);
                        const isSyncing = activeSyncs?.has(project.id) || false;
                        return (
                          <SortableProjectItem
                            key={project.id}
                            project={project}
                            isSelected={selectedProjectId === project.id}
                            isRunning={projectStatus?.running || false}
                            isLoading={isStatusLoading}
                            isSyncing={isSyncing}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right side - Project Detail */}
        <ResizablePanel defaultSize={60}>
          <div className="h-full overflow-hidden">
            <Outlet />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <CreateProjectWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
    </>
  );
}

export const Route = createFileRoute('/projects')({
  // No loader - projects load in background with skeleton UI
  component: ProjectsPage,
});
