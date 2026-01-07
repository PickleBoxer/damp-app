import { useState, useEffect, useRef, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Button } from '@renderer/components/ui/button';
import { Switch } from '@renderer/components/ui/switch';
import { getSettings, updateSettings } from '@renderer/utils/settings';
import { EDITOR_LABELS, TERMINAL_LABELS, NGROK_REGION_LABELS } from '@shared/types/settings';
import type {
  EditorChoice,
  TerminalChoice,
  NgrokRegion,
  AppSettings,
} from '@shared/types/settings';
import { useTheme } from '@renderer/hooks/use-theme';
import type { ThemeMode } from '@shared/types/theme-mode';
import { toast } from 'sonner';
import {
  Monitor,
  Sun,
  Moon,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@renderer/components/ui/input';
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldSeparator,
} from '@renderer/components/ui/field';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Badge } from '@renderer/components/ui/badge';
import { Progress } from '@renderer/components/ui/progress';
import type { UpdateState } from '@shared/types/updater';

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

  // Update state
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load settings:', error);
        toast.error('Failed to load settings');
        setIsLoading(false);
      });
  }, []);

  // Load update status and set up listeners
  useEffect(() => {
    // Get initial status
    window.updater
      .getStatus()
      .then(status => setUpdateState(status))
      .catch((error: unknown) => console.error('Failed to get update status:', error));

    // Listen for status changes
    const unsubscribeStatus = window.updater.onStatusChange(state => {
      setUpdateState(state);
      setIsCheckingUpdate(false);
    });

    // Listen for download progress
    const unsubscribeProgress = window.updater.onProgress(progress => {
      setDownloadProgress(progress.percent);
    });

    // Listen for errors
    const unsubscribeError = window.updater.onError(error => {
      toast.error('Update error', {
        description: error.message,
        action: {
          label: 'Retry',
          onClick: () => {
            void handleCheckForUpdates();
          },
        },
      });
      setIsCheckingUpdate(false);
    });

    // Show toast when update is downloaded
    const checkForDownloadedUpdate = () => {
      if (updateState?.status === 'downloaded' && updateState.info?.version) {
        toast.success('Update ready to install', {
          description: `Version ${updateState.info.version} • Restart to update`,
          duration: Infinity,
          action: {
            label: 'Restart Now',
            onClick: () => {
              void handleInstallUpdate();
            },
          },
        });
      }
    };
    checkForDownloadedUpdate();

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
      unsubscribeError();
    };
  }, [updateState?.status]);

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

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      await window.updater.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await window.updater.quitAndInstall();
    } catch (error) {
      console.error('Failed to install update:', error);
      toast.error('Failed to install update');
    }
  };

  const handleSkipVersion = async () => {
    if (!updateState?.info?.version) return;
    try {
      await window.updater.skipVersion(updateState.info.version);
      toast.success(`Version ${updateState.info.version} skipped`);
    } catch (error) {
      console.error('Failed to skip version:', error);
      toast.error('Failed to skip version');
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

            {/* Application Updates */}
            <FieldSet>
              <FieldLegend>Application Updates</FieldLegend>
              <FieldDescription>Manage app updates and version information</FieldDescription>

              <Field orientation="vertical">
                <FieldTitle>Update Status</FieldTitle>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    Current version: {updateState?.currentVersion || 'Unknown'}
                  </span>
                  {updateState?.status === 'available' && (
                    <Badge variant="default">Update Available</Badge>
                  )}
                  {updateState?.status === 'downloaded' && (
                    <Badge variant="default">Ready to Install</Badge>
                  )}
                  {updateState?.status === 'not-available' && (
                    <Badge variant="outline">Up to date</Badge>
                  )}
                </div>

                {updateState?.status === 'checking' && (
                  <Alert>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertTitle>Checking for updates...</AlertTitle>
                    <AlertDescription>Please wait while we check for new versions</AlertDescription>
                  </Alert>
                )}

                {updateState?.status === 'downloading' && (
                  <Alert>
                    <Download className="h-4 w-4" />
                    <AlertTitle>Downloading update...</AlertTitle>
                    <AlertDescription>
                      {downloadProgress > 0 ? (
                        <div className="mt-2 space-y-2">
                          <Progress value={downloadProgress} className="h-2" />
                          <span className="text-xs">{Math.round(downloadProgress)}% complete</span>
                        </div>
                      ) : (
                        'Download started...'
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {updateState?.status === 'downloaded' && updateState.info && (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>Update ready to install</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-3">
                        <p>
                          Version <strong>{updateState.info.version}</strong> has been downloaded
                          and is ready to install.
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleInstallUpdate}>
                            Restart & Install
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleSkipVersion}>
                            Skip This Version
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {updateState?.status === 'not-available' && (
                  <p className="text-muted-foreground text-xs">You're running the latest version</p>
                )}

                {updateState?.status === 'error' && updateState.error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Update error</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-2">
                        <p>{updateState.error.message}</p>
                        <Button size="sm" variant="outline" onClick={handleCheckForUpdates}>
                          Retry
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {(!updateState || updateState.status === 'idle') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isCheckingUpdate ? 'animate-spin' : ''}`}
                    />
                    Check for Updates
                  </Button>
                )}
              </Field>
            </FieldSet>
          </FieldGroup>
        </FieldSet>
      </div>
    </ScrollArea>
  );
}
