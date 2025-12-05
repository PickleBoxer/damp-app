import { exposeThemeContext } from './theme/theme-context';
import { exposeWindowContext } from './window/window-context';
import { exposeDockerContext } from './docker/docker-context';
import { exposeServicesContext } from './services/services-context';
import { exposeProjectsContext } from './projects/projects-context';
import { exposeShellContext } from './shell/shell-context';
import { exposeLogsContext } from './logs/logs-context';
import { exposeAppContext } from './app/app-context';

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeDockerContext();
  exposeServicesContext();
  exposeProjectsContext();
  exposeShellContext();
  exposeLogsContext();
  exposeAppContext();
}
