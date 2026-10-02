// GitHub Remote Integration Service for OnlineCompiler
// Enables linking empty or existing GitHub repositories to pull and push workspace code.

import { detectLanguageByFilename } from './languageDetector';

const GITHUB_CONFIG_KEY = 'fullcode_github_remote_config_v1';

export function getGitHubConfig() {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load GitHub config:', e);
  }
  return {
    repoUrl: '',
    token: '',
    branch: 'main',
    authorName: 'OnlineCompiler Developer',
    authorEmail: 'dev@onlinecompiler.io',
    lastSync: null,
  };
}

export function saveGitHubConfig(config) {
  try {
    const existing = getGitHubConfig();
    const updated = { ...existing, ...config };
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('github-config-updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.warn('Failed to save GitHub config:', e);
    return config;
  }
}

/**
 * Parses GitHub repo URL into owner and repo name
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * - git@github.com:owner/repo.git
 */
export function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();

  // HTTPS or plain URL
  const httpsMatch = clean.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git|\/)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH style
  const sshMatch = clean.match(/^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // Just owner/repo format
  const shortMatch = clean.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

/**
 * Unicode-safe base64 encoder and decoder
 */
function utf8ToBase64(str) {
  return window.btoa(unescape(encodeURIComponent(str || '')));
}

function base64ToUtf8(str) {
  try {
    return decodeURIComponent(escape(window.atob(str || '')));
  } catch {
    return window.atob(str || '');
  }
}

/**
 * Tests connection to a GitHub repository
 */
export async function testGitHubRepo(repoUrl, token = '') {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid GitHub repository URL. Use format: https://github.com/owner/repo',
    };
  }

  const { owner, repo } = parsed;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (res.status === 404) {
      return {
        success: false,
        error: 'Repository not found. If this repository is private, please provide a GitHub Personal Access Token (PAT).',
      };
    }
    if (res.status === 401) {
      return {
        success: false,
        error: 'Authentication failed. Check your GitHub Personal Access Token.',
      };
    }
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.message || `GitHub API error (${res.status})`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      owner,
      repo,
      fullName: data.full_name,
      defaultBranch: data.default_branch || 'main',
      isPrivate: data.private,
      isEmpty: data.size === 0,
      description: data.description || 'No description',
      htmlUrl: data.html_url,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error connecting to GitHub API.',
    };
  }
}

/**
 * Pushes all workspace files to a GitHub repository (supports empty repos as well)
 */
export async function pushWorkspaceToGitHub(files, repoUrl, token, commitMessage = 'Update workspace from OnlineCompiler', branch = 'main') {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL. Format: https://github.com/owner/repo');
  }
  if (!token || !token.trim()) {
    throw new Error('A GitHub Personal Access Token (PAT) with repo scope is required to push.');
  }

  if (!files || files.length === 0) {
    throw new Error('No files in workspace to push.');
  }

  const { owner, repo } = parsed;
  const cleanToken = token.trim();
  const targetBranch = branch.trim() || 'main';
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${cleanToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Check if repo is empty or if branch ref exists
  let latestCommitSha = null;
  let baseTreeSha = null;

  try {
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, { headers });
    if (refRes.ok) {
      const refData = await refRes.json();
      latestCommitSha = refData.object.sha;
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      }
    }
  } catch (_) {}

  // Case A: Existing repository with existing commits (Atomic Git Data API commit)
  if (latestCommitSha) {
    // 1. Create blobs for each file
    const treeItems = [];
    for (const f of files) {
      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: f.content || '',
          encoding: 'utf-8',
        }),
      });
      if (!blobRes.ok) {
        const errJson = await blobRes.json().catch(() => ({}));
        throw new Error(`Failed to upload ${f.name}: ${errJson.message || blobRes.statusText}`);
      }
      const blobData = await blobRes.json();
      treeItems.push({
        path: f.name,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // 2. Create tree
    const treePayload = {
      tree: treeItems,
    };
    if (baseTreeSha) {
      treePayload.base_tree = baseTreeSha;
    }
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(treePayload),
    });
    if (!treeRes.ok) {
      const errJson = await treeRes.json().catch(() => ({}));
      throw new Error(`Failed to create Git tree: ${errJson.message || treeRes.statusText}`);
    }
    const treeData = await treeRes.json();

    // 3. Create commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: commitMessage || 'Update from OnlineCompiler',
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });
    if (!commitRes.ok) {
      const errJson = await commitRes.json().catch(() => ({}));
      throw new Error(`Failed to create commit: ${errJson.message || commitRes.statusText}`);
    }
    const commitData = await commitRes.json();

    // 4. Update ref
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: commitData.sha,
        force: true,
      }),
    });
    if (!updateRefRes.ok) {
      const errJson = await updateRefRes.json().catch(() => ({}));
      throw new Error(`Failed to update branch head: ${errJson.message || updateRefRes.statusText}`);
    }

    return {
      success: true,
      commitSha: commitData.sha.substring(0, 7),
      fullSha: commitData.sha,
      branch: targetBranch,
      filesPushed: files.length,
      htmlUrl: `https://github.com/${owner}/${repo}/commit/${commitData.sha}`,
    };
  }

  // Case B: Completely empty repository (no branches, no commits)
  // We use the Contents API to create the first file which initializes the repository default branch,
  // then push the remaining files!
  let isInitialized = false;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const encoded = utf8ToBase64(f.content || '');

    // Check if file already exists to pass SHA if updating
    let existingSha = undefined;
    if (isInitialized) {
      try {
        const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(f.name)}?ref=${targetBranch}`, { headers });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          existingSha = checkData.sha;
        }
      } catch (_) {}
    }

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(f.name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: i === 0 ? (commitMessage || 'Initial commit from OnlineCompiler') : `Add ${f.name}`,
        content: encoded,
        branch: targetBranch,
        sha: existingSha,
      }),
    });

    if (!putRes.ok) {
      const errJson = await putRes.json().catch(() => ({}));
      throw new Error(`Failed to push ${f.name}: ${errJson.message || putRes.statusText}`);
    }
    isInitialized = true;
  }

  return {
    success: true,
    branch: targetBranch,
    filesPushed: files.length,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}

/**
 * Pulls files from a GitHub repository into the workspace
 */
export async function pullWorkspaceFromGitHub(repoUrl, token = '', branch = 'main') {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL. Format: https://github.com/owner/repo');
  }

  const { owner, repo } = parsed;
  const targetBranch = branch.trim() || 'main';
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  // 1. Get the Git tree recursively
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, { headers });
  if (treeRes.status === 404) {
    throw new Error(`Branch "${targetBranch}" or repository "${owner}/${repo}" was not found. If this repository is empty, push files to initialize it first.`);
  }
  if (!treeRes.ok) {
    const errJson = await treeRes.json().catch(() => ({}));
    throw new Error(errJson.message || `Failed to fetch repository tree (${treeRes.status})`);
  }

  const treeData = await treeRes.json();
  const blobs = (treeData.tree || []).filter((item) => item.type === 'blob' && !item.path.startsWith('.git/'));

  if (blobs.length === 0) {
    return {
      success: true,
      files: [],
      branch: targetBranch,
      message: 'Repository is empty (0 files found).',
    };
  }

  // 2. Fetch content for each blob
  const pulledFiles = [];
  for (const blob of blobs) {
    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${blob.sha}`, { headers });
    if (!blobRes.ok) continue;

    const blobData = await blobRes.json();
    let content = '';
    if (blobData.encoding === 'base64') {
      content = base64ToUtf8(blobData.content);
    } else {
      content = blobData.content || '';
    }

    const detectedLang = detectLanguageByFilename(blob.path);
    pulledFiles.push({
      id: `gh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: blob.path,
      content,
      language: detectedLang,
    });
  }

  return {
    success: true,
    files: pulledFiles,
    branch: targetBranch,
    filesCount: pulledFiles.length,
    sha: treeData.sha?.substring(0, 7) || 'HEAD',
  };
}
