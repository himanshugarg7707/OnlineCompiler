import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Terminal, Plus, ChevronUp, ChevronDown, Palette, Activity } from 'lucide-react';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import { getFriendlyLanguageName } from '../services/languageDetector';
import LanguageIcon from './LanguageIcon';
import './StatusBar.css';

const THEME_NAMES = {
  custom: 'Custom (3-Color)',
  dark: 'Full Code Dark',
  'baby-pink': 'Baby Pink (Light)',
  'baby-pink-dark': 'Baby Pink (Dark)',
  cyberpunk: 'Cyberpunk Neon',
  monokai: 'Monokai Pro',
  light: 'Clean Light',
  nord: 'Nord Frost',
};

export default function StatusBar() {
  const { state, dispatch, handleToggleTerminal } = useApp();
  const { detectedLanguage, cursorPosition, executionTime, executionMemory, terminalHidden, code, files, activeFileId } = state;
  const activeFile = files?.find((f) => f.id === activeFileId);
  const displayName = getFriendlyLanguageName(detectedLanguage, activeFile?.name);

  const complexity = useMemo(() => {
    return analyzeComplexity(code, detectedLanguage);
  }, [code, detectedLanguage]);

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-item language">
          <LanguageIcon language={detectedLanguage} filename={activeFile?.name} size={13} />
          <span>{displayName}</span>
        </span>
        <span className="status-item">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        <span className="status-item">UTF-8</span>

        {complexity.confidence !== 'none' && (
          <button
            className="status-item status-complexity-btn"
            onClick={() => dispatch({ type: 'SET_TERMINAL_TAB', payload: 'complexity' })}
            title="Click to open full Big-O Complexity & Optimization tab"
          >
            <Activity size={12} className="icon-cyan" />
            <span>⏱ {complexity.time} · 💾 {complexity.space}</span>
          </button>
        )}

        <button
          className="status-item status-theme-btn"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.hash = '#/settings?tab=themes';
            }
            dispatch({ type: 'NAVIGATE_PAGE', payload: 'settings' });
          }}
          title="Change Theme & Custom 3-Color Engine"
        >
          <Palette size={12} />
          <span>{THEME_NAMES[state.config?.theme] || 'Theme'}</span>
        </button>
      </div>

      <div className="status-right">
        {executionTime && (
          <span className="status-item time">⏱ {executionTime}s</span>
        )}
        {executionMemory && (
          <span className="status-item memory">
            💾 {(executionMemory / 1024).toFixed(1)} MB
          </span>
        )}

        {/* Prominent Footer Terminal Toggle Button */}
        <button
          className={`status-terminal-btn ${terminalHidden ? 'terminal-hidden-badge' : 'terminal-active-badge'}`}
          onClick={handleToggleTerminal}
          title={terminalHidden ? "Show Terminal & Output (Ctrl+`)" : "Hide Terminal & Output (Ctrl+`)"}
        >
          {terminalHidden ? (
            <>
              <Plus size={12} className="terminal-btn-plus" />
              <Terminal size={12} />
              <span>Show Terminal</span>
            </>
          ) : (
            <>
              <Terminal size={12} />
              <span>Terminal</span>
            </>
          )}
        </button>

        <span className="status-item brand">Full Code</span>
      </div>
    </footer>
  );
}
