import { Globe, Home, Server } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { cn } from '@renderer/components/lib/utils';

export default function Sidebar() {
  const location = useRouterState({ select: s => s.location });
  const isActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  const navItems = [
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
                      'text-muted-foreground flex h-[35px] w-[35px] items-center justify-center transition-colors',
                      'hover:text-foreground',
                      active && 'text-foreground border-foreground border-r-2'
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </nav>
  );
}
