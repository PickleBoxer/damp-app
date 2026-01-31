/**
 * Create Project Wizard
 * Multi-step wizard for creating new PHP projects
 */

import {
  ProjectCreationTerminal,
  type TerminalLog,
} from '@renderer/components/ProjectCreationTerminal';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  BundledServicesStep,
  LaravelConfigStep,
  LaravelStarterStep,
  ProjectConfigStep,
  TypeStep,
  VariantStep,
} from '@renderer/components/wizard-steps';
import { useCreateProject } from '@renderer/hooks/use-projects';
import type { CreateProjectInput } from '@shared/types/project';
import { ProjectType } from '@shared/types/project';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TbRocket } from 'react-icons/tb';

interface CreateProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'type' | 'laravel-starter' | 'laravel-config' | 'basic' | 'services' | 'variant';

function validateSiteName(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: 'Site name is required' };
  }
  const nameRegex = /^[a-zA-Z0-9-_]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: 'Only letters, numbers, hyphens, and underscores' };
  }
  return { isValid: true };
}

export function CreateProjectWizard({ open, onOpenChange }: Readonly<CreateProjectWizardProps>) {
  const [step, setStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<Partial<CreateProjectInput>>({
    type: ProjectType.BasicPhp,
    phpVersion: '8.4',
    phpVariant: 'fpm-apache',
    nodeVersion: 'latest',
    enableClaudeAi: false,
    phpExtensions: [],
    bundledServices: [],
  });
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createProjectMutation = useCreateProject();

  // Reset wizard state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isCreating) return;

      if (!newOpen) {
        setStep('type');
        setFormData({
          type: ProjectType.BasicPhp,
          phpVersion: '8.4',
          phpVariant: 'fpm-apache',
          nodeVersion: 'latest',
          enableClaudeAi: false,
          phpExtensions: [],
          bundledServices: [],
        });
        setTerminalLogs([]);
        setShowTerminal(false);
        setIsCreating(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, isCreating]
  );

  // Close dialog on any key press after creation finishes
  useEffect(() => {
    if (!isCreating && showTerminal && terminalLogs.length > 0) {
      const handleKeyPress = () => handleOpenChange(false);
      globalThis.addEventListener('keydown', handleKeyPress);
      return () => globalThis.removeEventListener('keydown', handleKeyPress);
    }
  }, [isCreating, showTerminal, terminalLogs.length, handleOpenChange]);

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

  const getSteps = (): WizardStep[] => {
    if (formData.type === ProjectType.Laravel) {
      return ['type', 'laravel-starter', 'laravel-config', 'basic', 'services', 'variant'];
    }
    return ['type', 'basic', 'services', 'variant'];
  };

  const handleNext = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleCreate = async () => {
    if (!formData.path || !formData.name) return;

    setShowTerminal(true);
    setIsCreating(true);
    setTerminalLogs([
      {
        id: `${Date.now()}-start`,
        timestamp: new Date(),
        message: '🚀 Starting project creation...',
        type: 'info',
      },
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

    try {
      await createProjectMutation.mutateAsync({
        name: formData.name,
        path: formData.path,
        type: formData.type || ProjectType.BasicPhp,
        phpVersion: formData.phpVersion || '8.3',
        phpVariant: formData.phpVariant || 'fpm-apache',
        nodeVersion: formData.nodeVersion || 'none',
        enableClaudeAi: formData.enableClaudeAi || false,
        phpExtensions: formData.phpExtensions || [],
        laravelOptions: formData.laravelOptions,
        overwriteExisting: formData.type === ProjectType.Existing,
        bundledServices: formData.bundledServices,
      });

      setTerminalLogs(prev => [
        ...prev,
        {
          id: `${Date.now()}-complete`,
          timestamp: new Date(),
          message: `✅ Project "${formData.name}" created successfully!`,
          type: 'success',
        },
        { id: `${Date.now()}-empty`, timestamp: new Date(), message: '', type: 'info' },
        {
          id: `${Date.now()}-press-key`,
          timestamp: new Date(),
          message: 'Press any key to close...',
          type: 'info',
        },
      ]);
      setIsCreating(false);
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
        { id: `${Date.now()}-empty`, timestamp: new Date(), message: '', type: 'info' },
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

  const canProceed = (): boolean => {
    switch (step) {
      case 'type':
        return !!formData.type;
      case 'laravel-starter':
        if (formData.laravelOptions?.starterKit === 'custom') {
          return !!formData.laravelOptions?.customStarterKitUrl?.trim();
        }
        return !!formData.laravelOptions?.starterKit;
      case 'laravel-config':
        return true;
      case 'basic':
        return (
          validateSiteName(formData.name || '').isValid &&
          !!formData.path &&
          !!formData.phpVersion &&
          !!formData.nodeVersion
        );
      case 'services':
        return true;
      case 'variant':
        return !!formData.phpVariant;
      default:
        return false;
    }
  };

  const getStepTitle = (): string => {
    const titles: Record<WizardStep, string> = {
      type: 'Choose Project Type',
      'laravel-starter': 'Choose Starter Kit',
      'laravel-config': 'Configure Options',
      basic: 'Project Configuration',
      services: 'Bundled Services',
      variant: 'Server & Extensions',
    };
    return titles[step] || '';
  };

  const getStepDescription = (): string => {
    const descriptions: Record<WizardStep, string> = {
      type: 'Select the type of project you want to create',
      'laravel-starter': 'Choose your Laravel starter kit or begin with a blank project',
      'laravel-config': 'Configure authentication, testing, and additional options',
      basic: 'Configure project details, runtime versions, and AI tools',
      services: 'Add optional services like database, cache, or email to your project',
      variant: 'Choose web server variant and PHP extensions for your project',
    };
    return descriptions[step] || '';
  };

  const renderStepContent = () => {
    const stepProps = {
      formData,
      setFormData,
      onAutoAdvance: (nextStep: string) => setStep(nextStep as WizardStep),
    };

    switch (step) {
      case 'type':
        return <TypeStep {...stepProps} />;
      case 'laravel-starter':
        return <LaravelStarterStep {...stepProps} />;
      case 'laravel-config':
        return <LaravelConfigStep {...stepProps} />;
      case 'basic':
        return <ProjectConfigStep {...stepProps} />;
      case 'services':
        return (
          <BundledServicesStep
            selectedServices={formData.bundledServices || []}
            onServicesChange={(services: typeof formData.bundledServices) =>
              setFormData(prev => ({ ...prev, bundledServices: services }))
            }
            onAutoAdvance={() => setStep('variant')}
          />
        );
      case 'variant':
        return <VariantStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`[&>button:hover]:!bg-destructive/10 [&>button:hover]:!text-destructive max-w-2xl select-none sm:max-w-lg [&>button]:size-8 ${showTerminal ? 'gap-0 p-0 [&>button]:top-0 [&>button]:right-0' : ''}`}
        onEscapeKeyDown={e => isCreating && e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        {!showTerminal && (
          <DialogHeader>
            <DialogTitle>{getStepTitle()}</DialogTitle>
            <DialogDescription>{getStepDescription()}</DialogDescription>
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
