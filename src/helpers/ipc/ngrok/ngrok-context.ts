/**
 * Ngrok context exposure for renderer process
 * Exposes ngrok tunnel operations via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import { NGROK_START_TUNNEL, NGROK_STOP_TUNNEL, NGROK_GET_STATUS } from './ngrok-channels';

export interface NgrokContext {
  startTunnel: (
    projectId: string,
    authToken: string,
    region?: string
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  stopTunnel: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  getStatus: (projectId: string) => Promise<{
    success: boolean;
    data?: { status: string; containerId?: string; error?: string; publicUrl?: string };
    error?: string;
  }>;
}

/**
 * Expose ngrok context to renderer process
 */
export function exposeNgrokContext(): void {
  contextBridge.exposeInMainWorld('ngrok', {
    startTunnel: (projectId: string, authToken: string, region?: string) =>
      ipcRenderer.invoke(NGROK_START_TUNNEL, projectId, authToken, region),
    stopTunnel: (projectId: string) => ipcRenderer.invoke(NGROK_STOP_TUNNEL, projectId),
    getStatus: (projectId: string) => ipcRenderer.invoke(NGROK_GET_STATUS, projectId),
  } as NgrokContext);
}
