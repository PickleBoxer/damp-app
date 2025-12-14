import { BrowserWindow, ipcMain, shell } from 'electron';
import { z } from 'zod';
import {
  WIN_CLOSE_CHANNEL,
  WIN_MAXIMIZE_CHANNEL,
  WIN_MINIMIZE_CHANNEL,
  WIN_OPEN_EXTERNAL_CHANNEL,
} from './window-channels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('window-ipc');

// Validation schemas
const urlSchema = z
  .string()
  .url()
  .refine(
    url => {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    },
    { message: 'URL must use HTTP or HTTPS protocol' }
  );

// Prevent duplicate listener registration
let listenersAdded = false;

export function addWindowEventListeners(mainWindow: BrowserWindow) {
  if (listenersAdded) return;
  listenersAdded = true;
  ipcMain.handle(WIN_MINIMIZE_CHANNEL, () => {
    mainWindow.minimize();
  });
  ipcMain.handle(WIN_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle(WIN_CLOSE_CHANNEL, () => {
    mainWindow.close();
  });
  ipcMain.handle(WIN_OPEN_EXTERNAL_CHANNEL, async (_event, url: string) => {
    try {
      // Validate URL using Zod schema
      urlSchema.parse(url);
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map(issue => issue.message).join(', ');
        logger.error('Invalid URL', { error: errorMessage });
        return { success: false, error: errorMessage };
      }
      logger.error('Failed to open external URL', { error });
      return { success: false, error: (error as Error).message };
    }
  });
}
