/**
 * Docker operations barrel export
 * Provides unified access to all Docker functionality
 */

// Core Docker client and system operations
export { docker, DOCKER_TIMEOUTS, getManagedContainersStats, isDockerAvailable } from './docker';

// Network operations
export { checkNetworkExists, ensureNetworkExists } from './network';

// Container operations
export {
  createContainer,
  execCommand,
  findContainerByLabels,
  getAllManagedContainers,
  getContainerHostPort,
  getContainerState,
  getContainerStateByLabels,
  getFileFromContainer,
  isContainerRunning,
  pullImage,
  putFileToContainer,
  removeContainer,
  removeContainersByLabels,
  restartContainer,
  startContainer,
  stopAndRemoveContainer,
  stopContainer,
  streamContainerLogs,
  waitForContainerRunning,
} from './container';

// Volume operations
export {
  COPY_STAGES,
  copyToVolume,
  createProjectVolume,
  createVolume,
  ensureVolumesExist,
  getAllManagedVolumes,
  getVolumeNamesFromBindings,
  removeServiceVolumes,
  removeServiceVolumesByLabel,
  removeVolume,
  syncFromVolume,
  syncToVolume,
  volumeExists,
} from './volume';
