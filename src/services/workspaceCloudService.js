import { apiFetch, hasDedicatedApiBackend } from './apiClient';

const CLIENT_ID_KEY = 'fullcode_backend_client_id_v1';
let healthCheckPromise;
let saveTimer;
let pendingWorkspace;
let cloudStatus = { configured: hasDedicatedApiBackend(), connected: false, message: 'Not connected' };

function getClientId() {
  try {
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(CLIENT_ID_KEY, clientId);
    }
    return clientId;
  } catch {
    return globalThis.crypto?.randomUUID?.() || 'temporary-browser-workspace';
  }
}

function ownerHeaders() {
  return { 'X-FullCode-Client-ID': getClientId() };
}

async function ensureCloudDatabase() {
  if (!hasDedicatedApiBackend() && !import.meta.env.DEV) {
    cloudStatus = { configured: false, connected: false, message: 'Set VITE_API_BASE_URL to the separate backend URL.' };
    return false;
  }
  if (!healthCheckPromise) {
    healthCheckPromise = apiFetch('/api/health', { signal: AbortSignal.timeout(10_000) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        const connected = response.ok && data?.workspaceDatabase?.connected === true;
        cloudStatus = {
          configured: hasDedicatedApiBackend() || Boolean(import.meta.env.DEV),
          connected,
          message: connected ? 'Connected to PostgreSQL workspace storage.' : (data?.workspaceDatabase?.configured
            ? 'Backend is reachable, but its workspace database is unavailable.'
            : 'Add DATABASE_URL to the backend to enable cloud workspace storage.'),
        };
        return connected;
      })
      .catch((error) => {
        cloudStatus = { configured: hasDedicatedApiBackend(), connected: false, message: error.message || 'Backend is unavailable.' };
        return false;
      })
      .finally(() => {
        // A failed check must not permanently disable cloud sync for this tab.
        if (!cloudStatus.connected) healthCheckPromise = null;
      });
  }
  return healthCheckPromise;
}

export function getWorkspaceCloudStatus() {
  return { ...cloudStatus };
}

export async function loadCloudWorkspace(workspaceId = 'ws_default') {
  if (!(await ensureCloudDatabase())) return null;
  try {
    const response = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
      headers: ownerHeaders(),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 404) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Backend request failed (${response.status}).`);
    return payload.workspace || null;
  } catch (error) {
    cloudStatus = { ...cloudStatus, connected: false, message: error.message || 'Could not load the cloud workspace.' };
    return null;
  }
}

async function savePendingWorkspace() {
  const snapshot = pendingWorkspace;
  if (!snapshot || !(await ensureCloudDatabase())) return;
  pendingWorkspace = null;
  try {
    const response = await apiFetch(`/api/workspaces/${encodeURIComponent(snapshot.workspaceId)}`, {
      method: 'PUT',
      headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot.data),
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Workspace save failed (${response.status}).`);
    cloudStatus = { configured: true, connected: true, message: 'Workspace backed up to PostgreSQL.' };
  } catch (error) {
    cloudStatus = { ...cloudStatus, connected: false, message: error.message || 'Cloud workspace save failed.' };
    console.warn('[Workspace Sync] Cloud backup failed; local browser data remains available.', error);
  }
  if (pendingWorkspace && !saveTimer) {
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void savePendingWorkspace();
    }, 750);
  }
}

export function scheduleCloudWorkspaceSave(workspaceId, data) {
  if (data?.incognito || !Array.isArray(data?.files) || data.files.length === 0) return;
  if (!hasDedicatedApiBackend() && !import.meta.env.DEV) return;
  pendingWorkspace = { workspaceId: workspaceId || 'ws_default', data };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void savePendingWorkspace();
  }, 1_500);
}
