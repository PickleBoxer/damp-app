# Resources Folder

This folder contains static assets (icons, binaries, etc.) that are required by the application at runtime in both development and production environments.

## Folder Structure

```
resources/
├── icons/          # Application and tray icons
│   ├── icon.ico    # Windows icon
│   ├── icon.icns   # macOS icon
│   └── icon.png    # Linux icon (and fallback)
└── bin/            # Binary executables
    └── hostie.exe  # Windows hosts file manager
```

## How It Works

### Development
- Resources are accessed directly from this folder at project root
- Path resolution: `app.getAppPath() + '/resources'`

### Production (Packaged App)
- Electron Forge copies this entire folder to the app's resources directory during build
- Configured via `extraResource: ['resources']` in `forge.config.ts`
- Path resolution: `process.resourcesPath`

## Access Pattern

Always use the `getResourcePath()` helper function from `src/main/utils/resource-path.ts`:

```typescript
import { getResourcePath } from '@main/utils/resource-path';

// Access any resource
const binaryPath = getResourcePath('bin/hostie.exe');
const iconPath = getResourcePath('icons/icon.png');
```

For icons specifically, use the `getIconPath()` helper which handles platform detection:

```typescript
import { getIconPath } from '@main/utils/icon-path';

// Automatically selects .ico (Windows), .icns (macOS), or .png (Linux)
const trayIconPath = getIconPath('tray');
```

## Icon Requirements

### Windows (`.ico`)
- ICO format recommended for best visual effects
- Should include multiple sizes: 16x16, 32x32, 48x48, 256x256

### macOS (`.icns`)
- ICNS format for app icon
- For tray icons: Consider using template images (monochrome PNG)
- Recommended sizes: 16x16@72dpi and 32x32@144dpi (@2x for retina)
- Template images enable automatic dark mode color inversion

### Linux (`.png`)
- PNG format recommended
- Multiple sizes appreciated by different desktop environments

## Adding New Resources

1. Place files in the appropriate subfolder (`icons/`, `bin/`, etc.)
2. Access them using `getResourcePath('subfolder/filename')`
3. No build configuration changes needed - `extraResource` copies everything

## Important Notes

- ⚠️ **Never use hardcoded paths** like `'/icon/icon.ico'` or string concatenation
- ✅ **Always use helper functions** (`getResourcePath`, `getIconPath`) for cross-platform compatibility
- ✅ **The `app.isPackaged` check is required** - dev and production paths differ
- 📦 Files in this folder are NOT bundled in the ASAR archive - they remain as regular files
- 🔒 Binary executables must remain outside ASAR for execution permissions
