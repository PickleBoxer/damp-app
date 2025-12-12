/**
 * Docker operation timeout constants
 * Centralized timeout configuration for Docker operations
 */

export const DOCKER_TIMEOUTS = {
  /** Timeout for Docker daemon ping operation */
  PING: 3000,
  /** Timeout for Docker info retrieval */
  INFO: 3000,
  /** Timeout for listing containers */
  LIST_CONTAINERS: 3000,
  /** Timeout for getting container stats */
  CONTAINER_STATS: 2000,
} as const;
