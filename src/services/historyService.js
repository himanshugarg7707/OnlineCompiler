// Local Version History & Snapshot Restore Service

const STORAGE_HISTORY_KEY = 'fullcode_version_history_v1';
const MAX_SNAPSHOTS = 40;

/**
 * Load all recorded snapshots from localStorage
 */
export function getHistorySnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load version history:', err);
  }
  return [];
}

/**
 * Record a new snapshot into history
 * @param {string} fileName - File name
 * @param {string} content - Code content
 * @param {string} langName - Language name
 * @param {string} label - Snapshot description/trigger label
 */
export function recordSnapshot(fileName, content, langName = '', label = 'Code Run') {
  if (!content || !fileName) return;

  const currentList = getHistorySnapshots();

  // Avoid duplicate snapshots if content hasn't changed from the most recent one for this file
  const lastForFile = currentList.find((s) => s.fileName === fileName);
  if (lastForFile && lastForFile.content === content) {
    return;
  }

  const newSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fileName,
    content,
    langName: langName || 'Code',
    label,
    lineCount: content.split('\n').length,
    charCount: content.length,
    timestamp: Date.now(),
  };

  const updated = [newSnapshot, ...currentList].slice(0, MAX_SNAPSHOTS);

  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save snapshot to storage:', e);
  }

  return newSnapshot;
}

/**
 * Delete a specific snapshot by ID
 */
export function deleteSnapshot(id) {
  const currentList = getHistorySnapshots();
  const filtered = currentList.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(filtered));
  } catch {}
  return filtered;
}

/**
 * Clear all version history snapshots
 */
export function clearAllHistory() {
  try {
    localStorage.removeItem(STORAGE_HISTORY_KEY);
  } catch {}
}
