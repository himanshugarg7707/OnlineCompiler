import { createPortal } from 'react-dom';
import { X, Check, FileCode, Radio } from 'lucide-react';
import './IncomingChangesModal.css';

export default function IncomingChangesModal({ isOpen, updateData, onAccept, onDecline }) {
  if (!isOpen || !updateData) return null;

  const { sender, files = [], folders = [], note, timestamp } = updateData;

  const senderName = sender?.username || 'Room Member';
  const senderInitials = sender?.avatarInitials || 'CB';
  const senderColor = sender?.avatarColor || 'linear-gradient(135deg, #00d4ff, #8b5cf6)';

  return createPortal(
    <div className="modal-backdrop incoming-changes-backdrop">
      <div className="incoming-changes-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="incoming-header">
          <div className="incoming-title-group">
            <div className="incoming-live-pulse">
              <Radio size={16} />
            </div>
            <div>
              <h2>Live Workspace Update Received</h2>
              <span className="incoming-subtitle">
                A collaborator has broadcasted workspace changes to your room
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onDecline} title="Dismiss">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="incoming-body">
          {/* Sender Badge */}
          <div className="incoming-sender-card">
            <div className="incoming-sender-avatar" style={{ background: senderColor }}>
              {senderInitials}
            </div>
            <div className="incoming-sender-info">
              <div className="sender-name-row">
                <strong>{senderName}</strong>
                <span className="sender-tag">Collaborator</span>
              </div>
              <span className="sender-note">
                {note || `Sent ${files.length} updated file(s)`} • {new Date(timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Files Summary List */}
          <div className="incoming-files-box">
            <div className="incoming-files-header">
              <span className="files-header-label">Files included in this update ({files.length}):</span>
            </div>

            <div className="incoming-files-scroll">
              {files.map((file, idx) => (
                <div key={file.id || idx} className="incoming-file-item">
                  <FileCode size={14} className="file-item-icon" />
                  <span className="file-item-name">{file.name}</span>
                  <span className="file-item-chars">{file.content?.length || 0} bytes</span>
                </div>
              ))}
            </div>
          </div>

          <div className="incoming-info-hint">
            💡 Accepting will merge and update these files in your active workspace folder.
          </div>

          {/* Actions */}
          <div className="incoming-footer">
            <button type="button" className="btn-decline-changes" onClick={onDecline}>
              <X size={14} />
              <span>Decline / Keep Mine</span>
            </button>

            <button type="button" className="btn-accept-changes" onClick={onAccept}>
              <Check size={14} />
              <span>Accept & Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
