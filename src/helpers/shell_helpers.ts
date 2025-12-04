/**
 * Shell helpers - wrapper functions for external application IPC calls
 */

import { getSettings } from './settings_helpers';

export async function openProjectFolder(projectId: string) {
  return await window.shell.openFolder(projectId);
}

export async function openProjectInBrowser(projectId: string) {
  return await window.shell.openBrowser(projectId);
}

export async function openProjectInEditor(projectId: string) {
  const settings = getSettings();
  return await window.shell.openEditor(projectId, {
    defaultEditor: settings.defaultEditor,
    defaultTerminal: settings.defaultTerminal,
  });
}

export async function openProjectTerminal(projectId: string) {
  const settings = getSettings();
  return await window.shell.openTerminal(projectId, {
    defaultEditor: settings.defaultEditor,
    defaultTerminal: settings.defaultTerminal,
  });
}

export async function openProjectTinker(projectId: string) {
  const settings = getSettings();
  return await window.shell.openTinker(projectId, {
    defaultEditor: settings.defaultEditor,
    defaultTerminal: settings.defaultTerminal,
  });
}

export async function openUrl(url: string) {
  return await window.shell.openUrl(url);
}
