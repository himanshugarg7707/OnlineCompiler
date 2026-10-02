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
  Copy,
} from 'lucide-react';
import { isItemProtected, isItemUnlocked } from '../services/securityService';
import { sanitizeFilenameIdentifier } from '../services/identifierSanitizer';
import PasswordPromptModal from './PasswordPromptModal';
import LanguageIcon from './LanguageIcon';
import { createDefaultNotebookJson, setupFileDragDataTransfer, getLanguageFromFilename } from '../services/languageDetector';
import { processFileList } from '../services/importService';
import {
  getWorkspaceGitStatus,
  getStagedFileIds,
  saveStagedFileIds,
  getGitBaselines,
  saveGitBaselines,
  commitChanges,
  getBranchHistory,
} from '../services/gitService';
import { recordSnapshot } from '../services/historyService';
import FileOptionsMenu from './FileOptionsMenu';
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
    handleDuplicateFile,
    handleAddFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleSaveActiveFile,
    handleDownloadWorkspace,
    dispatch,
    showToast,
    handleGitPush,
    handleGitPull,
    handleGitSync,
  } = useApp();

  const { files, folders, activeFileId, fileErrors = {} } = state;

  // Search query & active tab
  const [activeSidebarTab, setActiveSidebarTab] = useState('explorer'); // 'explorer' | 'search' | 'source-control' | 'extensions'
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Source Control Git states
  const [stagedFileIds, setStagedFileIds] = useState(() => getStagedFileIds());
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedExpanded, setStagedExpanded] = useState(true);
  const [unstagedExpanded, setUnstagedExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const gitStatus = useMemo(() => {
    return getWorkspaceGitStatus(files, stagedFileIds);
  }, [files, stagedFileIds]);

  const commitHistory = useMemo(() => {
    return getBranchHistory(state.gitBranch || 'main');
  }, [state.gitBranch, state.gitAhead]);

  const handleStageFile = useCallback((fileId) => {
    setStagedFileIds((prev) => {
      const next = Array.from(new Set([...prev, fileId]));
      saveStagedFileIds(next);
      return next;
    });
  }, []);

  const handleUnstageFile = useCallback((fileId) => {
    setStagedFileIds((prev) => {
      const next = prev.filter((id) => id !== fileId);
      saveStagedFileIds(next);
      return next;
    });
  }, []);

  const handleStageAll = useCallback(() => {
    const allChangedIds = [...gitStatus.staged, ...gitStatus.unstaged].map((item) => item.file.id);
    if (allChangedIds.length === 0) {
      showToast('No changes to stage');
      return;
    }
    setStagedFileIds(allChangedIds);
    saveStagedFileIds(allChangedIds);
    showToast(`Staged ${allChangedIds.length} changes`);
  }, [gitStatus, showToast]);

  const handleRefreshGit = useCallback(() => {
    showToast('Git status refreshed 🔄');
  }, [showToast]);

  const handleOpenFileDiff = useCallback((item) => {
    dispatch({
      type: 'OPEN_GIT_DIFF',
      payload: {
        file: item.file,
        baselineContent: item.baselineContent,
      },
    });
  }, [dispatch]);

  const handleCommit = useCallback(() => {
    const filesToCommit = gitStatus.staged.length > 0 ? gitStatus.staged : gitStatus.unstaged;
    if (filesToCommit.length === 0) {
      showToast('No changes to commit (working tree clean)');
      return;
    }
    const msg = commitMessage.trim() || 'Update files';
    const commitRes = commitChanges(msg, files, stagedFileIds);
    setStagedFileIds([]);
    saveStagedFileIds([]);
    setCommitMessage('');
    showToast(`Committed to ${commitRes.branch}: "${msg}" (${commitRes.commit.hash}) ✨`);
  }, [gitStatus, commitMessage, files, stagedFileIds, showToast]);

  const handleGitMore = useCallback(() => {
    dispatch({ type: 'SET_BRANCH_MODAL_OPEN', payload: true });
  }, [dispatch]);

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

  // File Options Multi-Menu (Double-Click & Right-Click)
  const [fileOptionsMenu, setFileOptionsMenu] = useState(null);

  // External File Drag & Drop
  const [isDroppingExternal, setIsDroppingExternal] = useState(false);

  const handleExternalDragOver = (e) => {
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDroppingExternal(true);
    }
  };

  const handleExternalDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingExternal(false);
  };

  const handleExternalDrop = async (e) => {
    if (!e.dataTransfer.types || !Array.from(e.dataTransfer.types).includes('Files')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingExternal(false);

    const rawFiles = e.dataTransfer.files;
    if (!rawFiles || rawFiles.length === 0) return;

    try {
      const processed = await processFileList(rawFiles);
      if (!processed || processed.length === 0) {
        showToast('No readable code files detected in drop');
        return;
      }

      processed.forEach((f) => {
        handleAddFile(f.path || f.name, f.content, null, true);
      });
      showToast(`Imported ${processed.length} file(s) into workspace 📄`);
    } catch (err) {
      console.error(err);
      showToast('Error reading dropped files');
    }
  };

  const handleOpenLocalFolderPrompt = async () => {
    // 1. If inside native macOS app:
    if (window.webkit?.messageHandlers?.nativeHost) {
      window.webkit.messageHandlers.nativeHost.postMessage({ type: 'open_local_folder' });
      return;
    }

    // 2. If in modern browser supporting File System Access API:
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const loadedFiles = [];
        const ignored = new Set(['.git', 'node_modules', 'dist', '.DS_Store', '__pycache__', '.vercel', 'scratch']);

        async function scanDir(handle, currentPath = '') {
          for await (const entry of handle.values()) {
            if (ignored.has(entry.name)) continue;
            if (entry.kind === 'file') {
              try {
                const file = await entry.getFile();
                if (file.size < 1_500_000) {
                  const text = await file.text();
                  const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                  loadedFiles.push({ name: relPath, content: text });
                }
              } catch {}
            } else if (entry.kind === 'directory') {
              const subPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              await scanDir(entry, subPath);
            }
          }
        }

        await scanDir(dirHandle);

        if (loadedFiles.length > 0) {
          const newFiles = loadedFiles.map((f, idx) => ({
            id: `local-${Date.now()}-${idx}`,
            name: f.name,
            content: f.content,
            language: getLanguageFromFilename(f.name),
          }));
          const detectedFolders = [...new Set(
            newFiles
              .filter((f) => f.name.includes('/'))
              .map((f) => f.name.substring(0, f.name.lastIndexOf('/')))
          )];
          dispatch({
            type: 'LOAD_WORKSPACE_STATE',
            payload: {
              files: newFiles,
              folders: detectedFolders,
              activeFileId: newFiles[0].id,
            },
          });
          showToast(`Opened folder "${dirHandle.name}" (${newFiles.length} files) 📂`);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast(`Could not open directory: ${err.message}`);
        }
      }
      return;
    }

    // Fallback: navigate to settings import tab
    if (typeof window !== 'undefined') {
      window.location.hash = '#/settings?tab=import';
    }
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
  };

  const handleOpenFileOptions = (e, file, folderPath = '') => {
    e.preventDefault();
    e.stopPropagation();

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

    const targetElement = e.currentTarget;
    const rect = targetElement?.getBoundingClientRect ? targetElement.getBoundingClientRect() : null;

    setFileOptionsMenu({
      file,
      folderPath,
      rect,
      position: { x: e.clientX, y: e.clientY },
    });
  };



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
                  onDoubleClick={(e) => handleOpenFileOptions(e, file, folderPath)}
                  onContextMenu={(e) => handleOpenFileOptions(e, file, folderPath)}
                  draggable={!isEditingFile}
                  onDragStart={(e) => setupFileDragDataTransfer(e, file)}
                  title={`${file.name} — ${file.language?.name || 'File'} (Double-click or right-click for options)`}
                >
                  <span className="file-icon">
                    <LanguageIcon language={file.language} filename={file.name} workspaceFiles={state?.files} size={15} />
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
                          handleDuplicateFile(file);
                        }}
                        title={`Duplicate & make copy of ${baseName}`}
                      >
                        <Copy size={11} />
                      </button>

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
    <aside className="file-explorer file-explorer-sidebar antigravity-sidebar">
      {/* Top Workspace & Project Root header */}
      <div className="sidebar-workspace-header">
        <span className="sidebar-workspace-label">WORKSPACE</span>
        <span className="sidebar-workspace-sub">PROJECT ROOT</span>
      </div>

      {/* Side Navigation Tabs (Explorer, Search, Extensions) */}
      <div className="sidebar-nav-tabs">
        <div
          className={`sidebar-nav-tab ${activeSidebarTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveSidebarTab('explorer')}
          title="File Tree Explorer"
        >
          <span className="material-symbols-outlined text-sm">folder</span>
          <span className="sidebar-tab-title">Explorer</span>
        </div>
        <div
          className={`sidebar-nav-tab ${activeSidebarTab === 'search' ? 'active' : ''}`}
          onClick={() => {
            setActiveSidebarTab('search');
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          title="Search Workspace Files"
        >
          <span className="material-symbols-outlined text-sm">search</span>
          <span className="sidebar-tab-title">Search</span>
        </div>
        <div
          className={`sidebar-nav-tab ${activeSidebarTab === 'source-control' ? 'active' : ''}`}
          onClick={() => setActiveSidebarTab('source-control')}
          title="Source Control (Git Diff & Commits)"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            view_in_ar_new
          </span>
          <span className="sidebar-tab-title">Source Control</span>
          {gitStatus.totalCount > 0 && (
            <span className="sidebar-tab-badge">{gitStatus.totalCount}</span>
          )}
        </div>
        <div
          className={`sidebar-nav-tab ${activeSidebarTab === 'extensions' ? 'active' : ''}`}
          onClick={() => setActiveSidebarTab('extensions')}
          title="Features & Extensions Hub"
        >
          <span className="material-symbols-outlined text-sm">extension</span>
          <span className="sidebar-tab-title">Extensions</span>
        </div>
      </div>

      {/* Extensions Hub Panel View */}
      {activeSidebarTab === 'extensions' ? (
        <div className="sidebar-extensions-panel animate-fade-in">
          <div className="extensions-group-title">INSTALLED EXTENSIONS & LABS</div>
          <div className="extension-card" onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'practice' })}>
            <div className="extension-icon-box practice-box">
              <span className="material-symbols-outlined text-sm">code</span>
            </div>
            <div className="extension-info">
              <div className="extension-name">DSA Practice Lab</div>
              <div className="extension-desc">70+ curated coding questions, test cases & hints</div>
            </div>
          </div>

          <div className="extension-card" onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'exam' })}>
            <div className="extension-icon-box exam-box">
              <span className="material-symbols-outlined text-sm">assignment</span>
            </div>
            <div className="extension-info">
              <div className="extension-name">Proctored Exam & Tests</div>
              <div className="extension-desc">Exam mode with PDF questions & auto grading</div>
            </div>
          </div>

          <div className="extension-card" onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'notebook-setup' })}>
            <div className="extension-icon-box notebook-box">
              <span className="material-symbols-outlined text-sm">school</span>
            </div>
            <div className="extension-info">
              <div className="extension-name">Subject Course Notebooks</div>
              <div className="extension-desc">Interactive Jupyter notebooks for Java, Python & C++</div>
            </div>
          </div>

          <div className="extension-card" onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'templates' })}>
            <div className="extension-icon-box template-box">
              <span className="material-symbols-outlined text-sm">view_quilt</span>
            </div>
            <div className="extension-info">
              <div className="extension-name">Algorithm Templates</div>
              <div className="extension-desc">Boilerplates, DSA algorithms & snippets</div>
            </div>
          </div>

          <div className="extension-card" onClick={() => dispatch({ type: 'TOGGLE_COLLAB_MODAL' })}>
            <div className="extension-icon-box live-box">
              <span className="material-symbols-outlined text-sm">wifi_tethering</span>
            </div>
            <div className="extension-info">
              <div className="extension-name">Live Room Collaboration</div>
              <div className="extension-desc">Real-time peer pair programming & shared edits</div>
            </div>
          </div>
        </div>
      ) : activeSidebarTab === 'source-control' ? (
        <div className="sidebar-source-control-panel animate-fade-in">
          {/* Header bar */}
          <div className="sc-header-bar">
            <div className="sc-header-title">
              <span>Source Control</span>
              {gitStatus.totalCount > 0 && (
                <span className="sc-header-badge">{gitStatus.totalCount}</span>
              )}
            </div>
            <div className="sc-header-actions">
              <button
                type="button"
                onClick={handleStageAll}
                className="sc-tool-btn"
                title="Stage All Changes"
              >
                <span className="material-symbols-outlined text-[15px]">done_all</span>
              </button>
              <button
                type="button"
                onClick={handleGitMore}
                className="sc-tool-btn"
                title="Branch Switcher & Git Menu"
              >
                <span className="material-symbols-outlined text-[15px]">more_horiz</span>
              </button>
            </div>
          </div>

          {/* Active Branch Pill Row */}
          <div className="sc-branch-row">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_BRANCH_MODAL_OPEN', payload: true })}
              className="sc-branch-pill"
              title="Click to Switch or Create Branch"
            >
              <span className="material-symbols-outlined text-[13px]">call_split</span>
              <span>{state.gitBranch || 'main'}</span>
              <span className="material-symbols-outlined text-[12px] opacity-70">expand_more</span>
            </button>
          </div>

          {/* Commit Input Area */}
          <div className="sc-commit-box">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleCommit();
                }
              }}
              className="sc-commit-textarea"
              placeholder="Message (Ctrl+Enter to commit)"
              rows={3}
            />
            <div className="sc-commit-footer">
              <span className="text-[11px] text-muted">
                {state.gitBranch || 'main'}{gitStatus.totalCount > 0 ? '*' : ''}
              </span>
              <button
                type="button"
                onClick={handleCommit}
                className="sc-commit-btn"
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>Commit</span>
              </button>
            </div>
          </div>

          {/* Changes List Tree */}
          <div className="sc-changes-tree">
            {/* Staged Changes Section */}
            <div>
              <div
                className="sc-section-header"
                onClick={() => setStagedExpanded(!stagedExpanded)}
              >
                <div className="flex items-center space-x-1">
                  <span className="material-symbols-outlined text-[14px]">
                    {stagedExpanded ? 'expand_more' : 'chevron_right'}
                  </span>
                  <span>Staged Changes</span>
                </div>
                <span>{gitStatus.staged.length}</span>
              </div>

              {stagedExpanded && (
                <div className="mt-1 space-y-0.5">
                  {gitStatus.staged.length === 0 ? (
                    <div className="text-xs text-muted italic px-3 py-1">
                      No staged changes
                    </div>
                  ) : (
                    gitStatus.staged.map((item) => (
                      <div
                        key={`staged-${item.file.id}`}
                        onClick={() => handleOpenFileDiff(item)}
                        className="sc-file-item"
                        title="Click to view Git Diff"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="material-symbols-outlined text-[15px] text-secondary">description</span>
                          <span className="truncate">{item.file.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <span className="sc-file-badge-m">M</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnstageFile(item.file.id);
                            }}
                            className="p-0.5 hover:text-primary text-muted cursor-pointer"
                            title="Unstage changes"
                          >
                            <span className="material-symbols-outlined text-[14px]">remove</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Changes (Unstaged) Section */}
            <div>
              <div
                className="sc-section-header"
                onClick={() => setUnstagedExpanded(!unstagedExpanded)}
              >
                <div className="flex items-center space-x-1">
                  <span className="material-symbols-outlined text-[14px]">
                    {unstagedExpanded ? 'expand_more' : 'chevron_right'}
                  </span>
                  <span>Changes</span>
                </div>
                <span>{gitStatus.unstaged.length}</span>
              </div>

              {unstagedExpanded && (
                <div className="mt-1 space-y-0.5">
                  {gitStatus.unstaged.length === 0 ? (
                    <div className="text-xs text-muted italic px-3 py-1">
                      Working tree clean
                    </div>
                  ) : (
                    gitStatus.unstaged.map((item) => (
                      <div
                        key={`unstaged-${item.file.id}`}
                        onClick={() => handleOpenFileDiff(item)}
                        className="sc-file-item"
                        title="Click to view Git Diff"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="material-symbols-outlined text-[15px] text-muted">
                            {item.file.name.endsWith('.css') ? 'css' : item.file.name.endsWith('.py') ? 'code' : 'description'}
                          </span>
                          <span className="truncate">{item.file.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          {item.status === 'M' ? (
                            <span className="sc-file-badge-m">M</span>
                          ) : (
                            <span className="text-emerald-400 font-bold text-label-sm px-1 rounded bg-emerald-400/10">U</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageFile(item.file.id);
                            }}
                            className="p-0.5 hover:text-primary text-muted cursor-pointer"
                            title="Stage changes"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Commit History on Current Branch */}
            <div className="px-space-xs py-1 mt-3 border-t border-outline-variant/40 pt-2">
              <div
                className="flex items-center justify-between text-label-md text-on-surface-variant uppercase tracking-wider px-space-xs py-1 cursor-pointer select-none hover:text-on-surface"
                onClick={() => setHistoryExpanded(!historyExpanded)}
              >
                <div className="flex items-center space-x-1">
                  <span className="material-symbols-outlined text-[14px]">
                    {historyExpanded ? 'expand_more' : 'chevron_right'}
                  </span>
                  <span>Commit History ({state.gitBranch || 'main'})</span>
                </div>
                <span className="text-[11px] font-mono">{commitHistory.length}</span>
              </div>

              {historyExpanded && (
                <div className="mt-1 space-y-1 px-1">
                  {commitHistory.length === 0 ? (
                    <div className="text-xs text-on-surface-variant/50 italic px-space-sm py-1">
                      No commits on this branch yet
                    </div>
                  ) : (
                    commitHistory.slice(0, 15).map((c) => (
                      <div
                        key={c.id || c.hash}
                        className="p-1.5 rounded bg-surface-container-low hover:bg-surface-container-high transition-colors text-body-sm flex flex-col space-y-0.5 border border-outline-variant/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-on-surface truncate text-[12px]">{c.message}</span>
                          <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-semibold ${c.pushed ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                            {c.pushed ? 'Synced' : 'Local'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 font-mono">
                          <span>{c.hash}</span>
                          <span>{c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Explorer Header */}
          <div className="explorer-header">
            <div className="explorer-title-group">
              <span className="explorer-title">EXPLORER</span>
            </div>

            <div className="explorer-header-actions">
              <button
                className="explorer-action-btn"
                onClick={() => startAddFile('')}
                title="New File"
              >
                <FilePlus size={14} />
              </button>

              <button
                className="explorer-action-btn"
                onClick={handleOpenLocalFolderPrompt}
                title="Open Local Project Folder"
              >
                <FolderOpen size={14} />
              </button>

              <button
                className="explorer-action-btn"
                onClick={() => startAddFolder('')}
                title="New Folder"
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
                title="Import Folder"
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

          {/* Search Input (visible if Search tab active or always available as search filter) */}
          <div className="explorer-search">
            <Search size={12} className="search-icon" />
            <input
              ref={searchInputRef}
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
      <div
        className={`explorer-files-list ${isDroppingExternal ? 'external-drop-active' : ''}`}
        onDragOver={handleExternalDragOver}
        onDragEnter={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
      >
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
              onDoubleClick={(e) => handleOpenFileOptions(e, file, '')}
              onContextMenu={(e) => handleOpenFileOptions(e, file, '')}
              draggable={!isEditing}
              onDragStart={(e) => setupFileDragDataTransfer(e, file)}
              title={`${file.name} — ${file.language?.name || 'File'} (Double-click or right-click for options)`}
            >
              <span className="file-icon">
                <LanguageIcon language={file.language} filename={file.name} workspaceFiles={state?.files} size={15} />
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
                      handleDuplicateFile(file);
                    }}
                    title={`Duplicate & make copy of ${file.name}`}
                  >
                    <Copy size={11} />
                  </button>

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
        </>
      )}

      {/* Footer Nav inside Sidebar */}
      <div className="sidebar-footer">
        <div
          className="sidebar-footer-btn"
          onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' })}
          title="Open Settings (Themes, Audio, Shortcuts & Workspaces)"
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          <span className="sidebar-footer-text">Settings</span>
        </div>
      </div>

      {/* Password Security Unlock Modal */}
      <PasswordPromptModal
        isOpen={Boolean(securityTarget)}
        targetItem={securityTarget}
        onClose={() => setSecurityTarget(null)}
        onUnlocked={handleUnlockedItem}
      />

      {/* Multiple Options File Menu (on Double-Click and Right-Click) */}
      {fileOptionsMenu && (
        <FileOptionsMenu
          file={fileOptionsMenu.file}
          folderPath={fileOptionsMenu.folderPath}
          position={fileOptionsMenu.position}
          rect={fileOptionsMenu.rect}
          onClose={() => setFileOptionsMenu(null)}
          onStartRename={(f) => startEditFile(null, f)}
          onProtect={(f) => {
            setSecurityTarget({
              key: f.name,
              name: f.name,
              isFolder: false,
              fileId: f.id,
            });
          }}
        />
      )}

    </aside>
  );
}
