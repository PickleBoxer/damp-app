/**
 * Settings helpers - localStorage + secure storage for app settings
 * Sensitive fields (ngrokAuthToken) are stored encrypted via Electron safeStorage
 */

import type { AppSettings } from '@shared/types/settings';
import { DEFAULT_SETTINGS } from '@shared/types/settings';

const SETTINGS_KEY = 'damp-settings';
const NGROK_TOKEN_KEY = 'ngrok-auth-token';

/**
 * Get all settings from localStorage (non-sensitive) and secure storage (sensitive)
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const parsed = stored ? (JSON.parse(stored) as Partial<AppSettings>) : {};

    // Merge with defaults
    const settings = { ...DEFAULT_SETTINGS, ...parsed };

    // Fetch ngrok token from secure storage
    const tokenResult = await window.secureStorage.getSecret(NGROK_TOKEN_KEY);
    if (tokenResult.success && tokenResult.value) {
      settings.ngrokAuthToken = tokenResult.value;
    }

    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save all settings - sensitive fields go to secure storage, others to localStorage
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  // Extract ngrok token for secure storage
  const { ngrokAuthToken, ...nonSensitiveSettings } = settings;

  // Save non-sensitive settings to localStorage
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nonSensitiveSettings));

  // Save or delete ngrok token in secure storage
  if (ngrokAuthToken) {
    await window.secureStorage.saveSecret(NGROK_TOKEN_KEY, ngrokAuthToken);
  } else {
    await window.secureStorage.deleteSecret(NGROK_TOKEN_KEY);
  }
}

/**
 * Update specific settings fields
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await saveSettings(updated);

  // Dispatch custom event to notify all listeners
  window.dispatchEvent(new CustomEvent('settings-changed', { detail: updated }));

  return updated;
}
