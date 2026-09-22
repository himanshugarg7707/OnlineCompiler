import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Copy,
  ClipboardCopy,
  FileText,
  Edit2,
  Download,
  Play,
  Trash2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import LanguageIcon from './LanguageIcon';
import './FileOptionsMenu.css';

export default function FileOptionsMenu({
  file,
  folderPath = '',
  position,
  onClose,
  onStartRename,
  onProtect,
}) {
  const menuRef = useRef(null);
  const {
    handleDuplicateFile,
    handleCopyFileContent,
    handleCopyFilePath,
    handleSaveActiveFile,
    handleCloseFile,
    handleSelectFile,
    handleRunCode,
  } = useApp();

  // Close on outside click or Escape key
  useEffect(() => {
    function handleMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!file) return null;

  const baseName = file.name.includes('/') ? file.name.split('/').pop() : file.name;
  const duplicatePreviewName = baseName.replace(/\.([^.]+)$/, '_copy.$1');

  // Constrain position to viewport
  const menuWidth = 260;
  const menuHeight = 360;
  const safeX = Math.max(10, Math.min(position?.x || 150, window.innerWidth - menuWidth - 16));
  const safeY = Math.max(10, Math.min(position?.y || 150, window.innerHeight - menuHeight - 16));

  return (
    <div
      className="file-options-menu-backdrop"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="file-options-menu"
        ref={menuRef}
        style={{ top: `${safeY}px`, left: `${safeX}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with filename & language icon */}
        <div className="file-options-header">
          <span className="file-options-icon">
            <LanguageIcon language={file.language} filename={file.name} size={15} />
          </span>
          <div className="file-options-info">
            <span className="file-options-filename" title={file.name}>
              {baseName}
            </span>
            <span className="file-options-meta">
              {file.language?.name || 'Code File'}
            </span>
          </div>
        </div>

        <div className="file-options-divider" />

        {/* Section 1: Copy & Duplication Actions */}
        <div className="file-options-group-label">Copy & Duplicate</div>

        <button
          className="file-options-btn highlight"
          onClick={() => {
            handleDuplicateFile(file);
            onClose();
          }}
          title={`Make a cloned copy (${duplicatePreviewName})`}
        >
          <Copy size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Duplicate & Make Copy</span>
            <span className="btn-subtext">Clone as <code>{duplicatePreviewName}</code></span>
          </div>
        </button>

        <button
          className="file-options-btn"
          onClick={() => {
            handleCopyFileContent(file);
            onClose();
          }}
          title="Copy entire file content to clipboard"
        >
          <ClipboardCopy size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Copy Code to Clipboard</span>
            <span className="btn-subtext">Copies all text to system clipboard</span>
          </div>
        </button>

        <button
          className="file-options-btn"
          onClick={() => {
            handleCopyFilePath(file);
            onClose();
          }}
          title="Copy relative file path"
        >
          <FileText size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Copy File Path</span>
            <span className="btn-subtext"><code>{file.name}</code></span>
          </div>
        </button>

        <div className="file-options-divider" />

        {/* Section 2: Editor & Execution Actions */}
        <div className="file-options-group-label">File Actions</div>

        <button
          className="file-options-btn"
          onClick={() => {
            handleSelectFile(file.id);
            handleRunCode?.();
            onClose();
          }}
          title="Open in editor and run immediately"
        >
          <Play size={14} className="btn-icon run-icon" />
          <div className="btn-text">
            <span className="btn-title">Run Code</span>
            <span className="btn-subtext">Execute in compiler runner</span>
          </div>
        </button>

        <button
          className="file-options-btn"
          onClick={() => {
            onClose();
            onStartRename?.(file);
          }}
          title="Rename this file"
        >
          <Edit2 size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Rename File</span>
            <span className="btn-subtext">Edit filename & extension</span>
          </div>
        </button>

        <button
          className="file-options-btn"
          onClick={() => {
            handleSaveActiveFile(file);
            onClose();
          }}
          title="Save file to local disk"
        >
          <Download size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Download File</span>
            <span className="btn-subtext">Export to your device</span>
          </div>
        </button>

        <div className="file-options-divider" />

        {/* Section 3: Security & Delete */}
        {onProtect && (
          <button
            className="file-options-btn"
            onClick={() => {
              onClose();
              onProtect(file);
            }}
            title="Lock file with password"
          >
            <Lock size={14} className="btn-icon" />
            <div className="btn-text">
              <span className="btn-title">Password Protect</span>
              <span className="btn-subtext">Encrypt & require PIN</span>
            </div>
          </button>
        )}

        <button
          className="file-options-btn danger"
          onClick={() => {
            handleCloseFile(file.id);
            onClose();
          }}
          title="Delete file permanently"
        >
          <Trash2 size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Delete File</span>
            <span className="btn-subtext">Remove from current workspace</span>
          </div>
        </button>
      </div>
    </div>
  );
}
