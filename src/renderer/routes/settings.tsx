import { Button } from '@renderer/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@renderer/components/ui/field';
import { Input } from '@renderer/components/ui/input';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Switch } from '@renderer/components/ui/switch';
import { Textarea } from '@renderer/components/ui/textarea';
import { useTheme } from '@renderer/hooks/use-theme';
import { getSettings, updateSettings } from '@renderer/utils/settings';
import type {
  AppSettings,
  EditorChoice,
  NgrokRegion,
  TerminalChoice,
} from '@shared/types/settings';
import { EDITOR_LABELS, NGROK_REGION_LABELS, TERMINAL_LABELS } from '@shared/types/settings';
import type { ThemeMode } from '@shared/types/theme-mode';
import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle, Eye, EyeOff, Monitor, Moon, Sun, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// CSS Theme Presets from shadcn/ui
const CSS_PRESETS = {
  neutral: `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}`,
  zinc: `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
}`,
  slate: `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.129 0.042 264.695);
  --primary: oklch(0.208 0.042 265.755);
  --primary-foreground: oklch(0.984 0.003 247.858);
  --secondary: oklch(0.968 0.007 247.896);
  --secondary-foreground: oklch(0.208 0.042 265.755);
  --muted: oklch(0.968 0.007 247.896);
  --muted-foreground: oklch(0.554 0.046 257.417);
  --accent: oklch(0.968 0.007 247.896);
  --accent-foreground: oklch(0.208 0.042 265.755);
  --border: oklch(0.929 0.013 255.508);
  --input: oklch(0.929 0.013 255.508);
  --ring: oklch(0.704 0.04 256.788);
}

.dark {
  --background: oklch(0.129 0.042 264.695);
  --foreground: oklch(0.984 0.003 247.858);
  --primary: oklch(0.929 0.013 255.508);
  --primary-foreground: oklch(0.208 0.042 265.755);
  --secondary: oklch(0.279 0.041 260.031);
  --secondary-foreground: oklch(0.984 0.003 247.858);
  --muted: oklch(0.279 0.041 260.031);
  --muted-foreground: oklch(0.704 0.04 256.788);
  --accent: oklch(0.279 0.041 260.031);
  --accent-foreground: oklch(0.984 0.003 247.858);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.551 0.027 264.364);
}`,
  stone: `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.147 0.004 49.25);
  --primary: oklch(0.216 0.006 56.043);
  --primary-foreground: oklch(0.985 0.001 106.423);
  --secondary: oklch(0.97 0.001 106.424);
  --secondary-foreground: oklch(0.216 0.006 56.043);
  --muted: oklch(0.97 0.001 106.424);
  --muted-foreground: oklch(0.553 0.013 58.071);
  --accent: oklch(0.97 0.001 106.424);
  --accent-foreground: oklch(0.216 0.006 56.043);
  --border: oklch(0.923 0.003 48.717);
  --input: oklch(0.923 0.003 48.717);
  --ring: oklch(0.709 0.01 56.259);
}

.dark {
  --background: oklch(0.147 0.004 49.25);
  --foreground: oklch(0.985 0.001 106.423);
  --primary: oklch(0.923 0.003 48.717);
  --primary-foreground: oklch(0.216 0.006 56.043);
  --secondary: oklch(0.268 0.007 34.298);
  --secondary-foreground: oklch(0.985 0.001 106.423);
  --muted: oklch(0.268 0.007 34.298);
  --muted-foreground: oklch(0.709 0.01 56.259);
  --accent: oklch(0.268 0.007 34.298);
  --accent-foreground: oklch(0.985 0.001 106.423);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.553 0.013 58.071);
}`,
} as const;

// Placeholder example CSS
const PLACEHOLDER_CSS = `/* Write your custom CSS here or click a preset above */
:root {
  --primary: oklch(0.56 0.18 250);
  --radius: 0.5rem;
}

.dark {
  --primary: oklch(0.75 0.15 255);
}`;

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  // Validate ngrok auth token format
  const validateNgrokToken = (token: string): boolean => {
    if (!token) return true; // Empty is valid (optional field)
    // Ngrok tokens are typically alphanumeric with underscores, minimum 20 chars
    const tokenRegex = /^\w{20,}$/;
    return tokenRegex.test(token);
  };

  const { themeMode, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ngrokTokenValid, setNgrokTokenValid] = useState<boolean | null>(null);
  const [ngrokTokenInput, setNgrokTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [customCss, setCustomCss] = useState('');

  // Refs for debounce and tracking last saved value
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTokenRef = useRef<string>('');

  // Load settings on mount
  useEffect(() => {
    getSettings()
      .then(loadedSettings => {
        setSettings(loadedSettings);
        const token = loadedSettings.ngrokAuthToken || '';
        setNgrokTokenInput(token);
        lastSavedTokenRef.current = token;
        setNgrokTokenValid(token ? validateNgrokToken(token) : null);
        setCustomCss(loadedSettings.customCss || '');
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load settings');
        setIsLoading(false);
      });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Save ngrok token to secure storage
  const saveNgrokToken = useCallback(async (token: string) => {
    // Skip if already saved or invalid
    if (token === lastSavedTokenRef.current || !validateNgrokToken(token)) {
      return;
    }

    setIsSavingToken(true);
    try {
      const updated = await updateSettings({ ngrokAuthToken: token || undefined });
      setSettings(updated);
      lastSavedTokenRef.current = token;
      toast.success('Ngrok auth token saved securely');
    } catch (error) {
      console.error('Failed to save ngrok token:', error);
      toast.error('Failed to save ngrok token');
    } finally {
      setIsSavingToken(false);
    }
  }, []);

  const handleEditorChange = async (value: EditorChoice) => {
    try {
      const updated = await updateSettings({ defaultEditor: value });
      setSettings(updated);
      toast.success(`Default editor set to ${EDITOR_LABELS[value]}`);
    } catch (error) {
      console.error('Failed to save editor setting:', error);
      toast.error('Failed to save editor setting');
    }
  };

  const handleTerminalChange = async (value: TerminalChoice) => {
    try {
      const updated = await updateSettings({ defaultTerminal: value });
      setSettings(updated);
      toast.success(`Default terminal set to ${TERMINAL_LABELS[value]}`);
    } catch (error) {
      console.error('Failed to save terminal setting:', error);
      toast.error('Failed to save terminal setting');
    }
  };

  const handleThemeChange = (value: ThemeMode) => {
    setTheme(value);
    const themeLabels = { dark: 'Dark', light: 'Light', system: 'System' };
    toast.success(`Theme set to ${themeLabels[value]}`);
  };

  const handleNgrokAuthTokenChange = (value: string) => {
    setNgrokTokenInput(value);
    const isValid = validateNgrokToken(value);
    setNgrokTokenValid(isValid);

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce save - only save after user stops typing for 500ms
    if (isValid) {
      saveTimerRef.current = setTimeout(() => {
        saveNgrokToken(value);
      }, 500);
    }
  };

  const handleNgrokAuthTokenBlur = () => {
    // Clear debounce timer and save immediately on blur
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Save if valid and different from last saved
    if (ngrokTokenValid && ngrokTokenInput !== lastSavedTokenRef.current) {
      saveNgrokToken(ngrokTokenInput);
    }
  };

  const handleNgrokRegionChange = async (value: NgrokRegion) => {
    try {
      const updated = await updateSettings({ ngrokRegion: value });
      setSettings(updated);
      toast.success(`Ngrok region set to ${NGROK_REGION_LABELS[value]}`);
    } catch (error) {
      console.error('Failed to save ngrok region:', error);
      toast.error('Failed to save ngrok region');
    }
  };

  const handleShowDockerStatsChange = async (checked: boolean) => {
    try {
      const updated = await updateSettings({ showDockerStats: checked });
      setSettings(updated);
      toast.success(checked ? 'Docker stats enabled' : 'Docker stats disabled');
    } catch (error) {
      console.error('Failed to save Docker stats setting:', error);
      toast.error('Failed to save Docker stats setting');
    }
  };

  const handleCustomCssBlur = async () => {
    try {
      const updated = await updateSettings({ customCss });
      setSettings(updated);
      toast.success('Custom CSS saved');
    } catch (error) {
      console.error('Failed to save custom CSS:', error);
      toast.error('Failed to save custom CSS');
    }
  };

  const handleResetCustomCss = async () => {
    try {
      setCustomCss('');
      const updated = await updateSettings({ customCss: '' });
      setSettings(updated);
      toast.success('Custom CSS reset');
    } catch (error) {
      console.error('Failed to reset custom CSS:', error);
      toast.error('Failed to reset custom CSS');
    }
  };

  const handleApplyPreset = async (presetName: keyof typeof CSS_PRESETS) => {
    try {
      const presetCss = CSS_PRESETS[presetName];
      setCustomCss(presetCss);
      const updated = await updateSettings({ customCss: presetCss });
      setSettings(updated);
      toast.success(`${presetName.charAt(0).toUpperCase() + presetName.slice(1)} theme applied`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      toast.error('Failed to apply preset');
    }
  };

  // Get input className based on validation state
  const getNgrokTokenInputClassName = () => {
    if (ngrokTokenValid === false) {
      return 'pr-20 border-red-500 focus-visible:ring-red-500';
    }
    if (ngrokTokenValid === true && ngrokTokenInput) {
      return 'pr-20 border-green-500 focus-visible:ring-green-500';
    }
    return 'pr-20';
  };

  // Show loading state while settings are being loaded
  if (isLoading || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-0 flex-1">
      <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-6 p-4 sm:p-6">
        <FieldSet>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>External Applications</FieldLegend>
              <FieldDescription>
                Configure default applications for opening projects
              </FieldDescription>

              {/* Code Editor */}
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="editor-select">Code Editor</FieldLabel>
                  <FieldDescription>Used for opening project folders</FieldDescription>
                </FieldContent>
                <Select value={settings.defaultEditor} onValueChange={handleEditorChange}>
                  <SelectTrigger id="editor-select">
                    <SelectValue placeholder="Select editor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">{EDITOR_LABELS.code}</SelectItem>
                    <SelectItem value="code-insiders">{EDITOR_LABELS['code-insiders']}</SelectItem>
                    <SelectItem value="cursor">{EDITOR_LABELS.cursor}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <FieldSeparator />

              {/* Terminal */}
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="terminal-select">Terminal</FieldLabel>
                  <FieldDescription>Used for shell commands and PHP Tinker</FieldDescription>
                </FieldContent>
                <Select value={settings.defaultTerminal} onValueChange={handleTerminalChange}>
                  <SelectTrigger id="terminal-select">
                    <SelectValue placeholder="Select terminal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{TERMINAL_LABELS.default}</SelectItem>
                    <SelectItem value="wt">{TERMINAL_LABELS.wt}</SelectItem>
                    <SelectItem value="powershell">{TERMINAL_LABELS.powershell}</SelectItem>
                    <SelectItem value="cmd">{TERMINAL_LABELS.cmd}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldSet>

            <FieldSeparator />

            {/* Appearance */}
            <FieldSet>
              <FieldLegend>Appearance</FieldLegend>
              <FieldDescription>Customize the look and feel of the application</FieldDescription>

              <Field orientation="vertical">
                <FieldTitle>Theme</FieldTitle>
                <FieldDescription>Select your preferred color scheme</FieldDescription>
                <div className="flex w-fit gap-2">
                  <Button
                    variant={themeMode === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange('light')}
                    type="button"
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={themeMode === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange('dark')}
                    type="button"
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={themeMode === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange('system')}
                    type="button"
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </Button>
                </div>
              </Field>

              <FieldSeparator />

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="docker-stats-toggle">Show Docker Stats</FieldLabel>
                  <FieldDescription>Display CPU and RAM usage in the footer</FieldDescription>
                </FieldContent>
                <Switch
                  id="docker-stats-toggle"
                  checked={settings.showDockerStats ?? true}
                  onCheckedChange={handleShowDockerStatsChange}
                />
              </Field>
            </FieldSet>

            <FieldSeparator />

            {/* Ngrok */}
            <FieldSet>
              <FieldLegend>Ngrok Tunnel</FieldLegend>
              <FieldDescription>Configure ngrok to share projects online</FieldDescription>

              {/* Auth Token */}
              <Field orientation="vertical">
                <FieldLabel htmlFor="ngrok-token">Authentication Token</FieldLabel>
                <div className="relative">
                  <Input
                    id="ngrok-token"
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter your ngrok auth token"
                    value={ngrokTokenInput}
                    onChange={e => handleNgrokAuthTokenChange(e.target.value)}
                    onBlur={handleNgrokAuthTokenBlur}
                    disabled={isSavingToken}
                    className={getNgrokTokenInputClassName()}
                  />
                  <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
                    {ngrokTokenInput && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showToken ? 'Hide token' : 'Show token'}
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {ngrokTokenValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </>
                    )}
                  </div>
                </div>
                {ngrokTokenValid === false && (
                  <p className="text-xs text-red-500">
                    Invalid format. Token must be at least 20 alphanumeric characters.
                  </p>
                )}
                <FieldDescription>
                  Get your token from{' '}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await window.electronWindow.openExternal(
                          'https://dashboard.ngrok.com/get-started/your-authtoken'
                        );
                      } catch {
                        toast.error('Failed to open link');
                      }
                    }}
                    className="text-primary hover:underline"
                  >
                    ngrok dashboard
                  </button>
                </FieldDescription>
              </Field>

              <FieldSeparator />

              {/* Region */}
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="ngrok-region">Region</FieldLabel>
                  <FieldDescription>
                    Choose the closest region for better performance
                  </FieldDescription>
                </FieldContent>
                <Select
                  value={settings.ngrokRegion || 'us'}
                  onValueChange={handleNgrokRegionChange}
                >
                  <SelectTrigger id="ngrok-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">{NGROK_REGION_LABELS.us}</SelectItem>
                    <SelectItem value="eu">{NGROK_REGION_LABELS.eu}</SelectItem>
                    <SelectItem value="ap">{NGROK_REGION_LABELS.ap}</SelectItem>
                    <SelectItem value="au">{NGROK_REGION_LABELS.au}</SelectItem>
                    <SelectItem value="sa">{NGROK_REGION_LABELS.sa}</SelectItem>
                    <SelectItem value="jp">{NGROK_REGION_LABELS.jp}</SelectItem>
                    <SelectItem value="in">{NGROK_REGION_LABELS.in}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldSet>

            <FieldSeparator />

            {/* Custom CSS */}
            <FieldSet>
              <FieldLegend>Custom Styling</FieldLegend>
              <FieldDescription>
                Customize the theme using CSS variables in OKLCH color format. See{' '}
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() =>
                    window.electronWindow.openExternal('https://ui.shadcn.com/docs/theming')
                  }
                  type="button"
                >
                  shadcn/ui theming docs
                </Button>{' '}
                for available variables and color examples.
              </FieldDescription>

              <Field orientation="vertical">
                <div className="flex items-center justify-between">
                  <FieldTitle>CSS Variables</FieldTitle>
                  {customCss && (
                    <Button variant="ghost" size="sm" onClick={handleResetCustomCss} type="button">
                      Reset
                    </Button>
                  )}
                </div>
                <FieldDescription>
                  Choose a preset theme or write your own custom CSS.
                </FieldDescription>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset('neutral')}
                    type="button"
                  >
                    <div className="mr-2 h-3 w-3 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    Neutral
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset('zinc')}
                    type="button"
                  >
                    <div className="mr-2 h-3 w-3 rounded-full bg-zinc-500 dark:bg-zinc-500" />
                    Zinc
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset('slate')}
                    type="button"
                  >
                    <div className="mr-2 h-3 w-3 rounded-full bg-slate-500 dark:bg-slate-500" />
                    Slate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset('stone')}
                    type="button"
                  >
                    <div className="mr-2 h-3 w-3 rounded-full bg-stone-500 dark:bg-stone-500" />
                    Stone
                  </Button>
                </div>
                <Textarea
                  id="custom-css"
                  placeholder={PLACEHOLDER_CSS}
                  value={customCss}
                  onChange={e => setCustomCss(e.target.value)}
                  onBlur={handleCustomCssBlur}
                  className="border-border bg-muted text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-ring min-h-50 resize-y font-mono text-xs"
                  spellCheck={false}
                />
              </Field>
            </FieldSet>
          </FieldGroup>
        </FieldSet>
      </div>
    </ScrollArea>
  );
}
