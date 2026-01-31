/**
 * App settings storage - persists app-wide settings to JSON file
 * Simple key-value storage for app configuration flags
 */

import { createLogger } from '@main/utils/logger';
import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const logger = createLogger('AppSettingsStorage');

/**
 * App settings data structure
 */
export interface AppSettings {
  /** Whether Caddy SSL certificate has been installed on host */
  caddyCertInstalled: boolean;
  /** Timestamps of when Docker images were last pulled (imageName -> timestamp) */
  imagePullTimes: Record<string, number>;
  /** Storage schema version for future migrations */
  version: string;
  /** Last update timestamp */
  lastUpdated: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  caddyCertInstalled: false,
  imagePullTimes: {},
  version: '1.0.0',
  lastUpdated: Date.now(),
};

const SETTINGS_FILE_NAME = 'settings.json';

/**
 * App settings storage manager
 */
class AppSettingsStorage {
  private readonly storagePath: string;
  private settings: AppSettings | null = null;
  private initialized = false;

  constructor() {
    this.storagePath = path.join(app.getPath('userData'), SETTINGS_FILE_NAME);
  }

  /**
   * Initialize storage (load from file or create new)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      this.settings = JSON.parse(content) as AppSettings;
      logger.info(`Loaded app settings from ${this.storagePath}`);
    } catch {
      // File doesn't exist or is corrupted - create with defaults
      this.settings = { ...DEFAULT_SETTINGS, lastUpdated: Date.now() };
      await this.save();
      logger.info(`Created new app settings at ${this.storagePath}`);
    }

    this.initialized = true;
  }

  /**
   * Ensure storage is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.settings) {
      throw new Error('AppSettingsStorage not initialized. Call initialize() first.');
    }
  }

  /**
   * Save settings to file (atomic write)
   */
  private async save(): Promise<void> {
    if (!this.settings) {
      throw new Error('No settings to save');
    }

    this.settings.lastUpdated = Date.now();

    // Atomic write: write to temp file then rename
    const tempPath = `${this.storagePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    await fs.rename(tempPath, this.storagePath);

    logger.debug(`Saved app settings to ${this.storagePath}`);
  }

  /**
   * Get all settings
   */
  getAll(): AppSettings {
    this.ensureInitialized();
    return { ...this.settings! };
  }

  /**
   * Get Caddy certificate installed status
   */
  getCaddyCertInstalled(): boolean {
    this.ensureInitialized();
    return this.settings!.caddyCertInstalled;
  }

  /**
   * Set Caddy certificate installed status
   */
  async setCaddyCertInstalled(installed: boolean): Promise<void> {
    this.ensureInitialized();
    this.settings!.caddyCertInstalled = installed;
    await this.save();
  }

  /**
   * Reset all settings to defaults
   */
  async reset(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, lastUpdated: Date.now() };
    await this.save();
    logger.info('App settings reset to defaults');
  }

  /**
   * Get the last pull time for a Docker image
   * @returns Timestamp in milliseconds, or null if never pulled
   */
  getImageLastPullTime(imageName: string): number | null {
    this.ensureInitialized();
    // Ensure imagePullTimes exists (for older settings files)
    if (!this.settings!.imagePullTimes) {
      this.settings!.imagePullTimes = {};
    }
    return this.settings!.imagePullTimes[imageName] ?? null;
  }

  /**
   * Record that an image was pulled
   */
  async setImageLastPullTime(imageName: string, timestamp = Date.now()): Promise<void> {
    this.ensureInitialized();
    // Ensure imagePullTimes exists (for older settings files)
    if (!this.settings!.imagePullTimes) {
      this.settings!.imagePullTimes = {};
    }
    this.settings!.imagePullTimes[imageName] = timestamp;
    await this.save();
  }
}

// Export singleton instance
export const appSettingsStorage = new AppSettingsStorage();
