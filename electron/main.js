import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';
import { fork, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5001;
const APP_URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let serverProcess = null;
let serverStartedByUs = false;
let currentZoom = 1.0;
let activeWorkspaceDir = path.join(os.homedir(), 'Documents', 'FullCodeWorkspace');

// Ensure single instance lock for smooth Windows desktop experience
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check if opened with a file argument on Windows
      const filePath = commandLine.find((arg) => arg.endsWith('.py') || arg.endsWith('.js') || arg.endsWith('.cpp') || arg.endsWith('.java'));
      if (filePath && fs.existsSync(filePath)) {
        loadFileIntoWorkspace(filePath);
      }
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

    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 350));
      attempts++;
      if (await checkServerHealthy(PORT)) {
        console.log(`[Electron] Backend server is healthy on port ${PORT}`);
        return;
      }
    }
  } catch (err) {
    console.error('[Electron] Failed to start embedded backend server:', err);
  }
}

/**
 * Scan directory recursively for text/code files
 */
function scanDirectoryFiles(dirPath, maxFiles = 250) {
  const scanned = [];
  const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.idea', '.vscode', '__pycache__', '.vercel']);
  const textExtensions = new Set([
    'py', 'js', 'jsx', 'ts', 'tsx', 'c', 'cpp', 'cc', 'h', 'hpp',
    'java', 'go', 'rs', 'swift', 'sql', 'html', 'css', 'json', 'md',
    'txt', 'sh', 'zsh', 'yaml', 'yml', 'xml', 'csv', 'toml', 'env'
  ]);

  function walk(currentDir) {
    if (scanned.length >= maxFiles) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (scanned.length >= maxFiles) return;
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        if (ignored.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          if (textExtensions.has(ext) || ext === '') {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size < 1_500_000) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const relPath = path.relative(dirPath, fullPath).replace(/\\/g, '/');
                scanned.push({ name: relPath, content, localPath: fullPath });
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  walk(dirPath);
  return scanned;
}

/**
 * Send native actions to the React app
 */
function dispatchNativeAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('onlinecompiler-native-action', action);
  }
}

/**
 * Load single file into workspace
 */
function loadFileIntoWorkspace(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath);
    dispatchNativeAction({
      type: 'load-local-file',
      name,
      content,
      path: filePath,
    });
  } catch (err) {
    console.error('Failed to load file:', err);
  }
}

/**
 * Build rich native desktop application menu
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
          click: () => dispatchNativeAction({ type: 'new-file' }),
        },
        {
          label: '&Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWindow) return;
            const res = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: 'Open Workspace Folder',
            });
            if (!res.canceled && res.filePaths[0]) {
              const folderPath = res.filePaths[0];
              activeWorkspaceDir = folderPath;
              const files = scanDirectoryFiles(folderPath);
              dispatchNativeAction({
                type: 'load-local-folder',
                folderName: path.basename(folderPath),
                folderPath,
                files,
              });
            }
          },
        },
        {
          label: 'Open &File...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            if (!mainWindow) return;
            const res = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              title: 'Open File in FullCode',
            });
            if (!res.canceled && res.filePaths[0]) {
              loadFileIntoWorkspace(res.filePaths[0]);
            }
          },
        },
        {
          label: '&Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => dispatchNativeAction({ type: 'save-active-file' }),
        },
        {
          label: 'Export Workspace &Zip',
          click: () => dispatchNativeAction({ type: 'export-zip' }),
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => dispatchNativeAction({ type: 'close-tab' }),
        },
        {
          label: 'Close All Tabs',
          click: () => dispatchNativeAction({ type: 'close-all-tabs' }),
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
        { type: 'separator' },
        {
          label: 'Format Code',
          accelerator: 'Shift+Alt+F',
          click: () => dispatchNativeAction({ type: 'format-code' }),
        },
      ],
    },
    {
      label: '&View',
      submenu: [
        {
          label: 'Command Palette...',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('fullcode-open-command-palette', { mode: 'commands' }),
        },
        {
          label: 'Go to File...',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('fullcode-open-command-palette', { mode: 'files' }),
        },
        { type: 'separator' },
        {
          label: 'Toggle File Explorer',
          accelerator: 'CmdOrCtrl+B',
          click: () => dispatchNativeAction({ type: 'toggle-explorer' }),
        },
        {
          label: 'Toggle Integrated Terminal',
          accelerator: 'Ctrl+`',
          click: () => dispatchNativeAction({ type: 'toggle-terminal' }),
        },
        {
          label: 'Toggle Split Editor',
          accelerator: 'CmdOrCtrl+\\',
          click: () => dispatchNativeAction({ type: 'toggle-split' }),
        },
        {
          label: 'Toggle Zen / Focus Mode',
          accelerator: 'Alt+Z',
          click: () => dispatchNativeAction({ type: 'toggle-zen' }),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            currentZoom = Math.min(2.5, currentZoom + 0.1);
            mainWindow?.webContents.setZoomFactor(currentZoom);
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            currentZoom = Math.max(0.6, currentZoom - 0.1);
            mainWindow?.webContents.setZoomFactor(currentZoom);
          },
        },
        {
          label: 'Reset Zoom (100%)',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            currentZoom = 1.0;
            mainWindow?.webContents.setZoomFactor(1.0);
          },
        },
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
          click: () => dispatchNativeAction({ type: 'run-code' }),
        },
        {
          label: 'Toggle Execution Engine (Local / Cloud)',
          click: () => dispatchNativeAction({ type: 'toggle-engine' }),
        },
        { type: 'separator' },
        {
          label: 'Interactive DSA Visualizer',
          click: () => dispatchNativeAction({ type: 'open-visualizer' }),
        },
        {
          label: 'Test Suite Runner',
          click: () => dispatchNativeAction({ type: 'open-testsuite' }),
        },
        {
          label: 'SQL Database Manager',
          click: () => dispatchNativeAction({ type: 'open-database' }),
        },
      ],
    },
    {
      label: '&Terminal',
      submenu: [
        {
          label: 'New Integrated Terminal',
          accelerator: 'Ctrl+Shift+`',
          click: () => dispatchNativeAction({ type: 'toggle-terminal' }),
        },
        {
          label: 'Open Native Windows Terminal / Command Prompt',
          click: () => handleOpenNativeTerminal(),
        },
        {
          label: 'Clear Terminal Output',
          click: () => dispatchNativeAction({ type: 'clear-terminal' }),
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
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'About FullCode IDE',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About FullCode IDE',
              message: 'FullCode IDE for Windows',
              detail: 'Production Native Desktop IDE & Polyglot Compiler Workspace.\nBuilt for Windows x64.\nVersion: 1.0.0\nCreated by Himanshu Garg.',
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
 * Launch native Windows Terminal or Command Prompt in the active directory
 */
function handleOpenNativeTerminal() {
  const dir = fs.existsSync(activeWorkspaceDir) ? activeWorkspaceDir : os.homedir();
  if (process.platform === 'win32') {
    // Try wt.exe (Windows Terminal), fallback to cmd.exe
    spawn('cmd.exe', ['/c', 'start', 'wt.exe', '-d', dir], { detached: true, stdio: 'ignore' })
      .on('error', () => {
        spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${dir}"`], { detached: true, stdio: 'ignore' });
      });
  } else if (process.platform === 'darwin') {
    spawn('open', ['-a', 'Terminal', dir], { detached: true, stdio: 'ignore' });
  } else {
    spawn('x-terminal-emulator', [], { cwd: dir, detached: true, stdio: 'ignore' });
  }
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
    backgroundColor: '#18181b', // Pure dark background to eliminate any white flash
    show: false,
    autoHideMenuBar: false, // Show native desktop application menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  createMenu();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();

    // Check if launched with a file argument on Windows
    const args = process.argv.slice(1);
    const targetFile = args.find((arg) => !arg.startsWith('--') && fs.existsSync(arg) && fs.statSync(arg).isFile());
    if (targetFile) {
      loadFileIntoWorkspace(path.resolve(targetFile));
    }
  });

  // External URLs open in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Native host message IPC bridge
  ipcMain.on('native-host-message', async (_event, dict) => {
    if (!dict || typeof dict !== 'object') return;
    const msgType = dict.type || '';

    switch (msgType) {
      case 'zoom_in':
        currentZoom = Math.min(2.5, currentZoom + 0.1);
        mainWindow?.webContents.setZoomFactor(currentZoom);
        break;

      case 'zoom_out':
        currentZoom = Math.max(0.6, currentZoom - 0.1);
        mainWindow?.webContents.setZoomFactor(currentZoom);
        break;

      case 'zoom_reset':
        currentZoom = 1.0;
        mainWindow?.webContents.setZoomFactor(1.0);
        break;

      case 'open_local_folder': {
        const res = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Workspace Folder',
        });
        if (!res.canceled && res.filePaths[0]) {
          const folderPath = res.filePaths[0];
          activeWorkspaceDir = folderPath;
          const files = scanDirectoryFiles(folderPath);
          dispatchNativeAction({
            type: 'load-local-folder',
            folderName: path.basename(folderPath),
            folderPath,
            files,
          });
        }
        break;
      }

      case 'open_local_file': {
        const res = await dialog.showOpenDialog(mainWindow, {
          properties: ['openFile'],
          title: 'Select Code File to Open',
        });
        if (!res.canceled && res.filePaths[0]) {
          loadFileIntoWorkspace(res.filePaths[0]);
        }
        break;
      }

      case 'open_terminal':
        handleOpenNativeTerminal();
        break;

      case 'open_website':
        if (dict.url) shell.openExternal(dict.url);
        break;

      case 'reveal_in_finder':
      case 'reveal_in_explorer': {
        const target = dict.path || activeWorkspaceDir;
        if (target && fs.existsSync(target)) {
          shell.showItemInFolder(target);
        }
        break;
      }

      case 'save_to_path': {
        if (dict.path && typeof dict.code === 'string') {
          try {
            fs.mkdirSync(path.dirname(dict.path), { recursive: true });
            fs.writeFileSync(dict.path, dict.code, 'utf8');
            dispatchNativeAction({ type: 'toast', message: `Saved ${path.basename(dict.path)} to disk 💾` });
          } catch (err) {
            dispatchNativeAction({ type: 'toast', message: `Save error: ${err.message} ❌` });
          }
        }
        break;
      }

      case 'save_workspace': {
        if (Array.isArray(dict.files)) {
          const baseDir = dict.folderPath && fs.existsSync(dict.folderPath) ? dict.folderPath : activeWorkspaceDir;
          try {
            fs.mkdirSync(baseDir, { recursive: true });
            for (const f of dict.files) {
              if (!f.name) continue;
              const target = f.localPath || path.join(baseDir, f.name);
              fs.mkdirSync(path.dirname(target), { recursive: true });
              fs.writeFileSync(target, f.content || '', 'utf8');
            }
            dispatchNativeAction({ type: 'toast', message: `Autosaved workspace to local disk ⚡️` });
          } catch (err) {
            console.error('Save workspace failed:', err);
          }
        }
        break;
      }

      case 'status_update': {
        if (dict.filename) {
          mainWindow?.setTitle(`${dict.filename} — FullCode IDE`);
        }
        break;
      }

      default:
        break;
    }
  });

  // Handle dropped files from Windows Explorer
  ipcMain.on('files-dropped', (_event, filePaths) => {
    if (!filePaths || filePaths.length === 0) return;
    const first = filePaths[0];
    if (fs.statSync(first).isDirectory()) {
      activeWorkspaceDir = first;
      const files = scanDirectoryFiles(first);
      dispatchNativeAction({
        type: 'load-local-folder',
        folderName: path.basename(first),
        folderPath: first,
        files,
      });
    } else {
      loadFileIntoWorkspace(first);
    }
  });

  // Window control IPC
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());
  ipcMain.on('window-devtools', () => mainWindow?.webContents.toggleDevTools());

  // Load production application
  mainWindow.loadURL(APP_URL).catch((err) => {
    console.error('[Electron] Failed to load URL:', err);
    setTimeout(() => mainWindow?.loadURL(APP_URL), 1000);
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
