import { useState, useEffect } from 'react';
import { getSettings } from '@renderer/utils/settings';
import type { AppSettings } from '@shared/types/settings';

/**
 * Hook to manage app settings with async loading
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then(loadedSettings => {
        setSettings(loadedSettings);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
        setIsLoading(false);
      });
  }, []);

  return { settings, isLoading, hasNgrokToken: !!settings?.ngrokAuthToken };
}
