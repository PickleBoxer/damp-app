import { Download } from 'lucide-react';

/**
 * Static Download Component
 *
 * IMPORTANT: When updating to a new DAMP version:
 * 1. Update CURRENT_VERSION below
 * 2. Update SETUP_DOWNLOAD_URL with the new Setup.exe link
 * 3. Update PORTABLE_DOWNLOAD_URL with the new Portable ZIP link
 * 4. Update RELEASE_DATE with the release date
 */

// ========================================
// UPDATE THESE VALUES FOR EACH NEW RELEASE
// ========================================
const CURRENT_VERSION = '0.2.0';
const RELEASE_DATE = '2026-01-14';
const SETUP_DOWNLOAD_URL = 'https://releases.getdamp.app/win32/x64/damp-0.2.0 Setup.exe';
const PORTABLE_DOWNLOAD_URL = 'https://releases.getdamp.app/win32/x64/damp-win32-x64-0.2.0.zip';
// ========================================

export function DownloadClient() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-fd-secondary/50 border-fd-border mb-8 rounded-lg border p-8">
        <div className="mb-6 text-center">
          <p className="text-fd-muted-foreground mb-2 text-sm">Latest Version</p>
          <p className="text-2xl font-bold">v{CURRENT_VERSION}</p>
        </div>

        <div className="mb-6 text-center">
          <p className="text-fd-muted-foreground">Choose your preferred download option below.</p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={SETUP_DOWNLOAD_URL}
            className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Setup.exe
          </a>
          <a
            href={PORTABLE_DOWNLOAD_URL}
            className="bg-fd-secondary text-fd-secondary-foreground border-fd-border hover:bg-fd-secondary/80 inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 font-semibold transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Portable ZIP
          </a>
        </div>

        <div className="text-fd-muted-foreground mt-6 text-center text-xs">
          <p>Released: {new Date(RELEASE_DATE).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
