/**
 * Generic result type for operations that can succeed or fail
 * Replaces repeated { success: boolean; error?: string; data?: T } pattern
 */
export interface Result<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Generic storage data structure for persisting items to disk
 * Used by both services and projects for JSON file storage
 */
export interface StorageData<T> {
  /** Map of item ID to item */
  items: Record<string, T>;
  /** Version of storage schema */
  version: string;
  /** Last updated timestamp */
  lastUpdated: number;
}
