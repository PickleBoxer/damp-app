/**
 * Project state manager
 * Coordinates project lifecycle: create, update, delete, and file generation
 */

import { dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import semver from 'semver';
import { addHostEntry, removeHostEntry } from '@main/utils/hosts';
import { createLogger } from '@main/utils/logger';

const logger = createLogger('ProjectStateManager');
import type {
  Project,
  ProjectType,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectOperationResult,
  FolderSelectionResult,
  LaravelDetectionResult,
  VolumeCopyProgress,
  PhpVersion,
  TemplateContext,
} from '@shared/types/project';
import { projectStorage } from './project-storage';
import { volumeManager } from './volume-manager';
import {
  generateIndexPhp,
  generateProjectTemplates,
  getPostCreateCommand,
  getPostStartCommand,
} from './project-templates';
import { syncProjectsToCaddy } from '../docker/caddy-config';
import { installLaravelToVolume } from './laravel-installer';
import { FORWARDED_PORT } from '@shared/constants/ports';

const DOCKER_NETWORK = 'damp-network';
const LARAVEL_MIN_PHP_VERSION = '8.2';

/**
 * Project state manager class
 */
class ProjectStateManager {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the project manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await projectStorage.initialize();
      this.initialized = true;
      logger.info('Project state manager initialized');
    } catch (error) {
      logger.error('Failed to initialize project state manager:', error);
      throw error;
    }
  }

  /**
   * Check initialization
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Project manager not initialized. Call initialize() first.');
    }
  }

  /**
   * Open folder selection dialog
   */
  async selectFolder(defaultPath?: string): Promise<FolderSelectionResult> {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        defaultPath,
        title: 'Select Project Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      return {
        success: true,
        path: result.filePaths[0],
      };
    } catch (error) {
      logger.error('Failed to open folder selection dialog:', error);
      return {
        success: false,
        cancelled: false,
      };
    }
  }

  /**
   * Detect if a folder contains a Laravel project
   * Requires BOTH composer.json with laravel/framework AND artisan file for high confidence
   */
  async detectLaravel(folderPath: string): Promise<LaravelDetectionResult> {
    try {
      const composerJsonPath = path.join(folderPath, 'composer.json');
      const artisanPath = path.join(folderPath, 'artisan');

      // Check if composer.json exists
      const composerExists = await fs
        .access(composerJsonPath)
        .then(() => true)
        .catch(() => false);

      if (!composerExists) {
        return { isLaravel: false };
      }

      // Read composer.json
      const content = await fs.readFile(composerJsonPath, 'utf-8');
      const composerJson = JSON.parse(content) as {
        require?: Record<string, string>;
        'require-dev'?: Record<string, string>;
      };

      // Check for Laravel package in composer.json
      const hasLaravelInComposer =
        'laravel/framework' in (composerJson.require || {}) ||
        'laravel/framework' in (composerJson['require-dev'] || {});

      // Check if artisan file exists
      const artisanExists = await fs
        .access(artisanPath)
        .then(() => true)
        .catch(() => false);

      // Require BOTH composer.json with Laravel AND artisan file for high confidence detection
      if (hasLaravelInComposer && artisanExists) {
        // Try to extract Laravel version
        const version =
          composerJson.require?.['laravel/framework'] ||
          composerJson['require-dev']?.['laravel/framework'];

        logger.info(
          `High-confidence Laravel detection: composer.json + artisan file present (version: ${version || 'unknown'})`
        );

        return {
          isLaravel: true,
          version,
          composerJsonPath,
        };
      }

      // If either check fails, treat as non-Laravel project
      if (hasLaravelInComposer && !artisanExists) {
        logger.info(
          'Laravel package found in composer.json but artisan file missing - treating as non-Laravel'
        );
      }

      return { isLaravel: false };
    } catch (error) {
      logger.error('Error detecting Laravel:', error);
      return { isLaravel: false };
    }
  }

  /**
   * Check if devcontainer folder exists
   */
  async devcontainerExists(folderPath: string): Promise<boolean> {
    try {
      const devcontainerPath = path.join(folderPath, '.devcontainer');
      await fs.access(devcontainerPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate domain name from project name (expects pre-sanitized name)
   */
  private generateDomain(projectName: string): string {
    return `${projectName}.local`;
  }

  /**
   * Generate volume name from project name (expects pre-sanitized name)
   */
  private generateVolumeName(projectName: string): string {
    return `damp_project_${projectName}`;
  }

  /**
   * Generate container name from project name (expects pre-sanitized name)
   */
  private generateContainerName(projectName: string): string {
    return `${projectName}_container`;
  }

  /**
   * Validate PHP version for Laravel projects
   */
  private validatePhpVersion(type: ProjectType, phpVersion: PhpVersion): ProjectOperationResult {
    if (type === 'laravel') {
      // Normalize PHP versions to semver format (add .0 if needed)
      const normalizeVersion = (version: string): string => {
        const parts = version.split('.');
        return parts.length === 2 ? `${version}.0` : version;
      };

      const normalizedPhpVersion = normalizeVersion(phpVersion);
      const normalizedMinVersion = normalizeVersion(LARAVEL_MIN_PHP_VERSION);

      if (semver.lt(normalizedPhpVersion, normalizedMinVersion)) {
        return {
          success: false,
          error: `Laravel requires PHP ${LARAVEL_MIN_PHP_VERSION} or higher. Selected version: ${phpVersion}`,
        };
      }
    }

    return { success: true };
  }

  /**
   * Create devcontainer files for a project
   */
  private async createDevcontainerFiles(
    project: Project,
    overwrite = false
  ): Promise<ProjectOperationResult> {
    try {
      const devcontainerPath = path.join(project.path, '.devcontainer');
      const vscodePath = path.join(project.path, '.vscode');

      // Check if .devcontainer exists and overwrite is false
      if (!overwrite && (await this.devcontainerExists(project.path))) {
        return {
          success: false,
          error: 'Devcontainer folder already exists. Set overwrite=true to replace.',
        };
      }

      // Create directories
      await fs.mkdir(devcontainerPath, { recursive: true });
      await fs.mkdir(vscodePath, { recursive: true });

      // Build template context
      const context: TemplateContext = {
        projectName: project.name,
        volumeName: project.volumeName,
        phpVersion: project.phpVersion,
        phpVariant: project.phpVariant,
        nodeVersion: project.nodeVersion,
        phpExtensions: project.phpExtensions.join(' '),
        documentRoot:
          project.importMethod === 'import' && project.type === 'laravel'
            ? '/var/www/html/public'
            : project.importMethod === 'import'
              ? '/var/www/html'
              : '/var/www/html/public',
        networkName: project.networkName,
        containerName: this.generateContainerName(project.name),
        forwardedPort: project.forwardedPort,
        enableClaudeAi: project.enableClaudeAi,
        postStartCommand: project.postStartCommand,
        postCreateCommand: project.postCreateCommand,
        workspaceFolderName: path.basename(project.path),
        launchIndexPath: project.type === 'laravel' ? 'public/' : '',
      };

      // Generate templates
      const templates = generateProjectTemplates(context);

      // Write devcontainer files
      await fs.writeFile(
        path.join(devcontainerPath, 'devcontainer.json'),
        templates.devcontainerJson,
        'utf-8'
      );
      await fs.writeFile(path.join(vscodePath, 'launch.json'), templates.launchJson, 'utf-8');

      // Write production files to project root
      await fs.writeFile(path.join(project.path, 'Dockerfile'), templates.dockerfile, 'utf-8');
      await fs.writeFile(path.join(project.path, '.dockerignore'), templates.dockerignore, 'utf-8');
      await fs.writeFile(
        path.join(project.path, 'docker-compose.yml'),
        templates.dockerCompose,
        'utf-8'
      );

      // Create index.php for basic-php projects if it doesn't exist
      if (project.type === 'basic-php') {
        // Create index.php in public/ folder if needed
        const publicPath = path.join(project.path, 'public');
        const indexPath = path.join(publicPath, 'index.php');
        const indexExists = await fs
          .access(indexPath)
          .then(() => true)
          .catch(() => false);

        if (!indexExists) {
          // Ensure public directory exists
          await fs.mkdir(publicPath, { recursive: true });

          const indexContent = generateIndexPhp(project.name, project.phpVersion);
          await fs.writeFile(indexPath, indexContent, 'utf-8');
          logger.info(`Created public/index.php for project ${project.name}`);
        }
      }

      logger.info(`Created devcontainer files for project ${project.name}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create devcontainer files: ${error}`,
      };
    }
  }

  /**
   * Add domain to hosts file via sudo-prompt elevation
   */
  private async addDomainToHosts(domain: string): Promise<void> {
    const result = await addHostEntry('127.0.0.1', domain);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add domain to hosts file');
    }
  }

  /**
   * Remove domain from hosts file via sudo-prompt elevation
   */
  private async removeDomainFromHosts(domain: string): Promise<void> {
    const result = await removeHostEntry('127.0.0.1', domain);
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove domain from hosts file');
    }
  }

  /**
   * Sanitize project name for URL and folder compatibility
   * This is the single source of truth for name transformation.
   * All project names are sanitized once at creation and stored in project.name.
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }

  /**
   * Create a new project
   */
  async createProject(
    input: CreateProjectInput,
    onProgress?: (progress: VolumeCopyProgress) => void
  ): Promise<ProjectOperationResult> {
    this.ensureInitialized();

    // Track what we've created for rollback
    let projectPath: string | null = null;
    let folderCreated = false;
    let volumeCreated = false;
    let domainAdded = false;
    let project: Project | null = null;

    try {
      // Step 1: Determine import method and handle folder path
      let parentPath = input.path;
      let projectType: ProjectType = (input.type as ProjectType) || 'basic-php';
      const importMethod: 'create' | 'import' = projectType === 'existing' ? 'import' : 'create';
      let nameToSanitize = input.name;

      if (!parentPath) {
        const folderResult = await this.selectFolder();
        if (!folderResult.success || !folderResult.path) {
          return {
            success: false,
            error: 'No folder selected',
          };
        }
        parentPath = folderResult.path;
      }

      // For existing projects, use the selected folder directly as project path
      // For new projects, create a subfolder inside the parent directory
      if (importMethod === 'import') {
        // Use selected folder directly as the project path
        projectPath = parentPath;
        // Extract folder name from path for sanitization
        nameToSanitize = path.basename(parentPath);
      } else {
        // Sanitize name first for new projects
        const sanitizedName = this.sanitizeName(nameToSanitize);
        // Create subfolder inside parent directory
        projectPath = path.join(parentPath, sanitizedName);

        // Create the site folder if it doesn't exist
        try {
          await fs.access(projectPath);
        } catch {
          // Folder doesn't exist, create it
          await fs.mkdir(projectPath, { recursive: true });
          folderCreated = true;
        }
      }

      // Step 2: Sanitize the project name (either from input or extracted from folder)
      const sanitizedName = this.sanitizeName(nameToSanitize);

      // Step 3: Detect Laravel for existing projects
      if (importMethod === 'import') {
        const laravelDetection = await this.detectLaravel(projectPath);
        if (laravelDetection.isLaravel) {
          projectType = 'laravel' as ProjectType;
          logger.info(`Detected Laravel project: ${laravelDetection.version || 'unknown version'}`);
        } else {
          projectType = 'basic-php' as ProjectType;
          logger.info('No Laravel detected, using basic PHP configuration');
        }
      }

      // Step 4: Validate PHP version
      const validationResult = this.validatePhpVersion(projectType, input.phpVersion);
      if (!validationResult.success) {
        throw new Error(validationResult.error);
      }

      // Step 5: Check if devcontainer exists (warn if not overwriting)
      const devcontainerExistsFlag = await this.devcontainerExists(projectPath);
      if (devcontainerExistsFlag && !input.overwriteExisting) {
        throw new Error(
          'Devcontainer folder already exists in this project. Set overwriteExisting=true to replace it.'
        );
      }

      // Step 6: Create project object
      project = {
        id: randomUUID(),
        name: sanitizedName,
        type: projectType,
        importMethod,
        path: projectPath,
        volumeName: this.generateVolumeName(sanitizedName),
        containerName: this.generateContainerName(sanitizedName),
        domain: this.generateDomain(sanitizedName),
        phpVersion: input.phpVersion,
        phpVariant: input.phpVariant,
        nodeVersion: input.nodeVersion,
        phpExtensions: input.phpExtensions,
        enableClaudeAi: input.enableClaudeAi,
        forwardedPort: FORWARDED_PORT,
        networkName: DOCKER_NETWORK,
        postStartCommand: getPostStartCommand(),
        postCreateCommand: getPostCreateCommand(),
        laravelOptions: input.laravelOptions,
        order: projectStorage.getNextOrder(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        devcontainerCreated: false,
        volumeCopied: false,
      };

      // Step 7: Create Docker volume
      if (onProgress) {
        onProgress({
          message: `Creating Docker volume: ${project.volumeName}`,
          currentStep: 1,
          totalSteps: 10,
          percentage: 10,
          stage: 'creating-volume',
        });
      }
      await volumeManager.createVolume(project.volumeName);
      volumeCreated = true;

      // Step 7a: Install Laravel if fresh Laravel project
      if (input.laravelOptions) {
        logger.info('Installing fresh Laravel project to volume...');
        await installLaravelToVolume(
          project.volumeName,
          sanitizedName,
          input.laravelOptions,
          onProgress
        );
      }

      // Step 8: Create devcontainer files
      if (onProgress) {
        onProgress({
          message: 'Generating devcontainer configuration files...',
          currentStep: 5,
          totalSteps: 10,
          percentage: 60,
          stage: 'creating-devcontainer',
        });
      }
      const filesResult = await this.createDevcontainerFiles(project, input.overwriteExisting);
      if (!filesResult.success) {
        throw new Error(filesResult.error);
      }
      project.devcontainerCreated = true;

      // Step 9: Copy local files to volume (for non-Laravel or copy devcontainer for Laravel)
      if (onProgress) {
        onProgress({
          message: 'Copying project files to Docker volume...',
          currentStep: 7,
          totalSteps: 10,
          percentage: 80,
          stage: 'copying-files',
        });
      }
      await volumeManager.copyToVolume(projectPath, project.volumeName, onProgress);
      project.volumeCopied = true;

      // Step 10: Update hosts file
      if (onProgress) {
        onProgress({
          message: `Adding domain ${project.domain} to hosts file...`,
          currentStep: 9,
          totalSteps: 10,
          percentage: 90,
          stage: 'updating-hosts',
        });
      }
      try {
        await this.addDomainToHosts(project.domain);
        domainAdded = true;
        logger.info(`Added domain ${project.domain} to hosts file`);
      } catch (error) {
        logger.warn('Failed to update hosts file (may require admin privileges):', error);
        // Continue anyway - not critical
      }

      // Step 11: Save project to storage
      if (onProgress) {
        onProgress({
          message: 'Saving project configuration...',
          currentStep: 10,
          totalSteps: 10,
          percentage: 95,
          stage: 'saving-project',
        });
      }
      await projectStorage.setProject(project);

      // Step 12: Sync project to Caddy (non-blocking)
      syncProjectsToCaddy().catch(error => {
        logger.warn('Failed to sync project to Caddy:', error);
      });

      logger.info(`Project ${project.name} created successfully`);

      // Final completion message
      if (onProgress) {
        onProgress({
          message: '✓ Project setup complete!',
          currentStep: 10,
          totalSteps: 10,
          percentage: 100,
          stage: 'complete',
        });
      }

      return {
        success: true,
        data: { project },
      };
    } catch (error) {
      logger.error('Failed to create project, rolling back changes:', error);

      // Rollback in reverse order
      try {
        // Remove domain from hosts file if added
        if (domainAdded && project) {
          try {
            await this.removeDomainFromHosts(project.domain);
            logger.info('Rollback: Removed domain from hosts file');
          } catch (rollbackError) {
            logger.warn('Rollback failed: Could not remove domain from hosts file', rollbackError);
          }
        }

        // Remove Docker volume if created (this removes all contents including Laravel files)
        if (volumeCreated && project) {
          try {
            await volumeManager.removeVolume(project.volumeName);
            logger.info('Rollback: Removed Docker volume');
          } catch (rollbackError) {
            logger.warn('Rollback failed: Could not remove volume', rollbackError);
          }
        }

        // Remove project folder if we created it
        if (folderCreated && projectPath) {
          try {
            await fs.rm(projectPath, { recursive: true, force: true });
            logger.info('Rollback: Removed project folder');
          } catch (rollbackError) {
            logger.warn('Rollback failed: Could not remove project folder', rollbackError);
          }
        }
      } catch (rollbackError) {
        logger.error('Error during rollback:', rollbackError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    this.ensureInitialized();
    return projectStorage.getAllProjects();
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    this.ensureInitialized();
    return projectStorage.getProject(projectId);
  }

  /**
   * Update project
   */
  async updateProject(input: UpdateProjectInput): Promise<ProjectOperationResult> {
    this.ensureInitialized();

    try {
      const existingProject = projectStorage.getProject(input.id);
      if (!existingProject) {
        return {
          success: false,
          error: `Project ${input.id} not found`,
        };
      }

      // Update project object
      const updatedProject: Project = {
        ...existingProject,
        ...input,
        updatedAt: Date.now(),
      };

      // If regenerating files, create new devcontainer files
      if (input.regenerateFiles) {
        // Validate PHP version if applicable
        if (input.phpVersion) {
          const validationResult = this.validatePhpVersion(updatedProject.type, input.phpVersion);
          if (!validationResult.success) {
            return validationResult;
          }
        }

        const filesResult = await this.createDevcontainerFiles(updatedProject, true);
        if (!filesResult.success) {
          return filesResult;
        }
      }

      // If domain changed, update hosts file
      if (input.domain && input.domain !== existingProject.domain) {
        try {
          await this.removeDomainFromHosts(existingProject.domain); // Remove old
          await this.addDomainToHosts(input.domain); // Add new
        } catch (error) {
          logger.warn('Failed to update hosts file:', error);
        }
      }

      await projectStorage.updateProject(input.id, updatedProject);

      logger.info(`Project ${updatedProject.name} updated successfully`);

      return {
        success: true,
        data: { project: updatedProject },
      };
    } catch (error) {
      logger.error('Failed to update project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete project
   */
  async deleteProject(
    projectId: string,
    removeVolume = false,
    removeFolder = false
  ): Promise<ProjectOperationResult> {
    this.ensureInitialized();

    try {
      const project = projectStorage.getProject(projectId);
      if (!project) {
        return {
          success: false,
          error: `Project ${projectId} not found`,
        };
      }

      // Remove from hosts file
      try {
        await this.removeDomainFromHosts(project.domain);
      } catch (error) {
        logger.warn('Failed to remove domain from hosts file:', error);
      }

      // Remove Docker volume if requested
      if (removeVolume) {
        await volumeManager.removeVolume(project.volumeName);
      }

      // Remove project folder if requested
      if (removeFolder) {
        await fs.rm(project.path, { recursive: true, force: true });
      }

      // Remove from storage
      await projectStorage.deleteProject(projectId);

      // Sync Caddy to remove project (non-blocking)
      syncProjectsToCaddy().catch(error => {
        logger.warn('Failed to sync Caddy after project deletion:', error);
      });

      logger.info(`Project ${project.name} deleted successfully`);

      return {
        success: true,
        data: { message: `Project ${project.name} deleted successfully` },
      };
    } catch (error) {
      logger.error('Failed to delete project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reorder projects
   */
  async reorderProjects(projectIds: string[]): Promise<ProjectOperationResult> {
    this.ensureInitialized();

    try {
      await projectStorage.reorderProjects(projectIds);

      logger.info('Projects reordered successfully');

      return {
        success: true,
        data: { message: 'Projects reordered successfully' },
      };
    } catch (error) {
      logger.error('Failed to reorder projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get container status for all projects using a single Docker API call
   */
  async getProjectsState() {
    this.ensureInitialized();

    const projects = projectStorage.getAllProjects();
    const { dockerManager } = await import('@main/services/docker/docker-manager');

    const containerNames: string[] = [];
    const projectIdToContainerName = new Map<string, string>();

    // Collect all container names
    for (const project of projects) {
      containerNames.push(project.containerName);
      projectIdToContainerName.set(project.id, project.containerName);
    }

    // Single Docker API call to get all container statuses
    const containersState = await dockerManager.getAllContainerState(containerNames);

    // Build status array for all projects
    const results = projects.map(project => {
      const containerName = projectIdToContainerName.get(project.id);
      const containerState = containerName ? containersState.get(containerName) : null;

      return {
        id: project.id,
        running: containerState?.running ?? false,
        exists: containerState?.exists ?? false,
        state: containerState?.state ?? null,
        ports: containerState?.ports ?? [],
        health_status: containerState?.health_status ?? 'none',
      };
    });

    return results;
  }
}

// Export singleton instance
export const projectStateManager = new ProjectStateManager();
