/**
 * Project template system
 * Generates devcontainer files from templates with dynamic placeholders
 */

import type { TemplateContext, ProjectTemplate, ProjectType } from '../../types/project';

/**
 * Replace template placeholders with actual values
 */
function renderTemplate(template: string, context: TemplateContext): string {
  return template
    .replaceAll('{{PROJECT_NAME}}', context.projectName)
    .replaceAll('{{VOLUME_NAME}}', context.volumeName)
    .replaceAll('{{PHP_VERSION}}', context.phpVersion)
    .replaceAll('{{NODE_VERSION}}', context.nodeVersion)
    .replaceAll('{{PHP_EXTENSIONS}}', context.phpExtensions)
    .replaceAll('{{NETWORK_NAME}}', context.networkName)
    .replaceAll('{{CONTAINER_NAME}}', context.containerName)
    .replaceAll('{{FORWARDED_PORT}}', context.forwardedPort.toString())
    .replaceAll('{{WORKSPACE_FOLDER_NAME}}', context.workspaceFolderName)
    .replaceAll('{{PHP_INI_SETTINGS}}', context.phpIniSettings)
    .replaceAll('{{XDEBUG_INI_SETTINGS}}', context.xdebugIniSettings)
    .replaceAll('{{POST_START_COMMAND}}', context.postStartCommand)
    .replaceAll('{{POST_CREATE_COMMAND}}', context.postCreateCommand || '')
    .replaceAll(
      '{{CLAUDE_AI_FEATURE}}',
      context.enableClaudeAi
        ? ',\n        "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {}'
        : ''
    );
}

/**
 * Base devcontainer.json template
 */
const DEVCONTAINER_JSON_TEMPLATE = `{
    "name": "{{PROJECT_NAME}}",
    "workspaceMount": "source={{VOLUME_NAME}},target=/workspace,type=volume",
    "workspaceFolder": "/workspace/{{WORKSPACE_FOLDER_NAME}}",
    "build": {
        "dockerfile": "./Dockerfile",
        "context": ".",
        "args": {
            "VARIANT": "{{PHP_VERSION}}"
        }
    },
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "{{NODE_VERSION}}"
        },
        "ghcr.io/opencodeco/devcontainers/install-php-extensions:0": {
            "extensions": "{{PHP_EXTENSIONS}}"
        }{{CLAUDE_AI_FEATURE}}
    },
    "customizations": {
        "vscode": {
            "settings": {},
            "extensions": [
                "streetsidesoftware.code-spell-checker"
            ]
        }
    },
    "mounts": [
        "source={{VOLUME_NAME}},target=/usr/local/etc/php/conf.d/php.ini,type=volume,volume-subpath={{WORKSPACE_FOLDER_NAME}}/.devcontainer/php.ini",
        "source={{VOLUME_NAME}},target=/usr/local/etc/php/conf.d/z-xdebug.ini,type=volume,volume-subpath={{WORKSPACE_FOLDER_NAME}}/.devcontainer/xdebug.ini"
    ],
    "runArgs": [
        "--network={{NETWORK_NAME}}",
        "--name",
        "{{CONTAINER_NAME}}"
    ],
    "forwardPorts": [{{FORWARDED_PORT}}],{{POST_CREATE_COMMAND}}
    "postStartCommand": "{{POST_START_COMMAND}}"
}`;

/**
 * Laravel-specific devcontainer.json template (with postCreateCommand)
 */
const DEVCONTAINER_JSON_LARAVEL_TEMPLATE = `{
    "name": "{{PROJECT_NAME}}",
    "workspaceMount": "source={{VOLUME_NAME}},target=/workspace,type=volume",
    "workspaceFolder": "/workspace/{{WORKSPACE_FOLDER_NAME}}",
    "build": {
        "dockerfile": "./Dockerfile",
        "context": ".",
        "args": {
            "VARIANT": "{{PHP_VERSION}}"
        }
    },
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "{{NODE_VERSION}}"
        },
        "ghcr.io/opencodeco/devcontainers/install-php-extensions:0": {
            "extensions": "{{PHP_EXTENSIONS}}"
        }{{CLAUDE_AI_FEATURE}}
    },
    "customizations": {
        "vscode": {
            "settings": {},
            "extensions": [
                "streetsidesoftware.code-spell-checker"
            ]
        }
    },
    "mounts": [
        "source={{VOLUME_NAME}},target=/usr/local/etc/php/conf.d/php.ini,type=volume,volume-subpath={{WORKSPACE_FOLDER_NAME}}/.devcontainer/php.ini",
        "source={{VOLUME_NAME}},target=/usr/local/etc/php/conf.d/z-xdebug.ini,type=volume,volume-subpath={{WORKSPACE_FOLDER_NAME}}/.devcontainer/xdebug.ini"
    ],
    "runArgs": [
        "--network={{NETWORK_NAME}}",
        "--name",
        "{{CONTAINER_NAME}}"
    ],
    "forwardPorts": [{{FORWARDED_PORT}}],
    "postCreateCommand": "{{POST_CREATE_COMMAND}}",
    "postStartCommand": "{{POST_START_COMMAND}}"
}`;

/**
 * Dockerfile template
 */
const DOCKERFILE_TEMPLATE = `ARG VARIANT={{PHP_VERSION}}
FROM mcr.microsoft.com/devcontainers/php:1-\${VARIANT}

# [Optional] Uncomment this section to install additional packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
#     && apt-get -y install --no-install-recommends <your-package-list-here>
`;

/**
 * php.ini template
 */
const PHP_INI_TEMPLATE = `[PHP]
{{PHP_INI_SETTINGS}}
`;

/**
 * xdebug.ini template
 */
const XDEBUG_INI_TEMPLATE = `[XDEBUG]
{{XDEBUG_INI_SETTINGS}}
`;

/**
 * launch.json template (Xdebug configuration)
 */
const LAUNCH_JSON_TEMPLATE = `{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for Xdebug",
            "type": "php",
            "request": "launch",
            "port": 9003,
            "pathMappings": {
                "/workspace/{{WORKSPACE_FOLDER_NAME}}": "\${workspaceFolder}"
            }
        }
    ]
}`;

/**
 * Get post-start command based on project type
 */
export function getPostStartCommand(type: ProjectType): string {
  switch (type) {
    case 'basic-php':
    case 'existing': // Existing defaults to basic-php behavior
      return 'php -S 0.0.0.0:8080';
    case 'laravel':
      return 'composer run devcontainer';
    default:
      return 'php -S 0.0.0.0:8080';
  }
}

/**
 * Get post-create command based on project type
 */
export function getPostCreateCommand(type: ProjectType): string | null {
  switch (type) {
    case 'laravel':
      return 'npm install && npm run build';
    case 'basic-php':
    case 'existing':
    default:
      return null;
  }
}

/**
 * Generate project templates from context
 */
export function generateProjectTemplates(context: TemplateContext): ProjectTemplate {
  // Convert php.ini settings to INI format
  const phpIniLines = Object.entries(context.phpIniSettings)
    .map(([key, value]) => `${key} = ${value}`)
    .join('\n');

  const xdebugIniLines = Object.entries(context.xdebugIniSettings)
    .map(([key, value]) => `${key} = ${value}`)
    .join('\n');

  const contextWithFormatted: TemplateContext = {
    ...context,
    phpIniSettings: phpIniLines,
    xdebugIniSettings: xdebugIniLines,
  };

  // Use Laravel-specific template if postCreateCommand exists
  const devcontainerTemplate = context.postCreateCommand
    ? DEVCONTAINER_JSON_LARAVEL_TEMPLATE
    : DEVCONTAINER_JSON_TEMPLATE;

  return {
    devcontainerJson: renderTemplate(devcontainerTemplate, contextWithFormatted),
    dockerfile: renderTemplate(DOCKERFILE_TEMPLATE, contextWithFormatted),
    phpIni: renderTemplate(PHP_INI_TEMPLATE, contextWithFormatted),
    xdebugIni: renderTemplate(XDEBUG_INI_TEMPLATE, contextWithFormatted),
    launchJson: renderTemplate(LAUNCH_JSON_TEMPLATE, contextWithFormatted),
  };
}

/**
 * Default PHP extensions by project type
 */
export const DEFAULT_PHP_EXTENSIONS: Record<ProjectType, string[]> = {
  'basic-php': ['bcmath', 'pdo_mysql', 'pcntl'],
  laravel: ['bcmath', 'pdo_mysql', 'pcntl', 'gd', 'zip', 'intl', 'opcache'],
  existing: ['bcmath', 'pdo_mysql', 'pcntl'],
};

/**
 * Get default PHP extensions for project type
 */
export function getDefaultPhpExtensions(type: ProjectType): string[] {
  return DEFAULT_PHP_EXTENSIONS[type] || DEFAULT_PHP_EXTENSIONS['basic-php'];
}
