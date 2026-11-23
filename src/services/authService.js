import { apiFetch } from './apiClient';

const USERS_DB_KEY = 'fullcode_users_db_v1';
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

function hashPassword(pwd) {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    hash = ((hash << 5) - hash) + pwd.charCodeAt(i);
    hash |= 0;
  }
  return `pwd_${Math.abs(hash).toString(16)}_${pwd.length}`;
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
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    const users = raw ? JSON.parse(raw) : {};
    const active = getActiveUser();
    if (active && !users[active.id]) {
      users[active.id] = active;
    }
    return users;
  } catch {
    const active = getActiveUser();
    return active ? { [active.id]: active } : {};
  }
}

export function getActiveUser() {
  try {
    const cached = localStorage.getItem(PROFILE_KEY);
    if (cached) return safeProfile(JSON.parse(cached));
    return null;
  } catch {
    return null;
  }
}

/**
 * Local offline login / registration fallback
 */
function localLoginOrRegister(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername) {
    return { success: false, error: 'Please enter a username.' };
  }
  if (!cleanPassword || cleanPassword.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters.' };
  }

  const users = getAllUsers();
  const userId = `user_${cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  const pwdHash = hashPassword(cleanPassword);

  let user = users[userId];

  if (user) {
    // If account exists locally, verify password
    if (user.passwordHash && user.passwordHash !== pwdHash) {
      return { success: false, error: 'Incorrect password for this account.' };
    }
  } else {
    // Register new local account
    const colors = ['#00d4ff', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];
    user = {
      id: userId,
      username: cleanUsername,
      passwordHash: pwdHash,
      avatarInitials: generateFirstLastInitials(cleanUsername),
      avatarColor: colors[cleanUsername.length % colors.length] || '#00d4ff',
      avatarEmoji: '',
      createdAt: Date.now(),
    };
    users[userId] = user;
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    } catch {}
  }

  const cached = cacheProfile(user);
  return { success: true, user: cached, isNew: !users[userId] };
}

/**
 * Login or Register:
 * Tries server first (cloud / self-hosted backend).
 * If server is unavailable, returns 503 (no database), or network is offline,
 * seamlessly falls back to local in-browser account creation!
 */
export async function loginOrRegister(username, password, rememberMe = true) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername) {
    return { success: false, error: 'Please choose a username.' };
  }
  if (!cleanPassword || cleanPassword.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters.' };
  }

  try {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password: cleanPassword, rememberMe }),
      signal: AbortSignal.timeout(5_000),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.ok && payload.user) {
      const user = cacheProfile(payload.user);
      try {
        const users = getAllUsers();
        users[user.id] = user;
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      } catch {}
      return { success: true, user, isNew: Boolean(payload.isNew) };
    }

    // Specific client errors like invalid credentials or rate limiting
    if (response.status === 401 || response.status === 409 || response.status === 429) {
      return { success: false, error: payload.error || 'Authentication failed.' };
    }

    // Server returned 503 (database not configured on backend) or 404/500:
    // Gracefully fall back to local account storage
    return localLoginOrRegister(cleanUsername, cleanPassword);
  } catch {
    // Network offline or server unreachable:
    // Gracefully fall back to local account storage
    return localLoginOrRegister(cleanUsername, cleanPassword);
  }
}

export async function restoreAuthSession() {
  const active = getActiveUser();

  try {
    const response = await apiFetch('/api/auth/me', { signal: AbortSignal.timeout(4_000) });
    if (response.status === 401) {
      if (!active) {
        return { authenticated: false, unavailable: false };
      }
    }
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.user) {
      return { authenticated: true, user: cacheProfile(payload.user), unavailable: false };
    }
  } catch {}

  if (active) {
    return { authenticated: true, user: active, unavailable: false };
  }

  return { authenticated: false, unavailable: false };
}

export async function updateUserProfile(userId, updates = {}) {
  const active = getActiveUser();
  if (!active || active.id !== userId) return null;

  try {
    const response = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(5_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.user) {
      return cacheProfile(payload.user);
    }
  } catch {}

  const updatedUser = {
    ...active,
    ...updates,
  };
  const users = getAllUsers();
  users[userId] = updatedUser;
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch {}
  return cacheProfile(updatedUser);
}

export async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(4_000) });
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
