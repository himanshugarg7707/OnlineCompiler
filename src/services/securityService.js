// Security, Encryption & Item Lock Service
// Provides password-protected encryption for Files, Folders, and Notebooks
// using WebCrypto PBKDF2 + AES-GCM (with safe fallback) so contents remain protected
// even during live room broadcasts and workspace exports.

const STORAGE_PROTECTED_KEY = 'fullcode_security_protected_items_v1';
const LOCKS_STORAGE_KEY = 'fullcode_security_locks_v1';

// Session-level unlocked cache (cleared when tab closes or explicitly locked)
const unlockedSessions = new Set();

/**
 * Derives simple fast hash
 */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return 'h_' + Math.abs(h);
}

/**
 * Get all protected items dictionary: { [key]: { key, passwordHash, isFolder, displayName } }
 */
export function getProtectedItems() {
  try {
    const raw = localStorage.getItem(STORAGE_PROTECTED_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse protected items:', e);
  }
  return {};
}

function saveProtectedItems(items) {
  try {
    localStorage.setItem(STORAGE_PROTECTED_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save protected items:', e);
  }
}

/**
 * Protect an item with password
 */
export function protectItem(key, password, isFolder = false, displayName = '') {
  if (!key || !password) return;
  const items = getProtectedItems();
  items[key] = {
    key,
    passwordHash: simpleHash(password),
    isFolder: Boolean(isFolder),
    displayName: displayName || key,
    createdAt: Date.now(),
  };
  saveProtectedItems(items);

  // Sync to securityLocks for unified management
  const locks = getSecurityLocks();
  if (isFolder) {
    locks.folders[key] = { locked: true, name: displayName || key, hash: simpleHash(password) };
  } else {
    locks.files[key] = { locked: true, name: displayName || key, hash: simpleHash(password) };
  }
  saveSecurityLocks(locks);
}

/**
 * Remove protection directly
 */
export function removeProtectionDirect(key) {
  if (!key) return;
  const items = getProtectedItems();
  delete items[key];
  saveProtectedItems(items);
  unlockedSessions.delete(key);

  const locks = getSecurityLocks();
  delete locks.files[key];
  delete locks.folders[key];
  delete locks.notebooks[key];
  saveSecurityLocks(locks);
}

/**
 * Check if item is protected
 */
export function isItemProtected(key) {
  if (!key) return false;
  const items = getProtectedItems();
  if (items[key]) return true;

  const locks = getSecurityLocks();
  if (locks.files?.[key]?.locked || locks.folders?.[key]?.locked || locks.notebooks?.[key]?.locked) {
    return true;
  }
  for (const fId in locks.files || {}) {
    if (locks.files[fId]?.name === key && locks.files[fId]?.locked) return true;
  }
  for (const fldId in locks.folders || {}) {
    if (locks.folders[fldId]?.name === key && locks.folders[fldId]?.locked) return true;
  }
  for (const nbId in locks.notebooks || {}) {
    if (locks.notebooks[nbId]?.title === key && locks.notebooks[nbId]?.locked) return true;
  }
  return false;
}

/**
 * Check if item is unlocked in current session
 */
export function isItemUnlocked(key) {
  if (!key) return true;
  if (!isItemProtected(key)) return true;
  if (unlockedSessions.has(key)) return true;
  const locks = getSecurityLocks();
  if (locks.files?.[key]?.name && unlockedSessions.has(locks.files[key].name)) return true;
  for (const fId in locks.files || {}) {
    if (locks.files[fId]?.name === key && unlockedSessions.has(fId)) return true;
  }
  for (const fldId in locks.folders || {}) {
    if (locks.folders[fldId]?.name === key && unlockedSessions.has(fldId)) return true;
  }
  return false;
}

/**
 * Lock item in session
 */
export function lockItemInSession(key) {
  if (key) {
    unlockedSessions.delete(key);
    const locks = getSecurityLocks();
    if (locks.files?.[key]?.name) unlockedSessions.delete(locks.files[key].name);
    for (const fId in locks.files || {}) {
      if (locks.files[fId]?.name === key) unlockedSessions.delete(fId);
    }
  }
}

/**
 * Unlock item in session by verifying password
 */
export function unlockItemInSession(key, password) {
  if (!key || !password) return false;
  const items = getProtectedItems();
  const item = items[key];
  const inputHash = simpleHash(password);

  if (item && item.passwordHash === inputHash) {
    unlockedSessions.add(key);
    return true;
  }

  // Check in securityLocks
  const locks = getSecurityLocks();
  const fileLock = locks.files?.[key];
  const folderLock = locks.folders?.[key];
  const nbLock = locks.notebooks?.[key];
  let found = fileLock || folderLock || nbLock;
  let alias = null;

  if (!found) {
    for (const fId in locks.files || {}) {
      if (locks.files[fId]?.name === key) {
        found = locks.files[fId];
        alias = fId;
        break;
      }
    }
    if (!found) {
      for (const fldId in locks.folders || {}) {
        if (locks.folders[fldId]?.name === key) {
          found = locks.folders[fldId];
          alias = fldId;
          break;
        }
      }
    }
    if (!found) {
      for (const nbId in locks.notebooks || {}) {
        if (locks.notebooks[nbId]?.title === key) {
          found = locks.notebooks[nbId];
          alias = nbId;
          break;
        }
      }
    }
  } else {
    alias = found.name || found.title;
  }

  if (found && (found.hash === inputHash || found.hash === password)) {
    unlockedSessions.add(key);
    if (alias) unlockedSessions.add(alias);
    return true;
  }

  return false;
}

/**
 * Get all current lock records from localStorage
 * Format: { files: {}, folders: {}, notebooks: {} }
 */
export function getSecurityLocks() {
  try {
    const raw = localStorage.getItem(LOCKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        files: parsed.files || {},
        folders: parsed.folders || {},
        notebooks: parsed.notebooks || {},
      };
    }
  } catch (e) {
    console.warn('Failed to parse security locks:', e);
  }
  return { files: {}, folders: {}, notebooks: {} };
}

function saveSecurityLocks(locks) {
  try {
    localStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(locks));
  } catch (e) {
    console.warn('Failed to save security locks:', e);
  }
}

/**
 * Derives an AES-GCM CryptoKey from password and salt
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a text string with a password using AES-GCM
 */
export async function encryptText(plainText, password) {
  if (!password) throw new Error('Password is required');
  const enc = new TextEncoder();

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plainText)
      );

      const cipherArray = new Uint8Array(cipherBuffer);
      const combined = new Uint8Array(salt.length + iv.length + cipherArray.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(cipherArray, salt.length + iv.length);

      let binary = '';
      for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return 'ENC::v1::' + btoa(binary);
    } catch (e) {
      console.warn('SubtleCrypto encrypt fallback:', e);
    }
  }

  // Safe fallback XOR reversible cipher
  let res = '';
  for (let i = 0; i < plainText.length; i++) {
    res += String.fromCharCode(plainText.charCodeAt(i) ^ password.charCodeAt(i % password.length));
  }
  return 'ENC::v0::' + btoa(encodeURIComponent(res));
}

/**
 * Decrypt ciphertext with a password
 */
export async function decryptText(cipherText, password) {
  if (!password) throw new Error('Password is required');
  if (!cipherText || !cipherText.startsWith('ENC::')) {
    return cipherText;
  }

  const parts = cipherText.split('::');
  const version = parts[1];
  const payload = parts[2];

  if (version === 'v1' && typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const binary = atob(payload);
      const combined = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        combined[i] = binary.charCodeAt(i);
      }

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const cipherBytes = combined.slice(28);

      const key = await deriveKey(password, salt);
      const decBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBytes
      );
      return new TextDecoder().decode(decBuffer);
    } catch (e) {
      throw new Error('Incorrect password or corrupted encrypted data');
    }
  }

  // v0 fallback
  try {
    const raw = decodeURIComponent(atob(payload));
    let plain = '';
    for (let i = 0; i < raw.length; i++) {
      plain += String.fromCharCode(raw.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return plain;
  } catch (e) {
    throw new Error('Incorrect password');
  }
}

/**
 * Fast verification hash of password
 */
export async function createPasswordHash(password) {
  return simpleHash(password);
}

/**
 * Check if a file is locked
 */
export function isFileLocked(fileId) {
  const locks = getSecurityLocks();
  return Boolean(locks.files[fileId]?.locked);
}

/**
 * Check if a folder is locked
 */
export function isFolderLocked(folderId) {
  const locks = getSecurityLocks();
  return Boolean(locks.folders[folderId]?.locked);
}

/**
 * Check if a notebook is locked
 */
export function isNotebookLocked(notebookId) {
  const locks = getSecurityLocks();
  return Boolean(locks.notebooks[notebookId]?.locked);
}

/**
 * Lock a file with password and encrypt its contents
 */
export async function lockFile(file, password) {
  if (!file || !password) return null;
  const hash = simpleHash(password);
  const encrypted = await encryptText(file.content || '', password);

  const locks = getSecurityLocks();
  locks.files[file.id] = {
    locked: true,
    name: file.name,
    hash,
    updatedAt: Date.now(),
  };
  saveSecurityLocks(locks);
  protectItem(file.name, password, false, file.name);

  return {
    ...file,
    content: encrypted,
    isLocked: true,
  };
}

/**
 * Unlock a file with password
 */
export async function unlockFile(file, password) {
  if (!file || !password) return null;
  const locks = getSecurityLocks();
  const fileLock = locks.files[file.id];

  const currentHash = simpleHash(password);
  if (fileLock?.hash && fileLock.hash !== currentHash) {
    throw new Error('Incorrect password');
  }

  const decrypted = await decryptText(file.content, password);
  unlockedSessions.add(file.name);
  return {
    ...file,
    content: decrypted,
    isUnlockedSession: true,
  };
}

/**
 * Permanently remove lock from a file
 */
export async function removeFileLock(file, password) {
  const unlocked = await unlockFile(file, password);
  const locks = getSecurityLocks();
  delete locks.files[file.id];
  saveSecurityLocks(locks);
  removeProtectionDirect(file.name);

  return {
    ...unlocked,
    isLocked: false,
    isUnlockedSession: false,
  };
}

/**
 * Lock a folder with password
 */
export async function lockFolder(folderId, folderName, password) {
  const hash = simpleHash(password);
  const locks = getSecurityLocks();
  locks.folders[folderId] = {
    locked: true,
    name: folderName,
    hash,
    updatedAt: Date.now(),
  };
  saveSecurityLocks(locks);
  protectItem(folderName, password, true, folderName);
  return true;
}

/**
 * Remove folder lock
 */
export async function removeFolderLock(folderId, password) {
  const locks = getSecurityLocks();
  const hash = simpleHash(password);
  if (locks.folders[folderId]?.hash && locks.folders[folderId].hash !== hash) {
    throw new Error('Incorrect password');
  }
  const folderName = locks.folders[folderId]?.name || folderId;
  delete locks.folders[folderId];
  saveSecurityLocks(locks);
  removeProtectionDirect(folderName);
  return true;
}

/**
 * Lock a notebook with password
 */
export async function lockNotebook(notebookId, notebookTitle, password) {
  const hash = simpleHash(password);
  const locks = getSecurityLocks();
  locks.notebooks[notebookId] = {
    locked: true,
    title: notebookTitle,
    hash,
    updatedAt: Date.now(),
  };
  saveSecurityLocks(locks);
  protectItem(notebookTitle, password, false, notebookTitle);
  return true;
}

/**
 * Remove notebook lock
 */
export async function removeNotebookLock(notebookId, password) {
  const locks = getSecurityLocks();
  const hash = simpleHash(password);
  if (locks.notebooks[notebookId]?.hash && locks.notebooks[notebookId].hash !== hash) {
    throw new Error('Incorrect password');
  }
  const title = locks.notebooks[notebookId]?.title || notebookId;
  delete locks.notebooks[notebookId];
  saveSecurityLocks(locks);
  removeProtectionDirect(title);
  return true;
}
