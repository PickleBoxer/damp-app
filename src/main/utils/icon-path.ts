import { getResourcePath } from './resource-path';

/**
 * Icon type to retrieve
 */
export type IconType = 'app' | 'tray';

/**
 * Get the platform-specific icon file extension
 */
function getIconExtension(): string {
  switch (process.platform) {
    case 'win32':
      return '.ico'; // Windows uses ICO format
    case 'darwin':
      return '.icns'; // macOS uses ICNS format
    default:
      return '.png'; // Linux and others use PNG format
  }
}

/**
 * Get the absolute path to a platform-specific icon file.
 *
 * Automatically selects the correct icon format based on the platform:
 * - Windows: .ico
 * - macOS: .icns
 * - Linux: .png
 *
 * @param _type - Type of icon to retrieve ('app' or 'tray') - reserved for future use
 * @returns Absolute path to the platform-specific icon file
 *
 * @example
 * ```typescript
 * // Get tray icon path
 * const trayIconPath = getIconPath('tray');
 *
 * // Get app icon path
 * const appIconPath = getIconPath('app');
 * ```
 */
export function getIconPath(): string {
  const extension = getIconExtension();
  const iconFileName = `icon${extension}`;

  return getResourcePath(`icons/${iconFileName}`);
}

/**
 * Check if the current platform is macOS
 */
export function isMacOS(): boolean {
  return process.platform === 'darwin';
}
