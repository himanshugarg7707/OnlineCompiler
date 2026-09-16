import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Archive,
  Download,
  Upload,
  Share2,
  Volume2,
  VolumeX,
  Zap,
  Award,
  Palette,
  Code2,
  Bot,
  Shield,
  Trash2,
  Check,
  Copy,
  HardDrive,
  Sparkles,
  Eye,
  Paintbrush,
  RotateCcw,
  History,
  Clock,
  CheckCircle2,
  GitCompare,
  Search,
  FileCode,
  FolderInput,
  FolderUp,
  FileUp,
  ArrowRight,
  Folder,
  FolderPlus,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import {
  getSecurityLocks,
  lockFile,
  removeFileLock,
  lockFolder,
  removeFolderLock,
  lockNotebook,
  removeNotebookLock,
} from '../services/securityService';
import { getSavedNotebooks } from '../services/notebooksService';
import { applyCustomPalette, clearCustomPaletteOverrides } from '../services/themeService';
import { getHistorySnapshots, deleteSnapshot, clearAllHistory } from '../services/historyService';
import {
  getStorageEstimate,
  requestPersistentStorage,
  downloadBackupFile,
} from '../services/storageService';
import { generateShareUrl } from '../services/shareService';
import {
  processFileList,
  processDataTransferItems,
  unpackZipFile,
} from '../services/importService';
import './SettingsPage.css';



const QUICK_PALETTES = [
  { name: 'Neon Matrix', bg: '#05130b', primary: '#00ff88', secondary: '#00e5ff', icon: '🟢' },
  { name: 'Sunset Synth', bg: '#180828', primary: '#ff007f', secondary: '#f59e0b', icon: '🌅' },
  { name: 'Electric Violet', bg: '#0f0728', primary: '#a855f7', secondary: '#06b6d4', icon: '⚡' },
  { name: 'Deep Abyss', bg: '#060b19', primary: '#38bdf8', secondary: '#818cf8', icon: '🌌' },
  { name: 'Emerald Code', bg: '#0a1913', primary: '#10b981', secondary: '#34d399', icon: '🍃' },
  { name: 'Blood Moon', bg: '#1a0808', primary: '#ef4444', secondary: '#f97316', icon: '🩸' },
  { name: 'Cyber Rose', bg: '#1a0818', primary: '#f43f5e', secondary: '#ec4899', icon: '🌸' },
  { name: 'Amber Gold', bg: '#140f05', primary: '#f59e0b', secondary: '#fbbf24', icon: '👑' },
];

const THEMES = [
  {
    id: 'custom',
    name: 'Custom 3-Color Engine',
    icon: '🎨',
    description: 'Dynamic user-defined 3-color palette',
    badge: '3-Color',
    isCustom: true,
  },
  {
    id: 'dark',
    name: 'Full Code Dark',
    icon: '🌌',
    description: 'Obsidian dark with cyan & purple glow',
    bgPreview: '#0d1117',
    accentPreview: '#00d4ff',
    secondaryPreview: '#b480ff',
  },
  {
    id: 'baby-pink',
    name: 'Baby Pink (Light)',
    icon: '🌸',
    description: 'Cute sakura pastel with rose accents',
    bgPreview: '#fff0f5',
    accentPreview: '#ec4899',
    secondaryPreview: '#f472b6',
    badge: 'Light',
  },
  {
    id: 'baby-pink-dark',
    name: 'Baby Pink (Dark)',
    icon: '🌺',
    description: 'Deep obsidian rose with glowing neon pink',
    bgPreview: '#12070f',
    accentPreview: '#f472b6',
    secondaryPreview: '#e879f9',
    badge: 'Popular',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    icon: '⚡',
    description: 'Deep violet with electric neon cyan',
    bgPreview: '#0a0518',
    accentPreview: '#00f0ff',
    secondaryPreview: '#ff007f',
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    icon: '🎨',
    description: 'Warm charcoal with vivid syntax colors',
    bgPreview: '#272822',
    accentPreview: '#a6e22e',
    secondaryPreview: '#f92672',
  },
  {
    id: 'light',
    name: 'Clean Light',
    icon: '☀️',
    description: 'Crisp modern white & slate styling',
    bgPreview: '#ffffff',
    accentPreview: '#0284c7',
    secondaryPreview: '#7c3aed',
  },
  {
    id: 'nord',
    name: 'Nord Frost',
    icon: '❄️',
    description: 'Arctic blue & ice frost palette',
    bgPreview: '#2e3440',
    accentPreview: '#88c0d0',
    secondaryPreview: '#b48ead',
  },
];

export default function SettingsPage() {
  const {
    state,
    dispatch,
    handleDownloadWorkspace,
    handleImportZip,
    handleUpdateConfig,
    handleCodeChange,
    handleAddFile,
    handleLoadWorkspaceState,
    showToast,
  } = useApp();

  const { config, files, folders } = state;
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('tab=import')) return 'import';
      if (hash.includes('tab=history')) return 'history';
      if (hash.includes('tab=zip')) return 'zip';
      if (hash.includes('tab=editor')) return 'editor';
      if (hash.includes('tab=ai')) return 'ai';
      if (hash.includes('tab=security')) return 'security';
      if (hash.includes('tab=themes')) return 'themes';
    }
    return 'themes'; // Default to themes & custom color palette
  });
  const [localConfig, setLocalConfig] = useState(config);
  const [storageInfo, setStorageInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Version History State
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterFile, setHistoryFilterFile] = useState('all');
  const [historyViewMode, setHistoryViewMode] = useState('preview'); // 'preview' | 'diff'

  const refreshSnapshots = () => {
    const list = getHistorySnapshots();
    setSnapshots(list);
    if (list.length > 0 && !selectedSnapshotId) {
      setSelectedSnapshotId(list[0].id);
    }
  };

  useEffect(() => {
    refreshSnapshots();
  }, []);
  

  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      const matchesSearch = s.fileName.toLowerCase().includes(historySearch.toLowerCase().trim());
      if (historyFilterFile !== 'all') {
        return matchesSearch && s.fileName === historyFilterFile;
      }
      return matchesSearch;
    });
  }, [snapshots, historySearch, historyFilterFile]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || filteredSnapshots[0];
  const targetCurrentFile = files.find((f) => f.name === selectedSnapshot?.fileName);

  const diffLines = useMemo(() => {
    if (!selectedSnapshot || !targetCurrentFile) return [];
    const snapLines = (selectedSnapshot.content || '').split('\n');
    const currLines = (targetCurrentFile.content || '').split('\n');
    const maxLines = Math.max(snapLines.length, currLines.length);
    const result = [];
    for (let i = 0; i < maxLines; i++) {
      const snapLine = snapLines[i];
      const currLine = currLines[i];
      if (snapLine === currLine) {
        result.push({ type: 'same', text: snapLine ?? '', lineNum: i + 1 });
      } else if (snapLine !== undefined && currLine !== undefined) {
        result.push({ type: 'modified-old', text: snapLine, lineNum: i + 1 });
        result.push({ type: 'modified-new', text: currLine, lineNum: i + 1 });
      } else if (snapLine !== undefined) {
        result.push({ type: 'removed', text: snapLine, lineNum: i + 1 });
      } else if (currLine !== undefined) {
        result.push({ type: 'added', text: currLine, lineNum: i + 1 });
      }
    }
    return result;
  }, [selectedSnapshot, targetCurrentFile]);

  const handleRestoreSnapshot = (snapshot) => {
    if (!snapshot) return;
    const target = files.find((f) => f.name === snapshot.fileName);
    if (target) {
      handleCodeChange(snapshot.content, target.id);
      showToast(`Restored ${snapshot.fileName} to version (${new Date(snapshot.timestamp).toLocaleTimeString()}) ⏳`);
    } else {
      handleAddFile(snapshot.fileName, snapshot.content);
      showToast(`Re-created and restored ${snapshot.fileName} from history! ⏳`);
    }
  };

  const handleDeleteSnapshot = (e, id) => {
    e.stopPropagation();
    const updated = deleteSnapshot(id);
    setSnapshots(updated);
    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(updated[0]?.id || null);
    }
    showToast('Snapshot removed from local history');
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Clear all version history snapshots? This cannot be undone.')) {
      clearAllHistory();
      setSnapshots([]);
      setSelectedSnapshotId(null);
      showToast('All local version history cleared');
    }
  };

  // Custom 3-Color Theme Engine State
  const [customBg, setCustomBg] = useState(config?.customPalette?.bg || '#0f172a');
  const [customPrimary, setCustomPrimary] = useState(config?.customPalette?.primary || '#00d4ff');
  const [customSecondary, setCustomSecondary] = useState(config?.customPalette?.secondary || '#8b5cf6');

  const zipInputRef = useRef(null);

  // Import Files & Folders State
  const [stagedFiles, setStagedFiles] = useState([]);
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const [isDragging, setIsDragging] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);
  // Security Vault & Password Locking State
  const [securityLocks, setSecurityLocks] = useState(getSecurityLocks);
  const [lockSubTab, setLockSubTab] = useState('files'); // 'files' | 'folders' | 'notebooks'
  const [lockModal, setLockModal] = useState(null); // { type, item, mode: 'lock' | 'unlock' }
  const [lockPassword, setLockPassword] = useState('');
  const [lockConfirmPassword, setLockConfirmPassword] = useState('');
  const [lockError, setLockError] = useState('');

  const savedNotebooks = useMemo(() => {
    try {
      return getSavedNotebooks() || [];
    } catch {
      return [];
    }
  }, [activeTab]);

  const handleOpenLockModal = (type, item, mode) => {
    setLockModal({ type, item, mode });
    setLockPassword('');
    setLockConfirmPassword('');
    setLockError('');
  };

  const handleConfirmLockAction = async () => {
    if (!lockModal) return;
    const { type, item, mode } = lockModal;

    if (!lockPassword.trim()) {
      setLockError('Password cannot be empty');
      return;
    }

    if (mode === 'lock' && lockPassword !== lockConfirmPassword) {
      setLockError('Passwords do not match');
      return;
    }

    try {
      if (mode === 'lock') {
        if (type === 'file') {
          const updatedFile = await lockFile(item, lockPassword);
          const newFiles = (files || []).map((f) => (f.id === item.id ? updatedFile : f));
          dispatch({ type: 'SET_FILES', payload: newFiles });
        } else if (type === 'folder') {
          await lockFolder(item.id, item.name, lockPassword);
        } else if (type === 'notebook') {
          await lockNotebook(item.id, item.title, lockPassword);
        }
        showToast(`🔒 "${item.name || item.title}" is now password-protected & encrypted!`);
      } else {
        // Unlock / Remove lock
        if (type === 'file') {
          const restoredFile = await removeFileLock(item, lockPassword);
          const newFiles = (files || []).map((f) => (f.id === item.id ? restoredFile : f));
          dispatch({ type: 'SET_FILES', payload: newFiles });
        } else if (type === 'folder') {
          await removeFolderLock(item.id, lockPassword);
        } else if (type === 'notebook') {
          await removeNotebookLock(item.id, lockPassword);
        }
        showToast(`🔓 Lock removed from "${item.name || item.title}"!`);
      }
      setSecurityLocks(getSecurityLocks());
      setLockModal(null);
    } catch (err) {
      setLockError(err.message || 'Action failed. Please check password.');
    }
  };

  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);


  const handleConfigChange = (key, value) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    handleUpdateConfig(updated);

    if (key === 'theme') {
      if (value !== 'custom') {
        clearCustomPaletteOverrides();
      } else {
        const palette = localConfig.customPalette || {
          bg: customBg,
          primary: customPrimary,
          secondary: customSecondary,
        };
        applyCustomPalette(palette);
      }
      showToast(`Theme changed to ${value === 'custom' ? 'Custom 3-Color' : value} 🎨`);
    }
  };

  const handleLiveColorChange = (key, value) => {
    let newBg = customBg;
    let newPrimary = customPrimary;
    let newSecondary = customSecondary;

    if (key === 'bg') {
      newBg = value;
      setCustomBg(value);
    } else if (key === 'primary') {
      newPrimary = value;
      setCustomPrimary(value);
    } else if (key === 'secondary') {
      newSecondary = value;
      setCustomSecondary(value);
    }

    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      const palette = { bg: newBg, primary: newPrimary, secondary: newSecondary };
      const updated = {
        ...localConfig,
        theme: 'custom',
        customPalette: palette,
      };
      setLocalConfig(updated);
      handleUpdateConfig({ theme: 'custom', customPalette: palette });
      applyCustomPalette(palette);
    }
  };

  const handleApplyCustomPalette = () => {
    const palette = {
      bg: customBg,
      primary: customPrimary,
      secondary: customSecondary,
    };
    const updated = {
      ...localConfig,
      theme: 'custom',
      customPalette: palette,
    };
    setLocalConfig(updated);
    handleUpdateConfig({ theme: 'custom', customPalette: palette });
    applyCustomPalette(palette);
    showToast('Custom 3-color theme applied live! 🎨');
  };

  const handleApplyPresetPalette = (bg, primary, secondary, name) => {
    setCustomBg(bg);
    setCustomPrimary(primary);
    setCustomSecondary(secondary);
    const palette = { bg, primary, secondary };
    const updated = {
      ...localConfig,
      theme: 'custom',
      customPalette: palette,
    };
    setLocalConfig(updated);
    handleUpdateConfig({ theme: 'custom', customPalette: palette });
    applyCustomPalette(palette);
    showToast(`Applied ${name} palette! 🎨`);
  };

  const handleResetToDefaultTheme = () => {
    clearCustomPaletteOverrides();
    handleConfigChange('theme', 'dark');
    showToast('Reverted to Full Code Dark theme');
  };


  const handleExportZip = () => {
    handleDownloadWorkspace();
  };

  const handleZipFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportZip(file);
    e.target.value = '';
  };

  const handleCopyShareUrl = () => {
    try {
      const url = generateShareUrl(files, state.activeFileId, state.stdin);
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      showToast('Copied shareable project link to clipboard! 📋');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      showToast('Error generating share link');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFolderInputChanged = async (e) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    setIsProcessingImport(true);
    try {
      const processed = await processFileList(rawFiles);
      if (processed.length === 0) {
        showToast('No readable code files found in selected folder');
      } else {
        setStagedFiles((prev) => {
          const existingPaths = new Set(prev.map((f) => f.path));
          const newItems = processed.filter((f) => !existingPaths.has(f.path));
          return [...prev, ...newItems];
        });
        showToast(`Staged ${processed.length} file(s) from folder 📁`);
        setImportSuccessCount(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error reading folder contents');
    } finally {
      setIsProcessingImport(false);
      e.target.value = '';
    }
  };

  const handleMultiFileInputChanged = async (e) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    setIsProcessingImport(true);
    try {
      const processed = await processFileList(rawFiles);
      if (processed.length === 0) {
        showToast('No readable code files found');
      } else {
        setStagedFiles((prev) => {
          const existingPaths = new Set(prev.map((f) => f.path));
          const newItems = processed.filter((f) => !existingPaths.has(f.path));
          return [...prev, ...newItems];
        });
        showToast(`Staged ${processed.length} file(s) 📄`);
        setImportSuccessCount(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error reading files');
    } finally {
      setIsProcessingImport(false);
      e.target.value = '';
    }
  };

  const handleImportZipChanged = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImport(true);
    try {
      const processed = await unpackZipFile(file);
      if (processed.length === 0) {
        showToast('No valid files found inside ZIP');
      } else {
        setStagedFiles((prev) => {
          const existingPaths = new Set(prev.map((f) => f.path));
          const newItems = processed.filter((f) => !existingPaths.has(f.path));
          return [...prev, ...newItems];
        });
        showToast(`Extracted & staged ${processed.length} file(s) from ZIP 📦`);
        setImportSuccessCount(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to unpack ZIP archive');
    } finally {
      setIsProcessingImport(false);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const rawFiles = e.dataTransfer.files;

    if (!items && !rawFiles) return;
    setIsProcessingImport(true);

    try {
      let processed = [];
      const zipFile = Array.from(rawFiles || []).find((f) => f.name.endsWith('.zip'));
      if (zipFile) {
        processed = await unpackZipFile(zipFile);
      } else if (items && items.length > 0) {
        processed = await processDataTransferItems(items);
      } else if (rawFiles && rawFiles.length > 0) {
        processed = await processFileList(rawFiles);
      }

      if (processed.length === 0) {
        showToast('No readable code files detected in drop');
      } else {
        setStagedFiles((prev) => {
          const existingPaths = new Set(prev.map((f) => f.path));
          const newItems = processed.filter((f) => !existingPaths.has(f.path));
          return [...prev, ...newItems];
        });
        showToast(`Staged ${processed.length} dropped file(s) 🎯`);
        setImportSuccessCount(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error processing dropped files/folders');
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleRemoveStagedFile = (id) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearStaged = () => {
    setStagedFiles([]);
    setImportSuccessCount(null);
  };

  const handleCommitImport = () => {
    if (stagedFiles.length === 0) return;

    const extractFoldersFromPaths = (filePaths) => {
      const folderSet = new Set();
      filePaths.forEach((path) => {
        if (path.includes('/')) {
          const parts = path.split('/');
          parts.pop();
          let acc = '';
          parts.forEach((p) => {
            acc = acc ? `${acc}/${p}` : p;
            folderSet.add(acc);
          });
        }
      });
      return Array.from(folderSet);
    };

    if (importMode === 'replace') {
      const newFiles = stagedFiles.map((sf) => ({
        id: sf.id,
        name: sf.path,
        content: sf.content,
        language: sf.language,
      }));
      const newFolders = extractFoldersFromPaths(newFiles.map((f) => f.name));
      handleLoadWorkspaceState({
        files: newFiles,
        folders: newFolders,
        activeFileId: newFiles[0]?.id,
        stdin: state.stdin,
      });
      setImportSuccessCount(newFiles.length);
      setStagedFiles([]);
      showToast(`Loaded ${newFiles.length} file(s) into workspace (Replaced) 🚀`);
    } else {
      const existingNames = new Set(state.files.map((f) => f.name));
      const existingFolders = new Set(state.folders);

      const addedFiles = [];
      stagedFiles.forEach((sf) => {
        let uniqueName = sf.path;
        let counter = 1;
        while (existingNames.has(uniqueName)) {
          const dotIdx = sf.path.lastIndexOf('.');
          if (dotIdx !== -1) {
            uniqueName = `${sf.path.substring(0, dotIdx)}_${counter}${sf.path.substring(dotIdx)}`;
          } else {
            uniqueName = `${sf.path}_${counter}`;
          }
          counter++;
        }
        existingNames.add(uniqueName);

        addedFiles.push({
          id: sf.id,
          name: uniqueName,
          content: sf.content,
          language: sf.language,
        });
      });

      const extractedFolders = extractFoldersFromPaths(addedFiles.map((f) => f.name));
      extractedFolders.forEach((fld) => existingFolders.add(fld));

      const combinedFiles = [...state.files, ...addedFiles];
      const combinedFolders = Array.from(existingFolders);

      handleLoadWorkspaceState({
        files: combinedFiles,
        folders: combinedFolders,
        activeFileId: addedFiles[0]?.id || state.activeFileId,
        stdin: state.stdin,
      });

      setImportSuccessCount(addedFiles.length);
      setStagedFiles([]);
      showToast(`Imported & appended ${addedFiles.length} file(s) to workspace! 🚀`);
    }
  };

  const handleReturnToEditor = () => {
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  return (
    <div className="settings-page-wrapper">
      {/* Top Application Header */}
      <header className="settings-page-header">
        <div className="settings-header-left">
          <button
            className="btn-back-to-ide"
            onClick={handleReturnToEditor}
            title="Return to Online Compiler Workspace"
          >
            <ArrowLeft size={16} />
            <span>Back to IDE</span>
          </button>
          <div className="settings-breadcrumbs">
            <span className="crumb-root">Workspace</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Settings & Export Hub</span>
          </div>
        </div>

        <div className="settings-header-right">
          <div className="settings-badge-files">
            <span>{files.length} Files</span>
            <span className="dot-divider">•</span>
            <span>{folders.length} Folders</span>
          </div>
          <button className="btn-done-primary" onClick={handleReturnToEditor}>
            Done
          </button>
        </div>
      </header>

      {/* Main Settings Suite Content */}
      <div className="settings-page-body">
        {/* Navigation Sidebar */}
        <aside className="settings-sidebar">
          <div className="sidebar-group-title">PROJECT & WORKSPACE</div>
          <button
            className={`settings-nav-item ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <FolderInput size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">Import Files & Folders</span>
              <span className="nav-sub">Upload folders, files or ZIPs</span>
            </div>
            {stagedFiles.length > 0 ? (
              <span className="nav-pill highlight">{stagedFiles.length}</span>
            ) : (
              <span className="nav-pill">NEW</span>
            )}
          </button>

          <button
            className={`settings-nav-item ${activeTab === 'zip' ? 'active' : ''}`}
            onClick={() => setActiveTab('zip')}
          >
            <Archive size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">Export & ZIP Archive</span>
              <span className="nav-sub">Download ZIP & share project</span>
            </div>
            <span className="nav-pill highlight">ZIP</span>
          </button>

          <button
            className={`settings-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              refreshSnapshots();
            }}
          >
            <History size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">Version History</span>
              <span className="nav-sub">Snapshots, diffs & rollbacks</span>
            </div>
            {snapshots.length > 0 && (
              <span className="nav-pill">{snapshots.length}</span>
            )}
          </button>

          <div className="sidebar-group-title">PREFERENCES</div>
          <button
            className={`settings-nav-item ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            <Palette size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">Themes & Colors</span>
              <span className="nav-sub">Cyberpunk, Monokai, Nord</span>
            </div>
          </button>

          <button
            className={`settings-nav-item ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <Code2 size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">Editor Core</span>
              <span className="nav-sub">Fonts, minimap, formatting</span>
            </div>
          </button>

          <button
            className={`settings-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">AI & Diagnostics</span>
              <span className="nav-sub">Real-time linting & hover tags</span>
            </div>
          </button>

          <button
            className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={16} className="nav-icon" />
            <div className="nav-text">
              <span className="nav-title">Security & Storage</span>
              <span className="nav-sub">File PIN lock & quota</span>
            </div>
          </button>
        </aside>

        {/* Right Tab Content View */}
        <main className="settings-main-panel">
          {/* TAB: IMPORT FILES & FOLDERS */}
          {activeTab === 'import' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box import-hero-box">
                  <FolderInput size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>Import Files, Folders & Projects</h2>
                  <p>
                    Load complete local directory trees with nested folders preserved, select single or batch code files, or unpack compressed ZIP archives straight into your workspace.
                  </p>
                </div>
              </div>

              {/* Hidden file input elements */}
              <input
                type="file"
                ref={folderInputRef}
                webkitdirectory=""
                directory=""
                multiple
                style={{ display: 'none' }}
                onChange={handleFolderInputChanged}
              />
              <input
                type="file"
                ref={fileInputRef}
                multiple
                style={{ display: 'none' }}
                onChange={handleMultiFileInputChanged}
              />
              <input
                type="file"
                ref={importZipInputRef}
                accept=".zip,application/zip"
                style={{ display: 'none' }}
                onChange={handleImportZipChanged}
              />

              {/* Success Notification Banner */}
              {importSuccessCount !== null && (
                <div className="import-success-banner">
                  <div className="banner-left">
                    <CheckCircle2 size={22} className="banner-icon-success" />
                    <div>
                      <h4>Successfully Imported {importSuccessCount} File{importSuccessCount === 1 ? '' : 's'}!</h4>
                      <p>All files, folders, and syntax mappings have been synchronized to your active workspace.</p>
                    </div>
                  </div>
                  <button className="btn-banner-action" onClick={handleReturnToEditor}>
                    <span>Open in Editor</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* 3 Import Cards */}
              <div className="settings-cards-grid">
                {/* Folder Upload Card */}
                <div className="feature-card highlight-card">
                  <div className="card-top">
                    <div className="card-icon-wrap folder-gradient">
                      <FolderUp size={22} />
                    </div>
                    <div>
                      <h3>Import Entire Folder</h3>
                      <p>Select any local project folder. All subdirectories, package hierarchies, and source files will be staged intact.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button
                      className="btn-cyber-primary"
                      onClick={() => folderInputRef.current?.click()}
                      disabled={isProcessingImport}
                    >
                      <FolderUp size={16} />
                      <span>{isProcessingImport ? 'Reading Folder...' : 'Select Local Folder'}</span>
                    </button>
                    <span className="card-stats-text">Preserves folder trees & subpaths</span>
                  </div>
                </div>

                {/* Individual Files Card */}
                <div className="feature-card">
                  <div className="card-top">
                    <div className="card-icon-wrap upload-gradient">
                      <FileUp size={22} />
                    </div>
                    <div>
                      <h3>Import Code Files</h3>
                      <p>Select one or multiple code files (.java, .py, .cpp, .js, .html, etc.) to stage and add to your active workspace.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button
                      className="btn-cyber-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImport}
                    >
                      <FileUp size={16} />
                      <span>Select Code Files</span>
                    </button>
                    <span className="card-stats-text">Multi-file selection enabled</span>
                  </div>
                </div>

                {/* ZIP Archive Card */}
                <div className="feature-card">
                  <div className="card-top">
                    <div className="card-icon-wrap zip-gradient">
                      <Archive size={22} />
                    </div>
                    <div>
                      <h3>Unpack ZIP Archive</h3>
                      <p>Extract zipped repositories or archives in real-time. Unpacks client-side with zero upload latency or leaks.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button
                      className="btn-cyber-secondary"
                      onClick={() => importZipInputRef.current?.click()}
                      disabled={isProcessingImport}
                    >
                      <Archive size={16} />
                      <span>Select ZIP Archive</span>
                    </button>
                    <span className="card-stats-text">Auto-filters .git & build caches</span>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                className={`import-dropzone ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="dropzone-inner">
                  <div className="dropzone-icon-pulse">
                    <FolderPlus size={32} />
                  </div>
                  <h3>Drag & Drop Folders or Files Here</h3>
                  <p>Drop whole project directories, individual code files, or ZIP archives directly from your computer file explorer.</p>
                  <div className="dropzone-badges">
                    <span className="drop-badge">Directories Supported</span>
                    <span className="drop-badge">Multi-File Batch</span>
                    <span className="drop-badge">ZIP Archives</span>
                  </div>
                </div>
              </div>

              {/* Staging Area / Preview */}
              {stagedFiles.length > 0 && (
                <div className="staged-import-panel animate-fade-in">
                  <div className="staged-panel-header">
                    <div className="staged-summary">
                      <h3>Staged Files Ready for Workspace</h3>
                      <div className="staged-pills">
                        <span className="staged-pill highlight">
                          {stagedFiles.length} file{stagedFiles.length === 1 ? '' : 's'}
                        </span>
                        <span className="staged-pill">
                          Total: {formatFileSize(stagedFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                        </span>
                        <span className="staged-pill">
                          {new Set(stagedFiles.filter(f => f.path.includes('/')).map(f => f.path.split('/')[0])).size} folder(s)
                        </span>
                      </div>
                    </div>

                    <div className="staged-controls">
                      {/* Destination Mode */}
                      <div className="import-mode-selector" title="Choose destination behavior">
                        <button
                          type="button"
                          className={`mode-btn ${importMode === 'append' ? 'active' : ''}`}
                          onClick={() => setImportMode('append')}
                        >
                          Append to Current Workspace
                        </button>
                        <button
                          type="button"
                          className={`mode-btn ${importMode === 'replace' ? 'active' : ''}`}
                          onClick={() => setImportMode('replace')}
                        >
                          Replace Workspace
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn-clear-staged"
                        onClick={handleClearStaged}
                        title="Clear all staged files"
                      >
                        <Trash2 size={14} />
                        <span>Clear</span>
                      </button>

                      <button
                        type="button"
                        className="btn-commit-import"
                        onClick={handleCommitImport}
                      >
                        <ArrowRight size={16} />
                        <span>Commit & Import ({stagedFiles.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Staged Files List */}
                  <div className="staged-files-list">
                    <div className="staged-table-head">
                      <span>File Path</span>
                      <span>Language</span>
                      <span>Size</span>
                      <span style={{ textAlign: 'right' }}>Remove</span>
                    </div>
                    <div className="staged-table-body">
                      {stagedFiles.map((file) => (
                        <div key={file.id} className="staged-file-row">
                          <div className="staged-file-name-col">
                            {file.path.includes('/') ? (
                              <Folder size={15} className="staged-icon folder" />
                            ) : (
                              <FileCode size={15} className="staged-icon file" />
                            )}
                            <span className="staged-path-text" title={file.path}>
                              {file.path}
                            </span>
                          </div>
                          <div className="staged-file-lang-col">
                            <span className="lang-tag">{file.language?.name || 'Text'}</span>
                          </div>
                          <div className="staged-file-size-col">
                            {formatFileSize(file.size)}
                          </div>
                          <div className="staged-file-action-col">
                            <button
                              type="button"
                              className="btn-remove-staged"
                              onClick={() => handleRemoveStagedFile(file.id)}
                              title="Remove from staging"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: ZIP & PROJECT EXPORT */}
          {activeTab === 'zip' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box">
                  <Archive size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>Export & Project Archiving</h2>
                  <p>Download your entire project with all folders as a ZIP, or unpack external ZIP archives directly into your workspace.</p>
                </div>
              </div>

              <div className="settings-cards-grid">
                {/* Export Entire Workspace as ZIP Card */}
                <div className="feature-card highlight-card">
                  <div className="card-top">
                    <div className="card-icon-wrap zip-gradient">
                      <Download size={20} />
                    </div>
                    <div>
                      <h3>Download Entire Workspace as ZIP</h3>
                      <p>Packages all {files.length} files and {folders.length} folder structures into a single portable <code>fullcode-project.zip</code> archive.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button className="btn-cyber-primary" onClick={handleExportZip}>
                      <Download size={15} />
                      <span>Export Project ZIP</span>
                    </button>
                    <span className="card-stats-text">Zero dependencies • Instant download</span>
                  </div>
                </div>

                {/* Import External ZIP Card */}
                <div className="feature-card">
                  <div className="card-top">
                    <div className="card-icon-wrap upload-gradient">
                      <Upload size={20} />
                    </div>
                    <div>
                      <h3>Import Workspace from ZIP</h3>
                      <p>Upload a <code>.zip</code> file to extract its files and subdirectories directly into your browser workspace.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <input
                      type="file"
                      ref={zipInputRef}
                      accept=".zip,application/zip"
                      style={{ display: 'none' }}
                      onChange={handleZipFileSelected}
                    />
                    <button className="btn-cyber-secondary" onClick={() => zipInputRef.current?.click()}>
                      <Upload size={15} />
                      <span>Select ZIP Archive</span>
                    </button>
                    <span className="card-stats-text">Preserves folder trees & code files</span>
                  </div>
                </div>

                {/* Share Workspace Link Card */}
                <div className="feature-card">
                  <div className="card-top">
                    <div className="card-icon-wrap share-gradient">
                      <Share2 size={20} />
                    </div>
                    <div>
                      <h3>Shareable Project Link</h3>
                      <p>Compresses the complete multi-file project into a lightweight URL hash. Anyone with the link can preview and clone your workspace.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button className="btn-cyber-secondary" onClick={handleCopyShareUrl}>
                      {copiedLink ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Share URL'}</span>
                    </button>
                    <span className="card-stats-text">Includes multi-file tabs & locks</span>
                  </div>
                </div>

                {/* Portable JSON Backup Card */}
                <div className="feature-card">
                  <div className="card-top">
                    <div className="card-icon-wrap json-gradient">
                      <Code2 size={20} />
                    </div>
                    <div>
                      <h3>JSON Workspace Backup</h3>
                      <p>Export a JSON snapshot containing raw file tokens, metadata, folders, and environment config.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button className="btn-cyber-secondary" onClick={downloadBackupFile}>
                      <Download size={15} />
                      <span>Download JSON Backup</span>
                    </button>
                    <span className="card-stats-text">Best for versioning & data migration</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VERSION HISTORY & SNAPSHOTS */}
          {activeTab === 'history' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box history-box">
                  <History size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>Version History & Snapshots</h2>
                  <p>Automatic local snapshots captured on every run and save. Browse past code revisions, inspect side-by-side diffs, and restore with one click.</p>
                </div>
              </div>

              {/* Filter & Action Toolbar */}
              <div className="history-toolbar-strip">
                <div className="history-search-wrap">
                  <Search size={14} className="history-search-icon" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search snapshots by filename..."
                    className="history-search-input"
                  />
                </div>

                <div className="history-file-filter-wrap">
                  <label>Filter File:</label>
                  <select
                    value={historyFilterFile}
                    onChange={(e) => setHistoryFilterFile(e.target.value)}
                    className="history-filter-select"
                  >
                    <option value="all">All Files ({snapshots.length})</option>
                    {files.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {snapshots.length > 0 && (
                  <button
                    className="btn-danger-compact"
                    onClick={handleClearAllHistory}
                    title="Clear all saved snapshots"
                  >
                    <Trash2 size={13} />
                    <span>Clear All History</span>
                  </button>
                )}
              </div>

              {/* Dual-Pane Workbench Layout */}
              {snapshots.length === 0 ? (
                <div className="history-empty-state">
                  <div className="empty-icon-wrap">
                    <History size={36} />
                  </div>
                  <h3>No Version Snapshots Recorded Yet</h3>
                  <p>Snapshots are automatically created each time you run your code or save your workspace. Run code in the editor to start building revision history.</p>
                </div>
              ) : (
                <div className="history-workbench-layout">
                  {/* Left Column: Revisions Timeline */}
                  <div className="history-timeline-column">
                    <div className="timeline-column-header">
                      <span>Snapshots ({filteredSnapshots.length})</span>
                      <span className="timeline-hint">Latest at top</span>
                    </div>

                    <div className="timeline-snapshots-list">
                      {filteredSnapshots.map((snap) => {
                        const isSelected = selectedSnapshot?.id === snap.id;
                        const dateObj = new Date(snap.timestamp);
                        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                        return (
                          <div
                            key={snap.id}
                            className={`history-snapshot-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedSnapshotId(snap.id)}
                          >
                            <div className="snapshot-card-top">
                              <div className="snapshot-card-file">
                                <FileCode size={14} className="snapshot-file-icon" />
                                <span className="snapshot-file-title">{snap.fileName}</span>
                              </div>
                              <button
                                className="btn-delete-snap"
                                onClick={(e) => handleDeleteSnapshot(e, snap.id)}
                                title="Delete this snapshot"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div className="snapshot-card-meta">
                              <span className="meta-time">
                                <Clock size={11} />
                                {timeStr} • {dateStr}
                              </span>
                              <span className="meta-length">{snap.content?.length || 0} chars</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Code & Diff Viewer */}
                  <div className="history-inspector-column">
                    {selectedSnapshot ? (
                      <div className="inspector-inner">
                        <div className="inspector-top-bar">
                          <div className="inspector-file-info">
                            <strong className="inspector-filename">{selectedSnapshot.fileName}</strong>
                            <span className="inspector-timestamp">
                              Captured {new Date(selectedSnapshot.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="inspector-actions">
                            <div className="view-mode-toggle-group">
                              <button
                                className={`btn-view-toggle ${historyViewMode === 'preview' ? 'active' : ''}`}
                                onClick={() => setHistoryViewMode('preview')}
                              >
                                <Code2 size={13} />
                                <span>Code Preview</span>
                              </button>
                              <button
                                className={`btn-view-toggle ${historyViewMode === 'diff' ? 'active' : ''}`}
                                onClick={() => setHistoryViewMode('diff')}
                              >
                                <GitCompare size={13} />
                                <span>Diff vs Current</span>
                              </button>
                            </div>

                            <button
                              className="btn-restore-snapshot-primary"
                              onClick={() => handleRestoreSnapshot(selectedSnapshot)}
                              title={`Roll back ${selectedSnapshot.fileName} to this snapshot version`}
                            >
                              <RotateCcw size={14} />
                              <span>Restore Snapshot</span>
                            </button>
                          </div>
                        </div>

                        {/* Inspector Body */}
                        <div className="inspector-code-pane">
                          {historyViewMode === 'preview' ? (
                            <pre className="history-preview-code">
                              <code>{selectedSnapshot.content}</code>
                            </pre>
                          ) : (
                            <div className="history-diff-view">
                              {diffLines.length === 0 ? (
                                <div className="diff-identical-notice">
                                  <CheckCircle2 size={18} className="text-success" />
                                  <span>Snapshot code is identical to the current editor version</span>
                                </div>
                              ) : (
                                <div className="diff-lines-wrapper">
                                  {diffLines.map((line, idx) => (
                                    <div key={idx} className={`diff-line ${line.type}`}>
                                      <span className="diff-line-num">{line.lineNum}</span>
                                      <span className="diff-sign">
                                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified-new' ? '+' : line.type === 'modified-old' ? '-' : ' '}
                                      </span>
                                      <span className="diff-text">{line.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="inspector-empty">
                        <span>Select a snapshot from the left list to inspect code and diff</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: THEMES & PALETTES */}
          {activeTab === 'themes' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box palette-box">
                  <Palette size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>Themes & Custom Palette Engine</h2>
                  <p>Select from curated presets (including Baby Pink Dark) or design your own custom 3-color theme live.</p>
                </div>
              </div>

              {/* ─── CUSTOM 3-COLOR THEME BUILDER ─── */}
              <div className="custom-theme-builder-card">
                <div className="custom-theme-builder-header">
                  <div className="card-icon-wrap custom-palette-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(180, 128, 255, 0.2))', border: '1px solid rgba(0, 212, 255, 0.4)' }}>
                    <Paintbrush size={22} style={{ color: customPrimary }} />
                  </div>
                  <div className="builder-header-text">
                    <div className="builder-title-row">
                      <h3>Custom 3-Color Theme Engine</h3>
                      <span className="live-engine-badge">
                        <Sparkles size={11} />
                        <span>Live CSS Engine</span>
                      </span>
                      {localConfig.theme === 'custom' && (
                        <span className="active-custom-badge">✓ Active Theme</span>
                      )}
                    </div>
                    <p>
                      Pick any 3 colors: <strong>Background</strong>, <strong>Primary Accent</strong>, and <strong>Secondary Highlight</strong>. The engine dynamically computes all shades, luminous borders, frosted glass, and editor syntax variables across the entire compiler.
                    </p>
                  </div>
                </div>

                {/* Quick 1-Click Designer Palettes */}
                <div className="quick-palettes-section">
                  <span className="quick-palettes-label">Quick 1-Click Designer Combos:</span>
                  <div className="quick-palettes-chips">
                    {QUICK_PALETTES.map((qp) => (
                      <button
                        key={qp.name}
                        className="quick-palette-chip"
                        onClick={() => handleApplyPresetPalette(qp.bg, qp.primary, qp.secondary, qp.name)}
                        title={`Apply ${qp.name} (${qp.bg}, ${qp.primary}, ${qp.secondary})`}
                      >
                        <span className="quick-chip-icon">{qp.icon}</span>
                        <span className="quick-chip-name">{qp.name}</span>
                        <div className="quick-chip-dots">
                          <span className="mini-dot" style={{ background: qp.bg }} />
                          <span className="mini-dot" style={{ background: qp.primary }} />
                          <span className="mini-dot" style={{ background: qp.secondary }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Interactive Color Pickers */}
                <div className="custom-colors-grid">
                  <div className="custom-color-control-box">
                    <div className="color-control-header">
                      <span className="color-step-num">1</span>
                      <label className="color-control-label">Background Color</label>
                    </div>
                    <p className="color-control-hint">Main window & editor background</p>
                    <div className="color-picker-input-group">
                      <div className="color-swatch-wrapper" style={{ background: customBg }}>
                        <input
                          type="color"
                          value={customBg}
                          onChange={(e) => handleLiveColorChange('bg', e.target.value)}
                          className="native-color-picker"
                          title="Pick background color"
                        />
                      </div>
                      <input
                        type="text"
                        value={customBg}
                        onChange={(e) => handleLiveColorChange('bg', e.target.value)}
                        className="hex-text-input"
                        placeholder="#0f172a"
                      />
                    </div>
                  </div>

                  <div className="custom-color-control-box">
                    <div className="color-control-header">
                      <span className="color-step-num" style={{ background: 'color-mix(in srgb, var(--accent-cyan) 20%, transparent)', color: 'var(--accent-cyan)' }}>2</span>
                      <label className="color-control-label">Primary Accent</label>
                    </div>
                    <p className="color-control-hint">Buttons, tabs, active borders & glow</p>
                    <div className="color-picker-input-group">
                      <div className="color-swatch-wrapper" style={{ background: customPrimary }}>
                        <input
                          type="color"
                          value={customPrimary}
                          onChange={(e) => handleLiveColorChange('primary', e.target.value)}
                          className="native-color-picker"
                          title="Pick primary accent color"
                        />
                      </div>
                      <input
                        type="text"
                        value={customPrimary}
                        onChange={(e) => handleLiveColorChange('primary', e.target.value)}
                        className="hex-text-input"
                        placeholder="#00d4ff"
                      />
                    </div>
                  </div>

                  <div className="custom-color-control-box">
                    <div className="color-control-header">
                      <span className="color-step-num" style={{ background: 'rgba(180, 128, 255, 0.2)', color: '#b480ff' }}>3</span>
                      <label className="color-control-label">Secondary Highlight</label>
                    </div>
                    <p className="color-control-hint">Syntax keywords, badges & gradients</p>
                    <div className="color-picker-input-group">
                      <div className="color-swatch-wrapper" style={{ background: customSecondary }}>
                        <input
                          type="color"
                          value={customSecondary}
                          onChange={(e) => handleLiveColorChange('secondary', e.target.value)}
                          className="native-color-picker"
                          title="Pick secondary highlight color"
                        />
                      </div>
                      <input
                        type="text"
                        value={customSecondary}
                        onChange={(e) => handleLiveColorChange('secondary', e.target.value)}
                        className="hex-text-input"
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-Time Live Preview Mockup */}
                <div className="custom-live-preview-box">
                  <div className="preview-box-header">
                    <Eye size={14} className="text-cyan" />
                    <span>Real-Time Theme Preview</span>
                  </div>
                  <div
                    className="mock-ide-window"
                    style={{
                      backgroundColor: customBg,
                      borderColor: `${customPrimary}55`,
                      boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 20px ${customPrimary}25`,
                    }}
                  >
                    {/* Mock Header */}
                    <div
                      className="mock-header"
                      style={{
                        borderBottom: `1px solid ${customPrimary}33`,
                        background: 'rgba(0,0,0,0.25)',
                      }}
                    >
                      <div className="mock-logo">
                        <span className="mock-dot" style={{ background: customPrimary }} />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '11px' }}>Full Code</span>
                        <span
                          className="mock-pill"
                          style={{
                            background: `${customPrimary}22`,
                            color: customPrimary,
                            border: `1px solid ${customPrimary}44`,
                          }}
                        >
                          Java
                        </span>
                      </div>
                      <div
                        className="mock-run-btn"
                        style={{
                          background: `linear-gradient(135deg, ${customPrimary}, ${customSecondary})`,
                          color: '#fff',
                        }}
                      >
                        ▶ Run Code
                      </div>
                    </div>

                    {/* Mock Tabs */}
                    <div
                      className="mock-tabs"
                      style={{
                        borderBottom: `1px solid ${customPrimary}25`,
                        background: 'rgba(0,0,0,0.15)',
                      }}
                    >
                      <div
                        className="mock-tab active"
                        style={{
                          background: customBg,
                          borderTop: `2px solid ${customPrimary}`,
                          color: '#fff',
                        }}
                      >
                        Main.java
                      </div>
                      <div className="mock-tab" style={{ color: '#94a3b8' }}>
                        utils.java
                      </div>
                    </div>

                    {/* Mock Code */}
                    <div className="mock-code-area" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      <div>
                        <span style={{ color: customSecondary, fontWeight: 600 }}>public class</span>{' '}
                        <span style={{ color: customPrimary, fontWeight: 700 }}>Main</span> &#123;
                      </div>
                      <div style={{ paddingLeft: '16px' }}>
                        <span style={{ color: customSecondary, fontWeight: 600 }}>public static void</span>{' '}
                        <span style={{ color: '#f8fafc' }}>main(String[] args) &#123;</span>
                      </div>
                      <div style={{ paddingLeft: '32px' }}>
                        <span style={{ color: customPrimary }}>System</span>.out.println(
                        <span style={{ color: '#34d399' }}>"Hello from Custom Palette!"</span>);
                      </div>
                      <div style={{ paddingLeft: '16px' }}>&#125;</div>
                      <div>&#125;</div>
                    </div>
                  </div>
                </div>

                {/* Builder Actions Footer */}
                <div className="custom-theme-actions-footer">
                  <div className="footer-left-info">
                    <span className="current-palette-summary">
                      Active Colors: <code style={{ color: customBg }}>{customBg}</code> •{' '}
                      <code style={{ color: customPrimary }}>{customPrimary}</code> •{' '}
                      <code style={{ color: customSecondary }}>{customSecondary}</code>
                    </span>
                  </div>
                  <div className="footer-right-buttons">
                    <button
                      className="btn-cyber-secondary"
                      onClick={handleResetToDefaultTheme}
                      title="Reset theme back to Full Code Dark default"
                    >
                      <RotateCcw size={14} />
                      <span>Reset to Default</span>
                    </button>
                    {localConfig.theme !== 'custom' && (
                      <button
                        className="btn-cyber-secondary reobtain-btn"
                        onClick={handleApplyCustomPalette}
                        title="Reobtain and reactivate your saved 3-color custom theme"
                        style={{
                          borderColor: `${customPrimary}99`,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Sparkles size={14} style={{ color: customPrimary }} />
                        <span>Reobtain 3-Color Theme</span>
                      </button>
                    )}
                    <button
                      className="btn-cyber-primary apply-custom-btn"
                      onClick={handleApplyCustomPalette}
                      style={{
                        background: `linear-gradient(135deg, ${customPrimary}, ${customSecondary})`,
                        boxShadow: `0 0 16px ${customPrimary}50`,
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{localConfig.theme === 'custom' ? 'Re-Apply 3-Color Theme' : 'Apply 3-Color Theme Live'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── PRESET THEMES GRID ─── */}
              <div className="presets-section-heading">
                <h3>Curated Preset Themes</h3>
                <p>Choose from our hand-crafted, high-contrast theme catalog or select your Custom 3-Color engine:</p>
              </div>

              <div className="themes-selection-grid">
                {THEMES.map((theme) => {
                  const isSelected = localConfig.theme === theme.id;
                  const bg = theme.isCustom ? customBg : theme.bgPreview;
                  const primary = theme.isCustom ? customPrimary : theme.accentPreview;
                  const secondary = theme.isCustom ? customSecondary : theme.secondaryPreview;

                  return (
                    <div
                      key={theme.id}
                      className={`theme-card-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (theme.isCustom) {
                          handleApplyCustomPalette();
                        } else {
                          handleConfigChange('theme', theme.id);
                        }
                      }}
                    >
                      <div className="theme-card-preview" style={{ background: bg }}>
                        <div className="preview-accent-dot" style={{ background: primary }} />
                        <div className="preview-secondary-dot" style={{ background: secondary }} />
                        {theme.badge && <span className="theme-preview-badge">{theme.badge}</span>}
                      </div>
                      <div className="theme-card-info">
                        <div className="theme-card-title-row">
                          <span className="theme-card-name">{theme.icon} {theme.name}</span>
                          {isSelected && <Check size={14} className="theme-check-icon" />}
                        </div>
                        <p className="theme-card-desc">{theme.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: EDITOR CORE */}
          {activeTab === 'editor' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box">
                  <Code2 size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>Editor Typography & Core Engine</h2>
                  <p>Fine-tune Monaco editor options, font scaling, bracket matching, and layout guides.</p>
                </div>
              </div>

              <div className="settings-form-group">
                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">Font Size</span>
                    <span className="setting-desc">Editor font size in pixels (12px to 28px)</span>
                  </div>
                  <div className="form-input-col">
                    <input
                      type="number"
                      min="12"
                      max="28"
                      value={localConfig.fontSize}
                      onChange={(e) => handleConfigChange('fontSize', parseInt(e.target.value, 10))}
                      className="settings-number-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">Font Family</span>
                    <span className="setting-desc">Monospaced font used for code rendering</span>
                  </div>
                  <div className="form-input-col">
                    <select
                      value={localConfig.fontFamily}
                      onChange={(e) => handleConfigChange('fontFamily', e.target.value)}
                      className="settings-select"
                    >
                      <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                      <option value="'Fira Code', monospace">Fira Code (Ligatures)</option>
                      <option value="'Source Code Pro', monospace">Source Code Pro</option>
                      <option value="monospace">System Monospace</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">Tab Size</span>
                    <span className="setting-desc">Indentation width for tabs and spaces</span>
                  </div>
                  <div className="form-input-col">
                    <select
                      value={localConfig.tabSize}
                      onChange={(e) => handleConfigChange('tabSize', parseInt(e.target.value, 10))}
                      className="settings-select"
                    >
                      <option value="2">2 Spaces</option>
                      <option value="4">4 Spaces</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">Minimap</span>
                    <span className="setting-desc">Display code overview on the right side</span>
                  </div>
                  <div className="form-input-col">
                    <button
                      className={`btn-toggle-switch ${localConfig.minimap ? 'on' : 'off'}`}
                      onClick={() => handleConfigChange('minimap', !localConfig.minimap)}
                    >
                      <span className="switch-thumb" />
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">Word Wrap</span>
                    <span className="setting-desc">Wrap long code lines inside the viewport</span>
                  </div>
                  <div className="form-input-col">
                    <button
                      className={`btn-toggle-switch ${localConfig.wordWrap ? 'on' : 'off'}`}
                      onClick={() => handleConfigChange('wordWrap', !localConfig.wordWrap)}
                    >
                      <span className="switch-thumb" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AI & DIAGNOSTICS */}
          {activeTab === 'ai' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box bot-box">
                  <Bot size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>AI Code Intelligence & Real-time Diagnostics</h2>
                  <p>Configure automated syntax error squiggles, heuristic file concept tags, and AI dry-run models.</p>
                </div>
              </div>

              <div className="settings-form-group">
                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">AI Provider Mode</span>
                    <span className="setting-desc">Toggle between instant heuristic AI and external LLM APIs</span>
                  </div>
                  <div className="form-input-col">
                    <select
                      value={localConfig.aiProvider || 'mock'}
                      onChange={(e) => handleConfigChange('aiProvider', e.target.value)}
                      className="settings-select"
                    >
                      <option value="mock">Full Code Built-in Heuristic AI (Instant)</option>
                      <option value="gemini">Google Gemini 2.0 Flash</option>
                      <option value="openai">OpenAI GPT-4o Mini</option>
                      <option value="deepseek">DeepSeek V3</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">AI Explanation Style</span>
                    <span className="setting-desc">Controls format for code breakdown</span>
                  </div>
                  <div className="form-input-col">
                    <select
                      value={localConfig.explanationStyle || 'execution_trace'}
                      onChange={(e) => handleConfigChange('explanationStyle', e.target.value)}
                      className="settings-select"
                    >
                      <option value="execution_trace">Execution Trace & Memory Mechanics (Practical)</option>
                      <option value="summary">High-Level Architectural Overview</option>
                      <option value="beginner">Beginner Walkthrough with Gotchas</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">Real-Time Monaco Error Squiggles</span>
                    <span className="setting-desc">Draws red wavy underlines & gutter indicators while typing</span>
                  </div>
                  <div className="form-input-col">
                    <span className="status-badge-active">Always Active ⚡</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-label-col">
                    <span className="setting-title">AI File Hover Glance Tags</span>
                    <span className="setting-desc">Detects concepts (OOP, Recursion, DP) and reveals hover cards</span>
                  </div>
                  <div className="form-input-col">
                    <span className="status-badge-active">Always Active ⚡</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & STORAGE */}
          {activeTab === 'security' && (
            <div className="settings-section animate-fade-in">
              <div className="section-hero">
                <div className="hero-icon-box shield-box">
                  <Shield size={28} className="hero-icon" />
                </div>
                <div>
                  <h2>Security, Data & Browser Quota</h2>
                  <p>Manage file lock pins, multi-user workspace isolation, and local storage limits.</p>
                </div>
              </div>

              <div className="vault-security-card animate-scale-in">
                <div className="vault-card-header">
                  <div className="vault-header-title">
                    <div className="card-icon-wrap vault-icon-wrap">
                      <KeyRound size={22} />
                    </div>
                    <div>
                      <h3>Item Password Protection & Encryption Vault</h3>
                      <p className="vault-subtitle">
                        Lock individual files, folders, or subject notebooks with a secret password. Contents are encrypted using AES-GCM and remain protected even during live room broadcasts and workspace sharing.
                      </p>
                    </div>
                  </div>

                  <div className="vault-subtabs">
                    <button
                      className={`vault-tab-btn ${lockSubTab === 'files' ? 'active' : ''}`}
                      onClick={() => setLockSubTab('files')}
                    >
                      <FileCode size={14} />
                      <span>Files ({files.length})</span>
                    </button>
                    <button
                      className={`vault-tab-btn ${lockSubTab === 'folders' ? 'active' : ''}`}
                      onClick={() => setLockSubTab('folders')}
                    >
                      <Folder size={14} />
                      <span>Folders ({folders?.length || 0})</span>
                    </button>
                    <button
                      className={`vault-tab-btn ${lockSubTab === 'notebooks' ? 'active' : ''}`}
                      onClick={() => setLockSubTab('notebooks')}
                    >
                      <GraduationCap size={14} />
                      <span>Notebooks ({savedNotebooks.length})</span>
                    </button>
                  </div>
                </div>

                <div className="vault-items-list">
                  {lockSubTab === 'files' && (
                    <div className="vault-table">
                      {files.map((file) => {
                        const isLocked = Boolean(file.isLocked || securityLocks.files[file.id]?.locked);
                        return (
                          <div key={file.id} className="vault-row">
                            <div className="vault-row-left">
                              <FileCode size={16} className={isLocked ? 'vault-icon-locked' : 'vault-icon-normal'} />
                              <div className="vault-row-meta">
                                <span className="vault-item-name">{file.name}</span>
                                <span className="vault-item-sub">
                                  {file.language || 'Plain text'} • {(file.content?.length || 0)} chars
                                </span>
                              </div>
                            </div>

                            <div className="vault-row-right">
                              {isLocked ? (
                                <span className="badge-locked">
                                  <Lock size={12} />
                                  <span>AES-GCM Encrypted</span>
                                </span>
                              ) : (
                                <span className="badge-unlocked">
                                  <Unlock size={12} />
                                  <span>Unlocked</span>
                                </span>
                              )}

                              {isLocked ? (
                                <button
                                  className="btn-vault-action unlock"
                                  onClick={() => handleOpenLockModal('file', file, 'unlock')}
                                >
                                  <Unlock size={13} />
                                  <span>Unlock / Decrypt</span>
                                </button>
                              ) : (
                                <button
                                  className="btn-vault-action lock"
                                  onClick={() => handleOpenLockModal('file', file, 'lock')}
                                >
                                  <Lock size={13} />
                                  <span>Lock with Password</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {lockSubTab === 'folders' && (
                    <div className="vault-table">
                      {(folders || []).length === 0 ? (
                        <div className="vault-empty-text">No folders created in the current workspace.</div>
                      ) : (
                        (folders || []).map((folder) => {
                          const isLocked = Boolean(securityLocks.folders[folder.id]?.locked);
                          return (
                            <div key={folder.id} className="vault-row">
                              <div className="vault-row-left">
                                <Folder size={16} className={isLocked ? 'vault-icon-locked' : 'vault-icon-normal'} />
                                <div className="vault-row-meta">
                                  <span className="vault-item-name">{folder.name}</span>
                                  <span className="vault-item-sub">Folder ID: {folder.id}</span>
                                </div>
                              </div>

                              <div className="vault-row-right">
                                {isLocked ? (
                                  <span className="badge-locked">
                                    <Lock size={12} />
                                    <span>Folder Locked</span>
                                  </span>
                                ) : (
                                  <span className="badge-unlocked">
                                    <Unlock size={12} />
                                    <span>Unlocked</span>
                                  </span>
                                )}

                                {isLocked ? (
                                  <button
                                    className="btn-vault-action unlock"
                                    onClick={() => handleOpenLockModal('folder', folder, 'unlock')}
                                  >
                                    <Unlock size={13} />
                                    <span>Unlock Folder</span>
                                  </button>
                                ) : (
                                  <button
                                    className="btn-vault-action lock"
                                    onClick={() => handleOpenLockModal('folder', folder, 'lock')}
                                  >
                                    <Lock size={13} />
                                    <span>Lock with Password</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {lockSubTab === 'notebooks' && (
                    <div className="vault-table">
                      {savedNotebooks.length === 0 ? (
                        <div className="vault-empty-text">No subject notebooks created yet.</div>
                      ) : (
                        savedNotebooks.map((nb) => {
                          const isLocked = Boolean(securityLocks.notebooks[nb.id]?.locked);
                          return (
                            <div key={nb.id} className="vault-row">
                              <div className="vault-row-left">
                                <GraduationCap size={16} className={isLocked ? 'vault-icon-locked' : 'vault-icon-normal'} />
                                <div className="vault-row-meta">
                                  <span className="vault-item-name">{nb.title}</span>
                                  <span className="vault-item-sub">{nb.subjectId} • {nb.files?.length || 0} notes</span>
                                </div>
                              </div>

                              <div className="vault-row-right">
                                {isLocked ? (
                                  <span className="badge-locked">
                                    <Lock size={12} />
                                    <span>Notebook Locked</span>
                                  </span>
                                ) : (
                                  <span className="badge-unlocked">
                                    <Unlock size={12} />
                                    <span>Unlocked</span>
                                  </span>
                                )}

                                {isLocked ? (
                                  <button
                                    className="btn-vault-action unlock"
                                    onClick={() => handleOpenLockModal('notebook', nb, 'unlock')}
                                  >
                                    <Unlock size={13} />
                                    <span>Unlock Notebook</span>
                                  </button>
                                ) : (
                                  <button
                                    className="btn-vault-action lock"
                                    onClick={() => handleOpenLockModal('notebook', nb, 'lock')}
                                  >
                                    <Lock size={13} />
                                    <span>Lock with Password</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-cards-grid">
                <div className="feature-card">
                  <div className="card-top">
                    <div className="card-icon-wrap">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <h3>Browser Storage Quota</h3>
                      <p>
                        {storageInfo
                          ? `${(storageInfo.usage / (1024 * 1024)).toFixed(2)} MB used of ${(storageInfo.quota / (1024 * 1024)).toFixed(0)} MB quota`
                          : 'Checking quota...'}
                      </p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button className="btn-cyber-secondary" onClick={() => requestPersistentStorage()}>
                      Request Persistent Storage
                    </button>
                    <span className="card-stats-text">Prevents browser cache evictions</span>
                  </div>
                </div>

                <div className="feature-card danger-card">
                  <div className="card-top">
                    <div className="card-icon-wrap danger-wrap">
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <h3>Factory Reset Workspace</h3>
                      <p>Wipes all files, folders, and local storage keys, restoring default starter templates.</p>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button
                      className="btn-danger"
                      onClick={() => {
                        if (window.confirm('Reset all files and preferences? This cannot be undone!')) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                    >
                      Clear & Reset Everything
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Encryption / Decryption Modal */}
              {lockModal && (
                <div className="modal-overlay" onClick={() => setLockModal(null)}>
                  <div className="vault-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
                    <div className="vault-modal-header">
                      <div className="vault-modal-icon">
                        {lockModal.mode === 'lock' ? <Lock size={20} /> : <Unlock size={20} />}
                      </div>
                      <div>
                        <h3>
                          {lockModal.mode === 'lock' ? 'Lock & Encrypt Item' : 'Unlock & Decrypt Item'}
                        </h3>
                        <p className="vault-modal-sub">
                          {lockModal.item.name || lockModal.item.title}
                        </p>
                      </div>
                    </div>

                    <div className="vault-modal-body">
                      {lockModal.mode === 'lock' && (
                        <div className="vault-security-notice">
                          <ShieldCheck size={16} className="notice-icon" />
                          <span>
                            This item will be encrypted using AES-GCM. You will need this password to view or edit the contents.
                          </span>
                        </div>
                      )}

                      <div className="vault-input-group">
                        <label>Secret Password / PIN</label>
                        <input
                          type="password"
                          className="vault-password-input"
                          placeholder="Enter secret password..."
                          value={lockPassword}
                          onChange={(e) => setLockPassword(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {lockModal.mode === 'lock' && (
                        <div className="vault-input-group">
                          <label>Confirm Password</label>
                          <input
                            type="password"
                            className="vault-password-input"
                            placeholder="Confirm secret password..."
                            value={lockConfirmPassword}
                            onChange={(e) => setLockConfirmPassword(e.target.value)}
                          />
                        </div>
                      )}

                      {lockError && <div className="vault-error-msg">{lockError}</div>}
                    </div>

                    <div className="vault-modal-actions">
                      <button
                        className="btn-cyber-secondary"
                        onClick={() => setLockModal(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-vault-confirm"
                        onClick={handleConfirmLockAction}
                      >
                        {lockModal.mode === 'lock' ? 'Lock & Encrypt' : 'Verify & Unlock'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
