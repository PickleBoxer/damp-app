/**
 * Docker API wrapper
 * Provides type-safe wrappers around Docker IPC calls
 */

export interface DockerStatus {
  isRunning: boolean;
  error?: string;
}

// Typed reference to the Docker API exposed via preload script
const dockerApi = (globalThis as unknown as Window).docker;

if (!dockerApi) {
  throw new Error('Docker API is not available. Ensure the preload script is properly configured.');
}

/**
 * Get Docker daemon status
 */
export async function getDockerStatus(): Promise<DockerStatus> {
  return dockerApi.getStatus();
}

/**
 * Get the DAMP network name
 */
export async function getDockerNetworkName(): Promise<string> {
  return dockerApi.getNetworkName();
}

/**
 * Ensure the DAMP network exists
 */
export async function ensureDockerNetwork(): Promise<void> {
  return dockerApi.ensureNetwork();
}

/**
 * Connect a container to the DAMP network
 */
export async function connectContainerToNetwork(containerIdOrName: string): Promise<void> {
  return dockerApi.connectToNetwork(containerIdOrName);
}

/**
 * Disconnect a container from the DAMP network
 */
export async function disconnectContainerFromNetwork(containerIdOrName: string): Promise<void> {
  return dockerApi.disconnectFromNetwork(containerIdOrName);
}
