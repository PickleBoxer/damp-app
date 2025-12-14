import { contextBridge, ipcRenderer } from 'electron';
import type { ThemeModeContext } from '@shared/types/ipc';
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
  THEME_MODE_UPDATED_CHANNEL,
} from './theme-channels';

export function exposeThemeContext() {
  const themeApi: ThemeModeContext = {
    current: () => ipcRenderer.invoke(THEME_MODE_CURRENT_CHANNEL),
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
    dark: () => ipcRenderer.invoke(THEME_MODE_DARK_CHANNEL),
    light: () => ipcRenderer.invoke(THEME_MODE_LIGHT_CHANNEL),
    system: () => ipcRenderer.invoke(THEME_MODE_SYSTEM_CHANNEL),
    onUpdated: (callback: (isDark: boolean) => void) => {
      const listener = (_event: unknown, data: { shouldUseDarkColors: boolean }) => {
        callback(data.shouldUseDarkColors);
      };
      ipcRenderer.on(THEME_MODE_UPDATED_CHANNEL, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.off(THEME_MODE_UPDATED_CHANNEL, listener);
      };
    },
  };

  contextBridge.exposeInMainWorld('themeMode', themeApi);
}
