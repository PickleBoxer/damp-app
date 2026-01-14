/**
 * Project logs viewer component with real-time streaming
 */

import { Alert, AlertDescription } from '@renderer/components/ui/alert';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface LogLine {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

interface ProjectLogsProps {
  projectId: string;
  maxLines?: number;
  isActive?: boolean;
}

export interface ProjectLogsRef {
  clear: () => void;
  download: () => void;
}

export const ProjectLogs = forwardRef<ProjectLogsRef, ProjectLogsProps>(
  ({ projectId, maxLines = 1000, isActive = true }, ref) => {
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          setLogs([]);
        },
        download: () => {
          const content = logs.map(log => log.line).join('\n');
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `project-${projectId}-logs-${Date.now()}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Defer URL revocation to allow browser to start download
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        },
      }),
      [logs, projectId]
    );

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
      if (autoScroll && scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
      }
    }, [logs, autoScroll]);

    // Start/stop streaming based on isActive prop
    useEffect(() => {
      // Don't start streaming if not active
      if (!isActive) {
        return;
      }

      let unsubscribe: (() => void) | null = null;
      let mounted = true;

      const startStreaming = async () => {
        setIsStreaming(true);
        setError(null);

        try {
          // Check if API is available
          if (!window.projectLogs) {
            setError('Project logs API not available');
            setIsStreaming(false);
            return;
          }

          // Start log streaming
          const result = await window.projectLogs.start(projectId);

          if (!mounted) return; // Component unmounted during async call

          if (!result.success) {
            setError(result.error || 'Failed to start log streaming');
            setIsStreaming(false);
            return;
          }

          // Check if API is available for subscription
          if (!window.projectLogs) {
            setError('Project logs API not available');
            setIsStreaming(false);
            return;
          }

          // Listen for log lines
          unsubscribe = window.projectLogs.onLine(log => {
            if (log.projectId === projectId) {
              setLogs(prev => {
                const newLogs = [
                  ...prev,
                  { line: log.line, stream: log.stream, timestamp: log.timestamp },
                ];
                // Keep only last N lines to prevent memory issues
                return newLogs.slice(-maxLines);
              });
            }
          });
        } catch (err) {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsStreaming(false);
        }
      };

      startStreaming();

      // Cleanup on unmount or when becoming inactive
      return () => {
        mounted = false;
        if (unsubscribe) {
          unsubscribe();
        }
        if (window.projectLogs) {
          window.projectLogs.stop(projectId);
        }
      };
    }, [projectId, maxLines, isActive]);

    const handleScrollChange = (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLDivElement;
      const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
      setAutoScroll(isAtBottom);
    };

    return (
      <div className="flex h-full flex-col">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertCircle />
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {/* Log Output */}
        <ScrollArea
          ref={scrollAreaRef}
          className="h-0 flex-1 bg-black/95 font-mono text-xs"
          onScrollCapture={handleScrollChange}
        >
          <div ref={scrollViewportRef} className="p-4">
            {logs.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center text-center">
                {error ? (
                  'Failed to load logs'
                ) : isStreaming ? (
                  <>
                    <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    Waiting for logs...
                  </>
                ) : (
                  'No logs available'
                )}
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`break-all whitespace-pre-wrap select-text ${
                    log.stream === 'stderr' ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  {log.line}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

ProjectLogs.displayName = 'ProjectLogs';
