import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Activity } from 'lucide-react';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import { getFriendlyLanguageName } from '../services/languageDetector';
import LanguageIcon from './LanguageIcon';
import './StatusBar.css';

export default function StatusBar() {
  const { state, dispatch } = useApp();
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
  } = state;

  const activeFile = files?.find((f) => f.id === activeFileId);
  const displayName = getFriendlyLanguageName(detectedLanguage, activeFile?.name, files);
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

  return (
    <footer className="status-bar antigravity-status-bar">
      {/* Left: Git branch, Sync & Problems */}
      <div className="status-left">
        <div className="status-item git-branch" title="Git Branch: main">
          <span className="material-symbols-outlined text-xs">save_as</span>
          <span>main</span>
        </div>

        <div className="status-item git-sync" title="Git Sync Status">
          <span className="material-symbols-outlined text-xs">sync</span>
          <span>0↓ 2↑</span>
        </div>

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

      {/* Right: Encodings, Ln/Col, Language, Prettier, Terminal Toggle */}
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

        <span
          className="status-item language"
          onClick={() => {
            window.location.hash = '#/settings?tab=general';
            dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
          }}
          title="Detected Language"
        >
          <LanguageIcon language={detectedLanguage} filename={activeFile?.name} workspaceFiles={files} size={13} />
          <span>{displayName}</span>
        </span>

        <span className="status-item prettier-active" title="Code Formatter Active">
          <span className="prettier-indicator-dot" />
          <span>Prettier Active</span>
        </span>

        <span className="status-item git-idle-item" title="Git Status: Idle">
          <span className="material-symbols-outlined text-[13px] animate-spin text-tertiary">progress_activity</span>
          <span>Git: Idle</span>
        </span>

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
