/**
 * IPC channel constants for service operations
 */

// Service listing and info
export const SERVICES_GET_ALL = 'services:get-all';
export const SERVICES_GET_ONE = 'services:get-one';
export const SERVICES_GET_STATUS = 'services:get-status';
export const SERVICES_GET_CONTAINER_STATE = 'services:get-container-state';

// Service operations
export const SERVICES_INSTALL = 'services:install';
export const SERVICES_UNINSTALL = 'services:uninstall';
export const SERVICES_START = 'services:start';
export const SERVICES_STOP = 'services:stop';
export const SERVICES_RESTART = 'services:restart';

// Service configuration
export const SERVICES_UPDATE_CONFIG = 'services:update-config';

// Caddy-specific operations
export const SERVICES_CADDY_DOWNLOAD_CERT = 'services:caddy-download-cert';

// Progress events (for image pull)
export const SERVICES_INSTALL_PROGRESS = 'services:install-progress';
