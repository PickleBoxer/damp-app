# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**damp** is a Docker local development environment manager built as an Electron desktop application. It manages PHP development projects (Laravel, basic PHP) and auxiliary services (MySQL, PostgreSQL, Redis, etc.) through Docker containers, with features like custom domains via Caddy reverse proxy, ngrok tunnel integration, and devcontainer generation.

## Development Commands

### Running the Application

```bash
pnpm start          # Start in development mode with hot reload
pnpm package        # Package for current platform (required before E2E tests)
pnpm make           # Create platform-specific distributable (.exe, .dmg, etc.)
```

### Testing

```bash
pnpm test           # Run Vitest unit tests
pnpm test:watch     # Run Vitest in watch mode
pnpm test:e2e       # Run Playwright E2E tests (requires `pnpm package` first)
pnpm test:all       # Run both unit and E2E tests
```

### Code Quality

```bash
pnpm lint           # ESLint with zero warnings policy (--max-warnings 0)
pnpm format         # Check formatting with Prettier
pnpm format:write   # Auto-format with Prettier
```

### Installing shadcn/ui Components

```bash
pnpm dlx shadcn@latest add <component-name>
# Components are installed to src/renderer/components/ui/
```

## Architecture

### Process Model

This is a standard Electron multi-process architecture with strict security boundaries:

- **Main Process** (`src/main/`): Node.js runtime with full system access (file system, Docker API, native modules)
- **Preload Script** (`src/preload.ts`): Security bridge that exposes safe IPC APIs via `contextBridge`
- **Renderer Process** (`src/renderer/`): React 19 app running in sandboxed browser context with zero Node.js access

### Main Process Structure (`src/main/`)

The main process follows a layered architecture:

#### Core Infrastructure (`core/`)

Low-level platform integrations and foundational services:

- **`docker/`**: Docker operations via dockerode
  - `docker.ts` - Dockerode client initialization and availability checks
  - `container.ts` - Container lifecycle (create, start, stop, remove, state queries)
  - `volume.ts` - Volume operations (create, remove, copy data with rsync)
  - `network.ts` - Network management (ensure damp-network exists)
  - `rsync-image-builder.ts` - Builds custom rsync Docker image for volume operations
  - `port-checker.ts` - Port availability validation

- **`storage/`**: JSON file-based persistence using electron-store pattern
  - `base-storage.ts` - Generic key-value storage with atomic writes
  - `project-storage.ts` - Project configuration persistence
  - `service-storage.ts` - Service state persistence

- **`reverse-proxy/`**: Caddy integration for local domain routing
  - `caddy-config.ts` - Generates Caddyfile from project list
  - `caddy-setup.ts` - Manages Caddy container lifecycle

- **`hosts-manager/`**: System hosts file manipulation (requires sudo on macOS/Linux)

#### Domain Logic (`domains/`)

Business logic for the application's core entities:

- **`projects/`**: Project lifecycle management
  - `project-state-manager.ts` - **Primary orchestrator** for project CRUD operations
  - `project-templates.ts` - Generates devcontainer.json, Dockerfile, docker-compose.yml
  - `laravel-installer.ts` - Fresh Laravel installation via Composer in Docker
  - `sync-queue.ts` - Queued folder-to-volume sync operations

- **`services/`**: Service container management
  - `service-state-manager.ts` - **Primary orchestrator** for service operations
  - `service-definitions.ts` - Registry of all available services (MySQL, PostgreSQL, Redis, etc.) with Docker configs
  - `hooks/` - Post-installation hooks (e.g., caddy-hook.ts reinitializes Caddy after adding services)

#### IPC Layer (`ipc/`)

Organized by feature domain, each following the **3-layer pattern**:

1. **Channels** (`*-channels.ts`): String constants for IPC channel names
2. **Context** (`*-context.ts`): `contextBridge.exposeInMainWorld()` calls (imported in preload)
3. **Listeners** (`*-listeners.ts`): `ipcMain.handle()` implementations

**Critical files:**

- `context-exposer.ts` - Aggregates all context exposure functions (called from preload.ts)
- `listeners-register.ts` - Registers all IPC listeners at app startup

**Existing IPC modules:** `app/`, `docker/`, `logs/`, `ngrok/`, `projects/`, `services/`, `shell/`, `storage/`, `sync/`, `theme/`, `updater/`, `window/`

#### Platform Code (`electron/`)

- `TrayMenu.ts` - System tray menu with app controls

#### Services (`services/`)

- `ngrok/` - Ngrok tunnel management (ngrok-manager.ts, ngrok-state-manager.ts)

### Renderer Process Structure (`src/renderer/`)

React 19 application with TanStack Router (memory-based, not browser history):

- **Routing**: File-based routing via TanStack Router plugin
  - Routes defined in `routes/` directory (generates `routeTree.gen.ts`)
  - Root layout: `routes/__root.tsx` (includes AppHeader, Sidebar, Footer)
  - Router configured in `App.tsx` with `createMemoryHistory()`

- **State Management**:
  - TanStack Query for async state (Docker containers, projects, services)
  - Custom hooks in `hooks/` encapsulate IPC calls and Query logic
  - No global client state beyond Query cache

- **UI Components**:
  - `components/ui/` - shadcn/ui components (Tailwind v4 + CSS variables)
  - `components/layout/` - Layout components (AppHeader, Sidebar, Footer)
  - `components/` - Feature components (CreateProjectWizard, ProjectPreview, ServiceActions)

- **Queries**: TanStack Query hooks in custom hooks (e.g., `use-projects.ts`, `use-services.ts`)

### Shared Code (`src/shared/`)

Code accessible from both main and renderer processes:

- `types/` - TypeScript type definitions (project.ts, service.ts, container.ts, etc.)
- `constants/` - Shared constants (labels.ts, ports.ts, docker.ts)
- `utils/platform.ts` - Platform detection utilities (`isMacOS()`, `isWindows()`, etc.)
- `index.d.ts` - Global type definitions, especially `Window` interface extensions for IPC APIs

### Path Aliases

Configured in `tsconfig.json` and Vite configs:

- `@main/*` → `src/main/*`
- `@renderer/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`
- `@/*` → `src/*` (legacy, prefer specific aliases)

## IPC Security Pattern

All IPC communication **must** follow this secure pattern:

### Adding New IPC Feature

1. **Define channels** (`src/main/ipc/example/example-channels.ts`):

```typescript
export const EXAMPLE_DO_SOMETHING = 'example:do-something';
```

2. **Expose context** (`src/main/ipc/example/example-context.ts`):

```typescript
import { contextBridge, ipcRenderer } from 'electron'; // ✅ ES6 import only

export function exposeExampleContext() {
  contextBridge.exposeInMainWorld('example', {
    doSomething: (data: string) => ipcRenderer.invoke(EXAMPLE_DO_SOMETHING, data),
  });
}
```

3. **Implement listener** (`src/main/ipc/example/example-listeners.ts`):

```typescript
import { ipcMain } from 'electron';
import { z } from 'zod';
import { EXAMPLE_DO_SOMETHING } from './example-channels';

const inputSchema = z.object({ value: z.string() });

export function addExampleListeners() {
  ipcMain.handle(EXAMPLE_DO_SOMETHING, async (_event, data: unknown) => {
    const validated = inputSchema.parse(data); // Always validate IPC inputs
    // Implementation with Node.js/Docker access
    return { success: true };
  });
}
```

4. **Register in aggregators**:

- Add `exposeExampleContext()` call to `src/main/ipc/context-exposer.ts`
- Add `addExampleListeners()` call to `src/main/ipc/listeners-register.ts`

5. **Type the window interface** (`src/shared/index.d.ts`):

```typescript
declare interface Window {
  example: {
    doSomething: (data: string) => Promise<{ success: boolean }>;
  };
}
```

### Security Requirements

**Critical security constraints (enforced in `src/main/index.ts`):**

```typescript
webPreferences: {
  contextIsolation: true,        // ✅ REQUIRED - Isolate contexts
  nodeIntegration: false,        // ✅ REQUIRED - No Node.js in renderer
  nodeIntegrationInSubFrames: false,
  preload: preload,              // ✅ REQUIRED - Secure bridge
}
```

**Never violate these rules:**

- ❌ Never use `window.require()` in preload scripts (use ES6 `import`)
- ❌ Never expose entire modules to renderer (only expose specific functions)
- ❌ Never skip input validation in IPC listeners (use Zod schemas)
- ❌ Never use browser APIs (localStorage, sessionStorage) in main/preload - renderer only

## Key Technical Patterns

### Docker Label-Based Resource Management

All Docker resources (containers, volumes, networks) are labeled for identification:

**Labels defined in `src/shared/constants/labels.ts`:**

- `LABEL_KEYS.MANAGED` = `'com.pickleboxer.damp.managed'` (always set to `'true'`)
- `LABEL_KEYS.TYPE` = `'com.pickleboxer.damp.type'` - Resource type identifier
- `LABEL_KEYS.SERVICE_ID` = `'com.pickleboxer.damp.service-id'` - Service identifier (mysql, postgresql, redis, etc.)
- `LABEL_KEYS.PROJECT_ID` = `'com.pickleboxer.damp.project-id'` - Project UUID
- `LABEL_KEYS.PROJECT_NAME` = `'com.pickleboxer.damp.project-name'` - Project name

**Container state queries use labels:**

```typescript
// Find container by service ID
const state = await getContainerStateByLabel(
  LABEL_KEYS.SERVICE_ID,
  serviceId,
  RESOURCE_TYPES.SERVICE_CONTAINER
);
```

### State Manager Pattern

Both `project-state-manager.ts` and `service-state-manager.ts` follow this pattern:

1. **Singleton instances** (exported as `projectStateManager`, `serviceStateManager`)
2. **Lazy initialization** with `initialize()` method (idempotent, returns existing promise if in progress)
3. **Storage layer** for persisted state (JSON files via electron-store pattern)
4. **Docker layer** for runtime state (containers, volumes via dockerode)
5. **Coordination logic** orchestrates between storage and Docker

### Project Lifecycle

**Creation flow** (`project-state-manager.ts`):

1. Validate inputs (PHP version requirements, port availability)
2. Generate project config (UUID, domain, volume name)
3. Create Docker volume (`damp_project_{name}`)
4. Generate devcontainer files (`.devcontainer/devcontainer.json`, `Dockerfile`, etc.)
5. Copy project files to volume (for fresh projects, install Laravel if applicable)
6. Save to storage
7. Update Caddy configuration
8. Add hosts entry (`/etc/hosts` or `C:\Windows\System32\drivers\etc\hosts`)

**Update/Delete operations** follow similar orchestration with cleanup steps.

### Service Lifecycle

**Installation flow** (`service-state-manager.ts`):

1. Load service definition from `service-definitions.ts`
2. Pull Docker image with progress tracking
3. Create volumes (data, config)
4. Create container with labels and port mappings
5. Start container
6. Run post-install hooks (e.g., Caddy reinit)
7. Save state to storage

### Caddy Reverse Proxy Integration

**Purpose:** Route `{project}.local` domains to project containers on forwarded ports

**Flow:**

1. `caddy-config.ts` generates Caddyfile from all projects
2. `caddy-setup.ts` manages Caddy container lifecycle
3. Any project creation/update triggers `syncProjectsToCaddy()` to regenerate config

**Caddy runs in its own container** with the generated Caddyfile mounted as a volume.

### Custom Title Bar

- Uses `titleBarStyle: "hidden"` (Windows/Linux) or `"hiddenInset"` (macOS)
- `AppHeader.tsx` provides custom title bar with window controls
- Draggable region via `.draglayer` CSS class (`-webkit-app-region: drag`)
- Window controls (minimize, maximize, close) via `window.electronWindow` IPC APIs

### Theme System

Three modes: `dark`, `light`, `system` (syncs with OS)

**Implementation:**

- Main process reads `nativeTheme.shouldUseDarkColors`
- Renderer updates `document.documentElement.classList` and localStorage
- Theme persistence via localStorage, initialized in `App.tsx` on mount

## Domain Model

### Project

A PHP development project with devcontainer configuration:

**Types:**

- `basic-php` - Generic PHP project
- `laravel` - Fresh Laravel installation
- `existing` - Import existing project

**Key properties:**

- `volumeName` - Docker volume name (e.g., `damp_project_myapp`)
- `domain` - Local domain (e.g., `myapp.local`)
- `phpVersion` - `'7.4' | '8.1' | '8.2' | '8.3' | '8.4'`
- `phpVariant` - `'fpm-apache' | 'fpm-nginx' | 'frankenphp' | 'fpm'`
- `forwardedPort` - Port exposed to host (default: 8443)
- `devcontainerCreated` - Whether `.devcontainer/` files exist
- `volumeCopied` - Whether local files synced to volume

**Lifecycle states tracked separately:**

- Storage state: Project configuration in JSON (via `project-storage.ts`)
- Docker state: Container runtime state queried on-demand (via `getContainerStateByLabel()`)

### Service

Auxiliary service container (MySQL, PostgreSQL, Redis, Mailpit, etc.):

**Service definitions** in `service-definitions.ts`:

- `id` - Service identifier enum (`ServiceId`)
- `name` - Display name
- `image` - Docker image (e.g., `mysql:8.0`)
- `ports` - Port mappings `[hostPort, containerPort]`
- `env` - Environment variables
- `volumes` - Named volumes for data persistence
- `healthCheck` - Docker health check configuration (optional)

**Dynamic configuration:**

- `custom_config` - User-provided environment variable overrides (stored in `service-storage.ts`)

**Special services:**

- **Caddy** - Auto-managed, not user-controllable, regenerated on project changes
- **Ngrok** - Managed separately via `ngrok-manager.ts`, not a standard service

## Testing Strategy

### Unit Tests (Vitest)

Located in `src/tests/` (co-located tests also acceptable):

- Test utilities, helpers, and pure functions
- Mock IPC calls for renderer-side logic
- Use `jsdom` environment for React component tests
- Testing Library for React component interaction

### E2E Tests (Playwright)

Located in `src/tests/e2e/`:

- **Requires packaged app** (`pnpm package` before running)
- Uses `electron-playwright-helpers` for Electron-specific testing
- Tests full user workflows (create project, start service, etc.)

## Common Gotchas

### Electron-Specific Constraints

- **Memory router required**: Browser history doesn't work in Electron `file://` protocol
- **No browser APIs in main/preload**: localStorage, sessionStorage are renderer-only
- **Platform detection**: Use `@shared/utils/platform` (`isMacOS()`, `isWindows()`, etc.)
- **CSS draggable regions**: Apply `draglayer` class for custom title bar dragging (`-webkit-app-region: drag`)

### Docker Integration

- **Native modules**: `dockerode` and `@vscode/sudo-prompt` require native rebuilding (configured in `forge.config.ts`)
- **Single instance lock**: App prevents multiple instances running (Docker socket conflicts)
- **Async initialization**: Docker network created lazily on first use (fails gracefully if Docker not running)

### IPC Communication

- **Always validate inputs**: Use Zod schemas in listeners
- **Always use ES6 imports in preload**: Never `window.require('electron')`
- **Type window interface**: All exposed APIs must be typed in `src/shared/index.d.ts`

### React 19 Patterns

- **React Compiler enabled**: No manual memoization needed (`useMemo`, `useCallback` are redundant)
- **Strict Mode in production**: Double-rendering in dev, strict effects
- **TanStack Query default stale time**: Set to `0` for router loaders (always fresh data)

## Git Workflow

This project uses a PR-based workflow with the Commit Commands Plugin for streamlined git operations.

### Available Commands

- **`/commit`** - Auto-commit with generated message matching repo style
- **`/commit-push-pr`** - Create branch (if needed), commit, push, and open PR in one step
- **`/clean_gone`** - Remove local branches deleted from remote

### Typical Workflow

```bash
# Make changes, then commit
/commit

# Ready to create PR? One command does it all
/commit-push-pr

# After PRs merge, cleanup stale branches
/clean_gone
```

### Release Process

Releases use semantic versioning with automated GitHub releases and Cloudflare R2 backup.

**Steps:**

1. Create PR with changes (use `/commit-push-pr`)
2. Merge PR to main
3. Bump version: `pnpm version patch|minor|major`
4. Update CHANGELOG.md
5. Push tags: `git push && git push --tags` (triggers GitHub Actions)

**Build outputs:** `.exe` installer (Squirrel with auto-update), `.zip` portable

**Required secrets:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`

## Important Context

### Project Naming and Constraints

- Project names must be valid Docker volume names (alphanumeric, hyphens, underscores)
- Domains are auto-generated as `{project-name}.local`
- Volume names use format `damp_project_{name}`
- Container names labeled with project UUID (not name, to support renames)

### Laravel-Specific Logic

- Minimum PHP version: 8.2 (enforced in `project-state-manager.ts`)
- Fresh Laravel installation via Composer in temporary Docker container (see `laravel-installer.ts`)
- Laravel installer options: Starter kits (React/Vue/Livewire), authentication (Laravel/WorkOS), Pest/PHPUnit, Boost
- Post-create command runs Laravel-specific setup (key generation, migrations if selected)

### Volume Synchronization

- Files copied from local project directory to Docker volume using rsync (see `sync-queue.ts`)
- Rsync runs in custom Docker container (`damp-rsync-helper`, built from Alpine + rsync)
- Progress tracking via step-based updates (not file-by-file due to bulk operations)
- Queue system prevents concurrent sync operations on same project

### Platform-Specific Behaviors

**macOS:**

- Title bar style: `hiddenInset` with traffic light controls
- Hosts file location: `/etc/hosts` (requires sudo via `@vscode/sudo-prompt`)
- App stays active when windows closed (standard macOS behavior)

**Windows:**

- Title bar style: `hidden` (fully custom title bar)
- Hosts file location: `C:\Windows\System32\drivers\etc\hosts` (requires admin elevation)
- App quits when all windows closed
- Squirrel installer with auto-update support

**Linux:**

- Title bar style: `hidden`
- Hosts file location: `/etc/hosts` (requires sudo)
- Packaging: `.deb` and `.rpm` via Electron Forge makers
