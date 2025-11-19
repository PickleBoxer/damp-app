/**
 * Project type definitions for devcontainer site management
 */

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
export type NodeVersion = 'none' | 'lts' | 'latest' | '20' | '22';

/**
 * Common PHP extensions
 */
export const COMMON_PHP_EXTENSIONS = [
  'bcmath',
  'pdo_mysql',
  'pdo_pgsql',
  'pcntl',
  'gd',
  'zip',
  'intl',
  'opcache',
  'redis',
  'memcached',
  'xdebug',
] as const;

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
  /** PHP extensions to install */
  phpExtensions: string[];
  /** Enable Claude AI devcontainer feature */
  enableClaudeAi: boolean;
  /** Port to forward (static: 8080) */
  forwardedPort: number;
  /** Docker network name (damp-network) */
  networkName: string;
  /** Post-start command (type-specific, read-only) */
  postStartCommand: string;
  /** Post-create command (Laravel only) */
  postCreateCommand: string | null;
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
  /** Project folder path (selected via dialog) */
  path?: string;
  /** PHP version */
  phpVersion: PhpVersion;
  /** Node version */
  nodeVersion: NodeVersion;
  /** PHP extensions */
  phpExtensions: string[];
  /** Enable Claude AI */
  enableClaudeAi: boolean;
  /** Override existing devcontainer files */
  overwriteExisting?: boolean;
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
  projectName: string;
  volumeName: string;
  phpVersion: PhpVersion;
  nodeVersion: NodeVersion;
  phpExtensions: string;
  phpVariant?: string;
  networkName: string;
  containerName: string;
  forwardedPort: number;
  enableClaudeAi: boolean;
  postStartCommand: string;
  postCreateCommand: string | null;
  workspaceFolderName: string;
  launchIndexPath: string;
}

/**
 * Template file structure
 */
export interface ProjectTemplate {
  devcontainerJson: string;
  dockerfile: string;
  launchJson: string;
}

/**
 * Project operation result
 */
export interface ProjectOperationResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Additional data returned by operation */
  data?: unknown;
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
}

/**
 * Project storage data structure
 */
export interface ProjectStorageData {
  /** Map of project ID to project */
  projects: Record<string, Project>;
  /** Version of storage schema */
  version: string;
  /** Last updated timestamp */
  lastUpdated: number;
}
