/**
 * Subscribes to Docker daemon events and invalidates affected React Query caches.
 * Enables real-time updates for project and service containers.
 * Call once at app root level.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Project } from '@shared/types/project';
import type { ServiceId } from '@shared/types/service';
import { projectKeys } from '@renderer/queries/projects-queries';
import { servicesKeys } from '@renderer/queries/services-queries';

const dockerEventsApi = (globalThis as unknown as Window).dockerEvents;

/**
 * Subscribes to Docker container events and invalidates affected queries.
 * Call once at app root (__root.tsx).
 *
 * Optimizations:
 * - Debounces bulk status invalidations (300ms window)
 * - Event type discrimination (health_status vs state changes)
 * - Skips list invalidations (lists contain static definitions)
 * - Only invalidates port on container start
 */
export function useDockerEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Debounce timers for bulk status queries
    const debounceTimers: Record<string, NodeJS.Timeout> = {};

    const scheduleInvalidation = (key: string, invalidateFn: () => void) => {
      // Clear existing timer for this query key
      if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key]);
      }

      // Schedule invalidation after 300ms of quiet
      debounceTimers[key] = setTimeout(() => {
        invalidateFn();
        delete debounceTimers[key];
      }, 300);
    };

    // Subscribe to Docker container events
    const unsubscribe = dockerEventsApi.onEvent(event => {
      // Log event for debugging
      console.debug('[Docker Event]', event.action, event.containerName);

      // Categorize event types
      const isStateChange = ['start', 'stop', 'die', 'kill', 'restart'].includes(event.action);

      // Get cached projects to map containerName → projectId
      const cachedProjects = queryClient.getQueryData<Project[]>(projectKeys.lists());

      // Check if this event is for a project container
      const affectedProject = cachedProjects?.find(
        project => project.containerName === event.containerName
      );

      if (affectedProject) {
        // Always invalidate detail query (shows both state and health)
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(affectedProject.id),
          refetchType: 'active',
        });

        // Only invalidate port on container start (expensive ~2s operation)
        if (event.action === 'start') {
          queryClient.invalidateQueries({
            queryKey: projectKeys.port(affectedProject.id),
            refetchType: 'active',
          });
        }

        // Debounce bulk status invalidations for state changes only
        if (isStateChange) {
          scheduleInvalidation('projects:status', () => {
            queryClient.invalidateQueries({
              queryKey: projectKeys.status(),
              refetchType: 'active',
            });
          });
        }
      }

      // Check if this event is for a service container (damp-* prefix)
      const isServiceContainer = event.containerName.startsWith('damp-');

      if (isServiceContainer) {
        // Extract service ID from container name (e.g., "damp-mysql" → "mysql")
        const serviceId = event.containerName.replace('damp-', '');

        // Always invalidate detail query (shows both state and health)
        queryClient.invalidateQueries({
          queryKey: servicesKeys.detail(serviceId as ServiceId),
          refetchType: 'active',
        });

        // Debounce bulk status invalidations for state changes only
        if (isStateChange) {
          scheduleInvalidation('services:status', () => {
            queryClient.invalidateQueries({
              queryKey: servicesKeys.status(),
              refetchType: 'active',
            });
          });
        }
      }

      // Note: Lists (projectKeys.lists(), servicesKeys.list()) are NOT invalidated
      // Lists contain static definitions that only change on create/update/delete mutations
      // Docker events only affect runtime state, not definitions
    });

    // Subscribe to Docker events connection status changes
    const unsubscribeStatus = dockerEventsApi.onConnectionStatus(status => {
      // Log connection status changes for debugging
      if (status.connected) {
        console.info('[Docker Events] ✓ Connected to Docker events stream');
      } else {
        const errorMsg = status.lastError ? `: ${status.lastError}` : '';
        const attemptMsg =
          status.reconnectAttempts > 0 ? ` (attempt ${status.reconnectAttempts})` : '';
        console.warn(`[Docker Events] ✗ Disconnected${errorMsg}${attemptMsg}`);
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribe();
      unsubscribeStatus();
      // Clear all pending debounce timers
      Object.values(debounceTimers).forEach(clearTimeout);
    };
  }, [queryClient]);
}
