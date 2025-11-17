import { routeTree } from '@/routeTree.gen';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

export interface RouterContext {
  queryClient: QueryClient;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const router = createRouter({
  defaultPendingMinMs: 0,
  defaultPreload: 'intent',
  routeTree,
  history: createMemoryHistory({
    initialEntries: ['/'],
  }),
  context: undefined as any, // Will be set when we provide the router
});
