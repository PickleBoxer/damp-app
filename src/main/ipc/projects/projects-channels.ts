/**
 * IPC channel constants for project operations
 */

// Project listing and info
export const PROJECTS_GET_ALL = 'projects:get-all';
export const PROJECTS_GET_ONE = 'projects:get-one';

// Project creation and deletion
export const PROJECTS_CREATE = 'projects:create';
export const PROJECTS_UPDATE = 'projects:update';
export const PROJECTS_DELETE = 'projects:delete';

// Project operations
export const PROJECTS_REORDER = 'projects:reorder';

// Folder selection
export const PROJECTS_SELECT_FOLDER = 'projects:select-folder';

// Progress events (for volume copy)
export const PROJECTS_COPY_PROGRESS = 'projects:copy-progress';

// Container status
export const PROJECTS_GET_CONTAINER_STATE = 'projects:get-container-state';
