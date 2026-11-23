import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5001;
const APP_URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let serverProcess = null;
let serverStartedByUs = false;

// Ensure single instance lock for smooth Windows desktop experience
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Check if the backend HTTP server is responding
 */
function checkServerHealthy(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 800 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Start the embedded Node.js Express backend
 */
async function startEmbeddedServer() {
  const isHealthy = await checkServerHealthy(PORT);
  if (isHealthy) {
    console.log(`[Electron] Backend server already running on port ${PORT}`);
    return;
  }

  const appPath = app.getAppPath();
  let serverScript = path.join(appPath, 'server', 'index.js');

  // Handle unpackaged dev vs packaged paths
  if (!fs.existsSync(serverScript)) {
    serverScript = path.resolve(__dirname, '..', 'server', 'index.js');
  }

  console.log(`[Electron] Launching embedded backend: ${serverScript}`);

  try {
    serverProcess = fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'production',
        SERVE_STATIC: '1',
      },
      stdio: 'pipe',
    });
    serverStartedByUs = true;

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Backend STDOUT] ${data.toString().trim()}`);
    });
    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Backend STDERR] ${data.toString().trim()}`);
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Backend exited with code ${code}, signal ${signal}`);
      serverProcess = null;
    });

    // Wait for the backend to become healthy
    let attempts = 0;
    while (attempts < 25) {
      await new Promise((r) => setTimeout(r, 400));
      attempts++;
      if (await checkServerHealthy(PORT)) {
        console.log(`[Electron] Backend server is healthy on port ${PORT}`);
        return;
      }
    }
    console.warn('[Electron] Backend health check timed out, attempting to load app anyway.');
  } catch (err) {
    console.error('[Electron] Failed to start embedded backend server:', err);
  }
}

/**
 * Build application menu for Windows & macOS
 */
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '&File',
      submenu: [
        {
          label: '&New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-file'),
        },
        {
          label: '&Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWindow) return;
            const res = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Select Workspace Folder',
            });
            if (!res.canceled && res.filePaths[0]) {
              mainWindow.webContents.send('menu-action', 'open-folder', res.filePaths[0]);
            }
          },
        },
        {
          label: '&Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save-file'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'E&xit' },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '&View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: 'F11' },
      ],
    },
    {
      label: '&Run',
      submenu: [
        {
          label: '&Run Active Code',
          accelerator: 'F5',
          click: () => mainWindow?.webContents.send('menu-action', 'run-code'),
        },
      ],
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'FullCode Documentation',
          click: () => shell.openExternal('https://github.com/himanshugarg7707/OnlineCompiler'),
        },
        { type: 'separator' },
        {
          label: 'About FullCode IDE',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About FullCode IDE',
              message: 'FullCode IDE for Windows',
              detail: 'Production Universal Polyglot Code Compiler & Learning Environment.\nVersion: 1.0.0\nCreated by Himanshu Garg.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create the main production window
 */
async function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'assets', 'icon.ico')
    : path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'FullCode IDE',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#18181b', // Zero white flash on launch
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  createMenu();

  // Reveal window smoothly when DOM is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // IPC handlers for window controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());
  ipcMain.on('window-devtools', () => mainWindow?.webContents.toggleDevTools());
  ipcMain.on('open-external-url', (_e, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
    }
  });

  // Load backend URL which serves static dist + API
  mainWindow.loadURL(APP_URL).catch((err) => {
    console.error('[Electron] Failed to load URL:', err);
    // Fallback: If HTTP load fails initially, retry in 1s
    setTimeout(() => {
      mainWindow?.loadURL(APP_URL);
    }, 1000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await startEmbeddedServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Clean up child server process on exit
function cleanupServer() {
  if (serverStartedByUs && serverProcess) {
    console.log('[Electron] Shutting down embedded backend server...');
    try {
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (serverProcess) {
          try { serverProcess.kill('SIGKILL'); } catch {}
        }
      }, 1000);
    } catch {}
    serverProcess = null;
  }
}

app.on('before-quit', cleanupServer);
app.on('window-all-closed', () => {
  cleanupServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
