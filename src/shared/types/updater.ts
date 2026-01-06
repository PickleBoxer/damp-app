export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'not-available';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: Date;
  downloadedVersion?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdateError {
  message: string;
  code?: string;
}

export interface UpdateState {
  status: UpdateStatus;
  info?: UpdateInfo;
  progress?: DownloadProgress;
  error?: UpdateError;
  currentVersion: string;
}
