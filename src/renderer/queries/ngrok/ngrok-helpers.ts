/**
 * Ngrok IPC Helpers - Value-adding functions with runtime validation
 * Contains IPC calls with runtime validation to protect against IPC contract violations
 * These functions add real value through type-safe validation of IPC responses
 */

// Type definitions matching NgrokContext from types.d.ts
type NgrokStartTunnelResult = { success: boolean; data?: unknown; error?: string };
type NgrokStopTunnelResult = { success: boolean; error?: string };
type NgrokStatusResult = {
  success: boolean;
  data?: { status: string; containerId?: string; publicUrl?: string };
  error?: string;
};

/**
 * Runtime validation helpers
 */
function isValidStopResult(value: unknown): value is NgrokStopTunnelResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean' &&
    (!('error' in value) || typeof (value as { error: unknown }).error === 'string')
  );
}

function isValidStartResult(value: unknown): value is NgrokStartTunnelResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean' &&
    (!('error' in value) || typeof (value as { error: unknown }).error === 'string') &&
    (!('data' in value) || typeof (value as { data: unknown }).data === 'object')
  );
}

function isValidStatusResult(value: unknown): value is NgrokStatusResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean' &&
    (!('error' in value) || typeof (value as { error: unknown }).error === 'string')
  );
}

/**
 * Lazy getter for the Ngrok API from the global window object
 * Safely accesses the ngrok property exposed by the preload script
 */
function getNgrokApi(): typeof Window.prototype.ngrok | undefined {
  if (typeof window !== 'undefined' && 'ngrok' in window) {
    return (window as Window).ngrok;
  }
  return undefined;
}

/**
 * Ensures the Ngrok API is available and returns it
 * @throws Error if the API is not available
 */
function ensureNgrokApi(): NonNullable<typeof Window.prototype.ngrok> {
  const api = getNgrokApi();
  if (!api) {
    throw new Error(
      'Ngrok API is not available. Ensure the preload script is properly configured.'
    );
  }
  return api;
}

/**
 * Start ngrok tunnel for a project
 */
export async function startNgrokTunnel(
  projectId: string,
  authToken: string,
  region?: string
): Promise<{
  success: boolean;
  data?: { publicUrl: string; containerId: string };
  error?: string;
}> {
  const api = ensureNgrokApi();
  const result: unknown = await api.startTunnel(projectId, authToken, region);

  if (!isValidStartResult(result)) {
    throw new Error('Invalid response from ngrok startTunnel API');
  }

  // Type narrowing for data structure
  if (result.success && result.data) {
    const data = result.data as { publicUrl?: string; containerId?: string };
    if (typeof data.publicUrl === 'string' && typeof data.containerId === 'string') {
      return {
        success: true,
        data: { publicUrl: data.publicUrl, containerId: data.containerId },
      };
    }
  }

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Stop ngrok tunnel for a project
 */
export async function stopNgrokTunnel(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const api = ensureNgrokApi();
  const result: unknown = await api.stopTunnel(projectId);

  if (!isValidStopResult(result)) {
    throw new Error('Invalid response from ngrok stopTunnel API');
  }

  return result;
}

/**
 * Get ngrok tunnel status for a project
 */
export async function getNgrokStatus(projectId: string): Promise<{
  success: boolean;
  data?: {
    status: 'starting' | 'active' | 'stopped' | 'error';
    containerId?: string;
    error?: string;
    publicUrl?: string;
  };
  error?: string;
}> {
  const api = ensureNgrokApi();
  const result: unknown = await api.getStatus(projectId);

  if (!isValidStatusResult(result)) {
    throw new Error('Invalid response from ngrok getStatus API');
  }

  // Type narrowing for data structure
  if (result.success && result.data) {
    const data = result.data as {
      status?: string;
      containerId?: string;
      error?: string;
      publicUrl?: string;
    };
    const validStatuses = ['starting', 'active', 'stopped', 'error'] as const;
    const status = validStatuses.includes(data.status as any)
      ? (data.status as 'starting' | 'active' | 'stopped' | 'error')
      : undefined;

    if (status) {
      return {
        success: true,
        data: {
          status,
          containerId: data.containerId,
          error: data.error,
          publicUrl: data.publicUrl,
        },
      };
    }
  }

  return {
    success: result.success,
    error: result.error,
  };
}
