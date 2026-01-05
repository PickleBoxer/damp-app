/**
 * Shared container type definitions for Docker container management
 * Used by both services and projects
 */

/**
 * Port mapping tuple: [hostPort, containerPort]
 * Example: ['3306', '3306'] maps host port 3306 to container port 3306
 */
export type PortMapping = [string, string];

/**
 * Docker container status
 * Contains Docker container runtime state - direct from Docker API
 */
export interface ContainerState {
  /** Whether container exists */
  exists: boolean;
  /** Whether container is running */
  running: boolean;
  /** Container ID if exists */
  container_id: string | null;
  /** Actual container name from Docker (e.g., 'quirky_archimedes' or 'damp-mysql') */
  container_name: string | null;
  /** Container state (created, running, paused, restarting, removing, exited, dead) */
  state: string | null;
  /** Port mappings [hostPort, containerPort] */
  ports: PortMapping[];
  /** Health status of the container */
  health_status: 'starting' | 'healthy' | 'unhealthy' | 'none';
}
