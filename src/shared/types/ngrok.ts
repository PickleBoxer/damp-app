/**
 * Shared ngrok types for both main and renderer processes
 */

export type NgrokStatus = 'starting' | 'active' | 'stopped' | 'error';

export interface NgrokStatusData {
  status: NgrokStatus;
  containerId?: string;
  error?: string;
  publicUrl?: string;
}
