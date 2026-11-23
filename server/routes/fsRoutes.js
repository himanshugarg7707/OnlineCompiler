import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

// Ignored directories for speed and safety
const IGNORED_NAMES = new Set([
  '.git',
  'node_modules',
  '.DS_Store',
  '.idea',
  '.vscode',
  'dist',
  'build',
  '__pycache__',
  '.vercel',
  '.gemini',
]);

const ALLOWED_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cc', 'h', 'hpp',
  'go', 'rs', 'swift', 'sql', 'html', 'css', 'json', 'md', 'txt', 'sh',
  'zsh', 'yaml', 'yml', 'xml', 'csv', 'ipynb', 'toml', 'env'
]);

const CONFIG_FILE = path.join(os.homedir(), '.fullcode', 'workspace-config.json');

export function getActiveWorkspaceDir() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (data.activeFolderPath && fs.existsSync(data.activeFolderPath)) {
        return data.activeFolderPath;
      }
    }
  } catch (_) {}
  const defaultDir = path.join(os.homedir(), 'Documents', 'FullCodeWorkspace');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
    const mainPy = path.join(defaultDir, 'main.py');
    if (!fs.existsSync(mainPy)) {
      fs.writeFileSync(mainPy, `# Start writing your code here\nprint("Hello from FullCode on Local Storage!")\n`, 'utf8');
    }
  }
  return defaultDir;
}

export function setActiveWorkspaceDir(dirPath) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ activeFolderPath: dirPath, updatedAt: new Date().toISOString() }), 'utf8');
  } catch (_) {}
}

function scanWorkspaceDirectory(folderPath, maxFiles = 500) {
  const scannedFiles = [];
  const detectedFolders = new Set();

  function walk(currentDir, relPrefix = '') {
    if (scannedFiles.length >= maxFiles) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const ent of entries) {
      if (scannedFiles.length >= maxFiles) break;
      if (IGNORED_NAMES.has(ent.name) || ent.name.startsWith('.')) continue;

      const fullPath = path.join(currentDir, ent.name);
      const relPath = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;

      if (ent.isDirectory()) {
        detectedFolders.add(relPath);
        walk(fullPath, relPath);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).slice(1).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext) || ext === '') {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size <= 5 * 1024 * 1024) {
              const content = fs.readFileSync(fullPath, 'utf8');
              scannedFiles.push({
                name: relPath,
                content,
                localPath: fullPath,
                size: stat.size,
                mtime: stat.mtimeMs,
              });
            }
          } catch (_) {}
        }
      }
    }
  }

  if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
    walk(folderPath);
  }
  return { files: scannedFiles, folders: Array.from(detectedFolders) };
}

/**
 * GET /api/fs/mac-locations
 * Returns default macOS sections (Home, Desktop, Documents, Downloads, Workspace)
 */
router.get('/mac-locations', (req, res) => {
  const home = os.homedir();
  const cwd = process.cwd();

  const locations = [
    {
      id: 'documents',
      name: 'Documents',
      path: path.join(home, 'Documents'),
      icon: 'Folder',
      isDefaultMacSection: true,
    },
    {
      id: 'desktop',
      name: 'Desktop',
      path: path.join(home, 'Desktop'),
      icon: 'Monitor',
      isDefaultMacSection: true,
    },
    {
      id: 'downloads',
      name: 'Downloads',
      path: path.join(home, 'Downloads'),
      icon: 'Download',
      isDefaultMacSection: true,
    },
    {
      id: 'home',
      name: 'Home',
      path: home,
      icon: 'Home',
      isDefaultMacSection: true,
    },
    {
      id: 'workspace',
      name: 'Current Workspace',
      path: cwd,
      icon: 'Code2',
      isDefaultMacSection: true,
    },
  ];

  // Filter to locations that actually exist
  const existing = locations.filter((loc) => {
    try {
      return fs.existsSync(loc.path) && fs.statSync(loc.path).isDirectory();
    } catch {
      return false;
    }
  });

  res.json({
    success: true,
    homeDir: home,
    platform: process.platform,
    locations: existing,
  });
});

/**
 * GET /api/fs/list?path=...
 * Lists files and directories in a given local path
 */
router.get('/list', (req, res) => {
  const targetPath = req.query.path ? String(req.query.path) : os.homedir();

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, error: 'Directory not found' });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Target is not a directory' });
    }

    const dirents = fs.readdirSync(targetPath, { withFileTypes: true });
    const items = [];

    for (const d of dirents) {
      if (IGNORED_NAMES.has(d.name) || d.name.startsWith('.')) continue;

      const fullPath = path.join(targetPath, d.name);
      try {
        if (d.isDirectory()) {
          items.push({
            name: d.name,
            path: fullPath,
            isDirectory: true,
          });
        } else if (d.isFile()) {
          const ext = path.extname(d.name).slice(1).toLowerCase();
          const fstat = fs.statSync(fullPath);
          // Only show files under 5MB
          if (fstat.size < 5 * 1024 * 1024) {
            items.push({
              name: d.name,
              path: fullPath,
              isDirectory: false,
              size: fstat.size,
              ext,
              isCode: ALLOWED_EXTENSIONS.has(ext),
            });
          }
        }
      } catch {
        // Skip unreadable item
      }
    }

    // Sort folders first A-Z, then files A-Z
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json({
      success: true,
      currentPath: targetPath,
      parentPath: path.dirname(targetPath),
      items: items.slice(0, 300), // Cap at 300 items per directory
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/read-file
 * Reads file content from local disk
 */
router.post('/read-file', (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'Path is required' });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return res.status(400).json({ success: false, error: 'Target is not a regular file' });
    }

    if (stat.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File too large (> 5MB)' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath);

    res.json({
      success: true,
      name,
      path: filePath,
      content,
      size: stat.size,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/open-folder
 * Scans a folder recursively and returns files array for LOAD_WORKSPACE_STATE
 */
router.post('/open-folder', (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ success: false, error: 'Path is required' });
  }

  try {
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    const scannedFiles = [];
    const maxFiles = 250;

    function walkDir(dir, relPrefix = '') {
      if (scannedFiles.length >= maxFiles) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (scannedFiles.length >= maxFiles) break;
        if (IGNORED_NAMES.has(ent.name) || ent.name.startsWith('.')) continue;

        const full = path.join(dir, ent.name);
        const rel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;

        if (ent.isDirectory()) {
          walkDir(full, rel);
        } else if (ent.isFile()) {
          const ext = path.extname(ent.name).slice(1).toLowerCase();
          if (ALLOWED_EXTENSIONS.has(ext) || ext === '') {
            try {
              const stat = fs.statSync(full);
              if (stat.size < 2 * 1024 * 1024) {
                const content = fs.readFileSync(full, 'utf8');
                scannedFiles.append ? null : scannedFiles.push({
                  name: rel,
                  content,
                  localPath: full,
                });
              }
            } catch {}
          }
        }
      }
    }

    walkDir(folderPath);

    res.json({
      success: true,
      folderName: path.basename(folderPath),
      folderPath,
      files: scannedFiles,
      count: scannedFiles.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/fs/workspace
 * Loads active local computer workspace directly from local disk storage
 */
router.get('/workspace', (req, res) => {
  const requestedPath = req.query.path ? String(req.query.path) : null;
  const folderPath = requestedPath && fs.existsSync(requestedPath) ? requestedPath : getActiveWorkspaceDir();

  try {
    const { files, folders } = scanWorkspaceDirectory(folderPath);
    res.json({
      success: true,
      folderPath,
      folderName: path.basename(folderPath),
      files,
      folders,
      count: files.length,
      storageType: 'local_disk',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/save-file
 * Auto-saves a single file directly to local computer disk
 */
router.post('/save-file', (req, res) => {
  const { path: filePath, name, content = '', folderPath } = req.body;
  const targetDir = folderPath && fs.existsSync(folderPath) ? folderPath : getActiveWorkspaceDir();
  const resolvedPath = filePath || (name ? path.join(targetDir, name) : null);

  if (!resolvedPath) {
    return res.status(400).json({ success: false, error: 'Path or file name is required' });
  }

  try {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolvedPath, content, 'utf8');
    res.json({
      success: true,
      path: resolvedPath,
      name: path.basename(resolvedPath),
      size: Buffer.byteLength(content, 'utf8'),
      savedAt: new Date().toISOString(),
      storageType: 'local_disk',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/save-workspace
 * Live auto-saves all files from the workspace directly to local computer disk
 */
router.post('/save-workspace', (req, res) => {
  const { folderPath, files } = req.body;
  if (!Array.isArray(files)) {
    return res.status(400).json({ success: false, error: 'files array is required' });
  }

  const baseDir = folderPath && fs.existsSync(folderPath) ? folderPath : getActiveWorkspaceDir();
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  let savedCount = 0;
  for (const f of files) {
    if (!f || !f.name) continue;
    const targetPath = f.localPath && path.isAbsolute(f.localPath)
      ? f.localPath
      : path.join(baseDir, f.name);

    try {
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(targetPath, f.content ?? '', 'utf8');
      savedCount++;
    } catch (_) {}
  }

  res.json({
    success: true,
    savedCount,
    folderPath: baseDir,
    savedAt: new Date().toISOString(),
    storageType: 'local_disk',
  });
});

/**
 * POST /api/fs/create-file
 * Creates a new file on local disk
 */
router.post('/create-file', (req, res) => {
  const { name, content = '', folderPath } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'File name is required' });

  const baseDir = folderPath && fs.existsSync(folderPath) ? folderPath : getActiveWorkspaceDir();
  const targetPath = path.join(baseDir, name);

  try {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, content, 'utf8');
    }
    res.json({ success: true, path: targetPath, name, storageType: 'local_disk' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/create-folder
 * Creates a new folder on local disk
 */
router.post('/create-folder', (req, res) => {
  const { path: folderPath, name, parentPath } = req.body;
  const targetPath = folderPath || (parentPath ? path.join(parentPath, name) : (name ? path.join(getActiveWorkspaceDir(), name) : null));

  if (!targetPath) return res.status(400).json({ success: false, error: 'Path is required' });

  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    res.json({ success: true, path: targetPath, storageType: 'local_disk' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/delete-file
 * Deletes a file or directory from local disk
 */
router.post('/delete-file', (req, res) => {
  const { path: filePath, name, folderPath } = req.body;
  const targetPath = filePath || (folderPath && name ? path.join(folderPath, name) : (name ? path.join(getActiveWorkspaceDir(), name) : null));

  if (!targetPath) return res.status(400).json({ success: false, error: 'Path is required' });

  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
    }
    res.json({ success: true, path: targetPath, storageType: 'local_disk' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/rename-file
 * Renames a file on local disk
 */
router.post('/rename-file', (req, res) => {
  const { oldPath, newPath, oldName, newName, folderPath } = req.body;
  const baseDir = folderPath || getActiveWorkspaceDir();
  const src = oldPath || (oldName ? path.join(baseDir, oldName) : null);
  const dest = newPath || (newName ? path.join(baseDir, newName) : null);

  if (!src || !dest) return res.status(400).json({ success: false, error: 'Source and destination paths required' });

  try {
    if (fs.existsSync(src)) {
      const parentDir = path.dirname(dest);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.renameSync(src, dest);
    }
    res.json({ success: true, oldPath: src, newPath: dest, storageType: 'local_disk' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/fs/set-workspace-folder
 * Sets active workspace folder for local disk storage
 */
router.post('/set-workspace-folder', (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.status(400).json({ success: false, error: 'Valid folder path is required' });
  }
  setActiveWorkspaceDir(folderPath);
  res.json({ success: true, folderPath, folderName: path.basename(folderPath), storageType: 'local_disk' });
});

export default router;

