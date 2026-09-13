import { app, BrowserWindow } from 'electron';
import { registerShortcut } from './shortcuts';
import { createAIPanel, getAIPanel } from './windows';
import { registerIpcHandlers } from './ipc';
import { setupTray } from './tray';
import { setupAppLifecycle } from './app-lifecycle';

// Register cursi:// as the default protocol client for deep links
// This enables magic link auth: cursi://auth/callback#access_token=...
if (process.defaultApp) {
  // In dev (electron .), argv[2] is the URL
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('cursi', process.execPath, [process.argv[1] ?? '']);
  }
} else {
  app.setAsDefaultProtocolClient('cursi');
}

// Security: disable navigation to untrusted origins
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
    }
  });
});

/**
 * Handle a deep link URL by forwarding it to the renderer.
 * The renderer's authStore will extract tokens and set the session.
 */
function handleDeepLink(url: string): void {
  const panel = getAIPanel();
  if (!panel) return;
  console.log('[deep-link] Received:', url);
  panel.webContents.send('auth:deep-link', url);
}

// macOS: deep link arrives via 'open-url' event (app may already be running)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(async () => {
  // Create the floating AI panel (hidden on start)
  const panel = await createAIPanel();

  // Register IPC handlers before the renderer loads
  registerIpcHandlers(panel);

  // Menu bar / tray
  setupTray(panel);

  // Global shortcut — Cmd+Shift+Space
  registerShortcut(panel);

  // macOS-specific lifecycle hooks
  setupAppLifecycle(panel);

  // Handle deep link if app was launched via cursi:// URL (cold start)
  // On macOS the URL is in process.argv when launched from protocol
  const deepLinkUrl = process.argv.find((arg) => arg.startsWith('cursi://'));
  if (deepLinkUrl) {
    // Wait for renderer to be ready before sending
    panel.webContents.once('did-finish-load', () => {
      handleDeepLink(deepLinkUrl);
    });
  }
});
