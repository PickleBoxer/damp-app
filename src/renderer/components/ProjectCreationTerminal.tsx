/**
 * Terminal-like component for displaying project creation progress
 * Docker-style output with ANSI color support
 */

import { useEffect, useRef, useMemo } from 'react';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { cn } from '@renderer/components/lib/utils';
import AnsiToHtml from 'ansi-to-html';

export interface TerminalLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'progress';
  stage?: string;
}

interface ProjectCreationTerminalProps {
  logs: TerminalLog[];
  className?: string;
}

export function ProjectCreationTerminal({
  logs,
  className,
}: Readonly<ProjectCreationTerminalProps>) {
  const endRef = useRef<HTMLDivElement>(null);

  // Create ANSI converter with custom color scheme
  const ansiConverter = useMemo(
    () =>
      new AnsiToHtml({
        fg: '#D4D4D4',
        bg: '#000000',
        newline: false,
        escapeXML: true,
        stream: false,
      }),
    []
  );

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div
      className={cn(
        'border-border relative w-full overflow-hidden rounded-lg border bg-black font-mono text-sm',
        className
      )}
    >
      {/* Terminal Header - macOS style */}
      <div className="border-border flex items-center gap-2 border-b bg-[#1e1e1e] px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </div>
      </div>

      {/* Terminal Content with proper overflow handling */}
      <ScrollArea className="h-[400px] p-2">
        {logs.length === 0 ? (
          <div className="text-gray-500">
            <span className="text-sm">Waiting to start...</span>
          </div>
        ) : (
          <>
            {logs.map(log => (
              <pre
                key={log.id}
                className="break-words whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: ansiConverter.toHtml(log.message),
                }}
              />
            ))}
            <div ref={endRef} />
          </>
        )}
      </ScrollArea>
    </div>
  );
}
