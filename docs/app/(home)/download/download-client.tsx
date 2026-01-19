'use client';

import { Download } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface DownloadClientProps {
  readonly version: string;
  readonly releaseDate: string;
  readonly setupUrl: string;
  readonly portableUrl: string;
}

export function DownloadClient({
  version,
  releaseDate,
  setupUrl,
  portableUrl,
}: DownloadClientProps) {
  const hasAutoDownloaded = useRef(false);

  useEffect(() => {
    // Auto-download setup.exe on page load (only once)
    if (!hasAutoDownloaded.current && setupUrl) {
      hasAutoDownloaded.current = true;

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = setupUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [setupUrl]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-fd-secondary/50 border-fd-border mb-8 rounded-lg border p-8">
        <div className="mb-6 text-center">
          <p className="text-fd-muted-foreground mb-2 text-sm">Latest Version</p>
          <p className="text-2xl font-bold">v{version}</p>
        </div>

        <div className="mb-6 text-center">
          <p className="text-fd-muted-foreground">
            Your download should start automatically. If not, click below.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={setupUrl}
            className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Setup.exe
          </a>
          <a
            href={portableUrl}
            className="bg-fd-secondary text-fd-secondary-foreground border-fd-border hover:bg-fd-secondary/80 inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 font-semibold transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Portable ZIP
          </a>
        </div>

        <div className="text-fd-muted-foreground mt-6 text-center text-xs">
          <p>Released: {new Date(releaseDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
