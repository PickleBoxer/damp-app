import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeDockerContext } from "./docker/docker-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeDockerContext();
}
