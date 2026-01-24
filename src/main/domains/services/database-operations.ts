import {
  execCommand,
  findContainerByLabel,
  getFileFromContainer,
  putFileToContainer,
} from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { ServiceId } from '@shared/types/service';

/**
 * Temporary file path in container for database restore operations
 */
const TEMP_RESTORE_FILE_PATH = '/tmp/damp_restore.dump';

function sanitizeDatabaseName(dbName: string): string {
  if (!dbName || dbName.trim().length === 0) {
    throw new Error('Database name cannot be empty');
  }
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
        'psql -U "$POSTGRES_USER" -t -c "SELECT datname FROM pg_database WHERE datistemplate = false"',
      ];

    case ServiceId.MongoDB:
      return [
        'sh',
        '-c',
        String.raw`mongosh --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet --eval "db.adminCommand({ listDatabases: 1 }).databases.map(d => d.name).filter(n => !['admin', 'config', 'local'].includes(n)).join('\n')"`,
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

    default:
      throw new Error(`Service ${serviceId} does not support database dump operations`);
  }
}

/**
 * Get dump command that writes to a file (for binary formats)
 * Used for PostgreSQL and MongoDB which produce binary output
 */
function getDumpCommandToFile(
  serviceId: ServiceId,
  sanitizedDbName: string,
  outputPath: string
): string[] {
  switch (serviceId) {
    case ServiceId.PostgreSQL:
      return ['sh', '-c', `pg_dump -U "$POSTGRES_USER" -Fc ${sanitizedDbName} > ${outputPath}`];

    case ServiceId.MongoDB:
      return [
        'sh',
        '-c',
        `mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db ${sanitizedDbName} --archive=${outputPath} --gzip`,
      ];

    default:
      throw new Error(`Service ${serviceId} does not support file-based dump operations`);
  }
}

export async function dumpDatabase(serviceId: ServiceId, databaseName: string): Promise<Buffer> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);
  const containerId = await getContainerIdOrName(serviceId);

  // PostgreSQL and MongoDB produce binary dumps - use temp file approach to avoid corruption
  if (serviceId === ServiceId.PostgreSQL || serviceId === ServiceId.MongoDB) {
    const tempDumpPath = `/tmp/damp_dump_${Date.now()}.dump`;

    try {
      // Write dump to temp file in container
      const dumpCmd = getDumpCommandToFile(serviceId, sanitizedDbName, tempDumpPath);
      const result = await execCommand(containerId, dumpCmd);

      if (result.exitCode !== 0) {
        throw new Error(`Failed to dump database: ${result.stderr || 'Unknown error'}`);
      }

      // Retrieve binary file from container
      const dumpBuffer = await getFileFromContainer(containerId, tempDumpPath);

      return dumpBuffer;
    } finally {
      // Always clean up temp file, even if retrieval fails
      await execCommand(containerId, ['rm', '-f', tempDumpPath]).catch(() => {
        // Ignore cleanup errors
      });
    }
  }

  // MySQL and MariaDB produce text SQL dumps - can use stdout directly
  const cmd = getDumpCommand(serviceId, sanitizedDbName);
  const result = await execCommand(containerId, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to dump database: ${result.stderr || 'Unknown error'}`);
  }

  return Buffer.from(result.stdout, 'utf8');
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
        `mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e 'CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\`' && exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ${sanitizedDbName} < ${tempFile}`,
      ];

    case ServiceId.MariaDB:
      return [
        'sh',
        '-c',
        `mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e 'CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\`' && exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" ${sanitizedDbName} < ${tempFile}`,
      ];

    case ServiceId.PostgreSQL:
      return [
        'sh',
        '-c',
        `(psql -U "$POSTGRES_USER" -c "CREATE DATABASE ${sanitizedDbName}" 2>/dev/null || true) && pg_restore -U "$POSTGRES_USER" -d ${sanitizedDbName} --clean --if-exists ${tempFile}`,
      ];

    case ServiceId.MongoDB:
      return [
        'sh',
        '-c',
        `mongorestore --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db ${sanitizedDbName} --archive=${tempFile} --gzip --drop`,
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
