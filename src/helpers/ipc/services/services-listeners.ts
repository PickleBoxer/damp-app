/**
 * IPC listeners for service operations
 * Handles all service-related IPC calls from renderer process
 */

import { ipcMain, BrowserWindow } from "electron";
import type { ServiceId, InstallOptions, CustomConfig } from "../../../types/service";
import { serviceStateManager } from "../../../services/state/service-state-manager";
import * as CHANNELS from "./services-channels";

/**
 * Add service event listeners
 */
export function addServicesListeners(mainWindow: BrowserWindow): void {
  // Initialize service manager on first use
  let initialized = false;
  const ensureInitialized = async () => {
    if (!initialized) {
      await serviceStateManager.initialize();
      initialized = true;
    }
  };

  /**
   * Get all services
   */
  ipcMain.handle(CHANNELS.SERVICES_GET_ALL, async () => {
    try {
      await ensureInitialized();
      return await serviceStateManager.getAllServices();
    } catch (error) {
      console.error("Failed to get all services:", error);
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
      console.error(`Failed to get service ${serviceId}:`, error);
      throw error;
    }
  });

  /**
   * Check Docker status
   */
  ipcMain.handle(CHANNELS.SERVICES_CHECK_DOCKER, async () => {
    try {
      await ensureInitialized();
      return await serviceStateManager.checkDockerStatus();
    } catch (error) {
      console.error("Failed to check Docker status:", error);
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
          mainWindow.webContents.send(
            CHANNELS.SERVICES_INSTALL_PROGRESS,
            serviceId,
            progress
          );
        };

        return await serviceStateManager.installService(
          serviceId,
          options,
          onProgress
        );
      } catch (error) {
        console.error(`Failed to install service ${serviceId}:`, error);
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
        console.error(`Failed to uninstall service ${serviceId}:`, error);
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
      console.error(`Failed to start service ${serviceId}:`, error);
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
      console.error(`Failed to stop service ${serviceId}:`, error);
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
      console.error(`Failed to restart service ${serviceId}:`, error);
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
        console.error(`Failed to update service ${serviceId} configuration:`, error);
        throw error;
      }
    }
  );

  console.log("Service IPC listeners registered");
}
