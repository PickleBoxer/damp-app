/**
 * IPC listeners for project log streaming
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import {
  LOGS_START_CHANNEL,
  LOGS_STOP_CHANNEL,
  LOGS_LINE_CHANNEL,
  LOGS_READ_FILE_CHANNEL,
  LOGS_TAIL_FILE_CHANNEL,
} from './logs-channels';
import { dockerManager } from '../../../services/docker/docker-manager';
import { projectStateManager } from '../../../services/projects/project-state-manager';

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

    // Check if container exists
    const containerStatus = await dockerManager.getContainerStatus(project.containerName);
    if (!containerStatus?.exists) {
      return {
        success: false,
        error: `Container ${containerName} does not exist. Start the project first.`,
      };
    }

    // Start streaming
    const stopFn = await dockerManager.streamContainerLogs(
      project.containerName,
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

    console.log(`[Logs] Started streaming for project ${project.name}`);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Logs] Failed to start streaming:`, errorMessage);
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
  const stopFn = activeStreams.get(projectId);
  if (stopFn) {
    stopFn();
    activeStreams.delete(projectId);
    console.log(`[Logs] Stopped streaming for project ${projectId}`);
  }
}

/**
 * Read log file from container
 */
async function handleReadFile(
  _event: IpcMainInvokeEvent,
  projectId: string,
  filePath: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const project = await projectStateManager.getProject(projectId);
    if (!project) {
      return { success: false, error: `Project ${projectId} not found` };
    }

    const content = await dockerManager.readFileFromContainer(project.containerName, filePath);

    return { success: true, content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Logs] Failed to read file ${filePath}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Tail log file from container
 */
async function handleTailFile(
  _event: IpcMainInvokeEvent,
  projectId: string,
  filePath: string,
  lines = 100
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const project = await projectStateManager.getProject(projectId);
    if (!project) {
      return { success: false, error: `Project ${projectId} not found` };
    }

    const content = await dockerManager.tailFileFromContainer(
      project.containerName,
      filePath,
      lines
    );

    return { success: true, content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Logs] Failed to tail file ${filePath}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Register all log-related IPC listeners
 */
export function addLogsEventListeners(): void {
  ipcMain.handle(LOGS_START_CHANNEL, handleStartLogs);
  ipcMain.handle(LOGS_STOP_CHANNEL, handleStopLogs);
  ipcMain.handle(LOGS_READ_FILE_CHANNEL, handleReadFile);
  ipcMain.handle(LOGS_TAIL_FILE_CHANNEL, handleTailFile);

  console.log('[Logs] IPC listeners registered');
}

/**
 * Clean up all active streams (call on app quit)
 */
export function cleanupAllLogStreams(): void {
  for (const [projectId, stopFn] of activeStreams.entries()) {
    stopFn();
    console.log(`[Logs] Cleaned up stream for project ${projectId}`);
  }
  activeStreams.clear();
}
