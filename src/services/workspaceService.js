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

export function saveNamedWorkspace(name, files = [], folders = [], activeFileId = null, stdin = '', language = null) {
  const cleanName = (name || '').trim() || `Workspace ${new Date().toLocaleDateString()}`;
  const list = getSavedWorkspaces();

  // Check if workspace with same name already exists
  const existingIdx = list.findIndex((w) => w.name.toLowerCase() === cleanName.toLowerCase());

  const workspaceData = {
    id: existingIdx >= 0 ? list[existingIdx].id : `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      content: f.content,
      language: f.language,
    })),
    folders: folders || [],
    activeFileId: activeFileId || files[0]?.id || null,
    stdin: stdin || '',
    language: language?.name || files[0]?.language?.name || 'Code',
    fileCount: files.length,
    updatedAt: Date.now(),
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : Date.now(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = workspaceData;
  } else {
    list.unshift(workspaceData);
  }

  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to persist workspace:', err);
  }

  return workspaceData;
}

export function deleteSavedWorkspace(id) {
  const list = getSavedWorkspaces().filter((w) => w.id !== id);
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to update workspaces list:', err);
  }
  return list;
}

export function renameSavedWorkspace(id, newName) {
  const list = getSavedWorkspaces().map((w) => {
    if (w.id === id) {
      return { ...w, name: newName.trim() || w.name, updatedAt: Date.now() };
    }
    return w;
  });
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to update workspace name:', err);
  }
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
