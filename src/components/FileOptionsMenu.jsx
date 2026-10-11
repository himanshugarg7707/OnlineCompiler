import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  Copy,
  ClipboardCopy,
  ClipboardPaste,
  FileText,
  Edit2,
  Download,
  Play,
  Trash2,
  Lock,
} from 'lucide-react';
import LanguageIcon from './LanguageIcon';
import './FileOptionsMenu.css';

export default function FileOptionsMenu({
  file,
  folderPath = '',
  position,
  rect,
  isTab = false,
  onClose,
  onStartRename,
  onProtect,
}) {
  const menuRef = useRef(null);
  const {
    state,
    handleDuplicateFile,
    handleCopyFileAsFile,
    handlePasteFile,
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

  // Compute smart position cleanly clear of sidebar / dividers and viewport boundaries
  const computePosition = useCallback((measuredWidth, measuredHeight) => {
    const menuW = measuredWidth || 275;
    const menuH = measuredHeight || 500;
    const vpW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vpH = typeof window !== 'undefined' ? window.innerHeight : 800;

    let targetX = 150;
    let targetY = 150;

    if (rect) {
      if (isTab) {
        // Tab anchor: try positioning right below the tab
        targetX = Math.max(12, Math.min(rect.left, vpW - menuW - 16));
        const candidateY = rect.bottom + 6;
        if (candidateY + menuH > vpH - 16) {
          // If it overflows the bottom, place it as high as needed so all options fit
          targetY = Math.max(12, vpH - menuH - 16);
        } else {
          targetY = candidateY;
        }
      } else {
        // File explorer item anchor: position to the right or left
        if (rect.right + menuW + 16 <= vpW) {
          targetX = rect.right + 10;
        } else {
          targetX = Math.max(12, rect.left - menuW - 10);
        }

        // Vertical positioning: try aligning near top of file item
        const candidateY = rect.top - 4;
        if (candidateY + menuH > vpH - 16) {
          // Shift upwards so the bottom of the menu stays within viewport
          targetY = Math.max(12, vpH - menuH - 16);
        } else {
          targetY = Math.max(12, candidateY);
        }
      }
    } else if (position) {
      targetX = Math.max(12, Math.min(position.x + 8, vpW - menuW - 16));
      if (position.y + menuH > vpH - 16) {
        targetY = Math.max(12, vpH - menuH - 16);
      } else {
        targetY = Math.max(12, position.y);
      }
    }

    // Strict boundary clamping so options NEVER go below bottom status bar or screen edge
    targetX = Math.max(12, Math.min(targetX, vpW - menuW - 16));
    targetY = Math.max(12, Math.min(targetY, vpH - menuH - 16));

    return { x: targetX, y: targetY };
  }, [rect, position, isTab]);

  const [coords, setCoords] = useState(() => computePosition(275, 500));

  // Measure actual rendered size and refine position immediately
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const actualWidth = menuRef.current.offsetWidth || 275;
    const actualHeight = menuRef.current.offsetHeight || 500;
    const updated = computePosition(actualWidth, actualHeight);
    setCoords(updated);
  }, [computePosition]);

  // Adjust on window resize
  useEffect(() => {
    function handleResize() {
      if (!menuRef.current) return;
      const actualWidth = menuRef.current.offsetWidth || 275;
      const actualHeight = menuRef.current.offsetHeight || 500;
      setCoords(computePosition(actualWidth, actualHeight));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [computePosition]);

  if (!file) return null;

  const baseName = file.name.includes('/') ? file.name.split('/').pop() : file.name;
  const duplicatePreviewName = baseName.replace(/\.([^.]+)$/, '_copy.$1');

  const menuContent = (
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
        style={{ top: `${coords.y}px`, left: `${coords.x}px` }}
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
        <div className="file-options-group-label">File & Clipboard</div>

        <button
          className="file-options-btn highlight"
          onClick={() => {
            handleCopyFileAsFile(file);
            onClose();
          }}
          title="Copy file to clipboard as a file"
        >
          <Copy size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Copy File</span>
            <span className="btn-subtext">Copies file to clipboard as a file</span>
          </div>
        </button>

        {state.clipboardFile && (
          <button
            className="file-options-btn highlight"
            onClick={() => {
              handlePasteFile(folderPath || '');
              onClose();
            }}
            title={`Paste ${state.clipboardFile.name || 'copied file'} here`}
          >
            <ClipboardPaste size={14} className="btn-icon" style={{ color: '#10b981' }} />
            <div className="btn-text">
              <span className="btn-title">Paste File</span>
              <span className="btn-subtext">Paste <code>{state.clipboardFile.name}</code></span>
            </div>
          </button>
        )}

        <button
          className="file-options-btn"
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
          title="Copy entire file content as plain text"
        >
          <ClipboardCopy size={14} className="btn-icon" />
          <div className="btn-text">
            <span className="btn-title">Copy Code as Text</span>
            <span className="btn-subtext">Copies all text characters</span>
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

  return typeof document !== 'undefined'
    ? createPortal(menuContent, document.body)
    : menuContent;
}
