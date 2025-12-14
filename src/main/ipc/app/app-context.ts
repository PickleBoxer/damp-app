import { contextBridge, ipcRenderer } from 'electron';
import type { AppContext } from '@shared/types/ipc';
import { APP_GET_INFO_CHANNEL } from './app-channels';

export function exposeAppContext() {
  const appApi: AppContext = {
    getInfo: () => ipcRenderer.invoke(APP_GET_INFO_CHANNEL),
  };

  contextBridge.exposeInMainWorld('app', appApi);
}
