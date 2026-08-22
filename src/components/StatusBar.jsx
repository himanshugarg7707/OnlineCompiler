import { useApp } from '../context/AppContext';
import './StatusBar.css';

export default function StatusBar() {
  const { state } = useApp();
  const { detectedLanguage, cursorPosition, executionTime, executionMemory, config } = state;

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-item language">
          {detectedLanguage.icon} {detectedLanguage.name}
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
        <span className="status-item mode">
          {config.mockAI ? '🧪 Mock' : '🔴 Live'}
        </span>
        <span className="status-item brand">CodeForge AI</span>
      </div>
    </footer>
  );
}
