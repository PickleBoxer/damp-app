/**
 * Sync IPC Helpers - Value-adding functions only
 * Contains event subscriptions that benefit from abstraction
 * Simple IPC calls are now accessed directly in sync-queries.ts
 */

export interface SyncStatus {
  status: 'started' | 'completed' | 'failed';
}

// Typed reference to the Sync API exposed via preload script
const syncApi = (globalThis as unknown as Window).sync;

/**
 * Listen for sync status updates (started/completed/failed)
 * Wrapper provides proper cleanup and type safety for event subscriptions
 * Returns cleanup function to remove listener
 */
export function onSyncProgress(
  callback: (projectId: string, direction: 'to' | 'from', progress: SyncStatus) => void
): () => void {
  return syncApi.onSyncProgress(callback);
}
