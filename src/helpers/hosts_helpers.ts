/**
 * Hosts file manipulation using sudo-prompt + hostile
 * Provides elevated privileges for modifying system hosts file
 */

import { exec } from '@vscode/sudo-prompt';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Result of a hosts file operation
 */
interface HostsOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Hostile operation types
 */
type HostileOperation = 'set' | 'remove';

/**
 * Get the path to the hostile module
 */
function getHostilePath(): string {
  try {
    // In development, this resolves to node_modules
    // In packaged app, modules are in resources/app.asar
    return require.resolve('hostile');
  } catch {
    throw new Error('hostile module not found');
  }
}

/**
 * Generate a temporary script for hostile operations
 */
function generateHostileScript(
  operation: HostileOperation,
  hostilePath: string,
  ip: string,
  domain: string
): string {
  return `
const hostile = require(${JSON.stringify(hostilePath)});
hostile.${operation}(${JSON.stringify(ip)}, ${JSON.stringify(domain)}, (err) => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  } else {
    process.exit(0);
  }
});
`;
}

/**
 * Execute a hosts file operation with elevated privileges
 */
async function executeElevatedHostsOperation(
  operation: HostileOperation,
  ip: string,
  domain: string
): Promise<HostsOperationResult> {
  let tempScriptPath: string | null = null;

  try {
    const nodePath = process.execPath;
    const hostilePath = getHostilePath();

    // Create temporary script file
    const scriptContent = generateHostileScript(operation, hostilePath, ip, domain);
    tempScriptPath = path.join(os.tmpdir(), `damp-${operation}-host-${Date.now()}.js`);
    await fs.writeFile(tempScriptPath, scriptContent, 'utf-8');

    // Execute with elevation
    const command = `"${nodePath}" "${tempScriptPath}"`;
    const operationName = operation === 'set' ? 'add' : 'remove';

    return new Promise<HostsOperationResult>(resolve => {
      exec(command, { name: 'DAMP' }, async (error, stdout, stderr) => {
        // Clean up temp file
        if (tempScriptPath) {
          await fs.unlink(tempScriptPath).catch(() => {});
        }

        if (error) {
          // Check if user cancelled UAC
          if (error.message?.includes('User did not grant permission')) {
            resolve({
              success: false,
              error:
                'Administrator privileges required. Please accept the UAC prompt to modify the hosts file.',
            });
            return;
          }

          resolve({
            success: false,
            error: `Failed to ${operationName} host entry: ${error.message}`,
          });
          return;
        }

        if (stderr) {
          resolve({
            success: false,
            error: `Failed to ${operationName} host entry: ${stderr}`,
          });
          return;
        }

        console.log(`${operationName === 'add' ? 'Added' : 'Removed'} host entry: ${ip} ${domain}`);
        resolve({ success: true });
      });
    });
  } catch (error) {
    // Clean up temp file on error
    if (tempScriptPath) {
      await fs.unlink(tempScriptPath).catch(() => {});
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Add a host entry to the system hosts file
 * Requires administrator/root privileges (will prompt via UAC/sudo)
 *
 * @param ip - IP address (e.g., '127.0.0.1')
 * @param domain - Domain name (e.g., 'myproject.local')
 * @returns Promise with operation result
 */
export async function addHostEntry(ip: string, domain: string): Promise<HostsOperationResult> {
  return executeElevatedHostsOperation('set', ip, domain);
}

/**
 * Remove a host entry from the system hosts file
 * Requires administrator/root privileges (will prompt via UAC/sudo)
 *
 * @param ip - IP address (e.g., '127.0.0.1')
 * @param domain - Domain name (e.g., 'myproject.local')
 * @returns Promise with operation result
 */
export async function removeHostEntry(ip: string, domain: string): Promise<HostsOperationResult> {
  return executeElevatedHostsOperation('remove', ip, domain);
}

/**
 * Verify if a host entry exists in the hosts file
 * This is a read-only operation and does not require elevated privileges
 *
 * @param domain - Domain name to check
 * @returns Promise<boolean> - true if entry exists
 */
export async function verifyHostEntry(domain: string): Promise<boolean> {
  try {
    // Dynamic require needed for hostile at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hostile = require('hostile') as {
      get: (
        preserveFormatting: boolean,
        callback: (err: Error | null, lines: Array<[string, string]>) => void
      ) => void;
    };

    const lines = await new Promise<Array<[string, string]>>((resolve, reject) => {
      hostile.get(false, (err: Error | null, lines: Array<[string, string]>) => {
        if (err) reject(err);
        else resolve(lines);
      });
    });

    return lines.some(([, host]) => host === domain);
  } catch (error) {
    console.error('Failed to verify host entry:', error);
    return false;
  }
}
