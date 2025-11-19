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
    .replaceAll('{{PHP_VARIANT}}', context.phpVariant || 'cli')
    .replaceAll('{{POST_START_COMMAND}}', context.postStartCommand)
    .replaceAll('{{POST_CREATE_COMMAND}}', context.postCreateCommand || '')
    .replaceAll('{{LAUNCH_INDEX_PATH}}', context.launchIndexPath || '')
    .replaceAll(
      '{{CLAUDE_AI_FEATURE}}',
      context.enableClaudeAi
        ? ',\n        "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {}'
        : ''
    );
}

/**
 * Unified devcontainer.json template
 */
const DEVCONTAINER_JSON_TEMPLATE = `{
    "name": "{{PROJECT_NAME}}",
    "workspaceMount": "source={{VOLUME_NAME}},target=/workspace,type=volume",
    "workspaceFolder": "/workspace/{{WORKSPACE_FOLDER_NAME}}",
    "build": {
        "dockerfile": "./Dockerfile",
        "context": ".",
        "target": "development",
        "args": {
            "USER_ID": "1000",
            "GROUP_ID": "1000"
        }
    },
    "features": {
        "ghcr.io/devcontainers/features/common-utils:2": {
            "installZsh": "true",
            "configureZshAsDefaultShell": "true",
            "installOhMyZsh": "true",
            "installOhMyZshConfig": "true",
            "upgradePackages": "true"
        },
        "ghcr.io/devcontainers/features/git:1": {
            "version": "latest",
            "ppa": "false"
        },
        "ghcr.io/devcontainers/features/node:1": {
            "version": "{{NODE_VERSION}}"
        },
        "ghcr.io/opencodeco/devcontainers/install-php-extensions:0": {
            "extensions": "{{PHP_EXTENSIONS}}"
        }{{CLAUDE_AI_FEATURE}}
    },
    "overrideFeatureInstallOrder": [
        "ghcr.io/devcontainers/features/common-utils"
    ],
    "customizations": {
        "vscode": {
            "settings": {
                "github.copilot.chat.codeGeneration.instructions": [
                    {
                        "text": "This dev container includes \`php\` (with \`xdebug\`), \`pecl\`, \`composer\` pre-installed and available on the \`PATH\`, along with PHP language extensions for PHP development."
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
const DOCKERFILE_TEMPLATE = `############################################
# Base Image
############################################
FROM serversideup/php:{{PHP_VERSION}}-{{PHP_VARIANT}} AS base

############################################
# Development Image
############################################
FROM base AS development

# Switch to root so we can do root things
USER root

# Install xdebug
RUN install-php-extensions xdebug \\
    && echo "zend_extension=$(find /usr/local/lib/php/extensions/ -name xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \\
    && echo "xdebug.mode = develop,debug,trace,coverage,profile" >> /usr/local/etc/php/conf.d/xdebug.ini \\
    && echo "xdebug.start_with_request = trigger" >> /usr/local/etc/php/conf.d/xdebug.ini \\
    && echo "xdebug.client_port = 9003" >> /usr/local/etc/php/conf.d/xdebug.ini \\
    && rm -rf /tmp/pear

# Save the build arguments as a variable
ARG USER_ID
ARG GROUP_ID

# Use the build arguments to change the UID
# and GID of www-data while also changing
# the file permissions for NGINX
RUN docker-php-serversideup-set-id www-data $USER_ID:$GROUP_ID

# Update the file permissions for our NGINX service to match the new UID/GID
# RUN docker-php-serversideup-set-file-permissions --owner $USER_ID:$GROUP_ID --service nginx

# Drop back to our unprivileged user
USER www-data

############################################
# Production Image
############################################

# Since we're calling "base", production isn't
# calling any of that permission stuff
FROM base AS production

# Copy our app files as www-data (33:33)
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
 * Get post-create command (same for all project types)
 * Conditionally installs composer and npm dependencies if files exist
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
  };
}

/**
 * Generate index.php content for basic PHP projects
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
