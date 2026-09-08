import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { getHistorySnapshots, deleteSnapshot, clearAllHistory } from '../services/historyService';
import {
  X,
  History,
  RotateCcw,
  Trash2,
  FileCode,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  GitCompare,
  Code2,
} from 'lucide-react';
import './HistoryModal.css';

export default function HistoryModal({ isOpen, onClose }) {
  const { state, handleCodeChange, showToast } = useApp();
  const { activeFileId, files } = state;
  const activeFile = files.find((f) => f.id === activeFileId);

  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('current'); // 'current' | 'all'
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'diff'

  useEffect(() => {
    if (isOpen) {
      const list = getHistorySnapshots();
      setSnapshots(list);
      if (list.length > 0) {
        const firstMatching = list.find((s) => s.fileName === activeFile?.name) || list[0];
        setSelectedSnapshotId(firstMatching.id);
      }
    }
  }, [isOpen, activeFile]);

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      const matchesSearch = s.fileName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (filterMode === 'current' && activeFile) {
        return matchesSearch && s.fileName === activeFile.name;
      }
      return matchesSearch;
    });
  }, [snapshots, searchQuery, filterMode, activeFile]);

  // Simple line-by-line diff comparison calculation
  const diffLines = useMemo(() => {
    const snap = snapshots.find((s) => s.id === selectedSnapshotId);
    if (!snap || !activeFile) return [];
    const snapLines = (snap.content || '').split('\n');
    const currLines = (activeFile.content || '').split('\n');

    const maxLines = Math.max(snapLines.length, currLines.length);
    const result = [];

    for (let i = 0; i < maxLines; i++) {
      const snapLine = snapLines[i];
      const currLine = currLines[i];

      if (snapLine === currLine) {
        result.push({ type: 'same', text: snapLine ?? '', lineNum: i + 1 });
      } else if (snapLine !== undefined && currLine !== undefined) {
        result.push({ type: 'modified-old', text: snapLine, lineNum: i + 1 });
        result.push({ type: 'modified-new', text: currLine, lineNum: i + 1 });
      } else if (snapLine !== undefined) {
        result.push({ type: 'removed', text: snapLine, lineNum: i + 1 });
      } else if (currLine !== undefined) {
        result.push({ type: 'added', text: currLine, lineNum: i + 1 });
      }
    }
    return result;
  }, [selectedSnapshotId, snapshots, activeFile]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  const handleRestore = (snapshot) => {
    if (!snapshot) return;
    handleCodeChange(snapshot.content);
    showToast(`Restored snapshot for ${snapshot.fileName} ⏳`);
    onClose();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    const updated = deleteSnapshot(id);
    setSnapshots(updated);
    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(updated[0]?.id || null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all version history snapshots?')) {
      clearAllHistory();
      setSnapshots([]);
      setSelectedSnapshotId(null);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="history-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="history-header">
          <div className="history-title-group">
            <div className="history-icon-box">
              <History size={18} className="history-icon" />
            </div>
            <div>
              <h2>Version History & Snapshots</h2>
              <span className="history-subtitle">
                Inspect autosaved snapshots and restore code instantly
              </span>
            </div>
          </div>
          <div className="history-header-actions">
            {snapshots.length > 0 && (
              <button
                className="btn-clear-history"
                onClick={handleClearAll}
                title="Clear all saved history snapshots"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="history-body">
          {/* Left Timeline Panel */}
          <div className="history-timeline-panel">
            {/* Search and Filters */}
            <div className="timeline-search-bar">
              <div className="timeline-search-input-wrap">
                <Search size={13} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter snapshots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="timeline-search-input"
                />
              </div>

              <div className="timeline-filter-pills">
                <button
                  className={`filter-pill ${filterMode === 'current' ? 'active' : ''}`}
                  onClick={() => setFilterMode('current')}
                >
                  Current File
                </button>
                <button
                  className={`filter-pill ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  All ({snapshots.length})
                </button>
              </div>
            </div>

            {/* Snapshots List */}
            <div className="history-snapshot-list">
              {filteredSnapshots.length === 0 ? (
                <div className="history-empty">
                  <Clock size={32} />
                  <p>No snapshots found</p>
                  <span>
                    {filterMode === 'current'
                      ? `No snapshots saved for "${activeFile?.name}". Switch to "All" to see others.`
                      : 'Snapshots are saved automatically as you write and run code.'}
                  </span>
                </div>
              ) : (
                filteredSnapshots.map((snap) => {
                  const isSelected = snap.id === selectedSnapshotId;
                  const isCurrentFile = snap.fileName === activeFile?.name;

                  return (
                    <div
                      key={snap.id}
                      className={`snapshot-item ${isSelected ? 'selected' : ''} ${isCurrentFile ? 'current-file' : ''}`}
                      onClick={() => setSelectedSnapshotId(snap.id)}
                    >
                      <div className="snapshot-item-header">
                        <div className="snapshot-file-name">
                          <FileCode size={13} />
                          <span>{snap.fileName}</span>
                          {isCurrentFile && <span className="active-tag">Active</span>}
                        </div>
                        <span className="snapshot-time">{formatTime(snap.timestamp)}</span>
                      </div>

                      <div className="snapshot-item-meta">
                        <span className="snapshot-date">
                          <Calendar size={11} /> {formatDate(snap.timestamp)}
                        </span>
                        <span className="snapshot-chars">
                          {(snap.content || '').split('\n').length} lines
                        </span>
                      </div>

                      <button
                        className="btn-delete-snapshot"
                        onClick={(e) => handleDelete(e, snap.id)}
                        title="Delete snapshot"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Preview Panel */}
          <div className="history-preview-panel">
            {selectedSnapshot ? (
              <div className="history-preview-wrapper">
                <div className="preview-header-row">
                  <div className="preview-info">
                    <div className="preview-info-top">
                      <FileCode size={15} />
                      <strong>{selectedSnapshot.fileName}</strong>
                      <span className="preview-timestamp">
                        {new Date(selectedSnapshot.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="preview-actions">
                    <div className="view-mode-toggle">
                      <button
                        className={`btn-view-mode ${viewMode === 'preview' ? 'active' : ''}`}
                        onClick={() => setViewMode('preview')}
                        title="View snapshot code"
                      >
                        <Code2 size={13} />
                        <span>Code</span>
                      </button>
                      <button
                        className={`btn-view-mode ${viewMode === 'diff' ? 'active' : ''}`}
                        onClick={() => setViewMode('diff')}
                        title="Compare snapshot against current code"
                      >
                        <GitCompare size={13} />
                        <span>Diff</span>
                      </button>
                    </div>

                    <button
                      className="btn-restore-version"
                      onClick={() => handleRestore(selectedSnapshot)}
                      title="Restore this version into editor"
                    >
                      <RotateCcw size={13} />
                      <span>Restore Code</span>
                    </button>
                  </div>
                </div>

                {/* Code Preview Body */}
                <div className="preview-code-scroll">
                  {viewMode === 'preview' ? (
                    <div className="preview-code-container">
                      <div className="code-line-numbers">
                        {(selectedSnapshot.content || '').split('\n').map((_, idx) => (
                          <span key={idx}>{idx + 1}</span>
                        ))}
                      </div>
                      <pre className="preview-code-text">{selectedSnapshot.content}</pre>
                    </div>
                  ) : (
                    <div className="diff-view-container">
                      <div className="diff-banner">
                        <span>🔴 Snapshot (Old) vs 🟢 Current Active File</span>
                      </div>
                      {diffLines.map((line, idx) => (
                        <div key={idx} className={`diff-line diff-${line.type}`}>
                          <span className="diff-num">{line.lineNum}</span>
                          <span className="diff-marker">
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified-new' ? '+' : line.type === 'modified-old' ? '-' : ' '}
                          </span>
                          <span className="diff-content">{line.text || ' '}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="history-preview-placeholder">
                <History size={40} />
                <p>Select a snapshot to preview code and compare diff</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
