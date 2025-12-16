/**
 * Dashboard data aggregation hook
 * Combines services and projects data with visibility-aware polling
 */

import { useMemo } from 'react';
import { useServices } from '@renderer/queries/services-queries';
import { useProjects, useProjectsStatuses } from '@renderer/queries/projects-queries';
import type { ServiceInfo } from '@shared/types/service';
import type { Project } from '@shared/types/project';

export interface DashboardData {
  runningServices: ServiceInfo[];
  runningProjects: Array<Project & { isRunning: boolean }>;
  mandatoryServices: ServiceInfo[];
  allServices: ServiceInfo[];
  allProjects: Project[];
  isLoadingServices: boolean;
  isLoadingProjects: boolean;
  isLoading: boolean;
}

/**
 * Hook to fetch and aggregate dashboard data
 * - Only shows running/active items
 * - Polls every 10s when page is visible
 * - Stops polling when page is hidden
 */
export function useDashboardData(): DashboardData {
  // Fetch services with polling (non-blocking)
  const { data: services = [], isLoading: isLoadingServices } = useServices({
    refetchInterval: 10000,
    staleTime: 5000, // Cache data for 5s to prevent unnecessary refetches
  });

  // Fetch projects (non-blocking)
  const { data: projects = [], isLoading: isLoadingProjectsList } = useProjects();

  // Extract project IDs for batch status check
  const projectIds = useMemo(() => projects.map(p => p.id), [projects]);

  // Batch fetch container status with event-driven updates (non-blocking)
  const { data: batchStatus = [], isLoading: isLoadingBatchStatus } = useProjectsStatuses(
    projectIds,
    {
      enabled: projectIds.length > 0,
    }
  );

  // Filter for running services only
  const runningServices = useMemo(
    () => services.filter(service => service.state.container_status?.running === true),
    [services]
  );

  // Filter for mandatory services that are not running or not installed
  const mandatoryServices = useMemo(
    () =>
      services.filter(
        service =>
          service.definition.required &&
          (!service.state.installed || !service.state.container_status?.running)
      ),
    [services]
  );

  // Combine projects with their running status and filter for running only
  const runningProjects = useMemo(() => {
    const statusMap = new Map(batchStatus.map(s => [s.projectId, s.running]));

    return projects
      .map(project => ({
        ...project,
        isRunning: statusMap.get(project.id) ?? false,
      }))
      .filter(project => project.isRunning);
  }, [projects, batchStatus]);

  const isLoadingProjects = isLoadingProjectsList || isLoadingBatchStatus;
  const isLoading = isLoadingServices || isLoadingProjects;

  return {
    runningServices,
    runningProjects,
    mandatoryServices,
    allServices: services,
    allProjects: projects,
    isLoadingServices,
    isLoadingProjects,
    isLoading,
  };
}
