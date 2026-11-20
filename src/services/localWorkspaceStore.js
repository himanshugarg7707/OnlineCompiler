const DB_NAME = 'fullcode_workspace_data_v1';
const STORE_NAME = 'workspaces';
const INLINE_STORAGE_LIMIT = 1024 * 1024;

function openWorkspaceDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('This browser does not support IndexedDB.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local workspace storage.'));
  });
}

export function saveLocalWorkspaceSnapshot(workspaceId, snapshot) {
  return openWorkspaceDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ ...snapshot, id: String(workspaceId || 'ws_default'), savedAt: Date.now() });
    transaction.oncomplete = () => { db.close(); resolve(true); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Could not save local workspace.')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Workspace save was interrupted.')); };
  }));
}

export function loadLocalWorkspaceSnapshot(workspaceId) {
  return openWorkspaceDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(String(workspaceId || 'ws_default'));
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error || new Error('Could not load local workspace.')); };
  }));
}

export function estimateWorkspaceBytes(files = []) {
  return files.reduce((total, file) => total + (String(file?.content || '').length * 2), 0);
}

export function shouldUseIndexedDb(files = []) {
  return estimateWorkspaceBytes(files) > INLINE_STORAGE_LIMIT;
}

export function isIndexedWorkspaceManifest(value) {
  return Boolean(value && typeof value === 'object' && value.storage === 'indexeddb' && value.version === 1);
}
