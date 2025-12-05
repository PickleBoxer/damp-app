import { contextBridge, ipcRenderer } from 'electron';
import { APP_GET_INFO_CHANNEL } from './app-channels';

export interface AppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  v8Version: string;
}

export function exposeAppContext() {
  contextBridge.exposeInMainWorld('app', {
    getInfo: () => ipcRenderer.invoke(APP_GET_INFO_CHANNEL),
  });
}
