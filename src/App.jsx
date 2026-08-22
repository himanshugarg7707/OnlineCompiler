import { useState, useEffect, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import ChatSidebar from './components/ChatSidebar';
import HintPanel from './components/HintPanel';
import SettingsModal from './components/SettingsModal';
import StatusBar from './components/StatusBar';
import './App.css';

const SPLIT_STORAGE_KEY = 'codeforge_split_percent';

function AppContent() {
  const { state, dispatch, handleRunCode } = useApp();
  const { sidebarOpen } = state;

  const [splitPercent, setSplitPercent] = useState(() => {
    try {
      const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 85) return val;
      }
    } catch {}
    return 58;
  });

  const [isDragging, setIsDragging] = useState(false);
  const mainContentRef = useRef(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      // Ctrl+B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SIDEBAR' });
      }
      // Ctrl+Shift+H for hint
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_HINT_MODAL' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunCode, dispatch]);

  // Handle Dragging
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.classList.add('resizing-vertical');
  }, []);

  const handleTouchStart = useCallback((e) => {
    setIsDragging(true);
    document.body.classList.add('resizing-vertical');
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!mainContentRef.current) return;
      const rect = mainContentRef.current.getBoundingClientRect();
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientY === undefined) return;

      const offsetTop = clientY - rect.top;
      const totalHeight = rect.height;
      const percent = (offsetTop / totalHeight) * 100;

      // Clamp between 20% and 85%
      const clamped = Math.min(Math.max(percent, 20), 85);
      setSplitPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.classList.remove('resizing-vertical');
      try {
        localStorage.setItem(SPLIT_STORAGE_KEY, String(splitPercent));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      document.body.classList.remove('resizing-vertical');
    };
  }, [isDragging, splitPercent]);

  return (
    <div className="app-container">
      <Header />

      <div className="app-body">
        <div className="main-content" ref={mainContentRef}>
          <div
            className="editor-section"
            style={{ height: `${splitPercent}%`, flex: 'none' }}
          >
            <CodeEditor />
          </div>

          <div
            className={`split-resizer ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            title="Drag to resize editor and terminal"
          >
            <div className="resizer-handle" />
          </div>

          <div
            className="output-section"
            style={{ height: `${100 - splitPercent}%`, flex: 'none' }}
          >
            <OutputPanel />
          </div>
        </div>

        {sidebarOpen && <ChatSidebar />}
      </div>

      <StatusBar />

      {/* Modals */}
      <HintPanel />
      <SettingsModal />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
