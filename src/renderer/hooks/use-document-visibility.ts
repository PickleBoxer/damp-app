/**
 * Hook to track document visibility state
 * Useful for pausing polling when user switches tabs/windows
 */

import { useState, useEffect } from 'react';

/**
 * Returns true if the document is currently visible (user is viewing the tab)
 * Updates automatically when visibility changes
 */
export function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
