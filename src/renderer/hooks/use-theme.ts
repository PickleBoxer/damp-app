import { useState, useEffect, useCallback } from 'react';
import { ThemeMode } from '@shared/types/theme-mode';

const THEME_KEY = 'theme';

function updateDocumentTheme(isDarkMode: boolean) {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Hook to manage theme state and switching
 * Handles initialization, system theme sync, and provides theme controls
 */
export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system';
  });

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    switch (newTheme) {
      case 'dark':
        await window.themeMode.dark();
        updateDocumentTheme(true);
        break;
      case 'light':
        await window.themeMode.light();
        updateDocumentTheme(false);
        break;
      case 'system': {
        const isDarkMode = await window.themeMode.system();
        updateDocumentTheme(isDarkMode);
        break;
      }
    }
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  useEffect(() => {
    // Sync Electron nativeTheme with localStorage on mount
    // DOM class is already correct (set by inline script in index.html)
    const syncNativeTheme = async () => {
      const localTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      const targetTheme = localTheme || 'system';

      // Sync Electron nativeTheme.themeSource without changing DOM
      try {
        if (targetTheme === 'dark') {
          await window.themeMode.dark();
        } else if (targetTheme === 'light') {
          await window.themeMode.light();
        } else {
          await window.themeMode.system();
        }
      } catch (error) {
        console.error('Failed to sync nativeTheme:', error);
      }
    };

    syncNativeTheme();

    // Watch for class changes on document element
    const updateThemeState = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setThemeState(isDark ? 'dark' : 'light');
    };

    const observer = new MutationObserver(updateThemeState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Listen for system theme changes from Electron
    let cleanup: (() => void) | undefined;
    if (window.themeMode?.onUpdated) {
      cleanup = window.themeMode.onUpdated((isDark: boolean) => {
        const localTheme = localStorage.getItem(THEME_KEY);
        if (localTheme === 'system') {
          updateDocumentTheme(isDark);
        }
      });
    }

    return () => {
      observer.disconnect();
      cleanup?.();
    };
  }, []);

  return {
    themeMode,
    resolvedTheme: theme,
    setTheme,
  };
}
