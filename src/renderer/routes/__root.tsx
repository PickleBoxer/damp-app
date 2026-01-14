import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
//import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
//import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import CaddyStatusBanner from '@renderer/components/CaddyStatusBanner';
import AppHeader from '@renderer/components/layout/AppHeader';
import Footer from '@renderer/components/layout/Footer';
import Sidebar from '@renderer/components/layout/Sidebar';
import { Button } from '@renderer/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@renderer/components/ui/empty';
import { useCustomCss } from '@renderer/hooks/use-custom-css';
import { useDockerEvents } from '@renderer/hooks/use-docker-events';
import { useSyncProgress } from '@renderer/hooks/use-sync';
import { useTheme } from '@renderer/hooks/use-theme';
import type { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

function RootComponent() {
  // Register sync progress listener once at app level
  useSyncProgress();
  // Register Docker container events listener once at app level (projects + services)
  useDockerEvents();
  const { resolvedTheme } = useTheme();
  // Apply custom CSS from settings
  useCustomCss();

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex flex-1 flex-col">
          <CaddyStatusBanner />
          <Outlet />
        </main>
      </div>
      <Footer />
      <Toaster
        position="bottom-right"
        theme={resolvedTheme}
        richColors
        closeButton
        expand={false}
        visibleToasts={5}
        toastOptions={{
          style: {
            pointerEvents: 'auto',
            padding: '8px 12px',
            minHeight: '40px',
            fontSize: '11px',
            borderRadius: '0',
          },
        }}
      />
      {/* Uncomment the following line to enable the router devtools */}
      {/* <TanStackRouterDevtools position="bottom-right" /> */}
      {/* Uncomment the following line to enable the React Query devtools */}
      {/*<ReactQueryDevtools buttonPosition="top-right" /> */}
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: () => (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Page Not Found</EmptyTitle>
        <EmptyDescription>The page you&apos;re looking for doesn&apos;t exist.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/">
          <Button>Go Home</Button>
        </Link>
      </EmptyContent>
    </Empty>
  ),
});
