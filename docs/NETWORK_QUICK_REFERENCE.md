# Docker Network Quick Reference

## Network Name

```
damp-network
```

## For Service Development (Already Done ✅)

Services automatically connect to the network. No action needed.

## For Laravel Site Implementation

### 1. Get Network Name

```typescript
import { getDockerNetworkName } from '@/api/docker/docker-api';
const networkName = await getDockerNetworkName();
```

### 2. Create Container with Network

```typescript
const container = await docker.createContainer({
  name: 'my-site',
  Image: 'php:8.3-fpm',
  NetworkingConfig: {
    EndpointsConfig: {
      [networkName]: {}, // Connects to damp-network
    },
  },
  // ... rest of config
});
```

### 3. Laravel .env Configuration

```env
# Services are accessible by container name
DB_HOST=damp-mysql
DB_PORT=3306

REDIS_HOST=damp-redis
REDIS_PORT=6379

CACHE_DRIVER=redis
SESSION_DRIVER=redis

MAIL_HOST=damp-mailpit
MAIL_PORT=1025

MEILISEARCH_HOST=http://damp-meilisearch:7700
```

## Available Service Hostnames

| Service               | Hostname           | Port  |
| --------------------- | ------------------ | ----- |
| MySQL                 | `damp-mysql`       | 3306  |
| PostgreSQL            | `damp-postgresql`  | 5432  |
| MariaDB               | `damp-mariadb`     | 3306  |
| MongoDB               | `damp-mongodb`     | 27017 |
| Redis                 | `damp-redis`       | 6379  |
| Valkey                | `damp-valkey`      | 6379  |
| Memcached             | `damp-memcached`   | 11211 |
| Mailpit (SMTP)        | `damp-mailpit`     | 1025  |
| Mailpit (Web)         | `damp-mailpit`     | 8025  |
| Meilisearch           | `damp-meilisearch` | 7700  |
| Typesense             | `damp-typesense`   | 8108  |
| MinIO (API)           | `damp-minio`       | 9000  |
| MinIO (Console)       | `damp-minio`       | 8900  |
| RustFS (API)          | `damp-rustfs`      | 9000  |
| RustFS (Console)      | `damp-rustfs`      | 9001  |
| RabbitMQ (AMQP)       | `damp-rabbitmq`    | 5672  |
| RabbitMQ (Management) | `damp-rabbitmq`    | 15672 |
| Caddy (HTTP)          | `damp-web`         | 80    |
| Caddy (HTTPS)         | `damp-web`         | 443   |

## Testing Connection

From inside any container:

```bash
# Ping a service
ping damp-mysql

# Check port connectivity
nc -zv damp-redis 6379

# DNS resolution
nslookup damp-mailpit
```

## CLI Commands

```bash
# List networks
docker network ls

# Inspect damp-network
docker network inspect damp-network

# List connected containers
docker network inspect damp-network -f '{{range .Containers}}{{.Name}} {{end}}'

# Manually connect container
docker network connect damp-network <container_name>

# Manually disconnect container
docker network disconnect damp-network <container_name>
```

## API Methods

```typescript
// Import from docker API
import {
  getDockerNetworkName,
  ensureDockerNetwork,
  connectContainerToNetwork,
  disconnectContainerFromNetwork,
} from '@/api/docker/docker-api';

// Get network name
const name = await getDockerNetworkName();
// Returns: "damp-network"

// Ensure network exists (idempotent)
await ensureDockerNetwork();

// Connect existing container
await connectContainerToNetwork('my-container-name');

// Disconnect container
await disconnectContainerFromNetwork('my-container-id');
```

## Common Patterns

### Pattern 1: New Site with Multiple Services

```typescript
// Site can access all services by hostname
const env = {
  DB_HOST: 'damp-mysql',
  REDIS_HOST: 'damp-redis',
  MAIL_HOST: 'damp-mailpit',
};
```

### Pattern 2: Connecting Existing Container

```typescript
// Connect after creation
const container = await docker.createContainer({...});
await container.start();
await connectContainerToNetwork(container.id);
```

### Pattern 3: Multi-Container Site

```typescript
// All containers in same site share network
await docker.createContainer({
  name: 'site-web',
  NetworkingConfig: { EndpointsConfig: { 'damp-network': {} } },
});

await docker.createContainer({
  name: 'site-worker',
  NetworkingConfig: { EndpointsConfig: { 'damp-network': {} } },
});

// site-web can access: damp-mysql, damp-redis, site-worker
// site-worker can access: damp-mysql, damp-redis, site-web
```

## Best Practices

✅ **DO**

- Use container names as hostnames
- Keep internal ports (e.g., 3306 for MySQL inside network)
- Let services auto-connect during creation
- Use environment variables for host configuration

❌ **DON'T**

- Hardcode localhost in .env (use container names)
- Expose internal ports unnecessarily
- Manually manage network (let app handle it)
- Use IP addresses (use DNS names)

## Troubleshooting

**Problem**: Container can't connect to service  
**Solution**: Verify both containers are on damp-network

```bash
docker network inspect damp-network
```

**Problem**: DNS resolution fails  
**Solution**: Ensure using exact container name (e.g., `damp-mysql` not `mysql`)

**Problem**: Connection refused  
**Solution**: Check service is running and using correct port

```bash
docker ps | grep damp-mysql
```
