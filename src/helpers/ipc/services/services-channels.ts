/**
 * IPC channel constants for service operations
 */

// Service listing and info
export const SERVICES_GET_ALL = 'services:get-all';
export const SERVICES_GET_ONE = 'services:get-one';
export const SERVICES_CHECK_DOCKER = 'services:check-docker';

// Service operations
export const SERVICES_INSTALL = 'services:install';
export const SERVICES_UNINSTALL = 'services:uninstall';
export const SERVICES_START = 'services:start';
export const SERVICES_STOP = 'services:stop';
export const SERVICES_RESTART = 'services:restart';

// Service configuration
export const SERVICES_UPDATE_CONFIG = 'services:update-config';

// Progress events (for image pull)
export const SERVICES_INSTALL_PROGRESS = 'services:install-progress';
