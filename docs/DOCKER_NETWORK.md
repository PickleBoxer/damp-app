# Docker Network Management

## Overview

All DAMP services and projects (sites) are connected to a shared Docker bridge network named `damp-network`. This enables seamless inter-container communication without requiring external network calls or port binding.

## Benefits

1. **Service Discovery**: Containers can communicate using container names as hostnames
2. **Simplified Configuration**: No need to expose ports for inter-service communication
3. **Security**: Internal traffic doesn't leave the Docker network
4. **Future-Ready**: Easy integration for Laravel sites and other projects

## Architecture

### Network Name

- **Network**: `damp-network`
- **Type**: Bridge network
- **Managed by**: DAMP app

### Automatic Setup

The network is automatically created when:

- First service is installed
- Network doesn't exist and a container is created

### Container Connection

All containers are **automatically connected** to `damp-network` during creation via the `NetworkingConfig` in container options.

## Implementation

### Backend (Main Process)

#### Docker Manager (`src/services/docker/docker-manager.ts`)

```typescript
class DockerManager {
  private readonly networkName = 'damp-network';

  // Ensure network exists before creating containers
  async ensureNetworkExists(): Promise<void>;

  // Connect existing container to network
  async connectContainerToNetwork(containerIdOrName: string): Promise<void>;

  // Disconnect container from network
  async disconnectContainerFromNetwork(containerIdOrName: string): Promise<void>;

  // Get network name
  getNetworkName(): string;
}
```

**Automatic Connection**: Containers are connected during creation:

```typescript
const containerConfig: ContainerCreateOptions = {
  // ... other config
  NetworkingConfig: {
    EndpointsConfig: {
      [this.networkName]: {},
    },
  },
};
```

### IPC Layer (`src/helpers/ipc/docker/`)

**Channels** (`docker-channels.ts`):

```typescript
export const DOCKER_NETWORK_NAME_CHANNEL = 'docker:network-name';
export const DOCKER_ENSURE_NETWORK_CHANNEL = 'docker:ensure-network';
export const DOCKER_CONNECT_TO_NETWORK_CHANNEL = 'docker:connect-to-network';
export const DOCKER_DISCONNECT_FROM_NETWORK_CHANNEL = 'docker:disconnect-from-network';
```

**Context** (`docker-context.ts`):

```typescript
interface DockerContext {
  getNetworkName: () => Promise<string>;
  ensureNetwork: () => Promise<void>;
  connectToNetwork: (containerIdOrName: string) => Promise<void>;
  disconnectFromNetwork: (containerIdOrName: string) => Promise<void>;
}
```

**Listeners** (`docker-listeners.ts`):
Handlers for all network operations using `dockerManager`.

### Frontend API (`src/api/docker/`)

```typescript
// Get network name
export async function getDockerNetworkName(): Promise<string>;

// Ensure network exists (idempotent)
export async function ensureDockerNetwork(): Promise<void>;

// Connect container to network
export async function connectContainerToNetwork(containerIdOrName: string): Promise<void>;

// Disconnect container from network
export async function disconnectContainerFromNetwork(containerIdOrName: string): Promise<void>;
```

## Usage Examples

### For Services (Already Implemented)

Services are automatically connected when created. No manual intervention needed.

```typescript
// This happens automatically in docker-manager.ts
await this.ensureNetworkExists();
const container = await this.docker.createContainer({
  // ... config
  NetworkingConfig: {
    EndpointsConfig: {
      [this.networkName]: {},
    },
  },
});
```

### For Future Laravel Sites

When implementing site management:

```typescript
import { connectContainerToNetwork, getDockerNetworkName } from '@/api/docker/docker-api';

// After creating a Laravel site container
async function createLaravelSite() {
  const networkName = await getDockerNetworkName(); // 'damp-network'

  // Create container with network config
  const siteContainer = await docker.createContainer({
    name: 'my-laravel-site',
    Image: 'php:8.3-fpm',
    NetworkingConfig: {
      EndpointsConfig: {
        [networkName]: {},
      },
    },
    // ... other config
  });

  await siteContainer.start();

  // Site can now connect to services using container names:
  // - MySQL: damp-mysql:3306
  // - Redis: damp-redis:6379
  // - Mailpit: damp-mailpit:1025
}
```

### For Existing Containers

Connect an existing container to the network:

```typescript
import { connectContainerToNetwork } from '@/api/docker/docker-api';

// Connect by container ID or name
await connectContainerToNetwork('damp-mysql');
await connectContainerToNetwork('my-existing-container-id');
```

### Inter-Service Communication

Inside any container on `damp-network`:

```bash
# Ping MySQL service
ping damp-mysql

# Connect to MySQL
mysql -h damp-mysql -u developer -p

# Connect to Redis
redis-cli -h damp-redis

# Send email via Mailpit SMTP
telnet damp-mailpit 1025
```

## Laravel .env Configuration

For Laravel sites connected to `damp-network`:

```env
# Database (MySQL)
DB_CONNECTION=mysql
DB_HOST=damp-mysql
DB_PORT=3306
DB_DATABASE=development
DB_USERNAME=developer
DB_PASSWORD=devpassword

# Redis
REDIS_HOST=damp-redis
REDIS_PORT=6379

# Memcached
MEMCACHED_HOST=damp-memcached
MEMCACHED_PORT=11211

# Mail (Mailpit)
MAIL_MAILER=smtp
MAIL_HOST=damp-mailpit
MAIL_PORT=1025
MAIL_ENCRYPTION=null

# Meilisearch
MEILISEARCH_HOST=http://damp-meilisearch:7700
MEILISEARCH_KEY=masterkey

# RabbitMQ
RABBITMQ_HOST=damp-rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=rabbitmq
RABBITMQ_PASSWORD=rabbitmq

# MinIO / S3
AWS_ENDPOINT=http://damp-minio:9000
AWS_ACCESS_KEY_ID=root
AWS_SECRET_ACCESS_KEY=password
```

## Network Isolation

**What's connected:**

- All DAMP services (MySQL, Redis, Mailpit, etc.)
- Future Laravel sites
- Future custom projects

**Port binding:**

- Ports are still exposed to host (localhost) for external access
- Internal communication uses container names (no port conflicts)

**Example:**

- MySQL exposed on `localhost:3306` (external access)
- MySQL accessible at `damp-mysql:3306` (internal network)

## Troubleshooting

### Check Network Exists

```bash
docker network ls | grep damp-network
```

### Inspect Network

```bash
docker network inspect damp-network
```

### List Connected Containers

```bash
docker network inspect damp-network -f '{{range .Containers}}{{.Name}} {{end}}'
```

### Manually Connect Container

```bash
docker network connect damp-network <container_name>
```

### Manually Disconnect Container

```bash
docker network disconnect damp-network <container_name>
```

## Future Enhancements

- [ ] Network status indicator in UI
- [ ] Visual network topology viewer
- [ ] Custom DNS entries
- [ ] Network isolation levels
- [ ] Subnet configuration options
- [ ] IPv6 support
- [ ] Load balancing between multiple instances
