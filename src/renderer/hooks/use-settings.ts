import { useState, useEffect } from 'react';
import { getSettings } from '@renderer/utils/settings';
import type { AppSettings } from '@shared/types/settings';

/**
 * Hook to manage app settings with async loading and reactive updates
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial settings
    getSettings()
      .then(loadedSettings => {
        setSettings(loadedSettings);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
        setIsLoading(false);
      });

    // Listen for settings changes from other components
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>;
      setSettings(customEvent.detail);
    };

    window.addEventListener('settings-changed', handleSettingsChange);

    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange);
    };
  }, []);

  return { settings, isLoading, hasNgrokToken: !!settings?.ngrokAuthToken };
}
