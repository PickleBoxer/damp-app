/**
 * Logs context bridge
 * Exposes project log streaming API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  LOGS_START_CHANNEL,
  LOGS_STOP_CHANNEL,
  LOGS_LINE_CHANNEL,
  LOGS_READ_FILE_CHANNEL,
  LOGS_TAIL_FILE_CHANNEL,
} from './logs-channels';

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

  /**
   * Read log file from container
   */
  readFile: (
    projectId: string,
    filePath: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>;

  /**
   * Tail log file from container (last N lines)
   */
  tailFile: (
    projectId: string,
    filePath: string,
    lines?: number
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
}

export function exposeLogsContext(): void {
  const logsContext: ProjectLogsContext = {
    start: (projectId: string) => ipcRenderer.invoke(LOGS_START_CHANNEL, projectId),
    stop: (projectId: string) => ipcRenderer.invoke(LOGS_STOP_CHANNEL, projectId),
    readFile: (projectId: string, filePath: string) =>
      ipcRenderer.invoke(LOGS_READ_FILE_CHANNEL, projectId, filePath),
    tailFile: (projectId: string, filePath: string, lines = 100) =>
      ipcRenderer.invoke(LOGS_TAIL_FILE_CHANNEL, projectId, filePath, lines),
    onLine: (callback: (log: LogLine) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, log: LogLine) => callback(log);
      ipcRenderer.on(LOGS_LINE_CHANNEL, listener);
      return () => {
        ipcRenderer.removeListener(LOGS_LINE_CHANNEL, listener);
      };
    },
  };

  contextBridge.exposeInMainWorld('projectLogs', logsContext);
}
