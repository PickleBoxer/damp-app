import { useQuery } from "@tanstack/react-query";
import { getDockerStatus } from "@/helpers/docker_helpers";

export function useDockerStatus() {
  return useQuery({
    queryKey: ["docker-status"],
    queryFn: getDockerStatus,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}
