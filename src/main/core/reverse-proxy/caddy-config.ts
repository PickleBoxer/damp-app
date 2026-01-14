/**
 * Caddy configuration management
 * Handles Caddyfile generation and synchronization for project reverse proxy
 */

import { execCommand, findContainerByLabel } from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { ServiceId } from '@shared/types/service';
import type { Project } from '@shared/types/project';
import { createLogger } from '@main/utils/logger';
import { hashProjectContainers, hasStateChanged, updateSyncedState } from './caddy-sync-state';

const logger = createLogger('CaddyConfig');

/**
 * Path to Caddyfile inside the Caddy container
 */
const CADDYFILE_PATH = '/etc/caddy/Caddyfile';

/**
 * Generate Caddyfile content with all project reverse proxy rules
 */
async function generateCaddyfile(projects: Project[]): Promise<string> {
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

    // Find project container by label to get Docker-generated name/ID
    const projectContainer = await findContainerByLabel(
      LABEL_KEYS.PROJECT_ID,
      project.id,
      RESOURCE_TYPES.PROJECT_CONTAINER
    );

    if (!projectContainer) {
      logger.warn(`Project container not found for ${project.name}, skipping Caddy config`);
      continue;
    }

    // Use container ID (first 12 chars) as network address
    const containerAddress = projectContainer.Id.substring(0, 12);

    // HTTPS upstream with TLS insecure skip verify for self-signed certs
    lines.push(`${project.domain} {`);
    lines.push('    tls internal');
    lines.push(`    reverse_proxy https://${containerAddress}:${internalPort} {`);
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
 * @param projects - Array of projects to configure in Caddy
 * @returns Promise resolving to success status
 */
export async function syncProjectsToCaddy(
  projects: Project[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find Caddy container by label instead of hardcoded name
    const caddyContainer = await findContainerByLabel(
      LABEL_KEYS.SERVICE_ID,
      ServiceId.Caddy,
      RESOURCE_TYPES.SERVICE_CONTAINER
    );

    if (!caddyContainer) {
      logger.info('Skipping - Caddy container not found');
      return { success: true }; // Not an error - just skip
    }

    // Check if container is running
    if (caddyContainer.State !== 'running') {
      logger.info('Skipping - Caddy container not running');
      return { success: true }; // Not an error - just skip
    }

    const caddyContainerName = caddyContainer.Names[0]?.replace(/^\//, '') || caddyContainer.Id;

    logger.info('Syncing projects to Caddy configuration...');

    logger.info(`Found ${projects.length} project(s) to configure`);

    // Build project-to-container mapping and check if state changed
    const projectContainerMap = new Map<string, string>();
    for (const project of projects) {
      const projectContainer = await findContainerByLabel(
        LABEL_KEYS.PROJECT_ID,
        project.id,
        RESOURCE_TYPES.PROJECT_CONTAINER
      );

      if (projectContainer) {
        // Use first 12 chars of container ID (same as what goes in Caddyfile)
        projectContainerMap.set(project.id, projectContainer.Id.substring(0, 12));
      }
    }

    // Hash current state and check if changed
    const currentHash = hashProjectContainers(projectContainerMap);
    if (!hasStateChanged(currentHash)) {
      logger.info('Project container state unchanged, skipping sync');
      return { success: true };
    }

    logger.info('Project container state changed, proceeding with sync');

    // Generate Caddyfile content
    const caddyfileContent = await generateCaddyfile(projects);

    // Write Caddyfile to container
    const escapedContent = caddyfileContent.replaceAll("'", String.raw`'\''`);
    const writeCmd = ['sh', '-c', `echo '${escapedContent}' > ${CADDYFILE_PATH}`];

    const writeResult = await execCommand(caddyContainerName, writeCmd);
    if (writeResult.exitCode !== 0) {
      throw new Error(`Failed to write Caddyfile: ${writeResult.stderr}`);
    }

    // Format Caddyfile
    const formatCmd = ['caddy', 'fmt', '--overwrite', CADDYFILE_PATH];
    const formatResult = await execCommand(caddyContainerName, formatCmd);
    if (formatResult.exitCode !== 0) {
      throw new Error(`Failed to format Caddyfile: ${formatResult.stderr}`);
    }

    // Reload Caddy configuration
    const reloadCmd = ['caddy', 'reload', '--config', CADDYFILE_PATH];
    const reloadResult = await execCommand(caddyContainerName, reloadCmd);
    if (reloadResult.exitCode !== 0) {
      throw new Error(`Failed to reload Caddy: ${reloadResult.stderr}`);
    }

    // Update synced state on success
    updateSyncedState(currentHash);

    logger.info('Successfully synchronized projects to Caddy');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to sync projects to Caddy', { error: errorMessage });

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
    const caddyContainer = await findContainerByLabel(
      LABEL_KEYS.SERVICE_ID,
      ServiceId.Caddy,
      RESOURCE_TYPES.SERVICE_CONTAINER
    );
    return caddyContainer?.State === 'running';
  } catch {
    return false;
  }
}
