import { useApp } from '../context/AppContext';
import {
  Play,
  Settings,
  Code2,
  FolderTree,
  BookOpen,
  Share2,
  History,
  AlignLeft,
  LogIn,
  UserPlus,
  Radio,
  Maximize2,
  Minimize2,
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
    handleToggleFocusMode,
  } = useApp();
  const { executionStatus, explorerOpen, activeUser, focusMode, files, activeFileId } = state;

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';
  const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Pure Focus Mode (Full Navbar Hidden, 100% Editor Space, Just Run Button & Exit)
  if (focusMode) {
    return (
      <div className="focus-floating-controller animate-slide-up">
        {/* Run Code Button */}
        <button
          className={`btn-run focus-run-btn ${isRunning ? 'running' : ''} ${hasSelection ? 'has-selection' : ''}`}
          onClick={handleRunCode}
          disabled={isRunning}
          title={hasSelection ? 'Run selected query (Ctrl+Enter)' : 'Run code (Ctrl+Enter)'}
        >
          {isRunning ? (
            <>
              <div className="spinner" />
              <span>{executionStatus === 'compiling' ? 'Compiling...' : 'Running...'}</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>{hasSelection ? 'Run Selection' : 'Run'}</span>
            </>
          )}
        </button>

        {/* Exit Focus Button */}
        <button
          className="btn-exit-focus-pill"
          onClick={handleToggleFocusMode}
          title="Exit Focus Mode (Esc)"
        >
          <Minimize2 size={13} />
          <span>Exit</span>
        </button>
      </div>
    );
  }

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
        {/* Focus Mode Button */}
        <button
          className="btn-hint btn-ghost btn-focus-header"
          onClick={handleToggleFocusMode}
          title="Enter Code Focus Mode (Zen distraction-free view)"
        >
          <Maximize2 size={15} />
          <span>Focus</span>
        </button>

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
          className={`btn-hint btn-ghost ${collabRoomId ? 'collab-live-btn' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_COLLAB_MODAL' })}
          title={collabRoomId ? `Connected to Room: ${collabRoomId} (Click to manage)` : 'Live Room Collaboration'}
        >
          <Radio size={15} className={collabRoomId ? 'live-spin-icon' : ''} />
          <span>{collabRoomId ? collabRoomId : 'Live'}</span>
        </button>

        {/* Version History Modal Button */}
        <button
          className="btn-hint btn-ghost"
          onClick={() => dispatch({ type: 'TOGGLE_HISTORY_MODAL' })}
          title="Local Version History & Snapshots"
        >
          <History size={15} />
          <span>History</span>
        </button>

        {/* Share Link Modal Button */}
        <button
          className="btn-hint btn-ghost"
          onClick={() => dispatch({ type: 'TOGGLE_SHARE_MODAL' })}
          title="Share Workspace & Code Link"
        >
          <Share2 size={15} />
          <span>Share</span>
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

        {/* Settings Modal Button */}
        <button
          className="btn-icon"
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          title="Settings, Themes & Security"
        >
          <Settings size={18} />
        </button>

        {/* User Account / Profile Modal Button */}
        {activeUser ? (
          <div
            className="header-user-avatar-badge"
            onClick={() => dispatch({ type: 'SET_AUTH_MODAL', payload: true })}
            style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
            title={`Logged in as ${activeUser.username} (${activeUser.avatarInitials}) — Click to open Profile & Account Modal`}
          >
            <span>{activeUser.avatarInitials}</span>
          </div>
        ) : (
          <button
            className="btn-header-login"
            onClick={() => dispatch({ type: 'SET_AUTH_MODAL', payload: true })}
            title="Sign Up / Login (Save & isolate workspaces)"
          >
            <UserPlus size={14} className="login-icon-glow" />
            <span>Sign Up</span>
          </button>
        )}
      </div>
    </header>
  );
}
