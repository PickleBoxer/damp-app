import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { syncThemeWithLocal } from './helpers/theme_helpers';
import { useTranslation } from 'react-i18next';
import { updateAppLanguage } from './helpers/language_helpers';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './utils/routes';
import './localization/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000, // Data stays fresh for 5 seconds
      gcTime: 10 * 60 * 1000, // Cache for 10 minutes (formerly cacheTime)
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: true, // Refetch on window focus by default
    },
  },
});

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    syncThemeWithLocal();
    updateAppLanguage(i18n);

    // Listen for system theme changes from Electron
    if (window.themeMode?.onUpdated) {
      const cleanup = window.themeMode.onUpdated((isDark: boolean) => {
        // Check if user is using system theme
        const localTheme = localStorage.getItem('theme');
        if (localTheme === 'system') {
          // Update document theme class when system theme changes
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      });

      return cleanup;
    }
  }, [i18n]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>
  );
}

const root = createRoot(document.getElementById('app')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
