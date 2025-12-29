/**
 * Base storage class - generic storage manager for JSON persistence
 */

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@main/utils/logger';

export interface StorageData<T> {
  items: Record<string, T>;
  version: string;
  lastUpdated: number;
}

/**
 * Base storage manager with generic type support
 */
export abstract class BaseStorage<T> {
  protected readonly storagePath: string;
  protected data: StorageData<T> | null = null;
  protected readonly logger: ReturnType<typeof createLogger>;
  protected readonly storageVersion = '1.0.0';

  constructor(fileName: string, loggerName: string) {
    this.storagePath = path.join(app.getPath('userData'), fileName);
    this.logger = createLogger(loggerName);
  }

  /**
   * Initialize storage (load from file or create new)
   */
  async initialize(): Promise<void> {
    try {
      await this.load();
    } catch {
      // If file doesn't exist or is corrupted, create new
      this.data = {
        items: {},
        version: this.storageVersion,
        lastUpdated: Date.now(),
      };
      await this.save();
    }
  }

  /**
   * Load storage from file
   */
  protected async load(): Promise<void> {
    const content = await fs.readFile(this.storagePath, 'utf-8');
    this.data = JSON.parse(content) as StorageData<T>;

    // Validate version
    if (!this.data.version || !this.data.items || typeof this.data.items !== 'object') {
      throw new Error('Invalid storage file: missing required fields');
    }

    this.logger.info(`Loaded configuration from ${this.storagePath}`);
  }

  /**
   * Save storage to file (atomic write)
   */
  async save(): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    this.data.lastUpdated = Date.now();

    // Atomic write: write to temp file then rename
    const tempPath = `${this.storagePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.storagePath);

    this.logger.info(`Saved configuration to ${this.storagePath}`);
  }

  /**
   * Get item by ID
   */
  get(id: string): T | null {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return this.data.items[id] || null;
  }

  /**
   * Get all items
   */
  getAll(): T[] {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return Object.values(this.data.items);
  }

  /**
   * Get all items as record
   */
  getAllAsRecord(): Record<string, T> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return this.data.items;
  }

  /**
   * Set item
   */
  async set(id: string, item: T): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    this.data.items[id] = item;
    await this.save();
  }

  /**
   * Update item partially
   */
  async update(id: string, updates: Partial<T>): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    const existingItem = this.data.items[id];
    if (!existingItem) {
      throw new Error(`Item ${id} not found in storage`);
    }

    this.data.items[id] = {
      ...existingItem,
      ...updates,
    };

    await this.save();
  }

  /**
   * Delete item
   */
  async delete(id: string): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    delete this.data.items[id];
    await this.save();
  }

  /**
   * Check if item exists in storage
   */
  has(id: string): boolean {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return id in this.data.items;
  }

  /**
   * Get storage file path
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * Export all data (for backup)
   */
  exportData(): StorageData<T> | null {
    return this.data ? { ...this.data } : null;
  }

  /**
   * Import data (for restore)
   */
  async importData(data: StorageData<T>): Promise<void> {
    // Validate structure
    if (!data.version || !data.items || typeof data.items !== 'object') {
      throw new Error('Invalid data: missing required fields');
    }
    this.data = data;
    await this.save();
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.data = {
      items: {},
      version: this.storageVersion,
      lastUpdated: Date.now(),
    };
    await this.save();
  }
}
