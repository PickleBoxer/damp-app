import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import electronPlugin from 'eslint-plugin-electron';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';
import pluginQuery from '@tanstack/eslint-plugin-query';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prettierIgnorePath = path.resolve(__dirname, '.prettierignore');

/** @type {import('eslint').Linter.Config[]} */
export default defineConfig([
  includeIgnoreFile(prettierIgnorePath),

  // Base configuration for all files
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Base configs
  pluginJs.configs.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],

  // Import plugin configuration
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx', '.mts'],
      },
    },
    rules: {
      // Critical errors
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/no-absolute-path': 'error',

      // Code quality (warnings)
      'import/no-duplicates': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',

      // Disabled for performance/compatibility
      'import/namespace': 'off',
      'import/no-cycle': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },

  // Electron main process + preload
  {
    files: ['src/main/**/*.{ts,mts}', 'src/preload.ts'],
    plugins: {
      electron: electronPlugin,
    },
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'electron/no-deprecated-apis': 'error',
      'electron/no-deprecated-arguments': 'error',
      'electron/no-deprecated-props': 'error',
      'electron/default-value-changed': 'warn',
    },
  },

  // Renderer process adjustments
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      // React Compiler handles optimization
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Third-party shadcn-io components - allow any types
  {
    files: ['src/renderer/components/ui/shadcn-io/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/refs': 'off',
    },
  },

  // Prettier last (disables conflicting formatting rules)
  prettierConfig,
]);
