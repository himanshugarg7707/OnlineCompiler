import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  GitMerge,
  Check,
  Search,
  X,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  getBranchList,
  getCurrentBranch,
  createBranch,
  checkoutBranch,
  deleteBranch,
  mergeBranch,
  getSyncStatus,
  setRemoteUrl,
} from '../services/gitService';
import './BranchSwitcherModal.css';

export default function BranchSwitcherModal({ isOpen, onClose, files, onFilesUpdated, showToast }) {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [editingRemote, setEditingRemote] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const inputRef = useRef(null);

  const refreshState = () => {
    const list = getBranchList();
    const curr = getCurrentBranch();
    const sync = getSyncStatus();
    setBranches(list);
    setCurrentBranch(curr);
    setSyncStatus(sync);
    setRemoteUrlInput(sync?.remoteUrl || '');
  };

  useEffect(() => {
    if (isOpen) {
      refreshState();
      setIsCreating(false);
      setNewBranchName('');
      setSearchQuery('');
      setConfirmDelete(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, searchQuery]);

  const handleCheckout = (branchName) => {
    if (branchName === currentBranch) {
      onClose();
      return;
    }
    try {
      const res = checkoutBranch(branchName, files);
      if (res.success) {
        showToast(`Switched to branch "${branchName}" 🌿`);
        if (onFilesUpdated && res.files) {
          onFilesUpdated(res.files);
        }
        refreshState();
        onClose();
      }
    } catch (err) {
      showToast(`Checkout failed: ${err.message}`);
    }
  };

  const handleCreate = (e) => {
    e?.preventDefault();
    const name = (newBranchName || searchQuery).trim();
    if (!name) return;
    try {
      const res = createBranch(name, currentBranch, files);
      if (res.success) {
        // Automatically switch to the newly created branch
        const checkoutRes = checkoutBranch(res.branchName, files);
        if (onFilesUpdated && checkoutRes.files) {
          onFilesUpdated(checkoutRes.files);
        }
        showToast(`Created & checked out branch "${res.branchName}" ✨`);
        refreshState();
        onClose();
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDelete = (branchName, e) => {
    e.stopPropagation();
    try {
      deleteBranch(branchName);
      showToast(`Deleted branch "${branchName}" 🗑️`);
      setConfirmDelete(null);
      refreshState();
    } catch (err) {
      showToast(`Cannot delete: ${err.message}`);
    }
  };

  const handleMerge = (sourceBranch, e) => {
    e.stopPropagation();
    try {
      const res = mergeBranch(sourceBranch, files);
      if (res.success) {
        showToast(res.message);
        if (onFilesUpdated && res.files) {
          onFilesUpdated(res.files);
        }
        refreshState();
        onClose();
      }
    } catch (err) {
      showToast(`Merge failed: ${err.message}`);
    }
  };

  const handleSaveRemote = () => {
    if (!remoteUrlInput.trim()) return;
    setRemoteUrl(remoteUrlInput.trim());
    setEditingRemote(false);
    showToast('Updated remote origin URL 🌐');
    refreshState();
  };

  if (!isOpen) return null;

  return (
    <div className="branch-modal-overlay" onClick={onClose}>
      <div
        className="branch-modal-container animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="branch-modal-header">
          <div className="branch-modal-title">
            <GitBranch size={18} className="branch-header-icon" />
            <span>Git Branches</span>
            <span className="branch-header-count">{branches.length}</span>
          </div>
          <button className="branch-modal-close" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Search & Create Input Bar */}
        <div className="branch-modal-search-bar">
          <Search size={15} className="branch-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="branch-search-input"
            placeholder="Search branches or type name to create..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (filteredBranches.length === 1 && filteredBranches[0].name.toLowerCase() === searchQuery.toLowerCase()) {
                  handleCheckout(filteredBranches[0].name);
                } else if (searchQuery.trim()) {
                  handleCreate();
                }
              }
            }}
          />
          {searchQuery && (
            <button className="branch-search-clear" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick Create Action Prompt if query doesn't match an exact branch */}
        {searchQuery.trim() && !branches.some((b) => b.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
          <div className="branch-create-prompt" onClick={handleCreate}>
            <Plus size={15} className="branch-create-plus" />
            <span>
              Create new branch <strong>"{searchQuery.trim()}"</strong> from <code>{currentBranch}</code>
            </span>
            <span className="branch-create-badge">Press Enter ↵</span>
          </div>
        )}

        {/* Branch List */}
        <div className="branch-modal-list">
          {filteredBranches.length === 0 ? (
            <div className="branch-empty-state">
              <span>No branches matching "{searchQuery}"</span>
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isCurrent = b.name === currentBranch;
              return (
                <div
                  key={b.name}
                  className={`branch-list-item ${isCurrent ? 'is-active-branch' : ''}`}
                  onClick={() => handleCheckout(b.name)}
                >
                  <div className="branch-item-main">
                    <div className="branch-item-icon-wrap">
                      {isCurrent ? (
                        <Check size={16} className="branch-icon-current" />
                      ) : (
                        <GitBranch size={16} className="branch-icon-normal" />
                      )}
                    </div>
                    <div className="branch-item-details">
                      <div className="branch-item-name-row">
                        <span className="branch-item-name">{b.name}</span>
                        {isCurrent && <span className="branch-badge-current">CURRENT</span>}
                        {b.ahead > 0 && (
                          <span className="branch-badge-ahead" title={`${b.ahead} commit(s) ahead of remote`}>
                            <ArrowUp size={11} /> {b.ahead}
                          </span>
                        )}
                        {b.behind > 0 && (
                          <span className="branch-badge-behind" title={`${b.behind} commit(s) behind remote`}>
                            <ArrowDown size={11} /> {b.behind}
                          </span>
                        )}
                      </div>
                      {b.lastCommit && (
                        <div className="branch-item-commit">
                          <code className="branch-commit-hash">{b.lastCommit.hash}</code>
                          <span className="branch-commit-msg">{b.lastCommit.message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for other branches */}
                  {!isCurrent && (
                    <div className="branch-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="branch-action-btn merge-btn"
                        onClick={(e) => handleMerge(b.name, e)}
                        title={`Merge "${b.name}" into current "${currentBranch}"`}
                      >
                        <GitMerge size={13} />
                        <span>Merge</span>
                      </button>

                      {confirmDelete === b.name ? (
                        <div className="branch-confirm-delete">
                          <span>Delete?</span>
                          <button
                            className="btn-delete-yes"
                            onClick={(e) => handleDelete(b.name, e)}
                          >
                            Yes
                          </button>
                          <button
                            className="btn-delete-no"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(null);
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          className="branch-action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(b.name);
                          }}
                          title={`Delete branch "${b.name}"`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Remote Information & Footer */}
        <div className="branch-modal-footer">
          <div className="branch-remote-info">
            <span className="remote-label">Remote:</span>
            {editingRemote ? (
              <div className="remote-edit-row">
                <input
                  type="text"
                  className="remote-input"
                  value={remoteUrlInput}
                  onChange={(e) => setRemoteUrlInput(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                />
                <button className="remote-save-btn" onClick={handleSaveRemote}>Save</button>
                <button className="remote-cancel-btn" onClick={() => setEditingRemote(false)}>Cancel</button>
              </div>
            ) : (
              <div className="remote-display-row" onClick={() => setEditingRemote(true)} title="Click to edit remote URL">
                <span className="remote-url">{syncStatus?.remoteUrl}</span>
                <span className="remote-branch">({syncStatus?.remoteBranch})</span>
              </div>
            )}
          </div>
          <div className="branch-footer-shortcuts">
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
