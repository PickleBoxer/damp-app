import { ipcMain, app } from 'electron';
import { APP_GET_INFO_CHANNEL } from './app-channels';
import type { AppInfo } from './app-context';

// Prevent duplicate listener registration
let listenersAdded = false;

export function addAppEventListeners() {
  if (listenersAdded) return;
  listenersAdded = true;

  ipcMain.handle(APP_GET_INFO_CHANNEL, async (): Promise<AppInfo> => {
    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
    };
  });
}
