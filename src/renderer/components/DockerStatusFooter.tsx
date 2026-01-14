import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip';
import {
  dockerInfoQueryOptions,
  dockerNetworkStatusQueryOptions,
  dockerStatusQueryOptions,
} from '@renderer/docker';
import { useSettings } from '@renderer/hooks/use-settings';
import type { ActiveSync } from '@renderer/hooks/use-sync';
import { projectKeys } from '@renderer/projects';
import type { NgrokStatusData } from '@shared/types/ngrok';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Cpu,
  Globe,
  MemoryStick,
  Network,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SiDocker } from 'react-icons/si';

/**
 * Format bytes to MB or GB depending on size
 */
import type { Project } from '@shared/types/project';
import { useQueries, useQuery } from '@tanstack/react-query';

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
  const { settings } = useSettings();
  const showDockerStats = settings?.showDockerStats ?? true;

  const {
    data: dockerStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery(dockerStatusQueryOptions());
  const { data: dockerInfo, refetch: refetchInfo } = useQuery(
    dockerInfoQueryOptions(dockerStatus?.isRunning ?? false, showDockerStats)
  );
  const { data: networkStatus } = useQuery(
    dockerNetworkStatusQueryOptions(dockerStatus?.isRunning ?? false)
  );
  const { data: projects } = useQuery<Project[]>({
    queryKey: projectKeys.list(),
    queryFn: () =>
      (
        globalThis as unknown as Window & { projects: { getAllProjects: () => Promise<Project[]> } }
      ).projects.getAllProjects(),
    staleTime: Infinity,
    refetchInterval: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track mount state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

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

    // Trigger refetch for both queries
    // Use Promise.allSettled to ensure both complete even if one fails
    const results = await Promise.allSettled([refetchStatus(), refetchInfo()]);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const queryName = index === 0 ? 'status' : 'info';
        console.error(`Failed to refresh Docker ${queryName}:`, result.reason);
      }
    });

    // Keep spinning for minimum duration for visual feedback
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }, 300);
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

  // Show stats only when Docker is running AND setting is enabled
  const showStats = dockerStatus?.isRunning && dockerInfo && showDockerStats;

  // Calculate total CPU capacity (100% per core)
  const totalCpuCapacity = dockerInfo ? dockerInfo.cpus * 100 : 0;

  // Subscribe to sync status for all projects using useQueries (built-in React Query reactivity)
  const syncQueries = useQueries({
    queries: (projects || []).map(project => ({
      queryKey: ['syncs', project.id] as const,
      queryFn: () => null as ActiveSync | null,
      staleTime: Infinity,
    })),
  });

  // Count active syncs by direction and get project info
  const syncInfo = useMemo(() => {
    const counts = { from: 0, to: 0 };
    const fromProjects: { id: string; name: string }[] = [];
    const toProjects: { id: string; name: string }[] = [];

    if (projects) {
      projects.forEach((project, index) => {
        const status = syncQueries[index]?.data;
        if (status !== null && status !== undefined) {
          const projectInfo = { id: project.id, name: project.name };

          if (status.direction === 'from') {
            counts.from++;
            fromProjects.push(projectInfo);
          } else {
            counts.to++;
            toProjects.push(projectInfo);
          }
        }
      });
    }

    return {
      counts,
      fromProjects,
      toProjects,
      total: counts.from + counts.to,
    };
    // eslint-disable-next-line @tanstack/query/no-unstable-deps
  }, [projects, syncQueries]);

  // Subscribe to ngrok status for all projects using useQueries (same pattern as sync)
  const ngrokQueries = useQueries({
    queries: (projects || []).map(project => ({
      queryKey: ['ngrok', project.id] as const,
      queryFn: () => null as NgrokStatusData | null,
      staleTime: Infinity,
      notifyOnChangeProps: ['data'] as const, // Only re-render when data changes
    })),
  });

  // Count active ngrok tunnels and get project info
  const ngrokInfo = useMemo(() => {
    const activeTunnels: { id: string; name: string; url?: string }[] = [];

    if (projects) {
      projects.forEach((project, index) => {
        const status = ngrokQueries[index]?.data;
        if (status?.status === 'active' || status?.status === 'starting') {
          activeTunnels.push({
            id: project.id,
            name: project.name,
            url: status.publicUrl,
          });
        }
      });
    }

    return {
      activeTunnels,
      total: activeTunnels.length,
    };
    // eslint-disable-next-line @tanstack/query/no-unstable-deps
  }, [projects, ngrokQueries]);

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
              <span className={`text-xs font-medium ${textColor}`}>{statusText}</span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {dockerStatus?.error ? `Docker Error: ${dockerStatus.error}` : `Docker: ${statusText}`}
        </TooltipContent>
      </Tooltip>

      {/* Network Status - only show when Docker is running */}
      {dockerStatus?.isRunning && networkStatus && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hover:bg-accent/50 flex h-full cursor-default items-center px-2 transition-colors">
              <div className="relative flex items-center justify-center">
                <Network className="text-muted-foreground size-3" />
                <div className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5">
                  <span
                    className={`absolute inset-0 inline-flex h-full w-full rounded-full ${
                      networkStatus.exists ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            {networkStatus.exists ? 'Network: Connected' : 'Network: Not Found'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Refresh Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-accent/50 flex h-full items-center px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
                <span className="text-muted-foreground font-mono text-xs">
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
                <span className="text-muted-foreground font-mono text-xs">
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
            <div className="hover:bg-accent/50 flex h-full cursor-default items-center gap-1.5 px-2 transition-colors">
              <div className="flex items-center gap-1">
                {syncInfo.counts.from > 0 && (
                  <div className="flex items-center gap-0.5">
                    <ArrowDownToLine className="size-3 animate-pulse text-blue-400" />
                    <span className="font-mono text-xs text-blue-400">{syncInfo.counts.from}</span>
                  </div>
                )}
                {syncInfo.counts.to > 0 && (
                  <div className="flex items-center gap-0.5">
                    <ArrowUpFromLine className="size-3 animate-pulse text-blue-400" />
                    <span className="font-mono text-xs text-blue-400">{syncInfo.counts.to}</span>
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-0">
            <div className="flex flex-col">
              {syncInfo.fromProjects.map(project => (
                <button
                  key={`from-${project.id}`}
                  onClick={() =>
                    navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="size-3.5 shrink-0" />
                    <span className="text-xs">{project.name}</span>
                  </div>
                  <span className="text-xs hover:underline">Open</span>
                </button>
              ))}
              {syncInfo.toProjects.map(project => (
                <button
                  key={`to-${project.id}`}
                  onClick={() =>
                    navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="size-3.5 shrink-0" />
                    <span className="text-xs">{project.name}</span>
                  </div>
                  <span className="text-xs hover:underline">Open</span>
                </button>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Active Ngrok Tunnels Indicator */}
      {ngrokInfo.total > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hover:bg-accent/50 flex h-full cursor-default items-center gap-1.5 px-2 transition-colors">
              <div className="flex items-center gap-1">
                <Globe className="size-3 animate-pulse text-purple-400" />
                <span className="font-mono text-xs text-purple-400">{ngrokInfo.total}</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-0">
            <div className="flex flex-col">
              {ngrokInfo.activeTunnels.map(tunnel => (
                <button
                  key={`tunnel-${tunnel.id}`}
                  onClick={() =>
                    navigate({ to: '/projects/$projectId', params: { projectId: tunnel.id } })
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left first:rounded-t-md last:rounded-b-md"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="size-3.5 shrink-0" />
                    <span className="text-xs">{tunnel.name}</span>
                  </div>
                  <span className="text-xs text-purple-500 hover:underline">Open</span>
                </button>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
