import { Outlet, createRootRouteWithContext, Link } from '@tanstack/react-router';
//import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
//import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useSyncProgress } from '@renderer/hooks/use-sync';
import { useDockerEvents } from '@renderer/hooks/use-docker-events';
import AppHeader from '@renderer/components/layout/AppHeader';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@renderer/components/ui/empty';
import { Button } from '@renderer/components/ui/button';
import Sidebar from '@renderer/components/layout/Sidebar';
import Footer from '@renderer/components/layout/Footer';
import CaddyStatusBanner from '@renderer/components/CaddyStatusBanner';
import { Toaster } from 'sonner';
import { useTheme } from '@renderer/hooks/use-theme';
import type { QueryClient } from '@tanstack/react-query';

function RootComponent() {
  // Register sync progress listener once at app level
  useSyncProgress();
  // Register Docker container events listener once at app level (projects + services)
  useDockerEvents();
  const { resolvedTheme } = useTheme();

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
        <EmptyDescription>The page you're looking for doesn't exist.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/">
          <Button>Go Home</Button>
        </Link>
      </EmptyContent>
    </Empty>
  ),
});
