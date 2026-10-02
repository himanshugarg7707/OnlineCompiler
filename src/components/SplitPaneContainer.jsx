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
  Sparkles,
  Maximize2,
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
  } = useApp();

  const containerRef = useRef(null);
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingLeftV, setIsDraggingLeftV] = useState(false);
  const [isDraggingRightV, setIsDraggingRightV] = useState(false);

  const [leftVPercent, setLeftVPercent] = useState(60);
  const [rightVPercent, setRightVPercent] = useState(60);

  const splitRatio = state.splitRatio ?? 50;
  const isFullScreen = Boolean(state.focusMode);

  // Active files
  const leftFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
  const splitFile = state.files.find((f) => f.id === state.splitActiveFileId) ||
    state.files.find((f) => f.id !== leftFile?.id) ||
    state.files[0];

  const splitLang = resolveLanguage(splitFile?.language, splitFile?.name);
  const activeMonacoTheme = MONACO_THEMES[state.config?.theme] || 'fullcode-dark';

  // Horizontal resizer between Left and Right Panes
  const handleHMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingH(true);
  };

  useEffect(() => {
    if (!isDraggingH) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, Math.round(rawPct)));
      dispatch({ type: 'SET_SPLIT_RATIO', payload: clamped });
    };

    const handleMouseUp = () => {
      setIsDraggingH(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingH, dispatch]);

  // Left vertical resizer (between Left Editor and Terminal 1 in Full Screen)
  const handleLeftVMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingLeftV(true);
  };

  useEffect(() => {
    if (!isDraggingLeftV) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
      setLeftVPercent(Math.max(20, Math.min(85, Math.round(rawPct))));
    };
    const handleMouseUp = () => setIsDraggingLeftV(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeftV]);

  // Right vertical resizer (between Right Editor and Terminal 2 in Full Screen)
  const handleRightVMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingRightV(true);
  };

  useEffect(() => {
    if (!isDraggingRightV) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
      setRightVPercent(Math.max(20, Math.min(85, Math.round(rawPct))));
    };
    const handleMouseUp = () => setIsDraggingRightV(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRightV]);

  const isSplitRunning = state.splitExecution?.executionStatus === 'compiling' || state.splitExecution?.executionStatus === 'running';

  return (
    <div
      ref={containerRef}
      className={`split-pane-container ${isFullScreen ? 'split-fullscreen' : ''} ${
        isDraggingH ? 'resizing-h' : ''
      }`}
    >
      {/* ── LEFT PANE ── */}
      <div className="split-pane split-left-pane" style={{ width: `${splitRatio}%` }}>
        {isFullScreen ? (
          <div className="split-pane-col">
            <div className="split-pane-top" style={{ height: `${leftVPercent}%` }}>
              <CodeEditor />
            </div>

            <div
              className={`split-pane-v-resizer ${isDraggingLeftV ? 'dragging' : ''}`}
              onMouseDown={handleLeftVMouseDown}
              title="Drag to resize Editor 1 and Terminal 1"
            >
              <div className="v-resizer-line" />
            </div>

            <div className="split-pane-bottom" style={{ height: `${100 - leftVPercent}%` }}>
              <OutputPanel
                isSplitTerminal={false}
                terminalTitle="Terminal 1:"
              />
            </div>
          </div>
        ) : (
          <CodeEditor />
        )}
      </div>

      {/* ── VERTICAL RESIZER (Between Left & Right) ── */}
      <div
        className={`split-h-resizer ${isDraggingH ? 'dragging' : ''}`}
        onMouseDown={handleHMouseDown}
        onDoubleClick={() => dispatch({ type: 'SET_SPLIT_RATIO', payload: 50 })}
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

      {/* ── RIGHT PANE ── */}
      <div className="split-pane split-right-pane" style={{ width: `${100 - splitRatio}%` }}>
        {state.splitPaneType === 'pdf' ? (
          <SplitPdfViewer />
        ) : (
          <div className="split-right-code-view">
            {/* Right Pane Navigation Header */}
            <div className="split-right-header">
              <div className="split-right-header-left">
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

              <div className="split-right-header-right">
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

            {/* Right Pane Editor Body (With optional Terminal 2 in Full Screen) */}
            <div className="split-right-body">
              {isFullScreen ? (
                <div className="split-pane-col">
                  <div className="split-pane-top" style={{ height: `${rightVPercent}%` }}>
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

                  <div
                    className={`split-pane-v-resizer ${isDraggingRightV ? 'dragging' : ''}`}
                    onMouseDown={handleRightVMouseDown}
                    title="Drag to resize Editor 2 and Terminal 2"
                  >
                    <div className="v-resizer-line" />
                  </div>

                  <div className="split-pane-bottom" style={{ height: `${100 - rightVPercent}%` }}>
                    <OutputPanel
                      isSplitTerminal={true}
                      overrideFile={splitFile}
                      overrideState={state.splitExecution}
                      onRun={handleRunSplitCode}
                      terminalTitle="Terminal 2:"
                    />
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
