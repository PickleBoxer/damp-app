/**
 * Project storage - persists project state to JSON file
 */

import type { Project } from '@shared/types/project';
import { BaseStorage } from '@main/core/storage/base-storage';

const STORAGE_FILE_NAME = 'projects-state.json';

/**
 * Project storage manager
 */
class ProjectStorage extends BaseStorage<Project> {
  constructor() {
    super(STORAGE_FILE_NAME, 'ProjectStorage');
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | null {
    return this.get(projectId);
  }

  /**
   * Get all projects (sorted by order)
   */
  getAllProjects(): Project[] {
    return this.getAll().sort((a, b) => a.order - b.order);
  }

  /**
   * Set project
   */
  async setProject(project: Project): Promise<void> {
    await this.set(project.id, {
      ...project,
      updatedAt: Date.now(),
    });
  }

  /**
   * Update project partially
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    // Prevent id modification
    const { id, ...safeUpdates } = updates;
    if (id !== undefined && id !== projectId) {
      throw new Error('Cannot change project id');
    }

    const existingProject = this.get(projectId);
    if (!existingProject) {
      throw new Error(`Project ${projectId} not found in storage`);
    }

    await this.set(projectId, {
      ...existingProject,
      ...safeUpdates,
      updatedAt: Date.now(),
    });
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.delete(projectId);
  }

  /**
   * Check if project exists in storage
   */
  hasProject(projectId: string): boolean {
    return this.has(projectId);
  }

  /**
   * Get next order number for new project
   */
  getNextOrder(): number {
    const projects = this.getAll();
    if (projects.length === 0) {
      return 0;
    }

    return Math.max(...projects.map(p => p.order)) + 1;
  }

  /**
   * Reorder projects
   */
  async reorderProjects(projectIds: string[]): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    // Update order for each project
    for (const [index, id] of projectIds.entries()) {
      if (this.data.items[id]) {
        this.data.items[id].order = index;
        this.data.items[id].updatedAt = Date.now();
      }
    }

    await this.save();
  }
}

// Export singleton instance
export const projectStorage = new ProjectStorage();
