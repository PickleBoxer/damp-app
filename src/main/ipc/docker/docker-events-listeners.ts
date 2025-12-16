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
  DOCKER_EVENTS_CONNECTION_STATUS_CHANNEL,
} from './docker-events-channels';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('docker-events-ipc');

const docker = new Docker();

// Active event stream
let eventStream: Readable | null = null;
let isMonitoring = false;

// Reconnection state
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let isReconnecting = false;

// Health check state
let healthCheckInterval: NodeJS.Timeout | null = null;

// Reference to main window for sending events
let mainWindowRef: BrowserWindow | null = null;

/**
 * Calculate exponential backoff delay with jitter
 * Base: 1s, Max: 64s, Factor: 2x
 */
function calculateBackoffDelay(attempts: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 64000; // 64 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);

  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.floor(delay + jitter);
}

/**
 * Send connection status update to renderer
 */
function sendConnectionStatus(connected: boolean, error?: string) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(DOCKER_EVENTS_CONNECTION_STATUS_CHANNEL, {
      connected,
      reconnectAttempts,
      lastError: error,
      timestamp: Date.now(),
    });
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect() {
  if (isReconnecting || !mainWindowRef) {
    return;
  }

  // Clear any existing timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  isReconnecting = true;
  reconnectAttempts++;

  const delay = calculateBackoffDelay(reconnectAttempts);
  logger.info(`Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`);

  sendConnectionStatus(false, `Reconnecting in ${Math.floor(delay / 1000)}s...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    logger.info(`Attempting to reconnect (attempt ${reconnectAttempts})...`);

    const result = await startEventMonitoring(mainWindowRef!);

    if (result.success) {
      logger.info('✓ Reconnection successful, resetting attempts counter');
      reconnectAttempts = 0;
      isReconnecting = false;
      sendConnectionStatus(true);
    } else {
      logger.error(`✗ Reconnection failed: ${result.error}, scheduling next attempt`);
      isReconnecting = false;
      scheduleReconnect(); // Recursive retry
    }
  }, delay);
}

/**
 * Start monitoring Docker container events
 */
async function startEventMonitoring(
  mainWindow: BrowserWindow
): Promise<{ success: boolean; error?: string }> {
  try {
    // Store reference to main window
    mainWindowRef = mainWindow;

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

    // Clear any existing health check interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
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

    // Start health check monitoring with Docker ping
    healthCheckInterval = setInterval(async () => {
      try {
        await docker.ping();
        // Connection is healthy, continue monitoring
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`⚠ Docker ping failed: ${errorMessage}, forcing reconnection...`);

        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
        }
        if (eventStream) {
          eventStream.destroy();
        }
        isMonitoring = false;
        scheduleReconnect();
      }
    }, 30000); // Ping Docker every 30 seconds

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Docker event stream error', { error: errorMessage });
      isMonitoring = false;
      eventStream = null;

      // Clear health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }

      // Schedule reconnection
      scheduleReconnect();
    });

    eventStream.on('end', () => {
      logger.info('Docker event stream ended');
      isMonitoring = false;
      eventStream = null;

      // Clear health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }

      // Schedule reconnection
      scheduleReconnect();
    });

    sendConnectionStatus(true);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start Docker event monitoring', { error: errorMessage });
    isMonitoring = false;
    eventStream = null;

    // Clear health check interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

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

    // Clear reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Clear health check interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

    if (eventStream) {
      eventStream.destroy();
      eventStream = null;
    }

    isMonitoring = false;
    isReconnecting = false;
    reconnectAttempts = 0;

    sendConnectionStatus(false, 'Stopped by user');
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
