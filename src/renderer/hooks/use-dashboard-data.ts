/**
 * Dashboard data aggregation hook
 * Combines services and projects data with visibility-aware polling
 */

import { useMemo } from 'react';
import { useQueries, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { servicesQueryOptions, serviceContainerStateQueryOptions } from '@renderer/services';
import { projectsQueryOptions, projectContainerStateQueryOptions } from '@renderer/projects';
import type { Project } from '@shared/types/project';
import type { ServiceDefinition } from '@shared/types/service';
// ...existing code...
import type { ContainerState } from '@shared/types/container';

export interface DashboardService extends ServiceDefinition {
  /** Whether service container exists (replaces installed) */
  exists: boolean;
  /** Whether container is running (replaces enabled) */
  running: boolean;
  /** Health status of the container */
  health_status: ContainerState['health_status'];
}

export interface DashboardData {
  runningServices: DashboardService[];
  runningProjects: (Project & { isRunning: boolean })[];
  requiredServices: DashboardService[];
  allServices: DashboardService[];
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
  // Fetch service definitions (static, no Docker queries)
  const { data: services = [], isLoading: isLoadingServicesList } =
    useQuery(servicesQueryOptions());

  // Fetch each service's container status in parallel
  const serviceStatusQueries = useQueries({
    queries: services.map((service: ServiceDefinition) =>
      serviceContainerStateQueryOptions(service.id)
    ),
  });

  const isLoadingServicesStatus = serviceStatusQueries.some(q => q.isLoading);

  // Extract data for stable dependencies
  const serviceStatusData = serviceStatusQueries.map(q => q.data);

  // Merge definitions with statuses
  const mergedServices = useMemo(() => {
    return services.map((service: ServiceDefinition, index: number) => {
      const status = serviceStatusData[index];
      return {
        ...service,
        exists: status?.exists ?? false,
        running: status?.running ?? false,
        health_status: status?.health_status ?? 'none',
      } as DashboardService;
    });
  }, [services, serviceStatusData]);

  // Fetch projects (non-blocking)
  const { data: projects = [], isLoading: isLoadingProjectsList } = useQuery<Project[], Error>({
    ...(projectsQueryOptions() as UseQueryOptions<Project[], Error>),
  });

  // Fetch each project's container status in parallel
  const projectStatusQueries = useQueries({
    queries: projects.map((project: Project) => projectContainerStateQueryOptions(project.id)),
  });

  const isLoadingBatchStatus = projectStatusQueries.some(q => q.isLoading);

  // Extract data for stable dependencies
  const projectStatusData = projectStatusQueries.map(q => q.data);

  // Filter for running services only
  const runningServices = useMemo(
    () => mergedServices.filter((service: DashboardService) => service.running === true),
    [mergedServices]
  );

  // Filter for required services that are not running or not installed
  const requiredServices = useMemo(
    () =>
      mergedServices.filter(
        (service: DashboardService) => service.required && (!service.exists || !service.running)
      ),
    [mergedServices]
  );

  // Combine projects with their running status and filter for running only
  const runningProjects = useMemo(() => {
    return projects
      .map((project: Project, index: number) => ({
        ...project,
        isRunning: projectStatusData[index]?.running ?? false,
      }))
      .filter((project: Project & { isRunning?: boolean }) => project.isRunning);
  }, [projects, projectStatusData]);

  const isLoadingProjects = isLoadingProjectsList || isLoadingBatchStatus;
  const isLoadingServices = isLoadingServicesList || isLoadingServicesStatus;
  const isLoading = isLoadingServices || isLoadingProjects;

  return {
    runningServices,
    runningProjects,
    requiredServices,
    allServices: mergedServices,
    allProjects: projects,
    isLoadingServices,
    isLoadingProjects,
    isLoading,
  };
}
