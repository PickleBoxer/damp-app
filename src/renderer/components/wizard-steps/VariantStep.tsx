/**
 * Server Variant & Extensions Step
 */

import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@renderer/components/ui/collapsible';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  ADDITIONAL_PHP_EXTENSIONS,
  PREINSTALLED_PHP_EXTENSIONS,
} from '@shared/constants/php-extensions';
import type { PhpVariant } from '@shared/types/project';
import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { SiPhp } from 'react-icons/si';
import type { WizardStepProps } from './types';

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

export function VariantStep({ formData, setFormData }: Readonly<WizardStepProps>) {
  const [extensionsExpanded, setExtensionsExpanded] = useState(false);

  const toggleExtension = (extension: string) => {
    setFormData(prev => {
      const currentExtensions = prev.phpExtensions || [];
      if (currentExtensions.includes(extension)) {
        return { ...prev, phpExtensions: currentExtensions.filter(ext => ext !== extension) };
      } else {
        return { ...prev, phpExtensions: [...currentExtensions, extension] };
      }
    });
  };

  const handleVariantChange = (value: string) => {
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
  };

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
          <Select value={formData.phpVariant} onValueChange={handleVariantChange}>
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
        <Collapsible open={extensionsExpanded} onOpenChange={setExtensionsExpanded}>
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
                extensionsExpanded ? 'rotate-180' : ''
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
                        animation: extensionsExpanded
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
}
