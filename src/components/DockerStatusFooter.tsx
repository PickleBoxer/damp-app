import { SiDocker } from 'react-icons/si';
import { useDockerStatus, useDockerInfo } from '@/api/docker/docker-queries';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Cpu, MemoryStick, RefreshCw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * Format bytes to MB or GB depending on size
 */
function formatMemory(bytes: number): string {
  const gb = bytes / 1024 / 1024 / 1024;
  const mb = bytes / 1024 / 1024;

  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  return `${mb.toFixed(0)} MB`;
}

export default function DockerStatusFooter() {
  const {
    data: dockerStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useDockerStatus();
  const { data: dockerInfo, refetch: refetchInfo } = useDockerInfo();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    if (!isMountedRef.current || isRefreshing) return;

    setIsRefreshing(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Trigger refetch for both queries
    Promise.all([refetchStatus(), refetchInfo()])
      .then(() => {
        // Keep spinning for minimum duration for visual feedback
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setIsRefreshing(false);
          }
        }, 500);
      })
      .catch(error => {
        console.error('Failed to refresh Docker status:', error);
        if (isMountedRef.current) {
          setIsRefreshing(false);
        }
      });
  };

  // Determine status and icon color
  let statusText: string;
  let textColor: string;
  let statusBg: string;
  let dotColor: string;

  if (dockerStatus?.error) {
    statusText = 'Docker Error';
    textColor = 'text-rose-400';
    statusBg = 'bg-rose-500/10';
    dotColor = 'bg-rose-500';
  } else if (dockerStatus?.isRunning) {
    statusText = 'Engine Running';
    textColor = 'text-emerald-400';
    statusBg = 'bg-emerald-500/10';
    dotColor = 'bg-emerald-500';
  } else if (statusLoading || !dockerStatus) {
    statusText = 'Docker Checking...';
    textColor = 'text-amber-400';
    statusBg = 'bg-amber-500/10';
    dotColor = 'bg-amber-500';
  } else {
    statusText = 'Engine Stopped';
    textColor = 'text-gray-500';
    statusBg = 'bg-gray-500/10';
    dotColor = 'bg-gray-500';
  }

  // Show stats only when Docker is running
  const showStats = dockerStatus?.isRunning && dockerInfo;

  // Calculate total CPU capacity (100% per core)
  const totalCpuCapacity = dockerInfo ? dockerInfo.cpus * 100 : 0;

  return (
    <div className="flex h-full items-center">
      {/* Docker Status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`hover:bg-accent/50 flex h-full items-center gap-1.5 px-2 transition-colors ${statusBg}`}
          >
            <div className={`flex items-center gap-1.5 rounded px-1 py-0.5`}>
              <div className="relative flex items-center justify-center">
                <SiDocker color="#2496ED" className="size-3" />
                <div className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5">
                  <span
                    className={`absolute inset-0 inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
                  ></span>
                  <span
                    className={`absolute inset-0 inline-flex h-full w-full rounded-full ${dotColor}`}
                  ></span>
                </div>
              </div>
              <span className={`text-[11px] font-medium ${textColor}`}>{statusText}</span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {dockerStatus?.error ? `Docker Error: ${dockerStatus.error}` : `Docker: ${statusText}`}
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-3" />

      {/* Refresh Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`text-muted-foreground size-3 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Refresh Docker Status</TooltipContent>
      </Tooltip>

      {showStats && (
        <>
          <Separator orientation="vertical" className="h-3" />

          {/* CPU Usage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hover:bg-accent/50 flex h-full cursor-default items-center gap-1.5 px-2 transition-colors">
                <Cpu className="text-muted-foreground size-3" />
                <span className="text-muted-foreground font-mono text-[11px]">
                  {dockerInfo.cpuUsagePercent.toFixed(2)}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              CPU: {dockerInfo.cpuUsagePercent.toFixed(2)}% / {totalCpuCapacity}%
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-3" />

          {/* Memory Usage */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hover:bg-accent/50 flex h-full cursor-default items-center gap-1.5 px-2 transition-colors">
                <MemoryStick className="text-muted-foreground size-3" />
                <span className="text-muted-foreground font-mono text-[11px]">
                  {formatMemory(dockerInfo.memUsed)} / {formatMemory(dockerInfo.memTotal)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Memory: {formatMemory(dockerInfo.memUsed)} / {formatMemory(dockerInfo.memTotal)}
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
