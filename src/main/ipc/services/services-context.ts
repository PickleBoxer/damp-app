/**
 * IPC context exposer for services
 * Exposes service management APIs to the renderer process
 */

import type { ServicesContext } from '@shared/types/ipc';
import type { CustomConfig, InstallOptions, PullProgress, ServiceId } from '@shared/types/service';
import { contextBridge, ipcRenderer } from 'electron';
import * as CHANNELS from './services-channels';

/**
 * Expose services context to renderer
 */
export function exposeServicesContext(): void {
  const servicesApi: ServicesContext = {
    getAllServices: () => ipcRenderer.invoke(CHANNELS.SERVICES_GET_ALL),

    getService: (serviceId: ServiceId) => ipcRenderer.invoke(CHANNELS.SERVICES_GET_ONE, serviceId),

    getServiceContainerState: (serviceId: ServiceId) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_GET_CONTAINER_STATE, serviceId),

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

    listDatabases: (serviceId: ServiceId) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_DATABASE_LIST_DBS, serviceId),

    dumpDatabase: (serviceId: ServiceId, databaseName: string) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_DATABASE_DUMP, serviceId, databaseName),

    restoreDatabase: (serviceId: ServiceId, databaseName: string) =>
      ipcRenderer.invoke(CHANNELS.SERVICES_DATABASE_RESTORE, serviceId, databaseName),

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
