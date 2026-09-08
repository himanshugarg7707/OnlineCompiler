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

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';
  const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Standard Header
  return (
    <header className="header">
      <div className="header-left">
        <button
          className={`btn-icon ${explorerOpen ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
          title="Toggle File Explorer (Ctrl+Shift+E)"
        >
          <FolderTree size={18} />
        </button>

        <div className="logo">
          <div className="logo-icon">
            <Code2 size={20} />
          </div>
          <span className="logo-text">Full Code</span>
        </div>

        <LanguageSelector />
      </div>

      <div className="header-right">
        {/* Format Code */}
        <button
          className="btn-hint btn-ghost btn-format-header"
          onClick={handleFormatCode}
          title="Format Code (Shift+Alt+F)"
        >
          <AlignLeft size={15} />
          <span>Format</span>
        </button>

        {/* Code Templates Modal Button */}
        <button
          className="btn-hint btn-ghost btn-templates-header"
          onClick={() => dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' })}
          title="DSA Code Templates & Algorithms Library"
        >
          <LayoutTemplate size={15} />
          <span>Templates</span>
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

        {/* Subject Notebooks Hub Button */}
        <button
          className="btn-hint btn-ghost btn-notebooks-header"
          onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'notebook-setup' })}
          title="Subject Notebooks & Course Workspaces Setup"
        >
          <GraduationCap size={15} />
          <span>Notebooks</span>
        </button>

        {/* Workspaces Manager Button */}
        <button
          className="btn-hint btn-ghost btn-workspaces-header"
          onClick={() => dispatch({ type: 'TOGGLE_WORKSPACES_MODAL' })}
          title="Saved Workspaces & Projects Manager"
        >
          <FolderKanban size={15} />
          <span>Workspaces</span>
        </button>


        {/* Practice Questions */}
        <button
          className="btn-hint btn-ghost practice-btn"
          onClick={() => dispatch({ type: 'TOGGLE_PRACTICE' })}
          title="Practice Questions Lab"
        >
          <BookOpen size={15} />
          <span>Practice</span>
        </button>

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
