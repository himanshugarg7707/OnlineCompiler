import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  GitPullRequest,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  FileCode,
  ShieldCheck,
  Key,
  FolderGit2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  FilePlus,
  FileDiff,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  getGitRepository,
  saveGitRepository,
  getCurrentBranch,
  getBranchList,
  createBranch,
  switchBranch,
  getCommitHistory,
  stageAllFiles,
  unstageAllFiles,
  stageFile,
  unstageFile,
  commitStagedFiles,
  getWorkspaceGitStatus,
} from '../services/gitService';
import {
  getGitHubConfig,
  saveGitHubConfig,
  testGitHubRepo,
  pushWorkspaceToGitHub,
  pullWorkspaceFromGitHub,
  parseGitHubUrl,
} from '../services/githubRemoteService';
import './GitPage.css';

export default function GitPage() {
  const { state, dispatch, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('remote'); // 'remote' | 'changes' | 'history'

  // GitHub Config State
  const [ghConfig, setGhConfig] = useState(getGitHubConfig);
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | { ok: boolean, msg: string, repoData?: any }
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Commit & Staging State
  const [commitMessage, setCommitMessage] = useState('');
  const [gitStatus, setGitStatus] = useState(() => getWorkspaceGitStatus(state.files));
  const [branches, setBranches] = useState(getBranchList);
  const [commits, setCommits] = useState(getCommitHistory);
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState(null);

  const curBranch = getCurrentBranch();

  // Refresh git status whenever files change or tab loads
  const refreshGit = () => {
    const status = getWorkspaceGitStatus(state.files);
    setGitStatus(status);
    setBranches(getBranchList());
    setCommits(getCommitHistory());
  };

  useEffect(() => {
    refreshGit();
  }, [state.files]);

  // Handle GitHub Config Input Changes
  const handleConfigChange = (field, value) => {
    const updated = { ...ghConfig, [field]: value };
    setGhConfig(updated);
    saveGitHubConfig(updated);
    setConnectionStatus(null);
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!ghConfig.repoUrl) {
      setConnectionStatus({ ok: false, msg: 'Please enter a GitHub repository URL.' });
      return;
    }
    setIsTesting(true);
    setConnectionStatus(null);
    try {
      const res = await testGitHubRepo(ghConfig.repoUrl, ghConfig.token);
      if (res.success) {
        setConnectionStatus({
          ok: true,
          msg: res.isEmpty
            ? `Connected to ${res.fullName} (Empty repository • Ready for initial push)`
            : `Connected to ${res.fullName} (${res.defaultBranch} branch)`,
          repoData: res,
        });
        showToast('Connected to GitHub repository! 🎉');
      } else {
        setConnectionStatus({ ok: false, msg: res.error });
      }
    } catch (err) {
      setConnectionStatus({ ok: false, msg: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Push to GitHub
  const handlePushToGitHub = async () => {
    if (!ghConfig.repoUrl) {
      showToast('Please enter your GitHub repository URL first.');
      return;
    }
    if (!ghConfig.token) {
      showToast('GitHub Personal Access Token (PAT) is required to push.');
      return;
    }
    setIsPushing(true);
    try {
      const msg = commitMessage.trim() || 'Update code from OnlineCompiler';
      const res = await pushWorkspaceToGitHub(
        state.files,
        ghConfig.repoUrl,
        ghConfig.token,
        msg,
        ghConfig.branch || 'main'
      );
      showToast(`Successfully pushed ${res.filesPushed} files to GitHub! 🚀`);
      setCommitMessage('');
      handleConfigChange('lastSync', new Date().toISOString());
      refreshGit();
      if (res.htmlUrl) {
        setConnectionStatus({
          ok: true,
          msg: `Latest commit pushed successfully to ${ghConfig.branch || 'main'}.`,
          commitUrl: res.htmlUrl,
        });
      }
    } catch (err) {
      showToast(`Push failed: ${err.message}`);
      setConnectionStatus({ ok: false, msg: err.message });
    } finally {
      setIsPushing(false);
    }
  };

  // Pull from GitHub
  const handlePullFromGitHub = async () => {
    if (!ghConfig.repoUrl) {
      showToast('Please enter your GitHub repository URL.');
      return;
    }
    if (!window.confirm('Pulling from GitHub will load files from the remote repository into your workspace. Continue?')) {
      return;
    }
    setIsPulling(true);
    try {
      const res = await pullWorkspaceFromGitHub(
        ghConfig.repoUrl,
        ghConfig.token,
        ghConfig.branch || 'main'
      );

      if (res.files && res.files.length > 0) {
        dispatch({
          type: 'LOAD_WORKSPACE_STATE',
          payload: {
            files: res.files,
            folders: [],
            activeFileId: res.files[0].id,
          },
        });
        showToast(`Pulled ${res.filesCount} files from GitHub! 📥`);
        handleConfigChange('lastSync', new Date().toISOString());
        refreshGit();
      } else {
        showToast(res.message || 'No files found on remote branch.');
      }
    } catch (err) {
      showToast(`Pull failed: ${err.message}`);
      setConnectionStatus({ ok: false, msg: err.message });
    } finally {
      setIsPulling(false);
    }
  };

  // Stage & Commit Handlers
  const handleStageAll = () => {
    stageAllFiles();
    refreshGit();
  };

  const handleUnstageAll = () => {
    unstageAllFiles();
    refreshGit();
  };

  const handleStageOne = (filename) => {
    stageFile(filename);
    refreshGit();
  };

  const handleUnstageOne = (filename) => {
    unstageFile(filename);
    refreshGit();
  };

  const handleLocalCommit = () => {
    if (!commitMessage.trim()) {
      showToast('Please write a commit message.');
      return;
    }
    try {
      const author = `${ghConfig.authorName || 'Developer'} <${ghConfig.authorEmail || 'dev@onlinecompiler.io'}>`;
      const res = commitStagedFiles(state.files, commitMessage.trim(), author);
      showToast(`Committed [${res.commit.hash}] on ${res.branch}! ✨`);
      setCommitMessage('');
      refreshGit();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    try {
      createBranch(newBranchName.trim());
      setNewBranchName('');
      setShowNewBranchInput(false);
      refreshGit();
      showToast(`Created branch: ${newBranchName.trim()}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSwitchBranch = (name) => {
    try {
      switchBranch(name);
      refreshGit();
      showToast(`Switched to branch: ${name}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="git-page-container">
      {/* Top Header */}
      <header className="git-page-header">
        <div className="header-left">
          <button
            type="button"
            className="git-back-btn"
            onClick={() => {
              window.location.hash = '#/editor';
              dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
            }}
            title="Return to code editor"
          >
            <ArrowLeft size={16} />
            <span>Editor</span>
          </button>

          <div className="git-header-title-wrap">
            <div className="git-header-title">
              <FolderGit2 size={18} className="title-icon" />
              <h1>Source Control & Git Studio</h1>
            </div>
            <div className="header-badges">
              <span className="branch-pill">
                <GitBranch size={12} />
                <span>{curBranch}</span>
              </span>
              {ghConfig.repoUrl && (
                <span className="repo-pill" title={ghConfig.repoUrl}>
                  <ExternalLink size={11} />
                  <span>{parseGitHubUrl(ghConfig.repoUrl)?.repo || 'Remote Linked'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="header-tabs">
          <button
            type="button"
            className={`git-tab-btn ${activeTab === 'remote' ? 'active' : ''}`}
            onClick={() => setActiveTab('remote')}
          >
            <UploadCloud size={14} />
            <span>GitHub Remote</span>
          </button>
          <button
            type="button"
            className={`git-tab-btn ${activeTab === 'changes' ? 'active' : ''}`}
            onClick={() => setActiveTab('changes')}
          >
            <FileDiff size={14} />
            <span>Changes ({gitStatus.totalCount})</span>
          </button>
          <button
            type="button"
            className={`git-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <GitCommit size={14} />
            <span>History ({commits.length})</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="git-page-body">
        {/* TAB 1: GITHUB REMOTE SYNC */}
        {activeTab === 'remote' && (
          <div className="remote-view-layout animate-fade-in">
            <div className="remote-hero-card">
              <div className="hero-text-col">
                <div className="hero-badge">
                  <Sparkles size={12} />
                  <span>GitHub Repository Sync</span>
                </div>
                <h2>Connect Any GitHub Repository</h2>
                <p>
                  Paste the URL of an empty repository or existing repo. You can push your complete workspace
                  code directly or pull files into OnlineCompiler seamlessly.
                </p>
              </div>

              <div className="hero-action-buttons">
                <button
                  type="button"
                  className="btn-hero-action primary"
                  onClick={handlePushToGitHub}
                  disabled={isPushing}
                >
                  <UploadCloud size={15} className={isPushing ? 'animate-spin' : ''} />
                  <span>{isPushing ? 'Pushing...' : 'Push to GitHub'}</span>
                </button>
                <button
                  type="button"
                  className="btn-hero-action secondary"
                  onClick={handlePullFromGitHub}
                  disabled={isPulling}
                >
                  <DownloadCloud size={15} className={isPulling ? 'animate-spin' : ''} />
                  <span>{isPulling ? 'Pulling...' : 'Pull from GitHub'}</span>
                </button>
              </div>
            </div>

            {/* Connection Config Card */}
            <div className="git-settings-grid">
              <div className="git-panel-card">
                <div className="panel-card-header">
                  <div className="panel-title">
                    <FolderGit2 size={16} />
                    <h3>Repository Configuration</h3>
                  </div>
                  <button
                    type="button"
                    className="btn-test-conn"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="repo-url-input">GitHub Repository URL</label>
                  <input
                    id="repo-url-input"
                    type="text"
                    className="git-input"
                    placeholder="https://github.com/username/my-empty-repo"
                    value={ghConfig.repoUrl || ''}
                    onChange={(e) => handleConfigChange('repoUrl', e.target.value)}
                  />
                  <span className="field-hint">
                    Supports public or private empty repositories (e.g. <code>https://github.com/user/repo</code>)
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="pat-input">
                    GitHub Personal Access Token (PAT)
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="token-link"
                    >
                      Generate Token <ExternalLink size={10} />
                    </a>
                  </label>
                  <div className="token-input-wrap">
                    <input
                      id="pat-input"
                      type={showToken ? 'text' : 'password'}
                      className="git-input"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                      value={ghConfig.token || ''}
                      onChange={(e) => handleConfigChange('token', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowToken(!showToken)}
                      title={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <span className="field-hint">
                    Required for pushing code or reading private repositories. Token is saved safely in browser storage.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="branch-input">Target Branch</label>
                    <input
                      id="branch-input"
                      type="text"
                      className="git-input"
                      placeholder="main"
                      value={ghConfig.branch || 'main'}
                      onChange={(e) => handleConfigChange('branch', e.target.value)}
                    />
                  </div>
                  <div className="form-group half">
                    <label htmlFor="author-input">Commit Author Name</label>
                    <input
                      id="author-input"
                      type="text"
                      className="git-input"
                      placeholder="Developer"
                      value={ghConfig.authorName || ''}
                      onChange={(e) => handleConfigChange('authorName', e.target.value)}
                    />
                  </div>
                </div>

                {connectionStatus && (
                  <div className={`connection-feedback-box ${connectionStatus.ok ? 'success' : 'error'}`}>
                    {connectionStatus.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <div className="feedback-content">
                      <p className="feedback-msg">{connectionStatus.msg}</p>
                      {connectionStatus.commitUrl && (
                        <a
                          href={connectionStatus.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="commit-external-link"
                        >
                          View Commit on GitHub <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Push Commit Box */}
              <div className="git-panel-card">
                <div className="panel-card-header">
                  <div className="panel-title">
                    <GitCommit size={16} />
                    <h3>Quick Push Workspace</h3>
                  </div>
                  <span className="count-pill">{state.files?.length || 0} Files in Workspace</span>
                </div>

                <p className="panel-desc">
                  Push your entire working directory (all code files, notebooks, and folders) straight to the configured repository.
                </p>

                <div className="form-group">
                  <label htmlFor="commit-msg-input">Commit Message</label>
                  <textarea
                    id="commit-msg-input"
                    className="git-textarea"
                    rows={3}
                    placeholder="e.g. Initial commit • Solved TwoPointer problems"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                  />
                </div>

                <div className="workspace-files-preview">
                  <span className="preview-label">Files ready to be pushed:</span>
                  <div className="preview-file-list">
                    {state.files?.map((f) => (
                      <span key={f.id} className="preview-file-tag">
                        <FileCode size={11} />
                        <span>{f.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="action-row-push">
                  <button
                    type="button"
                    className="btn-main-push"
                    onClick={handlePushToGitHub}
                    disabled={isPushing}
                  >
                    <UploadCloud size={15} className={isPushing ? 'animate-spin' : ''} />
                    <span>{isPushing ? 'Pushing Commit...' : 'Commit & Push to Remote'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOCAL CHANGES & STAGING */}
        {activeTab === 'changes' && (
          <div className="changes-view-layout animate-fade-in">
            <div className="changes-left-column">
              {/* Commit Input Box */}
              <div className="local-commit-card">
                <h3>Commit Changes</h3>
                <textarea
                  className="git-textarea"
                  rows={2}
                  placeholder="Message (Ctrl+Enter to commit)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleLocalCommit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-local-commit"
                  onClick={handleLocalCommit}
                  disabled={gitStatus.staged.length === 0}
                >
                  <Check size={14} />
                  <span>Commit to {curBranch}</span>
                </button>
              </div>

              {/* Staged Changes List */}
              <div className="staging-section">
                <div className="section-header">
                  <div className="header-label">
                    <span className="title">Staged Changes</span>
                    <span className="count">({gitStatus.staged.length})</span>
                  </div>
                  {gitStatus.staged.length > 0 && (
                    <button type="button" className="btn-unstage-all" onClick={handleUnstageAll}>
                      Unstage All
                    </button>
                  )}
                </div>

                <div className="file-items-list">
                  {gitStatus.staged.length === 0 ? (
                    <div className="empty-notice">No files staged.</div>
                  ) : (
                    gitStatus.staged.map((item) => (
                      <div
                        key={item.filename}
                        className={`change-file-item ${selectedDiffFile === item.filename ? 'selected' : ''}`}
                        onClick={() => setSelectedDiffFile(item.filename)}
                      >
                        <span className={`status-badge ${item.status}`}>{item.status[0].toUpperCase()}</span>
                        <span className="filename">{item.filename}</span>
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnstageOne(item.filename);
                          }}
                          title="Unstage"
                        >
                          -
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Unstaged Changes List */}
              <div className="staging-section">
                <div className="section-header">
                  <div className="header-label">
                    <span className="title">Working Tree Changes</span>
                    <span className="count">({gitStatus.unstaged.length})</span>
                  </div>
                  {gitStatus.unstaged.length > 0 && (
                    <button type="button" className="btn-stage-all" onClick={handleStageAll}>
                      Stage All
                    </button>
                  )}
                </div>

                <div className="file-items-list">
                  {gitStatus.unstaged.length === 0 ? (
                    <div className="empty-notice">Working tree clean.</div>
                  ) : (
                    gitStatus.unstaged.map((item) => (
                      <div
                        key={item.filename}
                        className={`change-file-item ${selectedDiffFile === item.filename ? 'selected' : ''}`}
                        onClick={() => setSelectedDiffFile(item.filename)}
                      >
                        <span className={`status-badge ${item.status}`}>{item.status[0].toUpperCase()}</span>
                        <span className="filename">{item.filename}</span>
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageOne(item.filename);
                          }}
                          title="Stage"
                        >
                          +
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: File Diff Viewer */}
            <div className="diff-preview-column">
              {selectedDiffFile ? (
                <div className="diff-view-card">
                  <div className="diff-header">
                    <div className="diff-title">
                      <FileDiff size={15} />
                      <span>{selectedDiffFile}</span>
                    </div>
                  </div>
                  <pre className="diff-content-code">
                    {state.files?.find((f) => f.name === selectedDiffFile)?.content || '// File content'}
                  </pre>
                </div>
              ) : (
                <div className="diff-placeholder">
                  <FileCode size={36} />
                  <p>Select a changed file to view its working contents.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BRANCHES & COMMIT TIMELINE */}
        {activeTab === 'history' && (
          <div className="history-view-layout animate-fade-in">
            {/* Branch Management */}
            <div className="branches-card">
              <div className="branch-header">
                <h3>Branches</h3>
                <button
                  type="button"
                  className="btn-new-branch"
                  onClick={() => setShowNewBranchInput(!showNewBranchInput)}
                >
                  <Plus size={13} />
                  <span>New Branch</span>
                </button>
              </div>

              {showNewBranchInput && (
                <div className="create-branch-row">
                  <input
                    type="text"
                    className="git-input"
                    placeholder="branch-name"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                  />
                  <button type="button" className="btn-confirm-branch" onClick={handleCreateBranch}>
                    Create
                  </button>
                </div>
              )}

              <div className="branch-list">
                {branches.map((b) => (
                  <div
                    key={b.name}
                    className={`branch-item ${b.isCurrent ? 'active-branch' : ''}`}
                    onClick={() => handleSwitchBranch(b.name)}
                  >
                    <div className="branch-info">
                      <GitBranch size={13} />
                      <span className="branch-name">{b.name}</span>
                      {b.isCurrent && <span className="active-tag">current</span>}
                    </div>
                    <span className="commit-count">{b.commitCount} commits</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commit Log History */}
            <div className="history-log-card">
              <h3>Commit History</h3>
              <div className="timeline-container">
                {commits.map((c) => (
                  <div key={c.id || c.hash} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="commit-header">
                        <span className="commit-hash">{c.hash}</span>
                        <span className="commit-date">{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="commit-message">{c.message}</p>
                      <div className="commit-author">
                        <span>{c.author}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
