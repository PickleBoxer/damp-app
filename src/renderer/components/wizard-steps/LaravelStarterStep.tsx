/**
 * Laravel Starter Kit Selection Step
 */

import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { SiLivewire, SiReact, SiVuedotjs } from 'react-icons/si';
import { TbCheck, TbCode, TbLink } from 'react-icons/tb';
import type { WizardStepProps } from './types';

const STARTER_KITS = [
  { value: 'none', label: 'None', icon: TbCode, desc: 'Blank Laravel application' },
  { value: 'react', label: 'React', icon: SiReact, desc: 'React with Inertia.js' },
  { value: 'vue', label: 'Vue', icon: SiVuedotjs, desc: 'Vue with Inertia.js' },
  { value: 'livewire', label: 'Livewire', icon: SiLivewire, desc: 'Full-stack with Livewire' },
  { value: 'custom', label: 'Custom', icon: TbLink, desc: 'Custom GitHub repository' },
] as const;

type StarterKitValue = (typeof STARTER_KITS)[number]['value'];

export function LaravelStarterStep({ formData, setFormData }: Readonly<WizardStepProps>) {
  const starterKit = formData.laravelOptions?.starterKit || 'none';

  const handleSelect = (value: StarterKitValue) => {
    setFormData(prev => ({
      ...prev,
      laravelOptions: {
        starterKit: value,
        authentication: prev.laravelOptions?.authentication || 'none',
        useVolt: prev.laravelOptions?.useVolt || false,
        testingFramework: prev.laravelOptions?.testingFramework || 'pest',
        installBoost: prev.laravelOptions?.installBoost || false,
        customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Starter Kit</Label>
        <div className="grid grid-cols-2 gap-4">
          {STARTER_KITS.map(kit => {
            const Icon = kit.icon;
            const isSelected = starterKit === kit.value;
            return (
              <button
                key={kit.value}
                type="button"
                onClick={() => handleSelect(kit.value)}
                className={`group hover:border-primary/50 relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
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
