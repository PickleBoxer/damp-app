/**
 * Application settings types
 */

export interface AppSettings {
  /** Default code editor */
  defaultEditor: EditorChoice;
  /** Default terminal/shell */
  defaultTerminal: TerminalChoice;
}

export type EditorChoice = 'code' | 'code-insiders' | 'cursor' | 'custom';
export type TerminalChoice = 'wt' | 'powershell' | 'cmd' | 'custom';

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

export const DEFAULT_SETTINGS: AppSettings = {
  defaultEditor: 'code',
  defaultTerminal: 'wt',
};
