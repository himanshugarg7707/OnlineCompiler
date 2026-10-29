import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Settings,
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
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  Glasses,
  FlaskConical,
  Brain,
  Columns2,
  FileText,
} from 'lucide-react';
import LanguageIcon from './LanguageIcon';
import { isLocalEnvironment } from '../services/judge0Service';
import { processFileList } from '../services/importService';
import './Header.css';

export function GodNavLogo({ isMinimized = false, onClick }) {
  return (
    <div
      className={`god-navlogo ${isMinimized ? 'is-min' : ''}`}
      onClick={onClick}
      title="Full Code IDE — Return to Workspace"
    >
      <div className="god-logo-badge">
        <svg
          className="god-logo-svg"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="godBoltGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="45%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="godBracketLeft" x1="2" y1="6" x2="10" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="godBracketRight" x1="22" y1="6" x2="30" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <filter id="godGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Left Code Bracket < */}
          <path
            d="M8.5 10L3.5 16L8.5 22"
            stroke="url(#godBracketLeft)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center Electric Lightning Bolt ⚡ */}
          <path
            d="M18 3L10.5 16.5H16.5L14 29L22.5 14.5H16.5L18 3Z"
            fill="url(#godBoltGrad)"
            filter="url(#godGlow)"
          />

          {/* Right Code Bracket > */}
          <path
            d="M23.5 10L28.5 16L23.5 22"
            stroke="url(#godBracketRight)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="god-logo-pulse" />
      </div>

      <div className="god-logo-text-group">
        <span className="god-logo-title-full">Full</span>
        <span className="god-logo-title-code">Code</span>
      </div>
    </div>
  );
}

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
    handleToggleIncognitoMode,
    handleToggleSplitView,
    handleSetSplitPaneType,
    showToast,
  } = useApp();
  const { executionStatus, explorerOpen, activeUser, files, activeFileId, config } = state;

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleTriggerImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleTriggerImportFolder = () => {
    folderInputRef.current?.click();
  };

  const handleFileInputChange = async (e) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    try {
      const processed = await processFileList(rawFiles);
      if (!processed || processed.length === 0) {
        showToast('No readable code files found');
        return;
      }
      processed.forEach((f, idx) => {
        dispatch({
          type: 'ADD_FILE',
          payload: {
            name: f.path || f.name,
            content: f.content,
            shouldOpen: idx === 0,
          },
        });
      });
      showToast(`Imported ${processed.length} file(s) into workspace 📄`);
    } catch (err) {
      console.error(err);
      showToast('Error reading imported files');
    } finally {
      e.target.value = '';
    }
  };

  const handleFolderInputChange = async (e) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    try {
      const processed = await processFileList(rawFiles);
      if (!processed || processed.length === 0) {
        showToast('No readable code files found in selected folder');
        return;
      }
      processed.forEach((f, idx) => {
        dispatch({
          type: 'ADD_FILE',
          payload: {
            name: f.path || f.name,
            content: f.content,
            shouldOpen: idx === 0,
          },
        });
      });
      showToast(`Imported folder with ${processed.length} file(s) 📁`);
    } catch (err) {
      console.error(err);
      showToast('Error reading folder contents');
    } finally {
      e.target.value = '';
    }
  };

  const isNativeApp = typeof window !== 'undefined' && Boolean(window.webkit?.messageHandlers?.nativeHost);
  const isLocalHost = isLocalEnvironment();

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';
  const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const workspaceTitle = state.currentWorkspaceName || 'fullcode-project';

  // Minimized Sleek Header Mode (28px height, maximum screen space for code)
  if (state.navbarMinimized) {
    return (
      <header className="header app-header header-minimized">
        <div className="header-min-left">
          <GodNavLogo
            isMinimized={true}
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
          />
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
    <header className="header app-header antigravity-top-bar">
      {/* Left: Brand Logo (Aligned directly to the left) */}
      <div className="header-left">
        <GodNavLogo onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })} />
      </div>

      {/* Right Controls: Workspace Symbol Button, Run, Settings, Profile */}
      <div className="header-right">
        {/* Workspace Symbol Button */}
        <button
          type="button"
          className="btn-icon-top btn-header-workspace"
          onClick={() => dispatch({ type: 'TOGGLE_WORKSPACES_MODAL' })}
          title={`Saved Workspaces: ${workspaceTitle} (Click to switch or save workspaces)`}
        >
          <FolderKanban size={15} />
        </button>

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

      {/* Hidden File and Folder Pickers */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderInputChange}
      />
    </header>
  );
}
