/**
 * Platform detection utilities
 * Works in both renderer (browser) and main (Node.js) processes
 */

/**
 * Check if the current platform is macOS
 * @returns true if running on macOS, false otherwise
 */
export const isMacOS = (): boolean => {
  // Check if running in Node.js (main process) - preferred for accuracy
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'darwin';
  }

  // Fallback for browser context (renderer process)
  if (globalThis.window !== undefined && globalThis.navigator) {
    // Using deprecated platform API as fallback - no better alternative yet
    return globalThis.navigator.platform?.includes('Mac') ?? false;
  }

  return false;
};

/**
 * Check if the current platform is Windows
 * @returns true if running on Windows, false otherwise
 */
export const isWindows = (): boolean => {
  // Check if running in Node.js (main process) - preferred for accuracy
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32';
  }

  // Fallback for browser context (renderer process)
  if (globalThis.window !== undefined && globalThis.navigator) {
    // Using deprecated platform API as fallback - no better alternative yet
    return globalThis.navigator.platform?.includes('Win') ?? false;
  }

  return false;
};
