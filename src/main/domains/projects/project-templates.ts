/**
 * Project template system
 * Generates devcontainer files from templates with dynamic placeholders
 */

import { buildProjectContainerLabels, LABEL_KEYS } from '@shared/constants/labels';
import type { BundledService, ProjectTemplate, TemplateContext } from '@shared/types/project';
import { ServiceId } from '@shared/types/service';
import { getServiceDefinition } from '../services/service-definitions';

/**
 * Map Node.js versions to specific releases for better Docker layer caching
 */
const NODE_VERSION_MAP: Record<string, string> = {
  lts: '24',
  latest: '25',
  '20': '20',
  '22': '22',
  '24': '24',
  '25': '25',
};

/**
 * Replace template placeholders with actual values
 */
function renderTemplate(template: string, context: TemplateContext): string {
  const hasPhpExtensions = context.phpExtensions && context.phpExtensions.trim().length > 0;
  const hasNodeVersion = context.nodeVersion && context.nodeVersion !== 'none';
  const nodeVersionMapped = hasNodeVersion
    ? NODE_VERSION_MAP[context.nodeVersion] || context.nodeVersion
    : '';

  // Map PHP variant to service type for ServerSideUp set-file-permissions command
  const serviceType = context.phpVariant.includes('apache')
    ? 'apache'
    : context.phpVariant.includes('nginx')
      ? 'nginx'
      : context.phpVariant.includes('frankenphp')
        ? 'frankenphp'
        : 'fpm';

  // Build container labels
  const labels = buildProjectContainerLabels(context.projectId, context.projectName);

  // Prepare Node.js installation blocks
  const nodeSetup = hasNodeVersion
    ? {
        comment: ` and Node.js ${nodeVersionMapped}`,
        cacheMount: `--mount=type=cache,target=/root/.npm,sharing=locked \\
    `,
        setupCommands: `curl -fsSL https://deb.nodesource.com/setup_${nodeVersionMapped}.x | bash - \\
    && apt-get install -y --no-install-recommends \\
        git \\
        zsh \\
        sudo \\
        nodejs \\
    && npm install -g npm@latest`,
      }
    : {
        comment: '',
        cacheMount: '',
        setupCommands: `apt-get update \\
    && apt-get install -y --no-install-recommends \\
        git \\
        sudo \\
        zsh`,
      };

  return template
    .replaceAll('{{PROJECT_NAME}}', context.projectName)
    .replaceAll('{{VOLUME_NAME}}', context.volumeName)
    .replaceAll('{{PHP_VERSION}}', context.phpVersion)
    .replaceAll('{{NODE_VERSION}}', context.nodeVersion)
    .replaceAll('{{NODE_VERSION_MAPPED}}', nodeVersionMapped)
    .replaceAll('{{PHP_EXTENSIONS}}', context.phpExtensions)
    .replaceAll('{{PHP_VARIANT}}', context.phpVariant)
    .replaceAll('{{SERVICE_TYPE}}', serviceType)
    .replaceAll('{{DOCUMENT_ROOT}}', context.documentRoot)
    .replaceAll('{{NETWORK_NAME}}', context.networkName)
    .replaceAll('{{FORWARDED_PORT}}', context.forwardedPort.toString())
    .replaceAll('{{LABEL_MANAGED}}', `${LABEL_KEYS.MANAGED}=${labels[LABEL_KEYS.MANAGED]}`)
    .replaceAll('{{LABEL_TYPE}}', `${LABEL_KEYS.TYPE}=${labels[LABEL_KEYS.TYPE]}`)
    .replaceAll('{{LABEL_PROJECT_ID}}', `${LABEL_KEYS.PROJECT_ID}=${labels[LABEL_KEYS.PROJECT_ID]}`)
    .replaceAll(
      '{{LABEL_PROJECT_NAME}}',
      `${LABEL_KEYS.PROJECT_NAME}=${labels[LABEL_KEYS.PROJECT_NAME]}`
    )
    .replaceAll('{{POST_START_COMMAND}}', context.postStartCommand)
    .replaceAll('{{POST_CREATE_COMMAND}}', context.postCreateCommand || '')
    .replaceAll('{{LAUNCH_INDEX_PATH}}', context.launchIndexPath || '')
    .replaceAll(
      '{{PHP_EXTENSIONS_DOCKERFILE}}',
      hasPhpExtensions ? ` ${context.phpExtensions}` : ''
    )
    .replaceAll('{{NODE_INSTALL_COMMENT}}', nodeSetup.comment)
    .replaceAll('{{NODE_CACHE_MOUNT}}', nodeSetup.cacheMount)
    .replaceAll('{{NODE_SETUP_COMMANDS}}', nodeSetup.setupCommands)
    .replaceAll(
      '{{CLAUDE_AI_FEATURE}}',
      context.enableClaudeAi ? '"ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {}' : ''
    );
}

/**
 * Unified devcontainer.json template
 *
 * Configuration:
 * - remoteUser: vscode (connects as vscode user)
 * - workspaceMount: Docker volume for performance
 * - overrideCommand: false (S6 Overlay auto-starts services)
 * - Minimal features (only Claude AI if enabled)
 */
const DEVCONTAINER_JSON_TEMPLATE = `{
    "name": "{{PROJECT_NAME}}",

    // Docker volume for better performance and persistent storage
    "workspaceMount": "source={{VOLUME_NAME}},target=/var/www/html,type=volume",
    "workspaceFolder": "/var/www/html",

    "build": {
        "dockerfile": "../Dockerfile",
        "context": "..",
        "target": "development",
        "args": {
            "USER_ID": "\${localEnv:UID:1000}",
            "GROUP_ID": "\${localEnv:GID:1000}"
        }
    },

    "remoteUser": "www-data",
    "overrideCommand": false,

    "containerEnv": {
        "SSL_MODE": "full",
        "PHP_OPCACHE_ENABLE": "0"
    },

    "features": {
        {{CLAUDE_AI_FEATURE}}
    },

    "customizations": {
        "vscode": {
            "settings": {
                "github.copilot.chat.codeGeneration.instructions": [
                    {
                        "text": "This dev container includes php (with xdebug), pecl, composer pre-installed and available on the PATH, along with PHP language extensions for PHP development."
                    }
                ],
                "php.validate.executablePath": "/usr/local/bin/php"
            },
            "extensions": [
                "xdebug.php-debug",
                "bmewburn.vscode-intelephense-client",
                "streetsidesoftware.code-spell-checker"
            ]
        }
    },

    "runArgs": [
        "--network={{NETWORK_NAME}}",
        "--label={{LABEL_MANAGED}}",
        "--label={{LABEL_TYPE}}",
        "--label={{LABEL_PROJECT_ID}}",
        "--label={{LABEL_PROJECT_NAME}}"
    ],

    "forwardPorts": [{{FORWARDED_PORT}}],

    "postCreateCommand": "{{POST_CREATE_COMMAND}}",
    "postStartCommand": "{{POST_START_COMMAND}}"
}`;

/**
 * Dockerfile template
 *
 * Architecture: vscode user (1000:1000) owns files, www-data (33:33) reads via group
 * Pattern: vscode:www-data ownership with 775/664 permissions
 */
const DOCKERFILE_TEMPLATE = `# syntax=docker/dockerfile:1.4

############################################
# Build Arguments
############################################
ARG PHP_VERSION={{PHP_VERSION}}
ARG PHP_VARIANT={{PHP_VARIANT}}
ARG USER_ID=1000
ARG GROUP_ID=1000

############################################
# Base Image
############################################
FROM serversideup/php:\${PHP_VERSION}-\${PHP_VARIANT} AS base

############################################
# Development Image
############################################
FROM base AS development

USER root

# Change www-data UID/GID to match host user (ServerSideUp's recommended approach)
ARG USER_ID
ARG GROUP_ID
RUN docker-php-serversideup-set-id www-data \${USER_ID}:\${GROUP_ID} && \\
    docker-php-serversideup-set-file-permissions --owner \${USER_ID}:\${GROUP_ID} --service {{SERVICE_TYPE}}

# Install development tools{{NODE_INSTALL_COMMENT}}
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \\
    --mount=type=cache,target=/var/lib/apt,sharing=locked \\
    {{NODE_CACHE_MOUNT}}{{NODE_SETUP_COMMANDS}} \\
    && apt-get clean \\
    && rm -rf /var/lib/apt/lists/*

# Install Xdebug and additional PHP extensions
RUN install-php-extensions xdebug{{PHP_EXTENSIONS_DOCKERFILE}} \\
    && cat > /usr/local/etc/php/conf.d/xdebug.ini <<'EOF'
xdebug.mode = develop,debug,trace,coverage,profile
xdebug.start_with_request = trigger
xdebug.client_port = 9003
EOF

# Configure www-data user for development
RUN usermod -s /usr/bin/zsh www-data && \\
    mkdir -p /var/www && \\
    chown www-data:www-data /var/www && \\
    echo "www-data ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/www-data && \\
    chmod 0440 /etc/sudoers.d/www-data

# Install Oh My Zsh for www-data
USER www-data
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \\
    && git clone https://github.com/zsh-users/zsh-autosuggestions \${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \\
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting \${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting \\
    && git clone https://github.com/zsh-users/zsh-completions \${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-completions \\
    && sed -i 's/plugins=(git)/plugins=(git node npm composer sudo command-not-found zsh-autosuggestions zsh-syntax-highlighting zsh-completions)/' ~/.zshrc

USER root

# Switch to www-data user (S6 Overlay runs services as www-data)
# VS Code connects as www-data via remoteUser
USER www-data

############################################
# Production Image
############################################
FROM base AS production

# Copy application files
COPY --chown=www-data:www-data . /var/www/html
`;

/**
 * launch.json template (Xdebug configuration)
 */
const LAUNCH_JSON_TEMPLATE = `{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for XDebug",
            "type": "php",
            "request": "launch",
            "port": 9003
        },
        {
            "name": "Launch application",
            "type": "php",
            "request": "launch",
            "program": "\${workspaceFolder}/{{LAUNCH_INDEX_PATH}}index.php",
            "cwd": "\${workspaceFolder}",
            "port": 9003
        },
        {
            "name": "Launch currently open script",
            "type": "php",
            "request": "launch",
            "program": "\${file}",
            "cwd": "\${fileDirname}",
            "port": 9003
        }
    ]
}`;

/**
 * .dockerignore template
 * Excludes files from Docker build context for faster builds and smaller images
 */
const DOCKERIGNORE_TEMPLATE = `# Development files
.devcontainer/
.vscode/
.idea/
.git/
.gitignore
.editorconfig

# Environment files
# .env
.env.*
!.env.example

# Dependencies
# node_modules/
# vendor/

# Build artifacts
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.cache/

# Testing
coverage/
.phpunit.result.cache
tests/_output/

# OS files
.DS_Store
Thumbs.db

# IDE
*.swp
*.swo
*~

# Temporary files
tmp/
temp/
*.tmp
`;

/**
 * docker-compose.yml template
 * Provides both development and production service configurations
 * Use: docker compose up app-dev (development) or docker compose up app-prod (production)
 */
const DOCKER_COMPOSE_TEMPLATE = `# Docker Compose Configuration
#
# Usage:
#   Development:  docker compose --profile development up app-dev
#   Production:   docker compose --profile production up app-prod
#
#   Or shorter:   docker compose up app-dev
#                 docker compose up app-prod
#
# Environment variables can be customized in .env file:
#   DEV_PORT=80, DEV_SSL_PORT=443
#   PROD_PORT=80, PROD_SSL_PORT=443
#   APP_ENV=local, APP_DEBUG=true, LOG_LEVEL=debug

version: '3.9'

services:
  # Development service - with hot-reload and debugging tools
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
      args:
        PHP_VERSION: {{PHP_VERSION}}
        PHP_VARIANT: {{PHP_VARIANT}}
        USER_ID: \${UID:-1000}
        GROUP_ID: \${GID:-1000}
    restart: unless-stopped

    ports:
      - "\${DEV_PORT:-80}:8080"
      - "\${DEV_SSL_PORT:-443}:8443"

    networks:
      - {{NETWORK_NAME}}

    environment:
      - APP_ENV=\${APP_ENV:-local}
      - APP_DEBUG=\${APP_DEBUG:-true}
      - SSL_MODE=\${SSL_MODE:-full}
      - PHP_OPCACHE_ENABLE=0
      - PHP_DISPLAY_ERRORS=On
      - LOG_LEVEL=\${LOG_LEVEL:-debug}

    volumes:
      # Option 1: Bind mount for hot-reload (default, uncomment to use)
      - .:/var/www/html

      # Option 2: Named volume for better performance (comment above and uncomment below)
      # - {{VOLUME_NAME}}:/var/www/html

    profiles:
      - development

  # Production service - optimized and minimal
  app-prod:
    # Option 1: Build image from Dockerfile (default)
    build:
      context: .
      dockerfile: Dockerfile
      target: production
      args:
        PHP_VERSION: {{PHP_VERSION}}
        PHP_VARIANT: {{PHP_VARIANT}}

    # Option 2: Use pre-built image (comment 'build' above and uncomment 'image' below)
    # Build image first: docker build --target production -t {{PROJECT_NAME}}:latest .
    # image: {{PROJECT_NAME}}:latest

    restart: unless-stopped

    ports:
      - "\${PROD_PORT:-80}:8080"
      - "\${PROD_SSL_PORT:-443}:8443"

    networks:
      - {{NETWORK_NAME}}

    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - SSL_MODE=\${SSL_MODE:-full}
      - PHP_OPCACHE_ENABLE=1
      - PHP_DISPLAY_ERRORS=Off
      - LOG_LEVEL=\${LOG_LEVEL:-warning}

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    profiles:
      - production

networks:
  {{NETWORK_NAME}}:
    external: true
`;

/**
 * Devcontainer.json template for docker-compose mode (when bundled services are present)
 * Uses dockerComposeFile instead of build to orchestrate multi-container setup
 */
const DEVCONTAINER_COMPOSE_JSON_TEMPLATE = `{
    "name": "{{PROJECT_NAME}}",

    // Docker Compose for multi-container orchestration
    "dockerComposeFile": "docker-compose.yml",
    "service": "app",
    "workspaceFolder": "/var/www/html",

    "remoteUser": "www-data",
    "overrideCommand": false,

    "containerEnv": {
        "SSL_MODE": "full",
        "PHP_OPCACHE_ENABLE": "0"
    },

    "features": {
        {{CLAUDE_AI_FEATURE}}
    },

    "customizations": {
        "vscode": {
            "settings": {
                "github.copilot.chat.codeGeneration.instructions": [
                    {
                        "text": "This dev container includes php (with xdebug), pecl, composer pre-installed and available on the PATH, along with PHP language extensions for PHP development."
                    }
                ],
                "php.validate.executablePath": "/usr/local/bin/php"
            },
            "extensions": [
                "xdebug.php-debug",
                "bmewburn.vscode-intelephense-client",
                "streetsidesoftware.code-spell-checker"
            ]
        }
    },

    "forwardPorts": [{{FORWARDED_PORT}}],

    "postCreateCommand": "{{POST_CREATE_COMMAND}}",
    "postStartCommand": "{{POST_START_COMMAND}}"
}`;

/**
 * Generate docker-compose.yml content for multi-service projects (bundled services)
 * This is used when project has bundledServices defined
 */
export function generateDockerComposeMultiService(context: TemplateContext): string {
  const bundledServices = context.bundledServices || [];
  if (bundledServices.length === 0) {
    // No bundled services, return standard compose template
    return renderTemplate(DOCKER_COMPOSE_TEMPLATE, context);
  }

  const labels = buildProjectContainerLabels(context.projectId, context.projectName);
  const lines: string[] = [];

  // Header
  lines.push(`# Docker Compose Configuration with Bundled Services
# Project: ${context.projectName}
# Auto-generated by DAMP - Do not edit manually

services:`);

  // App service (main PHP application)
  lines.push(`
  # Main application container
  app:
    build:
      context: ..
      dockerfile: Dockerfile
      target: development
      args:
        PHP_VERSION: ${context.phpVersion}
        PHP_VARIANT: ${context.phpVariant}
        USER_ID: \${UID:-1000}
        GROUP_ID: \${GID:-1000}
    container_name: ${context.projectName}-app
    restart: unless-stopped
    volumes:
      - ${context.volumeName}:/var/www/html
    networks:
      - ${context.networkName}
    environment:
      - SSL_MODE=full
      - PHP_OPCACHE_ENABLE=0
      - PHP_DISPLAY_ERRORS=On
    labels:
      - "${LABEL_KEYS.MANAGED}=${labels[LABEL_KEYS.MANAGED]}"
      - "${LABEL_KEYS.TYPE}=${labels[LABEL_KEYS.TYPE]}"
      - "${LABEL_KEYS.PROJECT_ID}=${labels[LABEL_KEYS.PROJECT_ID]}"
      - "${LABEL_KEYS.PROJECT_NAME}=${labels[LABEL_KEYS.PROJECT_NAME]}"`);

  // Add depends_on for database services if present
  const databaseServices = bundledServices.filter(s => {
    const def = getServiceDefinition(s.serviceId);
    return def?.service_type === 'database' && !def?.linkedDatabaseService;
  });

  if (databaseServices.length > 0) {
    lines.push(`
    depends_on:`);
    for (const svc of databaseServices) {
      const def = getServiceDefinition(svc.serviceId);
      if (def) {
        // Use health condition for database services
        const hasHealthcheck = def.default_config.healthcheck;
        if (hasHealthcheck) {
          lines.push(`      ${def.name}:
        condition: service_healthy`);
        } else {
          lines.push(`      ${def.name}:
        condition: service_started`);
        }
      }
    }
  }

  // Generate bundled service definitions
  for (const bundledService of bundledServices) {
    const def = getServiceDefinition(bundledService.serviceId);
    if (!def) continue;

    const serviceName = def.name;
    const containerName = `${context.projectName}-${serviceName}`;

    lines.push(`
  # ${def.display_name}
  ${serviceName}:
    image: ${def.default_config.image}
    container_name: ${containerName}
    restart: unless-stopped
    networks:
      - ${context.networkName}
    labels:
      - "${LABEL_KEYS.MANAGED}=true"
      - "${LABEL_KEYS.TYPE}=bundled-service"
      - "${LABEL_KEYS.PROJECT_ID}=${context.projectId}"
      - "${LABEL_KEYS.PROJECT_NAME}=${context.projectName}"
      - "${LABEL_KEYS.SERVICE_ID}=${def.id}"`);

    // Environment variables
    const envVars = generateServiceEnvVars(bundledService, def);
    if (envVars.length > 0) {
      lines.push(`    environment:`);
      for (const env of envVars) {
        lines.push(`      - ${env}`);
      }
    }

    // Volume bindings (project-scoped)
    if (def.default_config.data_volume) {
      const projectVolume = `${context.projectName}_${def.name}_data`;
      const volumePath = def.default_config.volume_bindings[0]?.split(':')[1] || '/data';
      lines.push(`    volumes:
      - ${projectVolume}:${volumePath}`);
    }

    // Healthcheck
    if (def.default_config.healthcheck) {
      const hc = def.default_config.healthcheck;
      lines.push(`    healthcheck:
      test: ${JSON.stringify(hc.test)}
      retries: ${hc.retries || 3}
      timeout: ${Math.floor((hc.timeout || 5000000000) / 1000000000)}s`);
      if (hc.interval) {
        lines.push(`      interval: ${Math.floor(hc.interval / 1000000000)}s`);
      }
      if (hc.start_period) {
        lines.push(`      start_period: ${Math.floor(hc.start_period / 1000000000)}s`);
      }
    }

    // For database admin tools, link to the database service
    if (def.linkedDatabaseService) {
      // Find which database is actually bundled
      const linkedDb = findLinkedDatabase(bundledServices, def);
      if (linkedDb) {
        lines.push(`    depends_on:
      ${linkedDb.name}:
        condition: service_healthy`);
      }
    }
  }

  // Volumes section
  lines.push(`
volumes:
  ${context.volumeName}:
    external: true`);

  // Add project-scoped volumes for bundled services
  for (const bundledService of bundledServices) {
    const def = getServiceDefinition(bundledService.serviceId);
    if (def?.default_config.data_volume) {
      lines.push(`  ${context.projectName}_${def.name}_data:`);
    }
  }

  // Networks section
  lines.push(`
networks:
  ${context.networkName}:
    external: true
`);

  return lines.join('\n');
}

/**
 * Generate environment variables for a bundled service, applying custom credentials
 */
function generateServiceEnvVars(
  bundledService: BundledService,
  def: ReturnType<typeof getServiceDefinition>
): string[] {
  if (!def) return [];

  const envVars = [...def.default_config.environment_vars];
  const creds = bundledService.customCredentials;

  if (creds) {
    // Apply custom credentials based on service type
    switch (bundledService.serviceId) {
      case ServiceId.MySQL:
        if (creds.rootPassword) replaceEnvVar(envVars, 'MYSQL_ROOT_PASSWORD', creds.rootPassword);
        if (creds.database) replaceEnvVar(envVars, 'MYSQL_DATABASE', creds.database);
        if (creds.username) replaceEnvVar(envVars, 'MYSQL_USER', creds.username);
        if (creds.password) replaceEnvVar(envVars, 'MYSQL_PASSWORD', creds.password);
        break;
      case ServiceId.MariaDB:
        if (creds.rootPassword) replaceEnvVar(envVars, 'MARIADB_ROOT_PASSWORD', creds.rootPassword);
        if (creds.database) replaceEnvVar(envVars, 'MARIADB_DATABASE', creds.database);
        if (creds.username) replaceEnvVar(envVars, 'MARIADB_USER', creds.username);
        if (creds.password) replaceEnvVar(envVars, 'MARIADB_PASSWORD', creds.password);
        break;
      case ServiceId.PostgreSQL:
        if (creds.password) replaceEnvVar(envVars, 'POSTGRES_PASSWORD', creds.password);
        if (creds.database) replaceEnvVar(envVars, 'POSTGRES_DB', creds.database);
        if (creds.username) replaceEnvVar(envVars, 'POSTGRES_USER', creds.username);
        break;
      case ServiceId.MongoDB:
        if (creds.username) replaceEnvVar(envVars, 'MONGO_INITDB_ROOT_USERNAME', creds.username);
        if (creds.password) replaceEnvVar(envVars, 'MONGO_INITDB_ROOT_PASSWORD', creds.password);
        break;
      case ServiceId.PhpMyAdmin: {
        // Set PMA_HOST based on linked database
        const dbService = findLinkedDatabaseForAdmin(def);
        if (dbService) {
          replaceEnvVar(envVars, 'PMA_HOST', dbService);
        }
        break;
      }
      case ServiceId.Adminer: {
        const dbService = findLinkedDatabaseForAdmin(def);
        if (dbService) {
          replaceEnvVar(envVars, 'ADMINER_DEFAULT_SERVER', dbService);
        }
        break;
      }
    }
  }

  return envVars;
}

/**
 * Replace or add environment variable in array
 */
function replaceEnvVar(envVars: string[], key: string, value: string): void {
  const index = envVars.findIndex(v => v.startsWith(`${key}=`));
  if (index >= 0) {
    envVars[index] = `${key}=${value}`;
  } else {
    envVars.push(`${key}=${value}`);
  }
}

/**
 * Find the linked database service for admin tools
 */
function findLinkedDatabase(
  bundledServices: BundledService[],
  adminDef: ReturnType<typeof getServiceDefinition>
): ReturnType<typeof getServiceDefinition> | null {
  if (!adminDef?.linkedDatabaseService) return null;

  // First, try to find the linked database type
  const linkedDb = bundledServices.find(s => s.serviceId === adminDef.linkedDatabaseService);
  if (linkedDb) {
    return getServiceDefinition(linkedDb.serviceId);
  }

  // For phpMyAdmin, also check for MariaDB (compatible)
  if (adminDef.id === ServiceId.PhpMyAdmin) {
    const mariaDb = bundledServices.find(s => s.serviceId === ServiceId.MariaDB);
    if (mariaDb) return getServiceDefinition(ServiceId.MariaDB);
  }

  // For Adminer, check for any database
  if (adminDef.id === ServiceId.Adminer) {
    const anyDb = bundledServices.find(s => {
      const def = getServiceDefinition(s.serviceId);
      return def?.service_type === 'database' && !def?.linkedDatabaseService;
    });
    if (anyDb) return getServiceDefinition(anyDb.serviceId);
  }

  return null;
}

/**
 * Find database service name for admin tool environment
 */
function findLinkedDatabaseForAdmin(
  adminDef: ReturnType<typeof getServiceDefinition>
): string | null {
  if (!adminDef?.linkedDatabaseService) return null;

  const linkedDef = getServiceDefinition(adminDef.linkedDatabaseService);
  return linkedDef?.name || null;
}

/**
 * Get post-start command based on project type
 * With fpm-apache, Apache and PHP-FPM auto-start via S6 Overlay
 */
export function getPostStartCommand(): string {
  // Apache/NGINX/FrankenPHP auto-start, no command needed
  return '';
}

/**
 * Get post-create command (runs after container is created)
 * Conditionally installs composer and npm dependencies if lock files exist
 */
export function getPostCreateCommand(): string {
  return '[ -f composer.json ] && composer install || true; [ -f package.json ] && npm install && npm run build || true';
}

/**
 * Generate project templates from context
 * Uses compose mode when bundled services are present
 */
export function generateProjectTemplates(context: TemplateContext): ProjectTemplate {
  const hasBundledServices = context.bundledServices && context.bundledServices.length > 0;

  return {
    devcontainerJson: hasBundledServices
      ? renderTemplate(DEVCONTAINER_COMPOSE_JSON_TEMPLATE, context)
      : renderTemplate(DEVCONTAINER_JSON_TEMPLATE, context),
    dockerfile: renderTemplate(DOCKERFILE_TEMPLATE, context),
    launchJson: renderTemplate(LAUNCH_JSON_TEMPLATE, context),
    dockerignore: renderTemplate(DOCKERIGNORE_TEMPLATE, context),
    dockerCompose: hasBundledServices
      ? generateDockerComposeMultiService(context)
      : renderTemplate(DOCKER_COMPOSE_TEMPLATE, context),
  };
}

/**
 * Generate index.php content for basic PHP projects
 * Should be created in public/ folder
 */
export function generateIndexPhp(projectName: string, phpVersion: string): string {
  return `<?php
/**
 * Welcome to ${projectName}
 * PHP Version: ${phpVersion}
 */

// Get PHP version info
$phpVersion = phpversion();
$extensions = get_loaded_extensions();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - PHP Development Site</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .info {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .extensions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 20px;
        }
        .extension {
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 ${projectName}</h1>
            <p>Your PHP development environment is ready!</p>
        </div>

        <div class="info">
            <h3>📋 Environment Information</h3>
            <p><strong>PHP Version:</strong> <?= $phpVersion ?></p>
            <p><strong>Site Name:</strong> ${projectName}</p>
            <p><strong>Server:</strong> <?= $_SERVER['SERVER_SOFTWARE'] ?? 'Built-in PHP Server' ?></p>
            <p><strong>Document Root:</strong> <?= $_SERVER['DOCUMENT_ROOT'] ?? __DIR__ ?></p>
        </div>

        <div class="info">
            <h3>🔧 Available PHP Extensions</h3>
            <div class="extensions">
                <?php foreach ($extensions as $extension): ?>
                    <div class="extension"><?= htmlspecialchars($extension) ?></div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="info">
            <h3>💡 Next Steps</h3>
            <ul>
                <li>Open this folder in VS Code</li>
                <li>Use "Dev Containers: Reopen in Container" command</li>
                <li>Start developing your PHP application!</li>
            </ul>
        </div>
    </div>
</body>
</html>
`;
}
