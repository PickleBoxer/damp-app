/**
 * Ngrok state manager
 * Manages ngrok tunnel state for projects
 */

import type { NgrokStatus } from '@shared/types/ngrok';

export type { NgrokStatus };

export interface NgrokState {
  projectId: string;
  containerId: string;
  publicUrl: string;
  status: NgrokStatus;
  startedAt: number;
  error?: string;
  region?: string;
}

/**
 * In-memory storage for ngrok tunnel states
 */
class NgrokStateManager {
  private readonly states = new Map<string, NgrokState>();

  /**
   * Set state for a project
   */
  setState(projectId: string, state: NgrokState): void {
    if (state.projectId !== projectId) {
      throw new Error(
        `State projectId (${state.projectId}) does not match parameter (${projectId})`
      );
    }
    this.states.set(projectId, state);
  }

  /**
   * Get state for a project
   */
  getState(projectId: string): NgrokState | undefined {
    return this.states.get(projectId);
  }

  /**
   * Update state properties for a project
   */
  updateState(projectId: string, updates: Partial<NgrokState>): void {
    const existing = this.states.get(projectId);
    if (existing) {
      this.states.set(projectId, { ...existing, ...updates });
    }
  }

  /**
   * Delete state for a project
   */
  deleteState(projectId: string): void {
    this.states.delete(projectId);
  }

  /**
   * Get all tunnel states
   */
  getAllStates(): NgrokState[] {
    return Array.from(this.states.values());
  }

  /**
   * Clear all states
   */
  clearAll(): void {
    this.states.clear();
  }
}

export const ngrokStateManager = new NgrokStateManager();
