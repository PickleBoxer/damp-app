import { contextBridge, ipcRenderer } from 'electron';
import type { UpdaterContext } from '@shared/types/ipc';
import type { UpdateState, DownloadProgress } from '@shared/types/updater';
import {
  UPDATER_CHECK_CHANNEL,
  UPDATER_INSTALL_CHANNEL,
  UPDATER_STATUS_CHANNEL,
  UPDATER_SKIP_VERSION_CHANNEL,
  UPDATER_PROGRESS_CHANNEL,
  UPDATER_STATUS_CHANGED_CHANNEL,
  UPDATER_ERROR_CHANNEL,
} from './updater-channels';

export function exposeUpdaterContext() {
  const updaterApi: UpdaterContext = {
    checkForUpdates: () => ipcRenderer.invoke(UPDATER_CHECK_CHANNEL),
    quitAndInstall: () => ipcRenderer.invoke(UPDATER_INSTALL_CHANNEL),
    getStatus: () => ipcRenderer.invoke(UPDATER_STATUS_CHANNEL),
    skipVersion: (version: string) => ipcRenderer.invoke(UPDATER_SKIP_VERSION_CHANNEL, version),
    onProgress: (callback: (progress: DownloadProgress) => void) => {
      const listener = (_event: unknown, progress: DownloadProgress) => {
        callback(progress);
      };
      ipcRenderer.on(UPDATER_PROGRESS_CHANNEL, listener);
      return () => ipcRenderer.off(UPDATER_PROGRESS_CHANNEL, listener);
    },
    onStatusChange: (callback: (state: UpdateState) => void) => {
      const listener = (_event: unknown, state: UpdateState) => {
        callback(state);
      };
      ipcRenderer.on(UPDATER_STATUS_CHANGED_CHANNEL, listener);
      return () => ipcRenderer.off(UPDATER_STATUS_CHANGED_CHANNEL, listener);
    },
    onError: (callback: (error: { message: string; code?: string }) => void) => {
      const listener = (_event: unknown, error: { message: string; code?: string }) => {
        callback(error);
      };
      ipcRenderer.on(UPDATER_ERROR_CHANNEL, listener);
      return () => ipcRenderer.off(UPDATER_ERROR_CHANNEL, listener);
    },
  };

  contextBridge.exposeInMainWorld('updater', updaterApi);
}
