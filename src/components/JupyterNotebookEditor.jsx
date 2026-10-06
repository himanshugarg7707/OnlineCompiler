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
  prepareJavaNotebookCellCode,
  prepareCppCellCode,
  prepareCCellCode,
} from '../services/languageDetector';
import {
  exportNotebookAsSplitZip,
  extractNotebookToWorkspace,
} from '../services/notebookExportService';
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
function parseNotebook(rawJson, fileName = '', wsFiles = [], fileLanguage = null) {
  const fLower = (fileName || '').toLowerCase();
  const getFallback = () => {
    // 1. Check fileLanguage
    const nbLang = fileLanguage?.notebookLanguage || fileLanguage?.kernel;
    if (nbLang === 'java') return JSON.parse(createDefaultNotebookJson('java'));
    if (nbLang === 'cpp') return JSON.parse(createDefaultNotebookJson('cpp'));
    if (nbLang === 'javascript' || nbLang === 'js') return JSON.parse(createDefaultNotebookJson('javascript'));
    if (nbLang === 'python') return JSON.parse(createDefaultNotebookJson('python'));

    // 2. Check filename
    if (fLower.includes('java')) return JSON.parse(createDefaultNotebookJson('java'));
    if (fLower.includes('cpp') || fLower.includes('c++')) return JSON.parse(createDefaultNotebookJson('cpp'));
    if (fLower.includes('js') || fLower.includes('javascript')) return JSON.parse(createDefaultNotebookJson('javascript'));
    if (fLower.includes('python') || fLower.includes('py_')) return JSON.parse(createDefaultNotebookJson('python'));

    // 3. Check workspace files
    if (Array.isArray(wsFiles) && wsFiles.length > 0) {
      if (wsFiles.some((f) => f.name?.endsWith('.java') || f.name?.includes('Main.java') || f.language?.id === 62 || f.language?.monacoLanguage === 'java')) {
        return JSON.parse(createDefaultNotebookJson('java'));
      }
      if (wsFiles.some((f) => f.name?.endsWith('.cpp') || f.name?.endsWith('.cc') || f.language?.id === 54 || f.language?.monacoLanguage === 'cpp')) {
        return JSON.parse(createDefaultNotebookJson('cpp'));
      }
      if (wsFiles.some((f) => (f.name?.endsWith('.js') && !f.name?.endsWith('.ipynb')) || f.language?.id === 63 || f.language?.monacoLanguage === 'javascript')) {
        return JSON.parse(createDefaultNotebookJson('javascript'));
      }
    }

    return JSON.parse(createDefaultNotebookJson('python'));
  };

  try {
    if (!rawJson || !rawJson.trim()) {
      return getFallback();
    }
    const data = JSON.parse(rawJson);
    if (data && Array.isArray(data.cells) && data.cells.length > 0) {
      // Preserve user notebook cells and data integrity completely
      return data;
    }
    return getFallback();
  } catch (err) {
    console.warn('Invalid .ipynb JSON, resetting to default template:', err);
    return getFallback();
  }
}

export default function JupyterNotebookEditor({ file, onContentChange }) {
  const { state: appState, dispatch, handleRenameFile, handleAddFile, showToast } = useApp();
  const [notebook, setNotebook] = useState(() =>
    parseNotebook(file?.content, file?.name, appState?.files, file?.language)
  );
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const [editingMarkdownIndex, setEditingMarkdownIndex] = useState(null);
  const [runningCellIndex, setRunningCellIndex] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [viewRawJson, setViewRawJson] = useState(false);
  const [executionCounter, setExecutionCounter] = useState(1);
  const [hoveredDividerIndex, setHoveredDividerIndex] = useState(null);
  const [toolbarMinimized, setToolbarMinimized] = useState(() => {
    try {
      return localStorage.getItem('fullcode_notebook_toolbar_minimized') === 'true';
    } catch {
      return false;
    }
  });
  const isInternalUpdateRef = useRef(false);

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
    const fName = (file?.name || '').toLowerCase();
    if (fName.includes('python') || fName.includes('py_')) return 'python';
    if (fName.includes('java')) return 'java';
    if (fName.includes('cpp') || fName.includes('c++')) return 'cpp';
    if (fName.includes('javascript') || fName.includes('js')) return 'javascript';

    // 1. Scan cell code patterns (Ground Truth of user code in notebook)
    const allCellCode = (notebook?.cells || [])
      .filter((c) => c.cell_type === 'code')
      .map(getCellSource)
      .join('\n');

    const hasJavaCells =
      /System\.(out|err|in)\b|(?:public|private|protected)?\s*(?:class|interface|enum|record)\s+\w+|public\s+static\s+void\s+main|Scanner\s+\w+|import\s+java\.|List<\w+>|ArrayList<\w+>|Map<\w+|HashMap<\w+|Set<\w+|\/\/.*(?:Java|JShell)/i.test(
        allCellCode
      );

    if (hasJavaCells) {
      return 'java';
    }

    const hasCppCells = /#include\s*<iostream>|std::cout|using\s+namespace\s+std|printf\s*\(/.test(allCellCode);
    if (hasCppCells) {
      return 'cpp';
    }

    const hasJsCells = /console\.log|document\.|window\.|const\s+\w+\s*=\s*require/.test(allCellCode);
    if (hasJsCells) {
      return 'javascript';
    }

    // 2. Metadata kernelspec fallback (ground truth saved in the .ipynb)
    const metaLang =
      notebook?.metadata?.kernelspec?.language ||
      notebook?.metadata?.language_info?.name;
    if (metaLang) {
      const l = String(metaLang).toLowerCase();
      if (l.includes('java')) return 'java';
      if (l.includes('cpp') || l.includes('c++')) return 'cpp';
      if (l.includes('javascript') || l === 'js') return 'javascript';
      if (l.includes('python')) return 'python';
    }

    // 3. Explicit file.language notebookLanguage or kernel tag
    if (file?.language?.notebookLanguage && file.language.notebookLanguage !== 'python') {
      return file.language.notebookLanguage;
    }
    if (file?.language?.kernel && file.language.kernel !== 'python') {
      return file.language.kernel;
    }

    // 4. Check workspace files if notebook has no explicit language specified
    const wsFiles = appState?.files || [];
    const wsHasJava = wsFiles.some(
      (f) => f.name?.endsWith('.java') || f.name?.includes('Main.java') || f.language?.id === 62 || f.language?.monacoLanguage === 'java'
    );
    const wsHasCpp = wsFiles.some(
      (f) => f.name?.endsWith('.cpp') || f.name?.endsWith('.cc') || f.language?.id === 54 || f.language?.monacoLanguage === 'cpp'
    );
    const wsHasJs = wsFiles.some(
      (f) => (f.name?.endsWith('.js') && !f.name?.endsWith('.ipynb')) || f.language?.id === 63 || f.language?.monacoLanguage === 'javascript'
    );

    if (wsHasJava) {
      return 'java';
    }
    if (wsHasCpp) {
      return 'cpp';
    }
    if (wsHasJs) {
      return 'javascript';
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

    if (dispatch && file?.id) {
      dispatch({
        type: 'UPDATE_FILE_LANGUAGE',
        payload: {
          fileId: file.id,
          language: {
            id: 710,
            name: `${targetConfig.name} Notebook`,
            notebookLanguage: newLangKey,
            kernel: newLangKey,
            monacoLanguage: 'ipynb',
            extension: 'ipynb',
            icon: targetConfig.id === 'java' ? '☕' : targetConfig.id === 'cpp' ? '⚡' : targetConfig.id === 'javascript' ? '🟨' : '🐍',
          },
        },
      });
    }

    showToast?.(`Switched to ${targetConfig.name} (${targetConfig.engine}) 🪐`);
  };

  // Sync external file content updates into state
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const parsed = parseNotebook(file?.content, file?.name, appState?.files, file?.language);
    setNotebook(parsed);
  }, [file?.id, file?.content, file?.name, file?.language]);

  // Keep file.language aligned with active notebookLanguage in AppContext
  useEffect(() => {
    if (!file?.id || !dispatch) return;
    const currentLangKey = file.language?.notebookLanguage || file.language?.kernel;
    if (currentLangKey !== notebookLanguage) {
      const targetConfig = KERNEL_CONFIGS[notebookLanguage] || KERNEL_CONFIGS.python;
      dispatch({
        type: 'UPDATE_FILE_LANGUAGE',
        payload: {
          fileId: file.id,
          language: {
            id: 710,
            name: `${targetConfig.name} Notebook`,
            notebookLanguage: notebookLanguage,
            kernel: notebookLanguage,
            monacoLanguage: 'ipynb',
            extension: 'ipynb',
            icon: notebookLanguage === 'java' ? '☕' : notebookLanguage === 'cpp' ? '⚡' : notebookLanguage === 'javascript' ? '🟨' : '🐍',
          },
        },
      });
    }
  }, [notebookLanguage, file?.id, file?.language, dispatch]);

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
      // Guardrail: If cell contains Java syntax or workspace is Java (and file is not explicitly python), strictly execute with Java OpenJDK
      const isJavaExecution =
        notebookLanguage === 'java' ||
        (notebookLanguage !== 'cpp' &&
          notebookLanguage !== 'javascript' &&
          (/System\.(out|err|in)\b|(?:public|private|protected)?\s*(?:class|interface|enum|record)\s+\w+|public\s+static\s+void\s+main|Scanner\s+\w+|import\s+java\.|List<\w+>|ArrayList<\w+>|Map<\w+|HashMap<\w+|Set<\w+|\/\/.*(?:Java|JShell)/i.test(code) ||
           appState?.files?.some((f) => f.name?.endsWith('.java') || f.language?.id === 62)));

      const effectiveStdin = appState?.stdin || '';

      if (isJavaExecution) {
        const prepared = prepareJavaNotebookCellCode(notebook.cells, index);
        result = await executeCode(prepared, 62, effectiveStdin);
        // Fallback: If execution failed with variable redeclaration conflict in main, try active cell
        if (!result.success && result.error && /already defined in method main|is already defined/i.test(result.error)) {
          const fallbackPrepared = prepareJavaCellCode(code);
          result = await executeCode(fallbackPrepared, 62, effectiveStdin);
        }
      } else if (notebookLanguage === 'python') {
        result = await executePythonInBrowser(code, effectiveStdin);
      } else if (notebookLanguage === 'cpp') {
        const prepared = prepareCppCellCode(code);
        result = await executeCode(prepared, 54, effectiveStdin);
      } else if (notebookLanguage === 'javascript') {
        result = await executeCode(code, 63, effectiveStdin);
      } else if (notebookLanguage === 'c') {
        const prepared = prepareCCellCode(code);
        result = await executeCode(prepared, 50, effectiveStdin);
      } else {
        result = await executePythonInBrowser(code, effectiveStdin);
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
        let errMessage = result.error;
        if (/NoSuchElementException/i.test(errMessage) && /Scanner|System\.in/i.test(code)) {
          errMessage += '\n\n💡 Tip: Your code is waiting for user input via Scanner/System.in. Please enter your input in the "Input" tab below before running the cell.';
        }
        outputs.push({
          output_type: 'error',
          ename: 'ExecutionError',
          evalue: errMessage,
          traceback: [errMessage],
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

  // Listen for Header Run button event & notebook shortcut
  useEffect(() => {
    let lastRunTime = 0;
    const handleRunActiveCellEvent = () => {
      const now = Date.now();
      if (now - lastRunTime < 350) return;
      lastRunTime = now;

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

      // Stop execution key shortcuts from bubbling to global window listener
      editor.onKeyDown((e) => {
        if (
          (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) &&
          (e.keyCode === monaco.KeyCode.Enter || e.code === 'Enter')
        ) {
          e.stopPropagation();
        }
      });

      // Make Tab indent instead of accepting suggestions when suggest widget is visible
      editor.addCommand(monaco.KeyCode.Tab, () => {
        editor.trigger('keyboard', 'tab', {});
      }, 'suggestWidgetVisible');

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

  // Dropdown state for export options
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    }
    if (exportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [exportDropdownOpen]);

  // Export raw .ipynb Jupyter file
  const exportRawIpynb = () => {
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
    showToast?.('Exported as Jupyter Notebook (.ipynb) 🪐');
  };

  // Export as multi-file split folder packaged in a ZIP (e.g. java/java_01.java, etc.)
  const handleExportSplitZip = async () => {
    try {
      showToast?.('Packaging notebook into language folder ZIP... 📦');
      const baseName = file?.name || `${notebookLanguage}_notebook`;
      const res = await exportNotebookAsSplitZip(notebook, baseName, notebookLanguage);
      showToast?.(`Downloaded ${res.zipFileName} (${res.fileCount} files) 🚀`);
    } catch (err) {
      console.error('Failed to export split ZIP:', err);
      showToast?.(`Export failed: ${err.message}`);
    }
  };

  // Extract split files directly into current browser workspace
  const handleExtractToWorkspace = () => {
    try {
      const res = extractNotebookToWorkspace(notebook, notebookLanguage, handleAddFile, showToast);
      setExportDropdownOpen(false);
    } catch (err) {
      console.error('Failed to extract to workspace:', err);
      showToast?.(`Extract failed: ${err.message}`);
    }
  };

  // Default export action respecting settings (config.notebookExportMode)
  const exportNotebook = () => {
    const mode = config?.notebookExportMode || 'split';
    if (mode === 'ipynb') {
      exportRawIpynb();
    } else {
      handleExportSplitZip();
    }
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
      {(toolbarMinimized || appState?.focusMode) ? (
        <div className="jupyter-header-toolbar jupyter-toolbar-minimized">
          <div className="jupyter-toolbar-min-left">
            <span className="min-kernel-pill">
              {notebookLanguage === 'java' ? '☕' : notebookLanguage === 'cpp' ? '⚡' : notebookLanguage === 'javascript' ? '🟨' : '🪐'} {kernelConfig.name}
            </span>
            <span className="min-cells-badge">{notebook.cells.length} cells</span>
          </div>

          <div className="jupyter-toolbar-min-actions">
            <button
              className="jupyter-min-btn jupyter-min-btn-primary"
              onClick={() => addCell('code', activeCellIndex)}
              title="Add Code Cell (Alt+Enter)"
            >
              <Plus size={12} />
              <span>Code</span>
            </button>

            <button
              className="jupyter-min-btn"
              onClick={() => addCell('markdown', activeCellIndex)}
              title="Add Markdown Cell"
            >
              <Plus size={12} />
              <span>MD</span>
            </button>

            <button
              className={`jupyter-min-btn jupyter-min-run ${isRunningAll ? 'running' : ''}`}
              onClick={runAllCells}
              disabled={isRunningAll || runningCellIndex !== null}
              title="Run All Cells"
            >
              {isRunningAll ? <Loader2 size={11} className="spin" /> : <Play size={11} fill="currentColor" />}
              <span>Run All</span>
            </button>

            <button
              className="jupyter-min-btn"
              onClick={clearAllOutputs}
              title="Restart & Clear"
            >
              <RotateCcw size={11} />
            </button>

            {!appState?.focusMode && (
              <button
                className="jupyter-min-btn-expand"
                onClick={() => {
                  setToolbarMinimized(false);
                  try {
                    localStorage.setItem('fullcode_notebook_toolbar_minimized', 'false');
                  } catch {}
                }}
                title="Expand full notebook toolbar"
              >
                <ChevronDown size={13} />
                <span>Expand</span>
              </button>
            )}
          </div>
        </div>
      ) : (
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

          {/* Export Button Group with Dropdown */}
          <div className="jupyter-export-group" ref={exportDropdownRef}>
            <button
              className="jupyter-btn-action jupyter-export-main-btn"
              onClick={exportNotebook}
              title={
                config?.notebookExportMode === 'ipynb'
                  ? 'Export as .ipynb Jupyter notebook'
                  : `Export and split into ${notebookLanguage} folder (.zip)`
              }
            >
              <Download size={14} />
              <span>Export {config?.notebookExportMode === 'ipynb' ? '(.ipynb)' : '(.zip)'}</span>
            </button>
            <button
              className={`jupyter-btn-action jupyter-export-arrow-btn ${exportDropdownOpen ? 'active' : ''}`}
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              title="Choose export format or workspace extract"
              aria-expanded={exportDropdownOpen}
            >
              <ChevronDown size={13} />
            </button>

            {exportDropdownOpen && (
              <div className="jupyter-export-dropdown">
                <div className="jupyter-export-dropdown-header">
                  <span>Export Notebook Options</span>
                </div>
                <button
                  className={`jupyter-export-option ${config?.notebookExportMode !== 'ipynb' ? 'recommended' : ''}`}
                  onClick={() => {
                    handleExportSplitZip();
                    setExportDropdownOpen(false);
                  }}
                >
                  <div className="option-icon">📦</div>
                  <div className="option-text">
                    <div className="option-title">
                      Split into Folder (.zip)
                      {config?.notebookExportMode !== 'ipynb' && <span className="option-badge">Default</span>}
                    </div>
                    <div className="option-desc">
                      Splits cells into <code>{notebookLanguage}/{notebookLanguage}_01</code>, <code>02</code> etc.
                    </div>
                  </div>
                </button>

                <button
                  className={`jupyter-export-option ${config?.notebookExportMode === 'ipynb' ? 'recommended' : ''}`}
                  onClick={() => {
                    exportRawIpynb();
                    setExportDropdownOpen(false);
                  }}
                >
                  <div className="option-icon">🪐</div>
                  <div className="option-text">
                    <div className="option-title">
                      Single .ipynb File
                      {config?.notebookExportMode === 'ipynb' && <span className="option-badge">Default</span>}
                    </div>
                    <div className="option-desc">
                      Standard JSON Jupyter notebook file
                    </div>
                  </div>
                </button>

                <div className="jupyter-export-dropdown-divider" />

                <button
                  className="jupyter-export-option"
                  onClick={handleExtractToWorkspace}
                >
                  <div className="option-icon">📁</div>
                  <div className="option-text">
                    <div className="option-title">Extract to Workspace</div>
                    <div className="option-desc">
                      Creates <code>{notebookLanguage}/</code> files directly in browser file tree
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            className={`jupyter-btn-action ${viewRawJson ? 'active' : ''}`}
            onClick={() => setViewRawJson(!viewRawJson)}
            title="Toggle between Notebook UI and raw .ipynb JSON"
          >
            <FileCode2 size={14} />
            <span>{viewRawJson ? 'Notebook View' : 'Raw JSON'}</span>
          </button>

          <button
            className="jupyter-btn-action jupyter-btn-collapse"
            onClick={() => {
              setToolbarMinimized(true);
              try {
                localStorage.setItem('fullcode_notebook_toolbar_minimized', 'true');
              } catch {}
            }}
            title="Minimize notebook toolbar to maximize code cells"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
    )}

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
