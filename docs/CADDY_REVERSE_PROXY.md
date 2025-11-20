# Caddy Reverse Proxy Integration

## Overview

The DAMP app automatically configures Caddy as a reverse proxy for all projects. When projects are created or deleted, the Caddyfile is regenerated and Caddy is reloaded with the new configuration.

## Architecture

### Components

1. **`caddy-config.ts`** - Core module for Caddyfile generation and synchronization
2. **`project-state-manager.ts`** - Triggers Caddy sync on project create/delete
3. **`service-definitions.ts`** - Post-install hook syncs existing projects when Caddy is installed
4. **`service-state-manager.ts`** - Syncs projects when Caddy service is started by user

### Flow Diagram

```
Project Created → Save to Storage → Sync to Caddy → Reload Caddy Config
Project Deleted → Remove from Storage → Sync to Caddy → Reload Caddy Config
Caddy Installed → Setup SSL → Sync All Projects → Reload Caddy Config
Caddy Started → Start Container → Sync All Projects → Reload Caddy Config
```

## How It Works

### 1. Caddyfile Generation

The `syncProjectsToCaddy()` function generates a Caddyfile with:

- A bootstrap entry for `https://damp.local` (triggers SSL cert generation)
- Reverse proxy rules for each project

**Example Generated Caddyfile:**

```caddyfile
# DAMP Reverse Proxy Configuration
# Auto-generated - Do not edit manually

# SSL Bootstrap
https://damp.local {
    tls internal
    respond "DAMP - All systems ready!"
}

# Project: my-laravel-site
https://my-laravel-site.local {
    tls internal
    reverse_proxy my_laravel_site_devcontainer:8080
}

# Project: my-php-app
https://my-php-app.local {
    tls internal
    reverse_proxy my_php_app_devcontainer:8080
}
```

### 2. Container Networking

- All projects use the shared `damp-network` Docker network
- Caddy container is also on `damp-network`
- Container names are used as DNS: `{project_name}_devcontainer:8080`
- Projects expose port `8080` internally (configured in devcontainer)

### 3. Domain Resolution

- Hosts file entries are managed by `project-state-manager.ts`
- Format: `127.0.0.1 {project.domain}` (e.g., `127.0.0.1 my-project.local`)
- Caddy listens on `443` (HTTPS) and routes requests based on domain

### 4. SSL Certificates

- Caddy automatically generates SSL certificates using its internal CA
- Certificates are installed to system trust store during Caddy installation
- All `.local` domains are served over HTTPS

## Integration Points

### Project Creation

```typescript
// project-state-manager.ts - createProject()
await projectStorage.setProject(project);

// Sync project to Caddy (non-blocking)
syncProjectsToCaddy().catch(error => {
  console.warn('Failed to sync project to Caddy:', error);
});
```

### Project Deletion

```typescript
// project-state-manager.ts - deleteProject()
await projectStorage.deleteProject(projectId);

// Sync Caddy to remove project (non-blocking)
syncProjectsToCaddy().catch(error => {
  console.warn('Failed to sync Caddy after project deletion:', error);
});
```

### Caddy Installation

```typescript
// service-definitions.ts - POST_INSTALL_HOOKS
[ServiceId.Caddy]: async context => {
  const result = await setupCaddySSL(context.containerName);
  
  // Sync all existing projects to Caddy
  const syncResult = await syncProjectsToCaddy();
  
  return {
    success: result.success,
    message: result.message,
    metadata: { certInstalled: result.certInstalled }
  };
}
```

### Caddy Startup (User Action)

```typescript
// service-state-manager.ts - startService()
await dockerManager.startContainer(containerStatus.container_id);

// If Caddy was started, sync all projects
if (serviceId === ServiceId.Caddy) {
  syncProjectsToCaddy().catch(error => {
    console.warn('Failed to sync projects to Caddy on startup:', error);
  });
}
```

## Error Handling

### Graceful Degradation

The sync function is **non-blocking** and **graceful**:

1. If Caddy is not running, it logs and skips (not an error)
2. If sync fails, it logs warning but doesn't break project operations
3. All sync calls use `.catch()` to prevent promise rejections

```typescript
export async function syncProjectsToCaddy(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if Caddy is running
    const containerStatus = await dockerManager.getContainerStatus(CADDY_CONTAINER_NAME);
    
    if (!containerStatus?.running) {
      console.log('[Caddy Sync] Skipping - Caddy container not running');
      return { success: true }; // Not an error
    }
    
    // Generate and apply configuration...
    return { success: true };
  } catch (error) {
    console.warn('[Caddy Sync] Failed:', error);
    return { success: false, error: errorMessage };
  }
}
```

## Manual Sync

Projects can be manually synced to Caddy by calling:

```typescript
import { syncProjectsToCaddy } from '@/services/docker/caddy-config';

const result = await syncProjectsToCaddy();
if (!result.success) {
  console.error('Sync failed:', result.error);
}
```

## Testing

### Verify Configuration

1. Start Caddy service in DAMP
2. Create a new project (e.g., "test-site")
3. Check Caddyfile in container:
   ```bash
   docker exec damp-web cat /etc/caddy/Caddyfile
   ```
4. Verify reverse proxy rule exists for `https://test-site.local`

### Verify Routing

1. Start project's devcontainer in VS Code
2. Ensure container is on `damp-network`
3. Visit `https://test-site.local` in browser
4. Should see your project (not Caddy error page)

### Verify Sync on Startup

1. Stop Caddy service
2. Create a new project while Caddy is stopped
3. Start Caddy service
4. Check Caddyfile - new project should be present

## Future Enhancements

1. **Custom Caddy directives** - Allow projects to specify custom Caddy config
2. **Manual sync button** - UI button to trigger `syncProjectsToCaddy()`
3. **Caddy status indicator** - Show if project is synced to Caddy in UI
4. **Sync status badge** - Display sync errors in service detail sheet

## Technical Notes

### Idempotency

`syncProjectsToCaddy()` is **idempotent** - calling it multiple times produces the same result. It always regenerates the complete Caddyfile from the current project list.

### Performance

- Sync is fast (~100-200ms for typical project counts)
- Non-blocking implementation doesn't slow down project operations
- Caddy reload is graceful (no dropped connections)

### Container Name Format

Container names follow the pattern:
```
{sanitized_project_name}_devcontainer
```

Where `sanitized_project_name` is:
- Lowercase
- Spaces replaced with underscores
- Special characters removed

Example: "My Laravel Site" → `my_laravel_site_devcontainer`
