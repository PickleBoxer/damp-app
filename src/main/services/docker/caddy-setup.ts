/**
 * Caddy SSL certificate setup
 * Handles automatic SSL certificate generation and system installation for Caddy
 */

import { dockerManager } from './docker-manager';
import { isWindows, isMacOS } from '@shared/utils/platform';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, unlinkSync } from 'node:fs';

/**
 * Default Caddyfile content for SSL bootstrapping
 * Creates a test site on damp.local to trigger SSL certificate generation
 */
const DEFAULT_CADDYFILE = `# DAMP SSL Bootstrap Configuration
# This file triggers Caddy to generate a local root CA certificate

https://damp.local {
    tls internal
    respond "DAMP SSL Certificate Initialized - Your local development environment is ready!"
}
`;

/**
 * Path to the root certificate inside the Caddy container
 */
const CADDY_ROOT_CERT_PATH = '/data/caddy/pki/authorities/local/root.crt';

/**
 * Path to Caddyfile inside the container
 */
const CADDYFILE_PATH = '/etc/caddy/Caddyfile';

/**
 * Maximum wait time for certificate generation (30 seconds)
 */
const CERT_GENERATION_TIMEOUT = 30000;

/**
 * Polling interval for certificate existence check (2 seconds)
 */
const POLL_INTERVAL = 2000;

/**
 * Result of the Caddy SSL setup process
 */
export interface CaddySSLSetupResult {
  success: boolean;
  certInstalled: boolean;
  message: string;
}

/**
 * Main function to set up Caddy SSL certificate
 * This runs automatically after Caddy installation
 *
 * Process:
 * 1. Create default Caddyfile in container
 * 2. Format Caddyfile with `caddy fmt`
 * 3. Reload Caddy with new config
 * 4. Wait for certificate generation
 * 5. Extract certificate from container
 * 6. Install certificate to system trust store
 *
 * @param containerName Name of the Caddy container (default: 'damp-web')
 * @returns Result object with success status and messages
 */
export async function setupCaddySSL(containerName = 'damp-web'): Promise<CaddySSLSetupResult> {
  console.log('[Caddy SSL] Starting certificate setup...');

  try {
    // Step 1: Create Caddyfile
    console.log('[Caddy SSL] Creating default Caddyfile...');
    await createCaddyfile(containerName);

    // Step 2: Format Caddyfile
    console.log('[Caddy SSL] Formatting Caddyfile...');
    await formatCaddyfile(containerName);

    // Step 3: Reload Caddy
    console.log('[Caddy SSL] Reloading Caddy with new configuration...');
    await reloadCaddy(containerName);

    // Step 4: Wait for certificate generation
    console.log('[Caddy SSL] Waiting for SSL certificate generation...');
    const certGenerated = await waitForCertificate(containerName);

    if (!certGenerated) {
      return {
        success: false,
        certInstalled: false,
        message: 'SSL certificate was not generated within timeout period',
      };
    }

    console.log('[Caddy SSL] Certificate generated successfully');

    // Step 5: Extract certificate
    console.log('[Caddy SSL] Extracting certificate from container...');
    const certPath = await extractCertificate(containerName);

    // Step 6: Install to system
    console.log('[Caddy SSL] Installing certificate to system trust store...');
    const installResult = await installCertificateToSystem(certPath);

    // Clean up temporary certificate file
    try {
      unlinkSync(certPath);
    } catch (error) {
      console.warn('Failed to delete temporary certificate file:', error);
    }

    if (installResult.success) {
      console.log('[Caddy SSL] Setup completed successfully');
      return {
        success: true,
        certInstalled: true,
        message:
          'Caddy SSL certificate installed successfully. Your browser will now trust HTTPS connections.',
      };
    } else {
      console.warn('[Caddy SSL] Certificate installation failed, but Caddy is configured');
      return {
        success: true,
        certInstalled: false,
        message: `Caddy is configured but certificate installation failed: ${installResult.error}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Caddy SSL] Setup failed:', errorMessage);
    return {
      success: false,
      certInstalled: false,
      message: `Failed to set up Caddy SSL: ${errorMessage}`,
    };
  }
}

/**
 * Create the default Caddyfile inside the Caddy container
 */
async function createCaddyfile(containerName: string): Promise<void> {
  const escapedContent = DEFAULT_CADDYFILE.replaceAll("'", String.raw`'\''`);
  const cmd = ['sh', '-c', `echo '${escapedContent}' > ${CADDYFILE_PATH}`];

  const result = await dockerManager.execCommand(containerName, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create Caddyfile: ${result.stderr}`);
  }
}

/**
 * Format the Caddyfile using `caddy fmt`
 */
async function formatCaddyfile(containerName: string): Promise<void> {
  const cmd = ['caddy', 'fmt', '--overwrite', CADDYFILE_PATH];

  const result = await dockerManager.execCommand(containerName, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to format Caddyfile: ${result.stderr}`);
  }
}

/**
 * Reload Caddy with the new configuration
 */
async function reloadCaddy(containerName: string): Promise<void> {
  const cmd = ['caddy', 'reload', '--config', CADDYFILE_PATH];

  const result = await dockerManager.execCommand(containerName, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to reload Caddy: ${result.stderr}`);
  }
}

/**
 * Wait for the SSL certificate to be generated by Caddy
 * Polls for the certificate file at fixed intervals
 *
 * @param containerName Name of the Caddy container
 * @returns true if certificate was found, false if timeout
 */
async function waitForCertificate(containerName: string): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < CERT_GENERATION_TIMEOUT) {
    try {
      // Check if certificate file exists
      const cmd = ['test', '-f', CADDY_ROOT_CERT_PATH];
      const result = await dockerManager.execCommand(containerName, cmd);

      if (result.exitCode === 0) {
        return true;
      }
    } catch {
      // Continue polling on error - certificate not ready yet
      console.debug('Certificate not yet available, retrying...');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  return false;
}

/**
 * Extract the root certificate from the Caddy container to a temporary file
 *
 * @param containerName Name of the Caddy container
 * @returns Path to the extracted certificate file on the host
 */
async function extractCertificate(containerName: string): Promise<string> {
  const certBuffer = await dockerManager.getFileFromContainer(containerName, CADDY_ROOT_CERT_PATH);

  // Save to temporary file
  const tempDir = tmpdir();
  const certPath = join(tempDir, 'damp-caddy-root.crt');

  writeFileSync(certPath, certBuffer);
  console.log(`Certificate extracted to: ${certPath}`);

  return certPath;
}

/**
 * Install the certificate to the system trust store
 * Handles platform-specific installation methods
 *
 * @param certPath Path to the certificate file on the host
 * @returns Result object with success status
 */
async function installCertificateToSystem(
  certPath: string
): Promise<{ success: boolean; error?: string }> {
  if (isWindows()) {
    return installCertificateWindows(certPath);
  } else if (isMacOS()) {
    return installCertificateMacOS(certPath);
  } else {
    return {
      success: false,
      error: 'Automatic certificate installation is only supported on Windows and macOS',
    };
  }
}

/**
 * Install certificate on Windows using certutil
 * Requires administrator privileges
 */
async function installCertificateWindows(
  certPath: string
): Promise<{ success: boolean; error?: string }> {
  // Try non-elevated install first (may succeed if running as admin)
  const tryNonElevated = (): Promise<{ success: boolean; error?: string; code?: number }> =>
    new Promise(resolve => {
      const proc = spawn('certutil', ['-addstore', '-f', 'ROOT', certPath], {
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || stdout || `certutil exited with code ${code}`,
            code,
          });
        }
      });

      proc.on('error', err => {
        resolve({ success: false, error: `Failed to run certutil: ${err.message}` });
      });
    });

  // Elevated install using PowerShell Start-Process -Verb RunAs
  const tryElevated = (): Promise<{ success: boolean; error?: string }> =>
    new Promise(resolve => {
      // Use PowerShell to trigger UAC prompt and run certutil elevated
      // The -ArgumentList is provided as comma-separated quoted strings
      const psCommand = `Start-Process -FilePath 'certutil.exe' -ArgumentList '-addstore','-f','ROOT','${certPath}' -Verb RunAs -Wait`;

      const elevated = spawn('powershell', ['-NoProfile', '-Command', psCommand], {
        stdio: 'ignore', // Ignore stdio to prevent terminal corruption from UAC prompt
        shell: true,
      });

      elevated.on('close', (code: number) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Elevated certutil exited with code ${code}` });
        }
      });

      elevated.on('error', err => {
        resolve({ success: false, error: `Failed to spawn elevated certutil: ${err.message}` });
      });
    });

  // Execute
  try {
    const nonElev = await tryNonElevated();
    if (nonElev.success) {
      console.log('Certificate installed to Windows ROOT store (non-elevated)');
      return { success: true };
    }

    // If non-elevated failed due to access denied, attempt elevation
    const accessDenied =
      (nonElev.error || '').toLowerCase().includes('access is denied') || nonElev.code === 5;
    if (!accessDenied) {
      return { success: false, error: nonElev.error };
    }

    // Prompt elevation
    console.log('Attempting elevated certificate installation (UAC prompt may appear)...');
    const elevatedResult = await tryElevated();
    if (elevatedResult.success) {
      console.log('Certificate installed to Windows ROOT store (elevated)');
      return { success: true };
    }

    return { success: false, error: elevatedResult.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Install certificate on macOS using security command
 * Requires sudo (will prompt user for password)
 */
async function installCertificateMacOS(
  certPath: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    const process = spawn(
      'sudo',
      [
        'security',
        'add-trusted-cert',
        '-d',
        '-r',
        'trustRoot',
        '-k',
        '/Library/Keychains/System.keychain',
        certPath,
      ],
      {
        stdio: 'inherit', // Inherit stdio to show sudo password prompt
        shell: false,
      }
    );

    process.on('close', (code: number) => {
      if (code === 0) {
        console.log('Certificate installed to macOS System keychain');
        resolve({ success: true });
      } else {
        const errorMsg = `security command exited with code ${code}`;
        console.error('Failed to install certificate on macOS:', errorMsg);
        resolve({
          success: false,
          error: `macOS certificate installation failed: ${errorMsg}`,
        });
      }
    });

    process.on('error', (err: Error) => {
      console.error('Failed to spawn security command:', err);
      resolve({
        success: false,
        error: `Failed to run security command: ${err.message}`,
      });
    });
  });
}
