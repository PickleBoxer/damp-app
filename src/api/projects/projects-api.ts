/**
 * Projects API wrapper
 * Provides type-safe wrappers around IPC calls to the main process
 */

import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectOperationResult,
  FolderSelectionResult,
  LaravelDetectionResult,
  VolumeCopyProgress,
} from '../../types/project';

// Typed reference to the Projects API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;

/**
 * Ensures the Projects API is available before usage
 */
function ensureProjectsApi() {
  if (!projectsApi) {
    throw new Error(
      'Projects API is not available. Ensure the preload script is properly configured.'
    );
  }
}

/**
 * Get all projects
 */
export async function getAllProjects(): Promise<Project[]> {
  ensureProjectsApi();
  const result = await projectsApi.getAllProjects();
  return result as Project[];
}

/**
 * Get a specific project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  ensureProjectsApi();
  const result = await projectsApi.getProject(projectId);
  return result as Project | null;
}

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<ProjectOperationResult> {
  ensureProjectsApi();
  const result = await projectsApi.createProject(input);
  return result as ProjectOperationResult;
}

/**
 * Update a project
 */
export async function updateProject(input: UpdateProjectInput): Promise<ProjectOperationResult> {
  ensureProjectsApi();
  const result = await projectsApi.updateProject(input);
  return result as ProjectOperationResult;
}

/**
 * Delete a project
 */
export async function deleteProject(
  projectId: string,
  removeVolume = false,
  removeFolder = false
): Promise<ProjectOperationResult> {
  ensureProjectsApi();
  const result = await projectsApi.deleteProject(projectId, removeVolume, removeFolder);
  return result as ProjectOperationResult;
}

/**
 * Reorder projects
 */
export async function reorderProjects(projectIds: string[]): Promise<ProjectOperationResult> {
  ensureProjectsApi();
  const result = await projectsApi.reorderProjects(projectIds);
  return result as ProjectOperationResult;
}

/**
 * Copy project files to volume
 */
export async function copyProjectToVolume(projectId: string): Promise<ProjectOperationResult> {
  ensureProjectsApi();
  const result = await projectsApi.copyProjectToVolume(projectId);
  return result as ProjectOperationResult;
}

/**
 * Open folder selection dialog
 */
export async function selectFolder(defaultPath?: string): Promise<FolderSelectionResult> {
  ensureProjectsApi();
  const result = await projectsApi.selectFolder(defaultPath);
  return result as FolderSelectionResult;
}

/**
 * Detect Laravel in folder
 */
export async function detectLaravel(folderPath: string): Promise<LaravelDetectionResult> {
  ensureProjectsApi();
  const result = await projectsApi.detectLaravel(folderPath);
  return result as LaravelDetectionResult;
}

/**
 * Check if devcontainer exists
 */
export async function devcontainerExists(folderPath: string): Promise<boolean> {
  ensureProjectsApi();
  const result = await projectsApi.devcontainerExists(folderPath);
  return result as boolean;
}

/**
 * Get container status for multiple projects in a single batch call (optimized)
 */
export async function getBatchContainerStatus(
  projectIds: string[]
): Promise<Array<{ projectId: string; running: boolean; exists: boolean }>> {
  ensureProjectsApi();
  const result = await projectsApi.getBatchContainerStatus(projectIds);
  return result as Array<{ projectId: string; running: boolean; exists: boolean }>;
}

/**
 * Discover the forwarded localhost port for a container
 */
export async function discoverPort(containerName: string): Promise<number | null> {
  ensureProjectsApi();
  return await projectsApi.discoverPort(containerName);
}

/**
 * Subscribe to volume copy progress events
 */
export function subscribeToCopyProgress(
  callback: (projectId: string, progress: VolumeCopyProgress) => void
): () => void {
  ensureProjectsApi();
  return projectsApi.onCopyProgress((projectId: string, progress: unknown) => {
    callback(projectId, progress as VolumeCopyProgress);
  });
}
