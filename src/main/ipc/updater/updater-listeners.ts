import { app, autoUpdater, BrowserWindow, ipcMain } from 'electron';
import { createLogger } from '@main/utils/logger';
import type { UpdateState, DownloadProgress } from '@shared/types/updater';
import {
  UPDATER_CHECK_CHANNEL,
  UPDATER_INSTALL_CHANNEL,
  UPDATER_STATUS_CHANNEL,
  UPDATER_SKIP_VERSION_CHANNEL,
  UPDATER_PROGRESS_CHANNEL,
  UPDATER_STATUS_CHANGED_CHANNEL,
  UPDATER_ERROR_CHANNEL,
} from './updater-channels';

const logger = createLogger('updater');

let updateState: UpdateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
};

const skippedVersions = new Set<string>();
let updateListenersAdded = false;
let isAutoUpdaterConfigured = false;

function broadcastStatusChange(state: UpdateState) {
  updateState = state;
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window.isDestroyed()) continue;
    window.webContents.send(UPDATER_STATUS_CHANGED_CHANNEL, state);
  }
}

function broadcastProgress(progress: DownloadProgress) {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window.isDestroyed()) continue;
    window.webContents.send(UPDATER_PROGRESS_CHANNEL, progress);
  }
}

function broadcastError(error: { message: string; code?: string }) {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    if (window.isDestroyed()) continue;
    window.webContents.send(UPDATER_ERROR_CHANNEL, error);
  }
}

export function setupAutoUpdater() {
  if (updateListenersAdded) return;
  updateListenersAdded = true;

  // Only enable auto-updates in production on Windows
  if (process.env.NODE_ENV === 'development' || process.platform !== 'win32') {
    logger.info('Auto-updater disabled in development or non-Windows platform');
    return;
  }

  // Configure feed URL for Cloudflare R2 static storage
  const baseUrl = `https://releases.getdamp.app/${process.platform}/${process.arch}`;

  try {
    autoUpdater.setFeedURL({ url: baseUrl });
    isAutoUpdaterConfigured = true;
    logger.info('Auto-updater configured', { baseUrl });
  } catch (error) {
    logger.error('Failed to configure auto-updater', { error });
    return;
  }

  // Set up event listeners
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    broadcastStatusChange({
      status: 'checking',
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('update-available', () => {
    logger.info('Update available, downloading...');
    broadcastStatusChange({
      status: 'downloading',
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('No updates available');
    broadcastStatusChange({
      status: 'not-available',
      currentVersion: app.getVersion(),
    });
  });

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate) => {
    logger.info('Update downloaded', { releaseName, releaseDate });

    // Check if this version is skipped
    if (skippedVersions.has(releaseName)) {
      logger.info('Update skipped by user', { version: releaseName });
      broadcastStatusChange({
        status: 'idle',
        currentVersion: app.getVersion(),
      });
      return;
    }

    broadcastStatusChange({
      status: 'downloaded',
      currentVersion: app.getVersion(),
      info: {
        version: releaseName,
        releaseNotes: releaseNotes || undefined,
        releaseDate: releaseDate ? new Date(releaseDate) : undefined,
        downloadedVersion: releaseName,
      },
    });
  });

  autoUpdater.on('error', (error: Error) => {
    logger.error('Auto-updater error', { error: error.message });
    const errorCode = (error as Error & { code?: string }).code;
    broadcastStatusChange({
      status: 'error',
      currentVersion: app.getVersion(),
      error: {
        message: error.message,
        code: errorCode,
      },
    });
    broadcastError({
      message: error.message,
      code: errorCode,
    });
  });

  // Download progress (Windows Squirrel doesn't provide this, but we handle it for future compatibility)
  autoUpdater.on('download-progress' as unknown as 'error', (progressObj: unknown) => {
    const progress: DownloadProgress = {
      percent: (progressObj as { percent?: number }).percent || 0,
      bytesPerSecond: (progressObj as { bytesPerSecond?: number }).bytesPerSecond || 0,
      transferred: (progressObj as { transferred?: number }).transferred || 0,
      total: (progressObj as { total?: number }).total || 0,
    };
    logger.info('Download progress', { progress });
    broadcastProgress(progress);
  });

  // Check for updates on startup (after 10 seconds to avoid slowing startup)
  setTimeout(() => {
    logger.info('Initial update check starting...');
    autoUpdater.checkForUpdates();
  }, 10000);

  // Check for updates every hour
  setInterval(
    () => {
      logger.info('Scheduled update check starting...');
      autoUpdater.checkForUpdates();
    },
    60 * 60 * 1000
  );
}

export function addUpdaterListeners() {
  // Get current status
  ipcMain.handle(UPDATER_STATUS_CHANNEL, async () => {
    return updateState;
  });

  // Manual update check
  ipcMain.handle(UPDATER_CHECK_CHANNEL, async () => {
    // Check if auto-updater is configured (only works in production on Windows)
    if (!isAutoUpdaterConfigured) {
      const errorMessage =
        process.env.NODE_ENV === 'development'
          ? 'Auto-updates are disabled in development mode'
          : 'Auto-updates are only available on Windows';

      logger.info('Manual update check skipped', { reason: errorMessage });

      broadcastStatusChange({
        status: 'error',
        currentVersion: app.getVersion(),
        error: { message: errorMessage },
      });

      throw new Error(errorMessage);
    }

    try {
      logger.info('Manual update check requested');
      broadcastStatusChange({
        status: 'checking',
        currentVersion: app.getVersion(),
      });
      autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Manual update check failed', { error: errorMessage });
      broadcastStatusChange({
        status: 'error',
        currentVersion: app.getVersion(),
        error: { message: errorMessage },
      });
      throw error;
    }
  });

  // Quit and install
  ipcMain.handle(UPDATER_INSTALL_CHANNEL, async () => {
    if (!isAutoUpdaterConfigured) {
      logger.warn('Quit and install called but auto-updater not configured');
      throw new Error('Auto-updater not configured');
    }
    logger.info('Quit and install requested');
    autoUpdater.quitAndInstall();
  });

  // Skip version
  ipcMain.handle(UPDATER_SKIP_VERSION_CHANNEL, async (_event, version: string) => {
    logger.info('Skipping version', { version });
    skippedVersions.add(version);
    broadcastStatusChange({
      status: 'idle',
      currentVersion: app.getVersion(),
    });
    return { success: true };
  });
}
