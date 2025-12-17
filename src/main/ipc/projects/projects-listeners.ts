/**
 * IPC listeners for project operations
 * Handles all project-related IPC calls from renderer process
 */

import { ipcMain, BrowserWindow } from 'electron';
import { z } from 'zod';
import * as https from 'node:https';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  VolumeCopyProgress,
} from '@shared/types/project';
import { projectStateManager } from '@main/services/projects/project-state-manager';
import * as CHANNELS from './projects-channels';
import { getPortScanRange } from '@shared/constants/ports';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('projects-ipc');

// Validation schemas
const projectIdSchema = z.string().uuid();
const projectIdsSchema = z.array(z.string().uuid());

// Prevent duplicate listener registration
let listenersAdded = false;

/**
 * Add project event listeners
 */
export function addProjectsListeners(mainWindow: BrowserWindow): void {
  if (listenersAdded) return;
  listenersAdded = true;
  // Initialize project manager on first use
  let initPromise: Promise<void> | null = null;
  const ensureInitialized = async () => {
    initPromise ??= projectStateManager.initialize();
    await initPromise;
  };

  // Lazy-load docker manager only when needed (not on app startup)
  let dockerManagerPromise: Promise<typeof import('@main/services/docker/docker-manager')> | null =
    null;
  const getDockerManager = async () => {
    dockerManagerPromise ??= import('@main/services/docker/docker-manager');
    return dockerManagerPromise;
  };

  /**
   * Get all projects
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_ALL, async () => {
    try {
      await ensureInitialized();
      return await projectStateManager.getAllProjects();
    } catch (error) {
      logger.error('Failed to get all projects', { error });
      throw error;
    }
  });

  /**
   * Get a specific project
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_ONE, async (_event, projectId: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.getProject(projectId);
    } catch (error) {
      logger.error('Failed to get project', { projectId, error });
      throw error;
    }
  });

  /**
   * Create a project
   */
  ipcMain.handle(CHANNELS.PROJECTS_CREATE, async (_event, input: CreateProjectInput) => {
    try {
      await ensureInitialized();

      // Progress callback to send updates to renderer
      const onProgress = (progress: VolumeCopyProgress) => {
        if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send(CHANNELS.PROJECTS_COPY_PROGRESS, input.name, progress);
        }
      };

      return await projectStateManager.createProject(input, onProgress);
    } catch (error) {
      logger.error('Failed to create project', { error });
      throw error;
    }
  });

  /**
   * Update a project
   */
  ipcMain.handle(CHANNELS.PROJECTS_UPDATE, async (_event, input: UpdateProjectInput) => {
    try {
      await ensureInitialized();
      return await projectStateManager.updateProject(input);
    } catch (error) {
      logger.error('Failed to update project', { projectId: input.id, error });
      throw error;
    }
  });

  /**
   * Delete a project
   */
  ipcMain.handle(
    CHANNELS.PROJECTS_DELETE,
    async (_event, projectId: string, removeVolume = false, removeFolder = false) => {
      try {
        await ensureInitialized();
        // Validate projectId
        projectIdSchema.parse(projectId);
        return await projectStateManager.deleteProject(projectId, removeVolume, removeFolder);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.issues.map(issue => issue.message).join(', ');
          logger.error('Invalid project ID', { error: errorMessage });
          throw new Error(`Invalid project ID: ${errorMessage}`);
        }
        logger.error('Failed to delete project', { projectId, error });
        throw error;
      }
    }
  );

  /**
   * Reorder projects
   */
  ipcMain.handle(CHANNELS.PROJECTS_REORDER, async (_event, projectIds: string[]) => {
    try {
      await ensureInitialized();
      // Validate projectIds array
      projectIdsSchema.parse(projectIds);
      return await projectStateManager.reorderProjects(projectIds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map(issue => issue.message).join(', ');
        logger.error('Invalid project IDs', { error: errorMessage });
        throw new Error(`Invalid project IDs: ${errorMessage}`);
      }
      logger.error('Failed to reorder projects', { error });
      throw error;
    }
  });

  /**
   * Open folder selection dialog
   */
  ipcMain.handle(CHANNELS.PROJECTS_SELECT_FOLDER, async (_event, defaultPath?: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.selectFolder(defaultPath);
    } catch (error) {
      logger.error('Failed to select folder', { error });
      throw error;
    }
  });

  /**
   * Get container status for all projects
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_STATUS, async () => {
    try {
      await ensureInitialized();
      return await projectStateManager.getProjectsState();
    } catch (error) {
      logger.error('Failed to get projects status', { error });
      throw error;
    }
  });

  /**
   * Get container status for a specific project
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_CONTAINER_STATUS, async (_event, projectId: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.getProjectContainerStatus(projectId);
    } catch (error) {
      logger.error('Failed to get project container status', { projectId, error });
      throw error;
    }
  });

  /**
   * Discover forwarded localhost port for a container
   * Scans dynamic port range and checks X-Container-Name header
   * Tries HTTP first (faster), then HTTPS with self-signed cert support
   */
  ipcMain.handle(CHANNELS.PROJECTS_DISCOVER_PORT, async (_event, containerName: string) => {
    /**
     * Make HTTP or HTTPS request to check X-Container-Name header
     * @param protocol - 'http' or 'https'
     * @param port - Port number to check
     * @returns Header value or null if request fails
     */
    const makeRequest = (protocol: 'http' | 'https', port: number): Promise<string | null> => {
      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          resolve(null);
        }, 2000);

        try {
          if (protocol === 'http') {
            // Use fetch for HTTP (simpler, no cert issues)
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 2000);

            fetch(`http://localhost:${port}`, {
              method: 'HEAD',
              signal: controller.signal,
            })
              .then(response => {
                clearTimeout(timeout);
                clearTimeout(fetchTimeout);
                resolve(response.headers.get('x-container-name'));
              })
              .catch(() => {
                clearTimeout(timeout);
                clearTimeout(fetchTimeout);
                resolve(null);
              });
          } else {
            // Use https module for HTTPS with self-signed cert support
            const req = https.request(
              {
                hostname: 'localhost',
                port,
                method: 'HEAD',
                path: '/',
                rejectUnauthorized: false, // Accept self-signed certificates (localhost only)
                timeout: 2000,
              },
              res => {
                clearTimeout(timeout);
                resolve((res.headers['x-container-name'] as string | undefined) || null);
                res.resume(); // Consume response to free up memory
              }
            );

            req.on('error', () => {
              clearTimeout(timeout);
              resolve(null);
            });

            req.on('timeout', () => {
              req.destroy();
              clearTimeout(timeout);
              resolve(null);
            });

            req.end();
          }
        } catch {
          clearTimeout(timeout);
          resolve(null);
        }
      });
    };

    try {
      logger.debug('Discovering port for container', { containerName });

      // Scan ports using dynamic range from constants
      const { start, end } = getPortScanRange();
      for (let port = start; port <= end; port++) {
        // Try HTTP first (faster, no TLS handshake)
        const httpResult = await makeRequest('http', port);
        if (httpResult === containerName) {
          logger.debug('Found container on HTTP port', { port });
          return port;
        }

        // Fallback to HTTPS (for self-signed certs via Caddy)
        const httpsResult = await makeRequest('https', port);
        if (httpsResult === containerName) {
          logger.debug('Found container on HTTPS port', { port });
          return port;
        }
      }

      logger.debug('No port found for container', { containerName });
      return null;
    } catch (error) {
      logger.error('Port discovery error', { error });
      return null;
    }
  });
}
