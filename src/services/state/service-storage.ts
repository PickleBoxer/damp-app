/**
 * Service storage - persists service state to JSON file
 */

import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { ServiceStorageData, ServiceState } from "../../types/service";

const STORAGE_VERSION = "1.0.0";
const STORAGE_FILE_NAME = "services-config.json";

/**
 * Service storage manager
 */
class ServiceStorage {
  private readonly storagePath: string;
  private data: ServiceStorageData | null = null;

  constructor() {
    // Store in app's user data directory
    this.storagePath = path.join(
      app.getPath("userData"),
      STORAGE_FILE_NAME
    );
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
        services: {},
        version: STORAGE_VERSION,
        last_updated: Date.now(),
      };
      await this.save();
    }
  }

  /**
   * Load storage from file
   */
  private async load(): Promise<void> {
    const content = await fs.readFile(this.storagePath, "utf-8");
    this.data = JSON.parse(content) as ServiceStorageData;

    // Validate version
    if (!this.data.version) {
      throw new Error("Invalid storage file: missing version");
    }

    console.log(`Loaded service configuration from ${this.storagePath}`);
  }

  /**
   * Save storage to file
   */
  async save(): Promise<void> {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    this.data.last_updated = Date.now();

    await fs.writeFile(
      this.storagePath,
      JSON.stringify(this.data, null, 2),
      "utf-8"
    );

    console.log(`Saved service configuration to ${this.storagePath}`);
  }

  /**
   * Get service state by ID
   */
  getServiceState(serviceId: string): ServiceState | null {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    return this.data.services[serviceId] || null;
  }

  /**
   * Get all service states
   */
  getAllServiceStates(): Record<string, ServiceState> {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    return this.data.services;
  }

  /**
   * Set service state
   */
  async setServiceState(
    serviceId: string,
    state: ServiceState
  ): Promise<void> {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    this.data.services[serviceId] = state;
    await this.save();
  }

  /**
   * Update service state partially
   */
  async updateServiceState(
    serviceId: string,
    updates: Partial<ServiceState>
  ): Promise<void> {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    const existingState = this.data.services[serviceId];
    if (!existingState) {
      throw new Error(`Service ${serviceId} not found in storage`);
    }

    this.data.services[serviceId] = {
      ...existingState,
      ...updates,
    };

    await this.save();
  }

  /**
   * Delete service state
   */
  async deleteServiceState(serviceId: string): Promise<void> {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    delete this.data.services[serviceId];
    await this.save();
  }

  /**
   * Check if service exists in storage
   */
  hasService(serviceId: string): boolean {
    if (!this.data) {
      throw new Error("Storage not initialized");
    }

    return serviceId in this.data.services;
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
  exportData(): ServiceStorageData | null {
    return this.data ? { ...this.data } : null;
  }

  /**
   * Import data (for restore)
   */
  async importData(data: ServiceStorageData): Promise<void> {
    this.data = data;
    await this.save();
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.data = {
      services: {},
      version: STORAGE_VERSION,
      last_updated: Date.now(),
    };
    await this.save();
  }
}

// Export singleton instance
export const serviceStorage = new ServiceStorage();
