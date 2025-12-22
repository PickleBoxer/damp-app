import { app, ipcMain, safeStorage } from 'electron';
import { z } from 'zod';
import {
  STORAGE_DELETE_SECRET_CHANNEL,
  STORAGE_GET_SECRET_CHANNEL,
  STORAGE_IS_AVAILABLE_CHANNEL,
  STORAGE_SAVE_SECRET_CHANNEL,
} from './storage-channels';
import fs from 'node:fs';
import path from 'node:path';

const secretKeySchema = z.string().min(1).max(255);
const secretValueSchema = z.string();

// Store encrypted secrets as files in userData directory
const getSecretFilePath = (key: string): string => {
  const userDataPath = app.getPath('userData');
  const secretsDir = path.join(userDataPath, 'secrets');

  // Ensure secrets directory exists
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  // Sanitize key to be filesystem-safe
  const sanitizedKey = key.replaceAll(/[^a-z0-9_-]/gi, '_');
  return path.join(secretsDir, `${sanitizedKey}.enc`);
};

export function addStorageListeners() {
  // Check if encryption is available
  ipcMain.handle(STORAGE_IS_AVAILABLE_CHANNEL, async () => {
    return safeStorage.isEncryptionAvailable();
  });

  // Save encrypted secret
  ipcMain.handle(STORAGE_SAVE_SECRET_CHANNEL, async (event, key: string, value: string) => {
    try {
      const validatedKey = secretKeySchema.parse(key);
      const validatedValue = secretValueSchema.parse(value);

      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system');
      }

      const encrypted = safeStorage.encryptString(validatedValue);
      const filePath = getSecretFilePath(validatedKey);

      fs.writeFileSync(filePath, encrypted);

      return { success: true };
    } catch (error) {
      console.error('Failed to save secret:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get decrypted secret
  ipcMain.handle(STORAGE_GET_SECRET_CHANNEL, async (event, key: string) => {
    try {
      const validatedKey = secretKeySchema.parse(key);
      const filePath = getSecretFilePath(validatedKey);

      if (!fs.existsSync(filePath)) {
        return { success: true, value: null };
      }

      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system');
      }

      const encrypted = fs.readFileSync(filePath);
      const decrypted = safeStorage.decryptString(encrypted);

      return { success: true, value: decrypted };
    } catch (error) {
      console.error('Failed to get secret:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        value: null,
      };
    }
  });

  // Delete secret
  ipcMain.handle(STORAGE_DELETE_SECRET_CHANNEL, async (event, key: string) => {
    try {
      const validatedKey = secretKeySchema.parse(key);
      const filePath = getSecretFilePath(validatedKey);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete secret:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
