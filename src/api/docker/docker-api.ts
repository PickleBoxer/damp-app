/**
 * Docker API wrapper
 * Provides type-safe wrappers around Docker IPC calls
 */

export interface DockerStatus {
  isRunning: boolean;
  error?: string;
}

export interface DockerInfo {
  cpus: number;
  cpuUsagePercent: number;
  memTotal: number;
  memUsed: number;
}

// Typed reference to the Docker API exposed via preload script
const dockerApi = (globalThis as unknown as Window).docker;

/**
 * Ensures the Docker API is available before usage
 * This allows the module to be imported in test environments without immediate failure
 */
function ensureDockerApi() {
  if (!dockerApi) {
    throw new Error(
      'Docker API is not available. Ensure the preload script is properly configured.'
    );
  }
}

/**
 * Get Docker daemon status
 */
export async function getDockerStatus(): Promise<DockerStatus> {
  ensureDockerApi();
  return dockerApi.getStatus();
}

/**
 * Get Docker system information (CPU and RAM stats)
 */
export async function getDockerInfo(): Promise<DockerInfo> {
  ensureDockerApi();
  return dockerApi.getInfo();
}

/**
 * Get the DAMP network name
 */
export async function getDockerNetworkName(): Promise<string> {
  ensureDockerApi();
  return dockerApi.getNetworkName();
}

/**
 * Ensure the DAMP network exists
 */
export async function ensureDockerNetwork(): Promise<void> {
  ensureDockerApi();
  return dockerApi.ensureNetwork();
}

/**
 * Connect a container to the DAMP network
 */
export async function connectContainerToNetwork(containerIdOrName: string): Promise<void> {
  ensureDockerApi();
  return dockerApi.connectToNetwork(containerIdOrName);
}

/**
 * Disconnect a container from the DAMP network
 */
export async function disconnectContainerFromNetwork(containerIdOrName: string): Promise<void> {
  ensureDockerApi();
  return dockerApi.disconnectFromNetwork(containerIdOrName);
}
