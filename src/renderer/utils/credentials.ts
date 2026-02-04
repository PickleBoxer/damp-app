/**
 * Credential extraction utilities for services
 */

import { ServiceId } from '@shared/types/service';

export interface Credential {
  label: string;
  value: string;
  copyLabel: string;
}

interface CredentialContext {
  /** Project name for host generation (bundled services only) */
  projectName?: string;
}

/**
 * Extract credentials from environment variables based on service type
 */
export function extractServiceCredentials(
  serviceId: ServiceId,
  envVars: Record<string, string>,
  context?: CredentialContext
): Credential[] {
  const credentials: Credential[] = [];
  const hostPrefix = context?.projectName ? `${context.projectName}-` : 'damp-';

  switch (serviceId) {
    case ServiceId.MySQL:
    case ServiceId.MariaDB:
      if (context?.projectName) {
        credentials.push(
          { label: 'Host', value: `${hostPrefix}${serviceId}`, copyLabel: 'Host' },
          { label: 'Port', value: envVars.MYSQL_TCP_PORT || '3306', copyLabel: 'Port' }
        );
      }
      credentials.push(
        {
          label: 'Database',
          value: envVars.MYSQL_DATABASE || 'development',
          copyLabel: 'Database',
        },
        { label: 'Username', value: envVars.MYSQL_USER || 'developer', copyLabel: 'Username' },
        { label: 'Password', value: envVars.MYSQL_PASSWORD || 'developer', copyLabel: 'Password' },
        {
          label: 'Root Password',
          value: envVars.MYSQL_ROOT_PASSWORD || 'root',
          copyLabel: 'Root password',
        }
      );
      break;

    case ServiceId.PostgreSQL:
      if (context?.projectName) {
        credentials.push(
          { label: 'Host', value: `${hostPrefix}postgresql`, copyLabel: 'Host' },
          { label: 'Port', value: envVars.PGPORT || '5432', copyLabel: 'Port' }
        );
      }
      credentials.push(
        { label: 'Database', value: envVars.POSTGRES_DB || 'postgres', copyLabel: 'Database' },
        { label: 'Username', value: envVars.POSTGRES_USER || 'postgres', copyLabel: 'Username' },
        {
          label: 'Password',
          value: envVars.POSTGRES_PASSWORD || 'postgres',
          copyLabel: 'Password',
        }
      );
      break;

    case ServiceId.MongoDB:
      if (context?.projectName) {
        credentials.push(
          { label: 'Host', value: `${hostPrefix}mongodb`, copyLabel: 'Host' },
          { label: 'Port', value: '27017', copyLabel: 'Port' }
        );
      }
      credentials.push(
        {
          label: 'Username',
          value: envVars.MONGO_INITDB_ROOT_USERNAME || 'root',
          copyLabel: 'Username',
        },
        {
          label: 'Password',
          value: envVars.MONGO_INITDB_ROOT_PASSWORD || 'root',
          copyLabel: 'Password',
        }
      );
      break;

    case ServiceId.Redis:
    case ServiceId.Valkey:
      if (context?.projectName) {
        credentials.push(
          { label: 'Host', value: `${hostPrefix}${serviceId}`, copyLabel: 'Host' },
          { label: 'Port', value: '6379', copyLabel: 'Port' }
        );
      }
      break;

    case ServiceId.Memcached:
      if (context?.projectName) {
        credentials.push(
          { label: 'Host', value: `${hostPrefix}memcached`, copyLabel: 'Host' },
          { label: 'Port', value: '11211', copyLabel: 'Port' }
        );
      }
      break;

    case ServiceId.RabbitMQ:
      credentials.push(
        {
          label: 'Username',
          value: envVars.RABBITMQ_DEFAULT_USER || 'rabbitmq',
          copyLabel: 'Username',
        },
        {
          label: 'Password',
          value: envVars.RABBITMQ_DEFAULT_PASS || 'rabbitmq',
          copyLabel: 'Password',
        }
      );
      break;

    case ServiceId.MinIO:
      credentials.push(
        { label: 'Access Key', value: envVars.MINIO_ROOT_USER || 'root', copyLabel: 'Access key' },
        {
          label: 'Secret Key',
          value: envVars.MINIO_ROOT_PASSWORD || 'password',
          copyLabel: 'Secret key',
        }
      );
      break;

    case ServiceId.RustFS:
      credentials.push(
        {
          label: 'Access Key',
          value: envVars.RUSTFS_ACCESS_KEY || 'damp',
          copyLabel: 'Access key',
        },
        {
          label: 'Secret Key',
          value: envVars.RUSTFS_SECRET_KEY || 'password',
          copyLabel: 'Secret key',
        }
      );
      break;

    case ServiceId.Meilisearch:
      credentials.push({
        label: 'Master Key',
        value: envVars.MEILI_MASTER_KEY || 'masterkey',
        copyLabel: 'Master key',
      });
      break;

    case ServiceId.Typesense:
      credentials.push({
        label: 'API Key',
        value: envVars.TYPESENSE_API_KEY || 'xyz',
        copyLabel: 'API key',
      });
      break;

    case ServiceId.Mailpit:
      if (context?.projectName) {
        credentials.push({
          label: 'SMTP Host',
          value: `${hostPrefix}mailpit:1025`,
          copyLabel: 'SMTP host',
        });
      }
      break;

    default:
      break;
  }

  return credentials;
}

/** Services that have credentials to display */
const SERVICES_WITH_CREDENTIALS = new Set<ServiceId>([
  ServiceId.MySQL,
  ServiceId.MariaDB,
  ServiceId.PostgreSQL,
  ServiceId.MongoDB,
  ServiceId.Redis,
  ServiceId.Valkey,
  ServiceId.Memcached,
  ServiceId.RabbitMQ,
  ServiceId.MinIO,
  ServiceId.RustFS,
  ServiceId.Meilisearch,
  ServiceId.Typesense,
  ServiceId.Mailpit,
]);

/** Check if a service has credentials to display */
export function hasCredentials(serviceId: ServiceId): boolean {
  return SERVICES_WITH_CREDENTIALS.has(serviceId);
}

/** Services that have admin URLs */
const SERVICES_WITH_ADMIN_URL = new Set<ServiceId>([
  ServiceId.PhpMyAdmin,
  ServiceId.Adminer,
  ServiceId.Mailpit,
]);

/** Check if a service has an admin URL */
export function hasAdminUrl(serviceId: ServiceId): boolean {
  return SERVICES_WITH_ADMIN_URL.has(serviceId);
}

/** Get admin URL for a service */
export function getServiceAdminUrl(serviceId: ServiceId, projectDomain: string): string | null {
  const baseDomain = projectDomain.replace(/^https?:\/\//, '');

  switch (serviceId) {
    case ServiceId.PhpMyAdmin:
      return `http://phpmyadmin.${baseDomain}`;
    case ServiceId.Adminer:
      return `http://adminer.${baseDomain}`;
    case ServiceId.Mailpit:
      return `http://mailpit.${baseDomain}`;
    default:
      return null;
  }
}
