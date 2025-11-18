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
import { EDITOR_LABELS, TERMINAL_LABELS } from '@/types/settings';
import type { EditorChoice, TerminalChoice } from '@/types/settings';
import { setTheme, getCurrentTheme } from '@/helpers/theme_helpers';
import { setAppLanguage } from '@/helpers/language_helpers';
import type { ThemeMode } from '@/types/theme-mode';
import langs from '@/localization/langs';
import { toast } from 'sonner';
import { Monitor, Sun, Moon } from 'lucide-react';

function SettingsPage() {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState(() => getSettings());
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [currentLang, setCurrentLang] = useState(i18n.language);

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

        {/* Placeholder for future settings */}
        <div className="w-full max-w-md rounded-lg border border-dashed p-6">
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-6 text-center text-balance">
            <div className="flex max-w-sm flex-col items-center gap-2 text-center">
              <div className="text-lg font-medium tracking-tight">More Settings</div>
              <div className="text-muted-foreground text-sm/relaxed">
                Additional configuration options coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});
