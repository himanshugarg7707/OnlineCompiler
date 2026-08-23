import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Lightbulb, Settings, MessageSquare, Zap, Code } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import SnippetsModal from './SnippetsModal';
import './Header.css';

export default function Header() {
  const { state, dispatch, handleRunCode } = useApp();
  const { executionStatus, sidebarOpen } = state;
  const [snippetsOpen, setSnippetsOpen] = useState(false);

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';
  const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">
            <Zap size={20} />
          </div>
          <span className="logo-text">CodeForge</span>
          <span className="logo-ai">AI</span>
        </div>

        <LanguageSelector />
      </div>

      <div className="header-right">
        <button
          className="btn-hint btn-ghost"
          onClick={() => setSnippetsOpen(true)}
          title="Browse Snippets Library (Ctrl+Shift+S)"
        >
          <Code size={15} />
          <span>Snippets</span>
        </button>

        <button
          className="btn-hint btn-ghost"
          onClick={() => dispatch({ type: 'TOGGLE_HINT_MODAL' })}
          title="Get a logic hint (Ctrl+Shift+H)"
        >
          <Lightbulb size={15} />
          <span>Hint</span>
        </button>

        <button
          className={`btn-run ${isRunning ? 'running' : ''} ${hasSelection ? 'has-selection' : ''}`}
          onClick={handleRunCode}
          disabled={isRunning}
          title={hasSelection ? "Run selected query only (Ctrl+Enter)" : "Run code (Ctrl+Enter)"}
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

        <button
          className={`btn-icon ${sidebarOpen ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          title="Toggle AI Chat (Ctrl+B)"
        >
          <MessageSquare size={18} />
        </button>

        <button
          className="btn-icon"
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Snippets Modal */}
      <SnippetsModal isOpen={snippetsOpen} onClose={() => setSnippetsOpen(false)} />
    </header>
  );
}
