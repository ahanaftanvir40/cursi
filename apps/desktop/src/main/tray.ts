import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';
import { showAIPanel, hideAIPanel } from './windows';

let tray: Tray | null = null;

export function setupTray(panel: BrowserWindow): void {
  // Use a template image (macOS auto-adapts to dark/light menu bar)
  const iconPath = join(__dirname, '../../resources/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Cursi');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Cursi',
      accelerator: 'CmdOrCtrl+Shift+Space',
      click: () => showAIPanel(),
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        panel.webContents.send('navigate', '/settings');
        showAIPanel();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Cursi',
      accelerator: 'CmdOrCtrl+Q',
      role: 'quit',
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single click also opens the panel (macOS convention)
  tray.on('click', () => {
    panel.isVisible() ? hideAIPanel() : showAIPanel();
  });
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
