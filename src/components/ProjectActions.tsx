/**
 * Project Actions Component
 * Action buttons for project operations
 */

import { FolderOpen, Copy, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Project } from '../types/project';

interface ProjectActionsProps {
  project: Project;
  onOpenVSCode?: () => void;
  onCopyToVolume?: () => void;
  onDelete?: () => void;
}

export function ProjectActions({
  project,
  onOpenVSCode,
  onCopyToVolume,
  onDelete,
}: Readonly<ProjectActionsProps>) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onOpenVSCode ? () => onOpenVSCode() : undefined}
        disabled={!project.devcontainerCreated}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        Open in VS Code
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" aria-label="More actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onCopyToVolume?.()}
            disabled={!project.devcontainerCreated}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy to Volume
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
