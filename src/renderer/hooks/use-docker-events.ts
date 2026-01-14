/**
 * Subscribes to Docker daemon events and invalidates affected React Query caches.
 * Enables real-time updates for project and service containers.
 * Call once at app root level.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ServiceId } from '@shared/types/service';
import { projectKeys } from '@renderer/projects';
import { servicesKeys } from '@renderer/services';

const dockerEventsApi = (globalThis as unknown as Window).dockerEvents;

/**
 * Subscribes to Docker container events and invalidates affected queries.
 * Call once at app root (__root.tsx).
 *
 * Optimizations:
 * - Per-container granular invalidation (no bulk queries)
 * - Only invalidates port on container start
 * - Skips list invalidations (lists contain static definitions)
 */
export function useDockerEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to Docker container events
    const unsubscribe = dockerEventsApi.onEvent(event => {
      // Log event for debugging
      console.debug('[Docker Event]', event.action, event.containerId, {
        serviceId: event.serviceId,
        projectId: event.projectId,
        resourceType: event.resourceType,
      });

      // Handle project container events (projectId label present)
      if (event.projectId) {
        // Always invalidate detail query (shows both state and health)
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(event.projectId),
          refetchType: 'active',
        });

        // ✅ Granular: Invalidate ONLY this project's container state
        // Remove refetchType to ensure immediate refetch on container state changes
        queryClient.invalidateQueries({
          queryKey: projectKeys.containerState(event.projectId),
        });

        // Handle ngrok tunnel container events (event-driven updates)
        if (event.resourceType === 'ngrok-tunnel') {
          queryClient.invalidateQueries({
            queryKey: ['ngrok', event.projectId],
            refetchType: 'active',
          });
        }
      }

      // Handle service container events (serviceId label present)
      if (event.serviceId) {
        const serviceId = event.serviceId as ServiceId;

        // Always invalidate detail query (shows both state and health)
        queryClient.invalidateQueries({
          queryKey: servicesKeys.detail(serviceId),
          refetchType: 'active',
        });

        // ✅ Granular: Invalidate ONLY this service's container state
        // Remove refetchType to ensure immediate refetch on container state changes
        queryClient.invalidateQueries({
          queryKey: servicesKeys.containerState(serviceId),
        });
      }
    });

    // Subscribe to Docker events connection status changes
    const unsubscribeStatus = dockerEventsApi.onConnectionStatus(status => {
      // Log connection status changes for debugging
      if (status.connected) {
        console.info('[Docker Events] ✓ Connected to Docker events stream');

        // On reconnect, invalidate all project and service queries to refresh UI
        queryClient.invalidateQueries({
          queryKey: ['projects'],
          refetchType: 'active',
        });
        queryClient.invalidateQueries({
          queryKey: ['services'],
          refetchType: 'active',
        });
      } else {
        const errorMsg = status.lastError ? `: ${status.lastError}` : '';
        const attemptMsg =
          status.reconnectAttempts > 0 ? ` (attempt ${status.reconnectAttempts})` : '';
        console.warn(`[Docker Events] ✗ Disconnected${errorMsg}${attemptMsg}`);

        // On disconnect, invalidate all project and service queries to show stale data
        queryClient.invalidateQueries({
          queryKey: ['projects'],
          refetchType: 'active',
        });
        queryClient.invalidateQueries({
          queryKey: ['services'],
          refetchType: 'active',
        });
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, [queryClient]);
}
