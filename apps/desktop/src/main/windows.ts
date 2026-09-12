import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { AI_PANEL } from '@cursi/shared';

let aiPanel: BrowserWindow | null = null;

export async function createAIPanel(): Promise<BrowserWindow> {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  aiPanel = new BrowserWindow({
    width: AI_PANEL.width,
    height: AI_PANEL.height,
    minWidth: AI_PANEL.minWidth,
    minHeight: AI_PANEL.minHeight,
    // Center horizontally, slightly above center vertically
    x: Math.round((screenW - AI_PANEL.width) / 2),
    y: Math.round(screenH * 0.3),

    // Frameless floating panel
    frame: false,
    transparent: true,
    vibrancy: 'under-window',      // macOS frosted glass
    visualEffectState: 'active',
    roundedCorners: true,

    // Always on top but doesn't steal menubar or dock
    alwaysOnTop: true,
    type: 'panel',                 // macOS: floats above all apps

    // Security
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },

    // Start hidden — shown on shortcut
    show: false,
    skipTaskbar: true,
  });

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    await aiPanel.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    await aiPanel.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Hide when it loses focus (Spotlight-style UX)
  aiPanel.on('blur', () => {
    if (aiPanel && !aiPanel.webContents.isDevToolsOpened()) {
      aiPanel.hide();
    }
  });

  aiPanel.on('closed', () => {
    aiPanel = null;
  });

  return aiPanel;
}

export function getAIPanel(): BrowserWindow | null {
  return aiPanel;
}

export function showAIPanel(): void {
  if (!aiPanel) return;
  aiPanel.show();
  aiPanel.focus();
}

export function hideAIPanel(): void {
  aiPanel?.hide();
}

export function toggleAIPanel(): void {
  if (!aiPanel) return;
  if (aiPanel.isVisible()) {
    hideAIPanel();
  } else {
    showAIPanel();
  }
}
