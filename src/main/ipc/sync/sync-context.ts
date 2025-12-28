/**
 * Context bridge for sync operations
 * Exposes sync API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { SyncContext } from '@shared/types/ipc';
import { SYNC_FROM_VOLUME, SYNC_TO_VOLUME, SYNC_CANCEL, SYNC_PROGRESS } from './sync-channels';

// Define types locally to match SyncContext interface
interface SyncOptions {
  includeNodeModules?: boolean;
  includeVendor?: boolean;
}

export function exposeSyncContext() {
  const syncContext: SyncContext = {
    fromVolume: (projectId: string, options?: SyncOptions) =>
      ipcRenderer.invoke(SYNC_FROM_VOLUME, projectId, options),

    toVolume: (projectId: string, options?: SyncOptions) =>
      ipcRenderer.invoke(SYNC_TO_VOLUME, projectId, options),

    cancel: (projectId: string) => ipcRenderer.invoke(SYNC_CANCEL, projectId),

    onSyncProgress: callback => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        projectId: string,
        direction: 'to' | 'from',
        progress: { status: 'started' | 'completed' | 'failed' }
      ) => {
        callback(projectId, direction, progress);
      };

      ipcRenderer.on(SYNC_PROGRESS, listener);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(SYNC_PROGRESS, listener);
      };
    },
  };

  contextBridge.exposeInMainWorld('sync', syncContext);
}
