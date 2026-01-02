/**
 * Hosts file manipulation using sudo-prompt + hostie binary
 * Provides elevated privileges for modifying system hosts file
 */

import { exec } from '@vscode/sudo-prompt';
import { createLogger } from '../../utils/logger';
import { getResourcePath } from '../../utils/resource-path';

const logger = createLogger('HostsManager');

/**
 * Result of a hosts file operation
 */
export interface HostsOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Get the path to the hostie binary
 */
function getHostieBinaryPath(): string {
  return getResourcePath('bin/hostie.exe');
}

/**
 * Execute a hosts file operation with elevated privileges
 */
async function executeElevatedHostsOperation(
  operation: 'add' | 'remove',
  ip: string,
  domain: string
): Promise<HostsOperationResult> {
  try {
    const hostiePath = getHostieBinaryPath();
    const command = `"${hostiePath}" ${operation} ${ip} ${domain}`;

    logger.info(`${operation} ${domain} -> ${ip}`);

    return new Promise<HostsOperationResult>(resolve => {
      exec(command, { name: 'DAMP' }, (error, stdout, stderr) => {
        if (error?.message?.includes('User did not grant permission')) {
          logger.warn('UAC cancelled');
          resolve({ success: false, error: 'Administrator privileges required' });
          return;
        }

        if (error || stderr) {
          logger.error(`${operation} failed:`, { error: error?.message || String(stderr) });
          resolve({ success: false, error: error?.message || String(stderr) });
          return;
        }

        logger.info(`${operation} success: ${ip} ${domain}`);
        resolve({ success: true });
      });
    });
  } catch (error) {
    logger.error('Hosts operation error:', { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Add a host entry to the system hosts file
 * Requires administrator/root privileges (will prompt via UAC/sudo)
 */
export async function addHostEntry(ip: string, domain: string): Promise<HostsOperationResult> {
  return executeElevatedHostsOperation('add', ip, domain);
}

/**
 * Remove a host entry from the system hosts file
 * Requires administrator/root privileges (will prompt via UAC/sudo)
 */
export async function removeHostEntry(ip: string, domain: string): Promise<HostsOperationResult> {
  return executeElevatedHostsOperation('remove', ip, domain);
}
