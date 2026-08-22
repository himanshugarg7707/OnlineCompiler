import { useApp } from '../context/AppContext';
import { Play, Lightbulb, Settings, MessageSquare, Zap } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import './Header.css';

export default function Header() {
  const { state, dispatch, handleRunCode } = useApp();
  const { executionStatus, sidebarOpen } = state;

  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';

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
          onClick={() => dispatch({ type: 'TOGGLE_HINT_MODAL' })}
          title="Get a logic hint (Ctrl+Shift+H)"
        >
          <Lightbulb size={16} />
          <span>Hint</span>
        </button>

        <button
          className={`btn-run ${isRunning ? 'running' : ''}`}
          onClick={handleRunCode}
          disabled={isRunning}
          title="Run code (Ctrl+Enter)"
        >
          {isRunning ? (
            <>
              <div className="spinner" />
              <span>{executionStatus === 'compiling' ? 'Compiling...' : 'Running...'}</span>
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              <span>Run</span>
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
    </header>
  );
}
