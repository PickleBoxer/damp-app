/**
 * Build and cache Alpine image with rsync pre-installed
 * Eliminates 2-5 second overhead of installing rsync on every sync
 */

import Docker from 'dockerode';
import { createLogger } from '@main/utils/logger';
import tar from 'tar-stream';

const docker = new Docker();
const logger = createLogger('RsyncImageBuilder');

export const RSYNC_IMAGE_NAME = 'damp-rsync-alpine:latest';

/**
 * Ensure rsync-enabled Alpine image exists, build if needed
 * Called before each sync operation (lazy initialization)
 */
export async function ensureRsyncImage(): Promise<void> {
  try {
    // Check if image already exists
    const images = await docker.listImages({
      filters: { reference: [RSYNC_IMAGE_NAME] },
    });

    if (images.length > 0) {
      logger.debug('Rsync image already exists');
      return;
    }

    logger.info('Building rsync image (one-time setup)...');

    // Create inline Dockerfile content
    const dockerfileContent = `FROM alpine:latest
RUN apk add --no-cache rsync
CMD ["/bin/sh"]
`;

    // Create tar stream with Dockerfile
    const pack = tar.pack();
    pack.entry({ name: 'Dockerfile' }, dockerfileContent);
    pack.finalize();

    // Build image from tar stream
    const stream = await docker.buildImage(pack, {
      t: RSYNC_IMAGE_NAME,
    });

    // Wait for build to complete
    await new Promise<void>((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        (err: Error | null) => {
          if (err) {
            logger.error('Failed to build rsync image', { error: err });
            reject(err);
          } else {
            logger.info('Rsync image built successfully');
            resolve();
          }
        },
        (event: { stream?: string; error?: string }) => {
          // Log build progress
          if (event.stream) {
            logger.debug(event.stream.trim());
          }
          if (event.error) {
            logger.error('Build error', { error: event.error });
          }
        }
      );
    });
  } catch (error) {
    // Log error but don't throw - sync operations will fall back to alpine:latest with runtime install
    logger.warn('Failed to build rsync image, will use alpine:latest with runtime install', {
      error,
    });
  }
}
