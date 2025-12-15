import { BrowserWindow } from 'electron';
import { addThemeEventListeners } from './theme/theme-listeners';
import { addWindowEventListeners } from './window/window-listeners';
import { addDockerListeners } from './docker/docker-listeners';
import { addDockerEventsListeners } from './docker/docker-events-listeners';
import { addServicesListeners } from './services/services-listeners';
import { addProjectsListeners } from './projects/projects-listeners';
import { addShellEventListeners } from './shell/shell-listeners';
import { addLogsEventListeners } from './logs/logs-listeners';
import { addAppEventListeners } from './app/app-listeners';
import { addSyncListeners } from './sync/sync-listeners';
import { addNgrokListeners } from './ngrok/ngrok-listeners';

export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addDockerListeners();
  addDockerEventsListeners(mainWindow);
  addServicesListeners(mainWindow);
  addProjectsListeners(mainWindow);
  addShellEventListeners();
  addLogsEventListeners();
  addAppEventListeners();
  addSyncListeners(mainWindow);
  addNgrokListeners();
}
