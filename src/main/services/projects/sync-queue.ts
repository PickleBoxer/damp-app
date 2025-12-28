/**
 * Sync queue manager for controlling concurrent sync operations
 * Prevents resource exhaustion when syncing multiple projects simultaneously
 */

import { createLogger } from '@main/utils/logger';

const logger = createLogger('SyncQueue');

// Maximum number of concurrent sync operations (configurable)
const MAX_CONCURRENT_SYNCS = 2;

interface QueuedSync {
  projectId: string;
  execute: () => Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

class SyncQueue {
  private readonly activeSyncs = new Set<string>();
  private readonly queue: QueuedSync[] = [];

  /**
   * Execute sync operation with concurrency control
   * If limit reached, operation is queued until a slot opens
   */
  async execute(projectId: string, fn: () => Promise<void>): Promise<void> {
    // Check if already syncing this project
    if (this.activeSyncs.has(projectId)) {
      throw new Error('Sync already in progress for this project');
    }

    // Check concurrent limit
    if (this.activeSyncs.size >= MAX_CONCURRENT_SYNCS) {
      logger.info(
        `Sync queue full (${this.activeSyncs.size}/${MAX_CONCURRENT_SYNCS}), queuing project ${projectId}`
      );

      // Queue the operation
      return new Promise<void>((resolve, reject) => {
        this.queue.push({
          projectId,
          execute: fn,
          resolve,
          reject,
        });
      });
    }

    // Execute immediately
    await this.executeSync(projectId, fn);
  }

  /**
   * Execute sync and handle queue processing
   */
  private async executeSync(projectId: string, fn: () => Promise<void>): Promise<void> {
    this.activeSyncs.add(projectId);
    logger.debug(`Starting sync for project ${projectId} (${this.activeSyncs.size} active)`);

    try {
      await fn();
      logger.debug(`Completed sync for project ${projectId}`);
    } finally {
      this.activeSyncs.delete(projectId);
      this.processQueue();
    }
  }

  /**
   * Process next queued sync if capacity available
   */
  private processQueue(): void {
    if (this.queue.length === 0 || this.activeSyncs.size >= MAX_CONCURRENT_SYNCS) {
      return;
    }

    const next = this.queue.shift();
    if (next) {
      logger.info(`Processing queued sync for project ${next.projectId}`);

      this.executeSync(next.projectId, next.execute)
        .then(() => next.resolve())
        .catch(error => next.reject(error));
    }
  }

  /**
   * Cancel a queued sync operation
   * Returns true if operation was queued and cancelled, false if not found
   */
  cancel(projectId: string): boolean {
    const index = this.queue.findIndex(item => item.projectId === projectId);

    if (index !== -1) {
      const cancelled = this.queue.splice(index, 1)[0];
      cancelled.reject(new Error('Sync cancelled'));
      logger.info(`Cancelled queued sync for project ${projectId}`);
      return true;
    }

    return false;
  }

  /**
   * Check if a project has an active sync
   */
  isActive(projectId: string): boolean {
    return this.activeSyncs.has(projectId);
  }

  /**
   * Get queue status for monitoring
   */
  getStatus() {
    return {
      active: this.activeSyncs.size,
      queued: this.queue.length,
      maxConcurrent: MAX_CONCURRENT_SYNCS,
    };
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();
