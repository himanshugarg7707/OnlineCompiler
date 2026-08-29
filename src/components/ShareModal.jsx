import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { generateShareUrl } from '../services/shareService';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Code,
  CheckSquare,
  Square,
  Layers,
  Lock,
} from 'lucide-react';
import { isItemProtected } from '../services/securityService';
import './ShareModal.css';

export default function ShareModal({ isOpen, onClose }) {
  const { state, showToast } = useApp();
  const { files, activeFileId, stdin, detectedLanguage } = state;

  const [shareScope, setShareScope] = useState('all'); // 'all' | 'custom'
  const [selectedFileIds, setSelectedFileIds] = useState(() => files.map((f) => f.id));
  const [copied, setCopied] = useState(false);

  // Files to include in share
  const filesToShare = useMemo(() => {
    if (shareScope === 'all') return files;
    return files.filter((f) => selectedFileIds.includes(f.id));
  }, [files, shareScope, selectedFileIds]);

  const activeSharedId = filesToShare.some((f) => f.id === activeFileId)
    ? activeFileId
    : filesToShare[0]?.id || null;

  const shareUrl = useMemo(() => {
    return generateShareUrl(filesToShare, activeSharedId, stdin);
  }, [filesToShare, activeSharedId, stdin]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('Share link copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleSelectFile = (fileId) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFileIds(files.map((f) => f.id));
  };

  const handleDeselectAll = () => {
    // Keep at least active file
    setSelectedFileIds(activeFileId ? [activeFileId] : [files[0]?.id]);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="share-header">
          <div className="share-title-group">
            <Share2 size={20} className="share-icon" />
            <div>
              <h2>Share Code & Workspace</h2>
              <span className="share-subtitle">
                {filesToShare.length} {filesToShare.length === 1 ? 'file' : 'files'} included • {detectedLanguage?.name}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="share-body">
          {/* Scope Selector: Full Workspace vs Selective Files */}
          <div className="share-scope-selector">
            <label
              className={`scope-pill ${shareScope === 'all' ? 'active' : ''}`}
              onClick={() => setShareScope('all')}
            >
              <input
                type="radio"
                name="shareScope"
                checked={shareScope === 'all'}
                onChange={() => setShareScope('all')}
              />
              <Layers size={13} />
              <span>Full Workspace ({files.length})</span>
            </label>

            <label
              className={`scope-pill ${shareScope === 'custom' ? 'active' : ''}`}
              onClick={() => setShareScope('custom')}
            >
              <input
                type="radio"
                name="shareScope"
                checked={shareScope === 'custom'}
                onChange={() => setShareScope('custom')}
              />
              <CheckSquare size={13} />
              <span>Select Specific Files ({filesToShare.length})</span>
            </label>
          </div>

          {/* Custom File Selection Checklist */}
          {shareScope === 'custom' && (
            <div className="share-custom-checklist-box animate-slide-up">
              <div className="checklist-header">
                <span className="checklist-title">Choose files to include:</span>
                <div className="checklist-actions">
                  <button type="button" className="btn-check-action" onClick={handleSelectAll}>
                    Select All
                  </button>
                  <span>•</span>
                  <button type="button" className="btn-check-action" onClick={handleDeselectAll}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="checklist-files-list">
                {files.map((file) => {
                  const isChecked = selectedFileIds.includes(file.id);
                  const isLocked = isItemProtected(file.name);

                  return (
                    <label key={file.id} className="checklist-file-item">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectFile(file.id)}
                      />
                      <span className="file-icon-mini">{file.language?.icon || '📄'}</span>
                      <span className="file-name-text">{file.name}</span>
                      {isLocked && (
                        <span className="file-locked-tag" title="Password lock preserved">
                          <Lock size={10} />
                          <span>Protected</span>
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Share Link Box */}
          <div className="share-link-box">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="share-url-input"
              onClick={(e) => e.target.select()}
            />
            <button className="btn-copy-share" onClick={handleCopy}>
              {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Stats and Features */}
          <div className="share-stats-row">
            <div className="share-stat-item">
              <Code size={13} />
              <span>{filesToShare.length} files included</span>
            </div>
            <div className="share-stat-item">
              <Lock size={13} />
              <span>Locks preserved on destination</span>
            </div>
            <div className="share-stat-item">
              <Globe size={13} />
              <span>LZ-String compressed</span>
            </div>
          </div>

          <div className="share-actions-row">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-open-preview"
            >
              <ExternalLink size={13} />
              <span>Test Link in New Tab</span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
