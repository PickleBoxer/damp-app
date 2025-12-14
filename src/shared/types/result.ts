/**
 * Generic result type for operations that can succeed or fail
 * Replaces repeated { success: boolean; error?: string; data?: T } pattern
 */
export interface Result<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}
