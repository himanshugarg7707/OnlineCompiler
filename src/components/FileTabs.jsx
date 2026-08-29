import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  X,
  FileCode,
  Edit2,
  Download,
  Archive,
  Lock,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { isItemProtected, isItemUnlocked } from '../services/securityService';
import PasswordPromptModal from './PasswordPromptModal';
import './FileTabs.css';

export default function FileTabs() {
  const {
    state,
    handleAddFile,
    handleSelectFile,
    handleCloseTab,
    handleRenameFile,
    handleSaveActiveFile,
    handleDownloadWorkspace,
    handleReorderTabs,
    handleToggleFocusMode,
  } = useApp();
  const { files, openFileIds, activeFileId, focusMode } = state;

  const openFiles = (openFileIds || [])
    .map((id) => files.find((f) => f.id === id))
    .filter(Boolean);

  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [tabSecurityTarget, setTabSecurityTarget] = useState(null);

  // Drag and drop tab reordering state
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);

  const addInputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isAdding) {
      addInputRef.current?.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const handleStartAdd = () => {
    setNewFileName('');
    setIsAdding(true);
  };

  const handleFinishAdd = () => {
    const trimmed = newFileName.trim();
    if (trimmed) {
      handleAddFile(trimmed);
    }
    setIsAdding(false);
    setNewFileName('');
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFinishAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewFileName('');
    }
  };

  const handleStartEdit = (e, file) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditingName(file.name);
  };

  const handleFinishEdit = (id) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      handleRenameFile(id, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleFinishEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleTabClick = (file) => {
    const isLocked = isItemProtected(file.name) && !isItemUnlocked(file.name);
    if (isLocked) {
      setTabSecurityTarget({
        key: file.name,
        name: file.name,
        isFolder: false,
        fileId: file.id,
      });
      return;
    }
    handleSelectFile(file.id);
  };

  const handleUnlockedTab = (item) => {
    if (item.fileId) {
      handleSelectFile(item.fileId);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, fileId) => {
    if (editingId) return;
    setDraggedTabId(fileId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fileId);
  };

  const handleDragOver = (e, fileId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTabId && draggedTabId !== fileId && dragOverTabId !== fileId) {
      setDragOverTabId(fileId);
    }
  };

  const handleDragLeave = (e, fileId) => {
    if (dragOverTabId === fileId) {
      setDragOverTabId(null);
    }
  };

  const handleDrop = (e, targetFileId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedTabId;
    if (sourceId && sourceId !== targetFileId) {
      handleReorderTabs(sourceId, targetFileId);
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  return (
    <div className="file-tabs-bar">
      <div className="file-tabs-scroll">
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId;
          const isEditing = editingId === file.id;
          const isFileLocked = isItemProtected(file.name) && !isItemUnlocked(file.name);
          const isDragging = draggedTabId === file.id;
          const isDragOver = dragOverTabId === file.id;

          return (
            <div
              key={file.id}
              className={`file-tab ${isActive ? 'active' : ''} ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
              onClick={() => handleTabClick(file)}
              onDoubleClick={(e) => handleStartEdit(e, file)}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, file.id)}
              onDragOver={(e) => handleDragOver(e, file.id)}
              onDragLeave={(e) => handleDragLeave(e, file.id)}
              onDrop={(e) => handleDrop(e, file.id)}
              onDragEnd={handleDragEnd}
              title={`${file.name} (${file.language.name}) — Drag to reorder, double click to rename`}
            >
              <span className="file-tab-icon">{file.language.icon || '📄'}</span>

              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleFinishEdit(file.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, file.id)}
                  className="file-tab-rename-input"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="file-tab-name">{file.name}</span>
              )}

              {isFileLocked && (
                <span className="tab-lock-icon" title="Password Protected">
                  <Lock size={10} color="#ef4444" />
                </span>
              )}

              <div className="file-tab-actions">
                <button
                  className="file-tab-btn rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveActiveFile(file);
                  }}
                  title="Save As (Cmd+S / Ctrl+S)"
                >
                  <Download size={11} />
                </button>

                {!isFileLocked && (
                  <button
                    className="file-tab-btn rename"
                    onClick={(e) => handleStartEdit(e, file)}
                    title="Rename file"
                  >
                    <Edit2 size={11} />
                  </button>
                )}

                <button
                  className="file-tab-btn close"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(file.id);
                  }}
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {isAdding && (
          <div className="file-tab adding">
            <FileCode size={14} className="adding-icon" />
            <input
              ref={addInputRef}
              type="text"
              placeholder="filename.ext (e.g. app.js)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={handleFinishAdd}
              onKeyDown={handleAddKeyDown}
              className="file-tab-add-input"
            />
          </div>
        )}
      </div>

      <div className="file-tabs-right-actions">
        {/* Focus Mode Button */}
        <button
          className={`btn-tab-action btn-focus-toggle ${focusMode ? 'active' : ''}`}
          onClick={handleToggleFocusMode}
          title={focusMode ? 'Exit Code Focus Mode' : 'Enter Code Focus Mode (Zen Mode)'}
        >
          {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{focusMode ? 'Exit Focus' : 'Focus'}</span>
        </button>

        <button
          className="btn-tab-action"
          onClick={() => handleSaveActiveFile()}
          title="Save active file (Cmd+S / Ctrl+S)"
        >
          <Download size={13} />
          <span>Save</span>
        </button>

        <button
          className="btn-tab-action"
          onClick={() => handleDownloadWorkspace(null)}
          title="Download entire workspace as .ZIP"
        >
          <Archive size={13} />
          <span>ZIP</span>
        </button>

        <button
          className="btn-new-file"
          onClick={handleStartAdd}
          title="Add new file (+)"
        >
          <Plus size={14} />
          <span>New File</span>
        </button>
      </div>

      {/* Password Security Unlock Modal */}
      <PasswordPromptModal
        isOpen={Boolean(tabSecurityTarget)}
        targetItem={tabSecurityTarget}
        onClose={() => setTabSecurityTarget(null)}
        onUnlocked={handleUnlockedTab}
      />
    </div>
  );
}
