import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC } from '@cursi/shared';
import { hideAIPanel, showAIPanel } from './windows';
import { updateShortcut } from './shortcuts';
import { gatherContext } from './context-engine';

export function registerIpcHandlers(panel: BrowserWindow): void {
  // Hide window — triggered by Esc in renderer
  ipcMain.handle(IPC.HIDE_WINDOW, () => {
    hideAIPanel();
  });

  // Show window
  ipcMain.handle(IPC.SHOW_WINDOW, () => {
    showAIPanel();
  });

  // Context request from renderer
  ipcMain.handle(IPC.GET_CONTEXT, async () => {
    return gatherContext();
  });

  // Shortcut update from settings UI
  ipcMain.handle(IPC.UPDATE_SHORTCUT, (_event, newCombo: string) => {
    const success = updateShortcut(panel, newCombo);
    return { success, shortcut: success ? newCombo : null };
  });

  // App info
  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
  }));
}
