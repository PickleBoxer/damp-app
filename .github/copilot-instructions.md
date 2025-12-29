# AI Coding Agent Instructions for damp-app

## Project Architecture

This is an **Electron desktop app** using a modern React stack with TanStack Router (memory-based, not browser history), Vite bundling, and shadcn/ui components. The app uses **context isolation** for security.

### Core Electron Setup

- **Main process**: `src/main/index.ts` - Creates BrowserWindow, loads preload script, registers IPC listeners
- **Preload script**: `src/preload.ts` - Calls `exposeContexts()` to bridge main ↔ renderer
- **Renderer process**: `src/renderer/App.tsx` - React app with TanStack Router (uses `createMemoryHistory`)

### IPC Architecture Pattern

All IPC follows this **secure 3-layer pattern** in `src/main/ipc/`:

1. **Channels** (`*-channels.ts`): Define channel name constants (e.g., `THEME_MODE_TOGGLE_CHANNEL`)
2. **Context** (`*-context.ts`): Use `import { contextBridge, ipcRenderer } from 'electron'` to expose APIs
3. **Listeners** (`*-listeners.ts`): `ipcMain.handle` to implement main process handlers

**Example IPC modules**: `theme/` and `window/` (for custom title bar controls)

When adding new IPC features:

- Create channel constants in `*-channels.ts`
- Expose context in `*-context.ts` using ES6 imports (NOT `window.require`)
- Add main process handlers in `*-listeners.ts` and register in `listeners-register.ts`
- Type the window interface in `src/shared/index.d.ts` (e.g., `Window.themeMode`)

## Key Technical Patterns

### Custom Title Bar

- Uses `titleBarStyle: "hidden"` (Windows/Linux) or `"hiddenInset"` (macOS)
- `AppHeader.tsx` (in layout folder) provides custom title bar with draggable area using `.draglayer` CSS class
- Window controls (minimize, maximize, close) via IPC: `window.electronWindow` APIs

### Theme System

- Three modes: `dark`, `light`, `system` (syncs with OS)
- Uses `nativeTheme.shouldUseDarkColors` in main process
- `syncThemeWithLocal()` in `src/renderer/App.tsx` initializes theme from localStorage on startup
- Updates document class (`dark`) and localStorage atomically

### Routing

- **File-based routing** with TanStack Router Plugin (generates `routeTree.gen.ts`)
- Uses **memory history** (not browser history) - suitable for Electron
- Root layout: `src/renderer/routes/__root.tsx` includes all layout components (AppHeader, Sidebar, Footer, etc.)
- Router configured in `src/renderer/utils/routes.ts`

### Shadcn/ui Integration

- Components installed to `src/renderer/components/ui/`
- Import path alias: `@renderer/components/ui/*`
- Tailwind v4 with CSS variables for theming (see `src/renderer/index.css`)
- Configuration in `components.json` (uses `@renderer/utils/tailwind` for cn utility)

## Development Workflow

### Running the App

```powershell
pnpm start          # Development mode with hot reload
pnpm package        # Package for current platform
pnpm make           # Create distributable (.exe, .dmg, etc.)
```

### Testing

```powershell
pnpm test           # Run Vitest unit tests
pnpm test:e2e       # Run Playwright E2E tests
pnpm test:all       # Run both unit and E2E tests
```

### Code Quality

```powershell
pnpm lint           # ESLint check
pnpm format         # Prettier check
pnpm format:write   # Prettier auto-fix
```

## Project Conventions

### File Organization

#### Main Process Structure (`src/main/`)

- **Core infrastructure** (`core/`):
  - `docker/` - Docker operations (dockerManager, volumeManager, port-checker, rsync-image-builder)
  - `storage/` - Data persistence (BaseStorage, project-storage, service-storage)
  - `reverse-proxy/` - Caddy configuration (caddy-config, caddy-setup)
- **Domain logic** (`domains/`):
  - `projects/` - Project management (project-state-manager, project-templates, laravel-installer, sync-queue)
  - `services/` - Service management (service-state-manager, service-definitions, hooks/)
- **IPC layer** (`ipc/`): Group by feature (channels, context, listeners)
- **Platform code** (`electron/`): Electron-specific code (TrayMenu)
- **Services** (`services/`): Specific implementations (ngrok/)
- **Utilities** (`utils/`): Shared helper functions

#### Renderer Process Structure (`src/renderer/`)

- `App.tsx`, `routes/`, `components/`, `queries/`, `hooks/`, `utils/`, `assets/`, `styles/`
- **Routes**: Add `.tsx` files in `src/renderer/routes/` (auto-generated tree)
- **Layout components**: `src/renderer/components/layout/` (Sidebar, Footer)
- **UI components**: `src/renderer/components/ui/` (shadcn/ui)
- **Queries**: Data fetching with TanStack Query in `src/renderer/queries/`

#### Shared Code Structure (`src/shared/`)

- `types/` - TypeScript type definitions
- `constants/` - Shared constants

### Path Aliases

- `@main/*` - src/main/\*
- `@renderer/*` - src/renderer/\*
- `@shared/*` - src/shared/\*
- `@/*` - src/\* (legacy, prefer specific aliases)

### TypeScript Types

- Global types in `src/shared/index.d.ts` (especially `Window` interface extensions)
- Domain types in `src/shared/types/` (project.ts, service.ts, theme-mode.ts, settings.ts)
- Forge build constants: `MAIN_WINDOW_VITE_DEV_SERVER_URL`, `MAIN_WINDOW_VITE_NAME`

### React Patterns

- React 19 with **React Compiler** enabled (no manual memoization needed)
- Strict Mode enabled in production

## Security Best Practices

### Preload Script Pattern

```typescript
// ✅ CORRECT - Use ES6 imports in preload
import { contextBridge, ipcRenderer } from 'electron';

export function exposeThemeContext() {
  contextBridge.exposeInMainWorld('themeMode', {
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
  });
}

// ❌ WRONG - Never use window.require
const { contextBridge } = window.require('electron'); // DON'T DO THIS
```

### IPC Input Validation

```typescript
// Use Zod to validate IPC inputs in listeners
import { z } from 'zod';

const inputSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']),
});

ipcMain.handle(CHANNEL_NAME, async (event, data) => {
  const validated = inputSchema.parse(data); // Throws if invalid
  // Process validated.theme safely
});
```

## Common Gotchas

- **Don't use browser APIs** (localStorage, sessionStorage) in main/preload - renderer only
- **Memory router required**: Browser history doesn't work in Electron file:// protocol
- **Platform detection**: Use `@shared/utils/platform` (`isMacOS()`, `isWindows()`, etc.)
- **CSS draggable regions**: Apply `draglayer` class for custom title bar dragging
- **Preload imports**: Always use ES6 `import` - never `window.require()`
- **Context files**: Import `electron` directly, not via `window.require`
- **shadcn/ui components**: Run `pnpm dlx shadcn@latest add <component>` - installs to `ui/` directory

## Key Dependencies

- **Electron 38** + **Electron Forge** (Vite plugin for bundling)
- **React 19** + **TanStack Router** (file-based routing)
- **Tailwind v4** + **shadcn/ui** (component library)
- **Vitest** (unit) + **Playwright** (E2E)
- **Zod 4** for validation, **TanStack Query** for async state

## Example: Adding a New IPC Feature

```typescript
// 1. src/main/ipc/example/example-channels.ts
export const EXAMPLE_DO_SOMETHING = 'example:do-something';

// 2. src/main/ipc/example/example-context.ts
import { contextBridge, ipcRenderer } from 'electron'; // ✅ ES6 import

export function exposeExampleContext() {
  contextBridge.exposeInMainWorld('example', {
    doSomething: () => ipcRenderer.invoke(EXAMPLE_DO_SOMETHING),
  });
}

// 3. src/main/ipc/example/example-listeners.ts
import { ipcMain } from 'electron';
import { EXAMPLE_DO_SOMETHING } from './example-channels';

export function addExampleListeners() {
  ipcMain.handle(EXAMPLE_DO_SOMETHING, async () => {
    // Implementation with Node.js access (file system, etc.)
    // Can import from core/ or domains/ as needed
    return { success: true };
  });
}

// 4. Update src/main/ipc/context-exposer.ts
import { exposeExampleContext } from './example/example-context';
export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeExampleContext(); // Add this line
}

// 5. Update src/main/ipc/listeners-register.ts
import { addExampleListeners } from './example/example-listeners';
export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addExampleListeners(); // Add this line
}

// 6. Update src/shared/index.d.ts
declare interface Window {
  themeMode: ThemeModeContext;
  electronWindow: ElectronWindow;
  example: {
    // Add this interface
    doSomething: () => Promise<{ success: boolean }>;
  };
}
```
