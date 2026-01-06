import { app, BrowserWindow } from 'electron';
import registerListeners from './ipc/listeners-register';
import started from 'electron-squirrel-startup';
import path from 'node:path';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { TrayMenu } from './electron/TrayMenu';
import { ngrokManager } from './services/ngrok/ngrok-manager';
import { ensureNetworkExists } from '@main/core/docker';
import { createLogger } from '@main/utils/logger';
import { setupAutoUpdater } from './ipc/updater/updater-listeners';

const logger = createLogger('main');

// Prevent multiple instances - focus existing window instead
if (!app.requestSingleInstanceLock()) {
  logger.info('Another instance is already running, exiting...');
  app.quit();
  process.exit(0);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Set App User Model ID for Windows (proper taskbar grouping and notifications)
// Using reverse domain notation for global uniqueness and proper Windows shell integration
if (process.platform === 'win32') {
  app.setAppUserModelId('com.pickleboxer.damp');
}

const inDevelopment = process.env.NODE_ENV === 'development';

function createWindow() {
  const preload = path.join(__dirname, 'preload.js');
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Do not show immediately
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: true,
      preload: preload,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 5, y: 5 } : undefined,
  });
  registerListeners(mainWindow);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Minimize the window initially
  mainWindow.once('ready-to-show', () => {
    mainWindow.minimize(); // Or use mainWindow.show() if you want to show it
  });

  // Open the DevTools.
  if (inDevelopment) {
    mainWindow.webContents.openDevTools();
  }
}

// Handle second instance attempts - focus the existing window
app.on('second-instance', () => {
  logger.info('Second instance detected, focusing existing window');
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.show();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  if (inDevelopment) {
    try {
      await installExtension(REACT_DEVELOPER_TOOLS);
      logger.info('React DevTools loaded');
    } catch (err) {
      logger.error('Failed to load React DevTools', { error: err });
    }
  }

  createWindow();

  // Initialize Docker network (non-blocking, fails silently if Docker not running)
  // If Docker is not running, this will fail silently and network will be created on-demand
  ensureNetworkExists().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.info('Network initialization skipped', { error: message });
  });

  // Set up auto-updater (deferred to not block app initialization)
  // Delayed by 5 seconds to ensure app is fully initialized
  setTimeout(() => {
    setupAutoUpdater();
  }, 5000);

  // Use TrayMenu class for tray setup
  void new TrayMenu();
  logger.info('Tray menu initialized');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup ngrok tunnels before app quits
app.on('before-quit', event => {
  event.preventDefault();
  logger.info('Application quitting, cleaning up ngrok tunnels...');

  // Set a timeout to force quit if cleanup takes too long
  const forceQuitTimeout = setTimeout(() => {
    logger.error('Ngrok cleanup timed out, forcing quit');
    app.exit(1);
  }, 5000);

  ngrokManager
    .stopAllTunnels()
    .then(() => {
      logger.info('Ngrok tunnels cleaned up successfully');
    })
    .catch((error: unknown) => {
      logger.error('Failed to cleanup ngrok tunnels on quit', { error });
    })
    .finally(() => {
      clearTimeout(forceQuitTimeout);
      app.exit(0);
    });
});

// On macOS, re-create a window when dock icon is clicked and there are no other windows open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
