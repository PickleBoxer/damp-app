import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Check, FolderOpen, Info, ChevronDown } from 'lucide-react';
import { useCreateProject } from '@/api/projects/projects-queries';
import { selectFolder as selectProjectFolder } from '@/api/projects/projects-api';
import { ProjectType } from '@/types/project';
import type { CreateProjectInput, PhpVersion, NodeVersion, PhpVariant } from '@/types/project';
import { ProjectIcon } from '@/components/ProjectIcon';
import { SiClaude, SiNodedotjs, SiPhp } from 'react-icons/si';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Validates a site name according to naming rules
 */
function validateSiteName(name: string): {
  isValid: boolean;
  error?: string;
} {
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

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'type' | 'basic' | 'variant' | 'runtime' | 'extensions' | 'review';

const PROJECT_TYPES: Array<{ value: ProjectType; label: string; description: string }> = [
  {
    value: ProjectType.BasicPhp,
    label: 'Basic PHP',
    description: 'A flexible PHP scaffold you can build on',
  },
  {
    value: ProjectType.Laravel,
    label: 'Laravel',
    description: 'Laravel framework project (requires PHP 8.2+)',
  },
  {
    value: ProjectType.Existing,
    label: 'Existing Project',
    description: 'Import an existing PHP project',
  },
];

const PHP_VERSIONS: PhpVersion[] = ['7.4', '8.1', '8.2', '8.3', '8.4'];
const NODE_VERSIONS: NodeVersion[] = ['none', 'lts', 'latest', '20', '22', '24', '25'];

const PHP_VARIANTS: Array<{ value: PhpVariant; label: string; description: string }> = [
  {
    value: 'fpm-apache',
    label: 'FPM-Apache',
    description: 'Apache + PHP-FPM (WordPress, .htaccess support)',
  },
  {
    value: 'fpm-nginx',
    label: 'FPM-NGINX',
    description: 'NGINX + PHP-FPM (better performance)',
  },
  {
    value: 'frankenphp',
    label: 'FrankenPHP',
    description: 'Modern high-performance (HTTP/2, HTTP/3)',
  },
  {
    value: 'fpm',
    label: 'FPM Only',
    description: 'PHP-FPM only (requires external web server)',
  },
];

// Extensions that come pre-installed with the container (always included)
const PREINSTALLED_PHP_EXTENSIONS = [
  'ctype',
  'curl',
  'dom',
  'fileinfo',
  'filter',
  'hash',
  'mbstring',
  'openssl',
  'pcre',
  'session',
  'tokenizer',
  'xdebug',
  'xml',
  'opcache',
  'mysqli',
  'pcntl',
  'pdo_mysql',
  'pdo_pgsql',
  'redis',
  'zip',
];

// Additional extensions users can optionally install
const ADDITIONAL_PHP_EXTENSIONS = [
  'bcmath',
  'gd',
  'intl',
  'memcached',
  'imagick',
  'soap',
  'xsl',
  'apcu',
  'sodium',
  'exif',
  'ldap',
  'pgsql',
];

export function CreateProjectWizard({ open, onOpenChange }: Readonly<CreateProjectWizardProps>) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<Partial<CreateProjectInput>>({
    type: ProjectType.BasicPhp,
    phpVersion: '8.3',
    phpVariant: 'fpm-apache',
    nodeVersion: 'none',
    enableClaudeAi: false,
    phpExtensions: ['bcmath', 'gd', 'intl'], // Only additional extensions (pre-installed are always included)
  });
  const [nameError, setNameError] = useState<string | undefined>();
  const [extensionsExpanded, setExtensionsExpanded] = useState(false);

  const createProjectMutation = useCreateProject();

  const handleSelectFolder = async () => {
    const result = await selectProjectFolder();
    if (result.success && result.path) {
      setFormData(prev => ({ ...prev, path: result.path }));
    }
  };

  const handleNext = () => {
    const steps: WizardStep[] = ['type', 'basic', 'variant', 'runtime', 'extensions', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ['type', 'basic', 'variant', 'runtime', 'extensions', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleCreate = async () => {
    if (!formData.path || !formData.name) return;

    await createProjectMutation.mutateAsync({
      name: formData.name,
      path: formData.path,
      type: formData.type || ProjectType.BasicPhp,
      phpVersion: formData.phpVersion || '8.3',
      phpVariant: formData.phpVariant || 'fpm-apache',
      nodeVersion: formData.nodeVersion || 'none',
      enableClaudeAi: formData.enableClaudeAi || false,
      phpExtensions: formData.phpExtensions || [], // Only send additional extensions
    });

    // Reset and close
    onOpenChange(false);
    setStep('type');
    setFormData({
      type: ProjectType.BasicPhp,
      phpVersion: '8.3',
      phpVariant: 'fpm-apache',
      nodeVersion: 'none',
      enableClaudeAi: false,
      phpExtensions: ['bcmath', 'gd', 'intl'],
    });

    // Navigate to projects list
    navigate({ to: '/projects' });
  };

  const toggleExtension = (extension: string) => {
    setFormData(prev => {
      const currentExtensions = prev.phpExtensions || [];
      if (currentExtensions.includes(extension)) {
        return {
          ...prev,
          phpExtensions: currentExtensions.filter(ext => ext !== extension),
        };
      } else {
        return {
          ...prev,
          phpExtensions: [...currentExtensions, extension],
        };
      }
    });
  };

  const canProceed = () => {
    switch (step) {
      case 'type':
        return !!formData.type;
      case 'basic': {
        const validation = validateSiteName(formData.name || '');
        return validation.isValid && !!formData.path;
      }
      case 'variant':
        return !!formData.phpVariant;
      case 'runtime':
        return !!formData.phpVersion && !!formData.nodeVersion;
      case 'extensions':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'type':
        return (
          <div className="space-y-4">
            <div className="space-y-2"></div>
            <div className="space-y-2">
              {PROJECT_TYPES.map(type => (
                <div
                  key={type.value}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, type: type.value }));
                  }}
                  className={`border-input hover:border-primary flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${
                    formData.type === type.value ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <ProjectIcon projectType={type.value} className="text-primary h-8 w-8 shrink-0" />
                  <div className="flex flex-col">
                    <div className="font-medium">{type.label}</div>
                    <p className="text-muted-foreground mt-1 text-sm">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="My Awesome Project"
                value={formData.name || ''}
                onChange={e => {
                  const newName = e.target.value;
                  setFormData(prev => ({ ...prev, name: newName }));

                  // Validate on change
                  const validation = validateSiteName(newName);
                  setNameError(validation.error);
                }}
                className={nameError ? 'border-destructive h-10' : 'h-10'}
              />
              {nameError ? (
                <p className="text-destructive text-xs">{nameError}</p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  This will become the domain ({formData.name || 'site-name'}.local)
                  {formData.type !== ProjectType.Existing && ' and folder name'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Parent Folder *</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  placeholder="Click to select parent folder..."
                  value={formData.path || ''}
                  className="h-10 flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleSelectFolder}>
                  <FolderOpen />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Site folder will be created inside this directory
              </p>
            </div>
          </div>
        );

      case 'variant':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 p-4 dark:border-purple-800 dark:from-purple-950/30 dark:to-violet-950/30">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-600/10">
                    <SiPhp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="phpVariant" className="cursor-pointer text-sm font-medium">
                      PHP Variant
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Choose web server and runtime configuration
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {PHP_VARIANTS.map(variant => (
                    <div
                      key={variant.value}
                      onClick={() => {
                        setFormData(prev => {
                          const newData = { ...prev, phpVariant: variant.value };
                          // Auto-upgrade PHP version if FrankenPHP selected and version is < 8.3
                          if (
                            variant.value === 'frankenphp' &&
                            prev.phpVersion &&
                            ['7.4', '8.1', '8.2'].includes(prev.phpVersion)
                          ) {
                            newData.phpVersion = '8.3';
                          }
                          return newData;
                        });
                      }}
                      className={`border-input hover:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        formData.phpVariant === variant.value ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="text-sm font-medium">{variant.label}</div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {variant.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">
                Powered by{' '}
                <button
                  type="button"
                  onClick={() =>
                    window.electronWindow.openExternal(
                      'https://serversideup.net/open-source/docker-php/docs/getting-started'
                    )
                  }
                  className="text-primary cursor-pointer font-medium hover:underline"
                >
                  ServerSideUp Docker PHP
                </button>{' '}
                images
              </p>
            </div>
          </div>
        );

      case 'runtime':
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SiPhp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <Label htmlFor="phpVersion" className="cursor-pointer text-sm font-medium">
                      PHP Version
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {formData.type === ProjectType.Laravel
                        ? 'Laravel requires PHP 8.2 or higher'
                        : formData.phpVariant === 'frankenphp'
                          ? 'FrankenPHP requires PHP 8.3 or higher'
                          : 'Select the PHP runtime version for your project'}
                    </p>
                  </div>
                </div>
                <Select
                  value={formData.phpVersion}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, phpVersion: value as PhpVersion }))
                  }
                >
                  <SelectTrigger className="w-[80px] rounded-md">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {PHP_VERSIONS.map(version => (
                      <SelectItem
                        key={version}
                        value={version}
                        disabled={
                          (formData.type === ProjectType.Laravel &&
                            ['7.4', '8.1'].includes(version)) ||
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

            <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SiNodedotjs className="text-green-600 dark:text-green-400" />
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
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, nodeVersion: value as NodeVersion }))
                  }
                >
                  <SelectTrigger className="w-[80px] rounded-md">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {NODE_VERSIONS.map(version => (
                      <SelectItem key={version} value={version}>
                        {version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 dark:border-orange-800 dark:from-orange-950/30 dark:to-amber-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SiClaude className="text-orange-600 dark:text-orange-400" />
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
                  onCheckedChange={checked =>
                    setFormData(prev => ({ ...prev, enableClaudeAi: checked }))
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'extensions':
        return (
          <div className="space-y-6">
            {/* Pre-installed Extensions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Check className="text-primary h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Pre-installed Extensions</h4>
                  <p className="text-muted-foreground text-xs">
                    Included by default • {PREINSTALLED_PHP_EXTENSIONS.length} extensions
                  </p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg border p-4">
                <div className="flex flex-wrap gap-1.5">
                  {PREINSTALLED_PHP_EXTENSIONS.map(ext => (
                    <Badge
                      key={ext}
                      variant="outline"
                      className="bg-background rounded-md font-mono text-xs"
                    >
                      {ext}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Extensions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Info className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Additional Extensions</h4>
                  <p className="text-muted-foreground text-xs">
                    Optional • {formData.phpExtensions?.length || 0} selected
                  </p>
                </div>
              </div>
              <ScrollArea>
                <div className="flex flex-wrap gap-2 pr-4">
                  {ADDITIONAL_PHP_EXTENSIONS.map(ext => {
                    const isChecked = formData.phpExtensions?.includes(ext);
                    return (
                      <label
                        key={ext}
                        htmlFor={`ext-${ext}`}
                        className={`group/ext flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border px-3 py-1.5 transition-all duration-100 ease-linear ${
                          isChecked
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 px-2'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <Checkbox
                          id={`ext-${ext}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleExtension(ext)}
                          className={`size-4 shrink-0 rounded-full border shadow-sm transition-all duration-100 ease-linear ${
                            isChecked
                              ? 'ml-0 translate-x-0'
                              : 'border-input dark:bg-input/30 -ml-6 -translate-x-1'
                          }`}
                        />
                        <span className="font-mono text-sm leading-snug">{ext}</span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        );

      case 'review':
        return (
          <ScrollArea>
            <div className="space-y-4 pr-4">
              {/* Project Overview Card */}
              <div className="from-background to-muted/20 rounded-lg border bg-gradient-to-br p-4">
                <div className="mb-4 flex items-center gap-3">
                  <ProjectIcon projectType={formData.type!} className="h-10 w-10" />
                  <div>
                    <h3 className="text-lg font-semibold">{formData.name}</h3>
                    <p className="text-muted-foreground text-xs">{formData.name}.local</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Project Type</span>
                    <span className="font-medium capitalize">
                      {formData.type?.replace('-', ' ')}
                    </span>
                  </div>
                  <Separator className="bg-border/50" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-mono text-xs">{formData.path}</span>
                  </div>
                </div>
              </div>

              {/* Runtime Configuration */}
              <div className="space-y-3">
                <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 p-3.5 dark:border-purple-800 dark:from-purple-950/30 dark:to-violet-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SiPhp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium">PHP Variant</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-background rounded-md text-xs capitalize"
                    >
                      {PHP_VARIANTS.find(v => v.value === formData.phpVariant)?.label}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SiPhp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium">PHP</span>
                      </div>
                      <Badge variant="secondary" className="bg-background rounded-md font-mono">
                        {formData.phpVersion}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3.5 dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SiNodedotjs className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium">Node.js</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-background rounded-md font-mono capitalize"
                      >
                        {formData.nodeVersion}
                      </Badge>
                    </div>
                  </div>
                </div>

                {formData.enableClaudeAi && (
                  <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-3.5 dark:border-orange-800 dark:from-orange-950/30 dark:to-amber-950/30">
                    <div className="flex items-center gap-2">
                      <SiClaude className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium">Claude Code CLI</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        Enabled
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Extensions Summary */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setExtensionsExpanded(!extensionsExpanded)}
                  className="hover:bg-muted/50 flex w-full items-center justify-between p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold">PHP Extensions</h4>
                    <Badge variant="outline" className="bg-background rounded-md text-xs">
                      {PREINSTALLED_PHP_EXTENSIONS.length + (formData.phpExtensions?.length || 0)}{' '}
                      total
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground h-4 w-4 transition-transform ${
                      extensionsExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {extensionsExpanded && (
                  <div className="space-y-3 border-t px-4 pt-3 pb-4">
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">
                        Pre-installed ({PREINSTALLED_PHP_EXTENSIONS.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {PREINSTALLED_PHP_EXTENSIONS.slice(0, 8).map(ext => (
                          <Badge
                            key={ext}
                            variant="outline"
                            className="bg-background rounded-md font-mono text-xs"
                          >
                            {ext}
                          </Badge>
                        ))}
                        {PREINSTALLED_PHP_EXTENSIONS.length > 8 && (
                          <Badge variant="outline" className="bg-background rounded-md text-xs">
                            +{PREINSTALLED_PHP_EXTENSIONS.length - 8} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    {formData.phpExtensions && formData.phpExtensions.length > 0 && (
                      <div className="bg-primary/5 rounded-md p-3">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          Additional ({formData.phpExtensions.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {formData.phpExtensions.map(ext => (
                            <Badge key={ext} className="rounded-md font-mono text-xs">
                              {ext}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'type':
        return 'Choose Project Type';
      case 'basic':
        return 'Basic Information';
      case 'variant':
        return 'PHP Variant';
      case 'runtime':
        return 'Runtime Configuration';
      case 'extensions':
        return 'PHP Extensions';
      case 'review':
        return 'Review & Create';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Select the type of project you want to create'}
            {step === 'basic' && 'Enter the basic details for your project'}
            {step === 'variant' && 'Choose the web server and PHP runtime variant'}
            {step === 'runtime' && 'Configure PHP, Node.js, and other options'}
            {step === 'extensions' && 'Choose the PHP extensions you need'}
            {step === 'review' && 'Review your project configuration before creating'}
          </DialogDescription>
        </DialogHeader>

        {renderStepContent()}

        <DialogFooter className="flex-row justify-between">
          {step !== 'type' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={createProjectMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          <div className="flex gap-2">
            {step !== 'review' ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || createProjectMutation.isPending}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!canProceed() || createProjectMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
