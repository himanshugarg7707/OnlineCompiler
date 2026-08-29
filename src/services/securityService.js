// File & Folder Password Security Service

const SECURITY_STORAGE_KEY = 'fullcode_protected_items_v1';

// Session-level unlocked items set (in-memory, resets on full page refresh)
const sessionUnlockedItems = new Set();

/**
 * Fast synchronous hash generator for password verification
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}_${str.length}`;
}

/**
 * Get all protected items from localStorage
 * Returns: { [targetIdOrPath]: { passwordHash, isFolder, name, timestamp } }
 */
export function getProtectedItems() {
  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load protected items:', err);
  }
  return {};
}

/**
 * Save protected items to localStorage
 */
function saveProtectedItems(items) {
  try {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to save protected items:', err);
  }
}

/**
 * Protect a file or folder with a password
 * @param {string} targetKey - File name or folder name (e.g., 'secret.py' or 'secrets')
 * @param {string} password - Password string
 * @param {boolean} isFolder - Whether target is a folder
 * @param {string} displayName - Human readable name
 */
export function protectItem(targetKey, password, isFolder = false, displayName = '') {
  if (!targetKey || !password) return false;

  const current = getProtectedItems();
  current[targetKey] = {
    passwordHash: hashString(password),
    isFolder: Boolean(isFolder),
    name: displayName || targetKey,
    timestamp: Date.now(),
  };

  saveProtectedItems(current);
  // Auto-unlock for the user who just created the protection
  sessionUnlockedItems.add(targetKey);
  return true;
}

/**
 * Remove protection from a file or folder
 */
export function removeProtection(targetKey, password) {
  const current = getProtectedItems();
  const item = current[targetKey];
  if (!item) return true;

  if (item.passwordHash !== hashString(password)) {
    return false; // Wrong password
  }

  delete current[targetKey];
  saveProtectedItems(current);
  sessionUnlockedItems.delete(targetKey);
  return true;
}

/**
 * Force unlock an item with master action if from settings
 */
export function removeProtectionDirect(targetKey) {
  const current = getProtectedItems();
  delete current[targetKey];
  saveProtectedItems(current);
  sessionUnlockedItems.delete(targetKey);
}

/**
 * Verify password and unlock item for current session
 */
export function unlockItemInSession(targetKey, password) {
  const current = getProtectedItems();
  const item = current[targetKey];
  if (!item) return true;

  if (item.passwordHash === hashString(password)) {
    sessionUnlockedItems.add(targetKey);
    return true;
  }
  return false;
}

/**
 * Lock item again for current session
 */
export function lockItemInSession(targetKey) {
  sessionUnlockedItems.delete(targetKey);
}

/**
 * Check if a file or folder is protected
 */
export function isItemProtected(targetKey, folderName = null) {
  const current = getProtectedItems();
  if (current[targetKey]) return true;
  if (folderName && current[folderName]) return true;
  return false;
}

/**
 * Check if an item is currently unlocked
 */
export function isItemUnlocked(targetKey, folderName = null) {
  const current = getProtectedItems();
  const fileProtected = Boolean(current[targetKey]);
  const folderProtected = folderName ? Boolean(current[folderName]) : false;

  if (!fileProtected && !folderProtected) return true; // Not protected

  if (fileProtected && !sessionUnlockedItems.has(targetKey)) {
    return false;
  }

  if (folderProtected && !sessionUnlockedItems.has(folderName)) {
    return false;
  }

  return true;
}

/**
 * Get all session unlocked item keys
 */
export function getSessionUnlockedList() {
  return Array.from(sessionUnlockedItems);
}
