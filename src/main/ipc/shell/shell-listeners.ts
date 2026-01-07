import { ipcMain, shell } from 'electron';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { projectStorage } from '@main/core/storage/project-storage';
import type { ShellOperationResult, ShellSettings } from './shell-context';
import {
  SHELL_OPEN_FOLDER_CHANNEL,
  SHELL_OPEN_EDITOR_CHANNEL,
  SHELL_OPEN_TERMINAL_CHANNEL,
  SHELL_OPEN_HOME_TERMINAL_CHANNEL,
  SHELL_OPEN_TINKER_CHANNEL,
} from './shell-channels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('shell-ipc');

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
  const terminal = settings?.defaultTerminal || 'default';

  if (isWindows) {
    const terminalCommands: Record<string, string> = {
      default: `start "" /D "${path}"`,
      wt: `wt.exe -d "${path}"`,
      powershell: `start "" powershell.exe -NoExit -Command "Set-Location '${path}'"`,
      cmd: `start "" cmd.exe /K "cd /d ${path}"`,
    };
    return terminalCommands[terminal] || terminalCommands.default;
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
  const terminal = settings?.defaultTerminal || 'default';

  if (isWindows) {
    const tinkerCommands: Record<string, string> = {
      default: `start "" /D "${path}" cmd /K "php artisan tinker"`,
      wt: `wt.exe -d "${path}" pwsh -NoExit -Command "php artisan tinker"`,
      powershell: `start "" powershell.exe -NoExit -Command "Set-Location '${path}'; php artisan tinker"`,
      cmd: `start "" cmd.exe /K "cd /d ${path} && php artisan tinker"`,
    };
    return tinkerCommands[terminal] || tinkerCommands.default;
  }

  if (isMacOS) {
    const script = `tell application "Terminal" to do script "cd '${path}' && php artisan tinker"`;
    return `osascript -e '${script}'`;
  }

  // Linux
  return `x-terminal-emulator --working-directory="${path}" -e "bash -c 'php artisan tinker; exec bash'"`;
}

// Prevent duplicate listener registration
let listenersAdded = false;

export function addShellEventListeners() {
  if (listenersAdded) return;
  listenersAdded = true;

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
        logger.error('Shell open folder error', { error: message });
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
        logger.error('Shell open editor error', { error: message });
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
        logger.error('Shell open terminal error', { error: message });
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
        logger.error('Shell open home terminal error', { error: message });
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
        logger.error('Shell open tinker error', { error: message });
        return { success: false, error: message };
      }
    }
  );
}
