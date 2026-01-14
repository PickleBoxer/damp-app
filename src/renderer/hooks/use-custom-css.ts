/**
 * Custom CSS hook - injects user's custom CSS into document head
 * Appends style tag at END of head to ensure cascade override
 */

import { useEffect } from 'react';
import { useSettings } from './use-settings';

const STYLE_ID = 'user-custom-css';

export function useCustomCss() {
  const { settings } = useSettings();

  useEffect(() => {
    // Find or create style element
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      // Append to END of head for highest cascade priority
      document.head.appendChild(styleEl);
    }

    // Update style content
    styleEl.textContent = settings?.customCss || '';
  }, [settings?.customCss]);

  // Listen for settings-changed events to re-apply CSS
  useEffect(() => {
    const handleSettingsChanged = (event: CustomEvent) => {
      const styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (styleEl && event.detail?.customCss !== undefined) {
        styleEl.textContent = event.detail.customCss || '';
      }
    };

    globalThis.addEventListener('settings-changed', handleSettingsChanged as EventListener);

    return () => {
      globalThis.removeEventListener('settings-changed', handleSettingsChanged as EventListener);
    };
  }, []);
}
