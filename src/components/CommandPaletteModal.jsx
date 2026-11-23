import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Command,
  FileCode,
  FileText,
  Play,
  Save,
  Plus,
  X,
  RotateCcw,
  Sparkles,
  Sliders,
  FolderTree,
  Terminal,
  Maximize2,
  Split,
  Eye,
  GitBranch,
  UploadCloud,
  Check,
  File,
} from 'lucide-react';
import LanguageIcon from './LanguageIcon';
import './CommandPaletteModal.css';

export default function CommandPaletteModal({
  isOpen,
  initialMode = 'commands',
  onClose,
  onRunCode,
  onSaveFile,
  onCloseTab,
  onCloseAllTabs,
  onReopenTab,
  onToggleTerminal,
  onToggleExplorer,
  onToggleSplit,
  onToggleFocus,
  onFormatCode,
  onGitPush,
  onOpenSettings,
  onOpenVisualizer,
}) {
  const { state, dispatch, handleSelectFile, handleUpdateConfig } = useApp();
  const { files = [], activeFileId, config = {} } = state;

  const [mode, setMode] = useState(initialMode); // 'commands' | 'files'
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync mode whenever initialMode or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 40);
    }
  }, [isOpen, initialMode]);

  // Handle typing '>' in files mode to auto-switch to commands mode
  const handleQueryChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('>') && mode === 'files') {
      setMode('commands');
      setQuery(val.slice(1).trimStart());
      setSelectedIndex(0);
      return;
    }
    setQuery(val);
    setSelectedIndex(0);
  };

  // Commands definition
  const allCommands = useMemo(() => [
    {
      id: 'run-code',
      title: 'Run Code',
      category: 'Execution',
      shortcut: '⌘Enter',
      icon: Play,
      iconColor: '#4ade80',
      action: () => onRunCode?.(),
    },
    {
      id: 'save-file',
      title: 'Save File to Disk',
      category: 'File',
      shortcut: '⌘S',
      icon: Save,
      iconColor: '#38bdf8',
      action: () => onSaveFile?.(),
    },
    {
      id: 'format-code',
      title: 'Format Document (Prettier / Beautifier)',
      category: 'Editor',
      shortcut: '⇧⌥F',
      icon: Sparkles,
      iconColor: '#c084fc',
      action: () => onFormatCode?.(),
    },
    {
      id: 'new-file',
      title: 'New Sequential File (e.g. Solution02.java)',
      category: 'File',
      shortcut: '⌘N',
      icon: Plus,
      iconColor: '#a78bfa',
      action: () => {
        window.dispatchEvent(new CustomEvent('fullcode-create-seq-file'));
      },
    },
    {
      id: 'close-tab',
      title: 'Close Active Editor Tab',
      category: 'Tabs',
      shortcut: '⌘W',
      icon: X,
      iconColor: '#f87171',
      action: () => onCloseTab?.(),
    },
    {
      id: 'reopen-tab',
      title: 'Reopen Last Closed Tab',
      category: 'Tabs',
      shortcut: '⌘⇧T',
      icon: RotateCcw,
      iconColor: '#fbbf24',
      action: () => onReopenTab?.(),
    },
    {
      id: 'close-all-tabs',
      title: 'Close All Editor Tabs',
      category: 'Tabs',
      shortcut: '',
      icon: X,
      iconColor: '#ef4444',
      action: () => onCloseAllTabs?.(),
    },
    {
      id: 'open-visualizer',
      title: 'Open Step-by-Step Algorithm & Memory Visualizer',
      category: 'Visualization',
      shortcut: '⌘⇧V',
      icon: Eye,
      iconColor: '#38bdf8',
      action: () => {
        onOpenVisualizer ? onOpenVisualizer() : window.dispatchEvent(new CustomEvent('open-dsa-visualizer'));
      },
    },
    {
      id: 'toggle-copilot',
      title: `Toggle Inline AI Autocomplete (Currently: ${config.inlineAiAutocomplete !== false ? 'ON' : 'OFF'})`,
      category: 'AI Assistant',
      shortcut: '',
      icon: Sparkles,
      iconColor: '#f43f5e',
      action: () => {
        const nextVal = config.inlineAiAutocomplete === false;
        handleUpdateConfig?.({ inlineAiAutocomplete: nextVal });
        window.dispatchEvent(new CustomEvent('fullcode-toast', {
          detail: { message: nextVal ? '✨ Inline AI Autocomplete Enabled' : 'Inline AI Autocomplete Disabled' }
        }));
      },
    },
    {
      id: 'toggle-terminal',
      title: 'Toggle Terminal & Output Panel',
      category: 'View',
      shortcut: 'Ctrl+`',
      icon: Terminal,
      iconColor: '#38bdf8',
      action: () => onToggleTerminal?.(),
    },
    {
      id: 'toggle-explorer',
      title: 'Toggle File Explorer Sidebar',
      category: 'View',
      shortcut: '⌘⇧E',
      icon: FolderTree,
      iconColor: '#94a3b8',
      action: () => onToggleExplorer?.(),
    },
    {
      id: 'toggle-split',
      title: 'Toggle Side-by-Side Split View',
      category: 'View',
      shortcut: '⌥\\',
      icon: Split,
      iconColor: '#a855f7',
      action: () => onToggleSplit?.(),
    },
    {
      id: 'toggle-focus',
      title: 'Toggle Full Screen Focus Mode',
      category: 'View',
      shortcut: 'F11',
      icon: Maximize2,
      iconColor: '#f59e0b',
      action: () => onToggleFocus?.(),
    },
    {
      id: 'explain-code',
      title: 'Lucia AI: Explain Current Code',
      category: 'AI Assistant',
      shortcut: '',
      icon: Sparkles,
      iconColor: '#c084fc',
      action: () => {
        dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
        dispatch({ type: 'SET_TERMINAL_TAB', payload: 'explanation' });
      },
    },
    {
      id: 'open-settings',
      title: 'Open Settings Preferences',
      category: 'Preferences',
      shortcut: '⌘,',
      icon: Sliders,
      iconColor: '#94a3b8',
      action: () => onOpenSettings ? onOpenSettings() : dispatch({ type: 'TOGGLE_SETTINGS' }),
    },
    {
      id: 'git-push',
      title: 'Git: Sync & Push Commits to origin',
      category: 'Git',
      shortcut: '',
      icon: UploadCloud,
      iconColor: '#34d399',
      action: () => onGitPush?.(),
    },
    {
      id: 'switch-branch',
      title: 'Git: Switch or Create Branch',
      category: 'Git',
      shortcut: '',
      icon: GitBranch,
      iconColor: '#60a5fa',
      action: () => dispatch({ type: 'SET_BRANCH_MODAL_OPEN', payload: true }),
    },
  ], [
    onRunCode,
    onSaveFile,
    onFormatCode,
    onCloseTab,
    onReopenTab,
    onCloseAllTabs,
    onOpenVisualizer,
    config.inlineAiAutocomplete,
    handleUpdateConfig,
    onToggleTerminal,
    onToggleExplorer,
    onToggleSplit,
    onToggleFocus,
    dispatch,
    onOpenSettings,
    onGitPush,
  ]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (mode !== 'files') return [];
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => {
      const name = f.name?.toLowerCase() || '';
      return name.includes(q);
    });
  }, [mode, query, files]);

  // Filtered commands
  const filteredCommands = useMemo(() => {
    if (mode !== 'commands') return [];
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.shortcut.toLowerCase().includes(q)
      );
    });
  }, [mode, query, allCommands]);

  const currentList = mode === 'commands' ? filteredCommands : filteredFiles;

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.palette-item');
    const selectedItem = items[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (currentList.length === 0 ? 0 : (prev + 1) % currentList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (currentList.length === 0 ? 0 : (prev - 1 + currentList.length) % currentList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = currentList[selectedIndex];
      if (activeItem) {
        executeItem(activeItem);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const executeItem = (item) => {
    if (mode === 'commands') {
      onClose();
      setTimeout(() => item.action?.(), 50);
    } else {
      // Open file
      handleSelectFile(item.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette-dialog animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Input */}
        <div className="palette-input-wrapper">
          <span className="palette-search-icon">
            {mode === 'commands' ? <Command size={16} /> : <Search size={16} />}
          </span>
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            value={query}
            onChange={handleQueryChange}
            placeholder={
              mode === 'commands'
                ? 'Type a command or search actions...'
                : 'Search files by name (type > for commands)...'
            }
          />
          <div className="palette-mode-toggle">
            <button
              type="button"
              className={`mode-pill ${mode === 'files' ? 'active' : ''}`}
              onClick={() => {
                setMode('files');
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
            >
              Files (⌘P)
            </button>
            <button
              type="button"
              className={`mode-pill ${mode === 'commands' ? 'active' : ''}`}
              onClick={() => {
                setMode('commands');
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
            >
              Commands (⌘⇧P)
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="palette-list" ref={listRef}>
          {currentList.length === 0 ? (
            <div className="palette-empty">
              <span>No matching {mode === 'commands' ? 'commands' : 'files'} found.</span>
            </div>
          ) : (
            currentList.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              if (mode === 'commands') {
                const IconComponent = item.icon || Command;
                return (
                  <div
                    key={item.id}
                    className={`palette-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="item-main">
                      <span className="item-icon-wrapper" style={{ color: item.iconColor }}>
                        <IconComponent size={15} />
                      </span>
                      <div className="item-text">
                        <span className="item-title">{item.title}</span>
                        <span className="item-category">{item.category}</span>
                      </div>
                    </div>
                    {item.shortcut && (
                      <kbd className="item-shortcut">{item.shortcut}</kbd>
                    )}
                  </div>
                );
              }

              // File item
              const isActive = item.id === activeFileId;
              const nameParts = (item.name || '').split('/');
              const fileName = nameParts.pop();
              const folderPath = nameParts.join('/');

              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'selected' : ''} ${isActive ? 'is-active-file' : ''}`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="item-main">
                    <span className="item-file-icon">
                      <LanguageIcon language={item.language} filename={fileName} size={15} />
                    </span>
                    <div className="item-text">
                      <span className="item-title">{fileName}</span>
                      {folderPath && <span className="item-category">{folderPath}</span>}
                    </div>
                  </div>
                  {isActive && (
                    <span className="active-file-badge">Active</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="palette-footer">
          <div className="footer-hint">
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </div>
          <div className="footer-hint">
            <kbd>↵</kbd> Select
          </div>
          <div className="footer-hint">
            <kbd>esc</kbd> Dismiss
          </div>
          <div className="footer-hint tip-hint">
            Tip: Type <code>&gt;</code> to switch to Commands
          </div>
        </div>
      </div>
    </div>
  );
}
