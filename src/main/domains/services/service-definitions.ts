/**
 * Service registry with all predefined service definitions
 */

import type { ServiceDefinition } from '@shared/types/service';
import { ServiceId } from '@shared/types/service';

// Post-install hooks are exported from hooks/index.ts
export { POST_INSTALL_HOOKS } from './hooks/index';

/**
 * Registry of all available services
 */
export const SERVICE_DEFINITIONS: Record<ServiceId, ServiceDefinition> = {
  // Caddy service definition (REQUIRED)
  [ServiceId.Caddy]: {
    id: ServiceId.Caddy,
    name: 'caddy',
    display_name: 'Web Server',
    description: 'Caddy reverse proxy server',
    service_type: 'web',
    required: true,
    default_config: {
      image: 'caddy:latest',
      ports: [
        ['80', '80'],
        ['443', '443'],
      ],
      volumes: ['damp_caddy_data', 'damp_caddy_config'],
      environment_vars: [],
      data_volume: 'damp_caddy_data',
      volume_bindings: ['damp_caddy_data:/data', 'damp_caddy_config:/config'],
    },
    post_install_message:
      'Caddy web server is ready. SSL certificates are configured and will be automatically generated for .local domains.',
  },

  // MySQL service definition (OPTIONAL)
  [ServiceId.MySQL]: {
    id: ServiceId.MySQL,
    name: 'mysql',
    display_name: 'MySQL Database',
    description: 'MySQL database server',
    service_type: 'database',
    required: false,
    bundleable: true,
    default_config: {
      image: 'mysql:latest',
      ports: [['3306', '3306']],
      volumes: [],
      environment_vars: [
        'MYSQL_ROOT_PASSWORD=root',
        'MYSQL_ROOT_HOST=%',
        'MYSQL_DATABASE=development',
        'MYSQL_USER=developer',
        'MYSQL_PASSWORD=developer',
      ],
      data_volume: 'damp_mysql_data',
      volume_bindings: ['damp_mysql_data:/var/lib/mysql'],
      healthcheck: {
        test: ['CMD', 'mysqladmin', 'ping', '-proot'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      "MySQL installed successfully.\nRoot: 'root' | Database: 'development' | User: 'developer' | Password: 'developer'",
    databaseConfig: {
      supportsMultipleDatabases: true,
    },
  },

  // Mailpit service definition (OPTIONAL)
  [ServiceId.Mailpit]: {
    id: ServiceId.Mailpit,
    name: 'mailpit',
    display_name: 'Mailpit',
    description: 'Email testing server',
    service_type: 'email',
    required: false,
    bundleable: true,
    proxySubdomain: 'mailpit',
    proxyPort: 8025,
    default_config: {
      image: 'axllent/mailpit:latest',
      ports: [
        ['1025', '1025'], // SMTP
        ['8025', '8025'], // Web UI
      ],
      volumes: [],
      environment_vars: [
        'MP_SMTP_BIND_ADDR=0.0.0.0:1025',
        'MP_UI_BIND_ADDR=0.0.0.0:8025',
        'MP_MAX_MESSAGES=5000',
      ],
      data_volume: null,
      volume_bindings: [],
    },
    post_install_message:
      'Mailpit installed and started successfully. Web UI: http://localhost:8025, SMTP: localhost:1025',
  },

  // PostgreSQL service definition (OPTIONAL)
  [ServiceId.PostgreSQL]: {
    id: ServiceId.PostgreSQL,
    name: 'postgresql',
    display_name: 'PostgreSQL Database',
    description: 'PostgreSQL database server',
    service_type: 'database',
    required: false,
    bundleable: true,
    default_config: {
      image: 'postgres:17-alpine',
      ports: [['5432', '5432']],
      volumes: [],
      environment_vars: [
        'POSTGRES_PASSWORD=postgres',
        'POSTGRES_DB=postgres',
        'POSTGRES_USER=postgres',
      ],
      data_volume: 'damp_pgsql_data',
      volume_bindings: ['damp_pgsql_data:/var/lib/postgresql/data'],
      healthcheck: {
        test: ['CMD', 'pg_isready', '-q', '-d', 'postgres', '-U', 'postgres'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      "PostgreSQL installed successfully.\nRoot: 'postgres' | Database: 'postgres' | Password: 'postgres'",
    databaseConfig: {
      supportsMultipleDatabases: true,
    },
  },

  // MariaDB service definition (OPTIONAL)
  [ServiceId.MariaDB]: {
    id: ServiceId.MariaDB,
    name: 'mariadb',
    display_name: 'MariaDB Database',
    description: 'MariaDB database server',
    service_type: 'database',
    required: false,
    bundleable: true,
    default_config: {
      image: 'mariadb:11',
      ports: [['3306', '3306']],
      volumes: [],
      environment_vars: [
        'MARIADB_ROOT_PASSWORD=root',
        'MARIADB_ROOT_HOST=%',
        'MARIADB_DATABASE=development',
        'MARIADB_USER=developer',
        'MARIADB_PASSWORD=developer',
      ],
      data_volume: 'damp-mariadb',
      volume_bindings: ['damp-mariadb:/var/lib/mysql'],
      healthcheck: {
        test: ['CMD', 'healthcheck.sh', '--connect', '--innodb_initialized'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      "MariaDB installed successfully.\nRoot: 'root' | Database: 'development' | User: 'developer' | Password: 'developer'",
    databaseConfig: {
      supportsMultipleDatabases: true,
    },
  },

  // MongoDB service definition (OPTIONAL)
  [ServiceId.MongoDB]: {
    id: ServiceId.MongoDB,
    name: 'mongodb',
    display_name: 'MongoDB Database',
    description: 'MongoDB document database',
    service_type: 'database',
    required: false,
    bundleable: true,
    default_config: {
      image: 'mongo',
      ports: [['27017', '27017']],
      volumes: [],
      environment_vars: ['MONGO_INITDB_ROOT_USERNAME=root', 'MONGO_INITDB_ROOT_PASSWORD=root'],
      data_volume: 'damp-mongodb',
      volume_bindings: ['damp-mongodb:/data/db'],
      healthcheck: {
        test: ['CMD', 'mongosh', '--quiet', '--eval', 'db.runCommand({ping:1}).ok'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message: "MongoDB installed successfully.\nRoot: 'root' | Password: 'root'",
    databaseConfig: {
      supportsMultipleDatabases: true,
    },
  },

  // Redis service definition (OPTIONAL)
  [ServiceId.Redis]: {
    id: ServiceId.Redis,
    name: 'redis',
    display_name: 'Redis Cache',
    description: 'Redis key-value store for caching and sessions',
    service_type: 'cache',
    required: false,
    bundleable: true,
    default_config: {
      image: 'redis:alpine',
      ports: [['6379', '6379']],
      volumes: [],
      environment_vars: [],
      data_volume: 'damp-redis',
      volume_bindings: ['damp-redis:/data'],
      healthcheck: {
        test: ['CMD', 'redis-cli', 'ping'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      'Redis cache server installed and started successfully. Available at localhost:6379',
  },

  // Meilisearch service definition (OPTIONAL)
  [ServiceId.Meilisearch]: {
    id: ServiceId.Meilisearch,
    name: 'meilisearch',
    display_name: 'Meilisearch',
    description: 'Meilisearch full-text search engine',
    service_type: 'search',
    required: false,
    bundleable: true,
    proxySubdomain: 'meilisearch',
    proxyPort: 7700,
    default_config: {
      image: 'getmeili/meilisearch:latest',
      ports: [['7700', '7700']],
      volumes: [],
      environment_vars: ['MEILI_NO_ANALYTICS=false', 'MEILI_MASTER_KEY=masterkey'],
      data_volume: 'damp-meilisearch',
      volume_bindings: ['damp-meilisearch:/meili_data'],
      healthcheck: {
        test: ['CMD', 'curl', '--fail', 'http://127.0.0.1:7700/health'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      "Meilisearch installed and started successfully. Web UI: http://localhost:7700, Master key: 'masterkey'",
  },

  // MinIO service definition (OPTIONAL)
  [ServiceId.MinIO]: {
    id: ServiceId.MinIO,
    name: 'minio',
    display_name: 'MinIO Storage',
    description: 'MinIO S3-compatible object storage',
    service_type: 'storage',
    required: false,
    default_config: {
      image: 'minio/minio:latest',
      ports: [
        ['9000', '9000'], // API
        ['8900', '8900'], // Console
      ],
      volumes: [],
      environment_vars: ['MINIO_ROOT_USER=root', 'MINIO_ROOT_PASSWORD=password'],
      data_volume: 'damp-minio',
      volume_bindings: ['damp-minio:/data'],
      healthcheck: {
        test: ['CMD', 'mc', 'ready', 'local'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      "MinIO storage server installed and started successfully. Console: http://localhost:8900, API: http://localhost:9000, User: 'root', Password: 'password'",
  },

  // Memcached service definition (OPTIONAL)
  [ServiceId.Memcached]: {
    id: ServiceId.Memcached,
    name: 'memcached',
    display_name: 'Memcached',
    description: 'Memcached distributed memory caching system',
    service_type: 'cache',
    required: false,
    bundleable: true,
    default_config: {
      image: 'memcached:alpine',
      ports: [['11211', '11211']],
      volumes: [],
      environment_vars: [],
      data_volume: null,
      volume_bindings: [],
    },
    post_install_message:
      'Memcached installed and started successfully. Available at localhost:11211',
  },

  // RabbitMQ service definition (OPTIONAL)
  [ServiceId.RabbitMQ]: {
    id: ServiceId.RabbitMQ,
    name: 'rabbitmq',
    display_name: 'RabbitMQ',
    description: 'RabbitMQ message broker for queues and messaging',
    service_type: 'queue',
    required: false,
    bundleable: true,
    proxySubdomain: 'rabbitmq',
    proxyPort: 15672,
    default_config: {
      image: 'rabbitmq:4-management-alpine',
      ports: [
        ['5672', '5672'], // AMQP
        ['15672', '15672'], // Management UI
      ],
      volumes: [],
      environment_vars: ['RABBITMQ_DEFAULT_USER=rabbitmq', 'RABBITMQ_DEFAULT_PASS=rabbitmq'],
      data_volume: 'damp-rabbitmq',
      volume_bindings: ['damp-rabbitmq:/var/lib/rabbitmq'],
      healthcheck: {
        test: ['CMD', 'rabbitmq-diagnostics', '-q', 'ping'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      "RabbitMQ installed and started successfully. Management UI: http://localhost:15672, User: 'rabbitmq', Password: 'rabbitmq'",
  },

  // Typesense service definition (OPTIONAL)
  [ServiceId.Typesense]: {
    id: ServiceId.Typesense,
    name: 'typesense',
    display_name: 'Typesense Search',
    description: 'Typesense open source search engine',
    service_type: 'search',
    required: false,
    bundleable: true,
    proxySubdomain: 'typesense',
    proxyPort: 8108,
    default_config: {
      image: 'typesense/typesense:27.1',
      ports: [['8108', '8108']],
      volumes: [],
      environment_vars: [
        'TYPESENSE_DATA_DIR=/typesense-data',
        'TYPESENSE_API_KEY=xyz',
        'TYPESENSE_ENABLE_CORS=true',
      ],
      data_volume: 'damp-typesense',
      volume_bindings: ['damp-typesense:/typesense-data'],
      healthcheck: {
        test: [
          'CMD',
          'bash',
          '-c',
          String.raw`exec 3<>/dev/tcp/localhost/8108 && printf 'GET /health HTTP/1.1\r\nConnection: close\r\n\r\n' >&3 && head -n1 <&3 | grep '200' && exec 3>&-`,
        ],
        retries: 5,
        timeout: 7000000000, // 7 seconds
      },
    },
    post_install_message:
      "Typesense search engine installed and started successfully. Available at http://localhost:8108, API Key: 'xyz'",
  },

  // Valkey service definition (OPTIONAL)
  [ServiceId.Valkey]: {
    id: ServiceId.Valkey,
    name: 'valkey',
    display_name: 'Valkey Cache',
    description: 'Valkey key-value store for caching and sessions',
    service_type: 'cache',
    required: false,
    bundleable: true,
    default_config: {
      image: 'valkey/valkey:alpine',
      ports: [['6379', '6379']],
      volumes: [],
      environment_vars: [],
      data_volume: 'damp-valkey',
      volume_bindings: ['damp-valkey:/data'],
      healthcheck: {
        test: ['CMD', 'valkey-cli', 'ping'],
        retries: 3,
        timeout: 5000000000, // 5 seconds
      },
    },
    post_install_message:
      'Valkey cache server installed and started successfully. Available at localhost:6379',
  },

  // RustFS service definition (OPTIONAL)
  [ServiceId.RustFS]: {
    id: ServiceId.RustFS,
    name: 'rustfs',
    display_name: 'RustFS Storage',
    description: 'RustFS S3-compatible object storage',
    service_type: 'storage',
    required: false,
    default_config: {
      image: 'rustfs/rustfs:latest',
      ports: [
        ['9000', '9000'], // API
        ['9001', '9001'], // Console
      ],
      volumes: [],
      environment_vars: [
        'RUSTFS_VOLUMES=/data',
        'RUSTFS_ADDRESS=0.0.0.0:9000',
        'RUSTFS_CONSOLE_ADDRESS=0.0.0.0:9001',
        'RUSTFS_CONSOLE_ENABLE=true',
        'RUSTFS_EXTERNAL_ADDRESS=:9000',
        'RUSTFS_CORS_ALLOWED_ORIGINS=*',
        'RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS=*',
        'RUSTFS_ACCESS_KEY=damp',
        'RUSTFS_SECRET_KEY=password',
        'RUSTFS_LOG_LEVEL=info',
      ],
      data_volume: 'damp_rustfs_data',
      volume_bindings: ['damp_rustfs_data:/data'],
      healthcheck: {
        test: [
          'CMD',
          'sh',
          '-c',
          'curl -f http://127.0.0.1:9000/health && curl -f http://127.0.0.1:9001/health',
        ],
        retries: 3,
        timeout: 10000000000, // 10 seconds
        interval: 30000000000, // 30 seconds
        start_period: 40000000000, // 40 seconds
      },
    },
    post_install_message:
      "RustFS storage server installed and started successfully. Console: http://localhost:9001, API: http://localhost:9000, Access Key: 'damp', Secret Key: 'password'",
  },

  // phpMyAdmin service definition (BUNDLEABLE ONLY - for project-specific database admin)
  [ServiceId.PhpMyAdmin]: {
    id: ServiceId.PhpMyAdmin,
    name: 'phpmyadmin',
    display_name: 'phpMyAdmin',
    description: 'Web-based MySQL/MariaDB database administration tool',
    service_type: 'database',
    required: false,
    bundleable: true,
    proxySubdomain: 'phpmyadmin',
    proxyPort: 80,
    linkedDatabaseService: ServiceId.MySQL, // Also works with MariaDB
    default_config: {
      image: 'phpmyadmin:latest',
      ports: [], // No host ports for bundled services
      volumes: [],
      environment_vars: [
        'PMA_HOST=mysql', // Will be overridden based on linked database
        'PMA_ARBITRARY=0',
        'UPLOAD_LIMIT=100M',
      ],
      data_volume: null,
      volume_bindings: [],
    },
    post_install_message: 'phpMyAdmin is available for database management.',
  },

  // Adminer service definition (BUNDLEABLE ONLY - for project-specific database admin)
  [ServiceId.Adminer]: {
    id: ServiceId.Adminer,
    name: 'adminer',
    display_name: 'Adminer',
    description: 'Lightweight database management tool (supports MySQL, PostgreSQL, MongoDB)',
    service_type: 'database',
    required: false,
    bundleable: true,
    proxySubdomain: 'adminer',
    proxyPort: 8080,
    linkedDatabaseService: ServiceId.PostgreSQL, // Primary for PostgreSQL, but works with all
    default_config: {
      image: 'adminer:latest',
      ports: [], // No host ports for bundled services
      volumes: [],
      environment_vars: ['ADMINER_DEFAULT_SERVER=postgresql'],
      data_volume: null,
      volume_bindings: [],
    },
    post_install_message: 'Adminer is available for database management.',
  },
};

/**
 * Get a service definition by ID
 */
export function getServiceDefinition(serviceId: ServiceId): ServiceDefinition | undefined {
  return SERVICE_DEFINITIONS[serviceId];
}

/**
 * Get all service definitions
 */
export function getAllServiceDefinitions(): ServiceDefinition[] {
  return Object.values(SERVICE_DEFINITIONS);
}

/**
 * Get all required service definitions
 */
export function getRequiredServices(): ServiceDefinition[] {
  return getAllServiceDefinitions().filter(service => service.required);
}

/**
 * Get all optional service definitions
 */
export function getOptionalServices(): ServiceDefinition[] {
  return getAllServiceDefinitions().filter(service => !service.required);
}

/**
 * Get all bundleable service definitions (can be embedded in project docker-compose)
 */
export function getBundleableServices(): ServiceDefinition[] {
  return getAllServiceDefinitions().filter(service => service.bundleable === true);
}

/**
 * Get bundleable services grouped by service type
 */
export function getBundleableServicesByType(): Record<string, ServiceDefinition[]> {
  const bundleable = getBundleableServices();
  return bundleable.reduce(
    (acc, service) => {
      const type = service.service_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(service);
      return acc;
    },
    {} as Record<string, ServiceDefinition[]>
  );
}
