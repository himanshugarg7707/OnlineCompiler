/**
 * Local Disk Workspace Service
 * Manages 100% persistent, live auto-saved file storage directly on the local PC disk.
 *
 * Ensures that whenever FullCode runs locally (via Mac app or localhost browser):
 * 1. Files and workspace contents are NEVER stored in browser localStorage or IndexedDB.
 * 2. Browser localStorage is strictly reserved for user login/auth details and basic UI settings.
 * 3. Every keystroke and file modification is live auto-saved directly to the local computer's filesystem.
 */

import { isLocalEnvironment } from './judge0Service';

const ACTIVE_LOCAL_FOLDER_KEY = 'fullcode_active_local_folder_v1';

let activeLocalFolderPath = null;
try {
  if (typeof localStorage !== 'undefined') {
    activeLocalFolderPath = localStorage.getItem(ACTIVE_LOCAL_FOLDER_KEY) || null;
  }
} catch (_) {}

/**
 * Check if the active session is running on local machine and should use local disk storage
 */
export function isLocalDiskStorageActive() {
  return isLocalEnvironment();
}

/**
 * Get the currently remembered local workspace folder path
 */
export function getActiveLocalFolderPath() {
  return activeLocalFolderPath;
}

/**
 * Set the currently active local workspace folder path
 */
export function setActiveLocalFolderPath(folderPath) {
  activeLocalFolderPath = folderPath || null;
  try {
    if (typeof localStorage !== 'undefined') {
      if (folderPath) {
        localStorage.setItem(ACTIVE_LOCAL_FOLDER_KEY, folderPath);
      } else {
        localStorage.removeItem(ACTIVE_LOCAL_FOLDER_KEY);
      }
    }
  } catch (_) {}
}

/**
 * Fetch the active workspace directly from the local computer filesystem
 */
export async function fetchLocalDiskWorkspace(customPath = null) {
  if (!isLocalEnvironment()) return null;

  try {
    const queryPath = customPath || activeLocalFolderPath;
    const url = queryPath ? `/api/fs/workspace?path=${encodeURIComponent(queryPath)}` : '/api/fs/workspace';
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;

    const data = await resp.json();
    if (data.success && Array.isArray(data.files)) {
      if (data.folderPath) {
        setActiveLocalFolderPath(data.folderPath);
      }
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch workspace from local computer disk:', err);
  }
  return null;
}

let saveDebounceTimer = null;

/**
 * Live auto-save all workspace files directly to the local PC filesystem
 */
export function autoSaveWorkspaceToLocalDisk(files, folders = [], activeFileId = null, folderPath = null) {
  if (!isLocalEnvironment() || !Array.isArray(files) || files.length === 0) return;

  const targetFolder = folderPath || activeLocalFolderPath;

  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      // 1. Send to local backend server
      const payload = {
        folderPath: targetFolder,
        files: files.map((f) => ({
          name: f.name,
          content: f.content || '',
          localPath: f.localPath || undefined,
        })),
        folders: folders || [],
        activeFileId: activeFileId || undefined,
      };

      await fetch('/api/fs/save-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 2. Also notify native macOS host if running inside FullCode native app
      if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.nativeHost) {
        window.webkit.messageHandlers.nativeHost.postMessage({
          type: 'save_workspace',
          folderPath: targetFolder || '',
          files: files.map((f) => ({
            name: f.name,
            content: f.content || '',
            localPath: f.localPath || '',
          })),
        });
      }
    } catch (err) {
      console.warn('Live disk autosave failed:', err);
    }
  }, 250);
}

/**
 * Auto-save a single file immediately to local disk
 */
export async function autoSaveSingleFileToLocalDisk(file, folderPath = null) {
  if (!isLocalEnvironment() || !file || !file.name) return;

  const targetFolder = folderPath || activeLocalFolderPath;
  const payload = {
    name: file.name,
    content: file.content || '',
    path: file.localPath || undefined,
    folderPath: targetFolder,
  };

  try {
    await fetch('/api/fs/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (file.localPath && typeof window !== 'undefined' && window.webkit?.messageHandlers?.nativeHost) {
      window.webkit.messageHandlers.nativeHost.postMessage({
        type: 'save_to_path',
        path: file.localPath,
        code: file.content || '',
      });
    }
  } catch (err) {
    console.warn('Single file autosave failed:', err);
  }
}

/**
 * Create a new file on local computer disk
 */
export async function createFileOnLocalDisk(name, content = '', folderPath = null) {
  if (!isLocalEnvironment() || !name) return null;
  const targetFolder = folderPath || activeLocalFolderPath;
  try {
    const res = await fetch('/api/fs/create-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, folderPath: targetFolder }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to create file on disk:', err);
  }
  return null;
}

/**
 * Delete a file from local computer disk
 */
export async function deleteFileFromLocalDisk(fileOrPath, folderPath = null) {
  if (!isLocalEnvironment() || !fileOrPath) return null;
  const targetFolder = folderPath || activeLocalFolderPath;
  const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.localPath;
  const fileName = typeof fileOrPath === 'object' ? fileOrPath.name : null;

  try {
    const res = await fetch('/api/fs/delete-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, name: fileName, folderPath: targetFolder }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to delete file from disk:', err);
  }
  return null;
}

/**
 * Rename a file on local computer disk
 */
export async function renameFileOnLocalDisk(oldFileOrName, newName, folderPath = null) {
  if (!isLocalEnvironment() || !oldFileOrName || !newName) return null;
  const targetFolder = folderPath || activeLocalFolderPath;
  const oldPath = typeof oldFileOrName === 'string' ? null : oldFileOrName.localPath;
  const oldName = typeof oldFileOrName === 'string' ? oldFileOrName : oldFileOrName.name;

  try {
    const res = await fetch('/api/fs/rename-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, oldName, newName, folderPath: targetFolder }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to rename file on disk:', err);
  }
  return null;
}
