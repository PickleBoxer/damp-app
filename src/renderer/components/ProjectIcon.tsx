/**
 * Project Icon Component
 * Displays appropriate icon based on project type
 */

import { Code2 } from 'lucide-react';
import { SiLaravel, SiPhp } from 'react-icons/si';
import type { ProjectType } from '@shared/types/project';

interface ProjectIconProps {
  projectType: ProjectType;
  className?: string;
}

export function ProjectIcon({ projectType, className = 'h-6 w-6' }: Readonly<ProjectIconProps>) {
  switch (projectType) {
    case 'laravel':
      return <SiLaravel className={`${className} text-[#FF2D20]`} />;
    case 'basic-php':
      return <SiPhp className={`${className} text-[#777BB4]`} />;
    case 'existing':
      return <Code2 className={className} />;
    default:
      return <Code2 className={className} />;
  }
}
