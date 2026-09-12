import { ipcMain, BrowserWindow, app } from 'electron';
import { hideAIPanel, showAIPanel, repositionNearCursor } from './windows';
import { updateShortcut } from './shortcuts';
import { gatherContext } from './context-engine';

// Inline channel names — avoids ESM/CJS mismatch with @cursi/shared in main process
const IPC_CHANNELS = {
  HIDE_WINDOW:      'window:hide',
  SHOW_WINDOW:      'window:show',
  GET_CONTEXT:      'context:get',
  UPDATE_SHORTCUT:  'shortcut:update',
  RESIZE_PANEL:     'panel:resize',
} as const;

const PANEL = {
  width:     400,
  minHeight: 52,
  maxHeight: 380,
} as const;

export function registerIpcHandlers(panel: BrowserWindow): void {
  // Hide window — triggered by Esc in renderer
  ipcMain.handle(IPC_CHANNELS.HIDE_WINDOW, () => {
    hideAIPanel();
  });

  // Show window
  ipcMain.handle(IPC_CHANNELS.SHOW_WINDOW, () => {
    showAIPanel();
  });

  // Context request from renderer
  ipcMain.handle(IPC_CHANNELS.GET_CONTEXT, async () => {
    return gatherContext();
  });

  // Shortcut update from settings UI
  ipcMain.handle(IPC_CHANNELS.UPDATE_SHORTCUT, (_event, newCombo: string) => {
    const success = updateShortcut(panel, newCombo);
    return { success, shortcut: success ? newCombo : null };
  });

  // Dynamic panel resize — renderer measures content height, we resize + reposition
  ipcMain.handle(IPC_CHANNELS.RESIZE_PANEL, (_event, height: number) => {
    const clamped = Math.max(PANEL.minHeight, Math.min(Math.round(height), PANEL.maxHeight));
    const [, currentH] = panel.getSize();
    if (Math.abs(currentH - clamped) < 2) return; // skip if already correct
    panel.setSize(PANEL.width, clamped, false);
    if (panel.isVisible()) {
      repositionNearCursor(panel);
    }
  });

  // App info
  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
  }));
}
