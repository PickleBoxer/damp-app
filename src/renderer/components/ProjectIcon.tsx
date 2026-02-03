/**
 * Project Icon Component
 * Displays appropriate icon based on project type
 */

import type { ProjectType } from '@shared/types/project';
import { IconCode } from '@tabler/icons-react';
import { SiLaravel, SiPhp } from 'react-icons/si';

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
      return <IconCode className={className} />;
    default:
      return <IconCode className={className} />;
  }
}
