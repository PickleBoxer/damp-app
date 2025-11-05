# AI Coding Agent Instructions for damp-app

## Project Architecture

This is an **Electron desktop app** using a modern React stack with TanStack Router (memory-based, not browser history), Vite bundling, and shadcn/ui components. The app uses **context isolation** for security.

### Core Electron Setup
- **Main process**: `src/main.ts` - Creates BrowserWindow, loads preload script, registers IPC listeners
- **Preload script**: `src/preload.ts` - Calls `exposeContexts()` to bridge main ↔ renderer
- **Renderer process**: `src/App.tsx` - React app with TanStack Router (uses `createMemoryHistory`)

### IPC Architecture Pattern

All IPC follows this **secure 3-layer pattern** in `src/helpers/ipc/`:

1. **Channels** (`*-channels.ts`): Define channel name constants (e.g., `THEME_MODE_TOGGLE_CHANNEL`)
2. **Context** (`*-context.ts`): Use `import { contextBridge, ipcRenderer } from 'electron'` to expose APIs
3. **Listeners** (`*-listeners.ts`): `ipcMain.handle` to implement main process handlers

**Example IPC modules**: `theme/` and `window/` (for custom title bar controls)

When adding new IPC features:
- Create channel constants in `*-channels.ts`
- Expose context in `*-context.ts` using ES6 imports (NOT `window.require`)
- Add main process handlers in `*-listeners.ts` and register in `listeners-register.ts`
- Type the window interface in `src/types.d.ts` (e.g., `Window.themeMode`)

## Key Technical Patterns

### Custom Title Bar
- Uses `titleBarStyle: "hidden"` (Windows/Linux) or `"hiddenInset"` (macOS)
- `DragWindowRegion.tsx` provides draggable area with `.draglayer` CSS class
- Window controls (minimize, maximize, close) via IPC: `src/helpers/window_helpers.ts`

### Theme System
- Three modes: `dark`, `light`, `system` (syncs with OS)
- Uses `nativeTheme.shouldUseDarkColors` in main process
- `syncThemeWithLocal()` in `App.tsx` initializes theme from localStorage on startup
- Updates document class (`dark`) and localStorage atomically

### Routing
- **File-based routing** with TanStack Router Plugin (generates `routeTree.gen.ts`)
- Uses **memory history** (not browser history) - suitable for Electron
- Root layout: `__root.tsx` wraps routes with `BaseLayout` (includes `DragWindowRegion`)
- Router configured in `src/utils/routes.ts`

### Shadcn/ui Integration
- Components installed to `src/components/ui/`
- Import path alias: `@/components/ui/*`
- Tailwind v4 with CSS variables for theming (see `src/styles/global.css`)
- Configuration in `components.json` (uses `@/utils/tailwind` for cn utility)

## Development Workflow

### Running the App
```powershell
npm run start          # Development mode with hot reload
npm run package        # Package for current platform
npm run make          # Create distributable (.exe, .dmg, etc.)
```

### Testing
```powershell
npm run test           # Run Vitest unit tests
npm run test:e2e       # Run Playwright E2E tests
npm run test:all       # Run both unit and E2E tests
```

### Code Quality
```powershell
npm run lint           # ESLint check
npm run format         # Prettier check
npm run format:write   # Prettier auto-fix
```

## Project Conventions

### File Organization
- **IPC modules**: Group by feature in `src/helpers/ipc/{feature}/` (channels, context, listeners)
- **Routes**: Add `.tsx` files in `src/routes/` (auto-generated tree)
- **Components**: Template components in `components/template/`, shadcn/ui in `components/ui/`
- **Helpers**: Renderer-side IPC wrappers in `src/helpers/*_helpers.ts`

### TypeScript Types
- Global types in `src/types.d.ts` (especially `Window` interface extensions)
- Theme types in `src/types/theme-mode.ts`
- Forge build constants: `MAIN_WINDOW_VITE_DEV_SERVER_URL`, `MAIN_WINDOW_VITE_NAME`

### React Patterns
- React 19 with **React Compiler** enabled (no manual memoization needed)
- Strict Mode enabled in production
- i18next for internationalization (initialized in `App.tsx` via `syncThemeWithLocal`)

## Security Best Practices

### Preload Script Pattern
```typescript
// ✅ CORRECT - Use ES6 imports in preload
import { contextBridge, ipcRenderer } from 'electron';

export function exposeThemeContext() {
  contextBridge.exposeInMainWorld("themeMode", {
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
  });
}

// ❌ WRONG - Never use window.require
const { contextBridge } = window.require("electron"); // DON'T DO THIS
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
- **Platform detection**: Use `src/utils/platform.ts` (`isMacOS()`, `isWindows()`, etc.)
- **CSS draggable regions**: Apply `draglayer` class for custom title bar dragging
- **Preload imports**: Always use ES6 `import` - never `window.require()`
- **Context files**: Import `electron` directly, not via `window.require`
- **shadcn/ui components**: Run `pnpm dlx shadcn@latest add <component>` - installs to `ui/` directory

## Key Dependencies

- **Electron 38** + **Electron Forge** (Vite plugin for bundling)
- **React 19** + **TanStack Router** (file-based routing)
- **Tailwind v4** + **shadcn/ui** (component library)
- **Vitest** (unit) + **Playwright** (E2E)
- **Zod 4** for validation, **React Query** for async state

## Example: Adding a New IPC Feature

```typescript
// 1. src/helpers/ipc/example/example-channels.ts
export const EXAMPLE_DO_SOMETHING = "example:do-something";

// 2. src/helpers/ipc/example/example-context.ts
import { contextBridge, ipcRenderer } from 'electron'; // ✅ ES6 import

export function exposeExampleContext() {
  contextBridge.exposeInMainWorld("example", {
    doSomething: () => ipcRenderer.invoke(EXAMPLE_DO_SOMETHING),
  });
}

// 3. src/helpers/ipc/example/example-listeners.ts
import { ipcMain } from "electron";
import { EXAMPLE_DO_SOMETHING } from "./example-channels";

export function addExampleListeners() {
  ipcMain.handle(EXAMPLE_DO_SOMETHING, async () => {
    // Implementation with Node.js access (file system, etc.)
    return { success: true };
  });
}

// 4. Update src/helpers/ipc/context-exposer.ts
import { exposeExampleContext } from "./example/example-context";
export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeExampleContext(); // Add this line
}

// 5. Update src/helpers/ipc/listeners-register.ts
import { addExampleListeners } from "./example/example-listeners";
export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
  addExampleListeners(); // Add this line
}

// 6. Update src/types.d.ts
declare interface Window {
  themeMode: ThemeModeContext;
  electronWindow: ElectronWindow;
  example: {  // Add this interface
    doSomething: () => Promise<{ success: boolean }>;
  };
}
```
