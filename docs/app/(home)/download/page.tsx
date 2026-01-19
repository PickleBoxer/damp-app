import { releaseSchema, type ReleaseData } from '@/types/release';
import Link from 'next/link';
import { DownloadClient } from './download-client';

export const metadata = {
  title: 'Download DAMP',
  description: 'Download DAMP - Docker Apache MySQL PHP development environment for Windows',
};

// Fallback data if API fetch fails
const FALLBACK_DATA: ReleaseData = {
  version: '0.2.0',
  date: '2026-01-14',
  setupUrl:
    'https://github.com/PickleBoxer/damp-app/releases/download/v0.2.0/damp-0.2.0%20Setup.exe',
  portableUrl:
    'https://github.com/PickleBoxer/damp-app/releases/download/v0.2.0/damp-win32-x64-0.2.0.zip',
};

async function getLatestRelease(): Promise<ReleaseData | null> {
  try {
    const res = await fetch('https://api.github.com/repos/PickleBoxer/damp-app/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: false }, // Static generation
    });

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const validated = releaseSchema.parse(data);

    // Extract Windows assets
    const setupAsset = validated.assets.find(a => a.name.endsWith('Setup.exe'));
    const portableAsset = validated.assets.find(
      a => a.name.endsWith('.zip') && a.name.includes('win32-x64')
    );

    console.log('Fetched latest release:', validated.tag_name);
    return {
      version: validated.tag_name.replace(/^v/, ''),
      date: validated.published_at.split('T')[0],
      setupUrl: setupAsset?.browser_download_url || FALLBACK_DATA.setupUrl,
      portableUrl: portableAsset?.browser_download_url || FALLBACK_DATA.portableUrl,
    };
  } catch (error) {
    console.error('Failed to fetch latest release:', error);
    return null;
  }
}

export default async function DownloadPage() {
  const release = await getLatestRelease();
  const data = release || FALLBACK_DATA;

  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Download DAMP</h1>
        <p className="text-fd-muted-foreground text-lg">
          Get the latest version of DAMP for Windows
        </p>
      </div>

      <DownloadClient
        version={data.version}
        releaseDate={data.date}
        setupUrl={data.setupUrl}
        portableUrl={data.portableUrl}
      />

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="mb-6 text-center text-2xl font-semibold">Installation Steps</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
              1
            </div>
            <div className="flex-1 pt-1">
              <h3 className="mb-1 font-semibold">Open the DAMP installer</h3>
              <p className="text-fd-muted-foreground">
                Find the downloaded file in your Downloads folder and run it.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
              2
            </div>
            <div className="flex-1 pt-1">
              <h3 className="mb-1 font-semibold">Approve Windows security prompt</h3>
              <p className="text-fd-muted-foreground">
                Windows may show a security warning because the app is not code-signed. Click
                &quot;More info&quot; then &quot;Run anyway&quot; to continue.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
              3
            </div>
            <div className="flex-1 pt-1">
              <h3 className="mb-1 font-semibold">Complete the installation process</h3>
              <p className="text-fd-muted-foreground">
                Follow the installation wizard to install DAMP on your system.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
              4
            </div>
            <div className="flex-1 pt-1">
              <h3 className="mb-1 font-semibold">Launch DAMP</h3>
              <p className="text-fd-muted-foreground">
                Once installed, launch DAMP and start building your projects!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-fd-muted-foreground mt-12 text-center text-sm">
        <p>
          If you have issues with the download, please check your browser settings or try again.
        </p>
        <p className="mt-2">
          Need help? Check out our{' '}
          <Link href="/docs" className="text-fd-foreground underline hover:no-underline">
            documentation
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
