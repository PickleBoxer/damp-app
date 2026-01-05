/**
 * Caddy post-install hook
 * Sets up SSL certificates and syncs existing projects
 */

import type { PostInstallHook, PostInstallHookResult } from '@shared/types/service';
import { setupCaddySSL } from '@main/core/reverse-proxy/caddy-setup';
import { syncProjectsToCaddy } from '@main/core/reverse-proxy/caddy-config';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('CaddyHook');

/**
 * Caddy post-install hook
 * - Sets up SSL certificates
 * - Syncs existing projects to Caddy
 */
export const caddyPostInstallHook: PostInstallHook = async (): Promise<PostInstallHookResult> => {
  const result = await setupCaddySSL();

  // Sync existing projects to Caddy (dynamically import to avoid circular dependency)
  const { projectStorage } = await import('@main/core/storage/project-storage');
  const projects = projectStorage.getAllProjects();
  const syncResult = await syncProjectsToCaddy(projects);

  if (syncResult.success) {
    logger.info('[Caddy Post-Install] Projects synchronized to reverse proxy');
  } else {
    logger.warn('[Caddy Post-Install] Failed to sync projects:', { error: syncResult.error });
  }

  return {
    success: result.success,
    message: result.message,
    data: {
      certInstalled: result.certInstalled,
    },
  };
};
