/**
 * Port configuration constants
 * Centralized port definitions for project containers
 */

/**
 * Default forwarded port for new projects
 * This is the internal container port that VS Code forwards to localhost
 */
export const FORWARDED_PORT = 8443;

/**
 * Port scanning range for discovering VS Code forwarded ports
 * VS Code randomly assigns localhost ports, so we scan this range
 */
export const PORT_SCAN_RANGE = 20;

/**
 * Calculate the port scanning range
 */
export function getPortScanRange(): { start: number; end: number } {
  return {
    start: FORWARDED_PORT,
    end: FORWARDED_PORT + PORT_SCAN_RANGE,
  };
}
