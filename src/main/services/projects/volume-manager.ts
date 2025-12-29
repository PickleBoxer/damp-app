/**
 * Volume manager for project Docker volumes
 * Handles volume creation, deletion, and file copying
 */

import Docker from 'dockerode';
import { Writable } from 'node:stream';
import type { VolumeCopyProgress } from '@shared/types/project';
import {
  buildProjectVolumeLabels,
  buildHelperContainerLabels,
  HELPER_OPERATIONS,
} from '@shared/constants/labels';
import { createLogger } from '@main/utils/logger';
import { ensureRsyncImage, RSYNC_IMAGE_NAME } from './rsync-image-builder';

const docker = new Docker();
const logger = createLogger('VolumeManager');

/**
 * Copy operation progress stages
 */
export const COPY_STAGES = {
  STARTING: {
    message: 'Starting copy operation...',
    percentage: 0,
    step: 1,
    totalSteps: 3,
  },
  COPYING: {
    message: 'Copying files...',
    percentage: 50,
    step: 2,
    totalSteps: 3,
  },
  COMPLETED: {
    message: 'Copy completed',
    percentage: 100,
    step: 3,
    totalSteps: 3,
  },
} as const;

/**
 * Volume manager class
 */
class VolumeManager {
  /**
   * Create a Docker volume
   */
  async createVolume(volumeName: string, projectId: string): Promise<void> {
    try {
      // Check if volume already exists
      const volumes = await docker.listVolumes({
        filters: { name: [volumeName] },
      });

      if (volumes.Volumes?.some(v => v.Name === volumeName)) {
        logger.info(`Volume ${volumeName} already exists`);
        return;
      }

      const labels = buildProjectVolumeLabels(projectId, volumeName);
      await docker.createVolume({ Name: volumeName, Labels: labels });
      logger.info(`Created volume: ${volumeName}`);
    } catch (error) {
      throw new Error(`Failed to create volume ${volumeName}: ${error}`);
    }
  }

  /**
   * Remove a Docker volume
   */
  async removeVolume(volumeName: string): Promise<void> {
    try {
      const volume = docker.getVolume(volumeName);
      await volume.remove();
      logger.info(`Removed volume: ${volumeName}`);
    } catch (error) {
      // Ignore if volume doesn't exist
      if (
        error instanceof Error &&
        (error.message.includes('no such volume') ||
          (error as { statusCode?: number }).statusCode === 404)
      ) {
        logger.info(`Volume ${volumeName} does not exist, skipping removal`);
      } else if (
        error instanceof Error &&
        (error.message.includes('volume is in use') ||
          (error as { statusCode?: number }).statusCode === 409)
      ) {
        throw new Error(`Cannot remove volume ${volumeName}: volume is in use by a container`);
      } else {
        throw new Error(`Failed to remove volume ${volumeName}: ${error}`);
      }
    }
  }

  /**
   * Check if a volume exists
   */
  async volumeExists(volumeName: string): Promise<boolean> {
    try {
      const volumes = await docker.listVolumes({
        filters: { name: [volumeName] },
      });

      return volumes.Volumes?.some(v => v.Name === volumeName) || false;
    } catch (error) {
      logger.error(`Error checking volume existence: ${error}`);
      return false;
    }
  }

  /**
   * Copy local folder contents to Docker volume root using tar
   * Binds both source folder and volume to an Alpine container and uses tar to copy files
   */
  async copyToVolume(
    sourcePath: string,
    volumeName: string,
    projectId: string,
    onProgress?: (progress: VolumeCopyProgress) => void
  ): Promise<void> {
    // Always copy to volume root (flat structure)

    try {
      // Ensure volume exists
      await this.createVolume(volumeName, projectId);

      // Normalize paths for Docker bind mounts (Windows paths need conversion)
      const normalizedSourcePath = this.normalizePathForDocker(sourcePath);

      // Get appropriate UID:GID for the platform
      const uidGid = await this.getUidGid();

      logger.info(`Copying files from ${sourcePath} to volume ${volumeName}...`);

      // Report initial progress
      if (onProgress) {
        onProgress({
          message: COPY_STAGES.STARTING.message,
          currentStep: COPY_STAGES.STARTING.step,
          totalSteps: COPY_STAGES.STARTING.totalSteps,
          percentage: COPY_STAGES.STARTING.percentage,
        });
      }

      // Create Alpine container with both source folder and volume mounted
      const labels = buildHelperContainerLabels(
        HELPER_OPERATIONS.VOLUME_COPY,
        volumeName,
        projectId
      );
      const container = await docker.createContainer({
        Image: 'alpine:latest',
        Labels: labels,
        Cmd: [
          'sh',
          '-c',
          // Use tar to copy files with exclusions and set proper permissions
          `cd /source && ` +
            `tar --exclude='node_modules' ` +
            `--exclude='vendor' ` +
            //`--exclude='.git' ` +
            //`--exclude='.devcontainer' ` +
            //`--exclude='.vscode' ` +
            `-cf - . | ` +
            `tar -xf - -C /volume && ` +
            `chown -R ${uidGid} /volume`,
        ],
        HostConfig: {
          Binds: [
            `${normalizedSourcePath}:/source:ro`, // Source as read-only
            `${volumeName}:/volume`, // Volume as read-write
          ],
        },
        User: '0:0', // Run as root to ensure we can set ownership
      });

      try {
        // Start container and wait for it to complete
        await container.start();

        // Report mid progress
        if (onProgress) {
          onProgress({
            message: COPY_STAGES.COPYING.message,
            currentStep: COPY_STAGES.COPYING.step,
            totalSteps: COPY_STAGES.COPYING.totalSteps,
            percentage: COPY_STAGES.COPYING.percentage,
          });
        }

        // Use Promise.race with a timeout
        const waitWithTimeout = Promise.race([
          container.wait(),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error('Copy operation timed out')), 300000) // 5 minutes
          ),
        ]);

        await waitWithTimeout;

        // Check exit code
        const inspectData = await container.inspect();
        const exitCode = inspectData.State.ExitCode;

        if (exitCode !== 0) {
          // Get logs for error details
          const logs = await container.logs({
            stdout: true,
            stderr: true,
          });
          const logStr = logs.toString('utf-8').trim();
          throw new Error(
            `Copy operation failed with exit code ${exitCode}${logStr ? ': ' + logStr : ''}`
          );
        }

        logger.info(`Successfully copied files to volume ${volumeName}`);

        // Report completion
        if (onProgress) {
          onProgress({
            message: COPY_STAGES.COMPLETED.message,
            currentStep: COPY_STAGES.COMPLETED.step,
            totalSteps: COPY_STAGES.COMPLETED.totalSteps,
            percentage: COPY_STAGES.COMPLETED.percentage,
          });
        }
      } finally {
        // Clean up: remove temporary container
        await container.remove();
      }
    } catch (error) {
      throw new Error(`Failed to copy files to volume: ${error}`);
    }
  }

  /**
   * Sync files from Docker volume to local folder using rsync
   * Used for volume sync feature - respects include/exclude options
   */
  async syncFromVolume(
    volumeName: string,
    targetPath: string,
    projectId: string,
    options: {
      includeNodeModules?: boolean;
      includeVendor?: boolean;
    } = {},
    onContainerCreated?: (containerId: string) => void,
    onProgress?: (progress: { percentage: number; bytes: number }) => void
  ): Promise<void> {
    try {
      // Ensure rsync image is built
      await ensureRsyncImage();

      // Ensure volume exists
      const exists = await this.volumeExists(volumeName);
      if (!exists) {
        throw new Error(`Volume ${volumeName} does not exist`);
      }

      // Normalize paths for Docker bind mounts
      const normalizedTargetPath = this.normalizePathForDocker(targetPath);

      logger.info(`Syncing files from volume ${volumeName} to ${targetPath}...`);

      // Build exclusion list based on user options
      const exclusions: string[] = [];
      if (!options.includeNodeModules) {
        exclusions.push('--exclude=node_modules');
      }
      if (!options.includeVendor) {
        exclusions.push('--exclude=vendor');
      }

      // Create Alpine container with rsync (using cached image)
      const labels = buildHelperContainerLabels(
        HELPER_OPERATIONS.VOLUME_SYNC_FROM,
        volumeName,
        projectId
      );
      const container = await docker.createContainer({
        Image: RSYNC_IMAGE_NAME,
        Labels: labels,
        Cmd: [
          'sh',
          '-c',
          // Use rsync with compression and progress reporting
          `rsync -az --info=progress2 --no-perms --no-owner --no-group --chmod=ugo=rwX ${exclusions.join(' ')} /volume/ /target/`,
        ],
        HostConfig: {
          Binds: [
            `${volumeName}:/volume:ro`, // Volume as read-only
            `${normalizedTargetPath}:/target`, // Target as read-write
          ],
        },
        User: '0:0', // Run as root to ensure we can write to target
      });

      try {
        // Start container and wait for it to complete
        await container.start();

        // Notify listener of container ID for cancellation support
        if (onContainerCreated) {
          onContainerCreated(container.id);
        }

        // Attach to container logs for progress monitoring
        if (onProgress) {
          const logStream = await container.attach({
            stream: true,
            stdout: true,
            stderr: true,
          });

          const stdoutStream = new Writable({
            write: (chunk: Buffer, _encoding, callback) => {
              const line = chunk.toString('utf-8');
              const progress = this.parseRsyncProgress(line);
              if (progress) {
                onProgress(progress);
              }
              callback();
            },
          });

          const stderrStream = new Writable({
            write: (_chunk: Buffer, _encoding, callback) => {
              callback();
            },
          });

          docker.modem.demuxStream(logStream, stdoutStream, stderrStream);
        }

        // Wait for completion with reasonable timeout (30 minutes for large projects)
        const waitWithTimeout = Promise.race([
          container.wait(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Sync from volume timed out after 30 minutes')),
              1800000
            )
          ),
        ]);
        await waitWithTimeout;

        // Check exit code
        const inspectData = await container.inspect();
        const exitCode = inspectData.State.ExitCode;

        if (exitCode !== 0) {
          // Get logs for error details
          const logs = await container.logs({
            stdout: true,
            stderr: true,
          });
          const logStr = logs.toString('utf-8').trim();
          throw new Error(
            `Sync operation failed with exit code ${exitCode}${logStr ? ': ' + logStr : ''}`
          );
        }

        logger.info(`Successfully synced files from volume ${volumeName} to ${targetPath}`);
      } finally {
        // Clean up: remove temporary container
        await container.remove();
      }
    } catch (error) {
      throw new Error(`Failed to sync files from volume: ${error}`);
    }
  }

  /**
   * Sync files from local folder to Docker volume using rsync
   * Used for volume sync feature - respects include/exclude options
   * Different from copyToVolume() which uses tar for initial project creation
   */
  async syncToVolume(
    sourcePath: string,
    volumeName: string,
    projectId: string,
    options: {
      includeNodeModules?: boolean;
      includeVendor?: boolean;
    } = {},
    onContainerCreated?: (containerId: string) => void,
    onProgress?: (progress: { percentage: number; bytes: number }) => void
  ): Promise<void> {
    try {
      // Ensure rsync image is built
      await ensureRsyncImage();

      // Ensure volume exists
      await this.createVolume(volumeName, projectId);

      // Normalize paths for Docker bind mounts
      const normalizedSourcePath = this.normalizePathForDocker(sourcePath);
      // Build exclusion list based on user options
      const exclusions: string[] = [];
      if (!options.includeNodeModules) {
        exclusions.push('--exclude=node_modules');
      }
      if (!options.includeVendor) {
        exclusions.push('--exclude=vendor');
      }

      // Get appropriate UID:GID for the platform
      const uidGid = await this.getUidGid();

      // Create Alpine container with rsync (using cached image)
      const labels = buildHelperContainerLabels(
        HELPER_OPERATIONS.VOLUME_SYNC_TO,
        volumeName,
        projectId
      );
      const container = await docker.createContainer({
        Image: RSYNC_IMAGE_NAME,
        Labels: labels,
        Cmd: [
          'sh',
          '-c',
          // Use rsync with compression and progress, then fix ownership to container user
          `rsync -az --info=progress2 ${exclusions.join(' ')} /source/ /volume/ && ` +
            `chown -R ${uidGid} /volume`,
        ],
        HostConfig: {
          Binds: [
            `${normalizedSourcePath}:/source:ro`, // Source as read-only
            `${volumeName}:/volume`, // Volume as read-write
          ],
        },
        User: '0:0', // Run as root to ensure we can write to volume
      });

      try {
        // Start container and wait for it to complete
        await container.start();

        // Notify listener of container ID for cancellation support
        if (onContainerCreated) {
          onContainerCreated(container.id);
        }

        // Attach to container logs for progress monitoring
        if (onProgress) {
          const logStream = await container.attach({
            stream: true,
            stdout: true,
            stderr: true,
          });

          const stdoutStream = new Writable({
            write: (chunk: Buffer, _encoding, callback) => {
              const line = chunk.toString('utf-8');
              const progress = this.parseRsyncProgress(line);
              if (progress) {
                onProgress(progress);
              }
              callback();
            },
          });

          const stderrStream = new Writable({
            write: (_chunk: Buffer, _encoding, callback) => {
              callback();
            },
          });

          docker.modem.demuxStream(logStream, stdoutStream, stderrStream);
        }

        // Wait for completion with reasonable timeout (30 minutes for large projects)
        const waitWithTimeout = Promise.race([
          container.wait(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Sync to volume timed out after 30 minutes')),
              1800000
            )
          ),
        ]);
        await waitWithTimeout;

        // Check exit code
        const inspectData = await container.inspect();
        const exitCode = inspectData.State.ExitCode;

        if (exitCode !== 0) {
          // Get logs for error details
          const logs = await container.logs({
            stdout: true,
            stderr: true,
          });
          const logStr = logs.toString('utf-8').trim();
          throw new Error(
            `Sync operation failed with exit code ${exitCode}${logStr ? ': ' + logStr : ''}`
          );
        }

        logger.info(`Successfully synced files to volume ${volumeName}`);
      } finally {
        // Clean up: remove temporary container
        await container.remove();
      }
    } catch (error) {
      throw new Error(`Failed to sync files to volume: ${error}`);
    }
  }

  /**
   * Parse rsync progress output
   * Format: "      1,234,567  45%  123.45kB/s    0:00:12"
   */
  private parseRsyncProgress(line: string): { percentage: number; bytes: number } | null {
    // Match rsync --info=progress2 output format
    const regex = /^\s+([\d,]+)\s+(\d+)%/;
    const match = regex.exec(line);
    if (match) {
      return {
        bytes: Number.parseInt(match[1].replaceAll(',', ''), 10),
        percentage: Number.parseInt(match[2], 10),
      };
    }
    return null;
  }

  /**
   * Normalize path for Docker bind mounts
   * Converts Windows paths to format Docker expects
   */
  private normalizePathForDocker(localPath: string): string {
    // On Windows, convert C:\path\to\folder to /c/path/to/folder format
    if (process.platform === 'win32') {
      return localPath
        .replaceAll('\\', '/')
        .replace(/^([A-Z]):/, (match, drive) => `/${drive.toLowerCase()}`);
    }
    return localPath;
  }

  /**
   * Get appropriate UID:GID for the platform
   * Windows: Use 1000:1000 (standard Docker Desktop behavior)
   * macOS/Linux: Detect current user's UID:GID
   */
  private async getUidGid(): Promise<string> {
    // On Windows, always use 1000:1000 (Docker Desktop default)
    if (process.platform === 'win32') {
      return '1000:1000';
    }

    // On macOS/Linux, detect current user's UID and GID
    try {
      const { execSync } = await import('node:child_process');
      const uid = execSync('id -u', { encoding: 'utf-8' }).trim();
      const gid = execSync('id -g', { encoding: 'utf-8' }).trim();
      return `${uid}:${gid}`;
    } catch (error) {
      logger.warn('Failed to detect UID:GID, falling back to 1000:1000', { error });
      return '1000:1000';
    }
  }

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const volumeManager = new VolumeManager();
