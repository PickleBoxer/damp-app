/**
 * Service type definitions for Docker container management
 */

/**
 * Unique identifier for each service
 */
export enum ServiceId {
  Caddy = 'caddy',
  MySQL = 'mysql',
  Mailpit = 'mailpit',
  PostgreSQL = 'postgresql',
  MariaDB = 'mariadb',
  MongoDB = 'mongodb',
  Redis = 'redis',
  Meilisearch = 'meilisearch',
  MinIO = 'minio',
  Memcached = 'memcached',
  RabbitMQ = 'rabbitmq',
  Typesense = 'typesense',
  Valkey = 'valkey',
  RustFS = 'rustfs',
}

/**
 * Service category types
 */
export type ServiceType = 'web' | 'database' | 'email' | 'cache' | 'storage' | 'search' | 'queue';

/**
 * Port mapping: [external_port, internal_port]
 */
export type PortMapping = [string, string];

/**
 * Health check configuration for Docker containers
 */
export interface HealthCheckConfig {
  /** Health check command (e.g., ['CMD', 'pg_isready']) */
  test: string[];
  /** Number of consecutive failures needed to consider container unhealthy */
  retries?: number;
  /** Time to wait for health check in nanoseconds */
  timeout?: number;
  /** Time between running health checks in nanoseconds */
  interval?: number;
  /** Start period for container to initialize before health checks count in nanoseconds */
  start_period?: number;
}

/**
 * Default configuration for a service
 */
export interface ServiceConfig {
  /** Docker image name and tag */
  image: string;
  /** Container name */
  container_name: string;
  /** Port mappings */
  ports: PortMapping[];
  /** Named volumes (without bindings) */
  volumes: string[];
  /** Environment variables */
  environment_vars: string[];
  /** Data volume name (for persistence) */
  data_volume: string | null;
  /** Volume bindings in format "volume_name:/container/path" */
  volume_bindings: string[];
  /** Health check configuration */
  healthcheck?: HealthCheckConfig;
}

/**
 * Custom configuration overrides
 */
export interface CustomConfig {
  /** Override enabled status */
  enabled?: boolean;
  /** Override installed status (usually managed by system) */
  installed?: boolean;
  /** Custom port mappings */
  ports?: PortMapping[];
  /** Custom environment variables (merged with defaults) */
  environment_vars?: string[];
  /** Custom container name */
  container_name?: string;
  /** Custom volume bindings */
  volume_bindings?: string[];
}

/**
 * Service definition from registry
 */
export interface ServiceDefinition {
  /** Unique service identifier */
  id: ServiceId;
  /** Internal service name */
  name: string;
  /** User-friendly display name */
  display_name: string;
  /** Service description */
  description: string;
  /** Service category */
  service_type: ServiceType;
  /** Whether service is required for app to function */
  required: boolean;
  /** Default configuration */
  default_config: ServiceConfig;
  /** Message to show after successful installation */
  post_install_message: string | null;
  /** Optional custom function to run after installation */
  post_install_fn?: () => Promise<void>;
}

/**
 * Current state of a service
 */
export interface ServiceState {
  /** Service identifier */
  id: ServiceId;
  /** Whether service is installed */
  installed: boolean;
  /** Whether service is enabled */
  enabled: boolean;
  /** Custom configuration overrides */
  custom_config: CustomConfig | null;
  /** Current container status */
  container_status: ContainerStatus | null;
}

/**
 * Docker container status
 */
export interface ContainerStatus {
  /** Whether container exists */
  exists: boolean;
  /** Whether container is running */
  running: boolean;
  /** Container ID if exists */
  container_id: string | null;
  /** Container state (created, running, paused, restarting, removing, exited, dead) */
  state: string | null;
  /** Actual port mappings (may differ from config if auto-adjusted) */
  ports: PortMapping[];
  /** Health status of the container */
  health_status?: 'starting' | 'healthy' | 'unhealthy' | 'none';
}

/**
 * Progress information during image pull
 */
export interface PullProgress {
  /** Current operation (Downloading, Extracting, etc.) */
  status: string;
  /** Progress detail message */
  progress?: string;
  /** Current bytes */
  current?: number;
  /** Total bytes */
  total?: number;
  /** Layer ID being processed */
  id?: string;
}

/**
 * Result of a service operation
 */
export interface ServiceOperationResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional data returned by operation */
  data?: unknown;
}

/**
 * Combined service information (definition + state)
 */
export interface ServiceInfo {
  /** Service definition from registry */
  definition: ServiceDefinition;
  /** Current service state */
  state: ServiceState;
}

/**
 * Installation options
 */
export interface InstallOptions {
  /** Custom configuration to apply during installation */
  custom_config?: CustomConfig;
  /** Whether to start container immediately after installation */
  start_immediately?: boolean;
}

/**
 * Service storage data structure (saved to file)
 */
export interface ServiceStorageData {
  /** Map of service ID to service state */
  services: Record<string, ServiceState>;
  /** Version of storage schema */
  version: string;
  /** Last updated timestamp */
  last_updated: number;
}
