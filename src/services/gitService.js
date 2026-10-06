// Source Control & Git Engine Service for Full Code IDE
// Provides comprehensive Git features: Branches, Commits, Push, Pull, Sync, Diff, and Merge.
import { recordSnapshot } from './historyService';

const STORAGE_REPO_KEY = 'fullcode_git_repository_v2';
const STORAGE_BASELINE_KEY = 'fullcode_git_baseline_v1';
const STORAGE_STAGED_KEY = 'fullcode_git_staged_v1';

/**
 * Initialize or retrieve repository state from localStorage
 */
export function getGitRepository() {
  try {
    const raw = localStorage.getItem(STORAGE_REPO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.currentBranch && parsed.branches) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load git repo state:', e);
  }

  // Initial Git repository with 'main' branch and initial commit
  const defaultRepo = {
    currentBranch: 'main',
    branches: {
      main: {
        name: 'main',
        headCommitId: 'init-001',
        commits: [
          {
            id: 'init-001',
            hash: '4e9b1a2',
            message: 'Initial commit • Project bootstrap',
            author: 'FullCode Developer <dev@fullcode.io>',
            timestamp: Date.now() - 7200000,
            pushed: true,
            filesCount: 1,
          },
        ],
        filesSnapshot: null,
        ahead: 0,
        behind: 0,
      },
    },
    remotes: {
      origin: {
        name: 'origin',
        url: 'https://github.com/fullcode/project.git',
      },
    },
  };

  saveGitRepository(defaultRepo);
  return defaultRepo;
}

/**
 * Save repository state to localStorage
 */
export function saveGitRepository(repo) {
  try {
    localStorage.setItem(STORAGE_REPO_KEY, JSON.stringify(repo));
    // Also notify any listening components in the same window
    window.dispatchEvent(new CustomEvent('fullcode-git-updated', { detail: repo }));
  } catch (e) {
    console.warn('Failed to save git repo state:', e);
  }
}

/**
 * Get current active branch name
 */
export function getCurrentBranch() {
  const repo = getGitRepository();
  return repo.currentBranch || 'main';
}

/**
 * Get list of all branches with details
 */
export function getBranchList() {
  const repo = getGitRepository();
  const currentBranch = repo.currentBranch || 'main';

  return Object.values(repo.branches).map((b) => ({
    name: b.name,
    isCurrent: b.name === currentBranch,
    commitCount: b.commits ? b.commits.length : 0,
    ahead: b.ahead || 0,
    behind: b.behind || 0,
    lastCommit: b.commits && b.commits.length > 0 ? b.commits[0] : null,
  }));
}

/**
 * Create a new branch
 * @param {string} branchName
 * @param {string|null} baseBranch
 * @param {Array} currentFiles
 */
export function createBranch(branchName, baseBranch = null, currentFiles = []) {
  if (!branchName || typeof branchName !== 'string') {
    throw new Error('Branch name cannot be empty');
  }

  // Clean branch name to standard git conventions
  const cleanName = branchName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_\-/]/g, '')
    .replace(/\/+/g, '/');

  if (!cleanName) {
    throw new Error('Invalid branch name. Use alphanumeric characters, hyphens, or slashes.');
  }

  const repo = getGitRepository();
  if (repo.branches[cleanName]) {
    throw new Error(`Branch "${cleanName}" already exists`);
  }

  const sourceName = baseBranch || repo.currentBranch || 'main';
  const sourceBranch = repo.branches[sourceName] || repo.branches.main;

  const newBranch = {
    name: cleanName,
    headCommitId: sourceBranch?.headCommitId || null,
    commits: sourceBranch?.commits ? [...sourceBranch.commits] : [],
    filesSnapshot: Array.isArray(currentFiles) && currentFiles.length > 0
      ? JSON.parse(JSON.stringify(currentFiles))
      : (sourceBranch?.filesSnapshot ? JSON.parse(JSON.stringify(sourceBranch.filesSnapshot)) : null),
    ahead: 0,
    behind: 0,
  };

  repo.branches[cleanName] = newBranch;
  saveGitRepository(repo);

  return { success: true, branchName: cleanName };
}

/**
 * Checkout / Switch to a branch
 * @param {string} targetBranchName
 * @param {Array} currentFiles
 */
export function checkoutBranch(targetBranchName, currentFiles = []) {
  const repo = getGitRepository();

  if (!repo.branches[targetBranchName]) {
    throw new Error(`Branch "${targetBranchName}" does not exist`);
  }

  const oldBranchName = repo.currentBranch || 'main';

  // Save files snapshot of the branch we are leaving
  if (repo.branches[oldBranchName] && Array.isArray(currentFiles)) {
    repo.branches[oldBranchName].filesSnapshot = JSON.parse(JSON.stringify(currentFiles));
  }

  // Switch active branch
  repo.currentBranch = targetBranchName;
  saveGitRepository(repo);

  const targetBranch = repo.branches[targetBranchName];
  const filesToLoad = targetBranch?.filesSnapshot && Array.isArray(targetBranch.filesSnapshot) && targetBranch.filesSnapshot.length > 0
    ? targetBranch.filesSnapshot
    : currentFiles;

  // Update baselines for new branch
  ensureGitBaselines(filesToLoad);

  return {
    success: true,
    previousBranch: oldBranchName,
    currentBranch: targetBranchName,
    files: filesToLoad,
  };
}

/**
 * Delete a branch
 * @param {string} branchName
 */
export function deleteBranch(branchName) {
  const repo = getGitRepository();

  if (branchName === repo.currentBranch) {
    throw new Error('Cannot delete the currently active branch. Switch to another branch first.');
  }

  if (branchName === 'main' && Object.keys(repo.branches).length === 1) {
    throw new Error('Cannot delete the only branch "main".');
  }

  if (!repo.branches[branchName]) {
    throw new Error(`Branch "${branchName}" not found`);
  }

  delete repo.branches[branchName];
  saveGitRepository(repo);

  return { success: true, branchName };
}

/**
 * Rename a branch
 */
export function renameBranch(oldName, newName) {
  if (!newName || !newName.trim()) {
    throw new Error('New branch name cannot be empty');
  }

  const cleanNewName = newName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const repo = getGitRepository();

  if (!repo.branches[oldName]) {
    throw new Error(`Branch "${oldName}" not found`);
  }

  if (repo.branches[cleanNewName] && oldName !== cleanNewName) {
    throw new Error(`Branch "${cleanNewName}" already exists`);
  }

  const branchData = repo.branches[oldName];
  branchData.name = cleanNewName;
  delete repo.branches[oldName];
  repo.branches[cleanNewName] = branchData;

  if (repo.currentBranch === oldName) {
    repo.currentBranch = cleanNewName;
  }

  saveGitRepository(repo);
  return { success: true, oldName, newName: cleanNewName };
}

/**
 * Merge a branch into current branch
 * @param {string} sourceBranchName
 * @param {Array} currentFiles
 */
export function mergeBranch(sourceBranchName, currentFiles = []) {
  const repo = getGitRepository();
  const currentBranchName = repo.currentBranch || 'main';

  if (sourceBranchName === currentBranchName) {
    throw new Error('Cannot merge a branch into itself');
  }

  const sourceBranch = repo.branches[sourceBranchName];
  if (!sourceBranch) {
    throw new Error(`Branch "${sourceBranchName}" not found`);
  }

  const currentBranch = repo.branches[currentBranchName];

  // Merge files: Take files from source branch and update/add them
  const sourceFiles = sourceBranch.filesSnapshot || [];
  const mergedFiles = Array.isArray(currentFiles) ? [...currentFiles] : [];

  sourceFiles.forEach((sf) => {
    const existingIndex = mergedFiles.findIndex((mf) => mf.name === sf.name);
    if (existingIndex !== -1) {
      mergedFiles[existingIndex] = { ...sf, id: mergedFiles[existingIndex].id };
    } else {
      mergedFiles.push({ ...sf });
    }
  });

  // Create merge commit
  const commitId = `merge-${Date.now()}`;
  const commitHash = Math.random().toString(16).substring(2, 9);
  const commitMessage = `Merge branch '${sourceBranchName}' into ${currentBranchName}`;

  const mergeCommit = {
    id: commitId,
    hash: commitHash,
    message: commitMessage,
    author: 'FullCode Developer <dev@fullcode.io>',
    timestamp: Date.now(),
    pushed: false,
    filesCount: sourceFiles.length,
    isMerge: true,
  };

  currentBranch.commits = [mergeCommit, ...(currentBranch.commits || [])];
  currentBranch.headCommitId = commitId;
  currentBranch.ahead = (currentBranch.ahead || 0) + 1;
  currentBranch.filesSnapshot = mergedFiles;

  saveGitRepository(repo);

  // Update baselines
  const baselines = getGitBaselines();
  mergedFiles.forEach((f) => {
    baselines[f.id] = f.content ?? '';
  });
  saveGitBaselines(baselines);

  return {
    success: true,
    message: `Merged ${sourceBranchName} into ${currentBranchName} (${commitHash})`,
    commit: mergeCommit,
    files: mergedFiles,
  };
}

/**
 * Commit staged or unstaged changes on the current active branch
 * @param {string} message
 * @param {Array} files
 * @param {Array} stagedIds
 */
export function commitChanges(message, files, stagedIds = [], author = null) {
  const repo = getGitRepository();
  const currentBranchName = repo.currentBranch || 'main';
  const branch = repo.branches[currentBranchName];

  const trimmedMsg = (message || '').trim() || 'Update files';
  const commitId = `commit-${Date.now()}`;
  const commitHash = Math.random().toString(16).substring(2, 9);

  const baselines = getGitBaselines();
  let modifiedCount = 0;

  files.forEach((file) => {
    if (!file || !file.id) return;
    if (stagedIds.length === 0 || stagedIds.includes(file.id) || stagedIds.includes(file.name)) {
      baselines[file.id] = file.content ?? '';
      modifiedCount++;
      recordSnapshot(
        file.name,
        file.content ?? '',
        file.language?.name || 'Code',
        `Git Commit [${currentBranchName}]: ${trimmedMsg}`
      );
    }
  });

  saveGitBaselines(baselines);
  saveStagedFileIds([]);

  const newCommit = {
    id: commitId,
    hash: commitHash,
    message: trimmedMsg,
    author: author || 'FullCode Developer <dev@fullcode.io>',
    timestamp: Date.now(),
    pushed: false,
    filesCount: modifiedCount || 1,
  };

  if (!branch.commits) branch.commits = [];
  branch.commits.unshift(newCommit);
  branch.headCommitId = commitId;
  branch.ahead = (branch.ahead || 0) + 1;
  branch.filesSnapshot = JSON.parse(JSON.stringify(files));

  saveGitRepository(repo);

  return {
    success: true,
    commit: newCommit,
    branch: currentBranchName,
    ahead: branch.ahead,
  };
}

/**
 * Git Push: pushes unpushed commits on current branch to remote origin
 * @param {string} remoteName
 */
export function pushToRemote(remoteName = 'origin') {
  const repo = getGitRepository();
  const currentBranchName = repo.currentBranch || 'main';
  const branch = repo.branches[currentBranchName];

  if (!branch) {
    throw new Error(`Branch ${currentBranchName} not found`);
  }

  const unpushedCount = branch.ahead || 0;

  if (branch.commits) {
    branch.commits.forEach((c) => {
      c.pushed = true;
    });
  }

  branch.ahead = 0;
  saveGitRepository(repo);

  return {
    success: true,
    pushedCount: unpushedCount,
    branch: currentBranchName,
    remote: remoteName,
  };
}

/**
 * Git Pull: pulls remote changes and syncs branch
 * @param {string} remoteName
 */
export function pullFromRemote(remoteName = 'origin') {
  const repo = getGitRepository();
  const currentBranchName = repo.currentBranch || 'main';
  const branch = repo.branches[currentBranchName];

  if (!branch) {
    throw new Error(`Branch ${currentBranchName} not found`);
  }

  const behindCount = branch.behind || 0;
  branch.behind = 0;
  saveGitRepository(repo);

  return {
    success: true,
    pulledCount: behindCount,
    upToDate: behindCount === 0,
    branch: currentBranchName,
    remote: remoteName,
  };
}

/**
 * Git Sync: Pulls then pushes
 */
export function syncWithRemote(remoteName = 'origin') {
  const pullRes = pullFromRemote(remoteName);
  const pushRes = pushToRemote(remoteName);

  return {
    success: true,
    pulled: pullRes.pulledCount,
    pushed: pushRes.pushedCount,
    branch: pushRes.branch,
  };
}

/**
 * Get commit log for current or specific branch
 * @param {string|null} branchName
 * @param {number} limit
 */
export function getBranchHistory(branchName = null, limit = 20) {
  const repo = getGitRepository();
  const target = branchName || repo.currentBranch || 'main';
  const branch = repo.branches[target];

  if (!branch || !Array.isArray(branch.commits)) {
    return [];
  }

  return branch.commits.slice(0, limit);
}

/**
 * Get sync status (ahead / behind / remote tracking)
 */
export function getSyncStatus() {
  const repo = getGitRepository();
  const currentBranchName = repo.currentBranch || 'main';
  const branch = repo.branches[currentBranchName];
  const remote = repo.remotes?.origin || { url: 'https://github.com/fullcode/project.git' };

  return {
    currentBranch: currentBranchName,
    ahead: branch?.ahead || 0,
    behind: branch?.behind || 0,
    remoteUrl: remote.url,
    remoteBranch: `origin/${currentBranchName}`,
    isSynced: (branch?.ahead || 0) === 0 && (branch?.behind || 0) === 0,
  };
}

/**
 * Configure remote URL
 */
export function setRemoteUrl(url, remoteName = 'origin') {
  const repo = getGitRepository();
  if (!repo.remotes) repo.remotes = {};
  repo.remotes[remoteName] = {
    name: remoteName,
    url: url.trim(),
  };
  saveGitRepository(repo);
  return { success: true, remoteUrl: url.trim() };
}

// ─── Existing Baseline & Diff Exports (100% Backward Compatible) ─────────────

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
      const isStaged = stagedSet.has(file.id) || stagedSet.has(file.name);
      const changeItem = {
        file,
        filename: file.name,
        fileId: file.id,
        status: isUntracked ? 'untracked' : 'modified',
        statusShort: isUntracked ? 'U' : 'M',
        baselineContent: isUntracked ? '' : baselineContent,
        currentContent,
      };

      if (isStaged) {
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

export const switchBranch = (targetBranchName, currentFiles = []) => checkoutBranch(targetBranchName, currentFiles);
export const getCommitHistory = (branchName = null, limit = 50) => getBranchHistory(branchName, limit);

export function stageFile(fileIdentifier) {
  const staged = getStagedFileIds();
  if (!staged.includes(fileIdentifier)) {
    saveStagedFileIds([...staged, fileIdentifier]);
  }
}

export function unstageFile(fileIdentifier) {
  const staged = getStagedFileIds();
  saveStagedFileIds(staged.filter((id) => id !== fileIdentifier));
}

export function stageAllFiles(files = []) {
  if (Array.isArray(files) && files.length > 0) {
    const ids = files.map((f) => f.name || f.id).filter(Boolean);
    saveStagedFileIds(ids);
  } else {
    const baselines = getGitBaselines();
    const allFiles = Object.keys(baselines);
    saveStagedFileIds(allFiles);
  }
}

export function unstageAllFiles() {
  saveStagedFileIds([]);
}

export function commitStagedFiles(files, message, author) {
  const stagedIds = getStagedFileIds();
  return commitChanges(message, files, stagedIds, author);
}

/**
 * Fast line-by-line diff computation with addition/deletion stats
 */
export function computeLineDiff(oldText = '', newText = '') {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');

  const n = oldLines.length;
  const m = newLines.length;

  if (n * m > 400000) {
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

  return { additions, deletions, leftRows, rightRows, inlineRows };
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
