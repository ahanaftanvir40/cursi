import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

// Inlined to avoid ESM/CJS mismatch with @cursi/shared in Electron main process
const AI_PANEL = {
  width:     400,
  height:    52,
  minWidth:  400,
  minHeight: 52,
  maxHeight: 560,
} as const;

let aiPanel: BrowserWindow | null = null;
// Cursor position captured at the moment the shortcut fires
let savedCursorPoint: Electron.Point | null = null;

function resolvePreloadPath(): string {
  // electron-vite outputs CJS as index.js, ESM as index.mjs
  const js = join(__dirname, '../preload/index.js');
  const mjs = join(__dirname, '../preload/index.mjs');
  const resolved = existsSync(js) ? js : mjs;
  console.log('[main] Using preload:', resolved, existsSync(resolved) ? '✓' : '✗ NOT FOUND');
  return resolved;
}

/**
 * Position a panel window near the current cursor position.
 * Exported so the IPC resize handler can reposition after height changes.
 */
export function repositionNearCursor(panel: BrowserWindow): void {
  const OFFSET = 8;
  // Use saved position from shortcut time, not current mouse position
  const point = savedCursorPoint ?? screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x: wx, y: wy, width: ww, height: wh } = display.workArea;
  const size = panel.getSize();
  const panelW: number = size[0] ?? AI_PANEL.width;
  const panelH: number = size[1] ?? AI_PANEL.height;

  let panelX = point.x + OFFSET;
  let panelY = point.y + OFFSET;

  if (panelX + panelW > wx + ww) panelX = point.x - panelW - OFFSET;
  if (panelY + panelH > wy + wh) panelY = point.y - panelH - OFFSET;

  panelX = Math.max(wx, Math.min(panelX, wx + ww - panelW));
  panelY = Math.max(wy, Math.min(panelY, wy + wh - panelH));

  panel.setPosition(Math.round(panelX), Math.round(panelY));
}

function positionNearCursor(): void {
  if (aiPanel) repositionNearCursor(aiPanel);
}

export async function createAIPanel(): Promise<BrowserWindow> {
  aiPanel = new BrowserWindow({
    width: AI_PANEL.width,
    height: AI_PANEL.height,
    minWidth: AI_PANEL.minWidth,
    minHeight: AI_PANEL.minHeight,
    // Position is set dynamically near the cursor when shown

    // Frameless floating panel
    frame: false,
    transparent: true,
    // No vibrancy on the window — it fills the entire frame regardless of content height.
    // CSS backdrop-filter on the root div handles the frosted glass effect instead,
    // and it only covers the rendered content area.
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
      // Disable web security in dev (localhost CORS) and on Windows packaged
      // (file:// origin causes "null" Origin header which browsers enforce strictly).
      // macOS packaged uses app:// protocol which doesn't have this restriction.
      webSecurity: process.env['ELECTRON_RENDERER_URL']
        ? false   // dev mode — always off
        : process.platform !== 'win32', // packaged: off on Windows, on on macOS
      // Throttle timers/animations when window is hidden — saves CPU & battery
      backgroundThrottling: true,
    },

    // Start hidden — shown on shortcut
    show: false,
    skipTaskbar: true,
  });

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    await aiPanel.loadURL(process.env['ELECTRON_RENDERER_URL']);
    // DevTools disabled — open manually from tray or via Cmd+Option+I if needed
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
    if (aiPanel.webContents.isDevToolsOpened()) return; // don't hide when inspecting
    aiPanel.hide();
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
  // Capture cursor position NOW (before user moves mouse while window opens)
  savedCursorPoint = screen.getCursorScreenPoint();
  positionNearCursor();
  aiPanel.show();
  aiPanel.focus();
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
