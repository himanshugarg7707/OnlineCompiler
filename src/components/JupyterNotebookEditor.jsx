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
  Table,
  HelpCircle,
  Sparkles,
  List,
  Variable,
  Folder,
  ChevronsUp,
  ChevronsDown,
  EyeOff,
  RefreshCw,
  Search,
  X,
  PlaySquare,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { JupyterIcon } from './LanguageIcon';
import InteractiveDataTable from './InteractiveDataTable';
import { executePythonInBrowser, restartPythonRuntime } from '../services/pythonRunner';
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
import {
  checkIfCodeReadsInput,
  detectInputPattern,
  getPatternLabel,
  generateSmartInputForCode,
  generateRandomInputForPattern,
} from '../services/testCaseGeneratorService';
import './JupyterNotebookEditor.css';

export const COLAB_SNIPPETS = [
  {
    category: 'Pandas & Data Analysis',
    id: 'pandas-load-csv',
    title: 'Load CSV into DataFrame',
    description: 'Load a CSV dataset and preview the first 5 records with interactive table',
    code: `# Load CSV dataset into Pandas DataFrame
import pandas as pd

df = pd.read_csv('sales_data.csv')
df.head()`,
  },
  {
    category: 'Pandas & Data Analysis',
    id: 'pandas-inspect',
    title: 'Inspect DataFrame Info & Summary',
    description: 'Check shape, column datatypes, non-null counts, and summary statistics',
    code: `# Inspect DataFrame summary
print("Dataset Shape:", df.shape)
print("\\n--- Column Data Types & Non-Null Counts ---")
print(df.info())
print("\\n--- Numerical Summary Statistics ---")
df.describe()`,
  },
  {
    category: 'Pandas & Data Analysis',
    id: 'pandas-filter-query',
    title: 'Filter & Query Records',
    description: 'Filter rows by condition and sort by values',
    code: `# Filter rows where price > 100, sort by revenue descending
filtered_df = df[df['price'] > 100].sort_values(by='revenue', ascending=False)
filtered_df.head(10)`,
  },
  {
    category: 'Pandas & Data Analysis',
    id: 'pandas-groupby',
    title: 'Group By & Aggregations',
    description: 'Group by a categorical column and compute sum, mean, and count',
    code: `# Aggregate revenue and quantity by category
category_stats = df.groupby('category').agg(
    total_revenue=('revenue', 'sum'),
    avg_price=('price', 'mean'),
    total_orders=('quantity', 'sum')
).reset_index()

category_stats.sort_values(by='total_revenue', ascending=False)`,
  },
  {
    category: 'Pandas & Data Analysis',
    id: 'pandas-missing-values',
    title: 'Missing Values Audit',
    description: 'Detect null values and calculate missing percentage per column',
    code: `# Check for missing values in all columns
null_summary = pd.DataFrame({
    'Missing Values': df.isnull().sum(),
    'Percentage (%)': (df.isnull().sum() / len(df)) * 100
})
null_summary`,
  },
  {
    category: 'Data Visualization',
    id: 'viz-bar-chart',
    title: 'Category Revenue Bar Chart',
    description: 'Clean modern bar chart with formatted labels and grid',
    code: `import matplotlib.pyplot as plt

# Calculate category totals
cat_rev = df.groupby('category')['revenue'].sum().sort_values(ascending=False)

plt.figure(figsize=(9, 4.5))
plt.bar(cat_rev.index, cat_rev.values, color='#38bdf8', edgecolor='#0284c7', width=0.55)
plt.title("Total Revenue by Product Category", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Category", fontsize=11)
plt.ylabel("Revenue ($)", fontsize=11)
plt.grid(axis='y', linestyle='--', alpha=0.3)
plt.tight_layout()
plt.show()`,
  },
  {
    category: 'Data Visualization',
    id: 'viz-histogram',
    title: 'Price Distribution Histogram',
    description: 'Distribution histogram with frequency bins and mean line',
    code: `import matplotlib.pyplot as plt

prices = df['price'].dropna()

plt.figure(figsize=(9, 4.5))
plt.hist(prices, bins=12, color='#818cf8', edgecolor='#1e1b4b', alpha=0.85)
plt.axvline(prices.mean(), color='#ef4444', linestyle='dashed', linewidth=1.5, label=f'Mean: \${prices.mean():.2f}')
plt.title("Price Distribution", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Price ($)", fontsize=11)
plt.ylabel("Count", fontsize=11)
plt.legend()
plt.grid(axis='y', linestyle='--', alpha=0.3)
plt.tight_layout()
plt.show()`,
  },
  {
    category: 'Data Visualization',
    id: 'viz-scatter-trend',
    title: 'Scatter Plot with Regression Line',
    description: 'Correlation scatter plot with linear trendline fit',
    code: `import matplotlib.pyplot as plt
import numpy as np

x = df['price'].values
y = df['revenue'].values

plt.figure(figsize=(9, 5))
plt.scatter(x, y, color='#34d399', alpha=0.75, s=60, edgecolors='#065f46')

# Compute trendline
m, b = np.polyfit(x, y, 1)
plt.plot(x, m*x + b, color='#f43f5e', linewidth=2, label=f'Trend (slope={m:.2f})')

plt.title("Price vs Revenue Correlation", fontsize=13, fontweight='bold', pad=12)
plt.xlabel("Price ($)", fontsize=11)
plt.ylabel("Revenue ($)", fontsize=11)
plt.legend()
plt.grid(True, linestyle='--', alpha=0.25)
plt.tight_layout()
plt.show()`,
  },
  {
    category: 'Machine Learning',
    id: 'sklearn-regression',
    title: 'Train-Test Split & Linear Regression',
    description: 'Fit Linear Regression on numerical features and evaluate R² & RMSE',
    code: `from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

# Select features and target
X = df[['price', 'quantity']]
y = df['revenue']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)

preds = model.predict(X_test)
print(f"Model Intercept: {model.intercept_:.2f}")
print(f"Coefficients: {dict(zip(X.columns, model.coef_))}")
print(f"R² Score: {r2_score(y_test, preds):.4f}")
print(f"RMSE: {np.sqrt(mean_squared_error(y_test, preds)):.4f}")`,
  },
  {
    category: 'Machine Learning',
    id: 'sklearn-rf-classification',
    title: 'Random Forest Classifier',
    description: 'Train Random Forest on benchmark data and print accuracy report',
    code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Load dataset
iris = load_iris(as_frame=True)
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.3, random_state=42
)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=iris.target_names))`,
  },
  {
    category: 'Colab Magics',
    id: 'magic-pip',
    title: 'Install Packages (%pip install)',
    description: 'Install Python packages via micropip into the WebAssembly runtime',
    code: `%pip install scikit-learn seaborn`,
  },
  {
    category: 'Colab Magics',
    id: 'magic-ls',
    title: 'List Filesystem Files (!ls)',
    description: 'View virtual files in the runtime filesystem',
    code: `!ls -la`,
  },
  {
    category: 'Colab Magics',
    id: 'magic-time',
    title: 'Benchmark Execution Time (%time)',
    description: 'Time execution of a Python expression',
    code: `%time [x**2 for x in range(1_000_000)]`,
  },
];

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
  const [openInputCellIndices, setOpenInputCellIndices] = useState({});

  // Google Colab Parity Features State
  const [activeColabTab, setActiveColabTab] = useState(null); // 'toc' | 'variables' | 'snippets' | 'files' | null
  const [runtimeVariables, setRuntimeVariables] = useState([]);
  const [isRestartingRuntime, setIsRestartingRuntime] = useState(false);
  const [runtimeMenuOpen, setRuntimeMenuOpen] = useState(false);
  const runtimeMenuRef = useRef(null);
  const [collapsedCodeCells, setCollapsedCodeCells] = useState({});
  const [snippetsSearch, setSnippetsSearch] = useState('');
  const [variablesSearch, setVariablesSearch] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState(null);

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

  useEffect(() => {
    function handleRuntimeClickOutside(e) {
      if (runtimeMenuRef.current && !runtimeMenuRef.current.contains(e.target)) {
        setRuntimeMenuOpen(false);
      }
    }
    if (runtimeMenuOpen) {
      document.addEventListener('mousedown', handleRuntimeClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleRuntimeClickOutside);
    };
  }, [runtimeMenuOpen]);

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

  // Clear all cell outputs & reset variables
  const clearAllOutputs = () => {
    const updatedCells = notebook.cells.map((cell) => {
      if (cell.cell_type === 'code') {
        return {
          ...cell,
          execution_count: null,
          outputs: [],
          plots: [],
          html: '',
          table: null,
          execution_time: null,
          hasError: false,
        };
      }
      return cell;
    });
    setExecutionCounter(1);
    setRuntimeVariables([]);
    updateNotebook({ ...notebook, cells: updatedCells });
  };

  // Google Colab: Run all cells above target index
  const runCellsAbove = async (targetIndex) => {
    for (let i = 0; i < targetIndex; i++) {
      if (notebook.cells[i]?.cell_type === 'code') {
        await runCell(i);
      }
    }
  };

  // Google Colab: Run all cells below target index
  const runCellsBelow = async (targetIndex) => {
    for (let i = targetIndex + 1; i < notebook.cells.length; i++) {
      if (notebook.cells[i]?.cell_type === 'code') {
        await runCell(i);
      }
    }
  };

  // Google Colab: Toggle code cell collapse
  const toggleCodeCollapse = (idx) => {
    setCollapsedCodeCells((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Google Colab: Restart Python runtime and reset memory
  const handleRestartRuntime = async () => {
    setIsRestartingRuntime(true);
    try {
      await restartPythonRuntime();
      setRuntimeVariables([]);
      showToast?.('⚡ Python runtime restarted and memory cleared.');
    } catch (err) {
      showToast?.(`Failed to restart runtime: ${err.message}`, 'error');
    } finally {
      setIsRestartingRuntime(false);
      setRuntimeMenuOpen(false);
    }
  };

  // Google Colab: Table of Contents outline from markdown headers
  const tableOfContents = useMemo(() => {
    const list = [];
    (notebook?.cells || []).forEach((cell, idx) => {
      if (cell.cell_type === 'markdown') {
        const src = getCellSource(cell);
        const lines = src.split('\n');
        for (const line of lines) {
          const match = line.match(/^(#{1,6})\s+(.+)$/);
          if (match) {
            list.push({
              cellIndex: idx,
              level: match[1].length,
              title: match[2].trim(),
            });
          }
        }
      }
    });
    return list;
  }, [notebook?.cells]);

  const scrollToCell = (idx) => {
    setActiveCellIndex(idx);
    const el = document.getElementById(`jupyter-cell-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Google Colab: Workspace Files for file tree drawer
  const workspaceFiles = useMemo(() => {
    const rawFiles = appState?.files || [];
    return rawFiles.filter((f) => f && f.name && !f.name.endsWith('.ipynb'));
  }, [appState?.files]);

  // Insert code snippet into active cell or as a new cell
  const handleInsertSnippet = (snippetCode, asNewCell = false) => {
    if (asNewCell || activeCellIndex === null || activeCellIndex === undefined) {
      addCell('code', activeCellIndex);
      setTimeout(() => {
        const newIdx = (activeCellIndex !== null && activeCellIndex !== undefined) ? activeCellIndex + 1 : notebook.cells.length;
        updateCell(newIdx, { source: snippetCode });
      }, 80);
    } else {
      const currentCell = notebook.cells[activeCellIndex];
      const curSrc = currentCell ? getCellSource(currentCell) : '';
      const newSrc = curSrc.trim() ? `${curSrc}\n\n${snippetCode}` : snippetCode;
      updateCell(activeCellIndex, { source: newSrc });
    }
    showToast?.('📋 Snippet added to notebook!');
  };

  // One-click read CSV / file into active or new cell
  const handleInsertFileRead = (fileName) => {
    let snippet = '';
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv')) {
      snippet = `# Load ${fileName} into Pandas DataFrame\nimport pandas as pd\n\ndf = pd.read_csv('${fileName}')\ndf.head()`;
    } else if (lower.endsWith('.json')) {
      snippet = `# Load ${fileName} into Pandas DataFrame\nimport pandas as pd\n\ndf = pd.read_json('${fileName}')\ndf.head()`;
    } else {
      snippet = `# Read ${fileName}\nwith open('${fileName}', 'r') as f:\n    content = f.read()\nprint(content[:300])`;
    }
    handleInsertSnippet(snippet, false);
  };

  // Toggle Stdin drawer for a specific cell
  const toggleCellInput = useCallback((idx) => {
    setOpenInputCellIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  // Synthesize realistic smart input for a specific cell
  const handleAutoGenerateCellStdin = useCallback(
    (idx) => {
      const c = notebook.cells[idx];
      if (!c) return;
      const sourceCode = getCellSource(c);
      const smartInput = generateSmartInputForCode(sourceCode);
      const finalInput = smartInput || generateRandomInputForPattern('generic', { code: sourceCode });
      updateCell(idx, {
        stdin: finalInput,
        metadata: {
          ...(c.metadata || {}),
          stdin: finalInput,
        },
      });
      setOpenInputCellIndices((prev) => ({ ...prev, [idx]: true }));
      showToast?.('🎲 Auto-generated test input for this cell!');
    },
    [notebook.cells, updateCell, showToast]
  );

  // Apply quick input preset to a cell
  const handleApplyPresetInput = useCallback(
    (idx, presetType) => {
      const c = notebook.cells[idx];
      if (!c) return;
      const sourceCode = getCellSource(c);
      let presetVal = '';
      if (presetType === 'numbers') {
        presetVal = generateRandomInputForPattern('array', { length: 5, min: 10, max: 99, code: sourceCode });
      } else if (presetType === 'strings') {
        presetVal = generateRandomInputForPattern('string_collection', { length: 4 });
      } else if (presetType === 'matrix') {
        presetVal = generateRandomInputForPattern('matrix', { rows: 3, cols: 3 });
      } else if (presetType === 'pairs') {
        presetVal = generateRandomInputForPattern('pairs', { min: 1, max: 100 });
      } else if (presetType === 'single') {
        presetVal = generateRandomInputForPattern('integer', { min: 1, max: 100 });
      } else if (presetType === 'clear') {
        presetVal = '';
      }
      updateCell(idx, {
        stdin: presetVal,
        metadata: {
          ...(c.metadata || {}),
          stdin: presetVal,
        },
      });
      setOpenInputCellIndices((prev) => ({ ...prev, [idx]: true }));
      if (presetType === 'clear') {
        showToast?.('Input cleared');
      } else {
        showToast?.(`Applied ${presetType} preset!`);
      }
    },
    [notebook.cells, updateCell, showToast]
  );

  // Auto-generate inputs for all cells across the notebook
  const handleAutoGenerateAllCellInputs = useCallback(() => {
    let count = 0;
    const newOpenMap = { ...openInputCellIndices };
    const updatedCells = notebook.cells.map((c, i) => {
      if (c.cell_type !== 'code') return c;
      const sourceCode = getCellSource(c);
      if (checkIfCodeReadsInput(sourceCode)) {
        const smartInput = generateSmartInputForCode(sourceCode);
        if (smartInput) {
          count++;
          newOpenMap[i] = true;
          return {
            ...c,
            stdin: smartInput,
            metadata: {
              ...(c.metadata || {}),
              stdin: smartInput,
            },
          };
        }
      }
      return c;
    });

    if (count > 0) {
      setOpenInputCellIndices(newOpenMap);
      updateNotebook({ ...notebook, cells: updatedCells });
      showToast?.(`✨ Auto-generated smart inputs for ${count} code cell${count > 1 ? 's' : ''}!`);
    } else {
      showToast?.('No cells detected that read standard input (Scanner, input(), cin, etc.)');
    }
  }, [notebook, openInputCellIndices, updateNotebook, showToast]);

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
      // Strictly execute with Java OpenJDK only if the notebook is Java or code explicitly contains Java structure
      const isExplicitJavaCode =
        /System\.(out|err|in)\b|public\s+static\s+void\s+main|Scanner\s+\w+|import\s+java\./i.test(code);
      const isJavaExecution =
        notebookLanguage === 'java' ||
        (notebookLanguage !== 'python' &&
          notebookLanguage !== 'cpp' &&
          notebookLanguage !== 'javascript' &&
          notebookLanguage !== 'c' &&
          isExplicitJavaCode);

      const cellStdin = (cell.stdin ?? cell.metadata?.stdin ?? '');
      let effectiveStdin = cellStdin || notebook.metadata?.stdin || appState?.stdin || '';

      // Auto-generate input if code reads stdin and no input was provided yet
      const readsInput = checkIfCodeReadsInput(code);
      if (readsInput && !effectiveStdin.trim()) {
        const autoInput = generateSmartInputForCode(code);
        if (autoInput) {
          effectiveStdin = autoInput;
          updateCell(index, {
            stdin: autoInput,
            metadata: {
              ...(cell.metadata || {}),
              stdin: autoInput,
            },
          });
          setOpenInputCellIndices((prev) => ({ ...prev, [index]: true }));
          showToast?.('🎲 Auto-generated inputs applied for this cell execution!');
        }
      }

      if (isJavaExecution) {
        const prepared = prepareJavaNotebookCellCode(notebook.cells, index);
        result = await executeCode(prepared, 62, effectiveStdin, appState?.files);
        // Fallback: If execution failed with variable redeclaration conflict in main, try active cell
        if (!result.success && result.error && /already defined in method main|is already defined/i.test(result.error)) {
          const fallbackPrepared = prepareJavaCellCode(code);
          result = await executeCode(fallbackPrepared, 62, effectiveStdin, appState?.files);
        }
      } else if (notebookLanguage === 'python') {
        result = await executePythonInBrowser(code, effectiveStdin, appState?.files);
      } else if (notebookLanguage === 'cpp') {
        const prepared = prepareCppCellCode(code);
        result = await executeCode(prepared, 54, effectiveStdin, appState?.files);
      } else if (notebookLanguage === 'javascript') {
        result = await executeCode(code, 63, effectiveStdin, appState?.files);
      } else if (notebookLanguage === 'c') {
        const prepared = prepareCCellCode(code);
        result = await executeCode(prepared, 50, effectiveStdin, appState?.files);
      } else {
        result = await executePythonInBrowser(code, effectiveStdin, appState?.files);
      }

      // Auto-recovery: If execution failed because Scanner/input() ran out of tokens (NoSuchElementException / EOFError),
      // automatically synthesize and append additional input tokens, then re-execute immediately
      if (!result.success && result.error && /NoSuchElementException|EOFError/i.test(result.error)) {
        const currentTokens = effectiveStdin.trim().split(/\s+/).filter(Boolean);
        const smartFallback = generateSmartInputForCode(code) || '5\n10\n20\n30\n40\n50\n20';
        const fallbackValue = currentTokens.length > 1 ? currentTokens[1] : (currentTokens[0] || '10');
        const supplementalInput = effectiveStdin.trim()
          ? `${effectiveStdin.trim()}\n${fallbackValue}\n20\n30\n40\n50`
          : smartFallback;

        let retryResult;
        if (isJavaExecution) {
          const prepared = prepareJavaNotebookCellCode(notebook.cells, index);
          retryResult = await executeCode(prepared, 62, supplementalInput, appState?.files);
          if (!retryResult.success && retryResult.error && /already defined in method main|is already defined/i.test(retryResult.error)) {
            const fallbackPrepared = prepareJavaCellCode(code);
            retryResult = await executeCode(fallbackPrepared, 62, supplementalInput, appState?.files);
          }
        } else if (notebookLanguage === 'python') {
          retryResult = await executePythonInBrowser(code, supplementalInput, appState?.files);
        } else if (notebookLanguage === 'cpp') {
          const prepared = prepareCppCellCode(code);
          retryResult = await executeCode(prepared, 54, supplementalInput, appState?.files);
        } else if (notebookLanguage === 'javascript') {
          retryResult = await executeCode(code, 63, supplementalInput, appState?.files);
        } else if (notebookLanguage === 'c') {
          const prepared = prepareCCellCode(code);
          retryResult = await executeCode(prepared, 50, supplementalInput, appState?.files);
        }

        if (retryResult && !retryResult.error) {
          result = retryResult;
          effectiveStdin = supplementalInput;
          updateCell(index, {
            stdin: supplementalInput,
            metadata: {
              ...(cell.metadata || {}),
              stdin: supplementalInput,
            },
          });
          setOpenInputCellIndices((prev) => ({ ...prev, [index]: true }));
          showToast?.('💡 Auto-supplemented missing input for Scanner search!');
        }
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
          errMessage += '\n\n💡 Tip: Your code expected more input via Scanner/System.in. Click the "Input" button above this cell to view or auto-generate inputs.';
        } else if (/EOFError/i.test(errMessage) && /input\s*\(/i.test(code)) {
          errMessage += '\n\n💡 Tip: Reached End-Of-File waiting for python input(). Click the "Input" button above this cell to view or auto-generate inputs.';
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
        table: result.table || null,
        execution_time: result.time,
        hasError: Boolean(result.error),
      });

      if (Array.isArray(result.variables) && result.variables.length > 0) {
        setRuntimeVariables(result.variables);
      }

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
  }, [notebook.cells, notebook.metadata, appState?.stdin, executionCounter, notebookLanguage, updateCell, showToast]);

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

          {/* Google Colab Runtime Status Indicator & Memory Manager */}
          {notebookLanguage === 'python' && (
            <div className="colab-runtime-pill-container" ref={runtimeMenuRef}>
              <button
                type="button"
                className="colab-runtime-pill"
                onClick={() => setRuntimeMenuOpen((prev) => !prev)}
                title="View Python runtime status & RAM or restart kernel"
              >
                <span className="colab-runtime-dot" />
                <span className="colab-runtime-label">Connected</span>
                <span className="colab-runtime-specs">Python 3.12 (WASM)</span>
                <ChevronDown size={11} className={`colab-runtime-arrow ${runtimeMenuOpen ? 'open' : ''}`} />
              </button>

              {runtimeMenuOpen && (
                <div className="colab-runtime-dropdown">
                  <div className="colab-runtime-dropdown-header">
                    <span className="runtime-dropdown-title">Python 3.12 Runtime</span>
                    <span className="runtime-status-tag">Connected</span>
                  </div>
                  <div className="colab-runtime-stats">
                    <div className="runtime-stat-row">
                      <span className="stat-label">Engine:</span>
                      <span className="stat-val">Pyodide WebAssembly</span>
                    </div>
                    <div className="runtime-stat-row">
                      <span className="stat-label">RAM / Memory:</span>
                      <span className="stat-val">Active in Browser</span>
                    </div>
                    <div className="runtime-stat-row">
                      <span className="stat-label">Active Variables:</span>
                      <span className="stat-val">{runtimeVariables.length} tracked</span>
                    </div>
                    <div className="runtime-stat-row">
                      <span className="stat-label">Preloaded Stack:</span>
                      <span className="stat-val">Pandas, NumPy, Matplotlib, SciPy, Scikit-learn</span>
                    </div>
                  </div>
                  <div className="colab-runtime-dropdown-divider" />
                  <button
                    type="button"
                    className="colab-runtime-action-btn danger"
                    onClick={handleRestartRuntime}
                    disabled={isRestartingRuntime}
                  >
                    {isRestartingRuntime ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />}
                    <span>Restart Runtime & Reset Memory</span>
                  </button>
                </div>
              )}
            </div>
          )}
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

          <button
            className="jupyter-btn-action jupyter-btn-auto-inputs"
            onClick={handleAutoGenerateAllCellInputs}
            title="Automatically detect code patterns and generate smart inputs for all cells in the notebook"
          >
            <Sparkles size={14} />
            <span>Auto Inputs</span>
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
        /* Visual Interactive Notebook Canvas with Google Colab Navigation Rail & Side Drawer */
        <div className="jupyter-colab-layout">
          {/* Google Colab Left Navigation Rail */}
          <div className="colab-nav-rail">
            <button
              type="button"
              className={`colab-rail-btn ${activeColabTab === 'toc' ? 'active' : ''}`}
              onClick={() => setActiveColabTab((prev) => (prev === 'toc' ? null : 'toc'))}
              title="Table of contents outline"
            >
              <List size={17} />
              <span className="colab-rail-tooltip">Outline / TOC</span>
              {tableOfContents.length > 0 && (
                <span className="colab-rail-badge">{tableOfContents.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`colab-rail-btn ${activeColabTab === 'variables' ? 'active' : ''}`}
              onClick={() => setActiveColabTab((prev) => (prev === 'variables' ? null : 'variables'))}
              title="Variable inspector"
            >
              <Variable size={17} />
              <span className="colab-rail-tooltip">Variables</span>
              {runtimeVariables.length > 0 && (
                <span className="colab-rail-badge">{runtimeVariables.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`colab-rail-btn ${activeColabTab === 'snippets' ? 'active' : ''}`}
              onClick={() => setActiveColabTab((prev) => (prev === 'snippets' ? null : 'snippets'))}
              title="Data Science code snippets"
            >
              <Code2 size={17} />
              <span className="colab-rail-tooltip">Snippets</span>
            </button>

            <button
              type="button"
              className={`colab-rail-btn ${activeColabTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveColabTab((prev) => (prev === 'files' ? null : 'files'))}
              title="Workspace files and datasets"
            >
              <Folder size={17} />
              <span className="colab-rail-tooltip">Files</span>
              {workspaceFiles.length > 0 && (
                <span className="colab-rail-badge">{workspaceFiles.length}</span>
              )}
            </button>
          </div>

          {/* Expandable Google Colab Side Drawer */}
          {activeColabTab && (
            <div className="colab-side-drawer">
              <div className="colab-drawer-header">
                <div className="colab-drawer-title-group">
                  {activeColabTab === 'toc' && <List size={15} />}
                  {activeColabTab === 'variables' && <Variable size={15} />}
                  {activeColabTab === 'snippets' && <Code2 size={15} />}
                  {activeColabTab === 'files' && <Folder size={15} />}
                  <span className="colab-drawer-title">
                    {activeColabTab === 'toc' && 'Table of contents'}
                    {activeColabTab === 'variables' && 'Variable inspector'}
                    {activeColabTab === 'snippets' && 'Code snippets'}
                    {activeColabTab === 'files' && 'Files & Datasets'}
                  </span>
                </div>
                <button
                  type="button"
                  className="colab-drawer-close"
                  onClick={() => setActiveColabTab(null)}
                  title="Close side panel"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="colab-drawer-content">
                {/* 1. TABLE OF CONTENTS */}
                {activeColabTab === 'toc' && (
                  <div className="colab-toc-panel">
                    {tableOfContents.length === 0 ? (
                      <div className="colab-empty-state">
                        <List size={26} className="empty-icon" />
                        <p>No headings in notebook</p>
                        <span>Add markdown cells with <code># Heading</code> to build your table of contents outline.</span>
                      </div>
                    ) : (
                      <div className="colab-toc-list">
                        {tableOfContents.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`colab-toc-item level-${item.level}`}
                            onClick={() => scrollToCell(item.cellIndex)}
                            title={`Jump to ${item.title}`}
                          >
                            <span className="toc-indent-dot" />
                            <span className="toc-item-title">{item.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VARIABLE INSPECTOR */}
                {activeColabTab === 'variables' && (
                  <div className="colab-variables-panel">
                    <div className="colab-panel-search-bar">
                      <Search size={13} />
                      <input
                        type="text"
                        placeholder="Filter variables..."
                        value={variablesSearch}
                        onChange={(e) => setVariablesSearch(e.target.value)}
                        className="colab-search-input"
                      />
                    </div>

                    {runtimeVariables.length === 0 ? (
                      <div className="colab-empty-state">
                        <Variable size={26} className="empty-icon" />
                        <p>No runtime variables in memory</p>
                        <span>Run Python cells to inspect live DataFrames, arrays, and models here.</span>
                      </div>
                    ) : (
                      <div className="colab-variables-table-wrap">
                        <table className="colab-variables-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Type</th>
                              <th>Size / Shape</th>
                              <th>Value Preview</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {runtimeVariables
                              .filter((v) =>
                                !variablesSearch.trim() ||
                                v.name.toLowerCase().includes(variablesSearch.toLowerCase()) ||
                                v.type.toLowerCase().includes(variablesSearch.toLowerCase())
                              )
                              .map((v, i) => (
                                <tr key={i}>
                                  <td className="var-name"><code>{v.name}</code></td>
                                  <td className="var-type"><span className="var-type-badge">{v.type}</span></td>
                                  <td className="var-size">{v.size}</td>
                                  <td className="var-val" title={v.value}>{v.value}</td>
                                  <td className="var-actions">
                                    <button
                                      type="button"
                                      className="var-action-btn"
                                      onClick={() => handleInsertSnippet(`print(${v.name})\n`, false)}
                                      title={`Insert print(${v.name}) into active cell`}
                                    >
                                      print
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CODE SNIPPETS */}
                {activeColabTab === 'snippets' && (
                  <div className="colab-snippets-panel">
                    <div className="colab-panel-search-bar">
                      <Search size={13} />
                      <input
                        type="text"
                        placeholder="Search snippets (pandas, plot, sklearn)..."
                        value={snippetsSearch}
                        onChange={(e) => setSnippetsSearch(e.target.value)}
                        className="colab-search-input"
                      />
                    </div>

                    <div className="colab-snippets-list">
                      {COLAB_SNIPPETS
                        .filter((snip) => {
                          if (!snippetsSearch.trim()) return true;
                          const q = snippetsSearch.toLowerCase();
                          return (
                            snip.title.toLowerCase().includes(q) ||
                            snip.category.toLowerCase().includes(q) ||
                            snip.description.toLowerCase().includes(q) ||
                            snip.code.toLowerCase().includes(q)
                          );
                        })
                        .map((snip) => (
                          <div key={snip.id} className="colab-snippet-card">
                            <div className="snippet-card-header">
                              <div>
                                <span className="snippet-category">{snip.category}</span>
                                <h4 className="snippet-title">{snip.title}</h4>
                              </div>
                              <div className="snippet-btn-group">
                                <button
                                  type="button"
                                  className="snippet-insert-btn"
                                  onClick={() => handleInsertSnippet(snip.code, false)}
                                  title="Insert into active cell"
                                >
                                  Insert
                                </button>
                                <button
                                  type="button"
                                  className="snippet-add-btn"
                                  onClick={() => handleInsertSnippet(snip.code, true)}
                                  title="Add as new cell"
                                >
                                  + Cell
                                </button>
                              </div>
                            </div>
                            <p className="snippet-desc">{snip.description}</p>
                            <pre className="snippet-code-preview"><code>{snip.code}</code></pre>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 4. WORKSPACE FILES */}
                {activeColabTab === 'files' && (
                  <div className="colab-files-panel">
                    <div className="colab-files-header-info">
                      <span>Files mounted into runtime at <code>/home/pyodide/</code></span>
                    </div>

                    {workspaceFiles.length === 0 ? (
                      <div className="colab-empty-state">
                        <Folder size={26} className="empty-icon" />
                        <p>No workspace files found</p>
                      </div>
                    ) : (
                      <div className="colab-files-list">
                        {workspaceFiles.map((f, i) => {
                          const isCsv = f.name.toLowerCase().endsWith('.csv');
                          const isJson = f.name.toLowerCase().endsWith('.json');
                          return (
                            <div key={i} className="colab-file-item">
                              <div className="colab-file-info">
                                <span className="colab-file-icon">{isCsv ? '📊' : isJson ? '📋' : '📄'}</span>
                                <span className="colab-file-name" title={f.name}>{f.name}</span>
                              </div>
                              <div className="colab-file-actions">
                                <button
                                  type="button"
                                  className="colab-file-action-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText(f.name);
                                    showToast?.(`Path '${f.name}' copied!`);
                                  }}
                                  title="Copy filename"
                                >
                                  Copy
                                </button>
                                {(isCsv || isJson) && (
                                  <button
                                    type="button"
                                    className="colab-file-action-btn primary"
                                    onClick={() => handleInsertFileRead(f.name)}
                                    title={`Insert pd.read_${isCsv ? 'csv' : 'json'} into notebook`}
                                  >
                                    Load in Pandas
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visual Interactive Notebook Canvas */}
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
                const readsInput = isCode && checkIfCodeReadsInput(source);
                const pattern = isCode ? detectInputPattern(source) : { type: 'no_input' };
                const patternLabel = getPatternLabel(pattern.type);
                const cellStdin = cell.stdin ?? cell.metadata?.stdin ?? '';
                const isInputOpen = Boolean(openInputCellIndices[idx]);

                return (
                  <div key={idx} id={`jupyter-cell-${idx}`} className="jupyter-cell-block">
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

                        {isCode && (
                          <button
                            className={`cell-action-btn cell-action-stdin-btn ${isInputOpen ? 'active' : ''} ${readsInput ? 'needs-input' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCellInput(idx);
                            }}
                            title={
                              readsInput
                                ? `Reads input (${patternLabel}). Click to configure stdin.`
                                : 'Configure Standard Input (stdin)'
                            }
                          >
                            <Terminal size={13} />
                            <span className="cell-action-text">Input</span>
                            {readsInput && (
                              <span
                                className={`cell-input-status-dot ${cellStdin.trim() ? 'configured' : 'needed'}`}
                                title={cellStdin.trim() ? 'Input configured' : 'Will auto-generate on run'}
                              />
                            )}
                          </button>
                        )}

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

                        {isCode && (
                          <button
                            className={`cell-action-btn ${collapsedCodeCells[idx] ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCodeCollapse(idx);
                            }}
                            title={collapsedCodeCells[idx] ? 'Expand Code Cell' : 'Collapse Code Cell'}
                          >
                            {collapsedCodeCells[idx] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        )}

                        {isCode && (
                          <button
                            className="cell-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              runCellsAbove(idx);
                            }}
                            disabled={idx === 0 || isRunningAll}
                            title="Run all code cells above"
                          >
                            <ChevronsUp size={13} />
                          </button>
                        )}

                        {isCode && (
                          <button
                            className="cell-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              runCellsBelow(idx);
                            }}
                            disabled={idx === notebook.cells.length - 1 || isRunningAll}
                            title="Run all code cells below"
                          >
                            <ChevronsDown size={13} />
                          </button>
                        )}

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
                        <>
                          {collapsedCodeCells[idx] ? (
                            <div
                              className="jupyter-code-collapsed-banner"
                              onClick={() => toggleCodeCollapse(idx)}
                              title="Click to expand code"
                            >
                              <Eye size={13} />
                              <span>Code hidden ({lineCount} lines) — click to expand</span>
                            </div>
                          ) : (
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
                          )}

                          {/* Standard Input (Stdin) Drawer */}
                          <div className={`jupyter-cell-stdin-container ${isInputOpen ? 'open' : ''}`}>
                            {readsInput && !isInputOpen && (
                              <div
                                className="jupyter-cell-stdin-preview-bar"
                                onClick={() => toggleCellInput(idx)}
                                title="Click to view or edit standard input for this cell"
                              >
                                <div className="stdin-preview-left">
                                  <span className={`stdin-preview-dot ${cellStdin.trim() ? 'configured' : 'pulse'}`} />
                                  <span className="stdin-preview-label">Standard Input:</span>
                                  <span className="stdin-preview-val">
                                    {cellStdin.trim()
                                      ? cellStdin.replace(/\n/g, ' ↵ ').slice(0, 48) + (cellStdin.length > 48 ? '...' : '')
                                      : '(Will auto-generate on run)'}
                                  </span>
                                </div>
                                <div className="stdin-preview-right">
                                  <span className="stdin-preview-badge">{patternLabel}</span>
                                  <span className="stdin-preview-action">Configure 📥</span>
                                </div>
                              </div>
                            )}

                            {isInputOpen && (
                              <div className="jupyter-cell-stdin-drawer">
                                <div className="jupyter-stdin-header">
                                  <div className="jupyter-stdin-title-row">
                                    <span className="jupyter-stdin-icon">📥</span>
                                    <span className="jupyter-stdin-heading">Standard Input (Stdin)</span>
                                    {readsInput ? (
                                      <span className="jupyter-stdin-badge required">Input Needed</span>
                                    ) : (
                                      <span className="jupyter-stdin-badge optional">Optional</span>
                                    )}
                                    <span className="jupyter-stdin-pattern-tag" title="Inferred input schema from code">
                                      {patternLabel}
                                    </span>
                                  </div>

                                  <div className="jupyter-stdin-actions">
                                    <button
                                      type="button"
                                      className="stdin-quick-btn auto-btn"
                                      onClick={() => handleAutoGenerateCellStdin(idx)}
                                      title="Automatically synthesize realistic inputs matching types & loops"
                                    >
                                      <Sparkles size={12} />
                                      <span>Auto-Generate</span>
                                    </button>
                                    <div className="stdin-presets-group">
                                      <button
                                        type="button"
                                        className="stdin-quick-btn"
                                        onClick={() => handleApplyPresetInput(idx, 'numbers')}
                                        title="Array of numbers (Count + elements)"
                                      >
                                        🔢 Array
                                      </button>
                                      <button
                                        type="button"
                                        className="stdin-quick-btn"
                                        onClick={() => handleApplyPresetInput(idx, 'strings')}
                                        title="Strings / words"
                                      >
                                        🔤 Words
                                      </button>
                                      <button
                                        type="button"
                                        className="stdin-quick-btn"
                                        onClick={() => handleApplyPresetInput(idx, 'matrix')}
                                        title="2D Matrix (Rows, Cols, Grid)"
                                      >
                                        ▦ Matrix
                                      </button>
                                      <button
                                        type="button"
                                        className="stdin-quick-btn"
                                        onClick={() => handleApplyPresetInput(idx, 'pairs')}
                                        title="Two inputs (A and B)"
                                      >
                                        🎯 Pair
                                      </button>
                                      {cellStdin.trim() && (
                                        <button
                                          type="button"
                                          className="stdin-quick-btn clear"
                                          onClick={() => handleApplyPresetInput(idx, 'clear')}
                                          title="Clear input"
                                        >
                                          🧹 Clear
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="stdin-close-btn"
                                      onClick={() => toggleCellInput(idx)}
                                      title="Close Input Drawer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  className="jupyter-cell-stdin-textarea"
                                  value={cellStdin}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateCell(idx, {
                                      stdin: val,
                                      metadata: {
                                        ...(cell.metadata || {}),
                                        stdin: val,
                                      },
                                    });
                                  }}
                                  placeholder={`Enter standard input for this cell (e.g. for Scanner, input(), cin)...\nLeave empty to automatically synthesize matching inputs on run.`}
                                  rows={Math.min(6, Math.max(2, (cellStdin.split('\n').length || 1) + 1))}
                                />
                                <div className="jupyter-stdin-footer">
                                  <span className="stdin-footer-hint">
                                    💡 Inputs are piped to standard input (<code>Scanner</code>, <code>input()</code>, <code>cin</code>, <code>scanf</code>) when this cell runs.
                                  </span>
                                  {cellStdin.trim() && (
                                    <span className="stdin-line-count">
                                      {cellStdin.trim().split('\n').length} line{cellStdin.trim().split('\n').length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
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
                        (cell.outputs?.length > 0 || cell.plots?.length > 0 || cell.html || cell.table) && (
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
                                    table: null,
                                    execution_time: null,
                                    hasError: false,
                                  })
                                }
                                title="Clear output for this cell"
                              >
                                Clear
                              </button>
                            </div>

                            {/* Google Colab Interactive Data Table (Search, Filter, Sort, Pagination, CSV/JSON Export) */}
                            {cell.table && (
                              <div className="jupyter-datatable-container">
                                <InteractiveDataTable table={cell.table} title="Interactive DataFrame Viewer" />
                              </div>
                            )}

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

                            {/* Render Interactive Maps / Folium / HTML (only if not already shown as interactive table) */}
                            {cell.html && !cell.table && (
                              <div className="jupyter-html-map-container">
                                <div className="jupyter-map-badge">
                                  {cell.html.includes('<table') ? (
                                    <>
                                      <Table size={13} />
                                      <span>DataFrame / Tabular Output Preview</span>
                                    </>
                                  ) : (
                                    <>
                                      <MapPin size={13} />
                                      <span>Interactive Folium / HTML Visualization</span>
                                    </>
                                  )}
                                </div>
                                <iframe
                                  srcDoc={
                                    cell.html.includes('<table')
                                      ? `<!DOCTYPE html><html><head><style>
body { margin: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; font-size: 13px; color: #e6edf3; background: #0d1117; }
table.dataframe { border-collapse: collapse; width: 100%; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; }
table.dataframe th, table.dataframe td { padding: 8px 14px; text-align: left; border: 1px solid #30363d; white-space: nowrap; }
table.dataframe th { background: #161b22; color: #58a6ff; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
table.dataframe tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
table.dataframe tr:hover { background: rgba(88, 166, 255, 0.08); }
</style></head><body>${cell.html}</body></html>`
                                      : cell.html
                                  }
                                  title={`Visualization Cell ${idx + 1}`}
                                  className="jupyter-map-frame"
                                  style={cell.html.includes('<table') ? { height: '220px', background: '#0d1117' } : {}}
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
        </div>
      )}
    </div>
  );
}
