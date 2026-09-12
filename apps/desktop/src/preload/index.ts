import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@cursi/shared';
import type { AIContext } from '@cursi/shared';

// Narrow, explicit API — renderer cannot call arbitrary ipc channels
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

  onShortcutTriggered: (callback: (context: AIContext) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, context: AIContext) => {
      callback(context);
    };
    ipcRenderer.on(IPC.SHORTCUT_TRIGGERED, handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener(IPC.SHORTCUT_TRIGGERED, handler);
  },

  onNavigate: (callback: (route: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, route: string) => {
      callback(route);
    };
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
};

contextBridge.exposeInMainWorld('desktop', desktopApi);

// TypeScript global declaration — used by renderer code
export type DesktopApi = typeof desktopApi;
