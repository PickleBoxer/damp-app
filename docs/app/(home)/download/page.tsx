import { DownloadClient } from './download-client';
import Link from 'next/link';

export const metadata = {
  title: 'Download DAMP',
  description: 'Download DAMP - Docker Apache MySQL PHP development environment for Windows',
};

export default function DownloadPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Download DAMP</h1>
        <p className="text-fd-muted-foreground text-lg">
          Get the latest version of DAMP for Windows
        </p>
      </div>

      <DownloadClient />

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="mb-6 text-center text-2xl font-semibold">Installation Steps</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold">
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
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold">
              2
            </div>
            <div className="flex-1 pt-1">
              <h3 className="mb-1 font-semibold">Complete the installation process</h3>
              <p className="text-fd-muted-foreground">
                Follow the installation wizard to install DAMP on your system.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-fd-primary text-fd-primary-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold">
              3
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
