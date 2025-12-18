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
import type { ContainerStateData } from '@shared/types/container';

export interface DashboardService extends ServiceDefinition {
  /** Whether service container exists (replaces installed) */
  exists: boolean;
  /** Whether container is running (replaces enabled) */
  running: boolean;
  /** Health status of the container */
  health_status: ContainerStateData['health_status'];
}

export interface DashboardData {
  runningServices: DashboardService[];
  runningProjects: Array<Project & { isRunning: boolean }>;
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
  const servicesStatus = serviceStatusQueries
    .map(q => q.data ?? { id: '', exists: false, running: false, health_status: 'none' })
    .filter((s: { id: string }) => s.id !== '');

  // Merge definitions with statuses
  const mergedServices = useMemo(() => {
    const statusMap = new Map(
      servicesStatus.map(
        (s: { id: string; exists: boolean; running: boolean; health_status: string }) => [s.id, s]
      )
    );
    return services.map((service: ServiceDefinition) => {
      const status = statusMap.get(service.id);
      return {
        ...service,
        exists: status?.exists ?? false,
        running: status?.running ?? false,
        health_status: status?.health_status ?? 'none',
      } as DashboardService;
    });
  }, [services, servicesStatus]);

  // Fetch projects (non-blocking)
  const { data: projects = [], isLoading: isLoadingProjectsList } = useQuery<Project[], Error>({
    ...(projectsQueryOptions() as UseQueryOptions<Project[], Error>),
  });

  // Fetch each project's container status in parallel
  const projectStatusQueries = useQueries({
    queries: projects.map((project: Project) => projectContainerStateQueryOptions(project.id)),
  });

  const isLoadingBatchStatus = projectStatusQueries.some(q => q.isLoading);
  const batchStatus = projectStatusQueries
    .map(q => q.data ?? { id: '', running: false })
    .filter((s: { id: string; running: boolean }) => s.id !== '');

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
    const statusMap = new Map(
      batchStatus.map((s: { id: string; running: boolean }) => [s.id, s.running])
    );
    return projects
      .map((project: Project) => ({
        ...project,
        isRunning: statusMap.get(project.id) ?? false,
      }))
      .filter((project: Project & { isRunning?: boolean }) => project.isRunning);
  }, [projects, batchStatus]);

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
