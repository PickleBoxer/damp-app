/**
 * Port availability checker utility
 */

import net from 'node:net';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('PortChecker');

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '0.0.0.0');
  });
}

/**
 * Find the next available port starting from a given port
 */
export async function findNextAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  if (startPort < 1 || startPort > 65535) {
    throw new Error(`Invalid start port: ${startPort}. Must be between 1 and 65535.`);
  }
  let currentPort = startPort;
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (currentPort > 65535) {
      throw new Error(
        `Exceeded valid port range while searching for available port starting from ${startPort}`
      );
    }
    const available = await isPortAvailable(currentPort);
    if (available) {
      return currentPort;
    }
    currentPort++;
    attempts++;
  }

  throw new Error(
    `Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`
  );
}

/**
 * Check multiple ports and return which ones are available
 */
export async function checkPorts(ports: number[]): Promise<Record<number, boolean>> {
  const results: Record<number, boolean> = {};

  await Promise.all(
    ports.map(async port => {
      results[port] = await isPortAvailable(port);
    })
  );

  return results;
}

/**
 * Get available ports for a list of desired ports
 * If a port is not available, find the next available port
 */
export async function getAvailablePorts(desiredPorts: number[]): Promise<Map<number, number>> {
  const portMap = new Map<number, number>();

  for (const desiredPort of desiredPorts) {
    const available = await isPortAvailable(desiredPort);
    if (available) {
      portMap.set(desiredPort, desiredPort);
    } else {
      const nextStartPort = desiredPort < 65535 ? desiredPort + 1 : 1;
      const nextPort = await findNextAvailablePort(nextStartPort);
      portMap.set(desiredPort, nextPort);
      logger.info(`Port ${desiredPort} is not available. Using ${nextPort} instead.`);
    }
  }

  return portMap;
}
