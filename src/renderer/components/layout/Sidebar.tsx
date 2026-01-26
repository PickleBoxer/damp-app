import { cn } from '@renderer/components/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { Link, useRouterState } from '@tanstack/react-router';
import { Container, Globe, Home, Server } from 'lucide-react';
import type { FC } from 'react';
import { ResourcesBadge, ResourcesBadgeTooltip } from './ResourcesBadge';

interface NavItem {
  to: string;
  icon: FC<{ className?: string }>;
  label: string;
  badge?: FC;
  badgeTooltip?: FC;
}

export default function Sidebar() {
  const location = useRouterState({ select: s => s.location });
  const isActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  const navItems: NavItem[] = [
    {
      to: '/',
      icon: Home,
      label: 'Dashboard',
    },
    {
      to: '/services',
      icon: Server,
      label: 'Services',
    },
    {
      to: '/projects',
      icon: Globe,
      label: 'Projects',
    },
    {
      to: '/resources',
      icon: Container,
      label: 'Resources',
      badge: ResourcesBadge,
      badgeTooltip: ResourcesBadgeTooltip,
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
            const BadgeComponent = item.badge;
            const BadgeTooltipComponent = item.badgeTooltip;

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
                    {BadgeComponent && <BadgeComponent />}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div>
                    <p>{item.label}</p>
                    {BadgeTooltipComponent && <BadgeTooltipComponent />}
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
