import { contextBridge, ipcRenderer } from 'electron';
import type { ShellContext } from '@shared/types/ipc';
import {
  SHELL_OPEN_FOLDER_CHANNEL,
  SHELL_OPEN_EDITOR_CHANNEL,
  SHELL_OPEN_TERMINAL_CHANNEL,
  SHELL_OPEN_HOME_TERMINAL_CHANNEL,
  SHELL_OPEN_TINKER_CHANNEL,
} from './shell-channels';

export interface ShellSettings {
  defaultEditor: string;
  defaultTerminal: string;
}

export interface ShellOperationResult {
  success: boolean;
  error?: string;
}

export function exposeShellContext() {
  const shellApi: ShellContext = {
    openFolder: (projectId: string) => ipcRenderer.invoke(SHELL_OPEN_FOLDER_CHANNEL, projectId),
    openEditor: (projectId: string, settings) =>
      ipcRenderer.invoke(SHELL_OPEN_EDITOR_CHANNEL, projectId, settings),
    openTerminal: (projectId: string, settings) =>
      ipcRenderer.invoke(SHELL_OPEN_TERMINAL_CHANNEL, projectId, settings),
    openHomeTerminal: settings => ipcRenderer.invoke(SHELL_OPEN_HOME_TERMINAL_CHANNEL, settings),
    openTinker: (projectId: string, settings) =>
      ipcRenderer.invoke(SHELL_OPEN_TINKER_CHANNEL, projectId, settings),
  };

  contextBridge.exposeInMainWorld('shell', shellApi);
}
