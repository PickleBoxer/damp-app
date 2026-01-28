/**
 * Project type definitions for devcontainer site management
 */

import type { StorageData } from './result';
import type { ServiceId } from './service';

/**
 * Project type enum
 */
export enum ProjectType {
  BasicPhp = 'basic-php',
  Laravel = 'laravel',
  Existing = 'existing',
}

/**
 * PHP version options
 */
export type PhpVersion = '7.4' | '8.1' | '8.2' | '8.3' | '8.4';

/**
 * Node version options
 */
export type NodeVersion = 'none' | 'lts' | 'latest' | '20' | '22' | '24' | '25';

/**
 * PHP variant options
 */
export type PhpVariant = 'fpm-apache' | 'fpm-nginx' | 'frankenphp' | 'fpm';

/**
 * Laravel installer options
 */
export interface LaravelInstallerOptions {
  starterKit: 'none' | 'react' | 'vue' | 'livewire' | 'custom';
  customStarterKitUrl?: string;
  authentication: 'laravel' | 'workos' | 'none';
  useVolt: boolean;
  testingFramework: 'pest' | 'phpunit';
  installBoost: boolean;
}

/**
 * Custom credentials for bundled database services
 */
export interface BundledServiceCredentials {
  /** Database name (for database services) */
  database?: string;
  /** Username */
  username?: string;
  /** Password */
  password?: string;
  /** Root password (for MySQL/MariaDB) */
  rootPassword?: string;
}

/**
 * Bundled service configuration (embedded in project's docker-compose)
 * These services run as part of the project's devcontainer stack
 */
export interface BundledService {
  /** Service identifier from ServiceId enum */
  serviceId: ServiceId;
  /** Custom credentials (for databases) */
  customCredentials?: BundledServiceCredentials;
}

/**
 * Project configuration
 */
export interface Project {
  /** Unique project identifier (UUID) */
  id: string;
  /** Display name */
  name: string;
  /** Project type */
  type: ProjectType;
  /** Import method - whether project was created or imported */
  importMethod: 'create' | 'import';
  /** Absolute path to project folder */
  path: string;
  /** Docker volume name (damp_project_{name}) */
  volumeName: string;
  /** Local domain (e.g., myproject.local) */
  domain: string;
  /** PHP version */
  phpVersion: PhpVersion;
  /** Node version */
  nodeVersion: NodeVersion;
  /** PHP variant (image type) */
  phpVariant: PhpVariant;
  /** PHP extensions to install */
  phpExtensions: string[];
  /** Enable Claude AI devcontainer feature */
  enableClaudeAi: boolean;
  /** Port to forward (configurable, default: 8443) */
  forwardedPort: number;
  /** Docker network name (damp-network) */
  networkName: string;
  /** Post-start command (type-specific, read-only) */
  postStartCommand: string;
  /** Post-create command (Laravel only) */
  postCreateCommand: string | null;
  /** Laravel installer options (for fresh Laravel projects) */
  laravelOptions?: LaravelInstallerOptions;
  /** Bundled services embedded in project's docker-compose */
  bundledServices?: BundledService[];
  /** Display order */
  order: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Whether devcontainer files have been created */
  devcontainerCreated: boolean;
  /** Whether volume data has been copied */
  volumeCopied: boolean;
}

/**
 * Project creation input
 */
export interface CreateProjectInput {
  /** Project name */
  name: string;
  /** Project type (auto-detected for existing) */
  type?: ProjectType;
  /** Import method - whether project was created or imported */
  importMethod?: 'create' | 'import';
  /** Project folder path (selected via dialog) */
  path?: string;
  /** PHP version */
  phpVersion: PhpVersion;
  /** Node version */
  nodeVersion: NodeVersion;
  /** PHP variant */
  phpVariant: PhpVariant;
  /** PHP extensions */
  phpExtensions: string[];
  /** Enable Claude AI */
  enableClaudeAi: boolean;
  /** Override existing devcontainer files */
  overwriteExisting?: boolean;
  /** Laravel installer options (for fresh Laravel projects) */
  laravelOptions?: LaravelInstallerOptions;
  /** Bundled services to embed in project's docker-compose */
  bundledServices?: BundledService[];
}

/**
 * Project update input
 */
export interface UpdateProjectInput {
  /** Project ID */
  id: string;
  /** Updated name */
  name?: string;
  /** Updated domain */
  domain?: string;
  /** Updated PHP version */
  phpVersion?: PhpVersion;
  /** Updated Node version */
  nodeVersion?: NodeVersion;
  /** Updated PHP variant */
  phpVariant?: PhpVariant;
  /** Updated PHP extensions */
  phpExtensions?: string[];
  /** Updated Claude AI setting */
  enableClaudeAi?: boolean;
  /** Regenerate devcontainer files after update */
  regenerateFiles?: boolean;
}

/**
 * Template placeholder values
 */
export interface TemplateContext {
  projectId: string;
  projectName: string;
  volumeName: string;
  phpVersion: PhpVersion;
  nodeVersion: NodeVersion;
  phpExtensions: string;
  phpVariant: PhpVariant;
  documentRoot: string;
  networkName: string;
  forwardedPort: number;
  enableClaudeAi: boolean;
  postStartCommand: string;
  postCreateCommand: string | null;
  workspaceFolderName: string;
  launchIndexPath: string;
  /** Bundled services for docker-compose multi-container mode */
  bundledServices?: BundledService[];
}

/**
 * Template file structure
 */
export interface ProjectTemplate {
  devcontainerJson: string;
  dockerfile: string;
  launchJson: string;
  dockerignore: string;
  /** Docker compose for devcontainer (.devcontainer/docker-compose.yml) */
  devcontainerCompose: string;
  /** Docker compose for root (docker-compose.yml with dev/prod profiles) */
  rootDockerCompose: string;
}

/**
 * Folder selection result (from Electron dialog)
 */
export interface FolderSelectionResult {
  /** Whether user selected a folder */
  success: boolean;
  /** Selected folder path */
  path?: string;
  /** Whether user cancelled */
  cancelled?: boolean;
}

/**
 * Laravel detection result
 */
export interface LaravelDetectionResult {
  /** Whether Laravel was detected */
  isLaravel: boolean;
  /** Laravel version if detected */
  version?: string;
  /** Composer.json path */
  composerJsonPath?: string;
}

/**
 * Volume copy progress (step-based for bulk operations)
 */
export interface VolumeCopyProgress {
  /** Current operation stage message */
  message: string;
  /** Current step number */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Optional stage identifier */
  stage?: string;
}

/**
 * Project storage data structure
 */
export type ProjectStorageData = StorageData<Project>;
