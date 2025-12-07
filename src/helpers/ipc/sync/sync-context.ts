/**
 * Context bridge for sync operations
 * Exposes sync API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { SYNC_FROM_VOLUME, SYNC_TO_VOLUME, SYNC_PROGRESS } from './sync-channels';

export interface SyncOptions {
  includeNodeModules?: boolean;
  includeVendor?: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

export interface SyncContext {
  /**
   * Sync files from Docker volume to local folder
   */
  fromVolume: (projectId: string, options?: SyncOptions) => Promise<SyncResult>;

  /**
   * Sync files from local folder to Docker volume
   */
  toVolume: (projectId: string, options?: SyncOptions) => Promise<SyncResult>;

  /**
   * Listen for sync status updates (started/completed/failed)
   */
  onSyncProgress: (
    callback: (
      projectId: string,
      direction: 'to' | 'from',
      progress: { status: 'started' | 'completed' | 'failed' }
    ) => void
  ) => () => void;
}

export function exposeSyncContext() {
  const syncContext: SyncContext = {
    fromVolume: (projectId: string, options?: SyncOptions) =>
      ipcRenderer.invoke(SYNC_FROM_VOLUME, projectId, options),

    toVolume: (projectId: string, options?: SyncOptions) =>
      ipcRenderer.invoke(SYNC_TO_VOLUME, projectId, options),

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
