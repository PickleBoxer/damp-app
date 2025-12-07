/**
 * Sync API wrapper
 * Provides type-safe wrappers around IPC calls to the main process
 */

export interface SyncOptions {
  includeNodeModules?: boolean;
  includeVendor?: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

export interface SyncStatus {
  status: 'started' | 'completed' | 'failed';
}

// Typed reference to the Sync API exposed via preload script
const syncApi = (globalThis as unknown as Window).sync;

/**
 * Ensures the Sync API is available before usage
 */
function ensureSyncApi() {
  if (!syncApi) {
    throw new Error('Sync API is not available. Ensure the preload script is properly configured.');
  }
}

/**
 * Sync files from Docker volume to local folder
 */
export async function syncFromVolume(
  projectId: string,
  options?: SyncOptions
): Promise<SyncResult> {
  ensureSyncApi();
  return await syncApi.fromVolume(projectId, options);
}

/**
 * Sync files from local folder to Docker volume
 */
export async function syncToVolume(projectId: string, options?: SyncOptions): Promise<SyncResult> {
  ensureSyncApi();
  return await syncApi.toVolume(projectId, options);
}

/**
 * Listen for sync status updates (started/completed/failed)
 * Returns cleanup function to remove listener
 */
export function onSyncProgress(
  callback: (projectId: string, direction: 'to' | 'from', progress: SyncStatus) => void
): () => void {
  ensureSyncApi();
  return syncApi.onSyncProgress(callback);
}
