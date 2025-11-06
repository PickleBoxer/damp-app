/**
 * Port availability checker utility
 */

import net from "node:net";

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port, "0.0.0.0");
  });
}

/**
 * Find the next available port starting from a given port
 */
export async function findNextAvailablePort(
  startPort: number,
  maxAttempts = 100
): Promise<number> {
  let currentPort = startPort;
  let attempts = 0;

  while (attempts < maxAttempts) {
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
export async function checkPorts(
  ports: number[]
): Promise<Record<number, boolean>> {
  const results: Record<number, boolean> = {};

  await Promise.all(
    ports.map(async (port) => {
      results[port] = await isPortAvailable(port);
    })
  );

  return results;
}

/**
 * Get available ports for a list of desired ports
 * If a port is not available, find the next available port
 */
export async function getAvailablePorts(
  desiredPorts: number[]
): Promise<Map<number, number>> {
  const portMap = new Map<number, number>();

  for (const desiredPort of desiredPorts) {
    const available = await isPortAvailable(desiredPort);
    if (available) {
      portMap.set(desiredPort, desiredPort);
    } else {
      const nextPort = await findNextAvailablePort(desiredPort + 1);
      portMap.set(desiredPort, nextPort);
      console.log(
        `Port ${desiredPort} is not available. Using ${nextPort} instead.`
      );
    }
  }

  return portMap;
}
