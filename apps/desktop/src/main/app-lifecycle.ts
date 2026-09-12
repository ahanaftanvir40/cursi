import { app, BrowserWindow } from 'electron';
import { unregisterAll } from './shortcuts';
import { destroyTray } from './tray';

export function setupAppLifecycle(panel: BrowserWindow): void {
  // macOS: keep app alive when last window is closed (menu-bar app pattern)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
    // On macOS we intentionally do nothing — app keeps running in the tray
  });

  // macOS: re-show panel when dock icon is clicked (if visible in dock)
  app.on('activate', () => {
    if (!panel.isVisible()) {
      panel.show();
    }
  });

  // Cleanup before quit
  app.on('before-quit', () => {
    unregisterAll();
    destroyTray();
  });

  // Prevent the app from appearing in the dock on macOS (menu-bar only)
  // Comment this out if you want a dock icon
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }

  // Enable launch at login automatically on first run
  const settings = app.getLoginItemSettings();
  if (!settings.openAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
  }
}

/** Call this to enable/disable launch at login */
export function setLaunchAtLogin(enable: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    name: 'Cursi',
  });
}
