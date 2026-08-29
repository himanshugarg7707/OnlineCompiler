import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { Terminal, Keyboard, BrainCircuit, Sparkles, Database, TerminalSquare, Globe, Minus, ChevronDown } from 'lucide-react';
import DatabasePanel from './DatabasePanel';
import WebPreviewPanel from './WebPreviewPanel';
import './OutputPanel.css';

const TABS = [
  { id: 'output', label: 'Output', icon: Terminal },
  { id: 'web', label: 'Web Preview', icon: Globe },
  { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
  { id: 'database', label: 'Database Explorer', icon: Database },
  { id: 'input', label: 'Input', icon: Keyboard },
  { id: 'explanation', label: 'AI Explanation', icon: BrainCircuit },
];

// ─── Virtual Terminal Engine ─────────────────────────────────────────────
function createTerminalEngine(getFiles, getFolders, addFile, addFolder, deleteFile, deleteFolder, renameFile, selectFile) {
  let cwd = '/';
  const history = [
    { type: 'welcome', text: '🖥️  Full Code Terminal — Type "help" for available commands' },
  ];

  // Resolve a path relative to cwd
  const resolvePath = (input) => {
    if (!input || input === '.') return cwd;
    if (input === '/') return '/';
    if (input === '..') {
      if (cwd === '/') return '/';
      const parts = cwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    if (input.startsWith('/')) return input;
    // Relative path
    const base = cwd === '/' ? '' : cwd;
    return base + '/' + input;
  };

  // Convert internal file name to absolute virtual path
  const fileToPath = (fileName) => {
    if (fileName.includes('/')) return '/' + fileName;
    return '/' + fileName;
  };

  // Convert absolute virtual path to internal file name
  const pathToFile = (absPath) => {
    return absPath.startsWith('/') ? absPath.slice(1) : absPath;
  };

  const getDisplayCwd = () => {
    return cwd === '/' ? '~' : '~' + cwd;
  };

  const executeCommand = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    history.push({ type: 'cmd', text: trimmed, cwd: getDisplayCwd() });

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const files = getFiles();
    const folders = getFolders();

    switch (cmd) {
      case 'help': {
        const helpLines = [
          'Available commands:',
          '  ls [path]          — List files and folders',
          '  cd <path>          — Change directory (cd .., cd /, cd folder)',
          '  pwd                — Print current directory',
          '  mkdir <name>       — Create a new folder',
          '  touch <name>       — Create a new empty file',
          '  cat <file>         — Display file contents',
          '  echo <text>        — Print text to terminal',
          '  rm <file>          — Delete a file',
          '  mv <old> <new>     — Rename a file',
          '  cp <src> <dest>    — Copy a file',
          '  tree               — Show workspace tree structure',
          '  clear              — Clear terminal history',
          '  date               — Show current date and time',
          '  whoami             — Show user info',
          '  open <file>        — Open file in editor',
          '',
          'Tip: Paths are relative to current directory.',
        ];
        helpLines.forEach((line) => history.push({ type: 'info', text: line }));
        break;
      }

      case 'clear':
        history.length = 0;
        break;

      case 'pwd':
        history.push({ type: 'output', text: cwd });
        break;

      case 'whoami':
        history.push({ type: 'output', text: 'developer@fullcode' });
        break;

      case 'date':
        history.push({ type: 'output', text: new Date().toString() });
        break;

      case 'echo':
        history.push({ type: 'output', text: args.join(' ') });
        break;

      case 'cd': {
        if (args.length === 0 || args[0] === '~') {
          cwd = '/';
          break;
        }
        const target = resolvePath(args[0]);
        if (target === '/') {
          cwd = '/';
          break;
        }
        // Check if the target is a valid folder
        const targetFolder = pathToFile(target);
        const folderExists = folders.includes(targetFolder) ||
          files.some((f) => f.name.startsWith(targetFolder + '/'));
        if (folderExists) {
          cwd = target;
        } else {
          history.push({ type: 'error', text: `cd: no such directory: ${args[0]}` });
        }
        break;
      }

      case 'ls': {
        const targetDir = args.length > 0 ? resolvePath(args[0]) : cwd;
        const prefix = targetDir === '/' ? '' : pathToFile(targetDir) + '/';

        // Find folders at this level
        const childFolders = new Set();
        const childFiles = [];

        files.forEach((f) => {
          const fpath = f.name;
          if (prefix && !fpath.startsWith(prefix)) return;
          if (!prefix && fpath.includes('/')) {
            // Root level — show top-level folders
            childFolders.add(fpath.split('/')[0]);
            return;
          }
          if (!prefix && !fpath.includes('/')) {
            childFiles.push(fpath);
            return;
          }
          // Inside prefix
          const relative = fpath.slice(prefix.length);
          if (relative.includes('/')) {
            childFolders.add(relative.split('/')[0]);
          } else {
            childFiles.push(relative);
          }
        });

        // Also include explicitly created folders
        folders.forEach((f) => {
          if (prefix) {
            if (f.startsWith(prefix)) {
              const relative = f.slice(prefix.length);
              if (!relative.includes('/')) childFolders.add(relative);
            }
          } else {
            if (!f.includes('/')) childFolders.add(f);
          }
        });

        if (childFolders.size === 0 && childFiles.length === 0) {
          history.push({ type: 'info', text: '(empty directory)' });
        } else {
          // Folders first
          Array.from(childFolders).sort().forEach((d) => {
            history.push({ type: 'dir-item', text: d, isDir: true });
          });
          childFiles.sort().forEach((f) => {
            history.push({ type: 'dir-item', text: f, isDir: false });
          });
        }
        break;
      }

      case 'mkdir': {
        if (args.length === 0) {
          history.push({ type: 'error', text: 'mkdir: missing operand' });
          break;
        }
        const folderName = cwd === '/'
          ? args[0]
          : pathToFile(cwd) + '/' + args[0];
        // Only top-level folders supported in the workspace
        const topLevel = folderName.split('/')[0];
        addFolder(topLevel);
        history.push({ type: 'info', text: `Created folder: ${args[0]}/` });
        break;
      }

      case 'touch': {
        if (args.length === 0) {
          history.push({ type: 'error', text: 'touch: missing operand' });
          break;
        }
        const fileName = cwd === '/'
          ? args[0]
          : pathToFile(cwd) + '/' + args[0];
        addFile(fileName, '');
        history.push({ type: 'info', text: `Created file: ${args[0]}` });
        break;
      }

      case 'cat': {
        if (args.length === 0) {
          history.push({ type: 'error', text: 'cat: missing operand' });
          break;
        }
        const lookupName = cwd === '/'
          ? args[0]
          : pathToFile(cwd) + '/' + args[0];
        const file = files.find((f) => f.name === lookupName || f.name === args[0]);
        if (file) {
          if (file.content) {
            file.content.split('\n').forEach((line) => {
              history.push({ type: 'output', text: line });
            });
          } else {
            history.push({ type: 'info', text: '(empty file)' });
          }
        } else {
          history.push({ type: 'error', text: `cat: ${args[0]}: No such file` });
        }
        break;
      }

      case 'open': {
        if (args.length === 0) {
          history.push({ type: 'error', text: 'open: missing operand' });
          break;
        }
        const openName = cwd === '/'
          ? args[0]
          : pathToFile(cwd) + '/' + args[0];
        const openFile = files.find((f) => f.name === openName || f.name === args[0]);
        if (openFile) {
          selectFile(openFile.id);
          history.push({ type: 'info', text: `Opened ${args[0]} in editor` });
        } else {
          history.push({ type: 'error', text: `open: ${args[0]}: No such file` });
        }
        break;
      }

      case 'rm': {
        if (args.length === 0) {
          history.push({ type: 'error', text: 'rm: missing operand' });
          break;
        }
        const rmName = cwd === '/'
          ? args[0]
          : pathToFile(cwd) + '/' + args[0];

        // Check for -r / -rf flag for folders
        if (args[0] === '-r' || args[0] === '-rf') {
          const folderTarget = args[1];
          if (!folderTarget) {
            history.push({ type: 'error', text: 'rm: missing folder name' });
            break;
          }
          const fullFolder = cwd === '/' ? folderTarget : pathToFile(cwd) + '/' + folderTarget;
          if (folders.includes(fullFolder) || folders.includes(folderTarget)) {
            deleteFolder(fullFolder.split('/')[0]);
            history.push({ type: 'info', text: `Removed folder: ${folderTarget}/` });
          } else {
            history.push({ type: 'error', text: `rm: ${folderTarget}: No such directory` });
          }
          break;
        }

        const rmFile = files.find((f) => f.name === rmName || f.name === args[0]);
        if (rmFile) {
          deleteFile(rmFile.id);
          history.push({ type: 'info', text: `Removed: ${args[0]}` });
        } else {
          history.push({ type: 'error', text: `rm: ${args[0]}: No such file` });
        }
        break;
      }

      case 'mv': {
        if (args.length < 2) {
          history.push({ type: 'error', text: 'mv: missing operand (usage: mv <old> <new>)' });
          break;
        }
        const mvOld = cwd === '/' ? args[0] : pathToFile(cwd) + '/' + args[0];
        const mvNew = cwd === '/' ? args[1] : pathToFile(cwd) + '/' + args[1];
        const mvFile = files.find((f) => f.name === mvOld || f.name === args[0]);
        if (mvFile) {
          renameFile(mvFile.id, mvNew);
          history.push({ type: 'info', text: `Renamed ${args[0]} → ${args[1]}` });
        } else {
          history.push({ type: 'error', text: `mv: ${args[0]}: No such file` });
        }
        break;
      }

      case 'cp': {
        if (args.length < 2) {
          history.push({ type: 'error', text: 'cp: missing operand (usage: cp <src> <dest>)' });
          break;
        }
        const cpSrc = cwd === '/' ? args[0] : pathToFile(cwd) + '/' + args[0];
        const srcFile = files.find((f) => f.name === cpSrc || f.name === args[0]);
        if (srcFile) {
          const destName = cwd === '/' ? args[1] : pathToFile(cwd) + '/' + args[1];
          addFile(destName, srcFile.content);
          history.push({ type: 'info', text: `Copied ${args[0]} → ${args[1]}` });
        } else {
          history.push({ type: 'error', text: `cp: ${args[0]}: No such file` });
        }
        break;
      }

      case 'tree': {
        history.push({ type: 'output', text: '.' });
        const allFolderNames = [...new Set([
          ...folders,
          ...files.filter((f) => f.name.includes('/')).map((f) => f.name.split('/')[0]),
        ])].sort();

        allFolderNames.forEach((folder, fi) => {
          const isLastFolder = fi === allFolderNames.length - 1 && files.filter((f) => !f.name.includes('/')).length === 0;
          const fPrefix = isLastFolder ? '└── ' : '├── ';
          history.push({ type: 'dir-item', text: fPrefix + '📁 ' + folder + '/', isDir: true });

          const folderFiles = files.filter((f) => f.name.startsWith(folder + '/'));
          folderFiles.forEach((f, i) => {
            const short = f.name.slice(folder.length + 1);
            const childPrefix = isLastFolder ? '    ' : '│   ';
            const connector = i === folderFiles.length - 1 ? '└── ' : '├── ';
            history.push({ type: 'dir-item', text: childPrefix + connector + short, isDir: false });
          });
        });

        // Root files
        const rootFiles = files.filter((f) => !f.name.includes('/'));
        rootFiles.forEach((f, i) => {
          const connector = i === rootFiles.length - 1 ? '└── ' : '├── ';
          history.push({ type: 'dir-item', text: connector + f.name, isDir: false });
        });

        const totalFiles = files.length;
        const totalDirs = allFolderNames.length;
        history.push({ type: 'info', text: `\n${totalDirs} directories, ${totalFiles} files` });
        break;
      }

      default:
        history.push({ type: 'error', text: `command not found: ${cmd}` });
        history.push({ type: 'info', text: 'Type "help" for available commands' });
    }

    return [...history];
  };

  return {
    history,
    getDisplayCwd,
    executeCommand,
  };
}

// ─── Terminal Tab Component ──────────────────────────────────────────────
function TerminalTab() {
  const {
    state,
    handleAddFile,
    handleAddFolder,
    handleCloseFile,
    handleDeleteFolder,
    handleRenameFile,
    handleSelectFile,
  } = useApp();

  const { files, folders } = state;

  const [terminalHistory, setTerminalHistory] = useState([]);
  const [cmdInput, setCmdInput] = useState('');
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const [cmdHistoryList, setCmdHistoryList] = useState([]);

  const historyEndRef = useRef(null);
  const inputRef = useRef(null);
  const engineRef = useRef(null);

  // Initialize engine
  if (!engineRef.current) {
    engineRef.current = createTerminalEngine(
      () => files,
      () => folders,
      handleAddFile,
      handleAddFolder,
      handleCloseFile,
      handleDeleteFolder,
      handleRenameFile,
      handleSelectFile,
    );
    setTerminalHistory([...engineRef.current.history]);
  }

  // Keep engine refs up to date with latest files/folders
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current = createTerminalEngine(
        () => files,
        () => folders,
        handleAddFile,
        handleAddFolder,
        handleCloseFile,
        handleDeleteFolder,
        handleRenameFile,
        handleSelectFile,
      );
      // Preserve existing history
      const existingHistory = terminalHistory;
      engineRef.current.history.length = 0;
      existingHistory.forEach((h) => engineRef.current.history.push(h));
    }
  }, [files, folders, handleAddFile, handleAddFolder, handleCloseFile, handleDeleteFolder, handleRenameFile, handleSelectFile]);

  // Auto scroll
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = cmdInput.trim();
    if (!trimmed) return;

    setCmdHistoryList((prev) => [...prev, trimmed]);
    setCmdHistoryIdx(-1);

    const engine = engineRef.current;
    const newHistory = engine.executeCommand(trimmed);
    setTerminalHistory([...newHistory]);
    setCmdInput('');
  }, [cmdInput]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistoryList.length > 0) {
        const newIdx = cmdHistoryIdx === -1
          ? cmdHistoryList.length - 1
          : Math.max(0, cmdHistoryIdx - 1);
        setCmdHistoryIdx(newIdx);
        setCmdInput(cmdHistoryList[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIdx >= 0) {
        const newIdx = cmdHistoryIdx + 1;
        if (newIdx >= cmdHistoryList.length) {
          setCmdHistoryIdx(-1);
          setCmdInput('');
        } else {
          setCmdHistoryIdx(newIdx);
          setCmdInput(cmdHistoryList[newIdx]);
        }
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      engineRef.current.history.length = 0;
      setTerminalHistory([]);
    }
  };

  const handleClear = () => {
    engineRef.current.history.length = 0;
    setTerminalHistory([]);
  };

  const displayCwd = engineRef.current?.getDisplayCwd() || '~';

  return (
    <div className="terminal-section" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-history">
        {terminalHistory.map((entry, idx) => {
          if (entry.type === 'welcome') {
            return (
              <div key={idx} className="terminal-line welcome">
                {entry.text}
              </div>
            );
          }
          if (entry.type === 'cmd') {
            return (
              <div key={idx} className="terminal-line cmd">
                <span className="terminal-prompt">{entry.cwd || '~'} $</span>
                {entry.text}
              </div>
            );
          }
          if (entry.type === 'dir-item') {
            return (
              <div key={idx} className="terminal-line dir-item">
                {entry.isDir ? (
                  <><span className="dir-icon">📁</span>{entry.text}</>
                ) : (
                  <><span className="file-icon-term">📄</span>{entry.text}</>
                )}
              </div>
            );
          }
          return (
            <div key={idx} className={`terminal-line ${entry.type}`}>
              {entry.text}
            </div>
          );
        })}
        <div ref={historyEndRef} />
      </div>

      <div className="terminal-input-line">
        <span className="terminal-input-cwd">{displayCwd}</span>
        <span className="terminal-input-prompt">$</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-cmd-input"
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          spellCheck={false}
          autoComplete="off"
        />
        <button className="terminal-clear-btn" onClick={handleClear} title="Clear terminal (Ctrl+L)">
          clear
        </button>
      </div>
    </div>
  );
}

// ─── Main OutputPanel ────────────────────────────────────────────────────
export default function OutputPanel() {
  const [activeTab, setActiveTab] = useState('output');
  const { state, dispatch, handleGenerateInput, handleToggleTerminal } = useApp();
  const {
    output,
    stderr,
    compileOutput,
    executionStatus,
    executionTime,
    executionMemory,
    stdin,
    inputDescription,
    aiExplanation,
    sqlData,
    detectedLanguage,
  } = state;

  const hasError = stderr || compileOutput;
  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';

  // If user selects SQL language, auto-show database tab option
  useEffect(() => {
    if (detectedLanguage?.id === 82 && activeTab === 'input') {
      setActiveTab('output');
    }
  }, [detectedLanguage, activeTab]);

  return (
    <div className="output-panel">
      {/* Tab Bar */}
      <div className="output-tabs">
        <div className="tab-list">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const hasNotification =
              (tab.id === 'explanation' && aiExplanation) ||
              (tab.id === 'output' && (output || hasError)) ||
              (tab.id === 'database' && detectedLanguage?.id === 82);
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {hasNotification && <span className="tab-dot" />}
              </button>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="execution-status">
          {isRunning && (
            <div className="status-running">
              <div className="spinner" />
              <span>
                {executionStatus === 'compiling' ? 'Compiling...' : 'Running...'}
              </span>
            </div>
          )}
          {executionStatus === 'success' && (
            <div className="status-success">
              <span className="status-dot green" />
              <span>Done</span>
              {executionTime && <span className="status-time">{executionTime}s</span>}
              {executionMemory && (
                <span className="status-memory">
                  {(executionMemory / 1024).toFixed(1)}MB
                </span>
              )}
            </div>
          )}
          {executionStatus === 'error' && (
            <div className="status-error">
              <span className="status-dot red" />
              <span>Error</span>
            </div>
          )}

          {/* Hide / Collapse Terminal Button */}
          <button
            className="btn-hide-terminal"
            onClick={handleToggleTerminal}
            title="Hide Terminal & Output Panel"
          >
            <ChevronDown size={14} />
            <span>Hide</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="output-content">
        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="output-view">
            {isRunning ? (
              <div className="output-placeholder running">
                <div className="loading-animation">
                  <div className="loading-bar" />
                  <div className="loading-bar" />
                  <div className="loading-bar" />
                </div>
                <span>
                  {executionStatus === 'compiling'
                    ? '⚙️ Compiling your code...'
                    : '🚀 Executing...'}
                </span>
              </div>
            ) : output || hasError ? (
              <div className="output-results-wrapper">
                {/* If SQL table data returned, show visual table grid */}
                {sqlData && sqlData.rows && sqlData.rows.length > 0 && (
                  <div className="sql-table-preview animate-slide-up">
                    <div className="sql-table-header">
                      <span>📊 Result Set ({sqlData.rowCount} rows in {sqlData.executionTimeMs}ms)</span>
                    </div>
                    <div className="sql-table-scroll">
                      <table className="db-data-table">
                        <thead>
                          <tr>
                            {sqlData.columns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlData.rows.map((row, idx) => (
                            <tr key={idx}>
                              {sqlData.columns.map((col) => (
                                <td key={col}>
                                  {row[col] === null ? (
                                    <span className="cell-null">NULL</span>
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <pre className={`output-text ${hasError ? 'error' : 'success'}`}>
                  {hasError && output && output !== '(Program finished with no output)' && (
                    <div className="partial-stdout-before-error">{output}</div>
                  )}
                  {hasError && (
                    <div className="error-output">
                      {((stderr || compileOutput).includes('Exception') ||
                        (stderr || compileOutput).includes('Traceback') ||
                        (stderr || compileOutput).includes('Error:')) && (
                        <div className="exception-header-badge">
                          ⚠️ Runtime Exception / Stacktrace
                        </div>
                      )}
                      {compileOutput || stderr}
                    </div>
                  )}
                  {!hasError && output && <div className="success-output">{output}</div>}
                </pre>
              </div>
            ) : (
              <div className="output-placeholder">
                <Terminal size={40} strokeWidth={1} />
                <span>Click <strong>Run</strong> to see output here</span>
                <span className="placeholder-hint">or press Ctrl+Enter</span>
              </div>
            )}
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && <TerminalTab />}

        {/* Web Sandbox Live Preview Tab */}
        {activeTab === 'web' && <WebPreviewPanel />}

        {/* Database Explorer Tab */}
        {activeTab === 'database' && <DatabasePanel />}

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="input-view">
            <div className="input-header">
              <span className="input-label">Standard Input (stdin)</span>
              <button
                className="btn-auto-input"
                onClick={handleGenerateInput}
              >
                <Sparkles size={14} />
                <span>Auto-Generate Input</span>
              </button>
            </div>
            <textarea
              className="stdin-textarea"
              value={stdin}
              onChange={(e) =>
                dispatch({ type: 'SET_STDIN', payload: e.target.value })
              }
              placeholder={"Enter input values here...\nEach line is a separate input."}
              spellCheck={false}
            />
            {inputDescription && (
              <div className="input-description md-content animate-slide-up">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {inputDescription}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* AI Explanation Tab */}
        {activeTab === 'explanation' && (
          <div className="explanation-view">
            {aiExplanation ? (
              <div className="md-content animate-slide-up">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aiExplanation}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="output-placeholder">
                <BrainCircuit size={40} strokeWidth={1} />
                <span>AI will explain errors in plain English</span>
                <span className="placeholder-hint">
                  Run code with an error to see AI analysis
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
