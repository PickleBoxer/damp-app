import { ipcMain, shell } from 'electron';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { projectStorage } from '../../../services/projects/project-storage';
import type { ShellOperationResult, ShellSettings } from './shell-context';
import {
  SHELL_OPEN_FOLDER_CHANNEL,
  SHELL_OPEN_BROWSER_CHANNEL,
  SHELL_OPEN_EDITOR_CHANNEL,
  SHELL_OPEN_TERMINAL_CHANNEL,
  SHELL_OPEN_HOME_TERMINAL_CHANNEL,
  SHELL_OPEN_TINKER_CHANNEL,
  SHELL_OPEN_URL_CHANNEL,
} from './shell-channels';

const execAsync = promisify(exec);

// Zod schema for project ID validation
const projectIdSchema = z.string().uuid();

// Platform detection
const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';

/**
 * Validate project ID and retrieve project
 */
function getValidatedProject(projectId: string) {
  // Validate UUID format
  const validated = projectIdSchema.parse(projectId);

  // Check if project exists in storage
  const project = projectStorage.getProject(validated);
  if (!project) {
    throw new Error(`Project with ID ${validated} not found`);
  }

  return project;
}

/**
 * Get editor command based on settings
 */
function getEditorCommand(settings?: ShellSettings): string {
  const editor = settings?.defaultEditor || 'code';

  const editorCommands: Record<string, string> = {
    code: 'code',
    'code-insiders': 'code-insiders',
    cursor: 'cursor',
  };

  return editorCommands[editor] || 'code';
}

/**
 * Get terminal command based on settings
 */
function getTerminalCommand(path: string, settings?: ShellSettings): string {
  const terminal = settings?.defaultTerminal || 'wt';

  if (isWindows) {
    const terminalCommands: Record<string, string> = {
      wt: `wt.exe -d "${path}"`,
      powershell: `powershell.exe -NoExit -Command "Set-Location '${path}'"`,
      cmd: `cmd.exe /K "cd /d ${path}"`,
    };
    return terminalCommands[terminal] || terminalCommands.wt;
  }

  if (isMacOS) {
    return `open -a Terminal "${path}"`;
  }

  // Linux
  return `x-terminal-emulator --working-directory="${path}"`;
}

/**
 * Get tinker command based on settings
 */
function getTinkerCommand(path: string, settings?: ShellSettings): string {
  const terminal = settings?.defaultTerminal || 'wt';

  if (isWindows) {
    const tinkerCommands: Record<string, string> = {
      wt: `wt.exe -d "${path}" pwsh -NoExit -Command "php artisan tinker"`,
      powershell: `powershell.exe -NoExit -Command "Set-Location '${path}'; php artisan tinker"`,
      cmd: `cmd.exe /K "cd /d ${path} && php artisan tinker"`,
    };
    return tinkerCommands[terminal] || tinkerCommands.wt;
  }

  if (isMacOS) {
    const script = `tell application "Terminal" to do script "cd '${path}' && php artisan tinker"`;
    return `osascript -e '${script}'`;
  }

  // Linux
  return `x-terminal-emulator --working-directory="${path}" -e "bash -c 'php artisan tinker; exec bash'"`;
}

/**
 * Get default browser command
 * Uses system default browser via Electron shell
 */
async function openInBrowser(url: string): Promise<void> {
  await shell.openExternal(url);
}

export function addShellEventListeners() {
  /**
   * Open project folder in file manager
   */
  ipcMain.handle(
    SHELL_OPEN_FOLDER_CHANNEL,
    async (_event, projectId: string): Promise<ShellOperationResult> => {
      try {
        const project = getValidatedProject(projectId);
        const error = await shell.openPath(project.path);
        if (error) {
          throw new Error(error);
        }
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open folder';
        console.error('Shell open folder error:', message);
        return { success: false, error: message };
      }
    }
  );

  /**
   * Open project domain in browser
   */
  ipcMain.handle(
    SHELL_OPEN_BROWSER_CHANNEL,
    async (_event, projectId: string): Promise<ShellOperationResult> => {
      try {
        const project = getValidatedProject(projectId);
        const url = project.domain.startsWith('http') ? project.domain : `http://${project.domain}`;
        await openInBrowser(url);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open browser';
        console.error('Shell open browser error:', message);
        return { success: false, error: message };
      }
    }
  );

  /**
   * Open URL in default browser
   */
  ipcMain.handle(
    SHELL_OPEN_URL_CHANNEL,
    async (_event, url: string): Promise<ShellOperationResult> => {
      try {
        const urlSchema = z.string().url();
        const validatedUrl = urlSchema.parse(url);
        await openInBrowser(validatedUrl);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open URL';
        console.error('Shell open URL error:', message);
        return { success: false, error: message };
      }
    }
  );

  /**
   * Open project in code editor (VS Code by default)
   */
  ipcMain.handle(
    SHELL_OPEN_EDITOR_CHANNEL,
    async (_event, projectId: string, settings?: ShellSettings): Promise<ShellOperationResult> => {
      try {
        const project = getValidatedProject(projectId);
        const editorCmd = getEditorCommand(settings);
        await execAsync(`${editorCmd} "${project.path}"`);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open editor';
        console.error('Shell open editor error:', message);
        return {
          success: false,
          error: message.includes('not found')
            ? 'Editor not found. Please install your selected editor or check settings.'
            : message,
        };
      }
    }
  );

  /**
   * Open terminal at project path
   */
  ipcMain.handle(
    SHELL_OPEN_TERMINAL_CHANNEL,
    async (_event, projectId: string, settings?: ShellSettings): Promise<ShellOperationResult> => {
      try {
        const project = getValidatedProject(projectId);
        const terminalCmd = getTerminalCommand(project.path, settings);
        await execAsync(terminalCmd);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open terminal';
        console.error('Shell open terminal error:', message);
        return { success: false, error: message };
      }
    }
  );

  /**
   * Open terminal at home directory
   */
  ipcMain.handle(
    SHELL_OPEN_HOME_TERMINAL_CHANNEL,
    async (_event, settings?: ShellSettings): Promise<ShellOperationResult> => {
      try {
        const homeDir = os.homedir();
        const terminalCmd = getTerminalCommand(homeDir, settings);
        await execAsync(terminalCmd);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open terminal';
        console.error('Shell open home terminal error:', message);
        return { success: false, error: message };
      }
    }
  );

  /**
   * Open terminal and run php artisan tinker
   */
  ipcMain.handle(
    SHELL_OPEN_TINKER_CHANNEL,
    async (_event, projectId: string, settings?: ShellSettings): Promise<ShellOperationResult> => {
      try {
        const project = getValidatedProject(projectId);
        const tinkerCmd = getTinkerCommand(project.path, settings);
        await execAsync(tinkerCmd);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open tinker';
        console.error('Shell open tinker error:', message);
        return { success: false, error: message };
      }
    }
  );
}
