import { closeWindow, maximizeWindow, minimizeWindow } from '@/helpers/window_helpers';
import { isMacOS } from '@/utils/platform';
import { type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router'; // Add this import

interface DragWindowRegionProps {
  title?: ReactNode;
}

export default function DragWindowRegion({ title }: DragWindowRegionProps) {
  const { location } = useRouterState();
  const routePath = location.pathname;

  return (
    <div className="bg-background sticky top-0 flex h-[calc(var(--sidebar-width-icon)+1px)]! shrink-0 items-center gap-2 border-b px-4">
      <div className="draglayer w-full">
        {title && !isMacOS() && (
          <div className="flex items-center gap-2">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{title}</span>
              <small className="text-muted-foreground truncate text-xs capitalize">
                {routePath === '/' ? 'Dashboard' : routePath.replace('/', '')}
              </small>
            </div>
          </div>
        )}
        {isMacOS() && (
          <div className="flex flex-1 p-2">
            {/* Maintain the same height but do not display content */}
          </div>
        )}
      </div>
      {!isMacOS() && <WindowButtons />}
    </div>
  );
}

function WindowButtons() {
  return (
    <div className="flex">
      <button
        title="Minimize"
        type="button"
        className="hover:bg-muted/80 rounded-md p-2"
        onClick={minimizeWindow}
      >
        <svg aria-hidden="true" role="img" width="12" height="12" viewBox="0 0 12 12">
          <rect fill="currentColor" width="10" height="1" x="1" y="6"></rect>
        </svg>
      </button>
      <button
        title="Maximize"
        type="button"
        className="hover:bg-muted/80 rounded-md p-2"
        onClick={maximizeWindow}
      >
        <svg aria-hidden="true" role="img" width="12" height="12" viewBox="0 0 12 12">
          <rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor"></rect>
        </svg>
      </button>
      <button
        type="button"
        title="Close"
        className="rounded-md p-2 hover:bg-red-500"
        onClick={closeWindow}
      >
        <svg aria-hidden="true" role="img" width="12" height="12" viewBox="0 0 12 12">
          <polygon
            fill="currentColor"
            fillRule="evenodd"
            points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
          ></polygon>
        </svg>
      </button>
    </div>
  );
}
