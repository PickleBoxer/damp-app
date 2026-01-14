import { useCallback, useMemo, useState } from 'react';

const PANEL_SIZES_PREFIX = 'panel-sizes';

export function usePanelSizes(routeKey: string, defaultSizes: number[]) {
  const storageKey = `${PANEL_SIZES_PREFIX}-${routeKey}`;
  const [resetKey, setResetKey] = useState(0);

  // Get initial sizes from localStorage, re-calculate when resetKey changes
  const initialSizes = useMemo((): number[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultSizes;
    } catch {
      return defaultSizes;
    }
  }, [storageKey, defaultSizes]);

  const saveSizes = useCallback(
    (newSizes: number[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newSizes));
      } catch {
        // Silently fail if localStorage is unavailable
      }
    },
    [storageKey]
  );

  const resetSizes = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaultSizes));
      setResetKey(prev => prev + 1);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [defaultSizes, storageKey]);

  const equalSplit = useCallback(() => {
    const targetRoute = routeKey === 'services' ? 'projects' : 'services';
    const targetKey = `${PANEL_SIZES_PREFIX}-${targetRoute}`;

    try {
      const currentSizes = localStorage.getItem(storageKey);
      if (currentSizes) {
        localStorage.setItem(targetKey, currentSizes);
      }
      setResetKey(prev => prev + 1);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [routeKey, storageKey]);

  return { initialSizes, saveSizes, resetSizes, equalSplit, resetKey };
}
