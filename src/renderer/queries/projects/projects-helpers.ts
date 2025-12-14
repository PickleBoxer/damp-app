/**
 * Projects IPC Helpers - Value-adding functions only
 * Contains dialog interactions and event subscriptions that benefit from abstraction
 * Simple IPC calls are now accessed directly in projects-queries.ts
 */

import type { FolderSelectionResult, VolumeCopyProgress } from '@shared/types/project';

// Typed reference to the Projects API exposed via preload script
const projectsApi = (globalThis as unknown as Window).projects;

/**
 * Open folder selection dialog
 * Wrapper provides clean API for UI interactions
 */
export async function selectFolder(defaultPath?: string): Promise<FolderSelectionResult> {
  return await projectsApi.selectFolder(defaultPath);
}

/**
 * Subscribe to volume copy progress events
 * Wrapper provides proper cleanup and type safety for event subscriptions
 */
export function subscribeToCopyProgress(
  callback: (projectId: string, progress: VolumeCopyProgress) => void
): () => void {
  return projectsApi.onCopyProgress((projectId: string, progress: unknown) => {
    callback(projectId, progress as VolumeCopyProgress);
  });
}
