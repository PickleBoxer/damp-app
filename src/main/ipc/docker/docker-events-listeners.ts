/**
 * IPC listeners for Docker container events
 */

import { ipcMain, BrowserWindow } from 'electron';
import Docker from 'dockerode';
import type { Readable } from 'node:stream';
import {
  DOCKER_EVENTS_START_CHANNEL,
  DOCKER_EVENTS_STOP_CHANNEL,
  DOCKER_EVENT_CHANNEL,
} from './docker-events-channels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('docker-events-ipc');

const docker = new Docker();

// Active event stream
let eventStream: Readable | null = null;
let isMonitoring = false;

/**
 * Start monitoring Docker container events
 */
async function startEventMonitoring(
  mainWindow: BrowserWindow
): Promise<{ success: boolean; error?: string }> {
  try {
    // Don't start if already monitoring
    if (isMonitoring && eventStream) {
      logger.debug('Docker events already being monitored');
      return { success: true };
    }

    // Stop any existing stream
    if (eventStream) {
      eventStream.destroy();
      eventStream = null;
    }

    logger.info('Starting Docker event monitoring');

    // Subscribe to Docker events
    // Filter for container events only (start, stop, die, health_status, etc.)
    eventStream = (await docker.getEvents({
      filters: {
        type: ['container'],
        event: ['start', 'stop', 'die', 'health_status', 'kill', 'pause', 'unpause', 'restart'],
      },
    })) as Readable;

    isMonitoring = true;

    // Process events
    eventStream.on('data', (chunk: Buffer) => {
      try {
        const event = JSON.parse(chunk.toString());

        // Extract relevant information
        const containerEvent = {
          containerId: event.Actor?.ID || event.id,
          containerName: event.Actor?.Attributes?.name || '',
          action: event.Action || event.status,
          timestamp: event.time ? event.time * 1000 : Date.now(), // Convert to milliseconds
        };

        logger.debug('Docker event received', containerEvent);

        // Send event to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(DOCKER_EVENT_CHANNEL, containerEvent);
        }
      } catch (error) {
        logger.error('Failed to parse Docker event', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    eventStream.on('error', error => {
      logger.error('Docker event stream error', {
        error: error instanceof Error ? error.message : String(error),
      });
      isMonitoring = false;
      eventStream = null;
    });

    eventStream.on('end', () => {
      logger.info('Docker event stream ended');
      isMonitoring = false;
      eventStream = null;
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start Docker event monitoring', { error: errorMessage });
    isMonitoring = false;
    eventStream = null;
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Stop monitoring Docker container events
 */
async function stopEventMonitoring(): Promise<{ success: boolean }> {
  try {
    logger.info('Stopping Docker event monitoring');

    if (eventStream) {
      eventStream.destroy();
      eventStream = null;
    }

    isMonitoring = false;
    return { success: true };
  } catch (error) {
    logger.error('Failed to stop Docker event monitoring', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false };
  }
}

/**
 * Register Docker events IPC handlers
 */
export function addDockerEventsListeners(mainWindow: BrowserWindow) {
  ipcMain.handle(DOCKER_EVENTS_START_CHANNEL, async () => {
    return await startEventMonitoring(mainWindow);
  });

  ipcMain.handle(DOCKER_EVENTS_STOP_CHANNEL, async () => {
    return await stopEventMonitoring();
  });

  // Start monitoring automatically when the app starts
  // This ensures we capture events from the beginning
  startEventMonitoring(mainWindow).catch(error => {
    logger.error('Failed to auto-start Docker event monitoring', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info('Docker events IPC listeners registered');
}

/**
 * Cleanup function to stop event monitoring when app closes
 */
export function cleanupDockerEventsListeners() {
  if (eventStream) {
    eventStream.destroy();
    eventStream = null;
  }
  isMonitoring = false;
}
