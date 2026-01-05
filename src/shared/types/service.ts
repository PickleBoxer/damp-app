/**
 * Service type definitions for Docker container management
 */

import type { Result, StorageData } from './result';
import type { PortMapping } from './container';

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
  /** Custom port mappings */
  ports?: PortMapping[];
  /** Custom environment variables (merged with defaults) */
  environment_vars?: string[];
  /** Custom volume bindings */
  volume_bindings?: string[];
  /** Generic metadata from post-install hooks (e.g., certInstalled, dbInitialized) */
  metadata?: Record<string, unknown>;
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
}

/**
 * Persistent state of a service (user preferences only)
 * Note: installed, enabled, and container_status are computed from Docker at runtime
 */
export interface ServiceState {
  /** Service identifier */
  id: ServiceId;
  /** Custom configuration overrides (ports, env vars, etc.) */
  custom_config: CustomConfig | null;
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
 * Combined service information (definition + state)
 * All ServiceDefinition properties are flattened to root level with state properties
 */
export interface ServiceInfo extends ServiceDefinition {
  /** Custom configuration overrides */
  custom_config: CustomConfig | null;
}

/**
 * Service definition with basic state flags (no container status)
 * Used for lightweight list queries without Docker API calls
 * All ServiceDefinition properties are flattened to root level
 */

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
export type ServiceStorageData = StorageData<ServiceState>;

/**
 * Context passed to post-install hooks
 */
export interface PostInstallHookContext {
  /** Service identifier */
  serviceId: ServiceId;
  /** Container ID */
  containerId: string;
  /** Custom configuration (if any) */
  customConfig: CustomConfig | null;
}

/**
 * Result returned by post-install hooks
 */
export interface PostInstallHookResult extends Result<Record<string, unknown>> {
  /** Optional message about hook execution */
  message?: string;
  /** Service-specific metadata to store */
  data?: Record<string, unknown>;
}

/**
 * Post-install hook function signature
 */
export type PostInstallHook = (context: PostInstallHookContext) => Promise<PostInstallHookResult>;
