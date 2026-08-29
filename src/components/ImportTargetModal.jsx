import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { X, FolderInput, FolderPlus, Folder, FileUp, Check } from 'lucide-react';
import './ImportTargetModal.css';

export default function ImportTargetModal({ isOpen, mode = 'files', onProceed, onClose }) {
  const { state } = useApp();
  const { folders } = state;

  const [destType, setDestType] = useState('root'); // 'root' | 'existing' | 'new'
  const [selectedFolder, setSelectedFolder] = useState(folders[0] || '');
  const [newFolderName, setNewFolderName] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    let targetPath = '';
    if (destType === 'existing') {
      targetPath = selectedFolder;
    } else if (destType === 'new') {
      targetPath = newFolderName.trim().replace(/\/+$/, '');
    }

    onProceed(targetPath);
    onClose();
  };

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-target-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="import-header">
          <div className="import-title-group">
            {mode === 'folder' ? (
              <FolderInput size={18} className="import-icon" />
            ) : (
              <FileUp size={18} className="import-icon" />
            )}
            <div>
              <h2>{mode === 'folder' ? 'Import Folder' : 'Import Files'}</h2>
              <span className="import-subtitle">Choose where to place imported content</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="import-body">
          <label className="import-field-label">Target Destination</label>

          <div className="import-dest-options">
            {/* Root */}
            <label
              className={`import-radio-card ${destType === 'root' ? 'selected' : ''}`}
              onClick={() => setDestType('root')}
            >
              <input
                type="radio"
                name="destType"
                checked={destType === 'root'}
                onChange={() => setDestType('root')}
              />
              <Folder size={15} />
              <div className="dest-card-info">
                <strong>Root Workspace (/)</strong>
                <span>Import directly into the top-level workspace</span>
              </div>
            </label>

            {/* Existing Folder */}
            {folders.length > 0 && (
              <label
                className={`import-radio-card ${destType === 'existing' ? 'selected' : ''}`}
                onClick={() => setDestType('existing')}
              >
                <input
                  type="radio"
                  name="destType"
                  checked={destType === 'existing'}
                  onChange={() => setDestType('existing')}
                />
                <FolderInput size={15} />
                <div className="dest-card-info">
                  <strong>Existing Folder</strong>
                  <span>Place into an existing directory</span>
                </div>
              </label>
            )}

            {destType === 'existing' && folders.length > 0 && (
              <div className="dest-subfield animate-slide-up">
                <select
                  className="dest-select-folder"
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      📁 {f}/
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Create New Folder */}
            <label
              className={`import-radio-card ${destType === 'new' ? 'selected' : ''}`}
              onClick={() => setDestType('new')}
            >
              <input
                type="radio"
                name="destType"
                checked={destType === 'new'}
                onChange={() => setDestType('new')}
              />
              <FolderPlus size={15} />
              <div className="dest-card-info">
                <strong>Create New Folder</strong>
                <span>Create a new directory for these files</span>
              </div>
            </label>

            {destType === 'new' && (
              <div className="dest-subfield animate-slide-up">
                <input
                  type="text"
                  placeholder="e.g. components or utils/math"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="dest-text-input"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="import-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-import-confirm" onClick={handleConfirm}>
              <Check size={14} />
              <span>Continue to File Picker</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
