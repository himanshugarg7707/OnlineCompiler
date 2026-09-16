import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  RotateCcw,
  Code2,
  FileText,
  FileCode2,
  Sparkles,
  Check,
  Eye,
  Edit3,
  Loader2,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { executePythonInBrowser } from '../services/pythonRunner';
import { createDefaultNotebookJson } from '../services/languageDetector';
import './JupyterNotebookEditor.css';

/**
 * Parses an .ipynb JSON string safely into cells and metadata
 */
function parseNotebook(rawJson) {
  try {
    if (!rawJson || !rawJson.trim()) {
      return JSON.parse(createDefaultNotebookJson());
    }
    const data = JSON.parse(rawJson);
    if (data && Array.isArray(data.cells)) {
      return data;
    }
    return JSON.parse(createDefaultNotebookJson());
  } catch (err) {
    console.warn('Invalid .ipynb JSON, resetting to default template:', err);
    return JSON.parse(createDefaultNotebookJson());
  }
}

/**
 * Normalizes cell source (handles both string and array of strings)
 */
function getCellSource(cell) {
  if (Array.isArray(cell.source)) {
    return cell.source.join('');
  }
  return cell.source || '';
}

export default function JupyterNotebookEditor({ file, onContentChange }) {
  const [notebook, setNotebook] = useState(() => parseNotebook(file?.content));
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const [editingMarkdownIndex, setEditingMarkdownIndex] = useState(null);
  const [runningCellIndex, setRunningCellIndex] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [viewRawJson, setViewRawJson] = useState(false);
  const [executionCounter, setExecutionCounter] = useState(1);
  const isInternalUpdateRef = useRef(false);

  // Sync external file content updates into state
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    setNotebook(parseNotebook(file?.content));
  }, [file?.id, file?.content]);

  // Propagate changes back to parent file content
  const updateNotebook = useCallback(
    (newNotebook) => {
      setNotebook(newNotebook);
      isInternalUpdateRef.current = true;
      const jsonString = JSON.stringify(newNotebook, null, 2);
      onContentChange?.(jsonString);
    },
    [onContentChange]
  );

  // Update a specific cell
  const updateCell = (index, updates) => {
    const updatedCells = notebook.cells.map((cell, idx) => {
      if (idx === index) {
        return { ...cell, ...updates };
      }
      return cell;
    });
    updateNotebook({ ...notebook, cells: updatedCells });
  };

  // Add new cell
  const addCell = (type = 'code', afterIndex = null) => {
    const newCell =
      type === 'code'
        ? {
            cell_type: 'code',
            execution_count: null,
            metadata: {},
            outputs: [],
            source: '# Enter Python code here\n',
          }
        : {
            cell_type: 'markdown',
            metadata: {},
            source: '### New Section\nDouble-click to edit markdown content.',
          };

    const targetIdx = afterIndex !== null ? afterIndex + 1 : notebook.cells.length;
    const updatedCells = [...notebook.cells];
    updatedCells.splice(targetIdx, 0, newCell);
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(targetIdx);
    if (type === 'markdown') {
      setEditingMarkdownIndex(targetIdx);
    }
  };

  // Delete cell
  const deleteCell = (index) => {
    if (notebook.cells.length <= 1) return; // Keep at least 1 cell
    const updatedCells = notebook.cells.filter((_, idx) => idx !== index);
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(Math.max(0, index - 1));
  };

  // Move cell up/down
  const moveCell = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= notebook.cells.length) return;
    const updatedCells = [...notebook.cells];
    const temp = updatedCells[index];
    updatedCells[index] = updatedCells[targetIdx];
    updatedCells[targetIdx] = temp;
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(targetIdx);
  };

  // Duplicate cell
  const duplicateCell = (index) => {
    const original = notebook.cells[index];
    const clone = JSON.parse(JSON.stringify(original));
    if (clone.cell_type === 'code') {
      clone.execution_count = null;
      clone.outputs = [];
    }
    const updatedCells = [...notebook.cells];
    updatedCells.splice(index + 1, 0, clone);
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(index + 1);
  };

  // Clear all outputs
  const clearAllOutputs = () => {
    const updatedCells = notebook.cells.map((cell) => {
      if (cell.cell_type === 'code') {
        return {
          ...cell,
          execution_count: null,
          outputs: [],
          plots: [],
          html: '',
          execution_time: null,
        };
      }
      return cell;
    });
    updateNotebook({ ...notebook, cells: updatedCells });
  };

  // Execute a single code cell
  const runCell = async (index) => {
    const cell = notebook.cells[index];
    if (!cell || cell.cell_type !== 'code') return;

    setRunningCellIndex(index);
    const code = getCellSource(cell);
    const currentCount = executionCounter;
    setExecutionCounter((prev) => prev + 1);

    try {
      const result = await executePythonInBrowser(code);

      const outputs = [];
      if (result.output && result.output !== '(Program finished with no output)') {
        outputs.push({
          output_type: 'stream',
          name: 'stdout',
          text: result.output,
        });
      }
      if (result.error) {
        outputs.push({
          output_type: 'error',
          ename: 'ExecutionError',
          evalue: result.error,
          traceback: [result.error],
        });
      }

      updateCell(index, {
        execution_count: currentCount,
        outputs,
        plots: result.plots || [],
        html: result.html || '',
        execution_time: result.time,
      });
    } catch (err) {
      updateCell(index, {
        execution_count: currentCount,
        outputs: [
          {
            output_type: 'error',
            ename: 'KernelError',
            evalue: err.message,
            traceback: [err.message],
          },
        ],
        plots: [],
        html: '',
        execution_time: null,
      });
    } finally {
      setRunningCellIndex(null);
    }
  };

  // Run all cells sequentially
  const runAllCells = async () => {
    setIsRunningAll(true);
    for (let i = 0; i < notebook.cells.length; i++) {
      if (notebook.cells[i].cell_type === 'code') {
        await runCell(i);
      }
    }
    setIsRunningAll(false);
  };

  return (
    <div className="jupyter-container">
      {/* Notebook Top Toolbar */}
      <div className="jupyter-header-toolbar">
        <div className="jupyter-kernel-info">
          <span className="jupyter-kernel-indicator pulse" />
          <span className="jupyter-logo">🪐</span>
          <span className="jupyter-kernel-title">Python 3 (Pyodide WebAssembly)</span>
          <span className="jupyter-libs-badge">NumPy • Pandas • Matplotlib • SciPy • Folium</span>
        </div>

        <div className="jupyter-toolbar-actions">
          <button
            className="jupyter-btn primary"
            onClick={() => addCell('code', activeCellIndex)}
            title="Add new Python code cell"
          >
            <Plus size={14} />
            <span>Code</span>
          </button>

          <button
            className="jupyter-btn"
            onClick={() => addCell('markdown', activeCellIndex)}
            title="Add new Markdown documentation cell"
          >
            <Plus size={14} />
            <span>Markdown</span>
          </button>

          <div className="jupyter-divider" />

          <button
            className="jupyter-btn run-all"
            onClick={runAllCells}
            disabled={isRunningAll || runningCellIndex !== null}
            title="Run all code cells in sequence"
          >
            {isRunningAll ? <Loader2 size={14} className="spin" /> : <Play size={14} fill="currentColor" />}
            <span>{isRunningAll ? 'Running All...' : 'Run All'}</span>
          </button>

          <button
            className="jupyter-btn"
            onClick={clearAllOutputs}
            title="Clear all cell outputs"
          >
            <RotateCcw size={14} />
            <span>Clear Outputs</span>
          </button>

          <div className="jupyter-divider" />

          <button
            className={`jupyter-btn ${viewRawJson ? 'active' : ''}`}
            onClick={() => setViewRawJson(!viewRawJson)}
            title="Toggle between Notebook UI and raw .ipynb JSON"
          >
            <FileCode2 size={14} />
            <span>{viewRawJson ? 'Interactive View' : 'Raw JSON'}</span>
          </button>
        </div>
      </div>

      {/* Raw JSON View (if user wants to inspect underlying format) */}
      {viewRawJson ? (
        <div className="jupyter-raw-json">
          <textarea
            value={JSON.stringify(notebook, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateNotebook(parsed);
              } catch (err) {
                // Ignore parse errors while typing
              }
            }}
            className="jupyter-raw-textarea"
            spellCheck="false"
          />
        </div>
      ) : (
        /* Interactive Cells List */
        <div className="jupyter-cells-wrapper">
          {notebook.cells.map((cell, idx) => {
            const isCode = cell.cell_type === 'code';
            const isActive = activeCellIndex === idx;
            const isRunning = runningCellIndex === idx;
            const isEditingMd = editingMarkdownIndex === idx;
            const source = getCellSource(cell);

            return (
              <div
                key={idx}
                className={`jupyter-cell ${isCode ? 'cell-code' : 'cell-markdown'} ${
                  isActive ? 'is-active' : ''
                }`}
                onClick={() => setActiveCellIndex(idx)}
              >
                {/* Cell Left Execution Prompt */}
                <div className="jupyter-cell-left">
                  {isCode ? (
                    <button
                      className={`jupyter-run-cell-btn ${isRunning ? 'running' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        runCell(idx);
                      }}
                      disabled={isRunning || isRunningAll}
                      title="Run this cell (Shift+Enter)"
                    >
                      {isRunning ? (
                        <Loader2 size={13} className="spin" />
                      ) : (
                        <Play size={13} fill="currentColor" />
                      )}
                    </button>
                  ) : (
                    <div className="jupyter-md-icon" title="Markdown Documentation">
                      <FileText size={14} />
                    </div>
                  )}

                  <span className="jupyter-prompt-badge">
                    {isCode
                      ? isRunning
                        ? 'In [*]:'
                        : cell.execution_count
                        ? `In [${cell.execution_count}]:`
                        : 'In [ ]:'
                      : ''}
                  </span>
                </div>

                {/* Cell Main Container */}
                <div className="jupyter-cell-main">
                  {/* Floating Cell Mini-Toolbar */}
                  <div className="jupyter-cell-actions">
                    <button
                      className="cell-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCell(idx, -1);
                      }}
                      disabled={idx === 0}
                      title="Move cell up"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      className="cell-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveCell(idx, 1);
                      }}
                      disabled={idx === notebook.cells.length - 1}
                      title="Move cell down"
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      className="cell-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateCell(idx);
                      }}
                      title="Duplicate cell"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className="cell-action-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCell(idx);
                      }}
                      title="Delete cell"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Cell Content: Code or Markdown */}
                  {isCode ? (
                    <div className="jupyter-code-editor-box">
                      <textarea
                        value={source}
                        onChange={(e) => updateCell(idx, { source: e.target.value })}
                        onKeyDown={(e) => {
                          // Shift + Enter to run cell
                          if (e.key === 'Enter' && e.shiftKey) {
                            e.preventDefault();
                            runCell(idx);
                          }
                          // Tab indentation support
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const target = e.target;
                            const start = target.selectionStart;
                            const end = target.selectionEnd;
                            const val = target.value;
                            const newVal = val.substring(0, start) + '    ' + val.substring(end);
                            updateCell(idx, { source: newVal });
                            setTimeout(() => {
                              target.selectionStart = target.selectionEnd = start + 4;
                            }, 0);
                          }
                        }}
                        className="jupyter-code-textarea"
                        placeholder="Write Python code..."
                        rows={Math.max(2, source.split('\n').length)}
                        spellCheck="false"
                      />
                    </div>
                  ) : (
                    /* Markdown Cell: Rendered view or Editor */
                    <div className="jupyter-md-box">
                      {isEditingMd ? (
                        <div className="jupyter-md-editor">
                          <textarea
                            value={source}
                            onChange={(e) => updateCell(idx, { source: e.target.value })}
                            onBlur={() => setEditingMarkdownIndex(null)}
                            autoFocus
                            className="jupyter-md-textarea"
                            placeholder="Type markdown (headings, bold, lists, code)..."
                            rows={Math.max(3, source.split('\n').length)}
                          />
                          <div className="md-editor-hint">
                            <span>Press click outside or click "Preview" to finish editing.</span>
                            <button
                              className="btn-md-preview"
                              onClick={() => setEditingMarkdownIndex(null)}
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="jupyter-md-preview"
                          onDoubleClick={() => setEditingMarkdownIndex(idx)}
                          title="Double-click to edit markdown"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {source || '*Empty markdown cell. Double click to add notes.*'}
                          </ReactMarkdown>
                          <button
                            className="btn-edit-md-corner"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMarkdownIndex(idx);
                            }}
                            title="Edit Markdown"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cell Output Area (for code cells) */}
                  {isCode && (cell.outputs?.length > 0 || cell.plots?.length > 0 || cell.html) && (
                    <div className="jupyter-cell-output-area">
                      {cell.execution_time && (
                        <div className="jupyter-output-meta">
                          <span className="meta-time">⚡ Executed in {cell.execution_time}s</span>
                          <button
                            className="meta-clear-btn"
                            onClick={() =>
                              updateCell(idx, {
                                outputs: [],
                                plots: [],
                                html: '',
                                execution_time: null,
                              })
                            }
                            title="Clear this output"
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      {/* Text stdout & error */}
                      {cell.outputs?.map((out, outIdx) => {
                        const isErr = out.output_type === 'error';
                        const text =
                          out.text || (out.traceback ? out.traceback.join('\n') : out.evalue || '');
                        return (
                          <pre
                            key={outIdx}
                            className={`jupyter-output-text ${isErr ? 'error' : 'stdout'}`}
                          >
                            {text}
                          </pre>
                        );
                      })}

                      {/* Render Matplotlib Figures */}
                      {cell.plots && cell.plots.length > 0 && (
                        <div className="jupyter-plots-container">
                          {cell.plots.map((plotData, plotIdx) => (
                            <div key={plotIdx} className="jupyter-plot-card">
                              <img
                                src={plotData}
                                alt={`Plot ${plotIdx + 1}`}
                                className="jupyter-plot-img"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Render Interactive Maps / HTML */}
                      {cell.html && (
                        <div className="jupyter-html-map-container">
                          <div className="jupyter-map-badge">🗺️ Interactive Map / Folium View</div>
                          <iframe
                            srcDoc={cell.html}
                            title={`Map Output Cell ${idx + 1}`}
                            className="jupyter-map-frame"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom Add Cell Quick Action Strip */}
          <div className="jupyter-bottom-actions">
            <button
              className="jupyter-bottom-btn"
              onClick={() => addCell('code')}
            >
              <Plus size={14} />
              <span>Add Code Cell</span>
            </button>
            <button
              className="jupyter-bottom-btn"
              onClick={() => addCell('markdown')}
            >
              <Plus size={14} />
              <span>Add Markdown Cell</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
