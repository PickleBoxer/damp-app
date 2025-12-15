import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

import './index.css';

// Create QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: true, // Refetch on window focus by default
    },
  },
});

// Set up a Router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  history: createMemoryHistory({
    initialEntries: ['/'],
  }),
  defaultPendingMinMs: 0, // Show pending state immediately
  defaultPreload: 'intent', // Preload on hover/focus
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
});

// Register router for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Render the app
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
