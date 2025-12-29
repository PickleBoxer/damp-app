/**
 * Service storage - persists service state to JSON file
 */

import type { ServiceState } from '@shared/types/service';
import { BaseStorage } from '@main/core/storage/base-storage';

const STORAGE_FILE_NAME = 'services-config.json';

/**
 * Service storage manager
 */
class ServiceStorage extends BaseStorage<ServiceState> {
  constructor() {
    super(STORAGE_FILE_NAME, 'ServiceStorage');
  }

  /**
   * Get service state by ID
   */
  getServiceState(serviceId: string): ServiceState | null {
    return this.get(serviceId);
  }

  /**
   * Get all service states
   */
  getAllServiceStates(): Record<string, ServiceState> {
    return this.getAllAsRecord();
  }

  /**
   * Set service state
   */
  async setServiceState(serviceId: string, state: ServiceState): Promise<void> {
    await this.set(serviceId, state);
  }

  /**
   * Update service state partially
   */
  async updateServiceState(serviceId: string, updates: Partial<ServiceState>): Promise<void> {
    await this.update(serviceId, updates);
  }

  /**
   * Delete service state
   */
  async deleteServiceState(serviceId: string): Promise<void> {
    await this.delete(serviceId);
  }

  /**
   * Check if service exists in storage
   */
  hasService(serviceId: string): boolean {
    return this.has(serviceId);
  }
}

// Export singleton instance
export const serviceStorage = new ServiceStorage();
