import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  getSavedWorkspaces,
  saveNamedWorkspace,
  deleteSavedWorkspace,
  renameSavedWorkspace,
  exportWorkspaceAsJson,
} from '../services/workspaceService';
import {
  X,
  FolderKanban,
  Save,
  Plus,
  Trash2,
  Download,
  FolderOpen,
  Calendar,
  FileCode,
  Edit2,
  Check,
} from 'lucide-react';
import './WorkspacesModal.css';

export default function WorkspacesModal({ isOpen, onClose }) {
  const { state, handleLoadWorkspaceState, showToast } = useApp();
  const { files, folders, activeFileId, stdin, detectedLanguage } = state;

  const [workspaces, setWorkspaces] = useState([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setWorkspaces(getSavedWorkspaces());
      const defaultName = `${detectedLanguage?.name || 'My'} Project (${files.length} files)`;
      setNewWorkspaceName(defaultName);
    }
  }, [isOpen, files, detectedLanguage]);

  if (!isOpen) return null;

  const handleSaveCurrent = (e) => {
    e.preventDefault();
    const saved = saveNamedWorkspace(
      newWorkspaceName,
      files,
      folders,
      activeFileId,
      stdin,
      detectedLanguage
    );
    setWorkspaces(getSavedWorkspaces());
    showToast(`Workspace "${saved.name}" saved! 💾`);
  };

  const handleLoad = (ws) => {
    if (!ws) return;
    if (handleLoadWorkspaceState) {
      handleLoadWorkspaceState(ws);
    }
    showToast(`Loaded workspace "${ws.name}" 🚀`);
    onClose();
  };

  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`Delete saved workspace "${name}"?`)) {
      const updated = deleteSavedWorkspace(id);
      setWorkspaces(updated);
      showToast('Workspace deleted');
    }
  };

  const handleStartRename = (e, ws) => {
    e.stopPropagation();
    setEditingId(ws.id);
    setEditingName(ws.name);
  };

  const handleFinishRename = (id) => {
    if (editingName.trim()) {
      const updated = renameSavedWorkspace(id, editingName.trim());
      setWorkspaces(updated);
    }
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="workspaces-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="workspaces-header">
          <div className="workspaces-title-group">
            <div className="workspaces-icon-box">
              <FolderKanban size={18} />
            </div>
            <div>
              <h2>Saved Workspaces & Projects</h2>
              <span className="workspaces-subtitle">
                Save multi-file workspaces and switch between projects anytime
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Save Current Workspace Bar */}
        <form className="save-workspace-bar" onSubmit={handleSaveCurrent}>
          <div className="save-input-group">
            <span className="save-label">Save Current Work:</span>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. LeetCode Java Problems, Fullstack App..."
              className="save-workspace-input"
            />
          </div>
          <button type="submit" className="btn-save-workspace">
            <Save size={13} />
            <span>Save Workspace</span>
          </button>
        </form>

        {/* Workspaces List */}
        <div className="workspaces-body">
          <div className="workspaces-list-header">
            <span>Your Workspaces ({workspaces.length})</span>
          </div>

          <div className="workspaces-cards-grid">
            {workspaces.length === 0 ? (
              <div className="workspaces-empty">
                <FolderOpen size={36} />
                <p>No saved workspaces yet</p>
                <span>Save your current workspace above to restore or switch back to it anytime.</span>
              </div>
            ) : (
              workspaces.map((ws) => (
                <div key={ws.id} className="workspace-card" onClick={() => handleLoad(ws)}>
                  <div className="workspace-card-top">
                    <div className="workspace-card-title-wrap">
                      <FileCode size={16} className="ws-icon" />
                      {editingId === ws.id ? (
                        <div className="ws-rename-box" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(ws.id)}
                            className="ws-rename-input"
                            autoFocus
                          />
                          <button
                            className="btn-ws-check"
                            onClick={() => handleFinishRename(ws.id)}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <strong className="workspace-name">{ws.name}</strong>
                      )}
                    </div>

                    <div className="workspace-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-ws-icon"
                        onClick={(e) => handleStartRename(e, ws)}
                        title="Rename workspace"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn-ws-icon"
                        onClick={() => exportWorkspaceAsJson(ws)}
                        title="Export workspace as JSON"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        className="btn-ws-icon delete"
                        onClick={(e) => handleDelete(e, ws.id, ws.name)}
                        title="Delete workspace"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="workspace-card-meta">
                    <span className="ws-badge">{ws.language || 'Code'}</span>
                    <span className="ws-file-count">{ws.fileCount || ws.files?.length || 1} files</span>
                    <span className="ws-time">
                      <Calendar size={11} /> {formatDate(ws.updatedAt)}
                    </span>
                  </div>

                  <div className="workspace-card-bottom">
                    <button className="btn-load-workspace" onClick={() => handleLoad(ws)}>
                      <FolderOpen size={13} />
                      <span>Load Workspace</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
