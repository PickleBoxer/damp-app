/**
 * Base state manager - shared initialization pattern for domain managers
 * Provides consistent initialization lifecycle and error handling
 */

import { createLogger } from '@main/utils/logger';

/**
 * Abstract base class for state managers
 * Provides thread-safe initialization pattern and logging
 */
export abstract class BaseStateManager {
  protected initialized = false;
  protected initializationPromise: Promise<void> | null = null;
  protected readonly logger: ReturnType<typeof createLogger>;

  constructor(loggerName: string) {
    this.logger = createLogger(loggerName);
  }

  /**
   * Initialize the manager (thread-safe, idempotent)
   * Subclasses must implement _initialize() for actual initialization logic
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Return existing initialization promise if already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    try {
      await this.initializationPromise;
      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize:', { error });
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Subclasses implement actual initialization logic here
   */
  protected abstract _initialize(): Promise<void>;

  /**
   * Check if manager is initialized, throw if not
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized. Call initialize() first.`);
    }
  }

  /**
   * Check if manager is initialized (non-throwing)
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
