/**
 * Service registry with all predefined service definitions
 */

import { ServiceDefinition, ServiceId } from "../../types/service";

/**
 * Registry of all available services
 */
export const SERVICE_DEFINITIONS: Record<ServiceId, ServiceDefinition> = {
  // Caddy service definition (REQUIRED)
  [ServiceId.Caddy]: {
    id: ServiceId.Caddy,
    name: "caddy",
    display_name: "Web Server",
    description: "Caddy reverse proxy server for local development",
    service_type: "web",
    required: true,
    default_config: {
      image: "caddy:latest",
      container_name: "damp-web",
      ports: [
        ["80", "80"],
        ["443", "443"],
      ],
      volumes: ["damp_caddy_data", "damp_caddy_config"],
      environment_vars: [],
      data_volume: "damp_caddy_data",
      volume_bindings: [
        "damp_caddy_data:/data",
        "damp_caddy_config:/config",
      ],
    },
    post_install_message:
      "Caddy web server installed successfully. SSL certificates will be automatically generated for .local domains.",
  },

  // MySQL service definition (OPTIONAL)
  [ServiceId.MySQL]: {
    id: ServiceId.MySQL,
    name: "mysql",
    display_name: "MySQL Database",
    description: "MySQL database server for local development",
    service_type: "database",
    required: false,
    default_config: {
      image: "mysql:latest",
      container_name: "damp-mysql",
      ports: [["3306", "3306"]],
      volumes: [],
      environment_vars: [
        "MYSQL_ROOT_PASSWORD=rootpassword",
        "MYSQL_DATABASE=development",
        "MYSQL_USER=developer",
        "MYSQL_PASSWORD=devpassword",
      ],
      data_volume: "damp_mysql_data",
      volume_bindings: ["damp_mysql_data:/var/lib/mysql"],
    },
    post_install_message:
      "MySQL server installed and started successfully. Root password: 'rootpassword', Database: 'development', User: 'developer', Password: 'devpassword'",
  },

  // Mailpit service definition (OPTIONAL)
  [ServiceId.Mailpit]: {
    id: ServiceId.Mailpit,
    name: "mailpit",
    display_name: "Mail Testing",
    description: "Email testing server for local development",
    service_type: "email",
    required: false,
    default_config: {
      image: "axllent/mailpit:latest",
      container_name: "damp-mailpit",
      ports: [
        ["1025", "1025"], // SMTP
        ["8025", "8025"], // Web UI
      ],
      volumes: [],
      environment_vars: [
        "MP_SMTP_BIND_ADDR=0.0.0.0:1025",
        "MP_UI_BIND_ADDR=0.0.0.0:8025",
        "MP_MAX_MESSAGES=5000",
      ],
      data_volume: null,
      volume_bindings: [],
    },
    post_install_message:
      "Mailpit installed and started successfully. Web UI: http://localhost:8025, SMTP: localhost:1025",
  },

  // PostgreSQL service definition (OPTIONAL)
  [ServiceId.PostgreSQL]: {
    id: ServiceId.PostgreSQL,
    name: "postgresql",
    display_name: "PostgreSQL Database",
    description: "PostgreSQL database server for local development",
    service_type: "database",
    required: false,
    default_config: {
      image: "postgres:17-alpine",
      container_name: "damp-postgresql",
      ports: [["5432", "5432"]],
      volumes: [],
      environment_vars: [
        "POSTGRES_PASSWORD=postgres",
        "POSTGRES_DB=development",
        "POSTGRES_USER=postgres",
      ],
      data_volume: "damp-pgsql",
      volume_bindings: ["damp-pgsql:/var/lib/postgresql/data"],
    },
    post_install_message:
      "PostgreSQL server installed and started successfully. Database: 'development', User: 'postgres', Password: 'postgres'",
  },

  // MariaDB service definition (OPTIONAL)
  [ServiceId.MariaDB]: {
    id: ServiceId.MariaDB,
    name: "mariadb",
    display_name: "MariaDB Database",
    description: "MariaDB database server for local development",
    service_type: "database",
    required: false,
    default_config: {
      image: "mariadb:11",
      container_name: "damp-mariadb",
      ports: [["3306", "3306"]],
      volumes: [],
      environment_vars: [
        "MYSQL_ROOT_PASSWORD=rootpassword",
        "MYSQL_DATABASE=development",
        "MYSQL_USER=developer",
        "MYSQL_PASSWORD=devpassword",
      ],
      data_volume: "damp-mariadb",
      volume_bindings: ["damp-mariadb:/var/lib/mysql"],
    },
    post_install_message:
      "MariaDB server installed and started successfully. Root password: 'rootpassword', Database: 'development', User: 'developer', Password: 'devpassword'",
  },

  // MongoDB service definition (OPTIONAL)
  [ServiceId.MongoDB]: {
    id: ServiceId.MongoDB,
    name: "mongodb",
    display_name: "MongoDB Database",
    description: "MongoDB document database for local development",
    service_type: "database",
    required: false,
    default_config: {
      image: "mongodb/mongodb-atlas-local:latest",
      container_name: "damp-mongodb",
      ports: [["27017", "27017"]],
      volumes: [],
      environment_vars: [
        "MONGODB_INITDB_ROOT_USERNAME=root",
        "MONGODB_INITDB_ROOT_PASSWORD=rootpassword",
      ],
      data_volume: "damp-mongodb",
      volume_bindings: ["damp-mongodb:/data/db"],
    },
    post_install_message:
      "MongoDB server installed and started successfully. Username: 'root', Password: 'rootpassword'",
  },

  // Redis service definition (OPTIONAL)
  [ServiceId.Redis]: {
    id: ServiceId.Redis,
    name: "redis",
    display_name: "Redis Cache",
    description: "Redis key-value store for caching and sessions",
    service_type: "cache",
    required: false,
    default_config: {
      image: "redis:alpine",
      container_name: "damp-redis",
      ports: [["6379", "6379"]],
      volumes: [],
      environment_vars: [],
      data_volume: "damp-redis",
      volume_bindings: ["damp-redis:/data"],
    },
    post_install_message:
      "Redis cache server installed and started successfully. Available at localhost:6379",
  },

  // Meilisearch service definition (OPTIONAL)
  [ServiceId.Meilisearch]: {
    id: ServiceId.Meilisearch,
    name: "meilisearch",
    display_name: "Meilisearch",
    description: "Meilisearch full-text search engine",
    service_type: "search",
    required: false,
    default_config: {
      image: "getmeili/meilisearch:latest",
      container_name: "damp-meilisearch",
      ports: [["7700", "7700"]],
      volumes: [],
      environment_vars: [
        "MEILI_NO_ANALYTICS=false",
        "MEILI_MASTER_KEY=masterkey",
      ],
      data_volume: "damp-meilisearch",
      volume_bindings: ["damp-meilisearch:/meili_data"],
    },
    post_install_message:
      "Meilisearch installed and started successfully. Web UI: http://localhost:7700, Master key: 'masterkey'",
  },

  // MinIO service definition (OPTIONAL)
  [ServiceId.MinIO]: {
    id: ServiceId.MinIO,
    name: "minio",
    display_name: "MinIO Storage",
    description: "MinIO S3-compatible object storage",
    service_type: "storage",
    required: false,
    default_config: {
      image: "minio/minio:latest",
      container_name: "damp-minio",
      ports: [
        ["9000", "9000"], // API
        ["8900", "8900"], // Console
      ],
      volumes: [],
      environment_vars: [
        "MINIO_ROOT_USER=root",
        "MINIO_ROOT_PASSWORD=password",
      ],
      data_volume: "damp-minio",
      volume_bindings: ["damp-minio:/data"],
    },
    post_install_message:
      "MinIO storage server installed and started successfully. Console: http://localhost:8900, API: http://localhost:9000, User: 'root', Password: 'password'",
  },

  // Memcached service definition (OPTIONAL)
  [ServiceId.Memcached]: {
    id: ServiceId.Memcached,
    name: "memcached",
    display_name: "Memcached",
    description: "Memcached distributed memory caching system",
    service_type: "cache",
    required: false,
    default_config: {
      image: "memcached:alpine",
      container_name: "damp-memcached",
      ports: [["11211", "11211"]],
      volumes: [],
      environment_vars: [],
      data_volume: null,
      volume_bindings: [],
    },
    post_install_message:
      "Memcached installed and started successfully. Available at localhost:11211",
  },

  // RabbitMQ service definition (OPTIONAL)
  [ServiceId.RabbitMQ]: {
    id: ServiceId.RabbitMQ,
    name: "rabbitmq",
    display_name: "RabbitMQ",
    description: "RabbitMQ message broker for queues and messaging",
    service_type: "queue",
    required: false,
    default_config: {
      image: "rabbitmq:4-management-alpine",
      container_name: "damp-rabbitmq",
      ports: [
        ["5672", "5672"], // AMQP
        ["15672", "15672"], // Management UI
      ],
      volumes: [],
      environment_vars: [
        "RABBITMQ_DEFAULT_USER=rabbitmq",
        "RABBITMQ_DEFAULT_PASS=rabbitmq",
      ],
      data_volume: "damp-rabbitmq",
      volume_bindings: ["damp-rabbitmq:/var/lib/rabbitmq"],
    },
    post_install_message:
      "RabbitMQ installed and started successfully. Management UI: http://localhost:15672, User: 'rabbitmq', Password: 'rabbitmq'",
  },

  // Typesense service definition (OPTIONAL)
  [ServiceId.Typesense]: {
    id: ServiceId.Typesense,
    name: "typesense",
    display_name: "Typesense Search",
    description: "Typesense open source search engine",
    service_type: "search",
    required: false,
    default_config: {
      image: "typesense/typesense:27.1",
      container_name: "damp-typesense",
      ports: [["8108", "8108"]],
      volumes: [],
      environment_vars: [
        "TYPESENSE_DATA_DIR=/typesense-data",
        "TYPESENSE_API_KEY=xyz",
        "TYPESENSE_ENABLE_CORS=true",
      ],
      data_volume: "damp-typesense",
      volume_bindings: ["damp-typesense:/typesense-data"],
    },
    post_install_message:
      "Typesense search engine installed and started successfully. Available at http://localhost:8108, API Key: 'xyz'",
  },

  // Valkey service definition (OPTIONAL)
  [ServiceId.Valkey]: {
    id: ServiceId.Valkey,
    name: "valkey",
    display_name: "Valkey Cache",
    description: "Valkey key-value store for caching and sessions",
    service_type: "cache",
    required: false,
    default_config: {
      image: "valkey/valkey:alpine",
      container_name: "damp-valkey",
      ports: [["6379", "6379"]],
      volumes: [],
      environment_vars: [],
      data_volume: "damp-valkey",
      volume_bindings: ["damp-valkey:/data"],
    },
    post_install_message:
      "Valkey cache server installed and started successfully. Available at localhost:6379",
  },
};

/**
 * Get service definition by ID
 */
export function getServiceDefinition(
  serviceId: ServiceId
): ServiceDefinition | undefined {
  return SERVICE_DEFINITIONS[serviceId];
}

/**
 * Get all service definitions as array
 */
export function getAllServiceDefinitions(): ServiceDefinition[] {
  return Object.values(SERVICE_DEFINITIONS);
}

/**
 * Get all required services
 */
export function getRequiredServices(): ServiceDefinition[] {
  return getAllServiceDefinitions().filter((service) => service.required);
}

/**
 * Get all optional services
 */
export function getOptionalServices(): ServiceDefinition[] {
  return getAllServiceDefinitions().filter((service) => !service.required);
}
