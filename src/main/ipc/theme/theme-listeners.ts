import { nativeTheme, BrowserWindow, ipcMain } from 'electron';
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
  THEME_MODE_UPDATED_CHANNEL,
} from './theme-channels';

let themeListenersAdded = false;

export function addThemeEventListeners() {
  if (themeListenersAdded) return;
  themeListenersAdded = true;
  ipcMain.handle(THEME_MODE_CURRENT_CHANNEL, () => nativeTheme.themeSource);
  ipcMain.handle(THEME_MODE_TOGGLE_CHANNEL, () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light';
    } else {
      nativeTheme.themeSource = 'dark';
    }
    return nativeTheme.shouldUseDarkColors;
  });
  ipcMain.handle(THEME_MODE_DARK_CHANNEL, () => (nativeTheme.themeSource = 'dark'));
  ipcMain.handle(THEME_MODE_LIGHT_CHANNEL, () => (nativeTheme.themeSource = 'light'));
  ipcMain.handle(THEME_MODE_SYSTEM_CHANNEL, () => {
    nativeTheme.themeSource = 'system';
    return nativeTheme.shouldUseDarkColors;
  });

  // Listen for system theme changes and notify all renderer windows
  nativeTheme.on('updated', () => {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      if (window.isDestroyed()) continue;
      window.webContents.send(THEME_MODE_UPDATED_CHANNEL, {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource,
      });
    }
  });
}
