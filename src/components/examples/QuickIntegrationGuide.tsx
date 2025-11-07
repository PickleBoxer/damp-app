/**
 * Quick Integration Guide for Health Status Display
 *
 * Follow these steps to add health status to your existing service UI
 */

// ============================================================================
// STEP 1: Import the HealthBadge component
// ============================================================================

import { HealthBadge } from '@/components/HealthBadge';
import type { ServiceInfo } from '@/types/service';

// ============================================================================
// STEP 2: Access health status from service state
// ============================================================================

function YourServiceComponent({ service }: { service: ServiceInfo }) {
  // Extract health status
  const healthStatus = service.state.container_status?.health_status;

  // The healthStatus value will be one of:
  // - 'healthy'   → Green badge with checkmark
  // - 'unhealthy' → Red badge with X
  // - 'starting'  → Yellow badge with spinning arrow
  // - 'none'      → No badge shown (no health check configured)
  // - undefined   → No badge shown (container doesn't exist)

  return (
    <div>
      {/* Your existing service UI */}
      <h3>{service.definition.display_name}</h3>

      {/* Add this line to show health badge */}
      <HealthBadge status={healthStatus} />
    </div>
  );
}

// ============================================================================
// STEP 3: Optional - Add to existing status display
// ============================================================================

function ServiceWithCombinedStatus({ service }: { service: ServiceInfo }) {
  const containerStatus = service.state.container_status;

  return (
    <div className="flex items-center gap-2">
      {/* Running/Stopped indicator */}
      {containerStatus?.running ? (
        <span className="text-green-600">● Running</span>
      ) : (
        <span className="text-gray-600">○ Stopped</span>
      )}

      {/* Health status badge - only shows for running containers with health checks */}
      {containerStatus?.running && <HealthBadge status={containerStatus.health_status} />}
    </div>
  );
}

// ============================================================================
// STEP 4: Using compact icon version (for tables/tight spaces)
// ============================================================================

import { HealthIcon } from '@/components/HealthBadge';

function CompactServiceRow({ service }: { service: ServiceInfo }) {
  return (
    <div className="flex items-center gap-2">
      <span>{service.definition.display_name}</span>
      <HealthIcon status={service.state.container_status?.health_status} />
    </div>
  );
}

// ============================================================================
// STEP 5: Conditional rendering based on health
// ============================================================================

function ServiceWithHealthActions({ service }: { service: ServiceInfo }) {
  const healthStatus = service.state.container_status?.health_status;

  return (
    <div>
      <HealthBadge status={healthStatus} />

      {/* Show warning if unhealthy */}
      {healthStatus === 'unhealthy' && (
        <div className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">
          ⚠️ Service is unhealthy. Consider restarting.
        </div>
      )}

      {/* Show info if starting */}
      {healthStatus === 'starting' && (
        <div className="mt-2 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
          ℹ️ Service is initializing. Please wait...
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WHERE TO ADD THIS IN YOUR APP
// ============================================================================

/**
 * Recommended locations to display health status:
 *
 * 1. Services list page (src/routes/services.tsx)
 *    - Show badge next to each service
 *
 * 2. Service detail cards
 *    - Show full badge with status
 *
 * 3. Service management controls
 *    - Show health before start/stop actions
 *
 * 4. Dashboard/overview
 *    - Show compact icons for all services
 *
 * 5. Sidebar service indicators
 *    - Show health icon for quick status
 */

// ============================================================================
// STYLING CUSTOMIZATION
// ============================================================================

function CustomStyledHealth({ service }: { service: ServiceInfo }) {
  const healthStatus = service.state.container_status?.health_status;

  return (
    <div>
      {/* Custom size */}
      <HealthBadge status={healthStatus} className="px-3 py-2 text-lg" />

      {/* Remove border */}
      <HealthBadge status={healthStatus} className="border-0" />

      {/* Custom positioning */}
      <div className="relative">
        <HealthBadge status={healthStatus} className="absolute top-2 right-2" />
      </div>
    </div>
  );
}

export {};
