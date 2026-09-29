// Source Control & Git Diff Service for Full Code IDE
import { recordSnapshot } from './historyService';

const STORAGE_BASELINE_KEY = 'fullcode_git_baseline_v1';
const STORAGE_STAGED_KEY = 'fullcode_git_staged_v1';

/**
 * Retrieve saved baseline snapshots of files (last committed state)
 */
export function getGitBaselines() {
  try {
    const raw = localStorage.getItem(STORAGE_BASELINE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load git baselines:', e);
  }
  return {};
}

/**
 * Save baseline snapshots
 */
export function saveGitBaselines(baselines) {
  try {
    localStorage.setItem(STORAGE_BASELINE_KEY, JSON.stringify(baselines));
  } catch (e) {
    console.warn('Failed to save git baselines:', e);
  }
}

/**
 * Retrieve list of staged file IDs
 */
export function getStagedFileIds() {
  try {
    const raw = localStorage.getItem(STORAGE_STAGED_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load staged file IDs:', e);
  }
  return [];
}

/**
 * Save list of staged file IDs
 */
export function saveStagedFileIds(ids) {
  try {
    localStorage.setItem(STORAGE_STAGED_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save staged file IDs:', e);
  }
}

/**
 * Initialize baseline for files that don't have one yet
 */
export function ensureGitBaselines(files) {
  if (!Array.isArray(files)) return;
  const baselines = getGitBaselines();
  let modified = false;

  files.forEach((file) => {
    if (!file || !file.id) return;
    if (baselines[file.id] === undefined) {
      // Set initial baseline
      baselines[file.id] = file.content ?? '';
      modified = true;
    }
  });

  if (modified) {
    saveGitBaselines(baselines);
  }
}

/**
 * Compute the git status of all files in workspace
 * Returns: { staged: [], unstaged: [], untracked: [], totalCount: number }
 */
export function getWorkspaceGitStatus(files, stagedIds = []) {
  if (!Array.isArray(files)) return { staged: [], unstaged: [], totalCount: 0 };
  const baselines = getGitBaselines();
  const stagedSet = new Set(stagedIds);

  const staged = [];
  const unstaged = [];

  files.forEach((file) => {
    if (!file || !file.id) return;
    const currentContent = file.content ?? '';
    const hasBaseline = baselines[file.id] !== undefined;
    const baselineContent = hasBaseline ? baselines[file.id] : null;

    const isUntracked = !hasBaseline;
    const isModified = hasBaseline && baselineContent !== currentContent;

    if (isUntracked || isModified) {
      const changeItem = {
        file,
        status: isUntracked ? 'U' : 'M',
        baselineContent: isUntracked ? '' : baselineContent,
        currentContent,
      };

      if (stagedSet.has(file.id)) {
        staged.push(changeItem);
      } else {
        unstaged.push(changeItem);
      }
    }
  });

  return {
    staged,
    unstaged,
    totalCount: staged.length + unstaged.length,
  };
}

/**
 * Fast line-by-line diff computation with addition/deletion stats
 */
export function computeLineDiff(oldText = '', newText = '') {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');

  // Simple and robust LCS diff
  const n = oldLines.length;
  const m = newLines.length;

  // Use Myers or classic dynamic programming for modest file sizes, with fallback
  if (n * m > 400000) {
    // Large file fast fallback
    return computeFastDiff(oldLines, newLines);
  }

  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const leftRows = [];
  const rightRows = [];
  const inlineRows = [];
  let additions = 0;
  let deletions = 0;

  const rawDiff = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      rawDiff.push({ type: 'unchanged', oldLine: oldLines[i - 1], newLine: newLines[j - 1], oldNum: i, newNum: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ type: 'added', newLine: newLines[j - 1], newNum: j });
      additions++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ type: 'deleted', oldLine: oldLines[i - 1], oldNum: i });
      deletions++;
      i--;
    }
  }
  rawDiff.reverse();

  // Format into aligned side-by-side rows
  let oldLineCounter = 1;
  let newLineCounter = 1;

  rawDiff.forEach((item) => {
    if (item.type === 'unchanged') {
      leftRows.push({ num: oldLineCounter, text: item.oldLine, type: 'unchanged' });
      rightRows.push({ num: newLineCounter, text: item.newLine, type: 'unchanged' });
      inlineRows.push({ type: 'unchanged', oldNum: oldLineCounter, newNum: newLineCounter, text: item.oldLine });
      oldLineCounter++;
      newLineCounter++;
    } else if (item.type === 'deleted') {
      leftRows.push({ num: oldLineCounter, text: item.oldLine, type: 'deleted' });
      rightRows.push({ num: null, text: '', type: 'empty' });
      inlineRows.push({ type: 'deleted', oldNum: oldLineCounter, newNum: null, text: item.oldLine });
      oldLineCounter++;
    } else if (item.type === 'added') {
      leftRows.push({ num: null, text: '', type: 'empty' });
      rightRows.push({ num: newLineCounter, text: item.newLine, type: 'added' });
      inlineRows.push({ type: 'added', oldNum: null, newNum: newLineCounter, text: item.newLine });
      newLineCounter++;
    }
  });

  return {
    additions,
    deletions,
    leftRows,
    rightRows,
    inlineRows,
  };
}

function computeFastDiff(oldLines, newLines) {
  let additions = 0;
  let deletions = 0;
  const leftRows = [];
  const rightRows = [];
  const inlineRows = [];
  const max = Math.max(oldLines.length, newLines.length);

  for (let k = 0; k < max; k++) {
    const oLine = oldLines[k];
    const nLine = newLines[k];
    if (oLine === nLine) {
      leftRows.push({ num: k + 1, text: oLine ?? '', type: 'unchanged' });
      rightRows.push({ num: k + 1, text: nLine ?? '', type: 'unchanged' });
      inlineRows.push({ type: 'unchanged', oldNum: k + 1, newNum: k + 1, text: oLine ?? '' });
    } else {
      if (oLine !== undefined) {
        deletions++;
        leftRows.push({ num: k + 1, text: oLine, type: 'deleted' });
      } else {
        leftRows.push({ num: null, text: '', type: 'empty' });
      }
      if (nLine !== undefined) {
        additions++;
        rightRows.push({ num: k + 1, text: nLine, type: 'added' });
      } else {
        rightRows.push({ num: null, text: '', type: 'empty' });
      }
    }
  }

  return { additions, deletions, leftRows, rightRows, inlineRows };
}
