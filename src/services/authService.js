import { apiFetch, hasDedicatedApiBackend } from './apiClient';

const PROFILE_KEY = 'fullcode_active_account_profile_v2';
const LEGACY_ACTIVE_KEY = 'fullcode_active_user_id_v1';

export function generateFirstLastInitials(username = '') {
  const clean = username.trim();
  if (!clean) return 'FC';
  if (clean.length === 1) return clean.toUpperCase();
  return `${clean[0]}${clean.at(-1)}`.toUpperCase();
}

function safeProfile(user) {
  if (!user || typeof user.id !== 'string' || typeof user.username !== 'string') return null;
  return {
    id: user.id,
    username: user.username,
    avatarInitials: String(user.avatarInitials || generateFirstLastInitials(user.username)).slice(0, 3),
    avatarColor: /^#[0-9a-f]{6}$/i.test(user.avatarColor || '') ? user.avatarColor : '#00d4ff',
    avatarEmoji: '',
    createdAt: Number(user.createdAt) || Date.now(),
  };
}

function cacheProfile(user) {
  const profile = safeProfile(user);
  if (!profile) return null;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(LEGACY_ACTIVE_KEY, profile.id);
  } catch {}
  return profile;
}

function clearCachedProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_KEY);
  } catch {}
}

export function getAllUsers() {
  const active = getActiveUser();
  return active ? { [active.id]: active } : {};
}

export function getActiveUser() {
  try {
    const cached = localStorage.getItem(PROFILE_KEY);
    if (cached) return safeProfile(JSON.parse(cached));
    // Display-only migration for legacy profiles; server session validation still gates cloud access.
    return null;
  } catch {
    return null;
  }
}

async function authRequest(path, body) {
  if (!hasDedicatedApiBackend() && !import.meta.env.DEV) {
    throw new Error('Account sign-in needs the backend URL configured. Guest workspaces still work locally.');
  }
  let response;
  try {
    response = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error('Could not reach the account server. Your local workspace is still available.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Account request failed (${response.status}).`);
  return payload;
}

export async function loginOrRegister(username, password, rememberMe = true) {
  try {
    const payload = await authRequest('/api/auth/login', { username, password, rememberMe });
    const user = cacheProfile(payload.user);
    return { success: true, user, isNew: Boolean(payload.isNew) };
  } catch (error) {
    return { success: false, error: error.message || 'Authentication failed.' };
  }
}

export async function restoreAuthSession() {
  if (!hasDedicatedApiBackend() && !import.meta.env.DEV) return { authenticated: false, unavailable: true };
  try {
    const response = await apiFetch('/api/auth/me', { signal: AbortSignal.timeout(12_000) });
    if (response.status === 401) {
      return { authenticated: false, unavailable: false };
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { authenticated: false, unavailable: true };
    return { authenticated: true, user: cacheProfile(payload.user), unavailable: false };
  } catch {
    return { authenticated: false, unavailable: true };
  }
}

export async function updateUserProfile(userId, updates = {}) {
  const active = getActiveUser();
  if (!active || active.id !== userId) return null;
  try {
    const response = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not save profile changes.');
    return cacheProfile(payload.user);
  } catch (error) {
    console.warn('[Auth] Profile update failed:', error.message);
    return null;
  }
}

export async function logoutUser() {
  try {
    if (hasDedicatedApiBackend() || import.meta.env.DEV) {
      await apiFetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(8_000) });
    }
  } catch {}
  clearCachedProfile();
}

export function getUserWorkspaceKey(userId) {
  return userId ? `fullcode_workspace_${userId}` : 'fullcode_workspace_guest';
}

export function saveUserWorkspace(userId, workspaceData) {
  try {
    const key = getUserWorkspaceKey(userId);
    localStorage.setItem(key, JSON.stringify(workspaceData));
  } catch (e) {
    console.warn('Failed saving user workspace:', e);
  }
}

export function loadUserWorkspace(userId) {
  try {
    const raw = localStorage.getItem(getUserWorkspaceKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
