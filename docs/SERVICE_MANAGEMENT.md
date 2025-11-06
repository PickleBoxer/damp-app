# Service Management Feature

## Overview

This feature provides a complete Docker-based service management system for the DAMP app, allowing users to install, configure, and manage various development services (databases, caches, mail servers, etc.) directly from the application.

## Architecture

### Backend (Main Process)

#### 1. Service Registry (`src/services/registry/`)

- **`service-definitions.ts`**: Contains all 14 predefined service definitions with default configurations
- Services: Caddy, MySQL, Mailpit, PostgreSQL, MariaDB, MongoDB, Redis, Meilisearch, MinIO, Memcached, RabbitMQ, Typesense, Valkey

#### 2. Docker Manager (`src/services/docker/`)

- **`docker-manager.ts`**: Dockerode wrapper for Docker operations
  - Pull images with progress tracking
  - Create/start/stop/restart/remove containers
  - Get container status
- **`port-checker.ts`**: Port availability checking
  - Auto-detects port conflicts
  - Finds next available port automatically

#### 3. State Management (`src/services/state/`)

- **`service-storage.ts`**: Persistent JSON storage in app data directory
- **`service-state-manager.ts`**: Coordinates all service operations
  - Installation with automatic port resolution
  - Service start/stop/restart
  - Configuration management

#### 4. IPC Layer (`src/helpers/ipc/services/`)

- **`services-channels.ts`**: Channel constants
- **`services-context.ts`**: Exposes APIs to renderer
- **`services-listeners.ts`**: Main process event handlers

### Frontend (Renderer Process)

#### 1. API Layer (`src/api/services/`)

- **`services-api.ts`**: Type-safe IPC wrappers
- **`services-queries.ts`**: TanStack Query hooks for reactive data

#### 2. Type Definitions (`src/types/`)

- **`service.ts`**: Complete TypeScript interfaces for all service-related types

## Usage Examples

### 1. Get All Services

```typescript
import { useServices } from '@/api/services/services-queries';

function ServicesPage() {
  const { data: services, isLoading, error } = useServices({
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  if (isLoading) return <div>Loading services...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {services?.map((service) => (
        <div key={service.definition.id}>
          <h3>{service.definition.display_name}</h3>
          <p>{service.definition.description}</p>
          <p>Status: {service.state.container_status?.running ? 'Running' : 'Stopped'}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Install a Service

```typescript
import { useInstallService } from '@/api/services/services-queries';
import { ServiceId } from '@/types/service';

function InstallButton({ serviceId }: { serviceId: ServiceId }) {
  const { mutate: install, isPending, progress } = useInstallService();

  const handleInstall = () => {
    install({
      serviceId,
      options: {
        start_immediately: true,
        custom_config: {
          environment_vars: ['CUSTOM_VAR=value'],
        },
      },
    }, {
      onSuccess: (result) => {
        if (result.success) {
          console.log('Installed:', result.data?.message);
        }
      },
      onError: (error) => {
        console.error('Installation failed:', error);
      },
    });
  };

  return (
    <button onClick={handleInstall} disabled={isPending}>
      {isPending ? 'Installing...' : 'Install'}
      {progress[serviceId] && (
        <div>
          {progress[serviceId]?.status} {progress[serviceId]?.progress}
        </div>
      )}
    </button>
  );
}
```

### 3. Control Service (Start/Stop/Restart)

```typescript
import { useStartService, useStopService, useRestartService } from '@/api/services/services-queries';
import { ServiceId } from '@/types/service';

function ServiceControls({ serviceId }: { serviceId: ServiceId }) {
  const { mutate: start } = useStartService();
  const { mutate: stop } = useStopService();
  const { mutate: restart } = useRestartService();

  return (
    <div>
      <button onClick={() => start(serviceId)}>Start</button>
      <button onClick={() => stop(serviceId)}>Stop</button>
      <button onClick={() => restart(serviceId)}>Restart</button>
    </div>
  );
}
```

### 4. Check Service Status

```typescript
import { useServiceStatus } from '@/api/services/services-queries';
import { ServiceId } from '@/types/service';

function ServiceStatusBadge({ serviceId }: { serviceId: ServiceId }) {
  const { isInstalled, isRunning, containerStatus } = useServiceStatus(serviceId);

  if (!isInstalled) {
    return <span>Not Installed</span>;
  }

  return (
    <span className={isRunning ? 'text-green-500' : 'text-red-500'}>
      {isRunning ? 'Running' : 'Stopped'}
      {containerStatus?.ports.map(([external, internal]) => (
        <div key={internal}>Port: {external}:{internal}</div>
      ))}
    </span>
  );
}
```

### 5. Uninstall a Service

```typescript
import { useUninstallService } from '@/api/services/services-queries';
import { ServiceId } from '@/types/service';

function UninstallButton({ serviceId }: { serviceId: ServiceId }) {
  const { mutate: uninstall, isPending } = useUninstallService();

  const handleUninstall = () => {
    const removeVolumes = confirm('Remove data volumes? This cannot be undone.');
    uninstall({ serviceId, removeVolumes });
  };

  return (
    <button onClick={handleUninstall} disabled={isPending}>
      {isPending ? 'Uninstalling...' : 'Uninstall'}
    </button>
  );
}
```

### 6. Check Docker Status

```typescript
import { useDockerStatus } from '@/api/docker/docker-queries';

function DockerStatusIndicator() {
  const { data: dockerStatus, isLoading } = useDockerStatus();

  if (isLoading) return <div>Checking Docker...</div>;

  return (
    <div>
      <span>
        {dockerStatus?.isRunning ? '✅ Docker Running' : '❌ Docker Not Available'}
      </span>
      {dockerStatus?.error && <div>Error: {dockerStatus.error}</div>}
    </div>
  );
}
```

## Key Features

### Automatic Port Resolution

When installing a service, if the default port is already in use:

1. System checks port availability
2. Automatically finds next available port
3. Saves adjusted port in custom config
4. User is notified of the change

### Progress Tracking

Installation progress is tracked in real-time:

- Image pull progress (downloading, extracting)
- Container creation
- Container startup
- Post-installation hooks

### State Persistence

Service states are saved to JSON in app data directory:

- Installation status
- Enabled/disabled state
- Custom configurations
- Port overrides

### Docker Integration

- Automatic Docker availability detection
- Image management (pull, check existence)
- Container lifecycle (create, start, stop, restart, remove)
- Volume management (create, bind, optional removal)

## Service Configuration

Each service has:

- **Default Config**: Image, ports, environment vars, volumes
- **Custom Config**: User overrides for ports, env vars, container name
- **Post-install Message**: Success message shown to user
- **Optional Post-install Function**: Custom logic after installation

## Data Structure

Service configuration is stored in `%APPDATA%/damp-app/services-config.json`:

```json
{
  "services": {
    "mysql": {
      "id": "mysql",
      "installed": true,
      "enabled": true,
      "custom_config": {
        "ports": [["3307", "3306"]],
        "environment_vars": ["MYSQL_ROOT_PASSWORD=custom123"]
      },
      "container_status": {
        "exists": true,
        "running": true,
        "container_id": "abc123...",
        "state": "running",
        "ports": [["3307", "3306"]]
      }
    }
  },
  "version": "1.0.0",
  "last_updated": 1699300000000
}
```

## Security Considerations

1. **Context Isolation**: All Docker operations run in main process
2. **IPC Validation**: Input validation using Zod (can be added)
3. **Default Passwords**: Development defaults - users should change in production
4. **Port Binding**: Binds to 0.0.0.0 by default - can be customized

## Future Enhancements

- [ ] Service dependency management
- [ ] Backup/restore service data
- [ ] Service templates/presets
- [ ] Log viewing for containers
- [ ] Resource usage monitoring
- [ ] Multi-container service support (docker-compose style)
- [ ] Service health checks
- [ ] Automatic updates for images
