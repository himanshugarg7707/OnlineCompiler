// Authentication & User Profile Management with Isolated Workspace Storage

const USERS_DB_KEY = 'fullcode_users_db_v1';
const ACTIVE_USER_KEY = 'fullcode_active_user_id_v1';

/**
 * Generate Avatar Initials from the first and last letter of the username
 * (e.g. "Himanshu" -> "HU", "John" -> "JN", "A" -> "A")
 */
export function generateFirstLastInitials(username = '') {
  const clean = username.trim();
  if (!clean) return 'FC';
  if (clean.length === 1) return clean.toUpperCase();
  const first = clean[0].toUpperCase();
  const last = clean[clean.length - 1].toUpperCase();
  return `${first}${last}`;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #00d4ff, #8b5cf6)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #8b5cf6, #3b82f6)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
];

function getRandomAvatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash + str.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

function hashPassword(pwd) {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    hash = ((hash << 5) - hash) + pwd.charCodeAt(i);
    hash |= 0;
  }
  return `pwd_${Math.abs(hash).toString(16)}_${pwd.length}`;
}

/**
 * Get all registered users
 */
export function getAllUsers() {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to load users:', e);
    return {};
  }
}

/**
 * Get currently active user object or null (Guest)
 */
export function getActiveUser() {
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_KEY);
    if (!activeId) return null;
    const users = getAllUsers();
    return users[activeId] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Single-action Login or Sign Up
 */
export function loginOrRegister(username, password) {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

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
    // Existing user -> check password
    if (user.passwordHash !== pwdHash) {
      return { success: false, error: 'Incorrect password for this account.' };
    }
  } else {
    // New user -> register
    user = {
      id: userId,
      username: cleanUsername,
      passwordHash: pwdHash,
      avatarInitials: generateFirstLastInitials(cleanUsername),
      avatarColor: getRandomAvatarColor(cleanUsername),
      avatarEmoji: '',
      createdAt: Date.now(),
    };
    users[userId] = user;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  }

  // Set active user
  localStorage.setItem(ACTIVE_USER_KEY, userId);
  return { success: true, user, isNew: !users[userId] };
}

/**
 * Update active user's profile
 */
export function updateUserProfile(userId, updates = {}) {
  const users = getAllUsers();
  if (!users[userId]) return null;

  users[userId] = {
    ...users[userId],
    ...updates,
  };

  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  return users[userId];
}

/**
 * Logout active user
 */
export function logoutUser() {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

/**
 * Workspace isolation storage helpers for user
 */
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
    const key = getUserWorkspaceKey(userId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
