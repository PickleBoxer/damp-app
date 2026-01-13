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
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
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

// Debounce timer for Caddy sync
let caddySyncDebounceTimer: NodeJS.Timeout | null = null;
const CADDY_SYNC_DEBOUNCE_MS = 500;

/**
 * Debounced Caddy sync trigger
 * Batches multiple project container start events to avoid redundant syncs
 */
function triggerCaddySync() {
  // Clear existing timer
  if (caddySyncDebounceTimer) {
    clearTimeout(caddySyncDebounceTimer);
  }

  // Set new timer
  caddySyncDebounceTimer = setTimeout(async () => {
    caddySyncDebounceTimer = null;

    try {
      logger.debug('Triggering Caddy sync due to project container start event(s)');

      // Lazy import to avoid circular dependencies
      const { syncProjectsToCaddy } = await import('@main/core/reverse-proxy/caddy-config');
      const { projectStorage } = await import('@main/core/storage/project-storage');

      const projects = projectStorage.getAllProjects();
      const result = await syncProjectsToCaddy(projects);

      if (result.success) {
        logger.debug('Caddy sync completed successfully');
      } else {
        logger.warn('Caddy sync failed:', { error: result.error });
      }
    } catch (error) {
      logger.error('Failed to trigger Caddy sync:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, CADDY_SYNC_DEBOUNCE_MS);
}

/**
 * Fixed 5 second retry delay for reconnection attempts
 */
function getReconnectDelay(): number {
  return 5000; // 5 seconds
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

  const delay = getReconnectDelay();
  logger.info(`Scheduling reconnect attempt ${reconnectAttempts} in ${delay / 1000}s`);

  sendConnectionStatus(false, `Reconnecting in ${delay / 1000}s...`);

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

        // Extract relevant information including labels
        const labels = event.Actor?.Attributes || {};
        const containerEvent = {
          containerId: event.Actor?.ID || event.id,
          action: event.Action || event.status,
          timestamp: event.time ? event.time * 1000 : Date.now(), // Convert to milliseconds
          // Include metadata from our label system
          serviceId: labels[LABEL_KEYS.SERVICE_ID],
          projectId: labels[LABEL_KEYS.PROJECT_ID],
          resourceType: labels[LABEL_KEYS.TYPE],
        };

        logger.debug('Docker event received', containerEvent);

        // Trigger Caddy sync when a project container starts
        if (
          containerEvent.action === 'start' &&
          containerEvent.projectId &&
          containerEvent.resourceType === RESOURCE_TYPES.PROJECT_CONTAINER
        ) {
          logger.debug(
            `Project container started: ${containerEvent.projectId}, triggering Caddy sync`
          );
          triggerCaddySync();
        }

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

    // Clear Caddy sync debounce timer
    if (caddySyncDebounceTimer) {
      clearTimeout(caddySyncDebounceTimer);
      caddySyncDebounceTimer = null;
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
  // Store window reference for reconnection logic
  mainWindowRef = mainWindow;

  ipcMain.handle(DOCKER_EVENTS_START_CHANNEL, async () => {
    return await startEventMonitoring(mainWindow);
  });

  ipcMain.handle(DOCKER_EVENTS_STOP_CHANNEL, async () => {
    return await stopEventMonitoring();
  });

  // Start monitoring automatically when the app starts
  // This ensures we capture events from the beginning
  // If Docker is not available, scheduleReconnect() will retry indefinitely
  startEventMonitoring(mainWindow).then(result => {
    if (!result.success) {
      logger.error('Failed to auto-start Docker event monitoring', { error: result.error });

      // Send initial connection status to renderer
      sendConnectionStatus(false, result.error);

      // Start reconnection attempts with exponential backoff
      scheduleReconnect();
    } else {
      logger.info('Docker event monitoring started successfully');
    }
  });

  logger.info('Docker events IPC listeners registered');
}
