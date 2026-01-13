/**
 * Docker operations barrel export
 * Provides unified access to all Docker functionality
 */

// Core Docker client and system operations
export { docker, DOCKER_TIMEOUTS, isDockerAvailable, getManagedContainersStats } from './docker';

// Network operations
export { ensureNetworkExists, checkNetworkExists } from './network';

// Container operations
export {
  pullImage,
  createContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  stopAndRemoveContainer,
  removeContainersByLabels,
  getContainerState,
  findContainerByLabel,
  getContainerStateByLabel,
  isContainerRunning,
  waitForContainerRunning,
  getContainerHostPort,
  getAllManagedContainers,
  execCommand,
  getFileFromContainer,
  streamContainerLogs,
} from './container';

// Volume operations
export {
  createVolume,
  createProjectVolume,
  removeVolume,
  volumeExists,
  ensureVolumesExist,
  getVolumeNamesFromBindings,
  copyToVolume,
  syncFromVolume,
  syncToVolume,
  removeServiceVolumes,
  getAllManagedVolumes,
  COPY_STAGES,
} from './volume';
