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
  LaravelDetectionResult,
  FolderSelectionResult,
  VolumeCopyProgress,
} from './project';
import type { ServiceId, ServiceInfo, CustomConfig, InstallOptions, PullProgress } from './service';

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
  getNetworkName: () => Promise<string>;
  ensureNetwork: () => Promise<void>;
  connectToNetwork: (containerIdOrName: string) => Promise<void>;
  disconnectFromNetwork: (containerIdOrName: string) => Promise<void>;
}

/**
 * Service lifecycle management context
 */
export interface ServicesContext {
  getAllServices: () => Promise<ServiceInfo[]>;
  getService: (serviceId: ServiceId) => Promise<ServiceInfo>;
  installService: (serviceId: ServiceId, options?: InstallOptions) => Promise<ServiceInfo>;
  uninstallService: (serviceId: ServiceId, removeVolumes?: boolean) => Promise<ServiceInfo>;
  startService: (serviceId: ServiceId) => Promise<ServiceInfo>;
  stopService: (serviceId: ServiceId) => Promise<ServiceInfo>;
  restartService: (serviceId: ServiceId) => Promise<ServiceInfo>;
  updateConfig: (serviceId: ServiceId, customConfig: CustomConfig) => Promise<ServiceInfo>;
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
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (input: UpdateProjectInput) => Promise<Project>;
  deleteProject: (
    projectId: string,
    removeVolume?: boolean,
    removeFolder?: boolean
  ) => Promise<void>;
  reorderProjects: (projectIds: string[]) => Promise<void>;
  copyProjectToVolume: (projectId: string) => Promise<void>;
  selectFolder: (defaultPath?: string) => Promise<FolderSelectionResult>;
  detectLaravel: (folderPath: string) => Promise<LaravelDetectionResult>;
  devcontainerExists: (folderPath: string) => Promise<boolean>;
  getBatchContainerStatus: (projectIds: string[]) => Promise<
    Array<{
      projectId: string;
      running: boolean;
      exists: boolean;
      ports: Array<[string, string]>;
    }>
  >;
  discoverPort: (containerName: string) => Promise<number | null>;
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
  readFile: (
    projectId: string,
    filePath: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
  tailFile: (
    projectId: string,
    filePath: string,
    lines?: number
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
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
  status: 'started' | 'completed' | 'failed';
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
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  stopTunnel: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  getStatus: (projectId: string) => Promise<{
    success: boolean;
    data?: { status: string; containerId?: string; publicUrl?: string };
    error?: string;
  }>;
  getPublicUrl: (projectId: string) => Promise<{
    success: boolean;
    data?: { url: string };
    error?: string;
  }>;
}
