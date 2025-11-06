/**
 * Docker API wrapper
 * Provides type-safe wrappers around Docker IPC calls
 */

export interface DockerStatus {
  isRunning: boolean;
  error?: string;
}

/**
 * Get Docker daemon status
 */
export async function getDockerStatus(): Promise<DockerStatus> {
  return (globalThis as unknown as Window).docker.getStatus();
}
