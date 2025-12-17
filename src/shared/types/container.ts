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
 * Standardized container status data (shared between projects and services)
 * Contains Docker container runtime state - direct from Docker API
 */
export interface ContainerStateData {
  /** Unique identifier (projectId or serviceId) */
  id: string;
  /** Whether container is running */
  running: boolean;
  /** Whether container exists */
  exists: boolean;
  /** Container state (created, running, paused, restarting, removing, exited, dead) */
  state: string | null;
  /** Port mappings [hostPort, containerPort] */
  ports: PortMapping[];
  /** Health status of the container */
  health_status: 'starting' | 'healthy' | 'unhealthy' | 'none';
}
