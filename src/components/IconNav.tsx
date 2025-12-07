import { Globe, Home, Server } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/components/lib/utils';

export default function IconNav() {
  const { t } = useTranslation();
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
      label: t('titleDashboardPage'),
    },
    {
      to: '/services',
      icon: Server,
      label: t('titleServicesPage'),
    },
    {
      to: '/projects',
      icon: Globe,
      label: t('titleProjectsPage'),
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
                      'flex h-[35px] w-[35px] items-center justify-center transition-colors text-muted-foreground',
                      'hover:text-foreground',
                      active && 'text-foreground border-r-2 border-foreground'
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
