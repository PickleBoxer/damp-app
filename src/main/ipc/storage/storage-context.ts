import { contextBridge, ipcRenderer } from 'electron';
import {
  STORAGE_DELETE_SECRET_CHANNEL,
  STORAGE_GET_SECRET_CHANNEL,
  STORAGE_IS_AVAILABLE_CHANNEL,
  STORAGE_SAVE_SECRET_CHANNEL,
} from './storage-channels';

export function exposeStorageContext() {
  contextBridge.exposeInMainWorld('secureStorage', {
    saveSecret: (key: string, value: string) =>
      ipcRenderer.invoke(STORAGE_SAVE_SECRET_CHANNEL, key, value),
    getSecret: (key: string) => ipcRenderer.invoke(STORAGE_GET_SECRET_CHANNEL, key),
    deleteSecret: (key: string) => ipcRenderer.invoke(STORAGE_DELETE_SECRET_CHANNEL, key),
    isAvailable: () => ipcRenderer.invoke(STORAGE_IS_AVAILABLE_CHANNEL),
  });
}
