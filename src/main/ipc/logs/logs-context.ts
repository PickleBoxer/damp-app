/**
 * Logs context bridge
 * Exposes project log streaming API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { LOGS_START_CHANNEL, LOGS_STOP_CHANNEL, LOGS_LINE_CHANNEL } from './logs-channels';

export interface LogLine {
  projectId: string;
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

export interface ProjectLogsContext {
  /**
   * Start streaming logs for a project
   */
  start: (projectId: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * Stop streaming logs for a project
   */
  stop: (projectId: string) => Promise<void>;

  /**
   * Listen for log lines
   */
  onLine: (callback: (log: LogLine) => void) => () => void;
}

export function exposeLogsContext(): void {
  const logsContext: ProjectLogsContext = {
    start: (projectId: string) => ipcRenderer.invoke(LOGS_START_CHANNEL, projectId),
    stop: (projectId: string) => ipcRenderer.invoke(LOGS_STOP_CHANNEL, projectId),
    onLine: (callback: (log: LogLine) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, log: LogLine) => callback(log);
      ipcRenderer.on(LOGS_LINE_CHANNEL, listener);
      return () => {
        ipcRenderer.off(LOGS_LINE_CHANNEL, listener);
      };
    },
  };

  contextBridge.exposeInMainWorld('projectLogs', logsContext);
}
