import { SiDocker } from 'react-icons/si';
import { useDockerStatus, useDockerInfo } from '@/api/docker/docker-queries';
import { useProjects } from '@/api/projects/projects-queries';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Cpu, MemoryStick, RefreshCw, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useActiveSyncs } from '@/api/sync/sync-queries';
import { useNavigate } from '@tanstack/react-router';

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
  const navigate = useNavigate();
  const {
    data: dockerStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useDockerStatus();
  const { data: dockerInfo, refetch: refetchInfo } = useDockerInfo();
  const { data: activeSyncs } = useActiveSyncs();
  const { data: projects } = useProjects();
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

  const handleRefresh = async () => {
    if (!isMountedRef.current || isRefreshing) return;

    setIsRefreshing(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      // Trigger refetch for both queries
      // Use Promise.allSettled to ensure both complete even if one fails
      await Promise.allSettled([refetchStatus(), refetchInfo()]);
    } catch (error) {
      console.error('Failed to refresh Docker status:', error);
    } finally {
      // Keep spinning for minimum duration for visual feedback
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsRefreshing(false);
        }
      }, 300);
    }
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

  // Count active syncs by direction and get project info
  const syncInfo = useMemo(() => {
    const counts = { from: 0, to: 0 };
    const fromProjects: Array<{ id: string; name: string }> = [];
    const toProjects: Array<{ id: string; name: string }> = [];

    if (activeSyncs && projects) {
      activeSyncs.forEach((sync, projectId) => {
        const project = projects.find(p => p.id === projectId);
        const projectInfo = { id: projectId, name: project?.name || projectId };

        if (sync.direction === 'from') {
          counts.from++;
          fromProjects.push(projectInfo);
        } else {
          counts.to++;
          toProjects.push(projectInfo);
        }
      });
    }

    return {
      counts,
      fromProjects,
      toProjects,
      total: counts.from + counts.to,
    };
  }, [activeSyncs, projects]);

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

      {/* Refresh Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors disabled:opacity-50"
            aria-label="Refresh Docker status"
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

      {/* Active Syncs Indicator */}
      {syncInfo.total > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hover:bg-accent/50 flex h-full cursor-default items-center gap-1.5 bg-blue-500/10 px-2 transition-colors">
              <div className="flex items-center gap-1">
                {syncInfo.counts.from > 0 && (
                  <div className="flex items-center gap-0.5">
                    <ArrowDownToLine className="size-3 animate-pulse text-blue-400" />
                    <span className="font-mono text-[11px] text-blue-400">
                      {syncInfo.counts.from}
                    </span>
                  </div>
                )}
                {syncInfo.counts.to > 0 && (
                  <div className="flex items-center gap-0.5">
                    <ArrowUpFromLine className="size-3 animate-pulse text-blue-400" />
                    <span className="font-mono text-[11px] text-blue-400">
                      {syncInfo.counts.to}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-0">
            <div className="flex flex-col">
              {syncInfo.fromProjects.map((project, idx) => (
                <button
                  key={`from-${idx}`}
                  onClick={() =>
                    navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
                  }
                  className="hover:bg-accent/50 flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="text-muted-foreground text-xs">{project.name}</span>
                  </div>
                  <span className="text-xs text-blue-400 hover:underline">Open</span>
                </button>
              ))}
              {syncInfo.toProjects.map((project, idx) => (
                <button
                  key={`to-${idx}`}
                  onClick={() =>
                    navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
                  }
                  className="hover:bg-accent/50 flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="text-muted-foreground text-xs">{project.name}</span>
                  </div>
                  <span className="text-xs text-blue-400 hover:underline">Open</span>
                </button>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
