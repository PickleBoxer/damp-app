/**
 * Caddy sync state tracker
 * Tracks the last synced state of project container IDs to avoid redundant Caddy reloads
 */

import { createHash } from 'node:crypto';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('CaddySyncState');

/**
 * Hash of the last synced state
 * Format: SHA-256 hash of sorted "projectId:containerId" pairs
 */
let lastSyncedHash: string | null = null;

/**
 * Generate hash from project-to-container mappings
 */
export function hashProjectContainers(projectContainerMap: Map<string, string>): string {
  // Sort entries for consistent hashing
  const sortedEntries = Array.from(projectContainerMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Create string representation: "projectId1:containerId1|projectId2:containerId2|..."
  const stateString = sortedEntries
    .map(([projectId, containerId]) => `${projectId}:${containerId}`)
    .join('|');

  // Hash for efficient comparison
  return createHash('sha256').update(stateString).digest('hex');
}

/**
 * Check if the current state differs from last synced state
 */
export function hasStateChanged(currentHash: string): boolean {
  if (lastSyncedHash === null) {
    logger.debug('No previous sync state, treating as changed');
    return true;
  }

  const changed = currentHash !== lastSyncedHash;
  if (changed) {
    logger.debug('State has changed since last sync');
  } else {
    logger.debug('State unchanged since last sync');
  }

  return changed;
}

/**
 * Update the last synced state hash
 */
export function updateSyncedState(hash: string): void {
  lastSyncedHash = hash;
  logger.debug('Updated synced state hash', { hash: `${hash.substring(0, 16)}...` });
}

/**
 * Clear the synced state (forces next sync to execute)
 */
export function clearSyncedState(): void {
  logger.debug('Clearing synced state');
  lastSyncedHash = null;
}

/**
 * Get current synced state hash (for debugging)
 */
export function getCurrentSyncedHash(): string | null {
  return lastSyncedHash;
}
