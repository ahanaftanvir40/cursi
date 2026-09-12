import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { AI_PANEL } from '@cursi/shared';

let aiPanel: BrowserWindow | null = null;

function resolvePreloadPath(): string {
  // electron-vite outputs CJS as index.js, ESM as index.mjs
  const js = join(__dirname, '../preload/index.js');
  const mjs = join(__dirname, '../preload/index.mjs');
  const resolved = existsSync(js) ? js : mjs;
  console.log('[main] Using preload:', resolved, existsSync(resolved) ? '✓' : '✗ NOT FOUND');
  return resolved;
}

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

    // Always on top — use 'floating' so it accepts keyboard input on macOS
    alwaysOnTop: true,
    // 'panel' suppresses keyboard events on macOS; use default window type instead
    // type: 'panel',

    // Security
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // In dev, disable web security so localhost:5173 can call localhost:3001
      webSecurity: !process.env['ELECTRON_RENDERER_URL'],
    },

    // Start hidden — shown on shortcut
    show: false,
    skipTaskbar: true,
  });

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    await aiPanel.loadURL(process.env['ELECTRON_RENDERER_URL']);
    // Open DevTools in dev mode so errors are visible
    aiPanel.webContents.openDevTools({ mode: 'detach' });
  } else {
    await aiPanel.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Log renderer crashes / errors to main process console
  aiPanel.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] Renderer process gone:', details);
  });
  aiPanel.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('[main] Renderer failed to load:', code, desc, url);
  });
  aiPanel.webContents.on('console-message', (_event, level, message) => {
    if (level === 3) console.error('[renderer]', message);
    else if (level === 2) console.warn('[renderer]', message);
    else console.log('[renderer]', message); // log everything in dev
  });

  // Hide when it loses focus (Spotlight-style UX)
  // Use a small delay so clicking inside the window (e.g. input fields)
  // doesn't immediately dismiss it before focus settles
  aiPanel.on('blur', () => {
    if (!aiPanel) return;
    if (aiPanel.webContents.isDevToolsOpened()) return;
    // Only auto-hide in production; in dev keep it open for easier debugging
    if (!process.env['ELECTRON_RENDERER_URL']) {
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
  // On macOS, explicitly move focus to the app so keyboard input works
  aiPanel.moveTop();
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
