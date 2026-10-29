import { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useApp, resolveLanguage } from '../context/AppContext';
import CodeEditor from './CodeEditor';
import OutputPanel from './OutputPanel';
import SplitPdfViewer from './SplitPdfViewer';
import LanguageIcon from './LanguageIcon';
import {
  X,
  FileText,
  Play,
  Columns2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Minimize2,
} from 'lucide-react';
import './SplitPaneContainer.css';

// Monaco themes mapping matching CodeEditor
const MONACO_THEMES = {
  'antigravity-google': 'fullcode-antigravity-google',
  'dark': 'fullcode-antigravity-google',
  'baby-pink': 'fullcode-baby-pink',
  'baby-pink-dark': 'fullcode-baby-pink-dark',
  'cyberpunk': 'fullcode-cyberpunk',
  'monokai': 'fullcode-monokai',
  'light': 'fullcode-light',
  'nord': 'fullcode-nord',
  'custom': 'fullcode-custom',
};

export default function SplitPaneContainer() {
  const {
    state,
    dispatch,
    handleToggleSplitView,
    handleSetSplitActiveFile,
    handleSetSplitPaneType,
    handleSplitCodeChange,
    handleRunSplitCode,
    handleRunCode,
    handleSelectFile,
  } = useApp();

  const containerRef = useRef(null);
  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);

  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingLeftV, setIsDraggingLeftV] = useState(false);
  const [isDraggingRightV, setIsDraggingRightV] = useState(false);

  const [leftVPercent, setLeftVPercent] = useState(55);
  const [rightVPercent, setRightVPercent] = useState(55);

  const [leftTerminalHidden, setLeftTerminalHidden] = useState(false);
  const [rightTerminalHidden, setRightTerminalHidden] = useState(false);

  const splitRatio = state.splitRatio ?? 50;
  const [localSplitRatio, setLocalSplitRatio] = useState(splitRatio);

  const isFullScreen = Boolean(state.focusMode);

  // Keep local ratio in sync when not dragging
  useEffect(() => {
    if (!isDraggingH) {
      setLocalSplitRatio(splitRatio);
    }
  }, [splitRatio, isDraggingH]);

  // Active files
  const leftFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
  const splitFile = state.files.find((f) => f.id === state.splitActiveFileId) ||
    state.files.find((f) => f.id !== leftFile?.id) ||
    state.files[0];

  const splitLang = resolveLanguage(splitFile?.language, splitFile?.name);
  const activeMonacoTheme = MONACO_THEMES[state.config?.theme] || 'fullcode-dark';

  // RAF & Pending values for butter-smooth 60/120fps dragging without React render lag
  const rafHRef = useRef(null);
  const pendingRatioRef = useRef(null);
  const rafLeftVRef = useRef(null);
  const pendingLeftVRef = useRef(null);
  const rafRightVRef = useRef(null);
  const pendingRightVRef = useRef(null);

  // ─── Horizontal Resizer (Between Left Editor & Right PDF/File Pane) ────────
  const handleHPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setIsDraggingH(true);
    document.body.classList.add('resizing-split-pane');
  }, []);

  const handleHPointerMove = useCallback((e) => {
    if (!isDraggingH || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width) return;

    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    if (clientX === null) return;

    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(15, Math.min(85, Math.round(rawPct * 10) / 10));

    pendingRatioRef.current = clamped;

    if (!rafHRef.current) {
      rafHRef.current = requestAnimationFrame(() => {
        rafHRef.current = null;
        if (pendingRatioRef.current !== null) {
          const val = pendingRatioRef.current;
          if (leftPaneRef.current) leftPaneRef.current.style.width = `${val}%`;
          if (rightPaneRef.current) rightPaneRef.current.style.width = `${100 - val}%`;
        }
      });
    }
  }, [isDraggingH]);

  const handleHPointerUp = useCallback((e) => {
    if (e?.currentTarget && e.pointerId !== undefined) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }

    if (rafHRef.current) {
      cancelAnimationFrame(rafHRef.current);
      rafHRef.current = null;
    }

    setIsDraggingH(false);
    document.body.classList.remove('resizing-split-pane');

    const finalRatio = pendingRatioRef.current ?? localSplitRatio;
    pendingRatioRef.current = null;
    const rounded = Math.round(finalRatio);
    setLocalSplitRatio(rounded);
    dispatch({ type: 'SET_SPLIT_RATIO', payload: rounded });
  }, [dispatch, localSplitRatio]);

  useEffect(() => {
    if (!isDraggingH) return;

    const onPointerMove = (e) => handleHPointerMove(e);
    const onPointerUp = (e) => handleHPointerUp(e);

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.body.classList.remove('resizing-split-pane');
      if (rafHRef.current) {
        cancelAnimationFrame(rafHRef.current);
        rafHRef.current = null;
      }
    };
  }, [isDraggingH, handleHPointerMove, handleHPointerUp]);

  // ─── Left Vertical Resizer (FullScreen: Editor 1 vs Terminal 1) ───────────
  const handleLeftVPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDraggingLeftV(true);
    document.body.classList.add('resizing-split-v');
  }, []);

  const handleLeftVPointerMove = useCallback((e) => {
    if (!isDraggingLeftV || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.height) return;

    const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
    const clamped = Math.max(15, Math.min(85, Math.round(rawPct)));
    pendingLeftVRef.current = clamped;

    if (!rafLeftVRef.current) {
      rafLeftVRef.current = requestAnimationFrame(() => {
        rafLeftVRef.current = null;
        if (pendingLeftVRef.current !== null) {
          setLeftVPercent(pendingLeftVRef.current);
        }
      });
    }
  }, [isDraggingLeftV]);

  const handleLeftVPointerUp = useCallback((e) => {
    if (e?.currentTarget && e.pointerId !== undefined) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
    if (rafLeftVRef.current) {
      cancelAnimationFrame(rafLeftVRef.current);
      rafLeftVRef.current = null;
    }
    setIsDraggingLeftV(false);
    document.body.classList.remove('resizing-split-v');
    if (pendingLeftVRef.current !== null) {
      setLeftVPercent(pendingLeftVRef.current);
      pendingLeftVRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isDraggingLeftV) return;
    window.addEventListener('pointermove', handleLeftVPointerMove);
    window.addEventListener('pointerup', handleLeftVPointerUp);
    window.addEventListener('pointercancel', handleLeftVPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleLeftVPointerMove);
      window.removeEventListener('pointerup', handleLeftVPointerUp);
      window.removeEventListener('pointercancel', handleLeftVPointerUp);
      document.body.classList.remove('resizing-split-v');
    };
  }, [isDraggingLeftV, handleLeftVPointerMove, handleLeftVPointerUp]);

  // ─── Right Vertical Resizer (FullScreen: Editor 2 vs Terminal 2) ──────────
  const handleRightVPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDraggingRightV(true);
    document.body.classList.add('resizing-split-v');
  }, []);

  const handleRightVPointerMove = useCallback((e) => {
    if (!isDraggingRightV || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.height) return;

    const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
    const clamped = Math.max(15, Math.min(85, Math.round(rawPct)));
    pendingRightVRef.current = clamped;

    if (!rafRightVRef.current) {
      rafRightVRef.current = requestAnimationFrame(() => {
        rafRightVRef.current = null;
        if (pendingRightVRef.current !== null) {
          setRightVPercent(pendingRightVRef.current);
        }
      });
    }
  }, [isDraggingRightV]);

  const handleRightVPointerUp = useCallback((e) => {
    if (e?.currentTarget && e.pointerId !== undefined) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
    if (rafRightVRef.current) {
      cancelAnimationFrame(rafRightVRef.current);
      rafRightVRef.current = null;
    }
    setIsDraggingRightV(false);
    document.body.classList.remove('resizing-split-v');
    if (pendingRightVRef.current !== null) {
      setRightVPercent(pendingRightVRef.current);
      pendingRightVRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isDraggingRightV) return;
    window.addEventListener('pointermove', handleRightVPointerMove);
    window.addEventListener('pointerup', handleRightVPointerUp);
    window.addEventListener('pointercancel', handleRightVPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleRightVPointerMove);
      window.removeEventListener('pointerup', handleRightVPointerUp);
      window.removeEventListener('pointercancel', handleRightVPointerUp);
      document.body.classList.remove('resizing-split-v');
    };
  }, [isDraggingRightV, handleRightVPointerMove, handleRightVPointerUp]);

  const isSplitRunning = state.splitExecution?.executionStatus === 'compiling' || state.splitExecution?.executionStatus === 'running';
  const isLeftRunning = state.executionStatus === 'compiling' || state.executionStatus === 'running';

  const leftEditorHeight = leftTerminalHidden ? 100 : leftVPercent;
  const leftTermHeight = leftTerminalHidden ? 0 : 100 - leftVPercent;

  const rightEditorHeight = rightTerminalHidden ? 100 : rightVPercent;
  const rightTermHeight = rightTerminalHidden ? 0 : 100 - rightVPercent;

  return (
    <div
      ref={containerRef}
      className={`split-pane-container ${isFullScreen ? 'split-fullscreen' : ''} ${
        isDraggingH ? 'resizing-h' : ''
      }`}
    >
      {/* ── LEFT PANE ── */}
      <div
        ref={leftPaneRef}
        className="split-pane split-left-pane"
        style={{ width: `${localSplitRatio}%` }}
      >
        <div className="split-pane-col">
          {/* Left Pane Navigation Header */}
          <div className="split-pane-header split-left-header">
            <div className="split-header-left">
              <div className="split-file-selector-wrap">
                <LanguageIcon language={leftFile?.language} filename={leftFile?.name} size={14} />
                <select
                  className="split-file-dropdown"
                  value={leftFile?.id || ''}
                  onChange={(e) => handleSelectFile && handleSelectFile(e.target.value)}
                  title="Select file to view and edit in left pane"
                >
                  {state.files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.id === splitFile?.id ? '(Right Pane)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="split-dropdown-chevron" />
              </div>
              <span className="split-pane-tag">Pane 1</span>
            </div>

            <div className="split-header-right">
              <button
                type="button"
                className={`btn-split-run ${isLeftRunning ? 'running' : ''}`}
                onClick={handleRunCode}
                disabled={isLeftRunning}
                title={`Run ${leftFile?.name} in Terminal 1 (Ctrl+Enter)`}
              >
                {isLeftRunning ? (
                  <div className="spinner-split-run" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                <span>Run File 1</span>
              </button>
            </div>
          </div>

          {/* Left Pane Editor Body */}
          <div
            className="split-pane-top"
            style={{
              height: `${leftEditorHeight}%`,
            }}
          >
            <CodeEditor />
          </div>

          {!leftTerminalHidden && (
            <div
              className={`split-pane-v-resizer ${isDraggingLeftV ? 'dragging' : ''}`}
              onPointerDown={handleLeftVPointerDown}
              onDoubleClick={() => setLeftVPercent(50)}
              title="Drag to resize Editor 1 and Terminal 1 • Double click to center 50/50"
            >
              <div className="v-resizer-line" />
            </div>
          )}

          {/* Left Pane Terminal 1 */}
          {leftTerminalHidden ? (
            <div className="split-collapsed-terminal-bar">
              <button
                type="button"
                className="btn-split-restore-term"
                onClick={() => setLeftTerminalHidden(false)}
                title="Restore Terminal 1"
              >
                <ChevronUp size={12} />
                <span>Show Terminal 1</span>
              </button>
            </div>
          ) : (
            <div
              className="split-pane-bottom"
              style={{
                height: `${leftTermHeight}%`,
              }}
            >
              <OutputPanel
                isSplitTerminal={false}
                overrideFile={leftFile}
                onRun={handleRunCode}
                terminalTitle="Terminal 1:"
                onToggleHide={() => setLeftTerminalHidden(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── VERTICAL RESIZER (Between Left & Right) ── */}
      <div
        className={`split-h-resizer ${isDraggingH ? 'dragging' : ''}`}
        onPointerDown={handleHPointerDown}
        onDoubleClick={() => {
          setLocalSplitRatio(50);
          dispatch({ type: 'SET_SPLIT_RATIO', payload: 50 });
        }}
        title="Drag to resize panes • Double click to center 50/50"
      >
        <div className="split-h-handle">
          <div className="split-h-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* Transparent Drag Overlay Shield (prevents PDF iframe/Monaco from eating mouse events) */}
      {(isDraggingH || isDraggingLeftV || isDraggingRightV) && (
        <div
          className={`split-drag-overlay ${
            isDraggingLeftV || isDraggingRightV ? 'vertical' : ''
          }`}
          onPointerMove={
            isDraggingH
              ? handleHPointerMove
              : isDraggingLeftV
              ? handleLeftVPointerMove
              : handleRightVPointerMove
          }
          onPointerUp={
            isDraggingH
              ? handleHPointerUp
              : isDraggingLeftV
              ? handleLeftVPointerUp
              : handleRightVPointerUp
          }
          onPointerCancel={
            isDraggingH
              ? handleHPointerUp
              : isDraggingLeftV
              ? handleLeftVPointerUp
              : handleRightVPointerUp
          }
        />
      )}

      {/* ── RIGHT PANE ── */}
      <div
        ref={rightPaneRef}
        className="split-pane split-right-pane"
        style={{ width: `${100 - localSplitRatio}%` }}
      >
        {state.splitPaneType === 'pdf' ? (
          <SplitPdfViewer />
        ) : (
          <div className="split-pane-col">
            {/* Right Pane Navigation Header */}
            <div className="split-pane-header split-right-header">
              <div className="split-header-left">
                {/* File Dropdown Selector */}
                <div className="split-file-selector-wrap">
                  <LanguageIcon language={splitFile?.language} filename={splitFile?.name} size={14} />
                  <select
                    className="split-file-dropdown"
                    value={splitFile?.id || ''}
                    onChange={(e) => handleSetSplitActiveFile(e.target.value)}
                    title="Select file to view and edit in right pane"
                  >
                    {state.files.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.id === leftFile?.id ? '(Left Pane)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="split-dropdown-chevron" />
                </div>
                <span className="split-pane-tag">Pane 2</span>

                {/* PDF Switcher Button */}
                <button
                  type="button"
                  className="btn-split-header-tab"
                  onClick={() => handleSetSplitPaneType('pdf')}
                  title="Open or Upload a PDF in this split pane"
                >
                  <FileText size={12} />
                  <span>PDF Viewer</span>
                </button>
              </div>

              <div className="split-header-right">
                <button
                  type="button"
                  className={`btn-split-run ${isSplitRunning ? 'running' : ''}`}
                  onClick={handleRunSplitCode}
                  disabled={isSplitRunning}
                  title={`Run ${splitFile?.name} in Terminal 2`}
                >
                  {isSplitRunning ? (
                    <div className="spinner-split-run" />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                  <span>Run File 2</span>
                </button>

                {isFullScreen && (
                  <button
                    type="button"
                    className="btn-split-exit-fullscreen"
                    onClick={() => dispatch({ type: 'SET_FOCUS_MODE', payload: false })}
                    title="Exit Full Screen Mode (Esc / F11)"
                  >
                    <Minimize2 size={12} />
                    <span>Exit Full Screen</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-split-close"
                  onClick={() => handleToggleSplitView(false)}
                  title="Close Split View"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Right Pane Editor Body */}
            <div
              className="split-pane-top"
              style={{
                height: `${rightEditorHeight}%`,
              }}
            >
              <Editor
                height="100%"
                language={splitLang?.monacoLanguage || 'plaintext'}
                value={splitFile?.content || ''}
                theme={activeMonacoTheme}
                options={{
                  fontSize: state.config?.fontSize || 15,
                  tabSize: state.config?.tabSize || 2,
                  wordWrap: state.config?.wordWrap ? 'on' : 'off',
                  minimap: { enabled: state.config?.minimap ?? false },
                  lineNumbers: state.config?.lineNumbers ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                  fontLigatures: true,
                  padding: { top: 10, bottom: 10 },
                }}
                onChange={(val) => {
                  if (splitFile) {
                    handleSplitCodeChange(splitFile.id, val || '');
                  }
                }}
              />
            </div>

            {!rightTerminalHidden && (
              <div
                className={`split-pane-v-resizer ${isDraggingRightV ? 'dragging' : ''}`}
                onPointerDown={handleRightVPointerDown}
                onDoubleClick={() => setRightVPercent(50)}
                title="Drag to resize Editor 2 and Terminal 2 • Double click to center 50/50"
              >
                <div className="v-resizer-line" />
              </div>
            )}

            {/* Right Pane Terminal 2 */}
            {rightTerminalHidden ? (
              <div className="split-collapsed-terminal-bar">
                <button
                  type="button"
                  className="btn-split-restore-term"
                  onClick={() => setRightTerminalHidden(false)}
                  title="Restore Terminal 2"
                >
                  <ChevronUp size={12} />
                  <span>Show Terminal 2</span>
                </button>
              </div>
            ) : (
              <div
                className="split-pane-bottom"
                style={{
                  height: `${rightTermHeight}%`,
                }}
              >
                <OutputPanel
                  isSplitTerminal={true}
                  overrideFile={splitFile}
                  overrideState={state.splitExecution}
                  onRun={handleRunSplitCode}
                  terminalTitle="Terminal 2:"
                  onToggleHide={() => setRightTerminalHidden(true)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
