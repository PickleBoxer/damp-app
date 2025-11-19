import { useState, useEffect } from 'react';

/**
 * Hook to track the current resolved theme (dark or light)
 * Returns 'dark' or 'light' based on document.documentElement.classList
 */
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    // Initial check
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    // Watch for class changes on the document element
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return { resolvedTheme: theme };
}
