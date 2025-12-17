/**
 * Dashboard data aggregation hook
 * Combines services and projects data with visibility-aware polling
 */

import { useMemo } from 'react';
import { useServices, useServicesStatus } from '@renderer/queries/services-queries';
import { useProjects, useProjectsStatus } from '@renderer/queries/projects-queries';
import type { ServiceDefinition } from '@shared/types/service';
import type { Project } from '@shared/types/project';
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
  mandatoryServices: DashboardService[];
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
  const { data: services = [], isLoading: isLoadingServicesList } = useServices();

  // Fetch service statuses separately (bulk Docker query)
  const { data: servicesStatus = [], isLoading: isLoadingServicesStatus } = useServicesStatus();

  // Merge definitions with statuses
  const mergedServices = useMemo(() => {
    const statusMap = new Map(servicesStatus.map(s => [s.id, s]));

    return services.map(service => {
      const status = statusMap.get(service.id);
      return {
        ...service, // Spread all ServiceDefinition properties
        exists: status?.exists ?? false,
        running: status?.running ?? false,
        health_status: status?.health_status ?? 'none',
      } as DashboardService;
    });
  }, [services, servicesStatus]);

  // Fetch projects (non-blocking)
  const { data: projects = [], isLoading: isLoadingProjectsList } = useProjects();

  // Batch fetch container status with event-driven updates (non-blocking)
  const { data: batchStatus = [], isLoading: isLoadingBatchStatus } = useProjectsStatus();

  // Filter for running services only
  const runningServices = useMemo(
    () => mergedServices.filter(service => service.running === true),
    [mergedServices]
  );

  // Filter for mandatory services that are not running or not installed
  const mandatoryServices = useMemo(
    () =>
      mergedServices.filter(service => service.required && (!service.exists || !service.running)),
    [mergedServices]
  );

  // Combine projects with their running status and filter for running only
  const runningProjects = useMemo(() => {
    const statusMap = new Map(batchStatus.map(s => [s.id, s.running]));

    return projects
      .map(project => ({
        ...project,
        isRunning: statusMap.get(project.id) ?? false,
      }))
      .filter(project => project.isRunning);
  }, [projects, batchStatus]);

  const isLoadingProjects = isLoadingProjectsList || isLoadingBatchStatus;
  const isLoadingServices = isLoadingServicesList || isLoadingServicesStatus;
  const isLoading = isLoadingServices || isLoadingProjects;

  return {
    runningServices,
    runningProjects,
    mandatoryServices,
    allServices: mergedServices,
    allProjects: projects,
    isLoadingServices,
    isLoadingProjects,
    isLoading,
  };
}
