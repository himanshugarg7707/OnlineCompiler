// Named Workspaces Storage & Management Service
const WORKSPACES_STORAGE_KEY = 'fullcode_saved_workspaces_v1';

export function getSavedWorkspaces() {
  try {
    const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to load saved workspaces:', err);
    return [];
  }
}

export const CURRENT_WORKSPACE_STORAGE_KEY = 'fullcode_active_workspace_meta_v1';

export function getCurrentWorkspaceMeta() {
  try {
    const raw = localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentWorkspaceMeta(meta) {
  try {
    if (!meta) {
      localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
    } else {
      localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, JSON.stringify(meta));
    }
  } catch (err) {
    console.warn('Failed to set current workspace meta:', err);
  }
}

// Helper to safely serialize workspaces to localStorage with quota-exceeded fallback
function persistWorkspacesList(list) {
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.warn('[Workspace] LocalStorage write failed, attempting quota recovery by pruning heavy plot images:', err);
    try {
      // Recovery attempt 1: Strip large base64 plot strings from notebook cells in other workspaces
      const prunedList = list.map((ws, wsIdx) => {
        if (wsIdx === 0) return ws; // prioritize active/newest workspace
        return pruneWorkspaceNotebookPlots(ws);
      });
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(prunedList));
      return true;
    } catch {
      try {
        // Recovery attempt 2: Strip base64 plots across all saved notebooks
        const allPruned = list.map((ws) => pruneWorkspaceNotebookPlots(ws));
        localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(allPruned));
        return true;
      } catch (finalErr) {
        console.error('Critical: Failed to persist workspaces list to localStorage:', finalErr);
        return false;
      }
    }
  }
}

// Strips heavy base64 data URIs from notebook cells so code & text cells are never lost
function pruneWorkspaceNotebookPlots(ws) {
  if (!ws || !Array.isArray(ws.files)) return ws;
  return {
    ...ws,
    files: ws.files.map((file) => {
      if (!file.name?.endsWith('.ipynb') || !file.content) return file;
      try {
        const nb = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
        if (!nb || !Array.isArray(nb.cells)) return file;
        let modified = false;
        const cleanedCells = nb.cells.map((cell) => {
          if (Array.isArray(cell.plots) && cell.plots.length > 0) {
            modified = true;
            return { ...cell, plots: [] };
          }
          return cell;
        });
        if (modified) {
          return {
            ...file,
            content: JSON.stringify({ ...nb, cells: cleanedCells }, null, 2),
          };
        }
      } catch {}
      return file;
    }),
  };
}

export function saveNamedWorkspace(name, files = [], folders = [], activeFileId = null, stdin = '', language = null, targetId = null, subjectId = null) {
  const cleanName = (name || '').trim() || `Workspace ${new Date().toLocaleDateString()}`;
  const list = getSavedWorkspaces();

  // Check if workspace with same id or subject exists first to avoid accidental collision with generic names
  let existingIdx = -1;
  if (targetId) {
    existingIdx = list.findIndex((w) => w.id === targetId);
  }
  if (existingIdx === -1 && subjectId) {
    existingIdx = list.findIndex((w) => w.subjectId === subjectId);
  }
  if (existingIdx === -1 && !targetId && !subjectId) {
    existingIdx = list.findIndex((w) => w.name.toLowerCase() === cleanName.toLowerCase());
  }

  const existingWs = existingIdx >= 0 ? list[existingIdx] : null;

  const workspaceData = {
    id: existingWs ? existingWs.id : (targetId || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    subjectId: subjectId || existingWs?.subjectId || null,
    name: cleanName,
    files: (files || []).map((f) => ({
      id: f.id,
      name: f.name,
      content: f.content,
      language: f.language,
    })),
    folders: folders || [],
    activeFileId: activeFileId || files[0]?.id || null,
    stdin: stdin || '',
    language: language?.name || files[0]?.language?.name || 'Code',
    fileCount: (files || []).length,
    updatedAt: Date.now(),
    createdAt: existingWs ? existingWs.createdAt : Date.now(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = workspaceData;
  } else {
    list.unshift(workspaceData);
  }

  persistWorkspacesList(list);

  return workspaceData;
}

export function saveActiveWorkspace(workspaceId, workspaceName, files = [], folders = [], activeFileId = null, stdin = '', language = null, subjectId = null) {
  if (!files || files.length === 0) return null;
  return saveNamedWorkspace(workspaceName, files, folders, activeFileId, stdin, language, workspaceId, subjectId);
}

export function deleteSavedWorkspace(id) {
  const list = getSavedWorkspaces().filter((w) => w.id !== id);
  persistWorkspacesList(list);
  return list;
}

export function renameSavedWorkspace(id, newName) {
  const list = getSavedWorkspaces().map((w) => {
    if (w.id === id) {
      return { ...w, name: newName.trim() || w.name, updatedAt: Date.now() };
    }
    return w;
  });
  persistWorkspacesList(list);
  return list;
}

export function exportWorkspaceAsJson(workspace) {
  if (!workspace) return;
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workspace, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${workspace.name.replace(/\s+/g, '_')}_workspace.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
