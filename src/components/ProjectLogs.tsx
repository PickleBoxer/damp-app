/**
 * Project logs viewer component with real-time streaming
 */

import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Terminal, Trash2, Download, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LogLine {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

interface ProjectLogsProps {
  projectId: string;
  maxLines?: number;
}

export function ProjectLogs({ projectId, maxLines = 1000 }: ProjectLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Start/stop streaming on mount/unmount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    const startStreaming = async () => {
      setIsStreaming(true);
      setError(null);

      try {
        // Start log streaming
        const result = await window.projectLogs.start(projectId);

        if (!mounted) return; // Component unmounted during async call

        if (!result.success) {
          setError(result.error || 'Failed to start log streaming');
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

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      window.projectLogs.stop(projectId);
      setIsStreaming(false);
    };
  }, [projectId, maxLines]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleDownload = () => {
    const content = logs.map(log => log.line).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId}-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleScrollChange = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Console Output</span>
          {isStreaming && (
            <Badge variant="outline" className="animate-pulse">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
              Live
            </Badge>
          )}
          {logs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {logs.length} {logs.length === maxLines ? '(max)' : ''} lines
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={logs.length === 0}
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={logs.length === 0}
            title="Download logs"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/15 text-destructive border-destructive/50 mx-4 flex items-start gap-2 rounded-md border p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Log Output */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 rounded-md border bg-black/95 font-mono text-xs"
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

      {/* Auto-scroll indicator */}
      {!autoScroll && logs.length > 0 && (
        <div className="px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (scrollViewportRef.current) {
                scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
                setAutoScroll(true);
              }
            }}
            className="w-full"
          >
            Scroll to bottom
          </Button>
        </div>
      )}
    </div>
  );
}
