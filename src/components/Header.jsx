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
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import './Header.css';

export default function Header() {
  const {
    state,
    collabRoomId,
    dispatch,
    handleRunCode,
    handleFormatCode,
  } = useApp();
  const { executionStatus, explorerOpen, activeUser, files, activeFileId } = state;

  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  const [showWorkspacesMenu, setShowWorkspacesMenu] = useState(false);
  const practiceDropdownRef = useRef(null);
  const workspacesDropdownRef = useRef(null);

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
