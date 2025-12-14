/**
 * Project storage - persists project state to JSON file
 */

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectStorageData, Project } from '@shared/types/project';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('ProjectStorage');

const STORAGE_VERSION = '1.0.0';
const STORAGE_FILE_NAME = 'projects-state.json';

/**
 * Project storage manager
 */
class ProjectStorage {
  private readonly storagePath: string;
  private data: ProjectStorageData | null = null;

  constructor() {
    // Store in app's user data directory
    this.storagePath = path.join(app.getPath('userData'), STORAGE_FILE_NAME);
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
        projects: {},
        version: STORAGE_VERSION,
        lastUpdated: Date.now(),
      };
      await this.save();
    }
  }

  /**
   * Load storage from file
   */
  private async load(): Promise<void> {
    const content = await fs.readFile(this.storagePath, 'utf-8');
    this.data = JSON.parse(content) as ProjectStorageData;

    // Validate version
    if (!this.data.version || !this.data.projects || typeof this.data.projects !== 'object') {
      throw new Error('Invalid storage file: missing required fields');
    }

    logger.info(`Loaded project configuration from ${this.storagePath}`);
  }

  /**
   * Save storage to file
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

    logger.info(`Saved project configuration to ${this.storagePath}`);
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | null {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return this.data.projects[projectId] || null;
  }

  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return Object.values(this.data.projects).sort((a, b) => a.order - b.order);
  }

  /**
   * Set project
   */
  async setProject(project: Project): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    this.data.projects[project.id] = {
      ...project,
      updatedAt: Date.now(),
    };
    await this.save();
  }

  /**
   * Update project partially
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    const existingProject = this.data.projects[projectId];
    if (!existingProject) {
      throw new Error(`Project ${projectId} not found in storage`);
    }

    // Prevent id modification
    const { id, ...safeUpdates } = updates;
    if (id !== undefined && id !== projectId) {
      throw new Error('Cannot change project id');
    }

    this.data.projects[projectId] = {
      ...existingProject,
      ...safeUpdates,
      updatedAt: Date.now(),
    };

    await this.save();
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    delete this.data.projects[projectId];
    await this.save();
  }

  /**
   * Check if project exists in storage
   */
  hasProject(projectId: string): boolean {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    return projectId in this.data.projects;
  }

  /**
   * Get next order number for new project
   */
  getNextOrder(): number {
    if (!this.data) {
      throw new Error('Storage not initialized');
    }

    const projects = Object.values(this.data.projects);
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
      if (this.data.projects[id]) {
        this.data.projects[id].order = index;
        this.data.projects[id].updatedAt = Date.now();
      }
    }

    await this.save();
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
  exportData(): ProjectStorageData | null {
    return this.data ? { ...this.data } : null;
  }

  /**
   * Import data (for restore)
   */
  async importData(data: ProjectStorageData): Promise<void> {
    // Validate structure
    if (!data.version || !data.projects || typeof data.projects !== 'object') {
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
      projects: {},
      version: STORAGE_VERSION,
      lastUpdated: Date.now(),
    };
    await this.save();
  }
}

// Export singleton instance
export const projectStorage = new ProjectStorage();
