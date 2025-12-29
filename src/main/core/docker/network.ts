/**
 * Docker network operations
 * Handles Docker network management
 */

import { docker } from './docker';
import { DAMP_NETWORK_NAME } from '@shared/constants/docker';
import { buildNetworkLabels } from '@shared/constants/labels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('Network');

/**
 * Ensure the shared DAMP network exists
 * Creates a bridge network if it doesn't exist
 */
export async function ensureNetworkExists(): Promise<void> {
  try {
    const networks = await docker.listNetworks({
      filters: { name: [DAMP_NETWORK_NAME] },
    });

    // Check if network already exists
    const networkExists = networks.some(net => net.Name === DAMP_NETWORK_NAME);

    if (!networkExists) {
      await docker.createNetwork({
        Name: DAMP_NETWORK_NAME,
        Driver: 'bridge',
        CheckDuplicate: true,
        Labels: buildNetworkLabels(),
      });
      logger.info(`Created Docker network: ${DAMP_NETWORK_NAME}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to ensure network exists: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if the DAMP network exists
 * @returns true if network exists, false otherwise
 */
export async function checkNetworkExists(): Promise<boolean> {
  try {
    const networks = await docker.listNetworks({
      filters: { name: [DAMP_NETWORK_NAME] },
    });
    return networks.some(net => net.Name === DAMP_NETWORK_NAME);
  } catch {
    return false;
  }
}
