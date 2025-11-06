import { useQuery } from "@tanstack/react-query";
import { getDockerStatus } from "@/helpers/docker_helpers";

export function useDockerStatus() {
  return useQuery({
    queryKey: ["docker-status"],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for testing
      return getDockerStatus();
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 1000,
    refetchOnWindowFocus: true,
  });
}
