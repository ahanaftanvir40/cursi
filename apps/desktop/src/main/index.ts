import { app } from 'electron';
import { registerShortcut } from './shortcuts';
import { createAIPanel, getAIPanel, showAIPanel } from './windows';
import { registerIpcHandlers } from './ipc';
import { setupTray } from './tray';
import { setupAppLifecycle } from './app-lifecycle';

// Set the app name early — affects runtime display (packaged app shows "Open Cursi?")
app.name = 'Cursi';

// ─── Single instance lock (critical for Windows deep links) ───────────────────
//
// On Windows, clicking a cursi:// URL launches a brand-new Electron process
// with the URL in process.argv — there is no 'open-url' event like on macOS.
// requestSingleInstanceLock() prevents the second process from fully starting:
//   • Second process  → gotLock = false → app.quit() immediately
//   • First process   → receives 'second-instance' event with the new argv
//     → we extract the cursi:// URL → handleDeepLink()
//
// On macOS this is a harmless no-op: the lock always succeeds and
// 'second-instance' never fires (macOS uses 'open-url' instead).
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  // We are the redundant second instance spawned by Windows for the deep link.
  // Quit immediately — the first instance handles everything via 'second-instance'.
  app.quit();
} else {
  // ── We are the first (real) instance ────────────────────────────────────────

  // Register cursi:// as the default protocol client for deep links.
  // In dev, electron runs as process.defaultApp = true, so pass the script path.
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
   * Drained once whenReady completes and createAIPanel() returns.
   */
  let pendingDeepLink: string | null = null;

  /**
   * Send a deep link URL to the renderer and show the panel.
   * Safe to call at any point — queues automatically if panel not ready yet.
   */
  function handleDeepLink(url: string): void {
    console.log('[deep-link] Received:', url);

    const panel = getAIPanel();

    if (!panel) {
      console.log('[deep-link] Panel not ready yet, queuing...');
      pendingDeepLink = url;
      return;
    }

    const send = () => {
      console.log('[deep-link] Sending to renderer:', url);
      panel.webContents.send('auth:deep-link', url);
      // Give Supabase 300ms to set the session before showing the panel
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

  // Windows: a second instance was launched with cursi:// in its argv.
  // This fires on the FIRST (running) instance — extract the URL and handle it.
  // Must be registered before app.whenReady() so it catches early events.
  app.on('second-instance', (_event, argv) => {
    console.log('[deep-link] second-instance fired, argv:', argv);
    const deepLinkUrl = argv.find((arg) => arg.startsWith('cursi://'));
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    } else {
      // No deep link — user just tried to open a second instance normally.
      // Bring the existing panel to focus if it's visible, otherwise show it.
      const panel = getAIPanel();
      if (panel) {
        if (panel.isVisible()) {
          panel.focus();
          panel.moveTop();
        } else {
          showAIPanel();
        }
      }
    }
  });

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
    // ('open-url' on macOS can fire before whenReady completes)
    if (pendingDeepLink) {
      console.log('[deep-link] Draining pending deep link:', pendingDeepLink);
      handleDeepLink(pendingDeepLink);
      pendingDeepLink = null;
    }

    // Windows cold-start: app was NOT already running when the link was clicked.
    // The URL is the last argument passed by Windows to the new process.
    const argDeepLink = process.argv.find((arg) => arg.startsWith('cursi://'));
    if (argDeepLink) {
      handleDeepLink(argDeepLink);
    }
  });
}
