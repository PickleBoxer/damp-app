/**
 * Database operations for containerized database services
 * Provides dump, restore, and list operations for MySQL, MariaDB, PostgreSQL, and MongoDB
 */

import { execCommand, findContainerByLabel } from '@main/core/docker';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { ServiceId } from '@shared/types/service';

/**
 * Sanitize database name to prevent shell injection
 * Only allows alphanumeric characters, underscores, and hyphens
 */
function sanitizeDatabaseName(dbName: string): string {
  const sanitized = dbName.replaceAll(/[^a-zA-Z0-9_-]/g, '');
  if (sanitized !== dbName) {
    throw new Error(
      `Invalid database name: "${dbName}". Only alphanumeric characters, underscores, and hyphens are allowed.`
    );
  }
  return sanitized;
}

/**
 * Get container ID or name for a service using labels (dynamic lookup)
 */
async function getContainerIdOrName(serviceId: ServiceId): Promise<string> {
  const containerInfo = await findContainerByLabel(
    LABEL_KEYS.SERVICE_ID,
    serviceId,
    RESOURCE_TYPES.SERVICE_CONTAINER
  );

  if (!containerInfo) {
    throw new Error(`Container for service ${serviceId} not found`);
  }

  // Return container ID (more reliable than name)
  return containerInfo.Id;
}

/**
 * List all databases for a service
 */
export async function listDatabases(serviceId: ServiceId): Promise<string[]> {
  const containerId = await getContainerIdOrName(serviceId);

  let cmd: string[];
  let parseOutput: (stdout: string) => string[];

  switch (serviceId) {
    case ServiceId.MySQL:
      cmd = [
        'sh',
        '-c',
        'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES" | tail -n +2 | grep -v -E "^(information_schema|performance_schema|mysql|sys)$"',
      ];
      parseOutput = (stdout) =>
        stdout
          .trim()
          .split('\n')
          .filter((db) => db.length > 0);
      break;

    case ServiceId.MariaDB:
      cmd = [
        'sh',
        '-c',
        'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "SHOW DATABASES" | tail -n +2 | grep -v -E "^(information_schema|performance_schema|mysql|sys)$"',
      ];
      parseOutput = (stdout) =>
        stdout
          .trim()
          .split('\n')
          .filter((db) => db.length > 0);
      break;

    case ServiceId.PostgreSQL:
      cmd = [
        'sh',
        '-c',
        'psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN (\'postgres\')"',
      ];
      parseOutput = (stdout) =>
        stdout
          .trim()
          .split('\n')
          .map((db) => db.trim())
          .filter((db) => db.length > 0);
      break;

    case ServiceId.MongoDB:
      cmd = [
        'sh',
        '-c',
        String.raw`mongosh --username root --password root --authenticationDatabase admin --quiet --eval "db.adminCommand({ listDatabases: 1 }).databases.map(d => d.name).filter(n => !['admin', 'config', 'local'].includes(n)).join('\n')"`,
      ];
      parseOutput = (stdout) =>
        stdout
          .trim()
          .split('\n')
          .filter((db) => db.length > 0);
      break;

    default:
      throw new Error(`Service ${serviceId} does not support database operations`);
  }

  const result = await execCommand(containerId, cmd);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list databases: ${result.stderr || result.stdout}`);
  }

  return parseOutput(result.stdout);
}

/**
 * Create a database dump
 * Returns a Buffer containing the dump data
 */
export async function dumpDatabase(
  serviceId: ServiceId,
  databaseName: string
): Promise<Buffer> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);
  const containerId = await getContainerIdOrName(serviceId);

  let cmd: string[];

  switch (serviceId) {
    case ServiceId.MySQL:
      cmd = [
        'sh',
        '-c',
        `exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --databases ${sanitizedDbName}`,
      ];
      break;

    case ServiceId.MariaDB:
      cmd = [
        'sh',
        '-c',
        `exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers --databases ${sanitizedDbName}`,
      ];
      break;

    case ServiceId.PostgreSQL:
      // Use -Fc for custom format (compressed, includes metadata)
      // Use -v for verbose output to stderr (helps with debugging)
      cmd = ['sh', '-c', `pg_dump -U postgres -Fc ${sanitizedDbName}`];
      break;

    case ServiceId.MongoDB:
      // Use --archive to output to stdout
      // Use --gzip for compression
      cmd = [
        'sh',
        '-c',
        `mongodump --username root --password root --authenticationDatabase admin --db ${sanitizedDbName} --archive --gzip`,
      ];
      break;

    default:
      throw new Error(`Service ${serviceId} does not support database dump operations`);
  }

  const result = await execCommand(containerId, cmd);

  if (result.exitCode !== 0) {
    // For some tools, warnings go to stderr but exitCode is still 0
    // Only throw if there's a real error (non-zero exit code)
    throw new Error(`Failed to dump database: ${result.stderr || 'Unknown error'}`);
  }

  // Return the dump as a Buffer
  return Buffer.from(result.stdout, 'binary');
}

/**
 * Restore a database from dump data
 */
export async function restoreDatabase(
  serviceId: ServiceId,
  databaseName: string,
  dumpData: Buffer
): Promise<void> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);
  const containerId = await getContainerIdOrName(serviceId);

  // Validate service type
  if (
    serviceId !== ServiceId.MySQL &&
    serviceId !== ServiceId.MariaDB &&
    serviceId !== ServiceId.PostgreSQL &&
    serviceId !== ServiceId.MongoDB
  ) {
    throw new Error(`Service ${serviceId} does not support database restore operations`);
  }

  // For now, we need to write the dump to the container first, then restore
  // This is a limitation of execCommand not supporting stdin
  // We'll implement a two-step process:
  // 1. Write dump to /tmp/damp_restore.dump in container
  // 2. Execute restore command reading from that file

  const tempFile = '/tmp/damp_restore.dump';
  const base64Data = dumpData.toString('base64');

  // Write dump data to temp file in container
  const writeCmd = ['sh', '-c', `echo '${base64Data}' | base64 -d > ${tempFile}`];
  const writeResult = await execCommand(containerId, writeCmd);

  if (writeResult.exitCode !== 0) {
    throw new Error(`Failed to write dump file to container: ${writeResult.stderr}`);
  }

  // Adjust restore command to read from temp file
  let restoreCmd: string[];
  switch (serviceId) {
    case ServiceId.MySQL:
      restoreCmd = ['sh', '-c', `exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" ${sanitizedDbName} < ${tempFile}`];
      break;

    case ServiceId.MariaDB:
      restoreCmd = ['sh', '-c', `exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" ${sanitizedDbName} < ${tempFile}`];
      break;

    case ServiceId.PostgreSQL:
      restoreCmd = [
        'sh',
        '-c',
        `pg_restore -U postgres -d ${sanitizedDbName} --clean --if-exists ${tempFile}`,
      ];
      break;

    case ServiceId.MongoDB:
      restoreCmd = [
        'sh',
        '-c',
        `mongorestore --username root --password root --authenticationDatabase admin --db ${sanitizedDbName} --archive=${tempFile} --gzip --drop`,
      ];
      break;

    default:
      throw new Error(`Service ${serviceId} does not support database restore operations`);
  }

  const restoreResult = await execCommand(containerId, restoreCmd);

  // Clean up temp file
  await execCommand(containerId, ['rm', '-f', tempFile]);

  if (restoreResult.exitCode !== 0) {
    throw new Error(`Failed to restore database: ${restoreResult.stderr || 'Unknown error'}`);
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
