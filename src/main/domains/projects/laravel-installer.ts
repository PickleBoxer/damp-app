/**
 * Laravel installer service
 * Installs Laravel projects to Docker volumes using pickleboxer/laravel-installer
 */

import Docker from 'dockerode';
import type { LaravelInstallerOptions, VolumeCopyProgress } from '@shared/types/project';
import { buildHelperContainerLabels, HELPER_OPERATIONS } from '@shared/constants/labels';
import { createLogger } from '@main/utils/logger';

const docker = new Docker();
const logger = createLogger('LaravelInstaller');
const INSTALLER_IMAGE = 'pickleboxer/laravel-installer:latest';

/**
 * Build Laravel installer command with options
 */
function buildLaravelCommand(projectName: string, options: LaravelInstallerOptions): string[] {
  const flags: string[] = ['new', projectName];

  // Starter kit flags
  if (options.starterKit === 'react') {
    flags.push('--react');
  } else if (options.starterKit === 'vue') {
    flags.push('--vue');
  } else if (options.starterKit === 'livewire') {
    flags.push('--livewire');
  } else if (options.starterKit === 'custom' && options.customStarterKitUrl) {
    flags.push(`--using=${options.customStarterKitUrl}`);
  }

  // Authentication flags
  if (options.authentication === 'workos') {
    flags.push('--workos');
  } else if (options.authentication === 'none') {
    // TODO: when try to install with --no-authentication, it fails with error php version"
    // flags.push('--no-authentication');
  }

  // Volt flag (for Livewire without Volt)
  if (options.starterKit === 'livewire' && !options.useVolt) {
    flags.push('--livewire-class-components');
  }

  // Testing framework
  if (options.testingFramework === 'pest') {
    flags.push('--pest');
  } else if (options.testingFramework === 'phpunit') {
    flags.push('--phpunit');
  }

  // Boost
  if (options.installBoost) {
    flags.push('--boost');
  }

  // Always initialize git
  // flags.push('--git');

  return flags;
}

/**
 * Flatten volume structure by moving all files from projectName subfolder to volume root
 */
async function flattenVolumeStructure(
  volumeName: string,
  projectName: string,
  projectId: string,
  onProgress?: (progress: VolumeCopyProgress) => void
): Promise<void> {
  try {
    logger.info(`Flattening volume structure for ${projectName}...`);
    if (onProgress) {
      onProgress({
        message: 'Moving files to volume root...',
        currentStep: 3,
        totalSteps: 4,
        percentage: 70,
        stage: 'flattening-structure',
      });
    }

    // Create Alpine container to move files from /app/projectName to /app/
    const labels = buildHelperContainerLabels(
      HELPER_OPERATIONS.LARAVEL_FLATTEN,
      volumeName,
      projectId
    );
    const container = await docker.createContainer({
      Image: 'alpine:latest',
      Labels: labels,
      Cmd: [
        'sh',
        '-c',
        // Use safer approach: change to directory and move files
        'cd /app/"$0" && cp -r . /app/ && cd /app && rm -rf "$0" && chown -R 1000:1000 /app',
        projectName, // Passed as $0 argument
      ],
      HostConfig: {
        Binds: [`${volumeName}:/app`],
      },
      WorkingDir: '/app',
      User: '0:0', // Run as root to ensure we can copy, remove, and chown
    });

    try {
      await container.start();
      const result = await container.wait();

      if (result.StatusCode !== 0) {
        const logs = await container.logs({ stdout: true, stderr: true });
        throw new Error(
          `Failed to flatten volume structure (exit code ${result.StatusCode}): ${logs.toString()}`
        );
      }

      logger.info('Successfully moved Laravel files to volume root');
    } finally {
      await container.remove();
    }
  } catch (error) {
    logger.error('Failed to flatten volume structure:', { error });
    throw new Error(`Failed to flatten volume structure: ${error}`);
  }
}

/**
 * Install Laravel to Docker volume
 */
export async function installLaravelToVolume(
  volumeName: string,
  projectName: string,
  projectId: string,
  options: LaravelInstallerOptions,
  onProgress?: (progress: VolumeCopyProgress) => void
): Promise<void> {
  try {
    // Step 1: Pull installer image
    logger.info('Pulling Laravel installer image...');
    if (onProgress) {
      onProgress({
        message: 'Pulling Laravel installer image...',
        currentStep: 1,
        totalSteps: 4,
        percentage: 10,
        stage: 'pulling-installer-image',
      });
    }

    await new Promise<void>((resolve, reject) => {
      docker.pull(INSTALLER_IMAGE, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    // Step 2: Run Laravel installer
    logger.info(`Installing Laravel project: ${projectName}`);
    if (onProgress) {
      onProgress({
        message: `Installing Laravel project...`,
        currentStep: 2,
        totalSteps: 4,
        percentage: 40,
        stage: 'installing-laravel',
      });
    }

    const command = buildLaravelCommand(projectName, options);
    logger.debug('Laravel installer command', { command: command.join(' ') });
    const labels = buildHelperContainerLabels(
      HELPER_OPERATIONS.LARAVEL_INSTALL,
      volumeName,
      projectId
    );
    const container = await docker.createContainer({
      Image: INSTALLER_IMAGE,
      Labels: labels,
      Cmd: command,
      HostConfig: {
        Binds: [`${volumeName}:/app`],
      },
      WorkingDir: '/app',
      User: '0:0', // Run as root to ensure write permissions
    });

    try {
      await container.start();

      // Stream logs to progress callback (demultiplexed)
      if (onProgress) {
        const logStream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
        });

        // Demultiplex Docker stream and send raw output
        docker.modem.demuxStream(
          logStream,
          {
            write: (chunk: Buffer) => {
              const message = chunk.toString('utf8');
              if (message && onProgress) {
                // Send raw Docker output with ANSI codes intact
                const lines = message.split('\n');
                for (const line of lines) {
                  if (line) {
                    onProgress({
                      message: line,
                      currentStep: 2,
                      totalSteps: 4,
                      percentage: 40,
                      stage: 'installing-laravel-output',
                    });
                  }
                }
              }
            },
          } as NodeJS.WritableStream,
          {
            write: (chunk: Buffer) => {
              // stderr output
              const message = chunk.toString('utf8');
              if (message && onProgress) {
                const lines = message.split('\n');
                for (const line of lines) {
                  if (line) {
                    onProgress({
                      message: line,
                      currentStep: 2,
                      totalSteps: 4,
                      percentage: 40,
                      stage: 'installing-laravel-output',
                    });
                  }
                }
              }
            },
          } as NodeJS.WritableStream
        );
      }

      const result = await container.wait();

      if (result.StatusCode !== 0) {
        const logs = await container.logs({ stdout: true, stderr: true });
        throw new Error(
          `Laravel installer failed with exit code ${result.StatusCode}: ${logs.toString()}`
        );
      }

      logger.info('Laravel installation completed');
    } finally {
      await container.remove();
    }

    // Step 3: Flatten volume structure (move files from /app/projectName to /app/)
    await flattenVolumeStructure(volumeName, projectName, projectId, onProgress);

    // Step 4: Installation complete (files installed to volume root)
    if (onProgress) {
      onProgress({
        message: 'Laravel installation complete',
        currentStep: 4,
        totalSteps: 4,
        percentage: 100,
        stage: 'complete',
      });
    }

    logger.info(`Successfully installed Laravel to volume ${volumeName} (flat structure)`);
  } catch (error) {
    logger.error('Failed to install Laravel:', { error });
    throw new Error(`Failed to install Laravel: ${error}`);
  }
}
