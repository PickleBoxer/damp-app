/**
 * IPC context exposer for services
 * Exposes service management APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ServiceId,
  CustomConfig,
  InstallOptions,
  ServiceInfo,
  PullProgress,
} from '../../../types/service';
import * as CHANNELS from './services-channels';

export interface ServicesContext {
  /**
   * Get all services with their current state
   */
  getAllServices: () => Promise<ServiceInfo[]>;

  /**
   * Get a specific service by ID
   */
  getService: (serviceId: ServiceId) => Promise<ServiceInfo>;

  /**
   * Install a service
   */
  installService: (serviceId: ServiceId, options?: InstallOptions) => Promise<ServiceInfo>;

  /**
   * Uninstall a service
   */
  uninstallService: (serviceId: ServiceId, removeVolumes?: boolean) => Promise<ServiceInfo>;

  /**
   * Start a service
   */
  startService: (serviceId: ServiceId) => Promise<ServiceInfo>;

  /**
   * Stop a service
   */
  stopService: (serviceId: ServiceId) => Promise<ServiceInfo>;

  /**
   * Restart a service
   */
  restartService: (serviceId: ServiceId) => Promise<ServiceInfo>;

  /**
   * Update service configuration
   */
  updateConfig: (serviceId: ServiceId, customConfig: CustomConfig) => Promise<ServiceInfo>;

  /**
   * Download Caddy SSL certificate
   */
  downloadCaddyCertificate: () => Promise<{ success: boolean; path?: string; error?: string }>;

  /**
   * Subscribe to installation progress events
   */
  onInstallProgress: (
    callback: (serviceId: ServiceId, progress: PullProgress) => void
  ) => () => void;
}

/**
 * Expose services context to renderer
 */
export function exposeServicesContext(): void {
  const servicesApi: ServicesContext = {
    getAllServices: () => ipcRenderer.invoke(CHANNELS.SERVICES_GET_ALL),

    getService: (serviceId: ServiceId) => ipcRenderer.invoke(CHANNELS.SERVICES_GET_ONE, serviceId),

    installService: (serviceId: ServiceId, options?: InstallOptions) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_INSTALL, serviceId, options),

    uninstallService: (serviceId: ServiceId, removeVolumes = false) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_UNINSTALL, serviceId, removeVolumes),

    startService: (serviceId: ServiceId) => ipcRenderer.invoke(CHANNELS.SERVICES_START, serviceId),

    stopService: (serviceId: ServiceId) => ipcRenderer.invoke(CHANNELS.SERVICES_STOP, serviceId),

    restartService: (serviceId: ServiceId) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_RESTART, serviceId),

    updateConfig: (serviceId: ServiceId, customConfig: CustomConfig) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_UPDATE_CONFIG, serviceId, customConfig),

    downloadCaddyCertificate: () => ipcRenderer.invoke(CHANNELS.SERVICES_CADDY_DOWNLOAD_CERT),

    onInstallProgress: callback => {
      const listener = (_event: unknown, serviceId: ServiceId, progress: PullProgress) => {
        callback(serviceId, progress);
      };
      ipcRenderer.on(CHANNELS.SERVICES_INSTALL_PROGRESS, listener);

      // Return cleanup function
      return () => {
        ipcRenderer.off(CHANNELS.SERVICES_INSTALL_PROGRESS, listener);
      };
    },
  };

  contextBridge.exposeInMainWorld('services', servicesApi);
}
