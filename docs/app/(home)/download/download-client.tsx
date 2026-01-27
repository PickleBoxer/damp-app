'use client';

import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DownloadClientProps {
  readonly version: string;
  readonly releaseDate: string;
  readonly setupUrl: string;
  readonly portableUrl: string;
}

interface ReleaseData {
  version: string;
  releaseDate: string;
  setupUrl: string;
  portableUrl: string;
}

export function DownloadClient({
  version: fallbackVersion,
  releaseDate: fallbackReleaseDate,
  setupUrl: fallbackSetupUrl,
  portableUrl: fallbackPortableUrl,
}: DownloadClientProps) {
  const hasAutoDownloaded = useRef(false);
  const [release, setRelease] = useState<ReleaseData>({
    version: fallbackVersion,
    releaseDate: fallbackReleaseDate,
    setupUrl: fallbackSetupUrl,
    portableUrl: fallbackPortableUrl,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch latest release from GitHub API on client-side
  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        const res = await fetch(
          'https://api.github.com/repos/PickleBoxer/damp-app/releases/latest'
        );
        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const setupAsset = data.assets.find((a: { name: string }) => a.name.endsWith('Setup.exe'));
        const portableAsset = data.assets.find(
          (a: { name: string }) => a.name.endsWith('.zip') && a.name.includes('win32-x64')
        );

        setRelease({
          version: data.tag_name.replace(/^v/, ''),
          releaseDate: data.published_at.split('T')[0],
          setupUrl: setupAsset?.browser_download_url || fallbackSetupUrl,
          portableUrl: portableAsset?.browser_download_url || fallbackPortableUrl,
        });
      } catch (error) {
        console.error('Failed to fetch latest release:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLatestRelease();
  }, [fallbackSetupUrl, fallbackPortableUrl]);

  useEffect(() => {
    // Auto-download setup.exe after data is loaded (only once)
    if (!hasAutoDownloaded.current && !isLoading && release.setupUrl) {
      hasAutoDownloaded.current = true;

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = release.setupUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [isLoading, release.setupUrl]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-fd-secondary/50 border-fd-border mb-8 rounded-lg border p-8">
        <div className="mb-6 text-center">
          <p className="text-fd-muted-foreground mb-2 text-sm">Latest Version</p>
          <p className="text-2xl font-bold">v{release.version}</p>
        </div>

        <div className="mb-6 text-center">
          <p className="text-fd-muted-foreground">
            Your download should start automatically. If not, click below.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={release.setupUrl}
            className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Setup.exe
          </a>
          <a
            href={release.portableUrl}
            className="bg-fd-secondary text-fd-secondary-foreground border-fd-border hover:bg-fd-secondary/80 inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 font-semibold transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Portable ZIP
          </a>
        </div>

        <div className="text-fd-muted-foreground mt-6 text-center text-xs">
          <p>Released: {new Date(release.releaseDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
