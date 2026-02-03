/**
 * Laravel Configuration Step
 * Authentication, testing framework, and additional options
 */

import { Label } from '@renderer/components/ui/label';
import { Switch } from '@renderer/components/ui/switch';
import { IconBolt, IconCode, IconFlask, IconLock, IconShieldCheck } from '@tabler/icons-react';
import type { WizardStepProps } from './types';

export function LaravelConfigStep({ formData, setFormData }: Readonly<WizardStepProps>) {
  const starterKit = formData.laravelOptions?.starterKit || 'none';
  const hasStarterKit = starterKit !== 'none' && starterKit !== 'custom';
  const isLivewire = starterKit === 'livewire';
  const authentication = formData.laravelOptions?.authentication || 'laravel';

  const setAuthentication = (auth: 'none' | 'workos' | 'laravel') => {
    setFormData(prev => ({
      ...prev,
      laravelOptions: {
        starterKit: prev.laravelOptions?.starterKit || 'none',
        authentication: auth,
        useVolt: prev.laravelOptions?.useVolt || false,
        testingFramework: prev.laravelOptions?.testingFramework || 'pest',
        installBoost: prev.laravelOptions?.installBoost || false,
        customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
      },
    }));
  };

  const setTestingFramework = (framework: 'pest' | 'phpunit') => {
    setFormData(prev => ({
      ...prev,
      laravelOptions: {
        starterKit: prev.laravelOptions?.starterKit || 'none',
        authentication: prev.laravelOptions?.authentication || 'none',
        useVolt: prev.laravelOptions?.useVolt || false,
        testingFramework: framework,
        installBoost: prev.laravelOptions?.installBoost || false,
        customStarterKitUrl: prev.laravelOptions?.customStarterKitUrl,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Authentication (only for starter kits) */}
      {hasStarterKit && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Authentication</Label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setAuthentication('none')}
              className={`hover:border-primary/50 flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                authentication === 'none' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <IconCode
                className={`h-5 w-5 ${authentication === 'none' ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <span className="text-xs font-medium">None</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthentication('workos')}
              className={`hover:border-primary/50 flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                authentication === 'workos' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <IconShieldCheck
                className={`h-5 w-5 ${authentication === 'workos' ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <span className="text-xs font-medium">WorkOS</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthentication('laravel')}
              className={`hover:border-primary/50 flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                authentication === 'laravel' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <IconLock
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
                <IconBolt className="text-muted-foreground h-4 w-4" />
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
              onClick={() => setTestingFramework('pest')}
              className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                (formData.laravelOptions?.testingFramework || 'pest') === 'pest'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <IconFlask
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
              onClick={() => setTestingFramework('phpunit')}
              className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                formData.laravelOptions?.testingFramework === 'phpunit'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <IconFlask
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
              <IconBolt className="text-muted-foreground h-4 w-4" />
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
