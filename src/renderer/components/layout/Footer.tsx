import { useState, useEffect } from 'react';
import { Terminal, Info, Settings } from 'lucide-react';
import DockerStatusFooter from '@renderer/components/DockerStatusFooter';
import { getSettings } from '@renderer/utils/settings';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip';
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

export default function Footer() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!aboutOpen) return;

    window.app
      .getInfo()
      .then(setAppInfo)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [aboutOpen]);

  const handleOpenTerminal = async () => {
    try {
      const settings = await getSettings();
      const result = await window.shell.openHomeTerminal({
        defaultEditor: settings.defaultEditor,
        defaultTerminal: settings.defaultTerminal,
      });

      if (!result.success) {
        toast.error('Failed to open terminal', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Failed to open terminal', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <footer className="bg-background flex h-6 w-full shrink-0 items-center justify-between border-t text-xs">
      <DockerStatusFooter />
      <div className="flex h-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/settings"
              className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">Settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setAboutOpen(true)}
              className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors"
              aria-label="About"
            >
              <Info className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">About</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenTerminal}
              className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors"
              aria-label="Open Terminal"
            >
              <Terminal className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Open Terminal</TooltipContent>
        </Tooltip>
      </div>
      <AlertDialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                error
                  ? 'bg-destructive/10 text-destructive'
                  : appInfo
                    ? 'bg-primary/10 text-primary'
                    : ''
              }
            >
              {error ? <IconAlertCircle /> : appInfo ? <IconBox /> : null}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {error ? 'Error' : appInfo ? appInfo.appName : 'Loading'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!appInfo && !error && (
                <span className="flex flex-col items-center gap-3 py-4">
                  <span className="bg-muted size-12 animate-pulse rounded-full" />
                  <span className="text-muted-foreground text-sm">Loading...</span>
                </span>
              )}

              {error && <span>{error}</span>}

              {appInfo && (
                <>
                  <span className="block text-sm font-medium">Version {appInfo.appVersion}</span>
                  <span className="text-muted-foreground mt-2 block space-y-0.5 text-xs">
                    <span className="block">Electron {appInfo.electronVersion}</span>
                    <span className="block">Chromium {appInfo.chromeVersion}</span>
                    <span className="block">Node.js {appInfo.nodeVersion}</span>
                    <span className="block">V8 {appInfo.v8Version}</span>
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(error || appInfo) && (
            <AlertDialogFooter className="group-data-[size=sm]/alert-dialog-content:grid-cols-1">
              <AlertDialogCancel className="w-full">Close</AlertDialogCancel>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </footer>
  );
}
