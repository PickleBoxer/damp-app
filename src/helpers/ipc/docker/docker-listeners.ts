import { ipcMain } from "electron";
import Docker from "dockerode";
import { DOCKER_STATUS_CHANNEL } from "./docker-channels";
import type { DockerStatus } from "./docker-context";

const docker = new Docker();

export function addDockerListeners() {
  ipcMain.handle(DOCKER_STATUS_CHANNEL, async (): Promise<DockerStatus> => {
    try {
      // Ping Docker daemon to check if it's running
      await docker.ping();
      console.log("✅ Docker is running");
      return { isRunning: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Docker error:", errorMessage);
      return {
        isRunning: false,
        error: errorMessage,
      };
    }
  });
}
