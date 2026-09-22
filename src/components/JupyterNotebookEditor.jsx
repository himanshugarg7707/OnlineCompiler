import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';
import { useApp } from '../context/AppContext';
import {
  getMonacoThemeName,
  registerCustomThemes,
  getMonacoEditorOptions,
} from '../services/monacoThemeService';
import { registerSnippets } from '../services/snippets';
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
  Check,
  Eye,
  Edit3,
  Loader2,
  Terminal,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { JupyterIcon } from './LanguageIcon';
import { executePythonInBrowser } from '../services/pythonRunner';
import { executeCode } from '../services/judge0Service';
import {
  createDefaultNotebookJson,
  prepareJavaCellCode,
  prepareCppCellCode,
  prepareCCellCode,
} from '../services/languageDetector';
import './JupyterNotebookEditor.css';

export const KERNEL_CONFIGS = {
  java: {
    id: 'java',
    name: 'Java',
    languageId: 62,
    monacoLanguage: 'java',
    engine: 'OpenJDK / JShell Engine',
    packages: ['java.util.*', 'java.io.*', 'java.stream.*', 'Collections', 'Math', 'OOP Architecture'],
    icon: '☕',
    accentColor: '#f59e0b',
    sampleSnippet: `// Interactive Java cell\nimport java.util.*;\n\nList<String> list = Arrays.asList("Java", "Jupyter", "Interactive");\nSystem.out.println("☕ Java cell execution:");\nlist.forEach(item -> System.out.println("  ➜ " + item));\n`,
  },
  python: {
    id: 'python',
    name: 'Python 3',
    languageId: 71,
    monacoLanguage: 'python',
    engine: 'Pyodide WebAssembly',
    packages: ['NumPy', 'Pandas', 'Matplotlib', 'SciPy', 'Folium'],
    icon: '🐍',
    accentColor: '#38bdf8',
    sampleSnippet: `# Interactive Python cell\nimport numpy as np\nprint("NumPy version:", np.__version__)\n`,
  },
  cpp: {
    id: 'cpp',
    name: 'C++20',
    languageId: 54,
    monacoLanguage: 'cpp',
    engine: 'GCC / Clang C++20',
    packages: ['iostream', 'vector', 'algorithm', 'numeric', 'cmath'],
    icon: '⚡',
    accentColor: '#818cf8',
    sampleSnippet: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "⚡ C++ Interactive Notebook" << endl;\n    return 0;\n}\n`,
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    languageId: 63,
    monacoLanguage: 'javascript',
    engine: 'Browser V8 Engine',
    packages: ['ES6+', 'JSON', 'DOM API', 'Fetch', 'Math'],
    icon: '🟨',
    accentColor: '#eab308',
    sampleSnippet: `// Interactive JavaScript cell\nconsole.log("🟨 JavaScript cell running!");\n`,
  },
  c: {
    id: 'c',
    name: 'C17',
    languageId: 50,
    monacoLanguage: 'c',
    engine: 'GCC Compiler',
    packages: ['stdio.h', 'stdlib.h', 'string.h', 'math.h'],
    icon: '🔧',
    accentColor: '#3b82f6',
    sampleSnippet: `#include <stdio.h>\nint main() {\n    printf("🔧 C cell running!\\n");\n    return 0;\n}\n`,
  },
};

/**
 * Normalizes cell source (handles both string and array of strings)
 */
function getCellSource(cell) {
  if (Array.isArray(cell.source)) {
    return cell.source.join('');
  }
  return cell.source || '';
}

/**
 * Parses an .ipynb JSON string safely into cells and metadata
 */
function parseNotebook(rawJson, fileName = '') {
  const fLower = (fileName || '').toLowerCase();
  const getFallback = () => {
    if (fLower.includes('java')) return JSON.parse(createDefaultNotebookJson('java'));
    if (fLower.includes('cpp') || fLower.includes('c++')) return JSON.parse(createDefaultNotebookJson('cpp'));
    if (fLower.includes('js') || fLower.includes('javascript')) return JSON.parse(createDefaultNotebookJson('javascript'));
    return JSON.parse(createDefaultNotebookJson('python'));
  };

  try {
    if (!rawJson || !rawJson.trim()) {
      return getFallback();
    }
    const data = JSON.parse(rawJson);
    if (data && Array.isArray(data.cells)) {
      // Auto-correct metadata if filename says Java or cells contain Java
      const isJava =
        fLower.includes('java') ||
        data.cells.some((c) => {
          const src = getCellSource(c);
          return /System\.(out|err|in)\.|public\s+(class|interface|enum|record)\b|public\s+static\s+void\s+main|Scanner\s+\w+\s*=|import\s+java\./.test(
            src
          );
        });

      if (isJava) {
        const kLang = data.metadata?.kernelspec?.language;
        if (!kLang || kLang.toLowerCase() === 'python' || kLang.toLowerCase() === 'python3') {
          data.metadata = {
            ...data.metadata,
            language_info: { name: 'java', version: '17' },
            kernelspec: {
              display_name: 'Java (OpenJDK / JShell Engine)',
              language: 'java',
              name: 'java',
            },
          };
        }
      }
      return data;
    }
    return getFallback();
  } catch (err) {
    console.warn('Invalid .ipynb JSON, resetting to default template:', err);
    return getFallback();
  }
}

export default function JupyterNotebookEditor({ file, onContentChange }) {
  const [notebook, setNotebook] = useState(() => parseNotebook(file?.content, file?.name));
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const [editingMarkdownIndex, setEditingMarkdownIndex] = useState(null);
  const [runningCellIndex, setRunningCellIndex] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [viewRawJson, setViewRawJson] = useState(false);
  const [executionCounter, setExecutionCounter] = useState(1);
  const [hoveredDividerIndex, setHoveredDividerIndex] = useState(null);
  const isInternalUpdateRef = useRef(false);

  const { state: appState, handleRenameFile, showToast } = useApp();
  const config = appState?.config;
  const activeMonacoTheme = getMonacoThemeName(config?.theme);

  const cellEditorsRef = useRef({});
  const snippetsRegisteredRef = useRef(false);
  const [cellHeights, setCellHeights] = useState({});

  const cellEditorOptions = useMemo(() => getMonacoEditorOptions(config, true), [config]);

  // Synchronize Monaco theme when config.theme changes
  useEffect(() => {
    const monaco = window.monaco;
    if (monaco) {
      registerCustomThemes(monaco, config);
      monaco.editor.setTheme(activeMonacoTheme);
    }
  }, [config?.theme, config?.customPalette, activeMonacoTheme]);

  // Derive active notebook language with strict priority
  const notebookLanguage = (function () {
    // 1. Explicit metadata kernelspec / language_info takes top priority
    const metaLang =
      notebook?.metadata?.kernelspec?.language ||
      notebook?.metadata?.language_info?.name;
    if (metaLang) {
      const l = String(metaLang).toLowerCase();
      if (l.includes('java')) return 'java';
      if (l.includes('python') || l === 'py' || l === 'python3') return 'python';
      if (l.includes('cpp') || l.includes('c++')) return 'cpp';
      if (l.includes('javascript') || l === 'js') return 'javascript';
      if (l === 'c') return 'c';
    }

    // 2. Explicit filename
    const fName = (file?.name || '').toLowerCase();
    if (fName.includes('java')) return 'java';
    if (fName.includes('cpp') || fName.includes('c++')) return 'cpp';
    if (fName.includes('javascript') || fName.includes('js')) return 'javascript';
    if (fName.includes('python') || fName.includes('py_')) return 'python';

    // 3. Scan cell code patterns
    const allCellCode = (notebook?.cells || [])
      .filter((c) => c.cell_type === 'code')
      .map(getCellSource)
      .join('\n');

    if (
      /System\.(out|err|in)\.|public\s+(class|interface|enum|record)\b|public\s+static\s+void\s+main|Scanner\s+\w+\s*=|import\s+java\./.test(
        allCellCode
      )
    ) {
      return 'java';
    }
    if (/#include\s*<iostream>|std::cout|using\s+namespace\s+std/.test(allCellCode)) {
      return 'cpp';
    }

    return 'python';
  })();

  const kernelConfig = KERNEL_CONFIGS[notebookLanguage] || KERNEL_CONFIGS.python;

  const [kernelDropdownOpen, setKernelDropdownOpen] = useState(false);
  const kernelDropdownRef = useRef(null);

  useEffect(() => {
    function handleKernelClickOutside(e) {
      if (kernelDropdownRef.current && !kernelDropdownRef.current.contains(e.target)) {
        setKernelDropdownOpen(false);
      }
    }
    if (kernelDropdownOpen) {
      document.addEventListener('mousedown', handleKernelClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleKernelClickOutside);
    };
  }, [kernelDropdownOpen]);

  // Switch Kernel / Language: Loads clean starter cells for target language
  const handleSwitchKernel = (newLangKey) => {
    const targetConfig = KERNEL_CONFIGS[newLangKey];
    if (!targetConfig) return;

    // Load fresh starter cells & metadata for target language
    let targetNb;
    try {
      targetNb = JSON.parse(createDefaultNotebookJson(newLangKey));
    } catch {
      targetNb = {
        cells: [
          {
            cell_type: 'code',
            execution_count: null,
            metadata: { language: targetConfig.id },
            outputs: [],
            source: targetConfig.sampleSnippet,
          },
        ],
        metadata: {
          kernelspec: {
            display_name: `${targetConfig.name} (${targetConfig.engine})`,
            language: targetConfig.id,
            name: targetConfig.id,
          },
          language_info: {
            name: targetConfig.id,
            version: targetConfig.id === 'java' ? '17' : targetConfig.id === 'cpp' ? '20' : '3.11',
          },
        },
        nbformat: 4,
        nbformat_minor: 5,
      };
    }

    const updatedNotebook = {
      ...targetNb,
      metadata: {
        ...targetNb.metadata,
        kernelspec: {
          display_name: `${targetConfig.name} (${targetConfig.engine})`,
          language: targetConfig.id,
          name: targetConfig.id,
        },
        language_info: {
          name: targetConfig.id,
          version: targetConfig.id === 'java' ? '17' : targetConfig.id === 'cpp' ? '20' : '3.11',
        },
      },
    };

    updateNotebook(updatedNotebook);
    setKernelDropdownOpen(false);

    // Sync file name if it reflects language (e.g. notebook.ipynb, python_notebook.ipynb -> java_notebook.ipynb)
    const currentName = file?.name || '';
    let newName = currentName;
    if (newLangKey === 'java' && (currentName.includes('python') || currentName.includes('py_') || currentName === 'notebook.ipynb')) {
      newName = 'java_notebook.ipynb';
    } else if (newLangKey === 'python' && currentName.includes('java')) {
      newName = 'notebook.ipynb';
    } else if (newLangKey === 'cpp' && (currentName.includes('java') || currentName.includes('python') || currentName === 'notebook.ipynb')) {
      newName = 'cpp_notebook.ipynb';
    } else if (newLangKey === 'javascript' && (currentName.includes('java') || currentName.includes('python') || currentName === 'notebook.ipynb')) {
      newName = 'js_notebook.ipynb';
    }

    if (newName !== currentName && handleRenameFile && file?.id) {
      handleRenameFile(file.id, newName);
    }

    showToast?.(`Switched to ${targetConfig.name} (${targetConfig.engine}) 🪐`);
  };

  // Sync external file content updates into state
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    setNotebook(parseNotebook(file?.content, file?.name));
  }, [file?.id, file?.content, file?.name]);

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
  const updateCell = useCallback(
    (index, updates) => {
      setNotebook((prev) => {
        const updatedCells = prev.cells.map((cell, idx) => {
          if (idx === index) {
            return { ...cell, ...updates };
          }
          return cell;
        });
        const nextNb = { ...prev, cells: updatedCells };
        isInternalUpdateRef.current = true;
        onContentChange?.(JSON.stringify(nextNb, null, 2));
        return nextNb;
      });
    },
    [onContentChange]
  );

  // Add new cell
  const addCell = (type = 'code', afterIndex = null) => {
    const isJava = notebookLanguage === 'java';
    const sampleSnippet = isJava
      ? '// Java Interactive Cell\nSystem.out.println("☕ Java cell execution:");\n'
      : kernelConfig.sampleSnippet || '// Write code here\n';

    const newCell =
      type === 'code'
        ? {
            cell_type: 'code',
            execution_count: null,
            metadata: { language: notebookLanguage },
            outputs: [],
            source: sampleSnippet,
          }
        : {
            cell_type: 'markdown',
            metadata: {},
            source: '### New Section\nDouble-click to edit this markdown documentation.',
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

  // Toggle cell type (code <-> markdown)
  const toggleCellType = (index) => {
    const current = notebook.cells[index];
    if (!current) return;
    const newType = current.cell_type === 'code' ? 'markdown' : 'code';
    const updatedCell = {
      ...current,
      cell_type: newType,
      outputs: newType === 'code' ? [] : undefined,
      execution_count: newType === 'code' ? null : undefined,
    };
    const updatedCells = [...notebook.cells];
    updatedCells[index] = updatedCell;
    updateNotebook({ ...notebook, cells: updatedCells });
    if (newType === 'markdown') {
      setEditingMarkdownIndex(index);
    }
  };

  // Move cell position
  const moveCell = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= notebook.cells.length) return;
    const updatedCells = [...notebook.cells];
    const [moved] = updatedCells.splice(index, 1);
    updatedCells.splice(targetIdx, 0, moved);
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(targetIdx);
  };

  // Duplicate cell
  const duplicateCell = (index) => {
    const original = notebook.cells[index];
    if (!original) return;
    const clone = {
      ...original,
      outputs: original.cell_type === 'code' ? [] : undefined,
      execution_count: original.cell_type === 'code' ? null : undefined,
    };
    const updatedCells = [...notebook.cells];
    updatedCells.splice(index + 1, 0, clone);
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(index + 1);
  };

  // Delete cell
  const deleteCell = (index) => {
    if (notebook.cells.length <= 1) {
      // Keep at least one cell
      updateNotebook({
        ...notebook,
        cells: [
          {
            cell_type: 'code',
            execution_count: null,
            metadata: { language: kernelConfig.id },
            outputs: [],
            source: kernelConfig.sampleSnippet || '// Write code here\n',
          },
        ],
      });
      setActiveCellIndex(0);
      return;
    }
    const updatedCells = notebook.cells.filter((_, idx) => idx !== index);
    updateNotebook({ ...notebook, cells: updatedCells });
    setActiveCellIndex(Math.max(0, index - 1));
  };

  // Clear all cell outputs
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
    setExecutionCounter(1);
    updateNotebook({ ...notebook, cells: updatedCells });
  };

  // Execute a single code cell
  const runCell = useCallback(async (index) => {
    const cell = notebook.cells[index];
    if (!cell || cell.cell_type !== 'code') return;

    // Immediately dismiss any open suggestion dropdown on this cell
    const cellEditor = cellEditorsRef.current[index];
    if (cellEditor) {
      try {
        cellEditor.trigger('keyboard', 'hideSuggestWidget', {});
      } catch (_) {}
    }

    setRunningCellIndex(index);
    const code = getCellSource(cell);
    const currentCount = executionCounter;
    setExecutionCounter((prev) => prev + 1);

    try {
      let result;
      if (notebookLanguage === 'python') {
        result = await executePythonInBrowser(code);
      } else if (notebookLanguage === 'java') {
        const prepared = prepareJavaCellCode(code);
        result = await executeCode(prepared, 62);
      } else if (notebookLanguage === 'cpp') {
        const prepared = prepareCppCellCode(code);
        result = await executeCode(prepared, 54);
      } else if (notebookLanguage === 'javascript') {
        result = await executeCode(code, 63);
      } else if (notebookLanguage === 'c') {
        const prepared = prepareCCellCode(code);
        result = await executeCode(prepared, 50);
      } else {
        result = await executePythonInBrowser(code);
      }

      const outputs = [];
      if (result.output && result.output !== '(Program finished with no output)') {
        outputs.push({
          output_type: 'stream',
          name: 'stdout',
          text: result.output,
        });
      }
      if (result.warning && !result.error) {
        outputs.push({
          output_type: 'stream',
          name: 'stderr',
          text: result.warning,
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
        hasError: Boolean(result.error),
      });

      // Synchronize output with Output / Terminal panel
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('jupyter-cell-output', {
            detail: {
              output: result.output || '',
              error: result.error || null,
              time: result.time || '0.000',
              memory: result.memory || 0,
              success: !result.error,
            },
          })
        );
      }
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
        hasError: true,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('jupyter-cell-output', {
            detail: {
              output: '',
              error: err.message || 'Kernel error',
              time: '0.000',
              memory: 0,
              success: false,
            },
          })
        );
      }
    } finally {
      setRunningCellIndex(null);
    }
  }, [notebook.cells, executionCounter, notebookLanguage, updateCell]);

  // Listen for Header Run button event
  useEffect(() => {
    const handleRunActiveCellEvent = () => {
      if (activeCellIndex !== null && notebook.cells[activeCellIndex]?.cell_type === 'code') {
        runCell(activeCellIndex);
      } else {
        const firstCodeIdx = notebook.cells.findIndex((c) => c.cell_type === 'code');
        if (firstCodeIdx !== -1) {
          setActiveCellIndex(firstCodeIdx);
          runCell(firstCodeIdx);
        }
      }
    };

    window.addEventListener('jupyter-run-active-cell', handleRunActiveCellEvent);
    return () => {
      window.removeEventListener('jupyter-run-active-cell', handleRunActiveCellEvent);
    };
  }, [activeCellIndex, notebook.cells, runCell]);

  // Mount handler for Monaco Editor in each notebook code cell
  const handleCellMount = useCallback(
    (idx, editor, monaco) => {
      cellEditorsRef.current[idx] = editor;
      window.monaco = monaco;

      if (!snippetsRegisteredRef.current) {
        registerSnippets(monaco);
        snippetsRegisteredRef.current = true;
      }

      registerCustomThemes(monaco, config);
      monaco.editor.setTheme(activeMonacoTheme);

      // Auto-resize Monaco editor to match content height smoothly
      const updateHeight = () => {
        const contentHeight = Math.max(68, editor.getContentHeight());
        setCellHeights((prev) => {
          if (prev[idx] === contentHeight) return prev;
          return { ...prev, [idx]: contentHeight };
        });
      };

      editor.onDidContentSizeChange(updateHeight);
      updateHeight();

      // Keyboard shortcut: Shift+Enter -> Run Cell & advance
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        try {
          editor.trigger('keyboard', 'hideSuggestWidget', {});
        } catch (_) {}
        runCell(idx);
        if (idx + 1 < notebook.cells.length) {
          setActiveCellIndex(idx + 1);
          setTimeout(() => {
            cellEditorsRef.current[idx + 1]?.focus();
          }, 50);
        } else {
          addCell('code', idx);
        }
      });

      // Keyboard shortcut: Ctrl+Enter or Cmd+Enter -> Run Cell in place
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        try {
          editor.trigger('keyboard', 'hideSuggestWidget', {});
        } catch (_) {}
        runCell(idx);
      });

      // Keyboard shortcut: Alt+Enter -> Run Cell and insert new code cell below
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, () => {
        try {
          editor.trigger('keyboard', 'hideSuggestWidget', {});
        } catch (_) {}
        runCell(idx);
        addCell('code', idx);
      });

      // Track active cell on focus
      editor.onDidFocusEditorText(() => {
        setActiveCellIndex(idx);
      });
    },
    [config, activeMonacoTheme, notebook.cells.length, runCell]
  );

  // Run all cells sequentially
  const runAllCells = async () => {
    setIsRunningAll(true);
    for (let i = 0; i < notebook.cells.length; i++) {
      if (notebook.cells[i].cell_type === 'code') {
        setActiveCellIndex(i);
        await runCell(i);
      }
    }
    setIsRunningAll(false);
  };

  // Export notebook file (.ipynb)
  const exportNotebook = () => {
    const jsonString = JSON.stringify(notebook, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name?.endsWith('.ipynb') ? file.name : `${file?.name || 'notebook'}.ipynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick Markdown formatting actions
  const applyMarkdownFormat = (index, prefix, suffix = '') => {
    const cell = notebook.cells[index];
    if (!cell) return;
    const current = getCellSource(cell);
    const updated = `${current}\n${prefix}Markdown Text${suffix}`;
    updateCell(index, { source: updated });
  };

  return (
    <div className={`jupyter-container kernel-${notebookLanguage}`}>
      {/* Notebook Clean & Minimal Header Toolbar */}
      <div className="jupyter-header-toolbar">
        <div className="jupyter-toolbar-left">
          <div className="jupyter-kernel-compact-select" ref={kernelDropdownRef}>
            <button
              type="button"
              className="jupyter-kernel-compact-btn"
              onClick={() => setKernelDropdownOpen((prev) => !prev)}
              title="Switch Notebook Kernel / Language"
            >
              <span className="kernel-compact-icon">
                {notebookLanguage === 'java' ? (
                  '☕'
                ) : notebookLanguage === 'cpp' ? (
                  '⚡'
                ) : notebookLanguage === 'javascript' ? (
                  '🟨'
                ) : (
                  <JupyterIcon size={14} />
                )}
              </span>
              <span className="kernel-compact-name">{kernelConfig.name}</span>
              <ChevronDown size={11} className={`kernel-compact-arrow ${kernelDropdownOpen ? 'open' : ''}`} />
            </button>

            {kernelDropdownOpen && (
              <div className="jupyter-kernel-dropdown">
                <div className="dropdown-label">Select Notebook Kernel</div>
                {Object.values(KERNEL_CONFIGS).map((cfg) => (
                  <button
                    key={cfg.id}
                    type="button"
                    className={`kernel-option-item ${notebookLanguage === cfg.id ? 'selected' : ''}`}
                    onClick={() => handleSwitchKernel(cfg.id)}
                  >
                    <span className="kernel-opt-icon">{cfg.icon}</span>
                    <div className="kernel-opt-info">
                      <span className="kernel-opt-name">{cfg.name}</span>
                      <span className="kernel-opt-engine">{cfg.engine}</span>
                    </div>
                    {notebookLanguage === cfg.id && <Check size={14} className="kernel-opt-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="jupyter-toolbar-actions">
          <button
            className="jupyter-btn-action jupyter-btn-primary"
            onClick={() => addCell('code', activeCellIndex)}
            title={`Add new ${kernelConfig.name} code cell (Alt+Enter)`}
          >
            <Plus size={14} />
            <Code2 size={14} />
            <span>Code</span>
          </button>

          <button
            className="jupyter-btn-action"
            onClick={() => addCell('markdown', activeCellIndex)}
            title="Add new Markdown documentation cell"
          >
            <Plus size={14} />
            <FileText size={14} />
            <span>Markdown</span>
          </button>

          <div className="jupyter-action-divider" />

          <button
            className={`jupyter-btn-action jupyter-btn-run-all ${isRunningAll ? 'running' : ''}`}
            onClick={runAllCells}
            disabled={isRunningAll || runningCellIndex !== null}
            title="Run all code cells in sequence"
          >
            {isRunningAll ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            <span>{isRunningAll ? 'Running...' : 'Run All'}</span>
          </button>

          <button
            className="jupyter-btn-action"
            onClick={clearAllOutputs}
            title="Clear all execution outputs and plots"
          >
            <RotateCcw size={14} />
            <span>Restart & Clear</span>
          </button>

          <div className="jupyter-action-divider" />

          <button
            className="jupyter-btn-action"
            onClick={exportNotebook}
            title="Export as standard .ipynb Jupyter notebook file"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <button
            className={`jupyter-btn-action ${viewRawJson ? 'active' : ''}`}
            onClick={() => setViewRawJson(!viewRawJson)}
            title="Toggle between Notebook UI and raw .ipynb JSON"
          >
            <FileCode2 size={14} />
            <span>{viewRawJson ? 'Notebook View' : 'Raw JSON'}</span>
          </button>
        </div>
      </div>

      {/* Raw JSON View */}
      {viewRawJson ? (
        <div className="jupyter-raw-json">
          <div className="jupyter-raw-header">
            <span className="raw-header-title">Raw .ipynb JSON Structure</span>
            <span className="raw-header-hint">Changes automatically sync with the visual notebook</span>
          </div>
          <textarea
            value={JSON.stringify(notebook, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateNotebook(parsed);
              } catch (err) {
                // Ignore parse errors while user is actively typing
              }
            }}
            className="jupyter-raw-textarea"
            spellCheck="false"
          />
        </div>
      ) : (
        /* Visual Interactive Notebook Canvas */
        <div className="jupyter-canvas-container">
          <div className="jupyter-cells-wrapper">
            {/* Top inserter divider */}
            <div
              className={`jupyter-insert-divider top ${
                hoveredDividerIndex === -1 ? 'is-hovered' : ''
              }`}
              onMouseEnter={() => setHoveredDividerIndex(-1)}
              onMouseLeave={() => setHoveredDividerIndex(null)}
            >
              <div className="insert-divider-line" />
              <div className="insert-divider-buttons">
                <button
                  className="btn-divider-add"
                  onClick={() => addCell('code', -1)}
                  title="Insert code cell at top"
                >
                  <Plus size={12} />
                  <span>Code</span>
                </button>
                <button
                  className="btn-divider-add"
                  onClick={() => addCell('markdown', -1)}
                  title="Insert markdown cell at top"
                >
                  <Plus size={12} />
                  <span>Markdown</span>
                </button>
              </div>
            </div>

            {notebook.cells.map((cell, idx) => {
              const isCode = cell.cell_type === 'code';
              const isActive = activeCellIndex === idx;
              const isRunning = runningCellIndex === idx;
              const isEditingMd = editingMarkdownIndex === idx;
              const source = getCellSource(cell);
              const lines = source.split('\n');
              const lineCount = Math.max(1, lines.length);

              return (
                <div key={idx} className="jupyter-cell-block">
                  <div
                    className={`jupyter-cell ${isCode ? 'cell-code' : 'cell-markdown'} ${
                      isActive ? 'is-active' : ''
                    } ${cell.hasError ? 'has-error' : ''}`}
                    onClick={() => setActiveCellIndex(idx)}
                  >
                    {/* Left Gutter: Prompt & Run Action */}
                    <div className="jupyter-cell-gutter">
                      {isCode ? (
                        <button
                          className={`jupyter-run-cell-btn ${isRunning ? 'running' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            runCell(idx);
                          }}
                          disabled={isRunning || isRunningAll}
                          title="Run cell (Shift+Enter)"
                        >
                          {isRunning ? (
                            <Loader2 size={13} className="spin" />
                          ) : (
                            <Play size={13} fill="currentColor" />
                          )}
                        </button>
                      ) : (
                        <div className="jupyter-md-gutter-icon" title="Markdown Documentation Cell">
                          <FileText size={14} />
                        </div>
                      )}

                      <span className="jupyter-prompt-badge">
                        {isCode
                          ? isRunning
                            ? '[ * ]'
                            : cell.execution_count !== null && cell.execution_count !== undefined
                            ? `[ ${cell.execution_count} ]`
                            : '[   ]'
                          : ''}
                      </span>
                    </div>

                    {/* Main Cell Body */}
                    <div className="jupyter-cell-main">
                      {/* Floating Cell Actions Toolbar */}
                      <div className="jupyter-cell-actions">
                        <span className={`cell-type-badge ${isCode ? `lang-${notebookLanguage}` : 'lang-markdown'}`}>
                          {isCode
                            ? notebookLanguage === 'java'
                              ? '☕ Java'
                              : notebookLanguage === 'cpp'
                              ? '⚡ C++'
                              : notebookLanguage === 'javascript'
                              ? '🟨 JavaScript'
                              : '🐍 Python 3'
                            : 'Markdown'}
                        </span>

                        <button
                          className="cell-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCellType(idx);
                          }}
                          title={`Convert to ${isCode ? 'Markdown' : 'Code'}`}
                        >
                          {isCode ? <FileText size={13} /> : <Code2 size={13} />}
                        </button>

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

                      {/* Monaco Code Editor with Full Syntax Highlighting & Auto Closing Brackets */}
                      {isCode ? (
                        <div className="jupyter-code-editor-box">
                          <Editor
                            height={
                              cellHeights[idx] ||
                              Math.max(68, ((source || '').split('\n').length) * 20 + 20)
                            }
                            language={
                              notebookLanguage === 'c++'
                                ? 'cpp'
                                : notebookLanguage === 'js'
                                ? 'javascript'
                                : notebookLanguage || 'python'
                            }
                            value={source}
                            theme={activeMonacoTheme}
                            options={cellEditorOptions}
                            onChange={(val) => updateCell(idx, { source: val ?? '' })}
                            onMount={(editor, monaco) => handleCellMount(idx, editor, monaco)}
                            loading={
                              <div className="jupyter-monaco-loading">
                                <Loader2 size={16} className="spin" />
                                <span>Loading Editor...</span>
                              </div>
                            }
                          />
                        </div>
                      ) : (
                        /* Markdown Cell: Rendered View or WYSIWYG Editor */
                        <div className="jupyter-md-box">
                          {isEditingMd ? (
                            <div className="jupyter-md-editor">
                              <div className="jupyter-md-toolbar">
                                <div className="md-format-group">
                                  <button
                                    type="button"
                                    className="md-format-btn"
                                    onClick={() => applyMarkdownFormat(idx, '### ')}
                                    title="Heading"
                                  >
                                    H3
                                  </button>
                                  <button
                                    type="button"
                                    className="md-format-btn"
                                    onClick={() => applyMarkdownFormat(idx, '**', '**')}
                                    title="Bold"
                                  >
                                    B
                                  </button>
                                  <button
                                    type="button"
                                    className="md-format-btn"
                                    onClick={() => applyMarkdownFormat(idx, '*', '*')}
                                    title="Italic"
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    className="md-format-btn"
                                    onClick={() => applyMarkdownFormat(idx, '`', '`')}
                                    title="Code"
                                  >
                                    &lt;/&gt;
                                  </button>
                                  <button
                                    type="button"
                                    className="md-format-btn"
                                    onClick={() => applyMarkdownFormat(idx, '- ')}
                                    title="Bullet List"
                                  >
                                    • List
                                  </button>
                                  <button
                                    type="button"
                                    className="md-format-btn"
                                    onClick={() => applyMarkdownFormat(idx, '- [ ] ')}
                                    title="Task Checklist"
                                  >
                                    ☑ Task
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  className="btn-md-preview"
                                  onClick={() => setEditingMarkdownIndex(null)}
                                  title="Render Markdown Preview (Ctrl+Enter)"
                                >
                                  <Eye size={13} />
                                  <span>Preview</span>
                                </button>
                              </div>

                              <textarea
                                value={source}
                                onChange={(e) => updateCell(idx, { source: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                                    e.preventDefault();
                                    setEditingMarkdownIndex(null);
                                  }
                                }}
                                autoFocus
                                className="jupyter-md-textarea"
                                placeholder="Type Markdown here (Supports GitHub tables, checkboxes, formatting)..."
                                rows={Math.max(4, lineCount)}
                              />
                              <div className="md-editor-footer">
                                <span>Tip: Press Ctrl+Enter or click Preview to exit editor</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="jupyter-md-preview"
                              onDoubleClick={() => setEditingMarkdownIndex(idx)}
                              title="Double-click to edit markdown documentation"
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

                      {/* Code Cell Execution Outputs */}
                      {isCode &&
                        (cell.outputs?.length > 0 || cell.plots?.length > 0 || cell.html) && (
                          <div className="jupyter-cell-output-area">
                            <div className="jupyter-output-meta-bar">
                              <div className="output-meta-left">
                                {cell.hasError ? (
                                  <span className="output-status-pill error">
                                    <AlertCircle size={12} />
                                    <span>Error</span>
                                  </span>
                                ) : (
                                  <span className="output-status-pill success">
                                    <CheckCircle2 size={12} />
                                    <span>Success</span>
                                  </span>
                                )}
                                {cell.execution_time && (
                                  <span className="output-time-badge">
                                    <Clock size={11} />
                                    <span>{cell.execution_time}s</span>
                                  </span>
                                )}
                              </div>

                              <button
                                className="meta-clear-btn"
                                onClick={() =>
                                  updateCell(idx, {
                                    outputs: [],
                                    plots: [],
                                    html: '',
                                    execution_time: null,
                                    hasError: false,
                                  })
                                }
                                title="Clear output for this cell"
                              >
                                Clear
                              </button>
                            </div>

                            {/* Stream Text stdout, warning/stderr, & error */}
                            {cell.outputs?.map((out, outIdx) => {
                              const isErr = out.output_type === 'error';
                              const isWarn = out.output_type === 'stream' && out.name === 'stderr';
                              const text =
                                out.text ||
                                (out.traceback ? out.traceback.join('\n') : out.evalue || '');
                              return (
                                <div
                                  key={outIdx}
                                  className={`jupyter-output-console ${
                                    isErr ? 'is-error' : isWarn ? 'is-warning' : 'is-stdout'
                                  }`}
                                >
                                  <div className="console-indicator">
                                    {isWarn ? <AlertCircle size={12} /> : <Terminal size={12} />}
                                    <span>
                                      {isErr ? 'Error Traceback' : isWarn ? 'Runtime Warning / stderr' : 'stdout'}
                                    </span>
                                  </div>
                                  <pre className="console-text">{text}</pre>
                                </div>
                              );
                            })}

                            {/* Render Matplotlib Figures */}
                            {cell.plots && cell.plots.length > 0 && (
                              <div className="jupyter-plots-container">
                                {cell.plots.map((plotData, plotIdx) => (
                                  <div key={plotIdx} className="jupyter-plot-card">
                                    <div className="plot-card-header">
                                      <div className="plot-title">
                                        <ImageIcon size={13} />
                                        <span>Matplotlib Figure #{plotIdx + 1}</span>
                                      </div>
                                      <a
                                        href={plotData}
                                        download={`plot_cell_${idx + 1}_${plotIdx + 1}.png`}
                                        className="btn-download-plot"
                                        title="Download Plot PNG"
                                      >
                                        <Download size={12} />
                                        <span>Download PNG</span>
                                      </a>
                                    </div>
                                    <div className="plot-image-wrapper">
                                      <img
                                        src={plotData}
                                        alt={`Plot ${plotIdx + 1}`}
                                        className="jupyter-plot-img"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Render Interactive Maps / Folium / HTML */}
                            {cell.html && (
                              <div className="jupyter-html-map-container">
                                <div className="jupyter-map-badge">
                                  <MapPin size={13} />
                                  <span>Interactive Folium / HTML Visualization</span>
                                </div>
                                <iframe
                                  srcDoc={cell.html}
                                  title={`Visualization Cell ${idx + 1}`}
                                  className="jupyter-map-frame"
                                  sandbox="allow-scripts allow-same-origin"
                                />
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Divider inserter between cells */}
                  <div
                    className={`jupyter-insert-divider ${
                      hoveredDividerIndex === idx ? 'is-hovered' : ''
                    }`}
                    onMouseEnter={() => setHoveredDividerIndex(idx)}
                    onMouseLeave={() => setHoveredDividerIndex(null)}
                  >
                    <div className="insert-divider-line" />
                    <div className="insert-divider-buttons">
                      <button
                        className="btn-divider-add"
                        onClick={() => addCell('code', idx)}
                        title="Add code cell below"
                      >
                        <Plus size={12} />
                        <span>Code</span>
                      </button>
                      <button
                        className="btn-divider-add"
                        onClick={() => addCell('markdown', idx)}
                        title="Add markdown cell below"
                      >
                        <Plus size={12} />
                        <span>Markdown</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Quick Action Strip */}
            <div className="jupyter-bottom-actions">
              <button
                className="jupyter-bottom-btn"
                onClick={() => addCell('code')}
                title="Append a new Python code cell at the end"
              >
                <Plus size={14} />
                <Code2 size={14} />
                <span>Add Code Cell</span>
              </button>
              <button
                className="jupyter-bottom-btn"
                onClick={() => addCell('markdown')}
                title="Append a new Markdown cell at the end"
              >
                <Plus size={14} />
                <FileText size={14} />
                <span>Add Markdown Cell</span>
              </button>
            </div>

            {/* Keyboard Shortcuts Helper Footer */}
            <div className="jupyter-shortcuts-hint">
              <span className="shortcut-item">
                <kbd>Shift</kbd> + <kbd>Enter</kbd> Run & Advance
              </span>
              <span className="shortcut-sep">•</span>
              <span className="shortcut-item">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd> Run Cell
              </span>
              <span className="shortcut-sep">•</span>
              <span className="shortcut-item">
                <kbd>Tab</kbd> Indent 4 Spaces
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
