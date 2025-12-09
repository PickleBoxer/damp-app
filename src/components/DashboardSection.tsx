/**
 * Dashboard section container component
 * Reusable section with header, batch actions, and empty states
 */

import { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface DashboardSectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly isLoading: boolean;
  readonly isEmpty: boolean;
  readonly emptyIcon: LucideIcon;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly viewAllLink: string;
}

export default function DashboardSection({
  title,
  children,
  isLoading,
  isEmpty,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  viewAllLink,
}: Readonly<DashboardSectionProps>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground h-8 gap-1 text-xs"
        >
          <Link to={viewAllLink}>
            View All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-[60px] w-full rounded-lg" />
          </div>
        )}

        {!isLoading && isEmpty && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-muted text-muted-foreground mb-2 flex h-12 w-12 items-center justify-center rounded-full">
                <EmptyIcon className="h-6 w-6" />
              </div>
              <h3 className="font-medium">{emptyTitle}</h3>
              <p className="text-muted-foreground max-w-sm text-sm">{emptyDescription}</p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to={viewAllLink}>Browse {title}</Link>
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isEmpty && <div className="space-y-2">{children}</div>}
      </div>
    </div>
  );
}
