import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Settings,
  Code2,
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
  Minimize2,
  Globe,
} from 'lucide-react';
import LanguageIcon from './LanguageIcon';
import LanguageSelector from './LanguageSelector';
import { isLocalEnvironment } from '../services/judge0Service';
import './Header.css';

export default function Header() {
  const {
    state,
    collabRoomId,
    dispatch,
    handleRunCode,
    handleFormatCode,
    showToast,
  } = useApp();
  const { executionStatus, explorerOpen, activeUser, files, activeFileId } = state;

  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  const [showWorkspacesMenu, setShowWorkspacesMenu] = useState(false);
  const practiceDropdownRef = useRef(null);
  const workspacesDropdownRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (practiceDropdownRef.current && !practiceDropdownRef.current.contains(e.target)) {
        setShowPracticeMenu(false);
      }
      if (workspacesDropdownRef.current && !workspacesDropdownRef.current.contains(e.target)) {
        setShowWorkspacesMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';
  const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

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
            <FolderTree size={13} />
          </button>
          <div
            className="brand-min"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
            title="Full Code IDE"
          >
            <div className="brand-icon-min">
              <Code2 size={12} />
            </div>
            <span className="brand-title-min">Full Code</span>
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
            title="Full Page Code Mode (Alt+Z / F11) — Hide all bars"
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
              <Play size={11} fill="currentColor" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          <button
            className="btn-icon-min"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' })}
            title="Settings & Hub"
          >
            <Settings size={13} />
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

  // Standard Header
  return (
    <header className="header app-header">
      {/* Left: Brand & File tree toggle */}
      <div className="header-left">
        <button
          className={`btn-icon ${explorerOpen ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
          title="Toggle File Explorer (Ctrl+B)"
        >
          <FolderTree size={18} />
        </button>

        <div
          className="brand"
          onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
          title="Full Code IDE — Return to Editor"
        >
          <div className="brand-icon">
            <Code2 size={17} />
          </div>
          <span className="brand-title">Full Code</span>
        </div>

        {/* Language Selector */}
        <LanguageSelector />
      </div>

      {/* Center: Actions Toolbar */}
      <div className="header-center">
        {/* Format Code */}
        <button
          className="btn-hint btn-ghost"
          onClick={handleFormatCode}
          title="Format Code (Shift+Alt+F)"
        >
          <AlignLeft size={15} />
          <span>Format</span>
        </button>

        {/* Live Collaboration Modal Button */}
        <button
          className={`btn-hint btn-ghost btn-live-header ${collabRoomId ? 'collab-live-btn' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_COLLAB_MODAL' })}
          title={collabRoomId ? `Connected to Room: ${collabRoomId} (Click to manage)` : 'Live Room Collaboration'}
        >
          <Radio size={15} className={collabRoomId ? 'live-spin-icon' : ''} />
          <span>{collabRoomId ? collabRoomId : 'Live'}</span>
        </button>

        {/* Unified Workspaces & Notebooks Dropdown */}
        <div className="header-dropdown-wrap" ref={workspacesDropdownRef}>
          <button
            className={`btn-hint btn-ghost header-dropdown-btn ${showWorkspacesMenu ? 'active' : ''}`}
            onClick={() => {
              setShowWorkspacesMenu((prev) => !prev);
              setShowPracticeMenu(false);
            }}
            title="Saved Workspaces & Subject Course Notebooks"
          >
            <FolderKanban size={15} />
            <span>Workspaces</span>
            <ChevronDown size={12} className={`dropdown-chevron ${showWorkspacesMenu ? 'open' : ''}`} />
          </button>

          {showWorkspacesMenu && (
            <div className="header-dropdown-menu animate-scale-in">
              <button
                className="header-menu-item"
                onClick={() => {
                  setShowWorkspacesMenu(false);
                  dispatch({ type: 'TOGGLE_WORKSPACES_MODAL' });
                }}
              >
                <div className="menu-item-icon-box workspaces-icon-box">
                  <FolderKanban size={16} />
                </div>
                <div className="menu-item-text">
                  <div className="menu-item-title">Saved Workspaces</div>
                  <div className="menu-item-desc">Manage multi-file workspaces, save & export ZIP</div>
                </div>
              </button>

              <button
                className="header-menu-item"
                onClick={() => {
                  setShowWorkspacesMenu(false);
                  dispatch({ type: 'NAVIGATE_PAGE', payload: 'notebook-setup' });
                }}
              >
                <div className="menu-item-icon-box notebooks-icon-box">
                  <GraduationCap size={16} />
                </div>
                <div className="menu-item-text">
                  <div className="menu-item-title">Subject Notebooks</div>
                  <div className="menu-item-desc">Structured course notes, lecture labs & syllabus setup</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Unified Practice, Tests & Templates Hub Dropdown */}
        <div className="header-dropdown-wrap" ref={practiceDropdownRef}>
          <button
            className={`btn-hint btn-ghost practice-tests-btn ${showPracticeMenu ? 'active' : ''}`}
            onClick={() => {
              setShowPracticeMenu((prev) => !prev);
              setShowWorkspacesMenu(false);
            }}
            title="Practice Questions, Proctored Tests & Code Templates"
          >
            <BookOpenCheck size={15} />
            <span>Practice & Tests</span>
            <ChevronDown size={12} className={`dropdown-chevron ${showPracticeMenu ? 'open' : ''}`} />
          </button>

          {showPracticeMenu && (
            <div className="header-dropdown-menu animate-scale-in">
              <button
                className="header-menu-item"
                onClick={() => {
                  setShowPracticeMenu(false);
                  dispatch({ type: 'NAVIGATE_PAGE', payload: 'practice' });
                }}
              >
                <div className="menu-item-icon-box practice-icon-box">
                  <BookOpen size={16} />
                </div>
                <div className="menu-item-text">
                  <div className="menu-item-title">DSA Practice Lab</div>
                  <div className="menu-item-desc">70+ curated coding questions, test cases & hints</div>
                </div>
              </button>

              <button
                className="header-menu-item"
                onClick={() => {
                  setShowPracticeMenu(false);
                  dispatch({ type: 'NAVIGATE_PAGE', payload: 'exam' });
                }}
              >
                <div className="menu-item-icon-box exam-icon-box">
                  <FileCheck2 size={16} />
                </div>
                <div className="menu-item-text">
                  <div className="menu-item-title">Exam & Test Mode</div>
                  <div className="menu-item-desc">Proctored test with PDF upload & AI test cases</div>
                </div>
              </button>

              <button
                className="header-menu-item"
                onClick={() => {
                  setShowPracticeMenu(false);
                  dispatch({ type: 'NAVIGATE_PAGE', payload: 'templates' });
                }}
              >
                <div className="menu-item-icon-box templates-icon-box">
                  <LayoutTemplate size={16} />
                </div>
                <div className="menu-item-text">
                  <div className="menu-item-title">Code Templates & Algorithms</div>
                  <div className="menu-item-desc">DSA algorithms, data structures & starter code</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Run Code, Theme, Settings, User Account */}
      <div className="header-right">
        {/* Run Code */}
        <button
          className={`btn-run ${isRunning ? 'running' : ''} ${hasSelection ? 'has-selection' : ''}`}
          onClick={handleRunCode}
          disabled={isRunning}
          title={hasSelection ? 'Run selected query only (Ctrl+Enter)' : 'Run code (Ctrl+Enter)'}
        >
          {isRunning ? (
            <>
              <div className="spinner" />
              <span>{executionStatus === 'compiling' ? 'Compiling...' : 'Running...'}</span>
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              <span>{hasSelection ? 'Run Selection' : 'Run'}</span>
            </>
          )}
        </button>


        {/* Engine Switcher Button - visible in macOS native app */}
        {isNativeApp && (
          <button
            className={`btn-engine-header ${engineMode === 'local' ? 'engine-local' : 'engine-cloud'}`}
            onClick={toggleEngineMode}
            title={
              engineMode === 'local'
                ? '⚡️ Local Mac Compilers Active (~0.02s). Click to switch to Cloud Sandbox.'
                : '🌐 Cloud Sandbox Active. Click to switch to Local Mac Compilers.'
            }
          >
            <span>{engineMode === 'local' ? '⚡️ Local' : '🌐 Cloud'}</span>
          </button>
        )}

        {/* Website Mode - visible in macOS native app */}
        {isNativeApp && (
          <button
            className="btn-header-tool btn-website-toggle"
            onClick={handleOpenWebsite}
            title="Open Website Version in Safari / Chrome (⌘B) — Standalone web experience"
          >
            <Globe size={14} />
            <span className="btn-tool-label">Website</span>
          </button>
        )}

        {/* Full Page Code / Zen Mode Button */}
        <button
          className="btn-header-tool btn-focus-toggle"
          onClick={() => dispatch({ type: 'TOGGLE_FOCUS_MODE' })}
          title="Full Page Code Mode (Alt+Z / F11) — Maximize workspace to pure code"
        >
          <Maximize2 size={14} />
          <span className="btn-tool-label">Full Page</span>
          <kbd className="btn-shortcut-pill">F11</kbd>
        </button>

        {/* Quick Theme Switcher Button */}
        <button
          className="btn-icon"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.hash = '#/settings?tab=themes';
            }
            dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
          }}
          title="Change Theme & Custom 3-Color Palette"
        >
          <Palette size={18} />
        </button>

        {/* Dedicated Settings Page Button */}
        <button
          className="btn-icon"
          onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' })}
          title="Settings, Themes, Audio & ZIP Hub"
        >
          <Settings size={18} />
        </button>

        {/* Minimize Navbar Button */}
        <button
          className="btn-icon btn-minimize-nav"
          onClick={() => dispatch({ type: 'TOGGLE_NAVBAR_MINIMIZED' })}
          title="Minimize navigation bar to maximize coding space (Alt+M)"
        >
          <ChevronUp size={16} />
        </button>

        {/* User Account / Profile Modal Button */}
        {activeUser ? (
          <div
            className="header-user-avatar-badge"
            onClick={() => dispatch({ type: 'SET_WELCOME_MODAL', payload: true })}
            style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
            title={`Logged in as ${activeUser.username} (${activeUser.avatarInitials}) — Click to view Account & Features`}
          >
            <span>{activeUser.avatarInitials}</span>
          </div>
        ) : (
          <button
            className="btn-header-login"
            onClick={() => dispatch({ type: 'SET_WELCOME_MODAL', payload: true })}
            title="Sign Up / Features (Why Full Code vs VS Code)"
          >
            <UserPlus size={14} className="login-icon-glow" />
            <span>Sign Up</span>
          </button>
        )}
      </div>
    </header>
  );
}
