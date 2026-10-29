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

export default router;
