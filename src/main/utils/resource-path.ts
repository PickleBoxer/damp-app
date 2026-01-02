import { app } from 'electron';
import path from 'node:path';

/**
 * Get the absolute path to a resource file.
 *
 * In development, resources are in the project root `/resources` folder.
 * In production, resources are in the app's `resources` folder (copied by Electron Forge).
 *
 * @param subpath - Relative path within the resources folder (e.g., 'icons/icon.png' or 'bin/hostie.exe')
 * @returns Absolute path to the resource file
 *
 * @example
 * ```typescript
 * // Access icon file
 * const iconPath = getResourcePath('icons/icon.png');
 *
 * // Access binary file
 * const binaryPath = getResourcePath('bin/hostie.exe');
 * ```
 */
export function getResourcePath(subpath: string): string {
  if (app.isPackaged) {
    // Production: resources are in the app's resources folder
    // process.resourcesPath points to: C:\Program Files\damp-app\resources\
    return path.join(process.resourcesPath, subpath);
  } else {
    // Development: resources are in the project root
    // app.getAppPath() returns: C:\Users\matic\Code\damp-app
    return path.join(app.getAppPath(), 'resources', subpath);
  }
}
