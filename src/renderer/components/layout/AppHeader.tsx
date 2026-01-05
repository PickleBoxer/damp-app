import { isMacOS } from '@shared/utils/platform';
import { Box } from 'lucide-react';
import { QuickSearch } from '../QuickSearch';

export default function AppHeader() {
  return (
    <div className="bg-background relative h-[35px] w-full shrink-0 border-b">
      {/* Draggable layer for empty spaces */}
      <div className="draglayer absolute inset-0" />

      <div className="relative z-10 flex h-full items-center justify-center">
        {/* Left section - App icon (draggable) */}
        {!isMacOS() && (
          <div className="bg-primary text-primary-foreground absolute left-0 ml-2 flex aspect-square items-center justify-center rounded-[5px] p-1">
            <Box className="h-4 w-4" />
          </div>
        )}

        {/* Center section - Search on Windows/Linux, Title on macOS */}
        {!isMacOS() ? (
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <QuickSearch />
          </div>
        ) : (
          <div className="text-sm font-medium">DAMP</div>
        )}

        {/* Right section - Window controls (Windows/Linux only) */}
        {!isMacOS() && (
          <div className="absolute right-0">
            <WindowButtons />
          </div>
        )}
      </div>
    </div>
  );
}

function WindowButtons() {
  return (
    <div className="ml-auto flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        type="button"
        className="flex h-[34px] w-[46px] items-center justify-center transition-colors hover:bg-white/10 dark:hover:bg-white/10"
        onClick={() => window.electronWindow.minimize()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect fill="currentColor" width="10" height="1" y="5" />
        </svg>
      </button>
      <button
        type="button"
        className="flex h-[34px] w-[46px] items-center justify-center transition-colors hover:bg-white/10 dark:hover:bg-white/10"
        onClick={() => window.electronWindow.maximize()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect width="9" height="9" x="0.5" y="0.5" fill="none" stroke="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="flex h-[34px] w-[46px] items-center justify-center transition-colors hover:bg-[#E81123] hover:text-white"
        onClick={() => window.electronWindow.close()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            fill="currentColor"
            d="M 0.7,0 L 10,9.3 M 10,0.7 L 0.7,10"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      </button>
    </div>
  );
}
