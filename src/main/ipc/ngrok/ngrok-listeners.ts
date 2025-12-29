/**
 * Ngrok IPC listeners
 * Handles tunnel operations in the main process
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { NGROK_START_TUNNEL, NGROK_STOP_TUNNEL, NGROK_GET_STATUS } from './ngrok-channels';
import { ngrokManager } from '@main/services/ngrok/ngrok-manager';
import { projectStorage } from '@main/core/storage/project-storage';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('ngrok-ipc');

// Validation schemas
const projectIdSchema = z.string().uuid();
const authTokenSchema = z.string().min(20, 'Auth token must be at least 20 characters');
const regionSchema = z.enum(['us', 'eu', 'ap', 'au', 'sa', 'jp', 'in']).optional();

// Prevent duplicate listener registration
let listenersAdded = false;

/**
 * Register ngrok IPC listeners
 */
export function addNgrokListeners(): void {
  if (listenersAdded) return;
  listenersAdded = true;
  /**
   * Start ngrok tunnel for a project
   */
  ipcMain.handle(
    NGROK_START_TUNNEL,
    async (_event, projectId: string, authToken: string, region?: string) => {
      try {
        // Validate inputs
        projectIdSchema.parse(projectId);
        authTokenSchema.parse(authToken);
        if (region !== undefined) {
          regionSchema.parse(region);
        }

        // Get project
        const project = projectStorage.getProject(projectId);
        if (!project) {
          return {
            success: false,
            error: `Project ${projectId} not found`,
          };
        }

        // Start tunnel
        const result = await ngrokManager.startTunnel(project, authToken, region);
        return result;
      } catch (error) {
        logger.error('Failed to start ngrok tunnel', {
          projectId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorType: error?.constructor?.name,
        });
        if (error instanceof z.ZodError) {
          return {
            success: false,
            error: error.issues[0]?.message || 'Validation failed',
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  /**
   * Stop ngrok tunnel for a project
   */
  ipcMain.handle(NGROK_STOP_TUNNEL, async (_event, projectId: string) => {
    try {
      // Validate input
      projectIdSchema.parse(projectId);

      // Stop tunnel
      const result = await ngrokManager.stopTunnel(projectId);
      return result;
    } catch (error) {
      logger.error('Failed to stop ngrok tunnel', { projectId, error });
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.issues[0]?.message || 'Validation failed',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Get ngrok tunnel status for a project
   */
  ipcMain.handle(NGROK_GET_STATUS, async (_event, projectId: string) => {
    try {
      // Validate input
      projectIdSchema.parse(projectId);

      // Get status
      const result = await ngrokManager.getTunnelStatus(projectId);
      return result;
    } catch (error) {
      logger.error('Failed to get ngrok tunnel status', { projectId, error });
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.issues[0]?.message || 'Validation failed',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  logger.info('Ngrok IPC listeners registered');
}
