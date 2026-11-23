import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, protected APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleDevTools: () => ipcRenderer.send('window-devtools'),
  openExternalUrl: (url) => ipcRenderer.send('open-external-url', url),
  onMenuAction: (callback) => {
    const handler = (_event, action, data) => callback(action, data);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },
});
