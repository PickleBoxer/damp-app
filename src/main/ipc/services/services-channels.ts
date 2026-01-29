/**
 * IPC channel constants for service operations
 */

// Service listing and info
export const SERVICES_GET_ALL = 'services:get-all';
export const SERVICES_GET_ONE = 'services:get-one';
export const SERVICES_GET_STATUS = 'services:get-status';
export const SERVICES_GET_CONTAINER_STATE = 'services:get-container-state';
export const SERVICES_GET_BUNDLEABLE = 'services:get-bundleable';

// Service operations
export const SERVICES_INSTALL = 'services:install';
export const SERVICES_UNINSTALL = 'services:uninstall';
export const SERVICES_START = 'services:start';
export const SERVICES_STOP = 'services:stop';
export const SERVICES_RESTART = 'services:restart';

// Caddy-specific operations
export const SERVICES_CADDY_DOWNLOAD_CERT = 'services:caddy-download-cert';
export const SERVICES_CADDY_GET_CERT_STATUS = 'services:caddy-get-cert-status';

// Database operations
export const SERVICES_DATABASE_LIST_DBS = 'services:database-list-databases';
export const SERVICES_DATABASE_DUMP = 'services:database-dump';
export const SERVICES_DATABASE_RESTORE = 'services:database-restore';

// Progress events (for image pull)
export const SERVICES_INSTALL_PROGRESS = 'services:install-progress';
