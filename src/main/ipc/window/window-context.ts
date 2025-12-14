import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronWindow } from '@shared/types/ipc';
import {
  WIN_MINIMIZE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_CLOSE_CHANNEL,
  WIN_OPEN_EXTERNAL_CHANNEL,
} from './window-channels';

export function exposeWindowContext() {
  const windowApi: ElectronWindow = {
    minimize: () => ipcRenderer.invoke(WIN_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WIN_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WIN_CLOSE_CHANNEL),
    openExternal: (url: string) => ipcRenderer.invoke(WIN_OPEN_EXTERNAL_CHANNEL, url),
  };

  contextBridge.exposeInMainWorld('electronWindow', windowApi);
}
