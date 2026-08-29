import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  FolderTree,
  Folder,
  FolderOpen,
  FolderPlus,
  FileCode,
  Plus,
  Download,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  X,
  FilePlus,
  Archive,
  FolderInput,
  FileUp,
  Lock,
  FileText,
} from 'lucide-react';
import { isItemProtected, isItemUnlocked } from '../services/securityService';
import PasswordPromptModal from './PasswordPromptModal';
import ImportTargetModal from './ImportTargetModal';
import './FileExplorer.css';

/**
 * Builds a recursive tree structure from files list and explicit folder list
 */
function buildTreeStructure(files, explicitFolders = []) {
  const root = {
    name: '',
    path: '',
    isFolder: true,
    subfolders: {},
    files: [],
  };

  // Register all explicit folders
  explicitFolders.forEach((fPath) => {
    if (!fPath) return;
    const parts = fPath.split('/').filter(Boolean);
    let curr = root;
    let currentPath = '';

    parts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!curr.subfolders[part]) {
        curr.subfolders[part] = {
          name: part,
          path: currentPath,
          isFolder: true,
          subfolders: {},
          files: [],
        };
      }
      curr = curr.subfolders[part];
    });
  });

  // Insert all files
  files.forEach((file) => {
    const parts = file.name.split('/').filter(Boolean);
    if (parts.length === 1) {
      root.files.push(file);
    } else {
      let curr = root;
      let currentPath = '';

      for (let i = 0; i < parts.length - 1; i++) {
        const folderPart = parts[i];
        currentPath = currentPath ? `${currentPath}/${folderPart}` : folderPart;
        if (!curr.subfolders[folderPart]) {
          curr.subfolders[folderPart] = {
            name: folderPart,
            path: currentPath,
            isFolder: true,
            subfolders: {},
            files: [],
          };
        }
        curr = curr.subfolders[folderPart];
      }
      curr.files.push(file);
    }
  });

  return root;
}

export default function FileExplorer() {
  const {
    state,
    handleAddFile,
    handleSelectFile,
    handleCloseFile,
    handleRenameFile,
    handleAddFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleSaveActiveFile,
    handleDownloadWorkspace,
    dispatch,
    showToast,
  } = useApp();

  const { files, folders, activeFileId } = state;

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Folder collapse state: { [folderPath]: boolean }
  const [collapsedFolders, setCollapsedFolders] = useState({});

  // Inline Creation state: { type: 'file' | 'folder', targetFolder: string } | null
  const [creationTarget, setCreationTarget] = useState(null);
  const [newItemName, setNewItemName] = useState('');

  // Renaming state
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [editingFolderPath, setEditingFolderPath] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Password Security Prompt Modal State
  const [securityTarget, setSecurityTarget] = useState(null);

  // Import Target Modal State
  const [importModal, setImportModal] = useState({ isOpen: false, mode: 'files' });
  const [pendingImportTarget, setPendingImportTarget] = useState('');

  const addInputRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    if (creationTarget) {
      addInputRef.current?.focus();
    }
  }, [creationTarget]);

  useEffect(() => {
    if (editingFileId || editingFolderPath) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingFileId, editingFolderPath]);

  // Build recursive tree
  const treeRoot = useMemo(() => {
    return buildTreeStructure(files, folders);
  }, [files, folders]);

  // Toggle folder collapse
  const toggleFolder = (folderPath) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Password security check for files & folders
  const handleFileClick = (file, folderPath = '') => {
    const isLocked = isItemProtected(file.name, folderPath) && !isItemUnlocked(file.name, folderPath);
    if (isLocked) {
      const key = isItemProtected(file.name) ? file.name : folderPath;
      setSecurityTarget({
        key,
        name: file.name,
        isFolder: false,
        fileId: file.id,
      });
      return;
    }
    handleSelectFile(file.id);
  };

  const handleFolderClick = (folderPath) => {
    const isLocked = isItemProtected(folderPath) && !isItemUnlocked(folderPath);
    if (isLocked) {
      setSecurityTarget({
        key: folderPath,
        name: `${folderPath}/`,
        isFolder: true,
        folderPath,
      });
      return;
    }
    toggleFolder(folderPath);
  };

  const handleUnlockedItem = (item) => {
    if (item.fileId) {
      handleSelectFile(item.fileId);
    } else if (item.folderPath) {
      setCollapsedFolders((prev) => ({ ...prev, [item.folderPath]: false }));
    }
  };

  // Start Inline Add
  const startAddFile = (targetFolder = '') => {
    setCreationTarget({ type: 'file', targetFolder });
    setNewItemName('');
    if (targetFolder) {
      setCollapsedFolders((prev) => ({ ...prev, [targetFolder]: false }));
    }
  };

  const startAddFolder = (targetFolder = '') => {
    setCreationTarget({ type: 'folder', targetFolder });
    setNewItemName('');
    if (targetFolder) {
      setCollapsedFolders((prev) => ({ ...prev, [targetFolder]: false }));
    }
  };

  const startAddNote = (targetFolder = '') => {
    setCreationTarget({ type: 'note', targetFolder });
    setNewItemName('');
    if (targetFolder) {
      setCollapsedFolders((prev) => ({ ...prev, [targetFolder]: false }));
    }
  };

  const finishAdd = () => {
    if (!creationTarget) return;
    const trimmed = newItemName.trim().replace(/\/+$/, '');
    if (trimmed) {
      const { type, targetFolder } = creationTarget;

      if (type === 'file' || type === 'note') {
        let fileName = trimmed;
        if (type === 'note' && !fileName.includes('.')) {
          fileName = `${fileName}.txt`;
        }
        const fullPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
        handleAddFile(fullPath);
      } else {
        const fullPath = targetFolder ? `${targetFolder}/${trimmed}` : trimmed;
        handleAddFolder(fullPath);
      }
    }
    setCreationTarget(null);
    setNewItemName('');
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') finishAdd();
    if (e.key === 'Escape') {
      setCreationTarget(null);
      setNewItemName('');
    }
  };

  // Rename File
  const startEditFile = (e, file) => {
    e.stopPropagation();
    const isLocked = isItemProtected(file.name) && !isItemUnlocked(file.name);
    if (isLocked) {
      showToast('Cannot rename a locked file 🔒');
      return;
    }
    setEditingFileId(file.id);
    const baseName = file.name.includes('/') ? file.name.split('/').pop() : file.name;
    setEditingFileName(baseName);
  };

  const finishEditFile = (file) => {
    const trimmed = editingFileName.trim();
    if (trimmed && trimmed !== file.name) {
      const folderPrefix = file.name.includes('/')
        ? file.name.substring(0, file.name.lastIndexOf('/'))
        : '';
      const newFullName = folderPrefix ? `${folderPrefix}/${trimmed}` : trimmed;
      handleRenameFile(file.id, newFullName);
    }
    setEditingFileId(null);
    setEditingFileName('');
  };

  // Rename Folder
  const startEditFolder = (e, folderPath) => {
    e.stopPropagation();
    const isLocked = isItemProtected(folderPath) && !isItemUnlocked(folderPath);
    if (isLocked) {
      showToast('Cannot rename a locked folder 🔒');
      return;
    }
    setEditingFolderPath(folderPath);
    const baseName = folderPath.includes('/') ? folderPath.split('/').pop() : folderPath;
    setEditingFolderName(baseName);
  };

  const finishEditFolder = (oldFolderPath) => {
    const trimmed = editingFolderName.trim().replace(/\/+$/, '');
    if (trimmed && trimmed !== oldFolderPath) {
      const parentPrefix = oldFolderPath.includes('/')
        ? oldFolderPath.substring(0, oldFolderPath.lastIndexOf('/'))
        : '';
      const newPath = parentPrefix ? `${parentPrefix}/${trimmed}` : trimmed;
      handleRenameFolder(oldFolderPath, newPath);
    }
    setEditingFolderPath(null);
    setEditingFolderName('');
  };

  // Import Handlers with Target Destination
  const handleOpenImport = (mode) => {
    setImportModal({ isOpen: true, mode });
  };

  const handleProceedImport = (targetPath) => {
    setPendingImportTarget(targetPath || '');
    if (importModal.mode === 'folder') {
      folderInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const onFilesSelected = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    showToast(`Importing ${selectedFiles.length} file(s)... 📂`);
    const isTextFile = (name) => {
      const ext = name.split('.').pop()?.toLowerCase();
      const binaryExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'tar', 'exe', 'bin', 'pyc']);
      return !binaryExts.has(ext);
    };

    let importedCount = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.name.startsWith('.') || !isTextFile(file.name)) continue;

      try {
        const text = await file.text();
        const baseName = file.name;
        const finalPath = pendingImportTarget ? `${pendingImportTarget}/${baseName}` : baseName;
        handleAddFile(finalPath, text, undefined, i === 0);
        importedCount++;
      } catch (err) {
        console.warn(`Failed reading file ${file.name}:`, err);
      }
    }

    if (pendingImportTarget) {
      handleAddFolder(pendingImportTarget);
    }
    showToast(`Successfully imported ${importedCount} file(s) into ${pendingImportTarget || 'root'} 🚀`);
    e.target.value = '';
    setPendingImportTarget('');
  };

  const onFolderSelected = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    showToast(`Importing folder tree (${selectedFiles.length} files)... 📁`);
    let importedCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const relPath = file.webkitRelativePath || file.name;
      if (relPath.includes('node_modules') || relPath.includes('.git') || file.name.startsWith('.')) continue;

      try {
        const text = await file.text();
        const finalPath = pendingImportTarget ? `${pendingImportTarget}/${relPath}` : relPath;
        handleAddFile(finalPath, text, undefined, i === 0);
        importedCount++;
      } catch (err) {
        console.warn(`Failed to read ${relPath}:`, err);
      }
    }

    showToast(`Imported folder structure (${importedCount} files) 🚀`);
    e.target.value = '';
    setPendingImportTarget('');
  };

  // Filter checker
  const matchesSearch = useCallback(
    (name) => {
      if (!searchQuery) return true;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    },
    [searchQuery]
  );

  /**
   * Recursive Folder Node Component
   */
  const renderFolderNode = (folderNode, depth = 0) => {
    const folderPath = folderNode.path;
    const isCollapsed = collapsedFolders[folderPath] ?? false;
    const isEditing = editingFolderPath === folderPath;
    const isLocked = isItemProtected(folderPath) && !isItemUnlocked(folderPath);

    // Collect child counts
    const subfolderKeys = Object.keys(folderNode.subfolders);
    const hasVisibleFiles = folderNode.files.some((f) => matchesSearch(f.name));
    const hasVisibleSubfolders = subfolderKeys.length > 0;

    if (searchQuery && !hasVisibleFiles && !hasVisibleSubfolders && !matchesSearch(folderNode.name)) {
      return null;
    }

    return (
      <div key={folderPath} className="explorer-folder-node">
        {/* Folder Header */}
        <div
          className={`explorer-folder-header ${isCollapsed ? 'collapsed' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          onClick={() => handleFolderClick(folderPath)}
          onDoubleClick={(e) => startEditFolder(e, folderPath)}
          title={`Folder: ${folderPath}/`}
        >
          <div className="folder-header-left">
            <span className="folder-chevron">
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </span>

            {isCollapsed ? (
              <Folder size={14} className="folder-icon" />
            ) : (
              <FolderOpen size={14} className="folder-icon open" />
            )}

            {isEditing ? (
              <div className="file-rename-container" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onBlur={() => finishEditFolder(folderPath)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishEditFolder(folderPath);
                    if (e.key === 'Escape') setEditingFolderPath(null);
                  }}
                  className="file-rename-input"
                />
                <button className="btn-confirm-rename" onClick={() => finishEditFolder(folderPath)}>
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <span className="folder-name">{folderNode.name}</span>
            )}

            {isLocked && (
              <span className="file-lock-badge" title="Password Protected Folder">
                <Lock size={11} />
              </span>
            )}
          </div>

          <div className="folder-header-right">
            {folderNode.files.length > 0 && (
              <span className="folder-badge">{folderNode.files.length}</span>
            )}

            {/* Actions on folder: Hide edit/delete if locked! */}
            {!isEditing && (
              <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="file-action-btn"
                  onClick={() => startAddFile(folderPath)}
                  title={`New file in ${folderNode.name}/`}
                >
                  <Plus size={11} />
                </button>

                <button
                  className="file-action-btn"
                  onClick={() => startAddNote(folderPath)}
                  title={`New note in ${folderNode.name}/`}
                >
                  <FileText size={11} />
                </button>

                <button
                  className="file-action-btn"
                  onClick={() => startAddFolder(folderPath)}
                  title={`New subfolder in ${folderNode.name}/`}
                >
                  <FolderPlus size={11} />
                </button>

                <button
                  className="file-action-btn"
                  onClick={() => handleDownloadWorkspace(folderPath)}
                  title={`Download ${folderNode.name}/ as ZIP`}
                >
                  <Download size={11} />
                </button>

                {/* Only show Rename and Delete if NOT locked! */}
                {!isLocked && (
                  <>
                    <button
                      className="file-action-btn"
                      onClick={(e) => startEditFolder(e, folderPath)}
                      title="Rename folder"
                    >
                      <Edit2 size={11} />
                    </button>

                    <button
                      className="file-action-btn danger"
                      onClick={() => handleDeleteFolder(folderPath)}
                      title="Delete folder and all files"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Children (Subfolders + Files) */}
        {!isCollapsed && (
          <div className="folder-children-group">
            {/* Inline Add Inside this Folder */}
            {creationTarget && creationTarget.targetFolder === folderPath && (
              <div
                className="explorer-file-item adding child"
                style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
              >
                {creationTarget.type === 'folder' ? (
                  <FolderPlus size={13} className="adding-icon" />
                ) : creationTarget.type === 'note' ? (
                  <FileText size={13} className="adding-icon note" />
                ) : (
                  <FileCode size={13} className="adding-icon" />
                )}
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder={
                    creationTarget.type === 'folder'
                      ? 'folder_name'
                      : creationTarget.type === 'note'
                      ? 'notes.txt or doc.md'
                      : 'filename.ext'
                  }
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onBlur={finishAdd}
                  onKeyDown={handleAddKeyDown}
                  className="file-add-input"
                />
                <button className="btn-confirm-rename" onClick={finishAdd}>
                  <Check size={12} />
                </button>
              </div>
            )}

            {/* Render Nested Subfolders */}
            {subfolderKeys.map((subKey) =>
              renderFolderNode(folderNode.subfolders[subKey], depth + 1)
            )}

            {/* Render Folder Files */}
            {folderNode.files.filter((f) => matchesSearch(f.name)).map((file) => {
              const isActive = file.id === activeFileId;
              const isEditingFile = editingFileId === file.id;
              const baseName = file.name.includes('/') ? file.name.split('/').pop() : file.name;
              const isFileLocked = isItemProtected(file.name, folderPath) && !isItemUnlocked(file.name, folderPath);

              return (
                <div
                  key={file.id}
                  className={`explorer-file-item child ${isActive ? 'active' : ''}`}
                  style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
                  onClick={() => handleFileClick(file, folderPath)}
                  onDoubleClick={(e) => startEditFile(e, file)}
                  title={`${file.name} — ${file.language?.name || 'File'}`}
                >
                  <span className="file-icon">{file.language?.icon || '📄'}</span>

                  {isEditingFile ? (
                    <div className="file-rename-container" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingFileName}
                        onChange={(e) => setEditingFileName(e.target.value)}
                        onBlur={() => finishEditFile(file)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishEditFile(file);
                          if (e.key === 'Escape') setEditingFileId(null);
                        }}
                        className="file-rename-input"
                      />
                      <button className="btn-confirm-rename" onClick={() => finishEditFile(file)}>
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="file-name">{baseName}</span>
                  )}

                  {isFileLocked && (
                    <span className="file-lock-badge" title="Password Protected File">
                      <Lock size={11} />
                    </span>
                  )}

                  {isActive && !isEditingFile && <span className="active-dot" />}

                  {!isEditingFile && (
                    <div className="file-item-actions">
                      <button
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveActiveFile(file);
                        }}
                        title={`Save ${baseName} to device`}
                      >
                        <Download size={11} />
                      </button>

                      {/* Only show Rename and Delete if NOT locked! */}
                      {!isFileLocked && (
                        <>
                          <button
                            className="file-action-btn"
                            onClick={(e) => startEditFile(e, file)}
                            title="Rename file"
                          >
                            <Edit2 size={11} />
                          </button>

                          <button
                            className="file-action-btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseFile(file.id);
                            }}
                            title="Delete file"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="file-explorer-sidebar">
      {/* Explorer Header */}
      <div className="explorer-header">
        <div className="explorer-title-group">
          <FolderTree size={16} className="explorer-icon" />
          <span>Explorer</span>
        </div>

        <div className="explorer-header-actions">
          <button
            className="explorer-action-btn"
            onClick={() => startAddFile('')}
            title="New File in Root (+)"
          >
            <Plus size={14} />
          </button>

          <button
            className="explorer-action-btn"
            onClick={() => startAddNote('')}
            title="New Note / Text File (📝+)"
          >
            <FileText size={14} />
          </button>

          <button
            className="explorer-action-btn"
            onClick={() => startAddFolder('')}
            title="New Folder in Root (📁+)"
          >
            <FolderPlus size={14} />
          </button>

          <button
            className="explorer-action-btn"
            onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
            title="Close Explorer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="explorer-search">
        <Search size={12} className="search-icon" />
        <input
          type="text"
          placeholder="Search workspace files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="explorer-search-input"
        />
        {searchQuery && (
          <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
            <X size={11} />
          </button>
        )}
      </div>

      {/* Recursive Files & Folders Tree */}
      <div className="explorer-files-list">
        {/* Render Top-level Folders */}
        {Object.keys(treeRoot.subfolders).map((subKey) =>
          renderFolderNode(treeRoot.subfolders[subKey], 0)
        )}

        {/* Render Root Files */}
        {treeRoot.files.filter((f) => matchesSearch(f.name)).map((file) => {
          const isActive = file.id === activeFileId;
          const isEditing = editingFileId === file.id;
          const isLocked = isItemProtected(file.name) && !isItemUnlocked(file.name);

          return (
            <div
              key={file.id}
              className={`explorer-file-item ${isActive ? 'active' : ''}`}
              onClick={() => handleFileClick(file)}
              onDoubleClick={(e) => startEditFile(e, file)}
              title={`${file.name} — ${file.language?.name || 'File'}`}
            >
              <span className="file-icon">{file.language?.icon || '📄'}</span>

              {isEditing ? (
                <div className="file-rename-container" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingFileName}
                    onChange={(e) => setEditingFileName(e.target.value)}
                    onBlur={() => finishEditFile(file)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishEditFile(file);
                      if (e.key === 'Escape') setEditingFileId(null);
                    }}
                    className="file-rename-input"
                  />
                  <button className="btn-confirm-rename" onClick={() => finishEditFile(file)}>
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <span className="file-name">{file.name}</span>
              )}

              {isLocked && (
                <span className="file-lock-badge" title="Password Protected File">
                  <Lock size={11} />
                </span>
              )}

              {isActive && !isEditing && <span className="active-dot" />}

              {!isEditing && (
                <div className="file-item-actions">
                  <button
                    className="file-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveActiveFile(file);
                    }}
                    title={`Save ${file.name} to device`}
                  >
                    <Download size={11} />
                  </button>

                  {/* Only show Rename and Delete if NOT locked! */}
                  {!isLocked && (
                    <>
                      <button
                        className="file-action-btn"
                        onClick={(e) => startEditFile(e, file)}
                        title="Rename file"
                      >
                        <Edit2 size={11} />
                      </button>

                      <button
                        className="file-action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseFile(file.id);
                        }}
                        title="Delete file"
                      >
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Inline Add Root Item */}
        {creationTarget && !creationTarget.targetFolder && (
          <div className="explorer-file-item adding">
            {creationTarget.type === 'folder' ? (
              <FolderPlus size={14} className="adding-icon" />
            ) : (
              <FileCode size={14} className="adding-icon" />
            )}
            <input
              ref={addInputRef}
              type="text"
              placeholder={creationTarget.type === 'folder' ? 'folder_name' : 'filename.ext'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={finishAdd}
              onKeyDown={handleAddKeyDown}
              className="file-add-input"
            />
            <button className="btn-confirm-rename" onClick={finishAdd}>
              <Check size={12} />
            </button>
          </div>
        )}

        {files.length === 0 && (
          <div className="explorer-empty" onClick={() => startAddFile('')}>
            <FilePlus size={24} />
            <p>Workspace Empty</p>
            <span>Click to create a file</span>
          </div>
        )}
      </div>

      {/* Explorer Footer */}
      <div className="explorer-footer">
        <div className="explorer-footer-buttons">
          <button
            className="btn-new-file-bottom"
            onClick={() => startAddFile('')}
            title="Create new code file"
          >
            <Plus size={13} />
            <span>+ File</span>
          </button>

          <button
            className="btn-new-note-bottom"
            onClick={() => startAddNote('')}
            title="Create new Notes / Text file"
          >
            <FileText size={13} />
            <span>+ Note</span>
          </button>

          <button
            className="btn-new-folder-bottom"
            onClick={() => startAddFolder('')}
            title="Create new folder (📁+)"
          >
            <FolderPlus size={13} />
            <span>+ Folder</span>
          </button>

          <button
            className="btn-download-workspace"
            onClick={() => handleDownloadWorkspace(null)}
            title="Download full project folder as .ZIP"
          >
            <Archive size={13} />
            <span>ZIP</span>
          </button>
        </div>

        <div className="explorer-footer-buttons import-row">
          <button
            className="btn-import-file"
            onClick={() => handleOpenImport('files')}
            title="Import file(s) into workspace"
          >
            <FileUp size={13} />
            <span>Import Files</span>
          </button>

          <button
            className="btn-import-folder"
            onClick={() => handleOpenImport('folder')}
            title="Import a folder into workspace"
          >
            <FolderInput size={13} />
            <span>Import Folder</span>
          </button>
        </div>

        <span className="explorer-hint">Cmd+S: Save file • Multi-level folder support</span>
      </div>

      {/* Hidden File / Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={onFilesSelected}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: 'none' }}
        onChange={onFolderSelected}
      />

      {/* Password Security Unlock Modal */}
      <PasswordPromptModal
        isOpen={Boolean(securityTarget)}
        targetItem={securityTarget}
        onClose={() => setSecurityTarget(null)}
        onUnlocked={handleUnlockedItem}
      />

      {/* Import Target Destination Modal */}
      <ImportTargetModal
        isOpen={importModal.isOpen}
        mode={importModal.mode}
        onProceed={handleProceedImport}
        onClose={() => setImportModal({ isOpen: false, mode: 'files' })}
      />
    </aside>
  );
}
