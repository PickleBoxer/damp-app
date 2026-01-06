import { exposeThemeContext } from './theme/theme-context';
import { exposeWindowContext } from './window/window-context';
import { exposeDockerContext } from './docker/docker-context';
import { exposeDockerEventsContext } from './docker/docker-events-context';
import { exposeServicesContext } from './services/services-context';
import { exposeProjectsContext } from './projects/projects-context';
import { exposeShellContext } from './shell/shell-context';
import { exposeLogsContext } from './logs/logs-context';
import { exposeAppContext } from './app/app-context';
import { exposeSyncContext } from './sync/sync-context';
import { exposeNgrokContext } from './ngrok/ngrok-context';
import { exposeStorageContext } from './storage/storage-context';
import { exposeUpdaterContext } from './updater/updater-context';

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeDockerContext();
  exposeDockerEventsContext();
  exposeServicesContext();
  exposeProjectsContext();
  exposeShellContext();
  exposeLogsContext();
  exposeAppContext();
  exposeSyncContext();
  exposeNgrokContext();
  exposeStorageContext();
  exposeUpdaterContext();
}
