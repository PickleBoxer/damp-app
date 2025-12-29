import { useCallback, useState } from 'react';

const PANEL_SIZES_PREFIX = 'panel-sizes';

export function usePanelSizes(routeKey: string, defaultSizes: number[]) {
  const storageKey = `${PANEL_SIZES_PREFIX}-${routeKey}`;

  const getStoredSizes = useCallback((): number[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultSizes;
    } catch {
      return defaultSizes;
    }
  }, [storageKey, defaultSizes]);

  const [sizes] = useState(getStoredSizes);

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

  return { sizes, saveSizes };
}
