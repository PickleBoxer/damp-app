/**
 * Global Window interface with all IPC context APIs
 * All context interfaces are defined in @shared/types/ipc.ts
 */
declare interface Window {
  themeMode: import('./types/ipc').ThemeModeContext;
  electronWindow: import('./types/ipc').ElectronWindow;
  docker: import('./types/ipc').DockerContext;
  dockerEvents: import('./types/ipc').DockerEventsContext;
  services: import('./types/ipc').ServicesContext;
  projects: import('./types/ipc').ProjectsContext;
  shell: import('./types/ipc').ShellContext;
  projectLogs: import('./types/ipc').ProjectLogsContext;
  app: import('./types/ipc').AppContext;
  sync: import('./types/ipc').SyncContext;
  ngrok: import('./types/ipc').NgrokContext;
  secureStorage: import('./types/ipc').SecureStorageContext;
  updater: import('./types/ipc').UpdaterContext;
  resources: import('./types/ipc').ResourcesContext;
}
