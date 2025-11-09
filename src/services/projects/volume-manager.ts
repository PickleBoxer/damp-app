/**
 * Volume manager for project Docker volumes
 * Handles volume creation, deletion, and file copying
 */

import Docker from 'dockerode';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { VolumeCopyProgress } from '../../types/project';

const docker = new Docker();

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
   * Copy local folder contents to Docker volume
   * Uses a temporary Alpine container to mount the volume and copy files
   */
  async copyToVolume(
    sourcePath: string,
    volumeName: string,
    targetSubPath: string,
    onProgress?: (progress: VolumeCopyProgress) => void
  ): Promise<void> {
    try {
      // Ensure volume exists
      await this.createVolume(volumeName);

      // Get list of all files to copy
      const files = await this.getAllFiles(sourcePath);
      const totalFiles = files.length;

      console.log(`Copying ${totalFiles} files from ${sourcePath} to volume ${volumeName}...`);

      // Create a temporary Alpine container with the volume mounted
      const container = await docker.createContainer({
        Image: 'alpine:latest',
        Cmd: ['sleep', '3600'], // Keep container alive
        HostConfig: {
          Binds: [`${volumeName}:/workspace`],
        },
      });

      try {
        await container.start();

        // Copy files one by one (or in batches)
        for (const [index, file] of files.entries()) {
          const relativePath = path.relative(sourcePath, file);
          const targetPath = path.join('/workspace', targetSubPath, relativePath);
          const targetDir = path.dirname(targetPath);

          // Create directory structure in container
          await container.exec({
            Cmd: ['mkdir', '-p', targetDir],
            AttachStdout: true,
            AttachStderr: true,
          }).then(exec => exec.start({ Detach: false }));

          // Read file content
          const content = await fs.readFile(file);

          // Copy file to container using putArchive (tar format)
          await this.copyFileToContainer(container, content, targetPath);

          // Report progress
          if (onProgress) {
            onProgress({
              currentFile: relativePath,
              filesCopied: index + 1,
              totalFiles,
              percentage: Math.round(((index + 1) / totalFiles) * 100),
            });
          }
        }

        console.log(`Successfully copied ${totalFiles} files to volume ${volumeName}`);
      } finally {
        // Clean up: stop and remove temporary container
        await container.stop();
        await container.remove();
      }
    } catch (error) {
      throw new Error(`Failed to copy files to volume: ${error}`);
    }
  }

  /**
   * Get all files recursively from a directory
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        // Skip .git, node_modules, vendor, etc.
        if (
          entry.name === '.git' ||
          entry.name === 'node_modules' ||
          entry.name === 'vendor' ||
          entry.name === '.devcontainer' ||
          entry.name === '.vscode'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * Copy a single file to container using tar archive
   */
  private async copyFileToContainer(
    container: Docker.Container,
    content: Buffer,
    targetPath: string
  ): Promise<void> {
    // Docker putArchive expects a tar stream
    const tar = await import('tar-stream');
    const pack = tar.pack();

    const fileName = path.basename(targetPath);
    const targetDir = path.dirname(targetPath);

    pack.entry({ name: fileName }, content, (err: Error | null | undefined) => {
      if (err) throw err;
      pack.finalize();
    });

    await container.putArchive(pack, { path: targetDir });
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
