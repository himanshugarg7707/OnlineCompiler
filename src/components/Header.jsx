import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Settings,
  FolderTree,
  BookOpen,
  FolderKanban,
  AlignLeft,
  UserPlus,
  Radio,
  Palette,
  LayoutTemplate,
  GraduationCap,
  FileCheck2,
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Globe,
  Plus,
  Download,
  Terminal as TerminalIcon,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import LanguageIcon from './LanguageIcon';
import { isLocalEnvironment } from '../services/judge0Service';
import './Header.css';

export default function Header() {
  const {
    state,
    collabRoomId,
    dispatch,
    handleRunCode,
    handleFormatCode,
    handleSaveActiveFile,
    handleDownloadWorkspace,
    handleUpdateConfig,
    showToast,
  } = useApp();
  const { executionStatus, explorerOpen, activeUser, files, activeFileId, config } = state;
  const isGoogleTheme = config?.theme === 'antigravity-google';

  const handleToggleGoogleTheme = () => {
    if (handleUpdateConfig) {
      handleUpdateConfig({ theme: 'antigravity-google' });
    } else {
      dispatch({ type: 'UPDATE_CONFIG', payload: { theme: 'antigravity-google' } });
    }
    showToast('🪐 Activated Antigravity Google Official Theme!');
  };

  const [activeMenu, setActiveMenu] = useState(null);
  const menuBarRef = useRef(null);

  const isNativeApp = typeof window !== 'undefined' && Boolean(window.webkit?.messageHandlers?.nativeHost);
  const isLocalHost = isLocalEnvironment();

  const [engineMode, setEngineMode] = useState(() => {
    return isLocalHost && localStorage.getItem('fullcode_engine_mode') === 'local' ? 'local' : 'cloud';
  });

  useEffect(() => {
    const handleEngineChange = (e) => {
      if (e.detail?.mode) setEngineMode(e.detail.mode);
    };
    window.addEventListener('engine-mode-changed', handleEngineChange);
    return () => window.removeEventListener('engine-mode-changed', handleEngineChange);
  }, []);

  const toggleEngineMode = () => {
    const next = engineMode === 'local' ? 'cloud' : 'local';
    setEngineMode(next);
    localStorage.setItem('fullcode_engine_mode', next);
    window.dispatchEvent(new CustomEvent('engine-mode-changed', { detail: { mode: next } }));
    showToast(
      next === 'local'
        ? '⚡️ Engine: Local Native Mac Compilers (Ultra-Fast 0.02s)'
        : '🌐 Engine: Cloud Sandbox (WebAssembly & Remote)'
    );
  };

  const handleOpenWebsite = () => {
    if (window.webkit?.messageHandlers?.nativeHost) {
      window.webkit.messageHandlers.nativeHost.postMessage({ type: 'open_website' });
    } else {
      window.open(window.location.origin, '_blank');
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener to close active menu on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeMenu) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMenu]);

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';
  const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const workspaceTitle = state.currentWorkspaceName || 'antigravity-core';

  const handleMenuClick = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleMenuHover = (menuName) => {
    if (activeMenu) {
      setActiveMenu(menuName);
    }
  };

  const closeMenuAndRun = (action) => {
    setActiveMenu(null);
    if (typeof action === 'function') action();
  };

  // Minimized Sleek Header Mode (28px height, maximum screen space for code)
  if (state.navbarMinimized) {
    return (
      <header className="header app-header header-minimized">
        <div className="header-min-left">
          <button
            className={`btn-icon-min ${explorerOpen ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
            title="Toggle File Explorer (Ctrl+B)"
          >
            <span className="material-symbols-outlined text-xs">folder</span>
          </button>
          <div
            className="brand-min"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
            title="Antigravity IDE"
          >
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
            <span className="brand-title-min">Antigravity IDE</span>
          </div>
          {activeFile && (
            <div className="min-active-file-badge" title={activeFile.name}>
              <LanguageIcon language={activeFile.language} filename={activeFile.name} size={12} />
              <span className="min-active-file-name">{activeFile.name}</span>
            </div>
          )}
        </div>

        <div className="header-min-center">
          <button
            className="btn-full-code-mode-min"
            onClick={() => dispatch({ type: 'TOGGLE_FOCUS_MODE' })}
            title="Full Page Code Mode (Alt+Z / F11)"
          >
            <Maximize2 size={12} />
            <span>Full Page Code</span>
          </button>
        </div>

        <div className="header-min-right">
          <button
            className={`btn-run-min ${isRunning ? 'running' : ''} ${hasSelection ? 'has-selection' : ''}`}
            onClick={handleRunCode}
            disabled={isRunning}
            title={hasSelection ? 'Run selection (Ctrl+Enter)' : 'Run code (Ctrl+Enter)'}
          >
            {isRunning ? (
              <div className="spinner-min" />
            ) : (
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_arrow
              </span>
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          <button
            className="btn-icon-min"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' })}
            title="Settings & Hub"
          >
            <span className="material-symbols-outlined text-sm">settings</span>
          </button>

          <button
            className="btn-toggle-navbar-expand"
            onClick={() => dispatch({ type: 'TOGGLE_NAVBAR_MINIMIZED' })}
            title="Expand Full Navigation Bar (Alt+M)"
          >
            <ChevronDown size={13} />
            <span>Expand Navbar</span>
          </button>
        </div>
      </header>
    );
  }

  // Standard TopAppBar
  return (
    <header className="header app-header antigravity-top-bar" ref={menuBarRef}>
      {/* Left: Brand & Menu Navigation */}
      <div className="header-left">
        <button
          className={`btn-sidebar-toggle ${explorerOpen ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
          title="Toggle File Explorer (Ctrl+B)"
        >
          <span className="material-symbols-outlined text-sm">folder</span>
        </button>

        <div
          className="brand"
          onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
          title="Antigravity IDE — Return to Workspace"
        >
          <span className="material-symbols-outlined brand-bolt-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
            bolt
          </span>
          <span className="brand-title">Antigravity IDE</span>
        </div>

        {/* Menubar */}
        <nav className="header-menubar" role="menubar">
          {/* File Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'File' ? 'active' : ''}`}
              onClick={() => handleMenuClick('File')}
              onMouseEnter={() => handleMenuHover('File')}
            >
              File
            </button>
            {activeMenu === 'File' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => window.dispatchEvent(new CustomEvent('editor-new-file')))}
                >
                  <span>New File</span>
                  <kbd>Ctrl+N</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => window.dispatchEvent(new CustomEvent('editor-new-folder')))}
                >
                  <span>New Folder</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => handleSaveActiveFile())}
                >
                  <span>Save</span>
                  <kbd>Ctrl+S</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'SET_SAVE_AS_MODAL', payload: { isOpen: true, targetFile: activeFile } }))}
                >
                  <span>Save As...</span>
                  <kbd>Ctrl+Shift+S</kbd>
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'TOGGLE_WORKSPACES_MODAL' }))}
                >
                  <span>Workspaces Manager</span>
                  <kbd>Ctrl+Shift+W</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => handleDownloadWorkspace())}
                >
                  <span>Download Workspace ZIP</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-entry danger-entry"
                  onClick={() => closeMenuAndRun(() => {
                    if (window.confirm('Reset workspace cache and reload defaults?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  })}
                >
                  <span>Reset Cache & Restart</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'Edit' ? 'active' : ''}`}
              onClick={() => handleMenuClick('Edit')}
              onMouseEnter={() => handleMenuHover('Edit')}
            >
              Edit
            </button>
            {activeMenu === 'Edit' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => handleFormatCode())}
                >
                  <span>Format Document</span>
                  <kbd>Shift+Alt+F</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    const active = files.find((f) => f.id === activeFileId);
                    if (active) {
                      dispatch({
                        type: 'ADD_FILE',
                        payload: {
                          name: `copy_${active.name}`,
                          content: active.content,
                          openTab: true,
                        },
                      });
                      showToast(`Created copy of ${active.name}`);
                    }
                  })}
                >
                  <span>Duplicate File</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'CLEAR_OUTPUT' });
                    showToast('Cleared output and terminal logs');
                  })}
                >
                  <span>Clear Output & Terminal</span>
                  <kbd>Ctrl+L</kbd>
                </button>
              </div>
            )}
          </div>

          {/* Selection Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'Selection' ? 'active' : ''}`}
              onClick={() => handleMenuClick('Selection')}
              onMouseEnter={() => handleMenuHover('Selection')}
            >
              Selection
            </button>
            {activeMenu === 'Selection' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => handleRunCode())}
                >
                  <span>Run Selected Code Only</span>
                  <kbd>Ctrl+Enter</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    window.dispatchEvent(new CustomEvent('editor-select-all'));
                  })}
                >
                  <span>Select All</span>
                  <kbd>Ctrl+A</kbd>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'View' ? 'active' : ''}`}
              onClick={() => handleMenuClick('View')}
              onMouseEnter={() => handleMenuHover('View')}
            >
              View
            </button>
            {activeMenu === 'View' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'TOGGLE_EXPLORER' }))}
                >
                  <span>Toggle File Explorer</span>
                  <kbd>Ctrl+B</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: !state.terminalHidden });
                  })}
                >
                  <span>Toggle Terminal / Output</span>
                  <kbd>Ctrl+`</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'TOGGLE_FOCUS_MODE' }))}
                >
                  <span>Full Page Code / Zen Mode</span>
                  <kbd>F11</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'TOGGLE_NAVBAR_MINIMIZED' }))}
                >
                  <span>Minimize Navigation Bar</span>
                  <kbd>Alt+M</kbd>
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    window.location.hash = '#/settings?tab=themes';
                    dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
                  })}
                >
                  <span>Color Theme & Palette...</span>
                </button>
              </div>
            )}
          </div>

          {/* Go Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'Go' ? 'active' : ''}`}
              onClick={() => handleMenuClick('Go')}
              onMouseEnter={() => handleMenuHover('Go')}
            >
              Go
            </button>
            {activeMenu === 'Go' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    if (!explorerOpen) dispatch({ type: 'TOGGLE_EXPLORER' });
                    setTimeout(() => {
                      const searchInput = document.querySelector('.explorer-search-input');
                      searchInput?.focus();
                    }, 50);
                  })}
                >
                  <span>Go to File...</span>
                  <kbd>Ctrl+P</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'notebook-setup' }))}
                >
                  <span>Go to Subject Course Notebooks</span>
                </button>
              </div>
            )}
          </div>

          {/* Run Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'Run' ? 'active' : ''}`}
              onClick={() => handleMenuClick('Run')}
              onMouseEnter={() => handleMenuHover('Run')}
            >
              Run
            </button>
            {activeMenu === 'Run' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => handleRunCode())}
                >
                  <span>Run Document</span>
                  <kbd>Ctrl+Enter</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => toggleEngineMode())}
                >
                  <span>Switch Execution Engine</span>
                  <kbd>{engineMode === 'local' ? '⚡️ Local' : '🌐 Cloud'}</kbd>
                </button>
              </div>
            )}
          </div>

          {/* Terminal Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'Terminal' ? 'active' : ''}`}
              onClick={() => handleMenuClick('Terminal')}
              onMouseEnter={() => handleMenuHover('Terminal')}
            >
              Terminal
            </button>
            {activeMenu === 'Terminal' && (
              <div className="menu-dropdown animate-fade-in">
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
                    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'terminal' });
                  })}
                >
                  <span>New Terminal / Shell</span>
                  <kbd>Ctrl+`</kbd>
                </button>
                <button
                  className="dropdown-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
                    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'output' });
                  })}
                >
                  <span>View Program Output</span>
                </button>
                {isNativeApp && (
                  <button
                    className="dropdown-entry"
                    onClick={() => closeMenuAndRun(() => {
                      if (window.webkit?.messageHandlers?.nativeHost) {
                        window.webkit.messageHandlers.nativeHost.postMessage({ type: 'open_terminal' });
                      }
                    })}
                  >
                    <span>Launch External macOS Terminal</span>
                    <kbd>⌥⌘T</kbd>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* More Menu */}
          <div className="menu-item-wrap">
            <button
              className={`menu-bar-btn ${activeMenu === 'More' ? 'active' : ''}`}
              onClick={() => handleMenuClick('More')}
              onMouseEnter={() => handleMenuHover('More')}
            >
              More
            </button>
            {activeMenu === 'More' && (
              <div className="menu-dropdown more-menu-dropdown animate-fade-in">
                {/* Official Theme Quick Banner */}
                <div className="more-theme-banner" onClick={() => closeMenuAndRun(handleToggleGoogleTheme)}>
                  <div className="more-theme-banner-left">
                    <div className="more-theme-icon-wrap">
                      <span className="material-symbols-outlined more-theme-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                        public
                      </span>
                    </div>
                    <div>
                      <div className="more-theme-banner-title">
                        <span>Antigravity (Google Official)</span>
                        {isGoogleTheme && <span className="more-active-tag">Active</span>}
                      </div>
                      <div className="more-theme-banner-sub">Google DeepMind dark obsidian & Material 3 palette</div>
                    </div>
                  </div>
                  <button className={`btn-more-theme-toggle ${isGoogleTheme ? 'active' : ''}`}>
                    {isGoogleTheme ? 'Selected' : 'Activate'}
                  </button>
                </div>

                <div className="dropdown-divider" />

                {/* Section: Intelligent AI & Analysis */}
                <div className="more-section-label">INTELLIGENT TOOLS & AI</div>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
                    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'explanation' });
                  })}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-cyan">auto_awesome</span>
                    <div>
                      <div className="more-entry-title">Antigravity AI Copilot</div>
                      <div className="more-entry-desc">Code explanation, bug detection & logic suggestions</div>
                    </div>
                  </div>
                  <kbd>Ctrl+Shift+E</kbd>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
                    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'complexity' });
                  })}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-green">speed</span>
                    <div>
                      <div className="more-entry-title">Complexity Analyzer</div>
                      <div className="more-entry-desc">Static Big-O asymptotic runtime & memory scaling</div>
                    </div>
                  </div>
                </button>

                <div className="dropdown-divider" />

                {/* Section: Academic & DSA Hub */}
                <div className="more-section-label">ACADEMIC & LEARNING SUITE</div>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'notebook-setup' }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-blue">menu_book</span>
                    <div>
                      <div className="more-entry-title">Subject Course Notebooks</div>
                      <div className="more-entry-desc">Interactive OpenJDK Java, Python & C++ syllabus workspaces</div>
                    </div>
                  </div>
                  <span className="more-entry-badge">Course</span>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'practice' }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-yellow">code_blocks</span>
                    <div>
                      <div className="more-entry-title">DSA Practice Lab</div>
                      <div className="more-entry-desc">70+ curated coding challenges with automated test runners</div>
                    </div>
                  </div>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'exam' }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-purple">timer</span>
                    <div>
                      <div className="more-entry-title">Proctored Exam & Tests</div>
                      <div className="more-entry-desc">Live timed examination suite with automated grading</div>
                    </div>
                  </div>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'templates' }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-pink">data_object</span>
                    <div>
                      <div className="more-entry-title">Code Templates & Snippets</div>
                      <div className="more-entry-desc">Pre-built algorithms, data structures & boilerplate</div>
                    </div>
                  </div>
                </button>

                <div className="dropdown-divider" />

                {/* Section: Panels & Preview */}
                <div className="more-section-label">DEVTOOLS & PANELS</div>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
                    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'web' });
                  })}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-cyan">language</span>
                    <div>
                      <div className="more-entry-title">Web Preview & DevTools</div>
                      <div className="more-entry-desc">Live browser engine DOM & console inspect</div>
                    </div>
                  </div>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => {
                    dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
                    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'database' });
                  })}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-purple">database</span>
                    <div>
                      <div className="more-entry-title">Database & SQL Explorer</div>
                      <div className="more-entry-desc">In-browser SQLite relational database with visual tables</div>
                    </div>
                  </div>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'TOGGLE_COLLAB_MODAL' }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-green">groups</span>
                    <div>
                      <div className="more-entry-title">Live Room Collaboration</div>
                      <div className="more-entry-desc">Peer-to-peer real-time multi-user coding session</div>
                    </div>
                  </div>
                </button>

                <div className="dropdown-divider" />

                {/* Section: Preferences & Help */}
                <div className="more-section-label">PREFERENCES & SYSTEM</div>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => {
                    window.location.hash = '#/settings?tab=themes';
                    dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
                  })}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-blue">palette</span>
                    <div>
                      <div className="more-entry-title">Theme Selector & Customizer...</div>
                      <div className="more-entry-desc">Choose from built-in themes or custom 3-color palette</div>
                    </div>
                  </div>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon">settings</span>
                    <div>
                      <div className="more-entry-title">Settings & Configuration</div>
                      <div className="more-entry-desc">Editor font, line wrap, keybindings & compiler host</div>
                    </div>
                  </div>
                  <kbd>Ctrl+,</kbd>
                </button>
                <button
                  className="dropdown-entry more-entry"
                  onClick={() => closeMenuAndRun(() => dispatch({ type: 'SET_WELCOME_MODAL', payload: true }))}
                >
                  <div className="more-entry-left">
                    <span className="material-symbols-outlined entry-icon text-cyan" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                    <div>
                      <div className="more-entry-title">About Google Antigravity IDE</div>
                      <div className="more-entry-desc">Version 2.4.0 Core • Antigravity Engine Architecture</div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right Controls: Workspace Pill, Language Selector, Run, Settings, Profile */}
      <div className="header-right">
        {/* Workspace Badge Pill */}
        <div
          className="workspace-badge-pill"
          onClick={() => dispatch({ type: 'TOGGLE_WORKSPACES_MODAL' })}
          title="Click to view and switch Saved Workspaces"
        >
          <span className="workspace-badge-prefix">workspace /</span>
          <span className="workspace-badge-name">{workspaceTitle}</span>
        </div>

        {/* Language Selector */}
        <LanguageSelector />

        {/* Live Collab Indicator if active */}
        {collabRoomId && (
          <button
            className="btn-collab-active-pill"
            onClick={() => dispatch({ type: 'TOGGLE_COLLAB_MODAL' })}
            title={`Connected to Live Collaboration Room: ${collabRoomId}`}
          >
            <Radio size={12} className="live-spin-icon" />
            <span>{collabRoomId}</span>
          </button>
        )}

        {/* Engine Switcher Button (in macOS native app) */}
        {isNativeApp && (
          <button
            className={`btn-engine-pill ${engineMode === 'local' ? 'local' : 'cloud'}`}
            onClick={toggleEngineMode}
            title={engineMode === 'local' ? '⚡️ Local Mac Compilers Active' : '🌐 Cloud Sandbox Active'}
          >
            <span>{engineMode === 'local' ? '⚡️ Local' : '🌐 Cloud'}</span>
          </button>
        )}

        {/* Open Website Button (in macOS native app) */}
        {isNativeApp && (
          <button
            className="btn-header-tool"
            onClick={handleOpenWebsite}
            title="Open in Safari / Chrome Browser (⌘B)"
          >
            <Globe size={14} />
          </button>
        )}

        {/* Prominent Run Button */}
        <button
          className={`btn-antigravity-run ${isRunning ? 'running' : ''} ${hasSelection ? 'has-selection' : ''}`}
          onClick={handleRunCode}
          disabled={isRunning}
          title={hasSelection ? 'Run Selected Code (Ctrl+Enter)' : 'Run Code (Ctrl+Enter)'}
        >
          {isRunning ? (
            <div className="spinner-run" />
          ) : (
            <span
              className="material-symbols-outlined"
              data-icon="play_arrow"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}
            >
              play_arrow
            </span>
          )}
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>

        {/* Settings Button */}
        <button
          className="btn-icon-top"
          onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' })}
          title="Settings, Themes & Customization"
          data-icon="settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            settings
          </span>
        </button>

        {/* User Account / Profile Button */}
        {activeUser ? (
          <div
            className="header-user-avatar"
            onClick={() => dispatch({ type: 'SET_WELCOME_MODAL', payload: true })}
            style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
            title={`Account: ${activeUser.username} (${activeUser.avatarInitials})`}
          >
            <span>{activeUser.avatarInitials}</span>
          </div>
        ) : (
          <button
            className="btn-icon-top"
            onClick={() => dispatch({ type: 'SET_WELCOME_MODAL', payload: true })}
            title="Account / Sign Up & Features"
            data-icon="account_circle"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              account_circle
            </span>
          </button>
        )}

        {/* Minimize Navbar Button */}
        <button
          className="btn-icon-top btn-minimize-nav"
          onClick={() => dispatch({ type: 'TOGGLE_NAVBAR_MINIMIZED' })}
          title="Minimize Navigation Bar (Alt+M)"
        >
          <ChevronUp size={15} />
        </button>
      </div>
    </header>
  );
}
