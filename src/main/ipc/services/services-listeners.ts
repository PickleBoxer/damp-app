/**
 * IPC listeners for service operations
 * Handles all service-related IPC calls from renderer process
 */

import { serviceStateManager } from '@main/domains/services/service-state-manager';
import { createLogger } from '@main/utils/logger';
import type { CustomConfig, InstallOptions, ServiceId } from '@shared/types/service';
import { BrowserWindow, ipcMain } from 'electron';
import * as CHANNELS from './services-channels';

const logger = createLogger('services-ipc');

// Prevent duplicate listener registration
let listenersAdded = false;

/**
 * Add service event listeners
 */
export function addServicesListeners(mainWindow: BrowserWindow): void {
  if (listenersAdded) return;
  listenersAdded = true;

  // Initialize service manager on first use - fix race condition
  let initPromise: Promise<void> | null = null;
  const ensureInitialized = async () => {
    initPromise ??= serviceStateManager.initialize();
    await initPromise;
  };

  /**
   * Get all services
   */
  ipcMain.handle(CHANNELS.SERVICES_GET_ALL, async () => {
    try {
      await ensureInitialized();
      return await serviceStateManager.getAllServices();
    } catch (error) {
      logger.error('Failed to get all services', { error });
      throw error;
    }
  });

  /**
   * Get a specific service
   */
  ipcMain.handle(CHANNELS.SERVICES_GET_ONE, async (_event, serviceId: ServiceId) => {
    try {
      await ensureInitialized();
      return await serviceStateManager.getService(serviceId);
    } catch (error) {
      logger.error('Failed to get service', { serviceId, error });
      throw error;
    }
  });

  /**
   * Get container status for a specific service
   */
  ipcMain.handle(CHANNELS.SERVICES_GET_CONTAINER_STATE, async (_event, serviceId: ServiceId) => {
    try {
      await ensureInitialized();
      return await serviceStateManager.getServiceContainerState(serviceId);
    } catch (error) {
      logger.error('Failed to get service container state', { serviceId, error });
      throw error;
    }
  });

  /**
   * Install a service
   */
  ipcMain.handle(
    CHANNELS.SERVICES_INSTALL,
    async (_event, serviceId: ServiceId, options?: InstallOptions) => {
      try {
        await ensureInitialized();

        // Progress callback to send updates to renderer
        const onProgress = (progress: unknown) => {
          if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send(CHANNELS.SERVICES_INSTALL_PROGRESS, serviceId, progress);
          }
        };

        return await serviceStateManager.installService(serviceId, options, onProgress);
      } catch (error) {
        logger.error('Failed to install service', { serviceId, error });
        throw error;
      }
    }
  );

  /**
   * Uninstall a service
   */
  ipcMain.handle(
    CHANNELS.SERVICES_UNINSTALL,
    async (_event, serviceId: ServiceId, removeVolumes = false) => {
      try {
        await ensureInitialized();
        return await serviceStateManager.uninstallService(serviceId, removeVolumes);
      } catch (error) {
        logger.error('Failed to uninstall service', { serviceId, error });
        throw error;
      }
    }
  );

  /**
   * Start a service
   */
  ipcMain.handle(CHANNELS.SERVICES_START, async (_event, serviceId: ServiceId) => {
    try {
      await ensureInitialized();
      return await serviceStateManager.startService(serviceId);
    } catch (error) {
      logger.error('Failed to start service', { serviceId, error });
      throw error;
    }
  });

  /**
   * Stop a service
   */
  ipcMain.handle(CHANNELS.SERVICES_STOP, async (_event, serviceId: ServiceId) => {
    try {
      await ensureInitialized();
      return await serviceStateManager.stopService(serviceId);
    } catch (error) {
      logger.error('Failed to stop service', { serviceId, error });
      throw error;
    }
  });

  /**
   * Restart a service
   */
  ipcMain.handle(CHANNELS.SERVICES_RESTART, async (_event, serviceId: ServiceId) => {
    try {
      await ensureInitialized();
      return await serviceStateManager.restartService(serviceId);
    } catch (error) {
      logger.error('Failed to restart service', { serviceId, error });
      throw error;
    }
  });

  /**
   * Update service configuration
   */
  ipcMain.handle(
    CHANNELS.SERVICES_UPDATE_CONFIG,
    async (_event, serviceId: ServiceId, customConfig: CustomConfig) => {
      try {
        await ensureInitialized();
        return await serviceStateManager.updateServiceConfig(serviceId, customConfig);
      } catch (error) {
        logger.error('Failed to update service configuration', { serviceId, error });
        throw error;
      }
    }
  );

  /**
   * Download Caddy SSL certificate
   */
  ipcMain.handle(CHANNELS.SERVICES_CADDY_DOWNLOAD_CERT, async () => {
    try {
      const { dialog } = await import('electron');
      const { getFileFromContainer } = await import('@main/core/docker');
      const { writeFileSync } = await import('node:fs');

      // Get certificate from container
      const CADDY_ROOT_CERT_PATH = '/data/caddy/pki/authorities/local/root.crt';
      const certBuffer = await getFileFromContainer('damp-web', CADDY_ROOT_CERT_PATH);

      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Caddy Root Certificate',
        defaultPath: 'damp-caddy-root.crt',
        filters: [
          { name: 'Certificate Files', extensions: ['crt', 'pem'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, certBuffer);
        return { success: true, path: result.filePath };
      }

      return { success: false, error: 'Download canceled' };
    } catch (error) {
      logger.error('Failed to download Caddy certificate', { error });
      throw error;
    }
  });

  /**
   * List databases for a service
   */
  ipcMain.handle(CHANNELS.SERVICES_DATABASE_LIST_DBS, async (_event, serviceId: ServiceId) => {
    try {
      await ensureInitialized();

      // Verify service is a database type
      const service = await serviceStateManager.getService(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }
      if (!service.databaseConfig) {
        throw new Error(`Service ${serviceId} does not support database operations`);
      }

      // Check if container is running
      const containerState = await serviceStateManager.getServiceContainerState(serviceId);
      if (!containerState?.running) {
        throw new Error('Container must be running to list databases');
      }

      // Check if container is healthy (for services with healthchecks)
      if (
        containerState.health_status !== 'none' &&
        containerState.health_status !== 'healthy'
      ) {
        throw new Error(
          `Container must be healthy to perform database operations (current status: ${containerState.health_status})`
        );
      }

      const { listDatabases } = await import('@main/domains/services/database-operations');
      return await listDatabases(serviceId);
    } catch (error) {
      logger.error('Failed to list databases', { serviceId, error });
      throw error;
    }
  });

  /**
   * Dump database to file
   */
  ipcMain.handle(
    CHANNELS.SERVICES_DATABASE_DUMP,
    async (_event, serviceId: ServiceId, databaseName: string) => {
      try {
        await ensureInitialized();

        // Verify service is a database type
        const service = await serviceStateManager.getService(serviceId);
        if (!service) {
          throw new Error(`Service ${serviceId} not found`);
        }
        if (!service.databaseConfig) {
          throw new Error(`Service ${serviceId} does not support database operations`);
        }

        // Check if container is running
        const containerState = await serviceStateManager.getServiceContainerState(serviceId);
        if (!containerState?.running) {
          throw new Error('Container must be running to dump database');
        }

        // Check if container is healthy (for services with healthchecks)
        if (
          containerState.health_status !== 'none' &&
          containerState.health_status !== 'healthy'
        ) {
          throw new Error(
            `Container must be healthy to perform database operations (current status: ${containerState.health_status})`
          );
        }

        const { dialog } = await import('electron');
        const { writeFileSync } = await import('node:fs');
        const {
          dumpDatabase,
          getDumpFileExtension,
          getDumpFileFilter,
        } = await import('@main/domains/services/database-operations');

        // Create dump
        const dumpBuffer = await dumpDatabase(serviceId, databaseName);

        // Show save dialog
        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, -5);
        const extension = getDumpFileExtension(serviceId);
        const filter = getDumpFileFilter(serviceId);

        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save Database Dump',
          defaultPath: `${databaseName}-${timestamp}.${extension}`,
          filters: [filter, { name: 'All Files', extensions: ['*'] }],
        });

        if (!result.canceled && result.filePath) {
          writeFileSync(result.filePath, dumpBuffer);
          return { success: true, path: result.filePath };
        }

        return { success: false, error: 'Dump canceled' };
      } catch (error) {
        logger.error('Failed to dump database', { serviceId, databaseName, error });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  /**
   * Restore database from file
   */
  ipcMain.handle(
    CHANNELS.SERVICES_DATABASE_RESTORE,
    async (_event, serviceId: ServiceId, databaseName: string) => {
      try {
        await ensureInitialized();

        // Verify service is a database type
        const service = await serviceStateManager.getService(serviceId);
        if (!service) {
          throw new Error(`Service ${serviceId} not found`);
        }
        if (!service.databaseConfig) {
          throw new Error(`Service ${serviceId} does not support database operations`);
        }

        // Check if container is running
        const containerState = await serviceStateManager.getServiceContainerState(serviceId);
        if (!containerState?.running) {
          throw new Error('Container must be running to restore database');
        }

        // Check if container is healthy (for services with healthchecks)
        if (
          containerState.health_status !== 'none' &&
          containerState.health_status !== 'healthy'
        ) {
          throw new Error(
            `Container must be healthy to perform database operations (current status: ${containerState.health_status})`
          );
        }

        const { dialog } = await import('electron');
        const { readFileSync } = await import('node:fs');
        const { getDumpFileFilter, restoreDatabase } = await import(
          '@main/domains/services/database-operations'
        );

        const filter = getDumpFileFilter(serviceId);

        // Show open dialog
        const result = await dialog.showOpenDialog(mainWindow, {
          title: 'Select Database Dump File',
          filters: [filter, { name: 'All Files', extensions: ['*'] }],
          properties: ['openFile'],
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const dumpData = readFileSync(filePath);

          // Restore database
          await restoreDatabase(serviceId, databaseName, dumpData);

          return { success: true };
        }

        return { success: false, error: 'Restore canceled' };
      } catch (error) {
        logger.error('Failed to restore database', { serviceId, databaseName, error });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  logger.info('Service IPC listeners registered');
}
