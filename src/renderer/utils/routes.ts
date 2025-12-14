import { routeTree } from '../routeTree.gen';
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
  defaultPendingMinMs: 0, // Show pending state immediately
  defaultPreload: 'intent', // Preload on hover/focus
  routeTree,
  history: createMemoryHistory({
    initialEntries: ['/'],
  }),
  context: undefined!, // Will be set when we provide the router in App.tsx
});
