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
  Lock,
  FileText,
  AlertCircle,
  FolderInput,
} from 'lucide-react';
import { isItemProtected, isItemUnlocked } from '../services/securityService';
import { sanitizeFilenameIdentifier } from '../services/identifierSanitizer';
import PasswordPromptModal from './PasswordPromptModal';
import { JupyterIcon, AnacondaIcon } from './LanguageIcon';
import LanguageIcon from './LanguageIcon';
import { createDefaultNotebookJson, setupFileDragDataTransfer } from '../services/languageDetector';
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

  // Recursively sort all subfolders and files A-Z (case-insensitive)
  const sortTreeNode = (node) => {
    // Sort files alphabetically by basename
    node.files.sort((a, b) => {
      const nameA = (a.name.split('/').pop() || a.name).toLowerCase();
      const nameB = (b.name.split('/').pop() || b.name).toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true });
    });

    // Recursively sort all subfolder trees
    Object.keys(node.subfolders).forEach((subKey) => {
      sortTreeNode(node.subfolders[subKey]);
    });
  };

  sortTreeNode(root);

  return root;
}

export default function FileExplorer() {
  const {
    state,
    handleAddFile,
    handleSelectFile,
    handleCreateSequentialFile,
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

  const { files, folders, activeFileId, fileErrors = {} } = state;

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

  // Notebook Dropdown Menu State
  const [showNotebookDropdown, setShowNotebookDropdown] = useState(false);
  const notebookDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notebookDropdownRef.current && !notebookDropdownRef.current.contains(e.target)) {
        setShowNotebookDropdown(false);
      }
    }
    if (showNotebookDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotebookDropdown]);

  const addInputRef = useRef(null);
  const editInputRef = useRef(null);

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
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      dispatch({ type: 'TOGGLE_EXPLORER' });
    }
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
        const { sanitizedPath, wasAdjusted, originalName } = sanitizeFilenameIdentifier(fileName);
        if (wasAdjusted) {
          showToast(`Adjusted identifier: "${originalName}" ➔ "${sanitizedPath}" ⚡`);
        }
        const fullPath = targetFolder ? `${targetFolder}/${sanitizedPath}` : sanitizedPath;
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
      const { sanitizedPath: sanitizedBase, wasAdjusted, originalName } = sanitizeFilenameIdentifier(trimmed);
      if (wasAdjusted) {
        showToast(`Adjusted identifier: "${originalName}" ➔ "${sanitizedBase}" ⚡`);
      }
      const newFullName = folderPrefix ? `${folderPrefix}/${sanitizedBase}` : sanitizedBase;
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

    // Collect child counts (sorted A-Z)
    const subfolderKeys = Object.keys(folderNode.subfolders).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { numeric: true })
    );
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
                  onClick={() => handleFileClick(file, folderPath)}
                  onDoubleClick={(e) => startEditFile(e, file)}
                  draggable={!isEditingFile}
                  onDragStart={(e) => setupFileDragDataTransfer(e, file)}
                  title={`${file.name} — ${file.language?.name || 'File'} (Drag to desktop to save)`}
                >
                  <span className="file-icon">
                    <LanguageIcon language={file.language} filename={file.name} size={15} />
                  </span>

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

  const activeFile = files.find((f) => f.id === activeFileId);
  const currentLang = activeFile?.language || state.detectedLanguage;
  const isJavaWorkspace =
    currentLang?.id === 62 ||
    currentLang?.monacoLanguage === 'java' ||
    files.some((f) => f.name.endsWith('.java') || f.name.toLowerCase().includes('java'));

  return (
    <aside className="file-explorer file-explorer-sidebar">
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
            title="New File (Enter file name)"
          >
            <FilePlus size={14} />
          </button>

          {/* Unified Notebook Add Button & Language Dropdown */}
          <div className="notebook-btn-dropdown-group" ref={notebookDropdownRef}>
            <button
              className={`explorer-action-btn notebook-main-btn ${isJavaWorkspace ? 'active-lang-btn' : ''}`}
              id="addnotebook-quick-btn"
              onClick={() => {
                if (isJavaWorkspace) {
                  handleAddFile('java_notebook.ipynb', createDefaultNotebookJson('java'));
                } else {
                  handleAddFile('notebook.ipynb', createDefaultNotebookJson('python'));
                }
              }}
              title={isJavaWorkspace ? 'New Java Notebook (java_notebook.ipynb)' : 'New Jupyter Notebook (notebook.ipynb)'}
            >
              {isJavaWorkspace ? (
                <div className="btn-combo-wrapper">
                  <JupyterIcon size={13} />
                  <span className="btn-combo-badge">☕</span>
                </div>
              ) : (
                <JupyterIcon size={14} />
              )}
            </button>

            <button
              className={`explorer-action-btn notebook-arrow-btn ${showNotebookDropdown ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowNotebookDropdown((prev) => !prev);
              }}
              title="Select Notebook Type (Java, Python, C++, JavaScript)"
            >
              <ChevronDown size={11} />
            </button>

            {showNotebookDropdown && (
              <div className="notebook-picker-dropdown">
                <div className="notebook-picker-header">Interactive Notebooks</div>

                <button
                  className="notebook-picker-item"
                  id="addjavanotebook-menu"
                  onClick={() => {
                    handleAddFile('java_notebook.ipynb', createDefaultNotebookJson('java'));
                    setShowNotebookDropdown(false);
                  }}
                >
                  <span className="item-icon">☕</span>
                  <div className="item-text">
                    <span className="item-title">Java Notebook</span>
                    <span className="item-sub">OpenJDK / JShell Engine</span>
                  </div>
                </button>

                <button
                  className="notebook-picker-item"
                  onClick={() => {
                    handleAddFile('notebook.ipynb', createDefaultNotebookJson('python'));
                    setShowNotebookDropdown(false);
                  }}
                >
                  <span className="item-icon">🐍</span>
                  <div className="item-text">
                    <span className="item-title">Python 3 Notebook</span>
                    <span className="item-sub">Pyodide WebAssembly</span>
                  </div>
                </button>

                <button
                  className="notebook-picker-item"
                  onClick={() => {
                    handleAddFile('cpp_notebook.ipynb', createDefaultNotebookJson('cpp'));
                    setShowNotebookDropdown(false);
                  }}
                >
                  <span className="item-icon">⚡</span>
                  <div className="item-text">
                    <span className="item-title">C++ Notebook</span>
                    <span className="item-sub">GCC / Clang C++20</span>
                  </div>
                </button>

                <button
                  className="notebook-picker-item"
                  onClick={() => {
                    handleAddFile('js_notebook.ipynb', createDefaultNotebookJson('javascript'));
                    setShowNotebookDropdown(false);
                  }}
                >
                  <span className="item-icon">🟨</span>
                  <div className="item-text">
                    <span className="item-title">JavaScript Notebook</span>
                    <span className="item-sub">Browser V8 Engine</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            className="explorer-action-btn"
            onClick={() => handleAddFile('environment.yml')}
            title="New Anaconda Environment (environment.yml)"
          >
            <AnacondaIcon size={14} />
          </button>

          <button
            className="explorer-action-btn"
            onClick={() => startAddFolder('')}
            title="New Folder (📁+)"
          >
            <FolderPlus size={14} />
          </button>

          <button
            className="explorer-action-btn"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.hash = '#/settings?tab=import';
              }
              dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
            }}
            title="Import Folder or Files (Settings > Import)"
          >
            <FolderInput size={14} />
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
        {/* Render Top-level Folders (Sorted A-Z) */}
        {Object.keys(treeRoot.subfolders)
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { numeric: true }))
          .map((subKey) => renderFolderNode(treeRoot.subfolders[subKey], 0))}

        {/* Render Root Files (Sorted A-Z) */}
        {treeRoot.files.filter((f) => matchesSearch(f.name)).map((file) => {
          const isActive = file.id === activeFileId;
          const isEditing = editingFileId === file.id;
          const isLocked = isItemProtected(file.name) && !isItemUnlocked(file.name);

          return (
            <div
              key={file.id}
              className={`explorer-file-item root ${isActive ? 'active' : ''}`}
              onClick={() => handleFileClick(file)}
              onDoubleClick={(e) => startEditFile(e, file)}
              draggable={!isEditing}
              onDragStart={(e) => setupFileDragDataTransfer(e, file)}
              title={`${file.name} — ${file.language?.name || 'File'} (Drag to desktop to save)`}
            >
              <span className="file-icon">
                <LanguageIcon language={file.language} filename={file.name} size={15} />
              </span>

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

      {/* Password Security Unlock Modal */}
      <PasswordPromptModal
        isOpen={Boolean(securityTarget)}
        targetItem={securityTarget}
        onClose={() => setSecurityTarget(null)}
        onUnlocked={handleUnlockedItem}
      />
    </aside>
  );
}
