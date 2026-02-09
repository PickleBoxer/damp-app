# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-09

### Added

- Bundled Services: Per-project databases (MySQL, PostgreSQL, MongoDB) and admin tools (phpMyAdmin, Adminer, pgAdmin, mongo-express) that run alongside specific projects (PR #27, #29, #31)
- Credentials viewer for bundled services with copy-to-clipboard functionality (PR #29)
- Database operations support for bundled services (dump, restore, copy between services) (PR #31)
- Real-time Caddy certificate verification to ensure HTTPS is properly configured (PR #37)
- Enhanced service credentials UI with improved copy functionality (PR #b9cb3b4)

### Fixed

- Cleanup bundled service volumes when deleting projects to prevent orphaned data (PR #38)
- Distinguish bundled vs global services in Docker operations for proper isolation (PR #34)
- Docs download page now waits for API fetch before auto-downloading latest release

### Changed

- Redesigned resources table with grouping and improved pagination for better organization (PR #32)
- Refactored Docker integration to use containers as source of truth, simplifying image pull API (PR #30)
- Unified credential components and separated admin URLs for cleaner architecture (PR #36)
- Unified service container state queries for bundled services (PR #35)
- Replaced delete button with actions dropdown menu for more options (PR #33)
- Replaced lucide-react with @tabler/icons-react for improved icon consistency
- General stability and performance improvements across bundled services and Docker operations

## [0.3.0] - 2026-01-26

### Added

- Resources management UI for Docker: view, group, and clean up containers and related items (PR #25)
- Database tools to dump and restore project data across MySQL/MariaDB/PostgreSQL/MongoDB (PR #20)
- Docs site integrated into monorepo; Download page now uses GitHub Releases API for latest assets (PR #16, #17)
- Simplified local service credentials defaults and UX to speed up setup (PR #19)

### Fixed

- Auto-pull missing Docker images before use to prevent startup failures (PR #22)
- Reconcile service state when containers are deleted externally for accurate UI (PR #23)
- Reliability fixes for database operations and service installation flows (PR #24)
- Updated MySQL healthcheck command for improved stability

### Changed

- General stability and performance improvements across resources and services

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

[0.4.0]: https://github.com/PickleBoxer/damp-app/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/PickleBoxer/damp-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/PickleBoxer/damp-app/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/PickleBoxer/damp-app/releases/tag/v0.1.1
[0.1.0]: https://github.com/PickleBoxer/damp-app/releases/tag/v0.1.0
