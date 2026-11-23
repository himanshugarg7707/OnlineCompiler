import { contextBridge, ipcRenderer, webFrame } from 'electron';

// 1. Expose the nativeHost bridge so all existing desktop capabilities work seamlessly
contextBridge.exposeInMainWorld('webkit', {
  messageHandlers: {
    nativeHost: {
      postMessage: (msg) => ipcRenderer.send('native-host-message', msg),
    },
  },
});

contextBridge.exposeInMainWorld('__IS_DESKTOP_APP__', true);
contextBridge.exposeInMainWorld('__IS_ELECTRON__', true);

// 2. Expose high-level Electron API
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  isNativeApp: true,
  platform: process.platform,
  postMessage: (msg) => ipcRenderer.send('native-host-message', msg),
  openFolder: () => ipcRenderer.send('native-host-message', { type: 'open_local_folder' }),
  openFile: () => ipcRenderer.send('native-host-message', { type: 'open_local_file' }),
  openTerminal: () => ipcRenderer.send('native-host-message', { type: 'open_terminal' }),
  saveFile: (path, code) => ipcRenderer.send('native-host-message', { type: 'save_to_path', path, code }),
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

// 3. Desktop Application Environment Hooks
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('electron-desktop-app');
  document.body.classList.add(`platform-${process.platform}`);

  // Prevent default browser right-click menu (Back, Forward, Reload, View Source)
  // while preserving custom IDE menus (Monaco editor contextmenu, File Explorer menu)
  window.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (
      target.closest('.monaco-editor') ||
      target.closest('.file-item') ||
      target.closest('.file-tree') ||
      target.closest('.has-custom-contextmenu') ||
      target.closest('input') ||
      target.closest('textarea')
    ) {
      return; // Handled by IDE custom context menu or text controls
    }
    e.preventDefault();
  }, true);

  // Prevent drag-and-drop of files or links from opening raw web pages
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filePaths = Array.from(e.dataTransfer.files).map((f) => f.path).filter(Boolean);
      if (filePaths.length > 0) {
        ipcRenderer.send('files-dropped', filePaths);
      }
    }
  }, false);

  // Suppress browser keyboard shortcuts that break the native desktop experience
  window.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // F5 -> Run active code (instead of browser page reload)
    if (e.key === 'F5') {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('editor-run-code'));
      return;
    }

    // Ctrl+S -> Save file to disk (instead of browser "Save Page As HTML")
    if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('editor-save-file'));
      return;
    }

    // Ctrl+P -> Open Quick Open / Command Palette (instead of browser Print dialog)
    if (isCtrlOrCmd && (e.key === 'p' || e.key === 'P') && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('fullcode-open-command-palette', { detail: { mode: 'files' } }));
      return;
    }

    // Ctrl+Shift+P -> Open Command Palette
    if (isCtrlOrCmd && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('fullcode-open-command-palette', { detail: { mode: 'commands' } }));
      return;
    }

    // Ctrl+O -> Open Folder / File dialog (instead of browser Open URL)
    if (isCtrlOrCmd && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.send('native-host-message', { type: 'open_local_folder' });
      return;
    }

    // Ctrl+R -> Prevent accidental page reload that resets memory/state
    if (isCtrlOrCmd && (e.key === 'r' || e.key === 'R') && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, true);
});

// Receive native action dispatches from the main process
ipcRenderer.on('onlinecompiler-native-action', (_event, detail) => {
  window.dispatchEvent(new CustomEvent('onlinecompiler-native-action', { detail }));
});
