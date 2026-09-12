import { globalShortcut, BrowserWindow, clipboard } from 'electron';
import { DEFAULT_SHORTCUT, IPC } from '@cursi/shared';
import { showAIPanel, hideAIPanel } from './windows';
import { gatherContext } from './context-engine';

let currentShortcut = DEFAULT_SHORTCUT;

export function registerShortcut(panel: BrowserWindow, combo = DEFAULT_SHORTCUT): void {
  // Unregister previous before registering new
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut);
  }

  const success = globalShortcut.register(combo, async () => {
    if (panel.isVisible()) {
      hideAIPanel();
      return;
    }

    // Gather context first (fast — just reads clipboard)
    const context = await gatherContext();
    console.log('[shortcuts] Context gathered:', context.type, context.clipboardText?.slice(0, 40));

    // Show panel first so renderer is ready to receive the IPC event
    showAIPanel();

    // Small delay to ensure renderer event listeners are mounted before sending
    setTimeout(() => {
      panel.webContents.send(IPC.SHORTCUT_TRIGGERED, context);
    }, 150);
  });

  if (!success) {
    console.warn(`[shortcuts] Failed to register shortcut: ${combo}. It may be taken by another app.`);
  } else {
    currentShortcut = combo;
    console.log(`[shortcuts] Registered: ${combo}`);
  }
}

export function updateShortcut(panel: BrowserWindow, newCombo: string): boolean {
  globalShortcut.unregister(currentShortcut);

  const success = globalShortcut.register(newCombo, async () => {
    const context = await gatherContext();
    showAIPanel();
    setTimeout(() => {
      panel.webContents.send(IPC.SHORTCUT_TRIGGERED, context);
    }, 150);
  });

  if (success) {
    currentShortcut = newCombo;
  } else {
    // Re-register the old one if new one failed
    registerShortcut(panel, currentShortcut);
  }

  return success;
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll();
}
