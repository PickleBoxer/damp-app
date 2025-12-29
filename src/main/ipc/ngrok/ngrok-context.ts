/**
 * Ngrok context exposure for renderer process
 * Exposes ngrok tunnel operations via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { NgrokContext } from '@shared/types/ipc';
import { NGROK_START_TUNNEL, NGROK_STOP_TUNNEL, NGROK_GET_STATUS } from './ngrok-channels';

/**
 * Expose ngrok context to renderer process
 */
export function exposeNgrokContext(): void {
  const ngrokApi: NgrokContext = {
    startTunnel: (projectId: string, authToken: string, region?: string) =>
      ipcRenderer.invoke(NGROK_START_TUNNEL, projectId, authToken, region),
    stopTunnel: (projectId: string) => ipcRenderer.invoke(NGROK_STOP_TUNNEL, projectId),
    getStatus: (projectId: string) => ipcRenderer.invoke(NGROK_GET_STATUS, projectId),
  };

  contextBridge.exposeInMainWorld('ngrok', ngrokApi);
}
