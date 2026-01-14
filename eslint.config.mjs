import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import electronPlugin from 'eslint-plugin-electron';
import pluginQuery from '@tanstack/eslint-plugin-query';
import pluginRouter from '@tanstack/eslint-plugin-router';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prettierIgnorePath = path.resolve(__dirname, '.prettierignore');

/** @type {import('eslint').Linter.Config[]} */
export default defineConfig([
  includeIgnoreFile(prettierIgnorePath),

  // Base configs
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  ...pluginQuery.configs['flat/recommended'],
  ...pluginRouter.configs['flat/recommended'],

  // Global settings
  {
    settings: {
      react: {
        version: 'detect',
      },
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
      ...electronPlugin.configs.recommended.rules,
    },
  },

  // Renderer process (React + Vite)
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn', // React Compiler handles optimization
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
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
