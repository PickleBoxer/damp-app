/**
 * Application settings types
 */

export interface AppSettings {
  /** Default code editor */
  defaultEditor: EditorChoice;
  /** Default terminal/shell */
  defaultTerminal: TerminalChoice;
  /** Ngrok authentication token (optional) */
  ngrokAuthToken?: string;
  /** Ngrok region (optional) */
  ngrokRegion?: NgrokRegion;
  /** Show Docker stats (CPU/RAM) in footer */
  showDockerStats?: boolean;
}

export type EditorChoice = 'code' | 'code-insiders' | 'cursor' | 'custom';
export type TerminalChoice = 'wt' | 'powershell' | 'cmd' | 'custom';
export type NgrokRegion = 'us' | 'eu' | 'ap' | 'au' | 'sa' | 'jp' | 'in';

export const EDITOR_LABELS: Record<EditorChoice, string> = {
  code: 'VS Code',
  'code-insiders': 'VS Code Insiders',
  cursor: 'Cursor',
  custom: 'Custom Command',
};

export const TERMINAL_LABELS: Record<TerminalChoice, string> = {
  wt: 'Windows Terminal',
  powershell: 'PowerShell',
  cmd: 'Command Prompt',
  custom: 'Custom Command',
};

export const NGROK_REGION_LABELS: Record<NgrokRegion, string> = {
  us: 'United States',
  eu: 'Europe',
  ap: 'Asia/Pacific',
  au: 'Australia',
  sa: 'South America',
  jp: 'Japan',
  in: 'India',
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultEditor: 'code',
  defaultTerminal: 'wt',
  showDockerStats: true,
};
