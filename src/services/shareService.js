// Code Sharing Service with LZ-String Compression & Lock Preservation
import LZString from 'lz-string';
import { getProtectedItems } from './securityService';

const SECURITY_STORAGE_KEY = 'fullcode_protected_items_v1';

/**
 * Generate a shareable URL containing compressed code, workspace state, and security locks
 * @param {Array} files - Files to include in share
 * @param {string} activeFileId - Active file ID
 * @param {string} stdin - Standard input value
 * @returns {string} - Full shareable URL
 */
export function generateShareUrl(files = [], activeFileId = null, stdin = '') {
  try {
    const allProtected = getProtectedItems();
    // Filter protected items that belong to the shared files
    const relevantProtected = {};
    const fileNamesSet = new Set(files.map((f) => f.name));

    Object.entries(allProtected).forEach(([key, item]) => {
      if (item.isFolder) {
        // If folder contains any shared file
        if (files.some((f) => f.name.startsWith(`${key}/`))) {
          relevantProtected[key] = item;
        }
      } else if (fileNamesSet.has(key)) {
        relevantProtected[key] = item;
      }
    });

    const payload = {
      v: 2,
      files: files.map((f) => ({
        name: f.name,
        content: f.content,
        langId: f.language?.id || 71,
      })),
      activeFileId,
      stdin: stdin || '',
      protectedItems: relevantProtected,
      timestamp: Date.now(),
    };

    const jsonStr = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#share=${compressed}`;
  } catch (err) {
    console.error('Failed to generate share URL:', err);
    return window.location.href;
  }
}

/**
 * Decode shared workspace payload from URL hash if present
 * Restores both files and protected lock states
 * @returns {object|null} - Decoded workspace payload or null
 */
export function decodeSharedWorkspace() {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('share=')) return null;

    const encodedPart = hash.split('share=')[1]?.split('&')[0];
    if (!encodedPart) return null;

    const jsonStr = LZString.decompressFromEncodedURIComponent(encodedPart);
    if (!jsonStr) return null;

    const payload = JSON.parse(jsonStr);
    if (payload && Array.isArray(payload.files) && payload.files.length > 0) {
      // Restore password protection locks on destination device
      if (payload.protectedItems && typeof payload.protectedItems === 'object') {
        try {
          const existingProtected = getProtectedItems();
          const merged = { ...existingProtected, ...payload.protectedItems };
          localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {
          console.warn('Failed to restore protected items from share link:', e);
        }
      }
      return payload;
    }
  } catch (err) {
    console.warn('Failed to decode shared workspace from URL:', err);
  }
  return null;
}

/**
 * Clear the share parameter from the URL bar without reloading
 */
export function clearShareHash() {
  if (window.location.hash && window.location.hash.includes('share=')) {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
}
