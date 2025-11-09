# Projects Feature Implementation

## Overview

The Projects feature enables users to create and manage PHP development projects with devcontainer configurations. It automatically sets up Docker volumes, devcontainer files, host file entries, and provides a complete development environment for Basic PHP, Laravel, and existing projects.

## Architecture

### Backend Components

#### 1. Type Definitions (`src/types/project.ts`)

- **ProjectType enum**: `BasicPhp`, `Laravel`, `Existing`
- **PhpVersion**: `'7.4' | '8.1' | '8.2' | '8.3' | '8.4'`
- **NodeVersion**: `'none' | 'lts' | 'latest' | '20' | '22'`
- **Project interface**: Complete project structure with metadata
- **CreateProjectInput**: Input validation schema
- Template constants: `DEFAULT_PHP_INI`, `DEFAULT_XDEBUG_INI`

#### 2. Project Templates (`src/services/projects/project-templates.ts`)

Generates devcontainer configuration files:

- `devcontainer.json` - VS Code devcontainer configuration
- `Dockerfile` - Custom PHP + Apache + Node.js image
- `php.ini` - PHP configuration
- `xdebug.ini` - Xdebug configuration
- `.vscode/launch.json` - Debug configuration for VS Code

#### 3. Project Storage (`src/services/projects/project-storage.ts`)

JSON-based persistence layer:

- Storage location: `app.getPath('userData')/projects-state.json`
- Methods: `getAllProjects()`, `getProject()`, `setProject()`, `deleteProject()`, `reorderProjects()`
- Auto-sorts projects by `order` field

#### 4. Volume Manager (`src/services/projects/volume-manager.ts`)

Docker volume operations:

- Creates Docker volumes with `damp_site_{name}` naming convention
- Copies project files to volume using tar-stream
- Progress tracking for large file copies
- Excludes `.git`, `node_modules`, and other ignored directories

#### 5. Project State Manager (`src/services/projects/project-state-manager.ts`)

Core business logic coordinator (600+ lines):

**Key Features:**

- **Name Sanitization**: Converts project names to URL-safe format (lowercase, alphanumeric + hyphens)
- **Folder Creation**: Automatically creates `{parentPath}/{sanitized-name}` directory
- **Laravel Detection**: Auto-detects Laravel projects via `composer.json` analysis
- **PHP Version Validation**: Ensures Laravel projects use PHP 8.2+
- **Hosts File Management**: Adds/removes `{name}.local` entries via hostile package
- **Docker Network**: All projects join `damp-network` for service communication
- **Progress Callbacks**: Reports volume copy progress to renderer

**Project Creation Flow:**

1. Sanitize project name for URL/folder compatibility
2. Create site folder in parent directory: `{parentPath}/{sanitized-name}`
3. Detect Laravel if project type is "existing"
4. Validate PHP version requirements
5. Create project object with metadata
6. Create Docker volume
7. Generate devcontainer files
8. Copy local files to volume with progress tracking
9. Update hosts file (requires admin on Windows)
10. Save to storage

#### 6. IPC Layer (`src/helpers/ipc/projects/`)

Three-layer pattern (Channels → Context → Listeners):

**Channels** (`projects-channels.ts`):

```typescript
PROJECTS_GET_ALL;
PROJECTS_GET;
PROJECTS_CREATE;
PROJECTS_UPDATE;
PROJECTS_DELETE;
PROJECTS_REORDER;
PROJECTS_COPY_TO_VOLUME;
PROJECTS_SELECT_FOLDER;
PROJECTS_DETECT_LARAVEL;
PROJECTS_DEVCONTAINER_EXISTS;
PROJECTS_COPY_PROGRESS;
```

**Context** (`projects-context.ts`):
Exposes `window.projects` API to renderer via `contextBridge`

**Listeners** (`projects-listeners.ts`):
Registers `ipcMain.handle()` for all project operations

### Frontend Components

#### 1. API Wrapper (`src/api/projects/projects-api.ts`)

Type-safe IPC wrappers:

- `getAllProjects()`, `getProject()`, `createProject()`, etc.
- `selectFolder()` - Opens folder selection dialog
- `detectLaravel()` - Checks for Laravel installation
- `subscribeToCopyProgress()` - Progress event subscription

#### 2. React Query Hooks (`src/api/projects/projects-queries.ts`)

State management with optimistic updates:

- `useProjects()` - Fetches all projects with auto-refresh
- `useProject(id)` - Fetches single project
- `useCreateProject()` - Create mutation with invalidation
- `useUpdateProject()` - Update with optimistic updates
- `useDeleteProject()` - Delete with confirmation
- `useReorderProjects()` - Drag-and-drop reordering with rollback
- `useCopyProjectToVolume()` - Volume copy with progress

#### 3. Project Icon (`src/components/ProjectIcon.tsx`)

Displays type-specific icons:

- **Laravel**: Custom SVG logo
- **Basic PHP**: `Code2` icon from lucide-react
- **Existing**: `Package` icon from lucide-react

#### 4. Project Actions (`src/components/ProjectActions.tsx`)

Dropdown menu with actions:

- **Open in VS Code**: Launch VS Code with devcontainer (TODO: IPC implementation)
- **Copy to Volume**: Trigger volume copy operation
- **Delete**: Remove project with options for volume/folder cleanup

#### 5. Create Project Wizard (`src/components/CreateProjectWizard.tsx`)

Multi-step dialog for project creation:

**Step 1 - Project Type:**

- Basic PHP, Laravel, or Existing project selection
- Visual cards with descriptions

**Step 2 - Basic Information:**

- Project name input (auto-sanitized by backend)
- Parent folder selection (site folder created inside)
- Real-time validation

**Step 3 - Configuration:**

- PHP version selector (7.4, 8.1, 8.2, 8.3, 8.4)
- Node.js version selector (none, lts, latest, 20, 22)
- Claude AI integration toggle
- Laravel validation (requires PHP 8.2+)

**Step 4 - PHP Extensions:**

- Default extensions (pre-selected)
- Optional extensions (click to toggle)
- Scrollable badge list

**Step 5 - Review & Create:**

- Summary of all selections
- Final path preview
- Create button with loading state

#### 6. Projects Page (`src/routes/projects.tsx`)

**Split-view layout (50/50):**

**Left Side:**

- Header with "New Project" button
- Scrollable project list
- Each project shows:
  - Type icon
  - Name and domain
  - Status badges (devcontainer, volume)
  - Selection highlight
- Empty state with CTA

**Right Side:**

- `<Outlet />` for detail view
- Routes to `projects.$projectId.tsx`

#### 7. Project Detail Page (`src/routes/projects.$projectId.tsx`)

Detailed project view:

- Header with icon, name, domain
- Action buttons dropdown
- Status badges section
- Configuration grid (PHP, Node, network, port, etc.)
- PHP extensions list
- Commands display (post-start, post-create)
- Timestamps (created, updated)
- Loading skeleton state
- Empty state message

## Key Design Decisions

### 1. Name Sanitization (Backend)

**Why backend?** Ensures consistency and prevents client-side bypasses.

**Implementation:**

```typescript
private sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
```

**Example:** `"My Awesome Project!"` → `my-awesome-project`

### 2. Parent Folder Pattern

User selects parent directory, backend creates site folder inside:

- **Input**: `C:\Sites` (parent)
- **Output**: `C:\Sites\my-awesome-project` (auto-created)

### 3. Domain Convention

All projects use `.local` TLD with sanitized name:

- `my-awesome-project.local`
- Automatically added to hosts file (requires admin)

### 4. Volume Naming

Consistent naming: `damp_site_{sanitized-name}`

- Example: `damp_site_my-awesome-project`

### 5. Network Integration

All projects join `damp-network` for service connectivity:

- Can communicate with services (MySQL, Redis, etc.)
- Shared network across all projects and services

### 6. Split-View vs Sheet

**Projects use split-view, Services use sheet. Why?**

- Projects: Persistent detail view encourages configuration review
- Services: Quick actions don't need persistent sidebar

## File Structure

```
src/
├── types/
│   └── project.ts                    # Type definitions
├── services/
│   └── projects/
│       ├── project-state-manager.ts  # Core business logic
│       ├── project-storage.ts        # JSON persistence
│       ├── project-templates.ts      # Devcontainer generation
│       └── volume-manager.ts         # Docker operations
├── helpers/
│   └── ipc/
│       └── projects/
│           ├── projects-channels.ts  # IPC constants
│           ├── projects-context.ts   # Context bridge
│           └── projects-listeners.ts # Main process handlers
├── api/
│   └── projects/
│       ├── projects-api.ts           # Type-safe wrappers
│       └── projects-queries.ts       # React Query hooks
├── components/
│   ├── ProjectIcon.tsx               # Type icons
│   ├── ProjectActions.tsx            # Action buttons
│   └── CreateProjectWizard.tsx       # Creation wizard
└── routes/
    ├── projects.tsx                  # List page (split-view)
    └── projects.$projectId.tsx       # Detail page
```

## Common Operations

### Creating a Project

1. Click "New Project" button
2. Complete 5-step wizard
3. Backend sanitizes name and creates folder
4. Devcontainer files generated
5. Docker volume created and populated
6. Hosts file updated
7. Project saved to storage
8. UI refreshes via React Query

### Copying to Volume

- Triggered manually or during creation
- Uses tar-stream for efficient file transfer
- Progress events emitted to renderer
- Excludes `.git`, `node_modules`, etc.

### Opening in VS Code

- TODO: Implement IPC call to launch VS Code
- Should open folder with `.devcontainer` directory
- VS Code will detect and offer to reopen in container

### Deleting a Project

- Confirmation dialog with options:
  - Remove Docker volume
  - Remove project folder
- Removes hosts file entry
- Removes from storage
- UI updates optimistically

## Dependencies

### Backend

- **electron**: Dialog API for folder selection
- **node:fs/promises**: Async file operations
- **node:path**: Cross-platform path handling
- **hostile**: Hosts file management
- **dockerode**: Docker API client
- **tar-stream**: Efficient file streaming to volumes

### Frontend

- **@tanstack/react-router**: File-based routing
- **@tanstack/react-query**: State management
- **shadcn/ui**: Dialog, Button, Badge, Input, etc.
- **lucide-react**: Icons

## Security Considerations

1. **Context Isolation**: Enabled - no `nodeIntegration`
2. **IPC Validation**: All inputs validated in listeners
3. **Path Sanitization**: Prevents directory traversal
4. **Admin Privileges**: Hosts file updates may require elevation on Windows
5. **Docker Access**: Requires Docker daemon running

## Future Enhancements

- [ ] Implement VS Code launch via IPC
- [ ] Add project import/export functionality
- [ ] Support for additional project types (Symfony, WordPress, etc.)
- [ ] Custom port configuration per project
- [ ] Project templates library
- [ ] Backup/restore functionality
- [ ] Multi-container projects (separate DB, Redis, etc.)
