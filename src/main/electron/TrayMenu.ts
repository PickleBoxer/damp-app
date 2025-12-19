import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';

export class TrayMenu {
  // Create a variable to store our tray
  // Public: Make it accessible outside of the class;
  // Readonly: Value can't be changed
  public readonly tray: Tray;

  // Path where should we fetch our icon;
  private readonly iconPath: string = '/icon/icon.ico';
  private contextMenu: Menu;

  constructor() {
    this.tray = new Tray(this.createNativeImage());
    this.tray.setToolTip('Damp');

    // Left click handler: show app from minimized
    this.tray.on('click', () => this.showWindow());

    this.contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open App',
        click: () => this.showWindow(),
      },
      { role: 'quit' },
    ]);

    this.tray.setContextMenu(this.contextMenu);

    // Update menu label when window state changes
    this.updateMenuLabel();
  }

  private showWindow() {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length === 0) {
      // You may want to expose a callback for createWindow
    } else {
      const win = wins[0];
      if (win.isMinimized()) {
        win.restore();
        win.focus();
      } else {
        win.minimize();
      }
      this.updateMenuLabel();
    }
  }

  private updateMenuLabel() {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      const win = wins[0];
      const label = win.isMinimized() ? 'Damp' : 'Damp';
      this.contextMenu = Menu.buildFromTemplate([
        {
          label,
          click: () => this.showWindow(),
        },
        { role: 'quit' },
      ]);
      this.tray.setContextMenu(this.contextMenu);
    }
  }

  createNativeImage() {
    // Use absolute path from app base directory
    const path = app.getAppPath() + this.iconPath;
    const image = nativeImage.createFromPath(path);
    // Marks the image as a template image.
    image.setTemplateImage(true);
    return image;
  }
}
