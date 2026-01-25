import { cn } from '@renderer/components/lib/utils';
import { Badge } from '@renderer/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { getOrphanCount, getUpdateCount, resourcesQueryOptions } from '@renderer/resources';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { Container, Globe, Home, Server } from 'lucide-react';

export default function Sidebar() {
  const location = useRouterState({ select: s => s.location });
  const isActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  // Get resource counts for badge
  const { data: resources = [] } = useQuery(resourcesQueryOptions());
  const orphanCount = getOrphanCount(resources);
  const updateCount = getUpdateCount(resources);
  const resourceBadgeCount = orphanCount + updateCount;

  const navItems = [
    {
      to: '/',
      icon: Home,
      label: 'Dashboard',
      badge: null,
    },
    {
      to: '/services',
      icon: Server,
      label: 'Services',
      badge: null,
    },
    {
      to: '/projects',
      icon: Globe,
      label: 'Projects',
      badge: null,
    },
    {
      to: '/resources',
      icon: Container,
      label: 'Resources',
      badge: resourceBadgeCount > 0 ? resourceBadgeCount : null,
    },
  ];

  return (
    <nav className="bg-background flex h-full w-[35px] flex-col items-center border-r">
      {/* Navigation Items */}
      <div className="flex flex-1 flex-col">
        <TooltipProvider delayDuration={0}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.to);

            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    className={cn(
                      'text-muted-foreground relative flex h-[35px] w-[35px] items-center justify-center transition-colors',
                      'hover:text-foreground hover:bg-accent/50',
                      active && 'text-foreground bg-accent'
                    )}
                  >
                    <Icon className="size-4" />
                    {item.badge && (
                      <Badge
                        variant="outline"
                        className="absolute right-0 bottom-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div>
                    <p>{item.label}</p>
                    {item.to === '/resources' && resourceBadgeCount > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {orphanCount > 0 && `${orphanCount} orphan${orphanCount > 1 ? 's' : ''}`}
                        {orphanCount > 0 && updateCount > 0 && ', '}
                        {updateCount > 0 && `${updateCount} update${updateCount > 1 ? 's' : ''}`}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </nav>
  );
}
