import { app } from 'electron';
import { registerShortcut } from './shortcuts';
import { createAIPanel, getAIPanel, showAIPanel } from './windows';
import { registerIpcHandlers } from './ipc';
import { setupTray } from './tray';
import { setupAppLifecycle } from './app-lifecycle';

// Set the app name early — affects runtime display (packaged app shows "Open Cursi?")
app.name = 'Cursi';

// Register cursi:// as the default protocol client for deep links
// In dev electron runs as `process.defaultApp = true`, so we must pass the script path
if (process.defaultApp) {
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
 * Queue for deep link URLs that arrive before the panel is ready.
 * Drained once the panel finishes loading.
 */
let pendingDeepLink: string | null = null;

/**
 * Send a deep link URL to the renderer and show the panel.
 * If the panel isn't ready yet, queue it — it will be sent once ready.
 */
function handleDeepLink(url: string): void {
  console.log('[deep-link] Received:', url);

  const panel = getAIPanel();

  if (!panel) {
    // Panel not created yet — queue and process after app is ready
    console.log('[deep-link] Panel not ready yet, queuing...');
    pendingDeepLink = url;
    return;
  }

  const send = () => {
    console.log('[deep-link] Sending to renderer:', url);
    panel.webContents.send('auth:deep-link', url);
    // Give Supabase 300ms to process the session before showing the panel
    setTimeout(() => {
      showAIPanel();
    }, 300);
  };

  if (panel.webContents.isLoading()) {
    console.log('[deep-link] Renderer still loading, waiting...');
    panel.webContents.once('did-finish-load', send);
  } else {
    send();
  }
}

// macOS: deep link arrives via 'open-url' event (fires even before app.whenReady)
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

  // Drain any deep link that arrived before the panel was ready
  // (macOS 'open-url' can fire before whenReady completes)
  if (pendingDeepLink) {
    console.log('[deep-link] Draining pending deep link:', pendingDeepLink);
    handleDeepLink(pendingDeepLink);
    pendingDeepLink = null;
  }

  // Windows/Linux: deep link URL is passed as a CLI argument
  const argDeepLink = process.argv.find((arg) => arg.startsWith('cursi://'));
  if (argDeepLink) {
    handleDeepLink(argDeepLink);
  }
});
