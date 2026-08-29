import { useApp } from '../context/AppContext';
import { Terminal, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import './StatusBar.css';

export default function StatusBar() {
  const { state, handleToggleTerminal } = useApp();
  const { detectedLanguage, cursorPosition, executionTime, executionMemory, terminalHidden } = state;

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-item language">
          {detectedLanguage?.icon || '📄'} {detectedLanguage?.name || 'Code'}
        </span>
        <span className="status-item">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>
        <span className="status-item">UTF-8</span>
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
