# Shell IPC Module

External application launcher for DAMP desktop app. Opens folders, browsers, editors, terminals, and Tinker for Laravel projects.

## Architecture

Follows the standard 3-layer IPC pattern:

```
shell-channels.ts    → Channel constants
shell-context.ts     → Renderer → Main bridge
shell-listeners.ts   → Main process handlers
shell_helpers.ts     → Renderer wrapper functions
```

## Usage (Renderer Process)

```typescript
import {
  openProjectFolder,
  openProjectInBrowser,
  openProjectInEditor,
  openProjectTerminal,
  openProjectTinker,
} from '@/helpers/shell_helpers';

// All functions return { success: boolean; error?: string }
const result = await openProjectInBrowser(projectId);

if (result.success) {
  toast.success('Opening browser...');
} else {
  toast.error(result.error);
}
```

## Available Actions

| Function                          | Description                              | Platform Support      |
| --------------------------------- | ---------------------------------------- | --------------------- |
| `openProjectFolder(projectId)`    | Opens project path in file manager       | Windows, macOS, Linux |
| `openProjectInBrowser(projectId)` | Opens project domain in default browser  | Windows, macOS, Linux |
| `openProjectInEditor(projectId)`  | Opens project in VS Code                 | Windows, macOS, Linux |
| `openProjectTerminal(projectId)`  | Opens terminal at project path           | Windows, macOS, Linux |
| `openProjectTinker(projectId)`    | Opens terminal with `php artisan tinker` | Windows, macOS, Linux |

## Security

- **UUID validation** via Zod schema
- **Project whitelist** - only projects in storage can be accessed
- **Context isolation** enforced via `contextBridge`
- No direct file system access from renderer

## Platform Implementations

### Windows (Primary)

- **Terminal**: Windows Terminal (`wt.exe`) with PowerShell
- **Editor**: VS Code (`code` command)
- **Tinker**: `wt.exe -d "path" pwsh -NoExit -Command "php artisan tinker"`

### macOS

- **Terminal**: Terminal.app
- **Editor**: VS Code (`code` command)
- **Tinker**: AppleScript to open Terminal with command

### Linux

- **Terminal**: `x-terminal-emulator`
- **Editor**: VS Code (`code` command)
- **Tinker**: Terminal with bash wrapper

## Configuration (Future)

Settings are stored in localStorage and configurable via the Settings page (`/settings` route).

### Current Settings

- **Editor**: VS Code, VS Code Insiders, Cursor
- **Terminal**: Windows Terminal, PowerShell, Command Prompt

### Implementation

Settings are stored in `localStorage` with key `damp-settings`:

```typescript
interface AppSettings {
  defaultEditor: 'code' | 'code-insiders' | 'cursor' | 'custom';
  defaultTerminal: 'wt' | 'powershell' | 'cmd' | 'custom';
}
```

Settings are automatically read from localStorage when shell helpers are called and passed to the main process via IPC.

## Error Handling

All functions return a result object:

```typescript
interface ShellOperationResult {
  success: boolean;
  error?: string;
}
```

Common errors:

- `"Project with ID {id} not found"` - Invalid/missing project
- `"VS Code not found. Please install..."` - Editor not in PATH
- `"Failed to open terminal"` - Terminal command failed

## Example Integration

```typescript
const handleOpenVSCode = async () => {
  const result = await openProjectInEditor(project.id);

  if (result.success) {
    toast.success('Opening in VS Code...');
  } else {
    toast.error(result.error || 'Failed to open VS Code');
  }
};
```

## Adding New Shell Actions

1. Add channel constant to `shell-channels.ts`
2. Add function to `ShellContext` interface in `shell-context.ts`
3. Implement handler in `shell-listeners.ts` with Zod validation
4. Add wrapper function to `shell_helpers.ts`
5. Update `Window.shell` type in `types.d.ts`
