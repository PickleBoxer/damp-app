import { useState } from 'react';
import { Terminal, Info, Settings } from 'lucide-react';
import DockerStatusFooter from '@/components/DockerStatusFooter';
import { openHomeTerminal } from '@/helpers/shell_helpers';
import { toast } from 'sonner';
import { AboutDialog } from '@/components/AboutDialog';
import { Link } from '@tanstack/react-router';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Footer() {
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleOpenTerminal = async () => {
    try {
      const result = await openHomeTerminal();

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
    <footer className="bg-background flex h-5 shrink-0 items-center justify-between border-t text-[11px]">
      <DockerStatusFooter />
      <div className="flex h-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/settings"
              className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors"
              aria-label="Settings"
            >
              <Settings className="size-3" />
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
              <Info className="size-3" />
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
              <Terminal className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Open Terminal</TooltipContent>
        </Tooltip>
      </div>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </footer>
  );
}
