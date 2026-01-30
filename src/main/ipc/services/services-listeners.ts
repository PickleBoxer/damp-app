/**
 * IPC listeners for service operations
 * Handles all service-related IPC calls from renderer process
 */

import { getBundleableServicesByType } from '@main/domains/services/service-definitions';
import { serviceStateManager } from '@main/domains/services/service-state-manager';
import { createLogger } from '@main/utils/logger';
import type { InstallOptions } from '@shared/types/service';
import { ServiceId } from '@shared/types/service';
import { BrowserWindow, ipcMain } from 'electron';
import { z } from 'zod';
import * as CHANNELS from './services-channels';

const logger = createLogger('services-ipc');

// UUID regex pattern for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validation schemas
const projectIdSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format');
const serviceIdSchema = z.nativeEnum(ServiceId, 'Invalid service ID');
const databaseNameSchema = z.string().min(1, 'Database name cannot be empty');

// Prevent duplicate listener registration
let listenersAdded = false;

/**
 * Validates that a service supports database operations and is ready to perform them
 * @throws Error if validation fails
 */
async function validateDatabaseOperation(serviceId: ServiceId) {
  // Verify service exists and is a database type
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
    throw new Error('Container must be running to perform database operations');
  }

  // Check if container is healthy (for services with healthchecks)
  if (containerState.health_status !== 'none' && containerState.health_status !== 'healthy') {
    throw new Error(
      `Container must be healthy to perform database operations (current status: ${containerState.health_status})`
    );
  }

  return service;
}

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
   * Get bundleable services grouped by type (for project wizard)
   */
  ipcMain.handle(CHANNELS.SERVICES_GET_BUNDLEABLE, () => {
    // No async needed - this reads from static definitions
    return getBundleableServicesByType();
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
        return await serviceStateManager.installService(serviceId, options);
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
    async (_event, serviceId: ServiceId, removeVolumes = true) => {
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
   * Get Caddy SSL certificate installed status
   */
  ipcMain.handle(CHANNELS.SERVICES_CADDY_GET_CERT_STATUS, async () => {
    try {
      await ensureInitialized();
      return serviceStateManager.getCaddyCertInstalled();
    } catch (error) {
      logger.error('Failed to get Caddy cert status', { error });
      return false;
    }
  });

  /**
   * Download Caddy SSL certificate
   */
  ipcMain.handle(CHANNELS.SERVICES_CADDY_DOWNLOAD_CERT, async () => {
    try {
      const { dialog } = await import('electron');
      const { findContainerByLabel, getFileFromContainer } = await import('@main/core/docker');
      const { writeFileSync } = await import('node:fs');
      const { LABEL_KEYS, RESOURCE_TYPES } = await import('@shared/constants/labels');
      const { ServiceId } = await import('@shared/types/service');

      // Find Caddy container by label instead of hardcoded name
      const caddyContainer = await findContainerByLabel(
        LABEL_KEYS.SERVICE_ID,
        ServiceId.Caddy,
        RESOURCE_TYPES.SERVICE_CONTAINER
      );

      if (!caddyContainer) {
        throw new Error('Caddy container not found. Please ensure Caddy is installed and running.');
      }

      // Get certificate from container using container ID
      const CADDY_ROOT_CERT_PATH = '/data/caddy/pki/authorities/local/root.crt';
      const certBuffer = await getFileFromContainer(caddyContainer.Id, CADDY_ROOT_CERT_PATH);

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
   * List databases for a service (standalone or bundled)
   */
  ipcMain.handle(
    CHANNELS.SERVICES_DATABASE_LIST_DBS,
    async (_event, { serviceId, projectId }: { serviceId: ServiceId; projectId?: string }) => {
      try {
        const validatedServiceId = serviceIdSchema.parse(serviceId);
        const validatedProjectId = projectId ? projectIdSchema.parse(projectId) : undefined;

        await ensureInitialized();
        if (!projectId) {
          await validateDatabaseOperation(validatedServiceId);
        }

        const { listDatabases } = await import('@main/domains/services/database-operations');
        return await listDatabases(validatedServiceId, validatedProjectId);
      } catch (error) {
        logger.error('Failed to list databases', { serviceId, projectId, error });
        throw error;
      }
    }
  );

  /**
   * Dump database to file (standalone or bundled)
   */
  ipcMain.handle(
    CHANNELS.SERVICES_DATABASE_DUMP,
    async (
      _event,
      {
        serviceId,
        databaseName,
        projectId,
      }: { serviceId: ServiceId; databaseName: string; projectId?: string }
    ) => {
      try {
        const validatedServiceId = serviceIdSchema.parse(serviceId);
        const validatedDatabaseName = databaseNameSchema.parse(databaseName);
        const validatedProjectId = projectId ? projectIdSchema.parse(projectId) : undefined;

        await ensureInitialized();
        if (!projectId) {
          await validateDatabaseOperation(validatedServiceId);
        }

        const { dialog } = await import('electron');
        const { writeFileSync } = await import('node:fs');
        const { dumpDatabase, getDumpFileExtension, getDumpFileFilter } =
          await import('@main/domains/services/database-operations');

        // Create dump
        const dumpBuffer = await dumpDatabase(
          validatedServiceId,
          validatedDatabaseName,
          validatedProjectId
        );

        // Show save dialog
        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, -5);
        const extension = getDumpFileExtension(validatedServiceId);
        const filter = getDumpFileFilter(validatedServiceId);

        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save Database Dump',
          defaultPath: `${validatedDatabaseName}-${timestamp}.${extension}`,
          filters: [filter, { name: 'All Files', extensions: ['*'] }],
        });

        if (!result.canceled && result.filePath) {
          writeFileSync(result.filePath, dumpBuffer);
          return { success: true, path: result.filePath };
        }

        return { success: false, error: 'Dump canceled' };
      } catch (error) {
        logger.error('Failed to dump database', { serviceId, databaseName, projectId, error });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  /**
   * Restore database from file (standalone or bundled)
   */
  ipcMain.handle(
    CHANNELS.SERVICES_DATABASE_RESTORE,
    async (
      _event,
      {
        serviceId,
        databaseName,
        projectId,
      }: { serviceId: ServiceId; databaseName: string; projectId?: string }
    ) => {
      try {
        const validatedServiceId = serviceIdSchema.parse(serviceId);
        const validatedDatabaseName = databaseNameSchema.parse(databaseName);
        const validatedProjectId = projectId ? projectIdSchema.parse(projectId) : undefined;

        await ensureInitialized();
        if (!projectId) {
          await validateDatabaseOperation(validatedServiceId);
        }

        const { dialog } = await import('electron');
        const { readFileSync } = await import('node:fs');
        const { restoreDatabase, getDumpFileFilter } =
          await import('@main/domains/services/database-operations');

        const filter = getDumpFileFilter(validatedServiceId);

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
          await restoreDatabase(
            validatedServiceId,
            validatedDatabaseName,
            dumpData,
            validatedProjectId
          );

          return { success: true };
        }

        return { success: false, error: 'Restore canceled' };
      } catch (error) {
        logger.error('Failed to restore database', { serviceId, databaseName, projectId, error });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  logger.info('Service IPC listeners registered');
}
