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
    // Initialize theme from localStorage or default to system
    const initTheme = async () => {
      const localTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      await setTheme(localTheme || 'system');
    };

    initTheme();

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
  }, [setTheme]);

  return {
    themeMode,
    resolvedTheme: theme,
    setTheme,
  };
}
