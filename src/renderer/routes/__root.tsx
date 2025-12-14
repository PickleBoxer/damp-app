import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { RouterContext } from '@renderer/utils/routes';
import { useSyncProgress } from '@renderer/queries/sync/sync-queries';
import DragWindowRegion from '@renderer/components/DragWindowRegion';
import Sidebar from '@renderer/components/layout/Sidebar';
import Footer from '@renderer/components/layout/Footer';
import CaddyStatusBanner from '@renderer/components/CaddyStatusBanner';
import { Toaster } from 'sonner';
import { useTheme } from '@renderer/hooks/use-theme';

function Root() {
  // Register sync progress listener once at app level
  useSyncProgress();
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <DragWindowRegion />
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
      <TanStackRouterDevtools position="bottom-right" />
      {/* Uncomment the following line to enable the React Query devtools */}
      <ReactQueryDevtools buttonPosition="top-right" />
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});
