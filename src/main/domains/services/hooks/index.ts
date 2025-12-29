/**
 * Post-install hooks index
 * Exports all service post-install hooks
 */

import type { PostInstallHook, ServiceId } from '@shared/types/service';
import { caddyPostInstallHook } from './caddy-hook';

/**
 * Post-install hooks for services (backend only - not serialized)
 * Maps service ID to post-install function
 */
export const POST_INSTALL_HOOKS: Partial<Record<ServiceId, PostInstallHook>> = {
  caddy: caddyPostInstallHook,
};
