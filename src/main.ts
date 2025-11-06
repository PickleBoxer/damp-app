import { app, BrowserWindow } from 'electron';
import registerListeners from './helpers/ipc/listeners-register';
// "electron-squirrel-startup" seems broken when packaging with vite
import started from 'electron-squirrel-startup';
import path from 'node:path';
import { installExtension, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const inDevelopment = process.env.NODE_ENV === 'development';

function createWindow() {
  const preload = path.join(__dirname, 'preload.js');
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,

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

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error('Failed to install extensions');
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on('ready', createWindow);
app.whenReady().then(createWindow).then(installExtensions);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
//osX only
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
