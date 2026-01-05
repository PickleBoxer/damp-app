/**
 * Project template system
 * Generates devcontainer files from templates with dynamic placeholders
 */

import type { TemplateContext, ProjectTemplate } from '@shared/types/project';
import { buildProjectContainerLabels, LABEL_KEYS } from '@shared/constants/labels';

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
 */
export function generateProjectTemplates(context: TemplateContext): ProjectTemplate {
  return {
    devcontainerJson: renderTemplate(DEVCONTAINER_JSON_TEMPLATE, context),
    dockerfile: renderTemplate(DOCKERFILE_TEMPLATE, context),
    launchJson: renderTemplate(LAUNCH_JSON_TEMPLATE, context),
    dockerignore: renderTemplate(DOCKERIGNORE_TEMPLATE, context),
    dockerCompose: renderTemplate(DOCKER_COMPOSE_TEMPLATE, context),
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
