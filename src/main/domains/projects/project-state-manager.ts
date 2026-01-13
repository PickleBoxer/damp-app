/**
 * Project state manager
 * Coordinates project lifecycle: create, update, delete, and file generation
 */

import { dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import semver from 'semver';
import { LABEL_KEYS, RESOURCE_TYPES } from '@shared/constants/labels';
import { addHostEntry, removeHostEntry } from '@main/core/hosts-manager/hosts-manager';
import { createLogger } from '@main/utils/logger';
import type { ContainerState } from '@shared/types/container';
import type {
  Project,
  ProjectType,
  CreateProjectInput,
  UpdateProjectInput,
  FolderSelectionResult,
  LaravelDetectionResult,
  VolumeCopyProgress,
  PhpVersion,
  TemplateContext,
} from '@shared/types/project';
import type { Result } from '@shared/types/result';
import { projectStorage } from '@main/core/storage/project-storage';
import {
  createProjectVolume,
  removeVolume as removeDockerVolume,
  copyToVolume,
  getContainerStateByLabel,
} from '@main/core/docker';
import {
  generateIndexPhp,
  generateProjectTemplates,
  getPostCreateCommand,
  getPostStartCommand,
} from './project-templates';
import { syncProjectsToCaddy } from '@main/core/reverse-proxy/caddy-config';
import { installLaravelToVolume } from './laravel-installer';
import { FORWARDED_PORT } from '@shared/constants/ports';

const logger = createLogger('ProjectStateManager');

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
      logger.error('Failed to initialize project state manager:', { error });
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
      logger.error('Failed to open folder selection dialog:', { error });
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
      logger.error('Error detecting Laravel:', { error });
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
   * Validate PHP version for Laravel projects
   */
  private validatePhpVersion(type: ProjectType, phpVersion: PhpVersion): Result<void> {
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
  ): Promise<Result<void>> {
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
      const documentRoot = this.getDocumentRoot(project);
      const context: TemplateContext = {
        projectId: project.id,
        projectName: project.name,
        volumeName: project.volumeName,
        phpVersion: project.phpVersion,
        phpVariant: project.phpVariant,
        nodeVersion: project.nodeVersion,
        phpExtensions: project.phpExtensions.join(' '),
        documentRoot,
        networkName: project.networkName,
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
      .replaceAll(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replaceAll(/(^-+)|(-+$)/g, '') // Remove leading/trailing hyphens
      .replaceAll(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }

  /**
   * Determine document root based on project type and import method
   */
  private getDocumentRoot(project: Project): string {
    if (project.importMethod === 'import') {
      return project.type === 'laravel' ? '/var/www/html/public' : '/var/www/html';
    }
    return '/var/www/html/public';
  }

  /**
   * Resolve project path and handle folder creation
   */
  private async resolveProjectPath(
    inputPath: string | undefined,
    inputName: string,
    inputType: ProjectType | undefined
  ): Promise<{
    projectPath: string;
    sanitizedName: string;
    folderCreated: boolean;
    importMethod: 'create' | 'import';
  }> {
    const projectType = (inputType as ProjectType) || 'basic-php';
    const importMethod: 'create' | 'import' = projectType === 'existing' ? 'import' : 'create';
    let parentPath = inputPath;
    let nameToSanitize = inputName;
    let folderCreated = false;

    if (!parentPath) {
      const folderResult = await this.selectFolder();
      if (!folderResult.success || !folderResult.path) {
        throw new Error('No folder selected');
      }
      parentPath = folderResult.path;
    }

    let projectPath: string;

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

    const sanitizedName = this.sanitizeName(nameToSanitize);

    return { projectPath, sanitizedName, folderCreated, importMethod };
  }

  /**
   * Detect project type for imported projects
   */
  private async detectProjectType(
    projectPath: string,
    importMethod: 'create' | 'import',
    inputType: ProjectType | undefined
  ): Promise<ProjectType> {
    if (importMethod === 'import') {
      const laravelDetection = await this.detectLaravel(projectPath);
      if (laravelDetection.isLaravel) {
        logger.info(`Detected Laravel project: ${laravelDetection.version || 'unknown version'}`);
        return 'laravel' as ProjectType;
      }
      logger.info('No Laravel detected, using basic PHP configuration');
      return 'basic-php' as ProjectType;
    }
    return (inputType as ProjectType) || 'basic-php';
  }

  /**
   * Validate project creation requirements
   */
  private async validateProjectCreation(
    projectType: ProjectType,
    phpVersion: PhpVersion,
    projectPath: string,
    overwriteExisting: boolean
  ): Promise<void> {
    // Validate PHP version
    const validationResult = this.validatePhpVersion(projectType, phpVersion);
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }

    // Check if devcontainer exists
    const devcontainerExistsFlag = await this.devcontainerExists(projectPath);
    if (devcontainerExistsFlag && !overwriteExisting) {
      throw new Error(
        'Devcontainer folder already exists in this project. Set overwriteExisting=true to replace it.'
      );
    }
  }

  /**
   * Build project object from inputs
   */
  private buildProjectObject(
    input: CreateProjectInput,
    sanitizedName: string,
    projectType: ProjectType,
    importMethod: 'create' | 'import',
    projectPath: string
  ): Project {
    return {
      id: randomUUID(),
      name: sanitizedName,
      type: projectType,
      importMethod,
      path: projectPath,
      volumeName: this.generateVolumeName(sanitizedName),
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
  }

  /**
   * Install Laravel to volume if needed
   */
  private async installLaravelIfNeeded(
    project: Project,
    laravelOptions: CreateProjectInput['laravelOptions'],
    onProgress?: (progress: VolumeCopyProgress) => void
  ): Promise<void> {
    if (laravelOptions) {
      logger.info('Installing fresh Laravel project to volume...');
      await installLaravelToVolume(
        project.volumeName,
        project.name,
        project.id,
        laravelOptions,
        onProgress
      );
    }
  }

  /**
   * Update hosts file with non-blocking error handling
   */
  private async updateHostsFileNonBlocking(domain: string): Promise<void> {
    try {
      await this.addDomainToHosts(domain);
      logger.info(`Added domain ${domain} to hosts file`);
    } catch (error) {
      logger.warn('Failed to update hosts file (may require admin privileges):', { error });
      // Continue anyway - not critical
    }
  }

  /**
   * Rollback project creation on failure
   */
  private async rollbackProjectCreation(
    volumeCreated: boolean,
    folderCreated: boolean,
    project: Project | null,
    projectPath: string | null
  ): Promise<void> {
    try {
      // Remove Docker volume if created
      if (volumeCreated && project) {
        try {
          await removeDockerVolume(project.volumeName);
          logger.info('Rollback: Removed Docker volume');
        } catch (rollbackError) {
          logger.warn('Rollback failed: Could not remove volume', { error: rollbackError });
        }
      }

      // Remove project folder if we created it
      if (folderCreated && projectPath) {
        try {
          await fs.rm(projectPath, { recursive: true, force: true });
          logger.info('Rollback: Removed project folder');
        } catch (rollbackError) {
          logger.warn('Rollback failed: Could not remove project folder', {
            error: rollbackError,
          });
        }
      }
    } catch (rollbackError) {
      logger.error('Error during rollback:', { error: rollbackError });
    }
  }

  /**
   * Create a new project
   */
  async createProject(
    input: CreateProjectInput,
    onProgress?: (progress: VolumeCopyProgress) => void
  ): Promise<Result<Project>> {
    this.ensureInitialized();

    // Track what we've created for rollback
    let projectPath: string | null = null;
    let folderCreated = false;
    let volumeCreated = false;
    let project: Project | null = null;

    try {
      // Step 1: Resolve project path and handle folder creation
      const pathResult = await this.resolveProjectPath(input.path, input.name, input.type);
      projectPath = pathResult.projectPath;
      folderCreated = pathResult.folderCreated;
      const { sanitizedName, importMethod } = pathResult;

      // Step 2: Detect project type
      const projectType = await this.detectProjectType(projectPath, importMethod, input.type);

      // Step 3: Validate project creation requirements
      await this.validateProjectCreation(
        projectType,
        input.phpVersion,
        projectPath,
        input.overwriteExisting ?? false
      );

      // Step 4: Build project object
      project = this.buildProjectObject(
        input,
        sanitizedName,
        projectType,
        importMethod,
        projectPath
      );

      // Step 5: Create Docker volume
      if (onProgress) {
        onProgress({
          message: `Creating Docker volume: ${project.volumeName}`,
          currentStep: 1,
          totalSteps: 10,
          percentage: 10,
          stage: 'creating-volume',
        });
      }
      await createProjectVolume(project.volumeName, project.id);
      volumeCreated = true;

      // Step 6: Install Laravel if needed
      await this.installLaravelIfNeeded(project, input.laravelOptions, onProgress);

      // Step 7: Create devcontainer files
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

      // Step 8: Copy local files to volume
      if (onProgress) {
        onProgress({
          message: 'Copying project files to Docker volume...',
          currentStep: 7,
          totalSteps: 10,
          percentage: 80,
          stage: 'copying-files',
        });
      }
      await copyToVolume(projectPath, project.volumeName, project.id, onProgress);
      project.volumeCopied = true;

      // Step 9: Update hosts file
      if (onProgress) {
        onProgress({
          message: `Adding domain ${project.domain} to hosts file...`,
          currentStep: 9,
          totalSteps: 10,
          percentage: 90,
          stage: 'updating-hosts',
        });
      }
      await this.updateHostsFileNonBlocking(project.domain);

      // Step 10: Save project to storage
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

      // Step 11: Sync project to Caddy (non-blocking)
      syncProjectsToCaddy(projectStorage.getAllProjects()).catch(error => {
        logger.warn('Failed to sync project to Caddy:', { error });
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
        data: project,
      };
    } catch (error) {
      logger.error('Failed to create project, rolling back changes:', { error });
      await this.rollbackProjectCreation(volumeCreated, folderCreated, project, projectPath);

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
   * Regenerate project files with validation
   */
  private async regenerateProjectFiles(
    project: Project,
    phpVersion?: PhpVersion
  ): Promise<Result<void>> {
    // Validate PHP version if applicable
    if (phpVersion) {
      const validationResult = this.validatePhpVersion(project.type, phpVersion);
      if (!validationResult.success) {
        return validationResult;
      }
    }

    const filesResult = await this.createDevcontainerFiles(project, true);
    if (!filesResult.success) {
      return filesResult;
    }

    return { success: true };
  }

  /**
   * Update project domain in hosts file
   */
  private async updateProjectDomain(oldDomain: string, newDomain: string): Promise<void> {
    try {
      await this.removeDomainFromHosts(oldDomain);
      await this.addDomainToHosts(newDomain);
    } catch (error) {
      logger.warn('Failed to update hosts file:', { error });
    }
  }

  /**
   * Update project
   */
  async updateProject(input: UpdateProjectInput): Promise<Result<Project>> {
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

      // Regenerate files if requested
      if (input.regenerateFiles) {
        const filesResult = await this.regenerateProjectFiles(updatedProject, input.phpVersion);
        if (!filesResult.success) {
          return {
            success: false,
            error: filesResult.error,
          };
        }
      }

      // Update domain if changed
      if (input.domain && input.domain !== existingProject.domain) {
        await this.updateProjectDomain(existingProject.domain, input.domain);
      }

      await projectStorage.updateProject(input.id, updatedProject);

      logger.info(`Project ${updatedProject.name} updated successfully`);

      return {
        success: true,
        data: updatedProject,
      } as Result<Project>;
    } catch (error) {
      logger.error('Failed to update project:', { error });
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
  ): Promise<Result<void>> {
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
        logger.warn('Failed to remove domain from hosts file:', { error });
      }

      // Remove Docker volume if requested
      if (removeVolume) {
        await removeDockerVolume(project.volumeName);
      }

      // Remove project folder if requested
      if (removeFolder) {
        await fs.rm(project.path, { recursive: true, force: true });
      }

      // Remove from storage
      await projectStorage.deleteProject(projectId);

      // Clear Caddy sync state to force re-sync, then sync to remove project
      const { clearSyncedState } = await import('@main/core/reverse-proxy/caddy-sync-state');
      clearSyncedState();

      // Sync Caddy to remove project (non-blocking)
      syncProjectsToCaddy(projectStorage.getAllProjects()).catch(error => {
        logger.warn('Failed to sync Caddy after project deletion:', error);
      });

      logger.info(`Project ${project.name} deleted successfully`);

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to delete project:', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reorder projects
   */
  async reorderProjects(projectIds: string[]): Promise<Result<void>> {
    this.ensureInitialized();

    try {
      await projectStorage.reorderProjects(projectIds);

      logger.info('Projects reordered successfully');

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to reorder projects:', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get container status for a specific project using label-based lookup
   */
  async getProjectContainerState(projectId: string): Promise<ContainerState | null> {
    this.ensureInitialized();

    const project = projectStorage.getProject(projectId);
    if (!project) {
      return null;
    }

    try {
      // Use unified container state query (single call instead of find + inspect)
      const containerState = await getContainerStateByLabel(
        LABEL_KEYS.PROJECT_ID,
        projectId,
        RESOURCE_TYPES.PROJECT_CONTAINER
      );

      return {
        running: containerState.running,
        exists: containerState.exists,
        container_id: containerState.container_id,
        container_name: containerState.container_name,
        state: containerState.state,
        ports: containerState.ports,
        health_status: containerState.health_status ?? 'none',
      };
    } catch (error) {
      logger.error('Failed to get project container state', { projectId, error });
      return {
        running: false,
        exists: false,
        container_id: null,
        container_name: null,
        state: null,
        ports: [],
        health_status: 'none',
      };
    }
  }
}

// Export singleton instance
export const projectStateManager = new ProjectStateManager();
