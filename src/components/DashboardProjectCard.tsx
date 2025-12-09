/**
 * Dashboard project card component
 * Displays a running project with quick open actions
 */

import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ProjectIcon } from '@/components/ProjectIcon';
import { openProjectInBrowser, openProjectInEditor } from '@/helpers/shell_helpers';
import { toast } from 'sonner';
import { Globe, Code2, ExternalLink } from 'lucide-react';
import type { Project } from '@/types/project';

interface DashboardProjectCardProps {
  readonly project: Project;
}

export default function DashboardProjectCard({ project }: Readonly<DashboardProjectCardProps>) {
  const handleOpenBrowser = async () => {
    const result = await openProjectInBrowser(project.id);
    if (!result.success) {
      toast.error('Failed to open in browser', {
        description: result.error || 'Unknown error',
      });
    }
  };

  const handleOpenVSCode = async () => {
    const result = await openProjectInEditor(project.id);
    if (!result.success) {
      toast.error('Failed to open in editor', {
        description: result.error || 'Unknown error',
      });
    }
  };

  return (
    <div className="group from-primary/5 via-background to-background hover:border-primary/30 relative overflow-hidden rounded-lg border bg-linear-to-br p-4 transition-all hover:shadow-lg">
      <div className="flex items-center gap-4">
        {/* Project icon */}
        <div className="shrink-0">
          <div className="bg-primary/10 ring-primary/20 flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset">
            <ProjectIcon projectType={project.type} className="h-7 w-7" />
          </div>
        </div>

        {/* Project info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{project.name}</h3>
            <div className="flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
          <p className="text-muted-foreground/80 truncate font-mono text-xs">{project.domain}</p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleOpenBrowser}
            title="Open in Browser"
          >
            <Globe className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleOpenVSCode}
            title="Open in VS Code"
          >
            <Code2 className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9" asChild title="View Details">
            <Link to="/projects/$projectId" params={{ projectId: project.id }}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
