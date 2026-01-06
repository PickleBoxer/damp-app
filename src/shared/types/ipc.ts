/**
 * Shared IPC context interface definitions
 * Single source of truth for all IPC method signatures
 * These must match the actual implementations in src/main/ipc/*\/\*-context.ts
 */

import type { ThemeMode } from './theme-mode';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  FolderSelectionResult,
  VolumeCopyProgress,
} from './project';
import type {
  ServiceId,
  ServiceInfo,
  ServiceDefinition,
  CustomConfig,
  InstallOptions,
  PullProgress,
} from './service';
import type { Result } from './result';
import type { ContainerState } from './container';

import type { NgrokStatusData } from './ngrok';
import type { UpdateState, DownloadProgress } from './updater';

/**
 * Theme mode management context
 */
export interface ThemeModeContext {
  current: () => Promise<'dark' | 'light' | 'system'>;
  toggle: () => Promise<ThemeMode>;
  dark: () => Promise<void>;
  light: () => Promise<void>;
  system: () => Promise<boolean>;
  onUpdated: (callback: (shouldUseDarkColors: boolean) => void) => () => void;
}

/**
 * Electron window control context
 */
export interface ElectronWindow {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Docker daemon management context
 */
export interface DockerContext {
  getStatus: () => Promise<{ isRunning: boolean; error?: string }>;
  getInfo: () => Promise<{
    cpus: number;
    cpuUsagePercent: number;
    memTotal: number;
    memUsed: number;
  }>;
  ensureNetwork: () => Promise<void>;
  getNetworkStatus: () => Promise<{ exists: boolean; dockerAvailable: boolean }>;
}

/**
 * Docker container event with metadata from label system
 */
export interface DockerContainerEvent {
  containerId: string;
  action: 'start' | 'stop' | 'die' | 'health_status' | 'kill' | 'pause' | 'unpause' | 'restart';
  timestamp: number;
  // Metadata from com.pickleboxer.damp.* labels
  serviceId?: string;
  projectId?: string;
  resourceType?: string;
}

/**
 * Docker events connection status
 */
export interface DockerEventsConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastError?: string;
  timestamp: number;
}

/**
 * Docker events monitoring context
 */
export interface DockerEventsContext {
  start: () => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<{ success: boolean }>;
  onEvent: (callback: (event: DockerContainerEvent) => void) => () => void;
  onConnectionStatus: (callback: (status: DockerEventsConnectionStatus) => void) => () => void;
}

/**
 * Service lifecycle management context
 */
export interface ServicesContext {
  getAllServices: () => Promise<ServiceDefinition[]>;
  getService: (serviceId: ServiceId) => Promise<ServiceInfo>;
  getServiceContainerState: (serviceId: ServiceId) => Promise<ContainerState | null>;
  installService: (
    serviceId: ServiceId,
    options?: InstallOptions
  ) => Promise<
    Result<{ message?: string; container_id: string; ports?: import('./container').PortMapping[] }>
  >;
  uninstallService: (
    serviceId: ServiceId,
    removeVolumes?: boolean
  ) => Promise<Result<{ message: string }>>;
  startService: (serviceId: ServiceId) => Promise<Result<{ message: string }>>;
  stopService: (serviceId: ServiceId) => Promise<Result<{ message: string }>>;
  restartService: (serviceId: ServiceId) => Promise<Result<{ message: string }>>;
  updateConfig: (
    serviceId: ServiceId,
    customConfig: CustomConfig
  ) => Promise<Result<{ message: string }>>;
  downloadCaddyCertificate: () => Promise<{ success: boolean; path?: string; error?: string }>;
  onInstallProgress: (
    callback: (serviceId: ServiceId, progress: PullProgress) => void
  ) => () => void;
}

/**
 * Project CRUD and management context
 */
export interface ProjectsContext {
  getAllProjects: () => Promise<Project[]>;
  getProject: (projectId: string) => Promise<Project | null>;
  createProject: (input: CreateProjectInput) => Promise<Result<Project>>;
  updateProject: (input: UpdateProjectInput) => Promise<Result<Project>>;
  deleteProject: (
    projectId: string,
    removeVolume?: boolean,
    removeFolder?: boolean
  ) => Promise<Result<void>>;
  reorderProjects: (projectIds: string[]) => Promise<Result<void>>;
  selectFolder: (defaultPath?: string) => Promise<FolderSelectionResult>;
  getProjectContainerState: (projectId: string) => Promise<ContainerState | null>;
  onCopyProgress: (
    callback: (projectId: string, progress: VolumeCopyProgress) => void
  ) => () => void;
}

/**
 * Shell and external application context
 */
export interface ShellContext {
  openFolder: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  openEditor: (
    projectId: string,
    settings?: { defaultEditor: string; defaultTerminal: string }
  ) => Promise<{ success: boolean; error?: string }>;
  openTerminal: (
    projectId: string,
    settings?: { defaultEditor: string; defaultTerminal: string }
  ) => Promise<{ success: boolean; error?: string }>;
  openHomeTerminal: (settings?: {
    defaultEditor: string;
    defaultTerminal: string;
  }) => Promise<{ success: boolean; error?: string }>;
  openTinker: (
    projectId: string,
    settings?: { defaultEditor: string; defaultTerminal: string }
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Log line from container
 */
export interface LogLine {
  projectId: string;
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

/**
 * Container log streaming context
 */
export interface ProjectLogsContext {
  start: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  stop: (projectId: string) => Promise<void>;
  onLine: (callback: (log: LogLine) => void) => () => void;
}

/**
 * Application metadata context
 */
export interface AppContext {
  getInfo: () => Promise<{
    appName: string;
    appVersion: string;
    electronVersion: string;
    chromeVersion: string;
    nodeVersion: string;
    v8Version: string;
  }>;
}

/**
 * Sync status update payload
 */
export interface SyncStatus {
  status: 'started' | 'completed' | 'failed' | 'progress';
  percentage?: number;
  bytesTransferred?: number;
}

/**
 * Volume synchronization context
 */
export interface SyncContext {
  fromVolume: (
    projectId: string,
    options?: { includeNodeModules?: boolean; includeVendor?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
  toVolume: (
    projectId: string,
    options?: { includeNodeModules?: boolean; includeVendor?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
  cancel: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  onSyncProgress: (
    callback: (projectId: string, direction: 'to' | 'from', progress: SyncStatus) => void
  ) => () => void;
}

/**
 * Ngrok tunnel management context
 */
export interface NgrokContext {
  startTunnel: (
    projectId: string,
    authToken: string,
    region?: string
  ) => Promise<{ success: boolean; data?: NgrokStatusData; error?: string }>;
  stopTunnel: (projectId: string) => Promise<{
    success: boolean;
    data?: NgrokStatusData;
    error?: string;
  }>;
  getStatus: (projectId: string) => Promise<{
    success: boolean;
    data?: NgrokStatusData;
    error?: string;
  }>;
}

/**
 * Secure storage context (uses Electron safeStorage API)
 */
export interface SecureStorageContext {
  saveSecret: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  getSecret: (key: string) => Promise<{ success: boolean; value: string | null; error?: string }>;
  deleteSecret: (key: string) => Promise<{ success: boolean; error?: string }>;
  isAvailable: () => Promise<boolean>;
}

/**
 * Application auto-updater context
 */
export interface UpdaterContext {
  checkForUpdates: () => Promise<{ success: boolean }>;
  quitAndInstall: () => Promise<void>;
  getStatus: () => Promise<UpdateState>;
  skipVersion: (version: string) => Promise<{ success: boolean }>;
  onProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onStatusChange: (callback: (state: UpdateState) => void) => () => void;
  onError: (callback: (error: { message: string; code?: string }) => void) => () => void;
}
