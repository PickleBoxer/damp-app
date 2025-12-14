import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';
import { IconAlertCircle, IconBox } from '@tabler/icons-react';

interface AppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  v8Version: string;
}

function AboutPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(true);

    window.app
      .getInfo()
      .then(setAppInfo)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      navigate({ to: '/' });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent size="sm">
        {!appInfo && !error && (
          <>
            <AlertDialogTitle className="sr-only">Loading</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">Please wait</AlertDialogDescription>
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="bg-muted size-12 animate-pulse rounded-full" />
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          </>
        )}

        {error && (
          <>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <IconAlertCircle />
              </AlertDialogMedia>
              <AlertDialogTitle>Error</AlertDialogTitle>
              <AlertDialogDescription>{error}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}

        {appInfo && (
          <>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-primary/10 text-primary">
                <IconBox />
              </AlertDialogMedia>
              <AlertDialogTitle>{appInfo.appName}</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block text-sm font-medium">Version {appInfo.appVersion}</span>
                <span className="text-muted-foreground mt-2 block space-y-0.5 text-xs">
                  <span className="block">Electron {appInfo.electronVersion}</span>
                  <span className="block">Chromium {appInfo.chromeVersion}</span>
                  <span className="block">Node.js {appInfo.nodeVersion}</span>
                  <span className="block">V8 {appInfo.v8Version}</span>
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const Route = createFileRoute('/about')({
  component: AboutPage,
});
