/**
 * Example component demonstrating Docker network usage
 * This is a reference implementation - not used in production
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getDockerNetworkName,
  ensureDockerNetwork,
  connectContainerToNetwork,
  disconnectContainerFromNetwork,
} from '@/api/docker/docker-api';

export function DockerNetworkExample() {
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGetNetworkName = async () => {
    try {
      setLoading(true);
      const name = await getDockerNetworkName();
      setNetworkName(name);
      setMessage(`Network name: ${name}`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnsureNetwork = async () => {
    try {
      setLoading(true);
      await ensureDockerNetwork();
      setMessage('Network ensured successfully');
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectContainer = async () => {
    const containerName = prompt('Enter container name or ID:');
    if (!containerName) return;

    try {
      setLoading(true);
      await connectContainerToNetwork(containerName);
      setMessage(`Connected ${containerName} to network`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectContainer = async () => {
    const containerName = prompt('Enter container name or ID:');
    if (!containerName) return;

    try {
      setLoading(true);
      await disconnectContainerFromNetwork(containerName);
      setMessage(`Disconnected ${containerName} from network`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-lg font-semibold">Docker Network Management</h3>
        <p className="text-muted-foreground text-sm">
          Example component showing network operations
        </p>
      </div>

      {networkName && (
        <Badge variant="secondary" className="font-mono">
          {networkName}
        </Badge>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGetNetworkName} disabled={loading} size="sm">
          Get Network Name
        </Button>
        <Button onClick={handleEnsureNetwork} disabled={loading} size="sm">
          Ensure Network Exists
        </Button>
        <Button onClick={handleConnectContainer} disabled={loading} size="sm" variant="outline">
          Connect Container
        </Button>
        <Button onClick={handleDisconnectContainer} disabled={loading} size="sm" variant="outline">
          Disconnect Container
        </Button>
      </div>

      {message && (
        <div className="bg-muted rounded-md p-3 font-mono text-xs break-all">{message}</div>
      )}

      <div className="bg-muted/50 space-y-2 rounded-md p-3 text-xs">
        <p className="font-semibold">Usage in Laravel .env:</p>
        <code className="block">
          DB_HOST={networkName || 'damp-mysql'}
          <br />
          REDIS_HOST={networkName ? 'damp-redis' : 'localhost'}
        </code>
      </div>
    </div>
  );
}
