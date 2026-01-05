/**
 * Docker events context bridge API
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  DOCKER_EVENTS_START_CHANNEL,
  DOCKER_EVENTS_STOP_CHANNEL,
  DOCKER_EVENT_CHANNEL,
  DOCKER_EVENTS_CONNECTION_STATUS_CHANNEL,
} from './docker-events-channels';

export interface DockerContainerEvent {
  containerId: string;
  action: 'start' | 'stop' | 'die' | 'health_status' | 'kill' | 'pause' | 'unpause' | 'restart';
  timestamp: number;
}

export interface DockerEventsConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastError?: string;
  timestamp: number;
}

export function exposeDockerEventsContext() {
  contextBridge.exposeInMainWorld('dockerEvents', {
    /**
     * Start monitoring Docker container events
     */
    start: () => ipcRenderer.invoke(DOCKER_EVENTS_START_CHANNEL),

    /**
     * Stop monitoring Docker container events
     */
    stop: () => ipcRenderer.invoke(DOCKER_EVENTS_STOP_CHANNEL),

    /**
     * Subscribe to Docker container events
     * @param callback Function to call when an event occurs
     * @returns Cleanup function to unsubscribe
     */
    onEvent: (callback: (event: DockerContainerEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: DockerContainerEvent) => {
        callback(data);
      };

      ipcRenderer.on(DOCKER_EVENT_CHANNEL, listener);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(DOCKER_EVENT_CHANNEL, listener);
      };
    },

    /**
     * Subscribe to Docker events connection status changes
     * @param callback Function to call when connection status changes
     * @returns Cleanup function to unsubscribe
     */
    onConnectionStatus: (callback: (status: DockerEventsConnectionStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: DockerEventsConnectionStatus) => {
        callback(data);
      };

      ipcRenderer.on(DOCKER_EVENTS_CONNECTION_STATUS_CHANNEL, listener);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(DOCKER_EVENTS_CONNECTION_STATUS_CHANNEL, listener);
      };
    },
  });
}
