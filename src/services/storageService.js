// Permanent Memory, Cookies, and Browser Storage Persistence Service

const COOKIE_CONSENT_KEY = 'fullcode_cookie_consent';

export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveCookieConsent(consentData) {
  const payload = {
    accepted: Boolean(consentData.accepted),
    persistentStorage: Boolean(consentData.persistentStorage ?? true),
    themeMemory: Boolean(consentData.themeMemory ?? true),
    historyMemory: Boolean(consentData.historyMemory ?? true),
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save cookie consent to localStorage:', err);
  }

  // Also set cookie if accepted
  try {
    const maxAge = 365 * 24 * 60 * 60; // 1 year
    document.cookie = `fullcode_consent=${payload.accepted ? '1' : '0'}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch (err) {
    console.warn('Failed to set document.cookie:', err);
  }

  if (payload.persistentStorage) {
    requestPersistentStorage();
  }

  return payload;
}

/**
 * Request the browser to mark storage as persistent (cannot be cleared automatically by browser)
 */
export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Storage] Persistent storage granted: ${isPersisted}`);
      return isPersisted;
    } catch (err) {
      console.warn('[Storage] Error requesting persistent storage:', err);
    }
  }
  return false;
}

/**
 * Check if storage is already persistent
 */
export async function isStoragePersisted() {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {}
  }
  return false;
}

/**
 * Get estimated storage usage and quota
 */
export async function getStorageEstimate() {
  let quota = 0;
  let usage = 0;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || 0;
      usage = estimate.usage || 0;
    } catch {}
  }

  // Calculate local storage payload size manually as well
  let localStorageBytes = 0;
  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localStorageBytes += (localStorage[key].length + key.length) * 2;
      }
    }
  } catch {}

  const totalUsage = Math.max(usage, localStorageBytes);
  const usageFormatted =
    totalUsage > 1024 * 1024
      ? `${(totalUsage / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(totalUsage / 1024)} KB`;

  const quotaFormatted =
    quota > 1024 * 1024 * 1024
      ? `${(quota / (1024 * 1024 * 1024)).toFixed(1)} GB`
      : quota > 0
      ? `${Math.round(quota / (1024 * 1024))} MB`
      : 'Unlimited';

  return {
    usageBytes: totalUsage,
    quotaBytes: quota,
    usageFormatted,
    quotaFormatted,
  };
}

/**
 * Generate a complete JSON backup of the entire user workspace and app state
 */
export function exportFullAppBackup() {
  const backup = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    storage: {},
  };

  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('fullcode_')) {
        try {
          backup.storage[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          backup.storage[key] = localStorage.getItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to compile app backup:', err);
  }

  return backup;
}

/**
 * Download the backup as a .json file
 */
export function downloadBackupFile() {
  const data = exportFullAppBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fullcode_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const INCOGNITO_MODE_KEY = 'fullcode_incognito_mode_active';

/**
 * Checks whether incognito / ephemeral session is currently active
 */
export function isIncognitoActive() {
  try {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(INCOGNITO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable or disable incognito session in temporary browser memory
 */
export function setIncognitoActive(active) {
  try {
    if (typeof window === 'undefined') return;
    if (active) {
      sessionStorage.setItem(INCOGNITO_MODE_KEY, 'true');
    } else {
      sessionStorage.removeItem(INCOGNITO_MODE_KEY);
    }
  } catch (err) {
    console.warn('Failed to update incognito mode in sessionStorage:', err);
  }
}

/**
 * Check if there is previously saved persistent workspace in localStorage
 */
export function hasPersistedDataInLocalStorage() {
  try {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem('fullcode_files_v3');
    return Boolean(raw && raw !== '[]');
  } catch {
    return false;
  }
}

