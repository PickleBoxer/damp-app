import { execCommand, findContainerByLabel, putFileToContainer } from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { ServiceId } from '@shared/types/service';

/**
 * Temporary file path in container for database restore operations
 */
const TEMP_RESTORE_FILE_PATH = '/tmp/damp_restore.dump';

function sanitizeDatabaseName(dbName: string): string {
  const sanitized = dbName.replaceAll(/[^a-zA-Z0-9_-]/g, '');
  if (sanitized !== dbName) {
    throw new Error(
      `Invalid database name: "${dbName}". Only alphanumeric characters, underscores, and hyphens are allowed.`
    );
  }
  return sanitized;
}

async function getContainerIdOrName(serviceId: ServiceId): Promise<string> {
  const containerInfo = await findContainerByLabel(
    LABEL_KEYS.SERVICE_ID,
    serviceId,
    RESOURCE_TYPES.SERVICE_CONTAINER
  );

  if (!containerInfo) {
    throw new Error(`Container for service ${serviceId} not found`);
  }

  return containerInfo.Id;
}

function parseDatabaseList(stdout: string): string[] {
  return stdout
    .trim()
    .split('\n')
    .map(db => db.trim())
    .filter(db => db.length > 0);
}

function getListDatabasesCommand(serviceId: ServiceId): string[] {
  switch (serviceId) {
    case ServiceId.MySQL:
      return [
        'sh',
        '-c',
        'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES" | tail -n +2 | grep -v -E "^(information_schema|performance_schema|mysql|sys)$"',
      ];

    case ServiceId.MariaDB:
      return [
        'sh',
        '-c',
        'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SHOW DATABASES" | tail -n +2 | grep -v -E "^(information_schema|performance_schema|mysql|sys)$"',
      ];

    case ServiceId.PostgreSQL:
      return [
        'sh',
        '-c',
        'psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datistemplate = false"',
      ];

    case ServiceId.MongoDB:
      return [
        'sh',
        '-c',
        String.raw`mongosh --username root --password root --authenticationDatabase admin --quiet --eval "db.adminCommand({ listDatabases: 1 }).databases.map(d => d.name).filter(n => !['admin', 'config', 'local'].includes(n)).join('\n')"`,
      ];

    default:
      throw new Error(`Service ${serviceId} does not support database operations`);
  }
}

export async function listDatabases(serviceId: ServiceId): Promise<string[]> {
  const containerId = await getContainerIdOrName(serviceId);
  const cmd = getListDatabasesCommand(serviceId);

  const result = await execCommand(containerId, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list databases: ${result.stderr || result.stdout}`);
  }

  return parseDatabaseList(result.stdout);
}

function getDumpCommand(serviceId: ServiceId, sanitizedDbName: string): string[] {
  switch (serviceId) {
    case ServiceId.MySQL:
      return [
        'sh',
        '-c',
        `exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers ${sanitizedDbName}`,
      ];

    case ServiceId.MariaDB:
      return [
        'sh',
        '-c',
        `exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers ${sanitizedDbName}`,
      ];

    case ServiceId.PostgreSQL:
      return ['sh', '-c', `pg_dump -U postgres -Fc ${sanitizedDbName}`];

    case ServiceId.MongoDB:
      return [
        'sh',
        '-c',
        `mongodump --username root --password root --authenticationDatabase admin --db ${sanitizedDbName} --archive --gzip`,
      ];

    default:
      throw new Error(`Service ${serviceId} does not support database dump operations`);
  }
}

export async function dumpDatabase(serviceId: ServiceId, databaseName: string): Promise<Buffer> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);
  const containerId = await getContainerIdOrName(serviceId);
  const cmd = getDumpCommand(serviceId, sanitizedDbName);

  const result = await execCommand(containerId, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to dump database: ${result.stderr || 'Unknown error'}`);
  }

  return Buffer.from(result.stdout, 'binary');
}

function getRestoreCommand(
  serviceId: ServiceId,
  sanitizedDbName: string,
  tempFile: string
): string[] {
  switch (serviceId) {
    case ServiceId.MySQL:
      return [
        'sh',
        '-c',
        `exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\`" && exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ${sanitizedDbName} < ${tempFile}`,
      ];

    case ServiceId.MariaDB:
      return [
        'sh',
        '-c',
        `exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\`" && exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" ${sanitizedDbName} < ${tempFile}`,
      ];

    case ServiceId.PostgreSQL:
      return [
        'sh',
        '-c',
        `pg_restore -U postgres -d ${sanitizedDbName} --clean --if-exists ${tempFile}`,
      ];

    case ServiceId.MongoDB:
      return [
        'sh',
        '-c',
        `mongorestore --username root --password root --authenticationDatabase admin --db ${sanitizedDbName} --archive=${tempFile} --gzip --drop`,
      ];

    default:
      throw new Error(`Service ${serviceId} does not support database restore operations`);
  }
}

export async function restoreDatabase(
  serviceId: ServiceId,
  databaseName: string,
  dumpData: Buffer
): Promise<void> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);
  const containerId = await getContainerIdOrName(serviceId);

  // Upload dump file to container using Docker API (secure and efficient)
  await putFileToContainer(containerId, dumpData, TEMP_RESTORE_FILE_PATH);

  try {
    const restoreCmd = getRestoreCommand(serviceId, sanitizedDbName, TEMP_RESTORE_FILE_PATH);
    const restoreResult = await execCommand(containerId, restoreCmd);

    if (restoreResult.exitCode !== 0) {
      throw new Error(`Failed to restore database: ${restoreResult.stderr || 'Unknown error'}`);
    }
  } finally {
    // Always clean up temp file, even if restore fails
    await execCommand(containerId, ['rm', '-f', TEMP_RESTORE_FILE_PATH]).catch(() => {
      // Ignore cleanup errors
    });
  }
}

/**
 * Get file extension for dump files based on service
 */
export function getDumpFileExtension(serviceId: ServiceId): string {
  switch (serviceId) {
    case ServiceId.MySQL:
    case ServiceId.MariaDB:
      return 'sql';
    case ServiceId.PostgreSQL:
      return 'dump';
    case ServiceId.MongoDB:
      return 'archive';
    default:
      return 'dump';
  }
}

/**
 * Get file filter for dump files based on service
 */
export function getDumpFileFilter(serviceId: ServiceId): { name: string; extensions: string[] } {
  switch (serviceId) {
    case ServiceId.MySQL:
    case ServiceId.MariaDB:
      return { name: 'SQL Files', extensions: ['sql'] };
    case ServiceId.PostgreSQL:
      return { name: 'PostgreSQL Dump Files', extensions: ['dump'] };
    case ServiceId.MongoDB:
      return { name: 'MongoDB Archive Files', extensions: ['archive', 'gz'] };
    default:
      return { name: 'Database Dump Files', extensions: ['dump', 'sql'] };
  }
}
