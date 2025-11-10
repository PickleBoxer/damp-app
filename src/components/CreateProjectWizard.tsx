import { useState } from 'react';
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
import { ArrowLeft, ArrowRight, Check, FolderOpen } from 'lucide-react';
import { useCreateProject } from '@/api/projects/projects-queries';
import { selectFolder as selectProjectFolder } from '@/api/projects/projects-api';
import { ProjectType } from '@/types/project';
import type { CreateProjectInput, PhpVersion, NodeVersion } from '@/types/project';

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

type WizardStep = 'type' | 'basic' | 'configuration' | 'extensions' | 'review';

const PROJECT_TYPES: Array<{ value: ProjectType; label: string; description: string }> = [
  {
    value: ProjectType.BasicPhp,
    label: 'Basic PHP',
    description: 'Simple PHP project with Apache server',
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
const NODE_VERSIONS: NodeVersion[] = ['none', 'lts', 'latest', '20', '22'];

const DEFAULT_PHP_EXTENSIONS = [
  'pdo_mysql',
  'mysqli',
  'mbstring',
  'xml',
  'curl',
  'zip',
  'gd',
  'intl',
  'bcmath',
];

const OPTIONAL_PHP_EXTENSIONS = [
  'redis',
  'memcached',
  'imagick',
  'soap',
  'xsl',
  'opcache',
  'apcu',
  'xdebug',
];

export function CreateProjectWizard({ open, onOpenChange }: Readonly<CreateProjectWizardProps>) {
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<Partial<CreateProjectInput>>({
    type: ProjectType.BasicPhp,
    phpVersion: '8.3',
    nodeVersion: 'none',
    enableClaudeAi: false,
    phpExtensions: [...DEFAULT_PHP_EXTENSIONS],
  });
  const [nameError, setNameError] = useState<string | undefined>();

  const createProjectMutation = useCreateProject();

  const handleSelectFolder = async () => {
    const result = await selectProjectFolder();
    if (result.success && result.path) {
      setFormData(prev => ({ ...prev, path: result.path }));
    }
  };

  const handleNext = () => {
    const steps: WizardStep[] = ['type', 'basic', 'configuration', 'extensions', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ['type', 'basic', 'configuration', 'extensions', 'review'];
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
      nodeVersion: formData.nodeVersion || 'none',
      enableClaudeAi: formData.enableClaudeAi || false,
      phpExtensions: formData.phpExtensions || DEFAULT_PHP_EXTENSIONS,
    });

    // Reset and close
    onOpenChange(false);
    setStep('type');
    setFormData({
      type: ProjectType.BasicPhp,
      phpVersion: '8.3',
      nodeVersion: 'none',
      enableClaudeAi: false,
      phpExtensions: [...DEFAULT_PHP_EXTENSIONS],
    });
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
      case 'configuration':
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
            <div className="space-y-2">
              <Label>Project Type</Label>
              <p className="text-muted-foreground text-sm">
                Choose the type of project you want to create
              </p>
            </div>
            <div className="space-y-2">
              {PROJECT_TYPES.map(type => (
                <div
                  key={type.value}
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  className={`border-input hover:border-primary cursor-pointer rounded-lg border p-4 transition-colors ${
                    formData.type === type.value ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <p className="text-muted-foreground mt-1 text-sm">{type.description}</p>
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
                className={nameError ? 'border-destructive' : ''}
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
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleSelectFolder}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Site folder will be created inside this directory
              </p>
            </div>
          </div>
        );

      case 'configuration':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>PHP Version</Label>
              <div className="flex flex-wrap gap-2">
                {PHP_VERSIONS.map(version => (
                  <Badge
                    key={version}
                    variant={formData.phpVersion === version ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, phpVersion: version }))}
                  >
                    PHP {version}
                  </Badge>
                ))}
              </div>
              {formData.type === ProjectType.Laravel &&
                formData.phpVersion &&
                ['7.4', '8.1'].includes(formData.phpVersion) && (
                  <p className="text-destructive text-sm">Laravel requires PHP 8.2 or higher</p>
                )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Node.js Version</Label>
              <div className="flex flex-wrap gap-2">
                {NODE_VERSIONS.map(version => (
                  <Badge
                    key={version}
                    variant={formData.nodeVersion === version ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, nodeVersion: version }))}
                  >
                    {version === 'none' ? 'None' : `Node ${version}`}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Claude AI Integration</Label>
                <p className="text-muted-foreground text-sm">Enable AI-powered coding assistance</p>
              </div>
              <Switch
                checked={formData.enableClaudeAi || false}
                onCheckedChange={checked =>
                  setFormData(prev => ({ ...prev, enableClaudeAi: checked }))
                }
              />
            </div>
          </div>
        );

      case 'extensions':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>PHP Extensions</Label>
              <p className="text-muted-foreground text-sm">
                Select the PHP extensions you need for your project
              </p>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium">Default Extensions</h4>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_PHP_EXTENSIONS.map(ext => (
                      <Badge
                        key={ext}
                        variant={formData.phpExtensions?.includes(ext) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleExtension(ext)}
                      >
                        {ext}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 text-sm font-medium">Optional Extensions</h4>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONAL_PHP_EXTENSIONS.map(ext => (
                      <Badge
                        key={ext}
                        variant={formData.phpExtensions?.includes(ext) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleExtension(ext)}
                      >
                        {ext}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        );

      case 'review':
        return (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Project Details</h4>
                <div className="bg-muted space-y-2 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">
                      {formData.type?.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domain:</span>
                    <span className="font-medium">{formData.name}.local (auto-sanitized)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parent Path:</span>
                    <span className="font-mono text-xs">{formData.path}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Configuration</h4>
                <div className="bg-muted space-y-2 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PHP Version:</span>
                    <span className="font-medium">{formData.phpVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Node Version:</span>
                    <span className="font-medium capitalize">{formData.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Claude AI:</span>
                    <span className="font-medium">
                      {formData.enableClaudeAi ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  PHP Extensions ({formData.phpExtensions?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {formData.phpExtensions?.map(ext => (
                    <Badge key={ext} variant="secondary">
                      {ext}
                    </Badge>
                  ))}
                </div>
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
      case 'configuration':
        return 'Configuration';
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
            {step === 'configuration' && 'Configure PHP, Node.js, and other options'}
            {step === 'extensions' && 'Choose the PHP extensions you need'}
            {step === 'review' && 'Review your project configuration before creating'}
          </DialogDescription>
        </DialogHeader>

        {renderStepContent()}

        <DialogFooter className="flex-row justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 'type' || createProjectMutation.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

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
