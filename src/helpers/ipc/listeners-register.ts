import { BrowserWindow } from 'electron';
import { addThemeEventListeners } from './theme/theme-listeners';
import { addWindowEventListeners } from './window/window-listeners';
import { addDockerListeners } from './docker/docker-listeners';
import { addServicesListeners } from './services/services-listeners';

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addDockerListeners();
  addServicesListeners(mainWindow);
}
