import { app, BrowserWindow } from 'electron';
import { registerShortcut } from './shortcuts';
import { createAIPanel, getAIPanel } from './windows';
import { registerIpcHandlers } from './ipc';
import { setupTray } from './tray';
import { setupAppLifecycle } from './app-lifecycle';

// Security: disable navigation to untrusted origins
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
    }
  });
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
});
