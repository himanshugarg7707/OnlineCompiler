import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Activity } from 'lucide-react';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import { getWorkspaceGitStatus } from '../services/gitService';
import './StatusBar.css';

export default function StatusBar() {
  const { state, dispatch, handleGitSync, handleGitPush } = useApp();
  const [zoomPercent, setZoomPercent] = useState(() => {
    if (typeof document !== 'undefined') {
      const z = parseFloat(document.body.style.zoom || '1.0');
      return Math.round(z * 100);
    }
    return 100;
  });

  useEffect(() => {
    const handleZoomEvent = (e) => {
      if (e.detail?.zoom) {
        setZoomPercent(Math.round(e.detail.zoom * 100));
      }
    };
    const handleNativeZoom = (e) => {
      if (e.detail?.percent) {
        setZoomPercent(parseInt(e.detail.percent, 10));
      }
    };
    window.addEventListener('fullcode-ui-zoom', handleZoomEvent);
    window.addEventListener('fullcode-native-action', (e) => {
      if (e.detail?.type === 'zoom-change' && e.detail?.percent) {
        setZoomPercent(parseInt(e.detail.percent, 10));
      }
    });
    return () => {
      window.removeEventListener('fullcode-ui-zoom', handleZoomEvent);
    };
  }, []);
  const {
    detectedLanguage,
    cursorPosition,
    executionTime,
    executionMemory,
    code,
    files,
    activeFileId,
    fileErrors = {},
    stderr,
    gitBranch = 'main',
    gitAhead = 0,
    gitBehind = 0,
    gitSyncing = false,
  } = state;

  const activeFile = files?.find((f) => f.id === activeFileId);

  const isNotebook = Boolean(
    activeFile?.name?.endsWith('.ipynb') ||
    detectedLanguage?.monacoLanguage === 'ipynb' ||
    detectedLanguage?.id === 710
  );

  const errorCount = useMemo(() => {
    let count = 0;
    if (stderr) count += 1;
    if (fileErrors && activeFileId && Array.isArray(fileErrors[activeFileId])) {
      count += fileErrors[activeFileId].length;
    }
    return count;
  }, [stderr, fileErrors, activeFileId]);

  const complexity = useMemo(() => {
    return analyzeComplexity(code, detectedLanguage);
  }, [code, detectedLanguage]);

  const gitStatus = useMemo(() => {
    return getWorkspaceGitStatus(files, []);
  }, [files]);

  return (
    <footer className="status-bar antigravity-status-bar">
      {/* Left: Git button, Git branch, Sync & Problems */}
      <div className="status-left">
        <button
          className="status-item git-footer-btn"
          onClick={() => {
            window.location.hash = '#/git';
            dispatch({ type: 'NAVIGATE_PAGE', payload: 'git' });
          }}
          title="Open Source Control & Git Studio"
        >
          <span className="material-symbols-outlined text-xs">source_environment</span>
          <span className="git-footer-label">Git</span>
        </button>
        <button
          className="status-item git-branch-btn"
          onClick={() => dispatch({ type: 'SET_BRANCH_MODAL_OPEN', payload: true })}
          title={`Git Branch: ${gitBranch} • Click to switch, create or merge branches`}
        >
          <span className="material-symbols-outlined text-xs">call_split</span>
          <span>{gitBranch}{gitStatus.totalCount > 0 ? '*' : ''}</span>
        </button>

        <button
          className={`status-item git-sync-btn ${gitSyncing ? 'is-syncing' : ''}`}
          onClick={handleGitSync}
          title={`Git Sync: ${gitBehind}↓ to pull, ${gitAhead}↑ to push • Click to sync with origin/${gitBranch}`}
        >
          <span className={`material-symbols-outlined text-xs ${gitSyncing ? 'animate-spin' : ''}`}>sync</span>
          <span>{gitBehind}↓ {gitAhead}↑</span>
        </button>

        <div
          className="status-item problems-indicator"
          onClick={() => {
            dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
            dispatch({ type: 'SET_TERMINAL_TAB', payload: 'output' });
          }}
          title={`${errorCount} Errors, 0 Warnings`}
        >
          <span className="material-symbols-outlined text-xs error-icon">error</span>
          <span>{errorCount}</span>
          <span className="material-symbols-outlined text-xs warning-icon">warning</span>
          <span>0</span>
        </div>

        {complexity.confidence !== 'none' && (
          <button
            className="status-item status-complexity-btn"
            onClick={() => {
              dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: false });
              dispatch({ type: 'SET_TERMINAL_TAB', payload: 'complexity' });
            }}
            title="Big-O Complexity Analysis & Optimization"
          >
            <Activity size={11} className="icon-cyan" />
            <span>⏱ {complexity.time} · 💾 {complexity.space}</span>
          </button>
        )}
      </div>

      {/* Right: Encodings, Ln/Col, Language, Compiler Identifier, Prettier, Terminal Toggle */}
      <div className="status-right">
        {executionTime && (
          <span className="status-item time">⏱ {executionTime}s</span>
        )}
        {executionMemory && (
          <span className="status-item memory">
            💾 {(executionMemory / 1024).toFixed(1)} MB
          </span>
        )}

        <span className="status-item">UTF-8</span>

        <span className="status-item">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>


        <span className="status-item prettier-active" title="Code Formatter Active">
          <span className="prettier-indicator-dot" />
          <span>Prettier Active</span>
        </span>

        {/* Zoom Controls for Entire Full Screen / Window */}
        <div className="status-item status-zoom-controls" title="Screen Zoom: Cmd/Ctrl + Plus / Minus to zoom full screen">
          <button
            type="button"
            className="zoom-sub-btn"
            onClick={() => {
              if (window.webkit?.messageHandlers?.nativeHost) {
                window.webkit.messageHandlers.nativeHost.postMessage({ type: 'zoom_out' });
              } else {
                const cur = parseFloat(document.body.style.zoom || '1.0');
                const next = Math.max(0.6, Math.round((cur - 0.1) * 10) / 10);
                document.body.style.zoom = next;
                window.dispatchEvent(new CustomEvent('fullcode-ui-zoom', { detail: { zoom: next } }));
              }
            }}
            title="Zoom Out (Cmd/Ctrl -)"
          >
            -
          </button>
          <button
            type="button"
            className="zoom-reset-btn"
            onClick={() => {
              if (window.webkit?.messageHandlers?.nativeHost) {
                window.webkit.messageHandlers.nativeHost.postMessage({ type: 'zoom_reset' });
              } else {
                document.body.style.zoom = '1.0';
                setZoomPercent(100);
                window.dispatchEvent(new CustomEvent('fullcode-ui-zoom', { detail: { zoom: 1.0 } }));
              }
            }}
            title="Reset Zoom to 100% (Cmd/Ctrl 0)"
          >
            🔍 {zoomPercent}%
          </button>
          <button
            type="button"
            className="zoom-sub-btn"
            onClick={() => {
              if (window.webkit?.messageHandlers?.nativeHost) {
                window.webkit.messageHandlers.nativeHost.postMessage({ type: 'zoom_in' });
              } else {
                const cur = parseFloat(document.body.style.zoom || '1.0');
                const next = Math.min(2.0, Math.round((cur + 0.1) * 10) / 10);
                document.body.style.zoom = next;
                window.dispatchEvent(new CustomEvent('fullcode-ui-zoom', { detail: { zoom: next } }));
              }
            }}
            title="Zoom In (Cmd/Ctrl +)"
          >
            +
          </button>
        </div>


        {/* Terminal Toggle Button (hidden in notebook mode since output is inline) */}
        {!isNotebook && (
          <button
            className="status-item terminal-btn-bar"
            onClick={() => {
              dispatch({ type: 'SET_TERMINAL_HIDDEN', payload: !state.terminalHidden });
              if (state.terminalHidden) {
                dispatch({ type: 'SET_TERMINAL_TAB', payload: 'terminal' });
              }
            }}
            title="Toggle Bottom Terminal & Output Panel (Ctrl+`)"
          >
            <span className="material-symbols-outlined text-xs">terminal</span>
            <span>Terminal</span>
          </button>
        )}
      </div>
    </footer>
  );
}
