/**
 * Project Type Selection Step
 * Choose between Custom, Laravel, or Existing project
 */

import { ProjectIcon } from '@renderer/components/ProjectIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { ProjectType } from '@shared/types/project';
import { IconCheck, IconInfoCircle } from '@tabler/icons-react';
import type { WizardStepProps } from './types';

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

export function TypeStep({ formData, setFormData, onAutoAdvance }: Readonly<WizardStepProps>) {
  const handleSelect = (type: ProjectType) => {
    setFormData(prev => {
      const newData = { ...prev, type };
      if (type === ProjectType.Laravel && !prev.laravelOptions) {
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

    // Auto-advance after selection
    setTimeout(() => {
      if (type === ProjectType.Laravel) {
        onAutoAdvance?.('laravel-starter');
      } else {
        onAutoAdvance?.('basic');
      }
    }, 100);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {PROJECT_TYPES.map(type => (
        <button
          key={type.value}
          type="button"
          onClick={() => handleSelect(type.value)}
          className={`group hover:border-primary/50 relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all ${
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
                    <IconInfoCircle className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
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
              <IconCheck className="text-primary h-5 w-5" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
