# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-14

### Added

- Custom CSS theme editor in settings with color presets (Neutral, Zinc, Slate, Stone) for personalizing the app appearance

### Fixed

- Project preview now auto-updates via Docker events when container becomes healthy - no manual refresh needed

### Changed

- Improved Caddy reverse proxy performance with smart configuration sync
- Updated dependencies for improved security and stability

## [0.1.1] - 2026-01-07

### Fixed

- Fixed PowerShell and Command Prompt terminals failing to launch properly
- Fixed terminal commands by wrapping with `start` command for reliable execution

### Added

- Added "System Default" terminal option that uses the OS-configured default terminal
- Changed default terminal setting from Windows Terminal to System Default for better compatibility

## [0.1.0] - 2025-01-06

### Added

- Initial release of Damp - Docker local development environment manager
- Project management with Docker Compose support
- Service management (MySQL, PostgreSQL, Redis, Mailpit, etc.)
- Ngrok integration for external access
- File synchronization for projects
- Docker container monitoring and logs
- Auto-update functionality

### Technical

- Built with Electron 38 and React 19
- TanStack Router for navigation
- TanStack Query for state management
- Shadcn UI component library
- Tailwind CSS v4 for styling

[0.2.0]: https://github.com/PickleBoxer/damp-app/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/PickleBoxer/damp-app/releases/tag/v0.1.1
[0.1.0]: https://github.com/PickleBoxer/damp-app/releases/tag/v0.1.0
