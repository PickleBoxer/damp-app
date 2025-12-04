/**
 * Volume manager for project Docker volumes
 * Handles volume creation, deletion, and file copying
 */

import Docker from 'dockerode';
import type { VolumeCopyProgress } from '../../types/project';

const docker = new Docker();

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
  async createVolume(volumeName: string): Promise<void> {
    try {
      // Check if volume already exists
      const volumes = await docker.listVolumes({
        filters: { name: [volumeName] },
      });

      if (volumes.Volumes?.some(v => v.Name === volumeName)) {
        console.log(`Volume ${volumeName} already exists`);
        return;
      }

      await docker.createVolume({ Name: volumeName });
      console.log(`Created volume: ${volumeName}`);
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
      console.log(`Removed volume: ${volumeName}`);
    } catch (error) {
      // Ignore if volume doesn't exist
      if (
        error instanceof Error &&
        (error.message.includes('no such volume') ||
          (error as { statusCode?: number }).statusCode === 404)
      ) {
        console.log(`Volume ${volumeName} does not exist, skipping removal`);
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
      console.error(`Error checking volume existence: ${error}`);
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
    onProgress?: (progress: VolumeCopyProgress) => void
  ): Promise<void> {
    // Always copy to volume root (flat structure)

    try {
      // Ensure volume exists
      await this.createVolume(volumeName);

      // Normalize paths for Docker bind mounts (Windows paths need conversion)
      const normalizedSourcePath = this.normalizePathForDocker(sourcePath);

      // Get appropriate UID:GID for the platform
      const uidGid = await this.getUidGid();

      console.log(`Copying files from ${sourcePath} to volume ${volumeName}...`);

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
      const container = await docker.createContainer({
        Image: 'alpine:latest',
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

        console.log(`Successfully copied files to volume ${volumeName}`);

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
      console.warn('Failed to detect UID:GID, falling back to 1000:1000', error);
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
