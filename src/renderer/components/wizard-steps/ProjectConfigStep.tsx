/**
 * Project Configuration Step
 * Project name, folder, and runtime settings
 */

import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Switch } from '@renderer/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import type { FolderSelectionResult, NodeVersion, PhpVersion } from '@shared/types/project';
import { ProjectType } from '@shared/types/project';
import { IconAlertTriangle, IconFolderOpen, IconInfoCircle, IconWorld } from '@tabler/icons-react';
import { useState } from 'react';
import { SiClaude, SiNodedotjs, SiPhp } from 'react-icons/si';
import type { WizardStepProps } from './types';

const PHP_VERSIONS: PhpVersion[] = ['7.4', '8.1', '8.2', '8.3', '8.4'];
const NODE_VERSIONS: NodeVersion[] = ['none', 'lts', 'latest', '20', '22', '24', '25'];

function validateSiteName(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: 'Site name is required' };
  }
  const nameRegex = /^[a-zA-Z0-9-_]+$/;
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      error: 'Site name can only contain letters, numbers, hyphens, and underscores',
    };
  }
  return { isValid: true };
}

function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(?:^-+)|(?:-+$)/g, '');
}

export function ProjectConfigStep({ formData, setFormData }: Readonly<WizardStepProps>) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [folderWarning, setFolderWarning] = useState<string | undefined>();

  const handleSelectFolder = async () => {
    const projectsApi = (globalThis as unknown as Window).projects;
    const result: FolderSelectionResult = await projectsApi.selectFolder();
    if (result.success && result.path) {
      // Check if another project is using this folder
      const projects = await projectsApi.getAllProjects();
      const existingProject = projects.find(p => p.path === result.path);
      if (existingProject) {
        setFolderWarning(`This folder is already used by project "${existingProject.name}"`);
      } else {
        setFolderWarning(undefined);
      }

      setFormData(prev => {
        const newData = { ...prev, path: result.path };
        if (prev.type === ProjectType.Existing && result.path) {
          const folderName = result.path.split(/[\\/]/).pop() || '';
          newData.name = folderName;
          setNameError(undefined);
        }
        return newData;
      });
    }
  };

  const renderNameHint = () => {
    if (formData.name) {
      return (
        <span className="flex items-center gap-1">
          <IconWorld className="h-3 w-3" />
          <span className="font-mono">{sanitizeProjectName(formData.name)}.local</span>
        </span>
      );
    }
    if (formData.type === ProjectType.Existing) {
      return 'Select project folder first';
    }
    return null;
  };

  const getPhpVersionHint = () => {
    if (formData.type === ProjectType.Laravel) {
      return 'Laravel requires PHP 8.2 or higher';
    }
    if (formData.phpVariant === 'frankenphp') {
      return 'FrankenPHP requires PHP 8.3 or higher';
    }
    return 'Select the PHP runtime version for your project';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="project-name">Project Name</Label>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">This will become the domain and folder name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-3">
            <Input
              id="project-name"
              placeholder={
                formData.type === ProjectType.Existing
                  ? 'Select project folder to populate name'
                  : 'My Awesome Project'
              }
              value={formData.name || ''}
              onChange={e => {
                const newName = e.target.value;
                setFormData(prev => ({ ...prev, name: newName }));
                const validation = validateSiteName(newName);
                setNameError(validation.error);
              }}
              readOnly={formData.type === ProjectType.Existing}
              className={`h-12 flex-1 text-lg ${nameError ? 'border-destructive' : ''}`}
            />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={formData.path ? 'default' : 'outline'}
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={handleSelectFolder}
                  >
                    <IconFolderOpen className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {formData.path ||
                      (formData.type === ProjectType.Existing
                        ? 'Select project folder'
                        : 'Select parent folder')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {nameError ? (
            <p className="text-destructive text-xs">{nameError}</p>
          ) : (
            <p className="text-muted-foreground text-xs">{renderNameHint()}</p>
          )}
          {folderWarning && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-xs">{folderWarning}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-blue-600/10">
                <SiPhp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="phpVersion" className="cursor-pointer text-sm font-medium">
                  PHP Version
                </Label>
                <p className="text-muted-foreground text-xs">{getPhpVersionHint()}</p>
              </div>
            </div>
            <Select
              value={formData.phpVersion}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, phpVersion: value as PhpVersion }))
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {PHP_VERSIONS.map(version => (
                  <SelectItem
                    key={version}
                    value={version}
                    disabled={
                      (formData.type === ProjectType.Laravel && ['7.4', '8.1'].includes(version)) ||
                      (formData.phpVariant === 'frankenphp' &&
                        ['7.4', '8.1', '8.2'].includes(version))
                    }
                  >
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-green-600/10">
                <SiNodedotjs className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="nodeVersion" className="cursor-pointer text-sm font-medium">
                  Node.js Version
                </Label>
                <p className="text-muted-foreground text-xs">
                  Runtime version with Node.js, nvm, yarn, pnpm, and dependencies
                </p>
              </div>
            </div>
            <Select
              value={formData.nodeVersion}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, nodeVersion: value as NodeVersion }))
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {NODE_VERSIONS.map(version => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-orange-600/10">
                <SiClaude className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <Label htmlFor="claudeAI" className="cursor-pointer text-sm font-medium">
                  Add Claude Code CLI
                </Label>
                <p className="text-muted-foreground text-xs">
                  Include Claude Code CLI coding assistant in your devcontainer
                </p>
              </div>
            </div>
            <Switch
              checked={formData.enableClaudeAi || false}
              onCheckedChange={(checked: boolean) =>
                setFormData(prev => ({ ...prev, enableClaudeAi: checked }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
