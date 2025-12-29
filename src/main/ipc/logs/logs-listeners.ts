/**
 * IPC listeners for project log streaming
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { LOGS_START_CHANNEL, LOGS_STOP_CHANNEL, LOGS_LINE_CHANNEL } from './logs-channels';
import { findContainerByLabel, streamContainerLogs } from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { projectStateManager } from '@main/domains/projects/project-state-manager';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('logs-ipc');

// Validation schemas
const projectIdSchema = z.string().uuid();

/**
 * Active log stream cleanup functions
 * Maps projectId to stop function
 */
const activeStreams = new Map<string, () => void>();

/**
 * Start streaming logs for a project
 */
async function handleStartLogs(
  event: IpcMainInvokeEvent,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate projectId
    projectIdSchema.parse(projectId);

    // Stop existing stream if any
    const existingStop = activeStreams.get(projectId);
    if (existingStop) {
      existingStop();
      activeStreams.delete(projectId);
    }

    // Get project details
    const project = await projectStateManager.getProject(projectId);
    if (!project) {
      return {
        success: false,
        error: `Project ${projectId} not found`,
      };
    }

    // Find container by project ID label
    const containerInfo = await findContainerByLabel(
      LABEL_KEYS.PROJECT_ID,
      projectId,
      RESOURCE_TYPES.PROJECT_CONTAINER
    );
    if (!containerInfo) {
      return {
        success: false,
        error: 'Project container not found. Start the project first.',
      };
    }

    // Start streaming using container ID
    const stopFn = await streamContainerLogs(
      containerInfo.Id,
      (line: string, stream: 'stdout' | 'stderr') => {
        // Send log line to renderer
        event.sender.send(LOGS_LINE_CHANNEL, {
          projectId,
          line,
          stream,
          timestamp: Date.now(),
        });
      },
      500 // Last 500 lines
    );

    // Store stop function
    activeStreams.set(projectId, stopFn);

    logger.debug('Started streaming for project', { projectId });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map(issue => issue.message).join(', ');
      logger.error('Invalid project ID', { error: errorMessage });
      return { success: false, error: `Invalid project ID: ${errorMessage}` };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start streaming', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Stop streaming logs for a project
 */
async function handleStopLogs(_event: IpcMainInvokeEvent, projectId: string): Promise<void> {
  // Validate projectId
  projectIdSchema.parse(projectId);

  const stopFn = activeStreams.get(projectId);
  if (stopFn) {
    stopFn();
    activeStreams.delete(projectId);
    logger.debug('Stopped streaming for project', { projectId });
  }
}

/**
 * Register all log-related IPC listeners
 */
// Prevent duplicate listener registration
let listenersAdded = false;

export function addLogsEventListeners(): void {
  if (listenersAdded) return;
  listenersAdded = true;

  ipcMain.handle(LOGS_START_CHANNEL, handleStartLogs);
  ipcMain.handle(LOGS_STOP_CHANNEL, handleStopLogs);

  logger.info('Logs IPC listeners registered');
}

/**
 * Clean up all active streams (call on app quit)
 */
export function cleanupAllLogStreams(): void {
  for (const [projectId, stopFn] of activeStreams.entries()) {
    stopFn();
    logger.debug('Cleaned up stream for project', { projectId });
  }
  activeStreams.clear();
}
