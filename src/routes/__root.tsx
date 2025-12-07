import BaseLayout from '@/layouts/BaseLayout';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { RouterContext } from '@/utils/routes';
import { useSyncProgress } from '../api/sync/sync-queries';

function Root() {
  // Register sync progress listener once at app level
  useSyncProgress();
  return (
    <BaseLayout>
      <Outlet />
      {/* Uncomment the following line to enable the router devtools */}
      <TanStackRouterDevtools position="bottom-right" />
      {/* Uncomment the following line to enable the React Query devtools */}
      <ReactQueryDevtools buttonPosition="top-right" />
    </BaseLayout>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});
