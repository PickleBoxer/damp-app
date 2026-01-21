import { exposeAppContext } from './app/app-context';
import { exposeDockerContext } from './docker/docker-context';
import { exposeDockerEventsContext } from './docker/docker-events-context';
import { exposeLogsContext } from './logs/logs-context';
import { exposeNgrokContext } from './ngrok/ngrok-context';
import { exposeProjectsContext } from './projects/projects-context';
import { exposeServicesContext } from './services/services-context';
import { exposeShellContext } from './shell/shell-context';
import { exposeStorageContext } from './storage/storage-context';
import { exposeSyncContext } from './sync/sync-context';
import { exposeThemeContext } from './theme/theme-context';
import { exposeWindowContext } from './window/window-context';

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
}
