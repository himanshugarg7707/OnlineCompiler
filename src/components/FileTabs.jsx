import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, FileCode, Edit2 } from 'lucide-react';
import './FileTabs.css';

export default function FileTabs() {
  const {
    state,
    handleAddFile,
    handleSelectFile,
    handleCloseFile,
    handleRenameFile,
  } = useApp();
  const { files, activeFileId } = state;

  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
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

  return (
    <div className="file-tabs-bar">
      <div className="file-tabs-scroll">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const isEditing = editingId === file.id;

          return (
            <div
              key={file.id}
              className={`file-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectFile(file.id)}
              onDoubleClick={(e) => handleStartEdit(e, file)}
              title={`${file.name} (${file.language.name}) — Double click to rename`}
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

              <div className="file-tab-actions">
                <button
                  className="file-tab-btn rename"
                  onClick={(e) => handleStartEdit(e, file)}
                  title="Rename file"
                >
                  <Edit2 size={12} />
                </button>

                <button
                  className="file-tab-btn close"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseFile(file.id);
                  }}
                  title="Close file"
                >
                  <X size={13} />
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

      <button
        className="btn-new-file"
        onClick={handleStartAdd}
        title="Add new file (+)"
      >
        <Plus size={15} />
        <span>New File</span>
      </button>
    </div>
  );
}
