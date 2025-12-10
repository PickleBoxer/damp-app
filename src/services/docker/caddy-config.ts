/**
 * Caddy configuration management
 * Handles Caddyfile generation and synchronization for project reverse proxy
 */

import { dockerManager } from './docker-manager';
import { projectStorage } from '../projects/project-storage';
import type { Project } from '../../types/project';
import { FORWARDED_PORT } from '../../constants/ports';

/**
 * Path to Caddyfile inside the Caddy container
 */
const CADDYFILE_PATH = '/etc/caddy/Caddyfile';

/**
 * Default Caddy container name
 */
const CADDY_CONTAINER_NAME = 'damp-web';

/**
 * Generate Caddyfile content with all project reverse proxy rules
 */
function generateCaddyfile(projects: Project[]): string {
  const lines: string[] = [
    '# DAMP Reverse Proxy Configuration',
    '# Auto-generated - Do not edit manually',
    '',
    '# Bootstrap',
    'https://damp.local {',
    '    tls internal',
    '    respond "DAMP - All systems ready!"',
    '}',
    '',
  ];

  // Add reverse proxy rules for each project
  for (const project of projects) {
    // Use project's configured forwarded port (stored in project state)
    const internalPort = project.forwardedPort;

    // HTTPS upstream with TLS insecure skip verify for self-signed certs
    lines.push(`${project.domain} {`);
    lines.push('    tls internal');
    lines.push(`    reverse_proxy https://${project.containerName}:${internalPort} {`);
    lines.push('        transport http {');
    lines.push('            tls_insecure_skip_verify');
    lines.push('        }');
    lines.push('    }');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Synchronize all projects to Caddy configuration
 * This function is idempotent and can be called multiple times safely
 *
 * @returns Promise resolving to success status
 */
export async function syncProjectsToCaddy(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Caddy container is running
    const containerStatus = await dockerManager.getContainerStatus(CADDY_CONTAINER_NAME);

    if (!containerStatus?.running) {
      console.log('[Caddy Sync] Skipping - Caddy container not running');
      return { success: true }; // Not an error - just skip
    }

    console.log('[Caddy Sync] Syncing projects to Caddy configuration...');

    // Get all projects
    const projects = projectStorage.getAllProjects();
    console.log(`[Caddy Sync] Found ${projects.length} project(s) to configure`);

    // Generate Caddyfile content
    const caddyfileContent = generateCaddyfile(projects);

    // Write Caddyfile to container
    const escapedContent = caddyfileContent.replaceAll("'", String.raw`'\''`);
    const writeCmd = ['sh', '-c', `echo '${escapedContent}' > ${CADDYFILE_PATH}`];

    const writeResult = await dockerManager.execCommand(CADDY_CONTAINER_NAME, writeCmd);
    if (writeResult.exitCode !== 0) {
      throw new Error(`Failed to write Caddyfile: ${writeResult.stderr}`);
    }

    // Format Caddyfile
    const formatCmd = ['caddy', 'fmt', '--overwrite', CADDYFILE_PATH];
    const formatResult = await dockerManager.execCommand(CADDY_CONTAINER_NAME, formatCmd);
    if (formatResult.exitCode !== 0) {
      throw new Error(`Failed to format Caddyfile: ${formatResult.stderr}`);
    }

    // Reload Caddy configuration
    const reloadCmd = ['caddy', 'reload', '--config', CADDYFILE_PATH];
    const reloadResult = await dockerManager.execCommand(CADDY_CONTAINER_NAME, reloadCmd);
    if (reloadResult.exitCode !== 0) {
      throw new Error(`Failed to reload Caddy: ${reloadResult.stderr}`);
    }

    console.log('[Caddy Sync] Successfully synchronized projects to Caddy');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[Caddy Sync] Failed to sync projects to Caddy:', errorMessage);

    // Don't throw - just return error for logging
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if Caddy is running and ready for configuration
 */
export async function isCaddyReady(): Promise<boolean> {
  try {
    const containerStatus = await dockerManager.getContainerStatus(CADDY_CONTAINER_NAME);
    return containerStatus?.running ?? false;
  } catch {
    return false;
  }
}
