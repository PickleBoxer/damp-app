import { DownloadClient } from './download-client';
import Link from 'next/link';

export const metadata = {
  title: 'Download DAMP',
  description: 'Download DAMP - Docker Apache MySQL PHP development environment for Windows',
};

export default function DownloadPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Download DAMP</h1>
        <p className="text-lg text-fd-muted-foreground">
          Get the latest version of DAMP for Windows
        </p>
      </div>

      <DownloadClient />

      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-center">Installation Steps</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-fd-primary text-fd-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold mb-1">Open the DAMP installer</h3>
              <p className="text-fd-muted-foreground">
                Find the downloaded file in your Downloads folder and run it.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-fd-primary text-fd-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold mb-1">Complete the installation process</h3>
              <p className="text-fd-muted-foreground">
                Follow the installation wizard to install DAMP on your system.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-fd-primary text-fd-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold mb-1">Launch DAMP</h3>
              <p className="text-fd-muted-foreground">
                Once installed, launch DAMP and start building your projects!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-fd-muted-foreground">
        <p>
          If you have issues with the download, please check your browser settings or try again.
        </p>
        <p className="mt-2">
          Need help? Check out our{' '}
          <Link href="/docs" className="text-fd-foreground underline hover:no-underline">
            documentation
          </Link>.
        </p>
      </div>
    </main>
  );
}
