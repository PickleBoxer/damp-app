import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  v8Version: string;
}

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    // Reset state when dialog opens
    setAppInfo(null);
    setError(null);

    window.app
      .getInfo()
      .then(info => {
        if (isMounted) setAppInfo(info);
      })
      .catch(err => {
        console.error('Failed to load app info:', err);
        if (isMounted)
          setError(err instanceof Error ? err.message : 'Failed to load app information');
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Derive loading state: if dialog is open and we have neither data nor error
  const isLoading = open && !appInfo && !error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-6">
        {isLoading && (
          <>
            <DialogTitle className="sr-only">Loading application information</DialogTitle>
            <DialogDescription className="sr-only">
              Please wait while we load the application details
            </DialogDescription>
            <div className="text-muted-foreground text-center text-sm">Loading...</div>
          </>
        )}

        {error && (
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-center text-lg font-medium">Error</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm">
              {error}
            </DialogDescription>
          </DialogHeader>
        )}

        {appInfo && (
          <>
            <DialogHeader className="space-y-4">
              <DialogTitle className="text-center text-lg font-medium">
                {appInfo.appName}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Application version and environment information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-mono">{appInfo.appVersion}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Electron:</span>
                <span className="font-mono">{appInfo.electronVersion}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chromium:</span>
                <span className="font-mono">{appInfo.chromeVersion}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Node.js:</span>
                <span className="font-mono">{appInfo.nodeVersion}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">V8:</span>
                <span className="font-mono">{appInfo.v8Version}</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
