import { useDockerStatus } from "@/hooks/use-docker-status";

export function DockerStatus() {
  const { data, isLoading } = useDockerStatus();

  // Console log status on every update
  if (data) {
    console.log(
      "🐳 Docker Status:",
      data.isRunning ? "Running" : "Not Running",
      data.error ? `- Error: ${data.error}` : "",
    );
  }

  // Determine indicator color
  const getStatusColor = () => {
    if (isLoading) return "bg-yellow-500"; // Yellow while checking
    if (data?.isRunning) return "bg-green-500"; // Green if running
    return "bg-red-500"; // Red if not running or error
  };

  const getStatusText = () => {
    if (isLoading) return "Checking Docker...";
    if (data?.isRunning) return "Docker Running";
    return data?.error ? `Docker Error: ${data.error}` : "Docker Not Running";
  };

  return (
    <div className="flex items-center gap-2" title={getStatusText()}>
      <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      <span className="text-muted-foreground text-xs">Docker</span>
    </div>
  );
}
