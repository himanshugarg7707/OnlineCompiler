import { useState, useEffect, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import FileExplorer from './components/FileExplorer';
import SettingsModal from './components/SettingsModal';
import PracticePanel from './components/PracticePanel';
import ShareModal from './components/ShareModal';
import HistoryModal from './components/HistoryModal';
import SaveAsModal from './components/SaveAsModal';
import AuthModal from './components/AuthModal';
import LiveShareModal from './components/LiveShareModal';
import IncomingChangesModal from './components/IncomingChangesModal';
import CookieConsentBanner from './components/CookieConsentBanner';
import LiveRoomChatDrawer from './components/LiveRoomChatDrawer';
import StatusBar from './components/StatusBar';
import WorkspacesModal from './components/WorkspacesModal';
import WelcomeLandingModal from './components/WelcomeLandingModal';
import TemplatesModal from './components/TemplatesModal';
import SharedWorkspaceBanner from './components/SharedWorkspaceBanner';
import SettingsPage from './pages/SettingsPage';
import NotebookSetupPage from './pages/NotebookSetupPage';
import { FolderTree, ChevronLeft, ChevronRight } from 'lucide-react';
import './App.css';

const SPLIT_STORAGE_KEY = 'fullcode_split_percent';
const EXPLORER_WIDTH_KEY = 'fullcode_explorer_width';
const PRACTICE_WIDTH_KEY = 'fullcode_practice_width';

function AppContent() {
  const {
    state,
    dispatch,
    handleRunCode,
    handleSaveActiveFile,
    handleCreateSequentialFile,
    handleAcceptIncomingChanges,
    handleDeclineIncomingChanges,
    handleToggleTerminal,
  } = useApp();
  const { explorerOpen, practiceOpen, toast, terminalHidden } = state;

  // Vertical Editor/Terminal Split
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

  // Horizontal Left Explorer Split (width in px)
  const [explorerWidth, setExplorerWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(EXPLORER_WIDTH_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 160 && val <= 450) return val;
      }
    } catch {}
    return 240;
  });

  // Horizontal Right Practice Panel Split (width in px)
  const [practiceWidth, setPracticeWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(PRACTICE_WIDTH_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 240 && val <= 650) return val;
      }
    } catch {}
    return 360;
  });

  const [isVerticalDragging, setIsVerticalDragging] = useState(false);
  const [isHorizontalDragging, setIsHorizontalDragging] = useState(false);
  const [isPracticeDragging, setIsPracticeDragging] = useState(false);

  const mainContentRef = useRef(null);
  const appBodyRef = useRef(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter or Cmd+Enter to Run Code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      // Ctrl+S or Cmd+S to Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveActiveFile();
      }
      // Ctrl+N or Cmd+N to create sequential file
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleCreateSequentialFile();
      }
      // Ctrl+Shift+E to toggle Explorer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_EXPLORER' });
      }
      // Ctrl+` to toggle Terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        handleToggleTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleRunCode, handleSaveActiveFile, handleCreateSequentialFile, handleToggleTerminal, dispatch]);

  // Handle Vertical Dragging (Editor vs Output)
  const handleVerticalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsVerticalDragging(true);
    document.body.classList.add('resizing-vertical');
  }, []);

  const handleVerticalTouchStart = useCallback(() => {
    setIsVerticalDragging(true);
    document.body.classList.add('resizing-vertical');
  }, []);

  useEffect(() => {
    if (!isVerticalDragging) return;

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
      setIsVerticalDragging(false);
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
  }, [isVerticalDragging, splitPercent]);

  // Handle Horizontal Dragging (File Explorer width)
  const handleHorizontalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsHorizontalDragging(true);
    document.body.classList.add('resizing-horizontal');
  }, []);

  const handleHorizontalTouchStart = useCallback(() => {
    setIsHorizontalDragging(true);
    document.body.classList.add('resizing-horizontal');
  }, []);

  const handleExplorerResizerDoubleClick = useCallback(() => {
    setExplorerWidth((prev) => {
      const target = prev <= 240 ? 340 : 240;
      try {
        localStorage.setItem(EXPLORER_WIDTH_KEY, String(target));
      } catch {}
      return target;
    });
  }, []);

  useEffect(() => {
    if (!isHorizontalDragging) return;

    const handleMouseMove = (e) => {
      if (!appBodyRef.current) return;
      const rect = appBodyRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX === undefined) return;

      const offsetLeft = clientX - rect.left;

      // Auto-collapse if dragged very small
      if (offsetLeft < 60) {
        dispatch({ type: 'TOGGLE_EXPLORER' });
        setIsHorizontalDragging(false);
        document.body.classList.remove('resizing-horizontal');
        return;
      }

      // Responsive clamp based on viewport width: min 140px, max 55% of screen width or 550px
      const maxAllowed = Math.min(550, Math.floor(window.innerWidth * 0.55));
      const minAllowed = 140;
      const clamped = Math.min(Math.max(offsetLeft, minAllowed), maxAllowed);
      setExplorerWidth(clamped);
      try {
        localStorage.setItem(EXPLORER_WIDTH_KEY, String(clamped));
      } catch {}
    };

    const handleMouseUp = () => {
      setIsHorizontalDragging(false);
      document.body.classList.remove('resizing-horizontal');
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
      document.body.classList.remove('resizing-horizontal');
    };
  }, [isHorizontalDragging, dispatch]);

  // Handle Practice Panel Horizontal Dragging
  const handlePracticeMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsPracticeDragging(true);
    document.body.classList.add('resizing-horizontal');
  }, []);

  const handlePracticeTouchStart = useCallback(() => {
    setIsPracticeDragging(true);
    document.body.classList.add('resizing-horizontal');
  }, []);

  useEffect(() => {
    if (!isPracticeDragging) return;

    const handleMouseMove = (e) => {
      if (!appBodyRef.current) return;
      const rect = appBodyRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX === undefined) return;

      const offsetRight = rect.right - clientX;
      // Clamp between 240px and 650px
      const clamped = Math.min(Math.max(offsetRight, 240), 650);
      setPracticeWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsPracticeDragging(false);
      document.body.classList.remove('resizing-horizontal');
      try {
        localStorage.setItem(PRACTICE_WIDTH_KEY, String(practiceWidth));
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
      document.body.classList.remove('resizing-horizontal');
    };
  }, [isPracticeDragging, practiceWidth]);

  return (
    <div className="app-container">
      <Header />
      <SharedWorkspaceBanner />

      <div className="app-body" ref={appBodyRef}>
        {/* Left File Explorer Sidebar */}
        {!explorerOpen && (
          <div
            className="explorer-collapsed-rail"
            onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
            title="Expand File Explorer (Ctrl+Shift+E)"
          >
            <FolderTree size={15} className="rail-folder-icon" />
            <span className="rail-vertical-text">EXPLORER</span>
            <ChevronRight size={12} className="rail-expand-arrow" />
          </div>
        )}

        {explorerOpen && (
          <>
            <div
              className="explorer-mobile-backdrop"
              onClick={() => dispatch({ type: 'TOGGLE_EXPLORER' })}
              title="Close File Explorer"
            />
            <div
              className="explorer-container"
              style={{ width: `${explorerWidth}px`, flex: 'none' }}
            >
              <FileExplorer />
            </div>

            <div
              className={`horizontal-resizer ${isHorizontalDragging ? 'dragging' : ''}`}
              onMouseDown={handleHorizontalMouseDown}
              onTouchStart={handleHorizontalTouchStart}
              onDoubleClick={handleExplorerResizerDoubleClick}
              title="Drag to resize file explorer • Double-click to toggle width"
            >
              <div className="horizontal-resizer-handle" title="Drag to slide explorer width">
                <div className="resizer-dots-grip">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <button
                type="button"
                className="btn-quick-collapse-slider"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'TOGGLE_EXPLORER' });
                }}
                title="Collapse File Explorer"
              >
                <ChevronLeft size={10} />
              </button>
            </div>
          </>
        )}

        {/* Main Editor & Output Split Panel */}
        <div className="main-content" ref={mainContentRef}>
          <div
            className="editor-section"
            style={{
              height: terminalHidden ? '100%' : `${splitPercent}%`,
              flex: 'none',
            }}
          >
            <CodeEditor />
          </div>

          {!terminalHidden && (
            <>
              <div
                className={`split-resizer ${isVerticalDragging ? 'dragging' : ''}`}
                onMouseDown={handleVerticalMouseDown}
                onTouchStart={handleVerticalTouchStart}
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
            </>
          )}
        </div>

        {/* Right Adjustable Practice Sidebar */}
        {practiceOpen && (
          <>
            <div
              className={`horizontal-resizer practice-resizer ${isPracticeDragging ? 'dragging' : ''}`}
              onMouseDown={handlePracticeMouseDown}
              onTouchStart={handlePracticeTouchStart}
              title="Drag to resize practice panel"
            >
              <div className="horizontal-resizer-handle" />
            </div>

            <div
              className="practice-container"
              style={{ width: `${practiceWidth}px`, flex: 'none' }}
            >
              <PracticePanel />
            </div>
          </>
        )}
      </div>

      <StatusBar />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-notification animate-slide-up">
          <span>{toast}</span>
        </div>
      )}

      {/* Modals */}
      <SettingsModal />
      <ShareModal
        isOpen={state.shareModalOpen}
        onClose={() => dispatch({ type: 'SET_SHARE_MODAL', payload: false })}
      />
      <HistoryModal
        isOpen={state.historyModalOpen}
        onClose={() => dispatch({ type: 'SET_HISTORY_MODAL', payload: false })}
      />
      <SaveAsModal
        isOpen={state.saveAsModalOpen}
        targetFile={state.saveAsTargetFile}
        onClose={() => dispatch({ type: 'SET_SAVE_AS_MODAL', payload: { isOpen: false } })}
      />
      <AuthModal
        isOpen={state.authModalOpen}
        onClose={() => dispatch({ type: 'SET_AUTH_MODAL', payload: false })}
      />
      <LiveShareModal
        isOpen={state.collabModalOpen}
        onClose={() => dispatch({ type: 'SET_COLLAB_MODAL', payload: false })}
      />
      <IncomingChangesModal
        isOpen={state.incomingModalOpen}
        updateData={state.incomingUpdate}
        onAccept={handleAcceptIncomingChanges}
        onDecline={handleDeclineIncomingChanges}
      />
      <CookieConsentBanner />
      <LiveRoomChatDrawer />

      <WorkspacesModal
        isOpen={state.workspacesModalOpen}
        onClose={() => dispatch({ type: 'SET_WORKSPACES_MODAL', payload: false })}
      />
      <WelcomeLandingModal
        isOpen={state.welcomeModalOpen}
        onClose={() => dispatch({ type: 'SET_WELCOME_MODAL', payload: false })}
      />
      <TemplatesModal
        isOpen={state.templatesModalOpen}
        onClose={() => dispatch({ type: 'SET_TEMPLATES_MODAL', payload: false })}
      />
    </div>
  );
}

function AppRouter() {
  const { state } = useApp();
  if (state.currentPage === 'settings') {
    return <SettingsPage />;
  }
  if (state.currentPage === 'notebook-setup') {
    return <NotebookSetupPage />;
  }
  return <AppContent />;
}

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
