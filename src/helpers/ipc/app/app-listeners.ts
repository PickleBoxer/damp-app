import { ipcMain, app } from 'electron';
import { APP_GET_INFO_CHANNEL } from './app-channels';
import type { AppInfo } from './app-context';

let appListenersAdded = false;

export function addAppEventListeners() {
  // Prevent duplicate registrations
  if (appListenersAdded) {
    return;
  }

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

  appListenersAdded = true;
}
