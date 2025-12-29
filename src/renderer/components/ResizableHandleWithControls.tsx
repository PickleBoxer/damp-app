import { ResizableHandle } from '@renderer/components/ui/resizable';
import { MdRestartAlt } from 'react-icons/md';
import { VscSplitHorizontal } from 'react-icons/vsc';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';

interface ResizableHandleWithControlsProps {
  /** Reset panel sizes to default values */
  onReset: () => void;
  /** Sync current panel sizes to the other page */
  onEqualSplit: () => void;
}

/**
 * A resizable handle with hover-visible control buttons.
 * Includes reset and sync functionality for panel size management.
 */
export function ResizableHandleWithControls({
  onReset,
  onEqualSplit,
}: Readonly<ResizableHandleWithControlsProps>) {
  const buttonClassName =
    'pointer-events-auto flex h-6 w-6 items-center justify-center rounded border border-border bg-background opacity-60 shadow-md transition-all hover:bg-accent hover:text-accent-foreground hover:opacity-100';

  return (
    <ResizableHandle withHandle className="group/handle">
      <div className="pointer-events-none absolute inset-y-0 left-3 z-50 flex flex-col items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover/handle:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onEqualSplit} className={buttonClassName} type="button">
                <VscSplitHorizontal className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sync</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onReset} className={buttonClassName} type="button">
                <MdRestartAlt className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Reset</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </ResizableHandle>
  );
}
