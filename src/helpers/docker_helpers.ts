import type { DockerStatus } from "./ipc/docker/docker-context";

export async function getDockerStatus(): Promise<DockerStatus> {
  return (globalThis as unknown as Window).docker.getStatus();
}
