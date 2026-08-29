import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import './HistoryModal.css';

export default function HistoryModal({ isOpen, onClose }) {
  const { state, handleCodeChange, showToast } = useApp();
  const { activeFileId, files } = state;
  const activeFile = files.find((f) => f.id === activeFileId);

  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const list = getHistorySnapshots();
      setSnapshots(list);
      if (list.length > 0) {
        // Default to first snapshot matching active file, or list[0]
        const firstMatching = list.find((s) => s.fileName === activeFile?.name) || list[0];
        setSelectedSnapshotId(firstMatching.id);
      }
    }
  }, [isOpen, activeFile]);

  if (!isOpen) return null;

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

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="history-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="history-header">
          <div className="history-title-group">
            <History size={20} className="history-icon" />
            <div>
              <h2>Version History & Snapshots</h2>
              <span className="history-subtitle">
                Inspect past autosaves and restore code with one click
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
          {/* Timeline List */}
          <div className="history-timeline">
            <div className="timeline-header">
              <span>Saved Snapshots ({snapshots.length})</span>
            </div>

            <div className="timeline-list">
              {snapshots.length === 0 ? (
                <div className="history-empty">
                  <Clock size={28} />
                  <p>No snapshots yet</p>
                  <span>Snapshots are created automatically when code is executed</span>
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isSelected = snap.id === selectedSnapshotId;
                  const isCurrentFile = snap.fileName === activeFile?.name;

                  return (
                    <div
                      key={snap.id}
                      className={`timeline-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedSnapshotId(snap.id)}
                    >
                      <div className="timeline-item-icon">
                        {isCurrentFile ? (
                          <CheckCircle2 size={15} className="current-icon" />
                        ) : (
                          <FileCode size={15} />
                        )}
                      </div>

                      <div className="timeline-item-info">
                        <div className="timeline-item-top">
                          <strong className="timeline-filename">{snap.fileName}</strong>
                          <span className="timeline-time">{formatTime(snap.timestamp)}</span>
                        </div>
                        <div className="timeline-item-bottom">
                          <span className="timeline-date">
                            <Calendar size={11} /> {formatDate(snap.timestamp)}
                          </span>
                          <span className="timeline-chars">{snap.content.length} chars</span>
                        </div>
                      </div>

                      <button
                        className="btn-delete-snap"
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

          {/* Preview Panel */}
          <div className="history-preview">
            {selectedSnapshot ? (
              <div className="preview-container">
                <div className="preview-header">
                  <div className="preview-file-info">
                    <FileCode size={16} className="preview-icon" />
                    <strong>{selectedSnapshot.fileName}</strong>
                    <span className="preview-timestamp">
                      {new Date(selectedSnapshot.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <button
                    className="btn-restore"
                    onClick={() => handleRestore(selectedSnapshot)}
                    title="Restore code into current editor"
                  >
                    <RotateCcw size={14} />
                    <span>Restore Version</span>
                  </button>
                </div>

                <div className="preview-code-wrap">
                  <pre className="preview-code">{selectedSnapshot.content}</pre>
                </div>
              </div>
            ) : (
              <div className="history-preview-placeholder">
                <span>Select a snapshot from the timeline to preview and restore</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
