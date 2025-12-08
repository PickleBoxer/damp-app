import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getSettings, updateSettings } from '@/helpers/settings_helpers';
import { EDITOR_LABELS, TERMINAL_LABELS, NGROK_REGION_LABELS } from '@/types/settings';
import type { EditorChoice, TerminalChoice, NgrokRegion } from '@/types/settings';
import { setTheme, getCurrentTheme } from '@/helpers/theme_helpers';
import { setAppLanguage } from '@/helpers/language_helpers';
import type { ThemeMode } from '@/types/theme-mode';
import langs from '@/localization/langs';
import { toast } from 'sonner';
import { Monitor, Sun, Moon, Globe, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

function SettingsPage() {
  const { i18n } = useTranslation();

  // Validate ngrok auth token format
  const validateNgrokToken = (token: string): boolean => {
    if (!token) return true; // Empty is valid (optional field)
    // Ngrok tokens are typically alphanumeric with underscores, minimum 20 chars
    const tokenRegex = /^[a-zA-Z0-9_]{20,}$/;
    return tokenRegex.test(token);
  };

  const [settings, setSettings] = useState(() => getSettings());
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [ngrokTokenValid, setNgrokTokenValid] = useState<boolean | null>(() => {
    const initialSettings = getSettings();
    return initialSettings.ngrokAuthToken
      ? validateNgrokToken(initialSettings.ngrokAuthToken)
      : null;
  });
  const [ngrokTokenInput, setNgrokTokenInput] = useState(() => {
    const initialSettings = getSettings();
    return initialSettings.ngrokAuthToken || '';
  });

  // Load theme on mount
  useEffect(() => {
    let isMounted = true;
    getCurrentTheme().then(({ local }) => {
      if (isMounted) {
        setCurrentTheme(local || 'system');
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEditorChange = (value: EditorChoice) => {
    const updated = updateSettings({ defaultEditor: value });
    setSettings(updated);
    toast.success(`Default editor set to ${EDITOR_LABELS[value]}`);
  };

  const handleTerminalChange = (value: TerminalChoice) => {
    const updated = updateSettings({ defaultTerminal: value });
    setSettings(updated);
    toast.success(`Default terminal set to ${TERMINAL_LABELS[value]}`);
  };

  const handleThemeChange = async (value: ThemeMode) => {
    try {
      await setTheme(value);
      setCurrentTheme(value);
      const themeLabels = { dark: 'Dark', light: 'Light', system: 'System' };
      toast.success(`Theme set to ${themeLabels[value]}`);
    } catch (error) {
      toast.error('Failed to update theme');
      console.error('Theme update error:', error);
    }
  };
  const handleLanguageChange = (value: string) => {
    setAppLanguage(value, i18n);
    setCurrentLang(value);
    const lang = langs.find(l => l.key === value);
    toast.success(`Language set to ${lang?.nativeName || value}`);
  };

  const handleNgrokAuthTokenChange = (value: string) => {
    setNgrokTokenInput(value);
    const isValid = validateNgrokToken(value);
    setNgrokTokenValid(isValid);

    if (isValid) {
      const updated = updateSettings({ ngrokAuthToken: value || undefined });
      setSettings(updated);
    }
  };

  const handleNgrokRegionChange = (value: NgrokRegion) => {
    const updated = updateSettings({ ngrokRegion: value });
    setSettings(updated);
    toast.success(`Ngrok region set to ${NGROK_REGION_LABELS[value]}`);
  };

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {/* External Applications Block */}
        <div className="w-full max-w-md rounded-lg border p-6">
          <form>
            <div className="flex w-full flex-col gap-7">
              <fieldset className="flex flex-col gap-6">
                <legend className="mb-3 text-base font-medium">External Applications</legend>
                <p className="text-muted-foreground -mt-1.5 text-sm leading-normal font-normal">
                  Configure default applications for opening projects
                </p>

                <div className="flex w-full flex-col gap-7">
                  {/* Code Editor Field */}
                  <div className="group/field flex w-full flex-col gap-3">
                    <Label
                      htmlFor="editor-select"
                      className="flex w-fit items-center gap-2 text-sm leading-snug font-medium"
                    >
                      Code Editor
                    </Label>
                    <Select value={settings.defaultEditor} onValueChange={handleEditorChange}>
                      <SelectTrigger id="editor-select" className="h-9 w-full">
                        <SelectValue placeholder="Select editor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="code">{EDITOR_LABELS.code}</SelectItem>
                        <SelectItem value="code-insiders">
                          {EDITOR_LABELS['code-insiders']}
                        </SelectItem>
                        <SelectItem value="cursor">{EDITOR_LABELS.cursor}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm leading-normal font-normal">
                      Used for opening project folders
                    </p>
                  </div>

                  {/* Terminal Field */}
                  <div className="group/field flex w-full flex-col gap-3">
                    <Label
                      htmlFor="terminal-select"
                      className="flex w-fit items-center gap-2 text-sm leading-snug font-medium"
                    >
                      Terminal
                    </Label>
                    <Select value={settings.defaultTerminal} onValueChange={handleTerminalChange}>
                      <SelectTrigger id="terminal-select" className="h-9 w-full">
                        <SelectValue placeholder="Select terminal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wt">{TERMINAL_LABELS.wt}</SelectItem>
                        <SelectItem value="powershell">{TERMINAL_LABELS.powershell}</SelectItem>
                        <SelectItem value="cmd">{TERMINAL_LABELS.cmd}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm leading-normal font-normal">
                      Used for shell commands and PHP Tinker
                    </p>
                  </div>
                </div>
              </fieldset>
            </div>
          </form>
        </div>

        {/* Appearance Settings Block */}
        <div className="w-full max-w-md rounded-lg border p-6">
          <form>
            <div className="flex w-full flex-col gap-7">
              <fieldset className="flex flex-col gap-6">
                <legend className="mb-3 text-base font-medium">Appearance</legend>
                <p className="text-muted-foreground -mt-1.5 text-sm leading-normal font-normal">
                  Customize the look and feel of the application
                </p>

                <div className="flex w-full flex-col gap-7">
                  {/* Theme Field */}
                  <div className="group/field flex w-full flex-col gap-3">
                    <div className="flex w-fit items-center gap-2 text-sm leading-snug font-medium">
                      Theme
                    </div>
                    <p className="text-muted-foreground -mt-1 text-sm leading-normal font-normal">
                      Select your preferred color scheme
                    </p>
                    <div className="inline-flex w-fit rounded-md shadow-sm" role="group">
                      <Button
                        variant={currentTheme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9 gap-2 rounded-r-none px-4"
                        onClick={() => handleThemeChange('light')}
                        type="button"
                      >
                        <Sun className="h-4 w-4" />
                        Light
                      </Button>
                      <Button
                        variant={currentTheme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9 gap-2 rounded-none border-x-0 px-4"
                        onClick={() => handleThemeChange('dark')}
                        type="button"
                      >
                        <Moon className="h-4 w-4" />
                        Dark
                      </Button>
                      <Button
                        variant={currentTheme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        className="h-9 gap-2 rounded-l-none px-4"
                        onClick={() => handleThemeChange('system')}
                        type="button"
                      >
                        <Monitor className="h-4 w-4" />
                        System
                      </Button>
                    </div>
                  </div>

                  <Separator className="relative -my-2 h-5" />

                  {/* Language Field */}
                  <div className="group/field flex w-full flex-col gap-3">
                    <Label
                      htmlFor="language-select"
                      className="flex w-fit items-center gap-2 text-sm leading-snug font-medium"
                    >
                      Language
                    </Label>
                    <Select value={currentLang} onValueChange={handleLanguageChange}>
                      <SelectTrigger id="language-select" className="h-9 w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {langs.map(lang => (
                          <SelectItem key={lang.key} value={lang.key}>
                            {lang.nativeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm leading-normal font-normal">
                      Choose your preferred interface language
                    </p>
                  </div>
                </div>
              </fieldset>
            </div>
          </form>
        </div>

        {/* Ngrok Tunnel Settings Block */}
        <div className="w-full max-w-md rounded-lg border p-6">
          <form>
            <div className="flex w-full flex-col gap-7">
              <fieldset className="flex flex-col gap-6">
                <legend className="mb-3 flex items-center gap-2 text-base font-medium">
                  <Globe className="h-5 w-5" />
                  Ngrok Tunnel
                </legend>
                <p className="text-muted-foreground -mt-1.5 text-sm leading-normal font-normal">
                  Configure ngrok to share projects online
                </p>

                <div className="flex w-full flex-col gap-7">
                  {/* Auth Token Field */}
                  <div className="group/field flex w-full flex-col gap-3">
                    <Label
                      htmlFor="ngrok-token"
                      className="flex w-fit items-center gap-2 text-sm leading-snug font-medium"
                    >
                      Authentication Token
                    </Label>
                    <div className="relative">
                      <Input
                        id="ngrok-token"
                        type="password"
                        placeholder="Enter your ngrok auth token"
                        value={ngrokTokenInput}
                        onChange={e => handleNgrokAuthTokenChange(e.target.value)}
                        className={`h-9 pr-10 ${
                          ngrokTokenValid === false
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : ngrokTokenValid === true && ngrokTokenInput
                              ? 'border-green-500 focus-visible:ring-green-500'
                              : ''
                        }`}
                      />
                      {ngrokTokenInput && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2">
                          {ngrokTokenValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {ngrokTokenValid === false && (
                      <p className="text-xs text-red-500">
                        Invalid format. Token must be at least 20 alphanumeric characters.
                      </p>
                    )}
                    <p className="text-muted-foreground text-sm leading-normal font-normal">
                      Get your token from{' '}
                      <button
                        type="button"
                        onClick={() =>
                          window.electronWindow.openExternal(
                            'https://dashboard.ngrok.com/get-started/your-authtoken'
                          )
                        }
                        className="text-primary cursor-pointer hover:underline"
                      >
                        ngrok dashboard
                      </button>
                    </p>
                  </div>

                  {/* Region Field */}
                  <div className="group/field flex w-full flex-col gap-3">
                    <Label
                      htmlFor="ngrok-region"
                      className="flex w-fit items-center gap-2 text-sm leading-snug font-medium"
                    >
                      Region
                    </Label>
                    <Select
                      value={settings.ngrokRegion || 'us'}
                      onValueChange={handleNgrokRegionChange}
                    >
                      <SelectTrigger id="ngrok-region" className="h-9 w-full">
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
                    <p className="text-muted-foreground text-sm leading-normal font-normal">
                      Choose the closest region for better performance
                    </p>
                  </div>
                </div>
              </fieldset>
            </div>
          </form>
        </div>
      </div>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});
