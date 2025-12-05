import { contextBridge, ipcRenderer } from 'electron';
import {
  SHELL_OPEN_FOLDER_CHANNEL,
  SHELL_OPEN_BROWSER_CHANNEL,
  SHELL_OPEN_EDITOR_CHANNEL,
  SHELL_OPEN_TERMINAL_CHANNEL,
  SHELL_OPEN_HOME_TERMINAL_CHANNEL,
  SHELL_OPEN_TINKER_CHANNEL,
  SHELL_OPEN_URL_CHANNEL,
  SHELL_GET_SETTINGS_CHANNEL,
} from './shell-channels';

export interface ShellOperationResult {
  success: boolean;
  error?: string;
}

export interface ShellSettings {
  defaultEditor: string;
  defaultTerminal: string;
}

export interface ShellContext {
  openFolder: (projectId: string) => Promise<ShellOperationResult>;
  openBrowser: (projectId: string) => Promise<ShellOperationResult>;
  openEditor: (projectId: string, settings?: ShellSettings) => Promise<ShellOperationResult>;
  openTerminal: (projectId: string, settings?: ShellSettings) => Promise<ShellOperationResult>;
  openHomeTerminal: (settings?: ShellSettings) => Promise<ShellOperationResult>;
  openTinker: (projectId: string, settings?: ShellSettings) => Promise<ShellOperationResult>;
  openUrl: (url: string) => Promise<ShellOperationResult>;
}

export function exposeShellContext() {
  contextBridge.exposeInMainWorld('shell', {
    openFolder: (projectId: string) => ipcRenderer.invoke(SHELL_OPEN_FOLDER_CHANNEL, projectId),
    openBrowser: (projectId: string) => ipcRenderer.invoke(SHELL_OPEN_BROWSER_CHANNEL, projectId),
    openEditor: (projectId: string, settings?: ShellSettings) =>
      ipcRenderer.invoke(SHELL_OPEN_EDITOR_CHANNEL, projectId, settings),
    openTerminal: (projectId: string, settings?: ShellSettings) =>
      ipcRenderer.invoke(SHELL_OPEN_TERMINAL_CHANNEL, projectId, settings),
    openHomeTerminal: (settings?: ShellSettings) =>
      ipcRenderer.invoke(SHELL_OPEN_HOME_TERMINAL_CHANNEL, settings),
    openTinker: (projectId: string, settings?: ShellSettings) =>
      ipcRenderer.invoke(SHELL_OPEN_TINKER_CHANNEL, projectId, settings),
    openUrl: (url: string) => ipcRenderer.invoke(SHELL_OPEN_URL_CHANNEL, url),
  });
}
