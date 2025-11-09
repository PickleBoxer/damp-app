/**
 * Helper functions for service operations in renderer process
 */

/**
 * Download Caddy SSL certificate
 * Opens a save dialog and downloads the certificate to the selected location
 */
export async function downloadCaddyCertificate(): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  try {
    return (await window.services.downloadCaddyCertificate()) as {
      success: boolean;
      path?: string;
      error?: string;
    };
  } catch (error) {
    console.error('Failed to download certificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
