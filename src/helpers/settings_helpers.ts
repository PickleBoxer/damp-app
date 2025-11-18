/**
 * Settings helpers - localStorage persistence for app settings
 */

import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = 'damp-settings';

/**
 * Get all settings from localStorage
 */
export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save all settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Update specific settings fields
 */
export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
}

/**
 * Get default editor command
 */
export function getDefaultEditor(): string {
  const settings = getSettings();
  return settings.defaultEditor;
}

/**
 * Get default terminal choice
 */
export function getDefaultTerminal(): string {
  const settings = getSettings();
  return settings.defaultTerminal;
}
