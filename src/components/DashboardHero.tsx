/**
 * Dashboard hero section with welcome message and animation
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sparkles, Zap } from 'lucide-react';

export default function DashboardHero() {
  const { t } = useTranslation();

  const { data: appInfo } = useQuery({
    queryKey: ['app', 'info'],
    queryFn: async () => {
      const info = await (globalThis as unknown as Window).app.getInfo();
      return info;
    },
    staleTime: Infinity,
  });

  return (
    <div className="from-primary/10 via-primary/5 to-background relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8">
      {/* Animated background elements */}
      <div className="bg-primary/5 absolute -top-10 -right-10 h-40 w-40 animate-pulse rounded-full blur-3xl" />
      <div className="bg-primary/5 absolute -bottom-10 -left-10 h-40 w-40 animate-pulse rounded-full blur-3xl delay-700" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="space-y-3">
          <div className="bg-primary/10 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
            <Sparkles className="text-primary h-4 w-4 animate-pulse" />
            <span className="text-primary">Welcome back!</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight">{t('appName')}</h1>

          <p className="text-muted-foreground max-w-2xl text-lg">
            Your local development environment powered by Docker. Manage services, projects, and
            deployments all in one place.
          </p>

          {appInfo && (
            <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              <span>Version {appInfo.appVersion}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Electron {appInfo.electronVersion}</span>
            </div>
          )}
        </div>

        {/* Decorative graphic */}
        <div className="hidden lg:block">
          <div className="relative h-32 w-32">
            <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full opacity-20" />
            <div className="bg-primary/30 absolute inset-4 animate-pulse rounded-full" />
            <div className="bg-primary absolute inset-8 flex items-center justify-center rounded-full">
              <Sparkles className="h-12 w-12 animate-pulse text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
