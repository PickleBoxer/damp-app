import BaseLayout from '@/layouts/BaseLayout';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { RouterContext } from '@/utils/routes';

function Root() {
  return (
    <BaseLayout>
      <Outlet />
      {/* Uncomment the following line to enable the router devtools */}
      <TanStackRouterDevtools />
      {/* Uncomment the following line to enable the React Query devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </BaseLayout>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});
