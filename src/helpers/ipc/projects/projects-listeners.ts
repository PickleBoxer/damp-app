/**
 * IPC listeners for project operations
 * Handles all project-related IPC calls from renderer process
 */

import { ipcMain, BrowserWindow } from 'electron';
import * as https from 'node:https';
import type { CreateProjectInput, UpdateProjectInput } from '../../../types/project';
import { projectStateManager } from '../../../services/projects/project-state-manager';
import * as CHANNELS from './projects-channels';
import { getPortScanRange } from '../../../constants/ports';

/**
 * Add project event listeners
 */
export function addProjectsListeners(mainWindow: BrowserWindow): void {
  // Initialize project manager on first use
  let initPromise: Promise<void> | null = null;
  const ensureInitialized = async () => {
    initPromise ??= projectStateManager.initialize();
    await initPromise;
  };

  // Lazy-load docker manager only when needed (not on app startup)
  let dockerManagerPromise: Promise<
    typeof import('../../../services/docker/docker-manager')
  > | null = null;
  const getDockerManager = async () => {
    dockerManagerPromise ??= import('../../../services/docker/docker-manager');
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
      console.error('Failed to get all projects:', error);
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
      console.error(`Failed to get project ${projectId}:`, error);
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
      const onProgress = (progress: unknown) => {
        mainWindow.webContents.send(CHANNELS.PROJECTS_COPY_PROGRESS, input.name, progress);
      };

      return await projectStateManager.createProject(input, onProgress);
    } catch (error) {
      console.error('Failed to create project:', error);
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
      console.error(`Failed to update project ${input.id}:`, error);
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
        return await projectStateManager.deleteProject(projectId, removeVolume, removeFolder);
      } catch (error) {
        console.error(`Failed to delete project ${projectId}:`, error);
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
      return await projectStateManager.reorderProjects(projectIds);
    } catch (error) {
      console.error('Failed to reorder projects:', error);
      throw error;
    }
  });

  /**
   * Copy project files to volume
   */
  ipcMain.handle(CHANNELS.PROJECTS_COPY_TO_VOLUME, async (_event, projectId: string) => {
    try {
      await ensureInitialized();

      // Progress callback to send updates to renderer
      const onProgress = (progress: unknown) => {
        mainWindow.webContents.send(CHANNELS.PROJECTS_COPY_PROGRESS, projectId, progress);
      };

      return await projectStateManager.copyProjectToVolume(projectId, onProgress);
    } catch (error) {
      console.error(`Failed to copy project ${projectId} to volume:`, error);
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
      console.error('Failed to select folder:', error);
      throw error;
    }
  });

  /**
   * Detect Laravel in folder
   */
  ipcMain.handle(CHANNELS.PROJECTS_DETECT_LARAVEL, async (_event, folderPath: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.detectLaravel(folderPath);
    } catch (error) {
      console.error(`Failed to detect Laravel in ${folderPath}:`, error);
      throw error;
    }
  });

  /**
   * Check if devcontainer exists
   */
  ipcMain.handle(CHANNELS.PROJECTS_DEVCONTAINER_EXISTS, async (_event, folderPath: string) => {
    try {
      await ensureInitialized();
      return await projectStateManager.devcontainerExists(folderPath);
    } catch (error) {
      console.error(`Failed to check devcontainer existence in ${folderPath}:`, error);
      throw error;
    }
  });

  /**
   * Get container status for multiple projects in a single call (optimized)
   * This reduces IPC overhead by batching status checks
   */
  ipcMain.handle(CHANNELS.PROJECTS_GET_BATCH_STATUS, async (_event, projectIds: string[]) => {
    try {
      await ensureInitialized();
      const projects = await projectStateManager.getAllProjects();
      const dockerModule = await getDockerManager();

      // Batch check all container statuses
      const results = await Promise.all(
        projectIds.map(async projectId => {
          const project = projects.find(p => p.id === projectId);

          if (!project) {
            return {
              projectId,
              running: false,
              exists: false,
              ports: [],
            };
          }

          // Use stored container name
          const status = await dockerModule.dockerManager.getContainerStatus(project.containerName);

          return {
            projectId,
            running: status?.running || false,
            exists: status?.exists || false,
            ports: status?.ports || [],
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Failed to get batch container status:', error);
      // Return default status for all projects on error
      return projectIds.map(projectId => ({
        projectId,
        running: false,
        exists: false,
        ports: [],
      }));
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
      console.log(`[Main] Discovering port for container: ${containerName}`);

      // Scan ports using dynamic range from constants
      const { start, end } = getPortScanRange();
      for (let port = start; port <= end; port++) {
        // Try HTTP first (faster, no TLS handshake)
        const httpResult = await makeRequest('http', port);
        if (httpResult === containerName) {
          console.log(`[Main] Found container on HTTP port ${port}`);
          return port;
        }

        // Fallback to HTTPS (for self-signed certs via Caddy)
        const httpsResult = await makeRequest('https', port);
        if (httpsResult === containerName) {
          console.log(`[Main] Found container on HTTPS port ${port}`);
          return port;
        }
      }

      console.log(`[Main] No port found for container: ${containerName}`);
      return null;
    } catch (error) {
      console.error('[Main] Port discovery error:', error);
      return null;
    }
  });
}
