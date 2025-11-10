import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';

export class TrayMenu {
  // Create a variable to store our tray
  // Public: Make it accessible outside of the class;
  // Readonly: Value can't be changed
  public readonly tray: Tray;

  // Path where should we fetch our icon;
  private readonly iconPath: string = '/icon/icon.ico';

  constructor() {
    this.tray = new Tray(this.createNativeImage());
    this.tray.setToolTip('DAMP');

    // Left click handler: show app from minimized
    this.tray.on('click', () => {
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
      }
    });

    const green = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACOSURBVHgBpZLRDYAgEEOrEzgCozCCGzkCbKArOIlugJvgoRAUNcLRpvGH19TkgFQWkqIohhK8UEaKwKcsOg/+WR1vX+AlA74u6q4FqgCOSzwsGHCwbKliAF89Cv89tWmOT4VaVMoVbOBrdQUz+FrD6XItzh4LzYB1HFJ9yrEkZ4l+wvcid9pTssh4UKbPd+4vED2Nd54iAAAAAElFTkSuQmCC'
    );
    const red = this.createNativeImage();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open App',
        click: () => {
          const wins = BrowserWindow.getAllWindows();
          if (wins.length === 0) {
            // You may want to expose a callback for createWindow
          } else {
            wins[0].focus();
          }
        },
      },
      {
        label: 'Set Green Icon',
        type: 'checkbox',
        click: ({ checked }: { checked: boolean }) => {
          this.tray.setImage(checked ? green : red);
        },
      },
      { role: 'quit' },
    ]);

    this.tray.setContextMenu(contextMenu);
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
