/**
 * Project Icon Component
 * Displays appropriate icon based on project type
 */

import { Code2, Package } from 'lucide-react';
import type { ProjectType } from '../types/project';

interface ProjectIconProps {
  projectType: ProjectType;
  className?: string;
}

export function ProjectIcon({ projectType, className = 'h-6 w-6' }: Readonly<ProjectIconProps>) {
  switch (projectType) {
    case 'laravel':
      return (
        <svg
          viewBox="0 0 256 264"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          fill="currentColor"
        >
          <path d="M255.856 59.619l-7.787-14.834-29.983 15.7a54.302 54.302 0 0 0-27.243-7.2c-20.2 0-37.9 10.9-47.6 27.1l-57.3-29.8-8 15.3 50.5 26.3c-2.3 5.5-3.5 11.4-3.5 17.6v87.8l-85.4-44.4c-2.1-1.1-4.8.3-4.8 2.6v21.6c0 1.3.7 2.5 1.9 3.2l91 47.4c8.8 4.6 19.4 5.3 28.7 1.7l94.7-49.4c6.8-3.5 11.1-10.5 11.1-18.1V62.519c0-1.2-.7-2.3-1.8-2.9zM232 164.519c0 3-.3 5.8-1 8.5l-57-29.7v-29.8c0-12.9 8.2-24.3 20.4-28.5l37.6 19.6v60.9z" />
        </svg>
      );
    case 'basic-php':
      return <Code2 className={className} />;
    case 'existing':
      return <Package className={className} />;
    default:
      return <Code2 className={className} />;
  }
}
