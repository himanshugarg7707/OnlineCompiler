import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { X, Save, Download, FolderPlus, FileCode, Check } from 'lucide-react';
import './SaveAsModal.css';

export default function SaveAsModal({ isOpen, targetFile, onClose }) {
  const { state, handleAddFile, showToast } = useApp();
  const { files, folders, activeFileId } = state;

  const currentFile = targetFile || files.find((f) => f.id === activeFileId) || files[0];

  const [fileName, setFileName] = useState('');
  const [saveAction, setSaveAction] = useState('download'); // 'download' | 'workspace'
  const [targetFolder, setTargetFolder] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && currentFile) {
      // Extract base name without folder prefix
      const baseName = currentFile.name.includes('/')
        ? currentFile.name.split('/').pop()
        : currentFile.name;
      setFileName(baseName);
      setError('');
      setSaveAction('download');
      setTargetFolder('');
    }
  }, [isOpen, currentFile]);

  if (!isOpen || !currentFile) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = fileName.trim();
    if (!trimmed) {
      setError('Please provide a valid file name');
      return;
    }

    if (saveAction === 'download') {
      try {
        const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = trimmed;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        showToast(`Saved & downloaded ${trimmed} 💾`);
        onClose();
      } catch (err) {
        setError(`Download failed: ${err.message}`);
      }
    } else {
      // Save copy in workspace
      const finalName = targetFolder ? `${targetFolder}/${trimmed}` : trimmed;
      handleAddFile(finalName, currentFile.content);
      showToast(`Saved copy ${finalName} in workspace 📁`);
      onClose();
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="save-as-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="save-as-header">
          <div className="save-as-title-group">
            <Save size={18} className="save-as-icon" />
            <div>
              <h2>Save As</h2>
              <span className="save-as-subtitle">
                Save file to local disk or create a copy in workspace
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="save-as-body">
          {/* File Name */}
          <div className="save-field-group">
            <label className="save-field-label">File Name</label>
            <div className="save-input-wrap">
              <FileCode size={14} className="save-input-icon" />
              <input
                type="text"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  setError('');
                }}
                placeholder="e.g. Solution.java"
                autoFocus
                className="save-text-input"
              />
            </div>
          </div>

          {/* Action Destination */}
          <div className="save-field-group">
            <label className="save-field-label">Save Destination</label>
            <div className="save-radio-options">
              <label
                className={`save-radio-card ${saveAction === 'download' ? 'selected' : ''}`}
                onClick={() => setSaveAction('download')}
              >
                <input
                  type="radio"
                  name="saveDest"
                  checked={saveAction === 'download'}
                  onChange={() => setSaveAction('download')}
                />
                <Download size={16} />
                <div className="radio-card-text">
                  <strong>Download to Device</strong>
                  <span>Save file directly onto your computer</span>
                </div>
              </label>

              <label
                className={`save-radio-card ${saveAction === 'workspace' ? 'selected' : ''}`}
                onClick={() => setSaveAction('workspace')}
              >
                <input
                  type="radio"
                  name="saveDest"
                  checked={saveAction === 'workspace'}
                  onChange={() => setSaveAction('workspace')}
                />
                <FolderPlus size={16} />
                <div className="radio-card-text">
                  <strong>Save Copy in Workspace</strong>
                  <span>Duplicate as a new file in your IDE</span>
                </div>
              </label>
            </div>
          </div>

          {/* Target Folder Selector (if workspace chosen) */}
          {saveAction === 'workspace' && (
            <div className="save-field-group animate-slide-up">
              <label className="save-field-label">Target Folder</label>
              <select
                className="save-select-folder"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
              >
                <option value="">Root directory (/)</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    📁 {f}/
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="save-error-msg">{error}</div>}

          {/* Footer Actions */}
          <div className="save-as-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save-confirm">
              <Check size={14} />
              <span>{saveAction === 'download' ? 'Download File' : 'Save Copy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
