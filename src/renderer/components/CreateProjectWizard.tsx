import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@renderer/components/ui/collapsible';
import { ArrowLeft, ArrowRight, FolderOpen, Info, ChevronDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { useCreateProject } from '@renderer/hooks/use-projects';
import {
  ProjectCreationTerminal,
  type TerminalLog,
} from '@renderer/components/ProjectCreationTerminal';
import { ProjectType } from '@shared/types/project';
import type {
  CreateProjectInput,
  PhpVersion,
  NodeVersion,
  PhpVariant,
  FolderSelectionResult,
} from '@shared/types/project';
import { ProjectIcon } from '@renderer/components/ProjectIcon';
import { SiClaude, SiNodedotjs, SiPhp, SiReact, SiVuedotjs, SiLivewire } from 'react-icons/si';
import {
  TbBolt,
  TbFlask,
  TbLock,
  TbShieldCheck,
  TbCode,
  TbLink,
  TbRocket,
  TbCheck,
  TbWorld,
} from 'react-icons/tb';
import {
  PREINSTALLED_PHP_EXTENSIONS,
  ADDITIONAL_PHP_EXTENSIONS,
} from '@shared/constants/php-extensions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';

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

/**
 * Sanitizes a project name to match backend logic
 * Converts to lowercase and replaces non-alphanumeric characters with hyphens
 */
function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(?:^-+)|(?:-+$)/g, ''); // Remove leading/trailing hyphens
}

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'type' | 'laravel-starter' | 'laravel-config' | 'basic' | 'variant';

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  {
    value: ProjectType.BasicPhp,
    label: 'Custom',
    description: 'A flexible PHP scaffold you can build on',
  },
  {
    value: ProjectType.Laravel,
    label: 'Laravel',
    description: 'Laravel framework project',
  },
  {
    value: ProjectType.Existing,
    label: 'Existing',
    description: 'Import an existing PHP project',
  },
];

const PHP_VERSIONS: PhpVersion[] = ['7.4', '8.1', '8.2', '8.3', '8.4'];
const NODE_VERSIONS: NodeVersion[] = ['none', 'lts', 'latest', '20', '22', '24', '25'];

const PHP_VARIANTS: { value: PhpVariant; label: string; description: string }[] = [
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

export function CreateProjectWizard({ open, onOpenChange }: Readonly<CreateProjectWizardProps>) {
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<Partial<CreateProjectInput>>({
    type: ProjectType.BasicPhp,
    phpVersion: '8.4',
    phpVariant: 'fpm-apache',
    nodeVersion: 'latest',
    enableClaudeAi: false,
    phpExtensions: [],
  });
  const [nameError, setNameError] = useState<string | undefined>();
  const [additionalExpanded, setAdditionalExpanded] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Reset wizard state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Prevent closing during project creation
      if (!newOpen && isCreating) {
        return;
      }

      if (!newOpen) {
        // Reset all state when closing
        setStep('type');
        setFormData({
          type: ProjectType.BasicPhp,
          phpVersion: '8.4',
          phpVariant: 'fpm-apache',
          nodeVersion: 'latest',
          enableClaudeAi: false,
          phpExtensions: [],
        });
        setNameError(undefined);
        setAdditionalExpanded(false);
        setTerminalLogs([]);
        setShowTerminal(false);
        setIsCreating(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, isCreating]
  );

  // Add keyboard listener to close dialog when creation is finished
  useEffect(() => {
    if (!isCreating && showTerminal && terminalLogs.length > 0) {
      const handleKeyPress = () => {
        // Close on any key press
        handleOpenChange(false);
      };

      globalThis.addEventListener('keydown', handleKeyPress);
      return () => globalThis.removeEventListener('keydown', handleKeyPress);
    }
  }, [isCreating, showTerminal, terminalLogs.length, handleOpenChange]);

  const createProjectMutation = useCreateProject();

  // Subscribe to copy progress events
  useEffect(() => {
    const unsubscribe = (globalThis as unknown as Window).projects.onCopyProgress(
      (projectId, progress) => {
        const log: TerminalLog = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          message: progress.message,
          type: progress.stage === 'complete' ? 'success' : 'progress',
          stage: progress.stage,
        };
        setTerminalLogs(prev => [...prev, log]);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSelectFolder = async () => {
    const projectsApi = (globalThis as unknown as Window).projects;
    const result: FolderSelectionResult = await projectsApi.selectFolder();
    if (result.success && result.path) {
      setFormData(prev => {
        const newData = { ...prev, path: result.path };

        // For existing projects, extract folder name from path
        if (prev.type === ProjectType.Existing && result.path) {
          const folderName = result.path.split(/[\\/]/).pop() || '';
          newData.name = folderName;

          // Clear any validation errors since we have a valid folder name
          setNameError(undefined);
        }

        return newData;
      });
    }
  };

  const handleNext = () => {
    let steps: WizardStep[] = ['type', 'basic', 'variant'];

    // Insert laravel-starter and laravel-config steps for fresh Laravel projects
    if (formData.type === ProjectType.Laravel) {
      steps = ['type', 'laravel-starter', 'laravel-config', 'basic', 'variant'];
    }

    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      // Last step - trigger project creation
      handleCreate();
    }
  };

  const handleBack = () => {
    let steps: WizardStep[] = ['type', 'basic', 'variant'];

    // Insert laravel-starter and laravel-config steps for fresh Laravel projects
    if (formData.type === ProjectType.Laravel) {
      steps = ['type', 'laravel-starter', 'laravel-config', 'basic', 'variant'];
    }

    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleCreate = async () => {
    if (!formData.path || !formData.name) return;

    // Show terminal and reset logs
    setShowTerminal(true);
    setIsCreating(true);
    setTerminalLogs([
      {
        id: `${Date.now()}-start`,
        timestamp: new Date(),
        message: '🚀 Starting project creation...',
        type: 'info',
      },
    ]);

    try {
      // Add initial steps
      setTerminalLogs(prev => [
        ...prev,
        {
          id: `${Date.now()}-validate`,
          timestamp: new Date(),
          message: '✓ Validating project configuration',
          type: 'success',
        },
        {
          id: `${Date.now()}-folder`,
          timestamp: new Date(),
          message:
            formData.type === ProjectType.Existing
              ? `📁 Analyzing existing project: ${formData.name}`
              : `📁 Creating project folder: ${formData.name}`,
          type: 'progress',
        },
      ]);

      await createProjectMutation.mutateAsync({
        name: formData.name,
        path: formData.path,
        type: formData.type || ProjectType.BasicPhp,
        phpVersion: formData.phpVersion || '8.3',
        phpVariant: formData.phpVariant || 'fpm-apache',
        nodeVersion: formData.nodeVersion || 'none',
        enableClaudeAi: formData.enableClaudeAi || false,
        phpExtensions: formData.phpExtensions || [], // Only send additional extensions
        laravelOptions: formData.laravelOptions, // Include Laravel options if present
        overwriteExisting: formData.type === ProjectType.Existing, // Set to true for existing projects
      });

      // Success log (mutation already validated success)
      setTerminalLogs(prev => [
        ...prev,
        {
          id: `${Date.now()}-complete`,
          timestamp: new Date(),
          message: `✅ Project "${formData.name}" created successfully!`,
          type: 'success',
        },
        {
          id: `${Date.now()}-next`,
          timestamp: new Date(),
          message: '',
          type: 'info',
        },
        {
          id: `${Date.now()}-press-key`,
          timestamp: new Date(),
          message: 'Press any key to close...',
          type: 'info',
        },
      ]);

      setIsCreating(false);

      // Don't auto-close - let user review the terminal output
    } catch (error) {
      console.error('Project creation error:', error);

      setTerminalLogs(prev => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          timestamp: new Date(),
          message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
        },
        {
          id: `${Date.now()}-next`,
          timestamp: new Date(),
          message: '',
          type: 'info',
        },
        {
          id: `${Date.now()}-press-key`,
          timestamp: new Date(),
          message: 'Press any key to close...',
          type: 'info',
        },
      ]);
      setIsCreating(false);
    }
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
      case 'laravel-starter':
        // Custom URL validation for custom starter kit
        if (formData.laravelOptions?.starterKit === 'custom') {
          return !!formData.laravelOptions?.customStarterKitUrl?.trim();
        }
        return !!formData.laravelOptions?.starterKit;
      case 'laravel-config':
        return true;
      case 'basic': {
        const validation = validateSiteName(formData.name || '');
        return (
          validation.isValid && !!formData.path && !!formData.phpVersion && !!formData.nodeVersion
        );
      }
      case 'variant':
        return !!formData.phpVariant;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'type':
        return (
          <div className="grid grid-cols-3 gap-4">
            {PROJECT_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setFormData(prev => {
                    const newData = { ...prev, type: type.value };
                    // Initialize Laravel options with defaults when selecting Laravel
                    if (type.value === ProjectType.Laravel && !prev.laravelOptions) {
                      newData.laravelOptions = {
                        starterKit: 'none',
                        authentication: 'laravel',
                        useVolt: false,
                        testingFramework: 'pest',
                        installBoost: false,
                      };
                    }
                    return newData;
                  });
                  // Auto-advance to next step after selecting type
                  // Determine next step based on project type
                  setTimeout(() => {
                    if (type.value === ProjectType.Laravel) {
                      setStep('laravel-starter');
                    } else {
                      setStep('basic');
                    }
                  }, 100);
                }}
                className={`group hover:border-primary/50 relative flex flex-col items-center gap-3 border-2 p-6 text-center transition-all ${
                  formData.type === type.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-background'
                }`}
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-xl transition-all ${
                    formData.type === type.value
                      ? 'bg-primary/10 scale-105'
                      : 'bg-muted/50 group-hover:bg-primary/5 group-hover:scale-105'
                  }`}
                >
                  <ProjectIcon
                    projectType={type.value}
                    className={`h-8 w-8 transition-colors ${
                      formData.type === type.value
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-primary'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold">{type.label}</div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{type.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                {formData.type === type.value && (
                  <div className="absolute top-3 right-3">
                    <TbCheck className="text-primary h-5 w-5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        );

      case 'laravel-starter': {
        const starterKit = formData.laravelOptions?.starterKit || 'none';

        const starterKits = [
          { value: 'none', label: 'None', icon: TbCode, desc: 'Blank Laravel application' },
          { value: 'react', label: 'React', icon: SiReact, desc: 'React with Inertia.js' },
          { value: 'vue', label: 'Vue', icon: SiVuedotjs, desc: 'Vue with Inertia.js' },
          {
            value: 'livewire',
            label: 'Livewire',
            icon: SiLivewire,
            desc: 'Full-stack with Livewire',
          },
          { value: 'custom', label: 'Custom', icon: TbLink, desc: 'Custom GitHub repository' },
        ];

        return (
          <div className="space-y-4">
            {/* Starter Kit Grid */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Starter Kit</Label>
              <div className="grid grid-cols-2 gap-4">
                {starterKits.map(kit => {
                  const Icon = kit.icon;
                  const isSelected = starterKit === kit.value;
                  return (
                    <button
                      key={kit.value}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          laravelOptions: {
                            starterKit: kit.value as
                              | 'none'
                              | 'react'
                              | 'vue'
                              | 'livewire'
                              | 'custom',
                            authentication: prev.laravelOptions?.authentication || 'none',
                            useVolt: prev.laravelOptions?.useVolt || false,
                            testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                            installBoost: prev.laravelOptions?.installBoost || false,
                            customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                          },
                        }))
                      }
                      className={`group hover:border-primary/50 relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 transition-colors ${
                          isSelected
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-primary'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{kit.label}</div>
                        <div className="text-muted-foreground text-xs">{kit.desc}</div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <TbCheck className="text-primary h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {starterKit === 'custom' && (
                <Input
                  placeholder="https://github.com/username/repo"
                  value={formData.laravelOptions?.customStarterKitUrl || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      laravelOptions: {
                        starterKit: 'custom',
                        customStarterKitUrl: e.target.value,
                        authentication: prev.laravelOptions?.authentication || 'none',
                        useVolt: prev.laravelOptions?.useVolt || false,
                        testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                        installBoost: prev.laravelOptions?.installBoost || false,
                      },
                    }))
                  }
                />
              )}
            </div>
          </div>
        );
      }

      case 'laravel-config': {
        const starterKit = formData.laravelOptions?.starterKit || 'none';
        const hasStarterKit = starterKit !== 'none' && starterKit !== 'custom';
        const isLivewire = starterKit === 'livewire';
        const authentication = formData.laravelOptions?.authentication || 'laravel';

        return (
          <div className="space-y-4">
            {/* Authentication (only for starter kits) */}
            {hasStarterKit && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Authentication</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        laravelOptions: {
                          starterKit: prev.laravelOptions?.starterKit || 'none',
                          authentication: 'none',
                          useVolt: prev.laravelOptions?.useVolt || false,
                          testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                          installBoost: prev.laravelOptions?.installBoost || false,
                          customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                        },
                      }))
                    }
                    className={`hover:border-primary/50 flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      authentication === 'none' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <TbCode
                      className={`h-5 w-5 ${authentication === 'none' ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className="text-xs font-medium">None</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        laravelOptions: {
                          starterKit: prev.laravelOptions?.starterKit || 'none',
                          authentication: 'workos',
                          useVolt: prev.laravelOptions?.useVolt || false,
                          testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                          installBoost: prev.laravelOptions?.installBoost || false,
                          customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                        },
                      }))
                    }
                    className={`hover:border-primary/50 flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      authentication === 'workos' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <TbShieldCheck
                      className={`h-5 w-5 ${authentication === 'workos' ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className="text-xs font-medium">WorkOS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        laravelOptions: {
                          starterKit: prev.laravelOptions?.starterKit || 'none',
                          authentication: 'laravel',
                          useVolt: prev.laravelOptions?.useVolt || false,
                          testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                          installBoost: prev.laravelOptions?.installBoost || false,
                          customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                        },
                      }))
                    }
                    className={`hover:border-primary/50 flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      authentication === 'laravel' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <TbLock
                      className={`h-5 w-5 ${authentication === 'laravel' ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className="text-xs font-medium">Laravel&apos;s built-in</span>
                  </button>
                </div>
              </div>
            )}

            {/* Additional Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional Options</Label>
              <div className="space-y-4">
                {/* Volt Toggle */}
                {isLivewire && authentication !== 'workos' && (
                  <label
                    htmlFor="use-volt"
                    className="hover:bg-primary/5 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TbBolt className="text-muted-foreground h-4 w-4" />
                      <div>
                        <div className="text-sm font-medium">Volt Functional API</div>
                        <div className="text-muted-foreground text-xs">Use functional style</div>
                      </div>
                    </div>
                    <Switch
                      id="use-volt"
                      checked={formData.laravelOptions?.useVolt || false}
                      onCheckedChange={(checked: boolean) =>
                        setFormData(prev => ({
                          ...prev,
                          laravelOptions: {
                            starterKit: prev.laravelOptions?.starterKit || 'livewire',
                            authentication: prev.laravelOptions?.authentication || 'none',
                            useVolt: checked,
                            testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                            installBoost: prev.laravelOptions?.installBoost || false,
                            customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                          },
                        }))
                      }
                    />
                  </label>
                )}

                {/* Testing Framework */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        laravelOptions: {
                          starterKit: prev.laravelOptions?.starterKit || 'none',
                          authentication: prev.laravelOptions?.authentication || 'none',
                          useVolt: prev.laravelOptions?.useVolt || false,
                          testingFramework: 'pest',
                          installBoost: prev.laravelOptions?.installBoost || false,
                          customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                        },
                      }))
                    }
                    className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                      (formData.laravelOptions?.testingFramework || 'pest') === 'pest'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <TbFlask
                      className={`h-4 w-4 ${
                        (formData.laravelOptions?.testingFramework || 'pest') === 'pest'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium">Pest</div>
                      <div className="text-muted-foreground text-xs">Recommended</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        laravelOptions: {
                          starterKit: prev.laravelOptions?.starterKit || 'none',
                          authentication: prev.laravelOptions?.authentication || 'none',
                          useVolt: prev.laravelOptions?.useVolt || false,
                          testingFramework: 'phpunit',
                          installBoost: prev.laravelOptions?.installBoost || false,
                          customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                        },
                      }))
                    }
                    className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                      formData.laravelOptions?.testingFramework === 'phpunit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <TbFlask
                      className={`h-4 w-4 ${
                        formData.laravelOptions?.testingFramework === 'phpunit'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium">PHPUnit</div>
                      <div className="text-muted-foreground text-xs">Classic</div>
                    </div>
                  </button>
                </div>

                {/* Boost */}
                <label
                  htmlFor="install-boost"
                  className="hover:bg-primary/5 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TbBolt className="text-muted-foreground h-4 w-4" />
                    <div>
                      <div className="text-sm font-medium">Laravel Boost</div>
                      <div className="text-muted-foreground text-xs">Dev tools & enhancements</div>
                    </div>
                  </div>
                  <Switch
                    id="install-boost"
                    checked={formData.laravelOptions?.installBoost || false}
                    onCheckedChange={(checked: boolean) =>
                      setFormData(prev => ({
                        ...prev,
                        laravelOptions: {
                          starterKit: prev.laravelOptions?.starterKit || 'none',
                          authentication: prev.laravelOptions?.authentication || 'none',
                          useVolt: prev.laravelOptions?.useVolt || false,
                          testingFramework: prev.laravelOptions?.testingFramework || 'pest',
                          installBoost: checked,
                          customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
                        },
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        );
      }

      case 'basic':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="project-name">Project Name</Label>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">This will become the domain and folder name</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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

                    // Validate on change
                    const validation = validateSiteName(newName);
                    setNameError(validation.error);
                  }}
                  readOnly={formData.type === ProjectType.Existing}
                  className={nameError ? 'border-destructive' : ''}
                />
                {nameError ? (
                  <p className="text-destructive text-xs">{nameError}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {formData.name ? (
                      <span className="flex items-center gap-1">
                        <TbWorld className="h-3 w-3" />
                        <span className="font-mono">
                          {sanitizeProjectName(formData.name)}.local
                        </span>
                      </span>
                    ) : (
                      (() => {
                        if (formData.type === ProjectType.Existing) {
                          return 'Select project folder first';
                        }
                      })()
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>
                    {formData.type === ProjectType.Existing ? 'Project Folder' : 'Parent Folder'}
                  </Label>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {formData.type === ProjectType.Existing
                            ? 'Select your existing project folder'
                            : 'Site folder will be created inside this directory'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    placeholder={
                      formData.type === ProjectType.Existing
                        ? 'Click to select project folder...'
                        : 'Click to select parent folder...'
                    }
                    value={formData.path || ''}
                    className="flex-1 cursor-pointer"
                    onClick={handleSelectFolder}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleSelectFolder}
                    className=""
                  >
                    <FolderOpen />
                  </Button>
                </div>
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
                      <p className="text-muted-foreground text-xs">
                        {(() => {
                          if (formData.type === ProjectType.Laravel) {
                            return 'Laravel requires PHP 8.2 or higher';
                          }
                          if (formData.phpVariant === 'frankenphp') {
                            return 'FrankenPHP requires PHP 8.3 or higher';
                          }
                          return 'Select the PHP runtime version for your project';
                        })()}
                      </p>
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

      case 'variant':
        return (
          <div className="space-y-4">
            {/* PHP Variant Selection */}
            <div className="rounded-lg border border-purple-200 bg-linear-to-r from-purple-50 to-violet-50 p-4 dark:border-purple-800 dark:from-purple-950/30 dark:to-violet-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center bg-purple-600/10">
                    <SiPhp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="phpVariant" className="cursor-pointer text-sm font-medium">
                      PHP Variant
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {formData.phpVariant
                        ? PHP_VARIANTS.find(v => v.value === formData.phpVariant)?.description
                        : 'Choose web server and runtime configuration'}
                    </p>
                  </div>
                </div>
                <Select
                  value={formData.phpVariant}
                  onValueChange={(value: string) => {
                    setFormData(prev => {
                      const newData = { ...prev, phpVariant: value as PhpVariant };
                      // Auto-upgrade PHP version if FrankenPHP selected and version is < 8.3
                      if (
                        value === 'frankenphp' &&
                        prev.phpVersion &&
                        ['7.4', '8.1', '8.2'].includes(prev.phpVersion)
                      ) {
                        newData.phpVersion = '8.3';
                      }
                      return newData;
                    });
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHP_VARIANTS.map(variant => (
                      <SelectItem key={variant.value} value={variant.value}>
                        {variant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Extensions */}
            <div className="rounded-lg border bg-linear-to-br from-blue-50/50 to-indigo-50/50 p-4 dark:from-blue-950/20 dark:to-indigo-950/20">
              <Collapsible open={additionalExpanded} onOpenChange={setAdditionalExpanded}>
                <CollapsibleTrigger className="flex w-full items-start justify-between text-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        PHP Extensions
                      </h4>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {PREINSTALLED_PHP_EXTENSIONS.length} pre-installed •{' '}
                        {formData.phpExtensions?.length || 0} of {ADDITIONAL_PHP_EXTENSIONS.length}{' '}
                        additional selected
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground mt-1 h-4 w-4 shrink-0 transition-transform duration-200 ${
                      additionalExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div
                    className="animate-in fade-in-0 slide-in-from-top-2 max-h-[280px] overflow-y-auto bg-white/50 p-3 dark:bg-black/20"
                    style={{ animationDuration: '300ms' }}
                  >
                    <div className="flex flex-wrap gap-2">
                      {ADDITIONAL_PHP_EXTENSIONS.map((ext, index) => {
                        const isChecked = formData.phpExtensions?.includes(ext);
                        return (
                          <label
                            key={ext}
                            htmlFor={`ext-${ext}`}
                            className={`group/ext flex cursor-pointer items-center gap-1.5 overflow-hidden border px-3 py-1.5 transition-all duration-200 ease-out ${
                              isChecked
                                ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-sm'
                                : 'hover:border-primary/50 border-transparent bg-white/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10'
                            }`}
                            style={{
                              animationDelay: `${index * 20}ms`,
                              animation: additionalExpanded
                                ? 'fadeInScale 300ms ease-out forwards'
                                : 'none',
                            }}
                          >
                            <Checkbox
                              id={`ext-${ext}`}
                              checked={isChecked}
                              onCheckedChange={() => toggleExtension(ext)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary size-4 shrink-0 rounded border-2 transition-all duration-200"
                            />
                            <span className="font-mono text-sm leading-snug font-medium select-none">
                              {ext}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-muted-foreground bg-white/50 p-3 font-mono text-xs leading-relaxed select-text dark:bg-black/20">
                    {PREINSTALLED_PHP_EXTENSIONS.join(', ')}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="p-3">
              <p className="text-muted-foreground text-xs">
                Powered by{' '}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await (globalThis as unknown as Window).electronWindow.openExternal(
                        'https://serversideup.net/open-source/docker-php/docs/getting-started'
                      );
                    } catch (error) {
                      console.error('Failed to open link:', error);
                    }
                  }}
                  className="text-primary cursor-pointer font-medium hover:underline"
                >
                  ServerSideUp Docker PHP
                </button>{' '}
                images
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'type':
        return 'Choose Project Type';
      case 'laravel-starter':
        return 'Choose Starter Kit';
      case 'laravel-config':
        return 'Configure Options';
      case 'basic':
        return 'Project Configuration';
      case 'variant':
        return 'Server & Extensions';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-w-2xl select-none sm:max-w-lg ${showTerminal ? 'gap-0 p-0 [&>button]:top-1' : ''}`}
        onEscapeKeyDown={e => {
          if (isCreating) {
            e.preventDefault();
          }
        }}
        onInteractOutside={e => {
          if (isCreating) {
            e.preventDefault();
          }
        }}
      >
        {!showTerminal && (
          <DialogHeader>
            <DialogTitle>{getStepTitle()}</DialogTitle>
            <DialogDescription>
              {step === 'type' && 'Select the type of project you want to create'}
              {step === 'laravel-starter' &&
                'Choose your Laravel starter kit or begin with a blank project'}
              {step === 'laravel-config' &&
                'Configure authentication, testing, and additional options'}
              {step === 'basic' && 'Configure project details, runtime versions, and AI tools'}
              {step === 'variant' &&
                'Choose web server variant and PHP extensions for your project'}
            </DialogDescription>
          </DialogHeader>
        )}

        <div className="relative overflow-hidden">
          {showTerminal ? (
            <div
              className="animate-in fade-in-0 slide-in-from-top-4"
              style={{ animationDuration: '400ms' }}
            >
              <ProjectCreationTerminal logs={terminalLogs} />
            </div>
          ) : (
            <div
              className="animate-in fade-in-0 slide-in-from-bottom-2"
              style={{ animationDuration: '300ms' }}
            >
              {renderStepContent()}
            </div>
          )}
        </div>

        <DialogFooter>
          {!showTerminal && step !== 'type' && (
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

          {!showTerminal && (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || createProjectMutation.isPending}
              >
                {step === 'variant' ? (
                  <>
                    Launch Project
                    <TbRocket className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
