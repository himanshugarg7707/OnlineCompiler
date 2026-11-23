import { apiFetch, hasDedicatedApiBackend } from './apiClient';
import { getActiveUser } from './authService';

let healthCheckPromise;
let saveTimer;
let pendingWorkspace;
let cloudStatus = { configured: hasDedicatedApiBackend(), connected: false, message: 'Not connected' };

function setCloudStatus(next) {
  const changedMessage = next.message && next.message !== cloudStatus.message;
  cloudStatus = next;
  if (changedMessage && !next.connected && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fullcode-workspace-sync-error', { detail: { message: next.message } }));
  }
}

async function ensureCloudDatabase() {
  if (!hasDedicatedApiBackend() && !import.meta.env.DEV) {
    setCloudStatus({ configured: false, connected: false, message: 'Set VITE_API_BASE_URL to the separate backend URL.' });
    return false;
  }
  if (!healthCheckPromise) {
    healthCheckPromise = apiFetch('/api/health', { signal: AbortSignal.timeout(10_000) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        const connected = response.ok && data?.workspaceDatabase?.connected === true;
        setCloudStatus({
          configured: hasDedicatedApiBackend() || Boolean(import.meta.env.DEV),
          connected,
          message: connected ? 'Connected to PostgreSQL workspace storage.' : (data?.workspaceDatabase?.configured
            ? 'Backend is reachable, but its workspace database is unavailable.'
            : 'Add DATABASE_URL to the backend to enable cloud workspace storage.'),
        });
        return connected;
      })
      .catch((_error) => {
        setCloudStatus({ configured: hasDedicatedApiBackend(), connected: false, message: 'Backend is unavailable. Your local workspace remains available.' });
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
  if (!getActiveUser()) return null;
  if (!(await ensureCloudDatabase())) return null;
  try {
    const response = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 404) return null;
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setCloudStatus({ ...cloudStatus, connected: false, message: 'Sign in again to sync cloud workspaces. Local files remain available.' });
      return null;
    }
    if (!response.ok) throw new Error(payload.error || `Backend request failed (${response.status}).`);
    return payload.workspace || null;
  } catch (error) {
    setCloudStatus({ ...cloudStatus, connected: false, message: error.message || 'Could not load the cloud workspace. Local files remain available.' });
    return null;
  }
}

async function savePendingWorkspace() {
  const snapshot = pendingWorkspace;
  if (!snapshot || !getActiveUser() || !(await ensureCloudDatabase())) return;
  pendingWorkspace = null;
  try {
    const response = await apiFetch(`/api/workspaces/${encodeURIComponent(snapshot.workspaceId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot.data),
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Sign in again to sync cloud workspaces. Your local files are safe.');
    if (!response.ok) throw new Error(payload.error || `Workspace save failed (${response.status}).`);
    setCloudStatus({ configured: true, connected: true, message: 'Workspace backed up to PostgreSQL.' });
  } catch (error) {
    setCloudStatus({ ...cloudStatus, connected: false, message: error.message || 'Cloud workspace save failed. Local files remain available.' });
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
  if (data?.incognito || !getActiveUser() || !Array.isArray(data?.files) || data.files.length === 0) return;
  if (!hasDedicatedApiBackend() && !import.meta.env.DEV) return;
  pendingWorkspace = { workspaceId: workspaceId || 'ws_default', data };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void savePendingWorkspace();
  }, 1_500);
}
