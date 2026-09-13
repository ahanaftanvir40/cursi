import { contextBridge, ipcRenderer } from 'electron';
import type { AIContext } from '@cursi/shared';

// Confirm preload is executing
console.log('[preload] Script loaded — contextBridge available:', typeof contextBridge !== 'undefined');

// IPC channel names — inlined to avoid importing ESM @cursi/shared in CJS preload
const IPC = {
  HIDE_WINDOW: 'window:hide',
  SHOW_WINDOW: 'window:show',
  GET_CONTEXT: 'context:get',
  UPDATE_SHORTCUT: 'shortcut:update',
  SHORTCUT_TRIGGERED: 'shortcut:triggered',
  RESIZE_PANEL: 'panel:resize',
} as const;

// Narrow, explicit API exposed to the renderer
const desktopApi = {
  hideWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC.HIDE_WINDOW),

  showWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC.SHOW_WINDOW),

  getContext: (): Promise<AIContext> =>
    ipcRenderer.invoke(IPC.GET_CONTEXT),

  updateShortcut: (combo: string): Promise<{ success: boolean; shortcut: string | null }> =>
    ipcRenderer.invoke(IPC.UPDATE_SHORTCUT, combo),

  getAppInfo: (): Promise<{ version: string; name: string; platform: string }> =>
    ipcRenderer.invoke('app:getInfo'),

  getLaunchAtLogin: (): Promise<boolean> =>
    ipcRenderer.invoke('app:getLaunchAtLogin'),

  setLaunchAtLogin: (enable: boolean): Promise<void> =>
    ipcRenderer.invoke('app:setLaunchAtLogin', enable),

  resizePanel: (height: number): Promise<void> =>
    ipcRenderer.invoke(IPC.RESIZE_PANEL, height),

  onShortcutTriggered: (callback: (context: AIContext) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, context: AIContext) => {
      callback(context);
    };
    ipcRenderer.on(IPC.SHORTCUT_TRIGGERED, handler);
    return () => ipcRenderer.removeListener(IPC.SHORTCUT_TRIGGERED, handler);
  },

  onNavigate: (callback: (route: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, route: string) => {
      callback(route);
    };
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },

  // Deep link handler — receives cursi://auth/callback#access_token=... URLs
  onDeepLink: (callback: (url: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) => {
      callback(url);
    };
    ipcRenderer.on('auth:deep-link', handler);
    return () => ipcRenderer.removeListener('auth:deep-link', handler);
  },
};

contextBridge.exposeInMainWorld('desktop', desktopApi);
console.log('[preload] window.desktop exposed successfully');

export type DesktopApi = typeof desktopApi;
