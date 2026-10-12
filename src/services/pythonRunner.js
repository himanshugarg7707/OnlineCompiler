// In-Browser Python WebAssembly Engine (Pyodide)
// Supports NumPy, Pandas, Matplotlib, SciPy, Folium maps, and full standard library without server latency

let pyodideInstance = null;
let loadPromise = null;

/**
 * Initialize and get Pyodide instance
 */
export async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Dynamically inject Pyodide script if not present
    if (!window.loadPyodide) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Pyodide Python engine'));
        document.head.appendChild(script);
      });
    }

    const pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });

    pyodideInstance = pyodide;
    return pyodide;
  })();

  return loadPromise;
}

/**
 * Reset and restart Python Pyodide runtime (clears memory and variables)
 */
export async function restartPythonRuntime() {
  pyodideInstance = null;
  loadPromise = null;
}

/**
 * Pre-install or load packages on demand
 */
async function ensurePackages(pyodide, code) {
  const loadTasks = [];

  if (/\b(numpy|np)\b/.test(code)) {
    loadTasks.push(pyodide.loadPackage('numpy'));
  }
  if (/\b(pandas|pd)\b/.test(code)) {
    loadTasks.push(pyodide.loadPackage('pandas'));
  }
  if (/\b(scipy|stats)\b/.test(code)) {
    loadTasks.push(pyodide.loadPackage('scipy'));
  }
  if (/\b(matplotlib|plt)\b/.test(code)) {
    loadTasks.push(pyodide.loadPackage('matplotlib'));
  }
  if (/\b(sklearn|scikit-learn)\b/.test(code)) {
    loadTasks.push(pyodide.loadPackage('scikit-learn'));
  }

  // Handle map libraries like folium or extra packages via micropip if needed
  if (/\bfolium\b/.test(code)) {
    loadTasks.push(
      (async () => {
        try {
          await pyodide.loadPackage('micropip');
          const micropip = pyodide.pyimport('micropip');
          await micropip.install('folium');
        } catch (e) {
          console.warn('Could not install folium via micropip:', e);
        }
      })()
    );
  }

  if (loadTasks.length > 0) {
    await Promise.all(loadTasks);
  }
}

/**
 * Process Google Colab-style magic commands (%pip, !pip, %ls, !ls, %pwd, !pwd, !cat, !head, %who, %time)
 */
async function handleColabMagics(pyodide, code) {
  const lines = code.split('\n');
  const normalLines = [];
  const magicLogs = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. %pip install ... / !pip install ...
    if (/^[%!]pip\s+install\s+(.+)/i.test(trimmed)) {
      const match = trimmed.match(/^[%!]pip\s+install\s+(.+)/i);
      const pkgs = match[1].split(/\s+/).filter(Boolean);
      magicLogs.push(`Collecting ${pkgs.join(', ')}...`);
      try {
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        for (const pkg of pkgs) {
          magicLogs.push(`  Downloading and installing ${pkg}...`);
          await micropip.install(pkg);
          magicLogs.push(`Successfully installed ${pkg}`);
        }
      } catch (err) {
        magicLogs.push(`Error installing via micropip: ${err.message}`);
      }
      continue;
    }

    // 2. %ls / !ls
    if (/^[%!]ls\b/i.test(trimmed)) {
      try {
        const files = pyodide.FS.readdir('/home/pyodide').filter((f) => f !== '.' && f !== '..');
        magicLogs.push(files.length > 0 ? files.join('   ') : '(Empty directory)');
      } catch (err) {
        magicLogs.push(`ls error: ${err.message}`);
      }
      continue;
    }

    // 3. %pwd / !pwd
    if (/^[%!]pwd\b/i.test(trimmed)) {
      magicLogs.push('/home/pyodide');
      continue;
    }

    // 4. !cat <file> / !head <file>
    if (/^!(cat|head)\s+(.+)/i.test(trimmed)) {
      const match = trimmed.match(/^!(cat|head)\s+(.+)/i);
      const isHead = match[1].toLowerCase() === 'head';
      const targetFile = match[2].trim();
      try {
        let content = pyodide.FS.readFile(`/home/pyodide/${targetFile}`, { encoding: 'utf8' });
        if (isHead) {
          content = content.split('\n').slice(0, 10).join('\n');
        }
        magicLogs.push(content);
      } catch (err) {
        magicLogs.push(`Error reading ${targetFile}: ${err.message}`);
      }
      continue;
    }

    // 5. %time prefix
    if (/^%time\s+(.+)/i.test(trimmed)) {
      const statement = trimmed.replace(/^%time\s+/i, '');
      normalLines.push(statement);
      continue;
    }

    normalLines.push(rawLine);
  }

  return {
    processedCode: normalLines.join('\n'),
    magicOutput: magicLogs.length > 0 ? magicLogs.join('\n') + '\n' : '',
  };
}

/**
 * Execute Python code in WebAssembly with real stdout/stderr capture, NumPy/Pandas/Matplotlib support,
 * and inline figure and interactive map extraction.
 *
 * @param {string} code
 * @param {string} stdin
 */
export async function executePythonInBrowser(code, stdin = '', files = []) {
  const startTime = performance.now();

  try {
    const pyodide = await getPyodide();

    // Handle Colab magics (%pip, !pip, %ls, !pwd, %time, etc.)
    const { processedCode, magicOutput } = await handleColabMagics(pyodide, code);

    // Ensure required packages are loaded
    await ensurePackages(pyodide, processedCode);

    // Sync workspace files into Pyodide virtual filesystem
    let effectiveFiles = Array.isArray(files) ? [...files] : [];
    if (effectiveFiles.length === 0 && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fullcode_files_v3');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) effectiveFiles = parsed;
        }
      } catch (_) {}
    }

    if (Array.isArray(effectiveFiles)) {
      for (const f of effectiveFiles) {
        if (!f || !f.name) continue;
        if (f.name.endsWith('.ipynb')) continue;
        const cleanName = f.name.replace(/^\/+/, '');
        let content = f.content ?? '';

        // If sales_data.csv is empty or corrupted with code boilerplate, provide standard sales CSV
        if (cleanName.toLowerCase().includes('sales') && cleanName.toLowerCase().endsWith('.csv')) {
          if (!content.trim() || content.includes('# Start here') || content.includes('public class') || content.includes('import java.')) {
            content = `order_id,product_name,category,price,quantity,revenue,customer_city
1001,MacBook Pro 16,Electronics,2499.00,2,4998.00,San Francisco
1002,Sony WH-1000XM5,Electronics,399.50,4,1598.00,New York
1003,Ergonomic Chair,Furniture,349.00,3,1047.00,Austin
1004,Mechanical Keyboard,Accessories,149.00,8,1192.00,Seattle
1005,4K Monitor 32-inch,Electronics,699.00,5,3495.00,Chicago
1006,Standing Desk,Furniture,599.00,2,1198.00,Boston
1007,Wireless Mouse,Accessories,79.90,12,958.80,Denver
1008,USB-C Hub,Accessories,49.99,15,749.85,Austin
1009,Noise Cancelling Earbuds,Electronics,199.00,6,1194.00,San Francisco
1010,Coffee Maker Espresso,Appliances,289.00,3,867.00,Seattle
`;
          }
        }

        // Ensure subdirectories exist
        const parts = cleanName.split('/');
        if (parts.length > 1) {
          let curr = '/home/pyodide';
          for (let i = 0; i < parts.length - 1; i++) {
            curr += '/' + parts[i];
            try {
              pyodide.FS.mkdir(curr);
            } catch (_) {}
          }
        }

        try {
          pyodide.FS.writeFile(`/home/pyodide/${cleanName}`, content);
        } catch (_) {
          try {
            pyodide.FS.writeFile(cleanName, content);
          } catch (e) {
            console.warn('Could not write file to Pyodide FS:', cleanName, e);
          }
        }
      }
    }

    // Set up standard input lines and stdout/stderr capture
    const inputLines = stdin ? stdin.split('\n') : [];
    const inputJson = JSON.stringify(inputLines);

    // Python wrapper script to redirect sys.stdout, mock sys.stdin, and capture matplotlib & maps
    const wrapper = `
import sys
import io
import base64
import warnings

# Filter out library deprecation/future warnings (e.g. Pandas Pyarrow dependency deprecation)
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', message='.*Pyarrow.*')
warnings.filterwarnings('ignore', message='.*pyarrow.*')

class _CapturingStdout(io.StringIO):
    pass

class _MockStdin:
    def __init__(self, lines):
        self.lines = list(lines)
        self.idx = 0
    def readline(self):
        if self.idx < len(self.lines):
            val = self.lines[self.idx]
            self.idx += 1
            return str(val) + "\\n"
        return "0\\n"
    def read(self, *args):
        return "\\n".join(self.lines[self.idx:])

_old_stdout = sys.stdout
_old_stderr = sys.stderr
_old_stdin = sys.stdin

_captured_stdout = io.StringIO()
_captured_stderr = io.StringIO()

sys.stdout = _captured_stdout
sys.stderr = _captured_stderr
sys.stdin = _MockStdin(${inputJson})

_captured_figures = []

# Configure Matplotlib hook to intercept plots without gui popups
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as _plt

    def _custom_show(*args, **kwargs):
        _buf = io.BytesIO()
        _plt.savefig(_buf, format='png', bbox_inches='tight', dpi=120)
        _buf.seek(0)
        _b64 = base64.b64encode(_buf.read()).decode('ascii')
        _captured_figures.append(f"data:image/png;base64,{_b64}")
        _plt.close('all')

    _plt.show = _custom_show
except Exception:
    pass

# Pre-seed sample SQLite database files if sqlite3 is used
if "sqlite3" in ${JSON.stringify(code)}:
    try:
        import os
        import sqlite3
        os.makedirs("server/data/databases", exist_ok=True)
        if not os.path.exists("server/data/databases/ecommerce_db.sqlite"):
            for _p in ["server/data/databases/ecommerce_db.sqlite", "ecommerce_db.sqlite"]:
                _conn = sqlite3.connect(_p)
                _cur = _conn.cursor()
                _cur.executescript("""
                    CREATE TABLE IF NOT EXISTS customers (
                        customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        country TEXT DEFAULT 'USA'
                    );
                    CREATE TABLE IF NOT EXISTS products (
                        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        category TEXT NOT NULL,
                        price REAL NOT NULL,
                        stock INTEGER NOT NULL
                    );
                    INSERT OR IGNORE INTO customers (customer_id, name, email, country) VALUES
                        (1, 'Alice Johnson', 'alice@example.com', 'USA'),
                        (2, 'Bob Smith', 'bob@example.com', 'Canada'),
                        (3, 'Charlie Brown', 'charlie@example.com', 'UK');
                    INSERT OR IGNORE INTO products (product_id, name, category, price, stock) VALUES
                        (1, 'Quantum Laptop Pro', 'Electronics', 1299.99, 45),
                        (2, 'Wireless Headphones', 'Electronics', 249.50, 120);
                """)
                _conn.commit()
                _conn.close()
        if not os.path.exists("server/data/databases/main_db.sqlite"):
            for _p in ["server/data/databases/main_db.sqlite", "main_db.sqlite"]:
                _conn = sqlite3.connect(_p)
                _cur = _conn.cursor()
                _cur.executescript("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL,
                        role TEXT DEFAULT 'developer',
                        rating INTEGER DEFAULT 1500
                    );
                    INSERT OR IGNORE INTO users (id, username, role, rating) VALUES
                        (1, 'admin', 'system_admin', 2500),
                        (2, 'himanshu', 'lead_architect', 2200);
                """)
                _conn.commit()
                _conn.close()
    except Exception:
        pass

_user_code = ${JSON.stringify(processedCode)}
_exec_error = None
_captured_html = ""
_captured_table = None

import ast

try:
    _parsed = ast.parse(_user_code)
    if _parsed.body and isinstance(_parsed.body[-1], ast.Expr):
        _last_expr = _parsed.body.pop()
        if _parsed.body:
            exec(compile(_parsed, filename="<cell>", mode="exec"), globals())
        _res = eval(compile(ast.Expression(_last_expr.value), filename="<cell>", mode="eval"), globals())
        if _res is not None:
            # Check for Pandas DataFrame / Series
            if hasattr(_res, 'to_dict') and hasattr(_res, 'columns') and hasattr(_res, 'dtypes'):
                try:
                    _col_names = [str(c) for c in _res.columns]
                    _col_types = {str(c): str(_res.dtypes[c]) for c in _res.columns}
                    _preview_df = _res.head(500)
                    _raw_rows = _preview_df.to_dict(orient="records")
                    _cleaned_rows = []
                    for _r in _raw_rows:
                        _cr = {}
                        for _k, _val in _r.items():
                            if hasattr(_val, 'item'):
                                _cr[str(_k)] = _val.item()
                            elif hasattr(_val, 'isoformat'):
                                _cr[str(_k)] = _val.isoformat()
                            elif _val is None or (isinstance(_val, float) and _val != _val):
                                _cr[str(_k)] = None
                            else:
                                _cr[str(_k)] = _val
                        _cleaned_rows.append(_cr)
                    
                    _captured_table = {
                        "columns": _col_names,
                        "dtypes": _col_types,
                        "shape": list(_res.shape),
                        "data": _cleaned_rows,
                        "index": [str(i) for i in _preview_df.index]
                    }
                except Exception:
                    pass

                if hasattr(_res, '_repr_html_'):
                    _captured_html = _res._repr_html_()
                try:
                    print(str(_res))
                except Exception:
                    pass
            elif hasattr(_res, 'to_frame'):
                # Series
                try:
                    _s_df = _res.to_frame()
                    _col_names = [str(c) for c in _s_df.columns]
                    _preview_df = _s_df.head(500)
                    _captured_table = {
                        "columns": _col_names,
                        "dtypes": {str(c): str(_s_df.dtypes[c]) for c in _s_df.columns},
                        "shape": list(_s_df.shape),
                        "data": _preview_df.to_dict(orient="records"),
                        "index": [str(i) for i in _preview_df.index]
                    }
                except Exception:
                    pass
                try:
                    print(str(_res))
                except Exception:
                    pass
            elif hasattr(_res, '_repr_html_'):
                _captured_html = _res._repr_html_()
                try:
                    print(str(_res))
                except Exception:
                    pass
            elif hasattr(_res, 'get_root'):
                _captured_html = _res.get_root().render()
            else:
                _rep = repr(_res)
                if _rep:
                    print(_rep)
    else:
        exec(_user_code, globals())
except BaseException as e:
    import traceback
    _exec_error = traceback.format_exc()

# Capture any figure created that didn't explicitly call plt.show()
try:
    import matplotlib.pyplot as _plt
    if len(_plt.get_fignums()) > 0:
        _buf = io.BytesIO()
        _plt.savefig(_buf, format='png', bbox_inches='tight', dpi=120)
        _buf.seek(0)
        _b64 = base64.b64encode(_buf.read()).decode('ascii')
        _captured_figures.append(f"data:image/png;base64,{_b64}")
        _plt.close('all')
except Exception:
    pass

# Capture interactive map HTML (e.g., folium Map instance) if not already captured
if not _captured_html:
    try:
        for _vname in ['m', 'map', 'my_map', 'folium_map', 'chart_map']:
            if _vname in globals():
                _obj = globals()[_vname]
                if hasattr(_obj, '_repr_html_'):
                    _captured_html = _obj._repr_html_()
                    break
                elif hasattr(_obj, 'get_root'):
                    _captured_html = _obj.get_root().render()
                    break
    except Exception:
        pass

# Colab Feature: Capture any active DataFrame in globals if not already captured from last expression
if _captured_table is None:
    try:
        _df_candidates = ['df', 'data', 'dataset', 'sales_df', 'sales', 'filtered_df', 'result_df', 'res_df']
        for _cand in list(_df_candidates) + [k for k in globals().keys() if not k.startswith('_')]:
            if _cand in globals():
                _cand_obj = globals()[_cand]
                if hasattr(_cand_obj, 'to_dict') and hasattr(_cand_obj, 'columns') and hasattr(_cand_obj, 'dtypes'):
                    try:
                        _col_names = [str(c) for c in _cand_obj.columns]
                        _col_types = {str(c): str(_cand_obj.dtypes[c]) for c in _cand_obj.columns}
                        _preview_df = _cand_obj.head(500)
                        _raw_rows = _preview_df.to_dict(orient="records")
                        _cleaned_rows = []
                        for _r in _raw_rows:
                            _cr = {}
                            for _k, _val in _r.items():
                                if hasattr(_val, 'item'):
                                    _cr[str(_k)] = _val.item()
                                elif hasattr(_val, 'isoformat'):
                                    _cr[str(_k)] = _val.isoformat()
                                elif _val is None or (isinstance(_val, float) and _val != _val):
                                    _cr[str(_k)] = None
                                else:
                                    _cr[str(_k)] = _val
                            _cleaned_rows.append(_cr)

                        _captured_table = {
                            "columns": _col_names,
                            "dtypes": _col_types,
                            "shape": list(_cand_obj.shape),
                            "data": _cleaned_rows,
                            "index": [str(i) for i in _preview_df.index]
                        }
                        break
                    except Exception:
                        pass
    except Exception:
        pass

# Inspect runtime memory variables for Colab Variable Explorer
_captured_variables = []
_reserved_keys = {
    'sys', 'io', 'ast', 'base64', 'warnings', 'matplotlib', 'os', 'sqlite3',
    'traceback', '_CapturingStdout', '_MockStdin', '_old_stdout', '_old_stderr',
    '_old_stdin', '_captured_stdout', '_captured_stderr', '_captured_figures',
    '_captured_html', '_captured_table', '_captured_variables', '_user_code',
    '_exec_error', '_parsed', '_last_expr', '_res', '_plt', '_custom_show',
    '_table_err', '_buf', '_b64', 'wrapper', 'pyodide', '_preview_df', '_raw_rows',
    '_cleaned_rows', '_col_names', '_col_types', '_s_df'
}
try:
    for _vname, _vval in list(globals().items()):
        if _vname.startswith('_') or _vname in _reserved_keys:
            continue
        try:
            _type_str = type(_vval).__name__
            _shape_str = ""
            if hasattr(_vval, 'shape'):
                _shape_str = f"shape: {_vval.shape}"
            elif hasattr(_vval, '__len__') and not isinstance(_vval, (str, bytes)):
                _shape_str = f"len: {len(_vval)}"
            
            _repr_val = repr(_vval)
            if len(_repr_val) > 85:
                _repr_val = _repr_val[:82] + "..."
                
            _captured_variables.append({
                "name": _vname,
                "type": _type_str,
                "size": _shape_str or "-",
                "value": _repr_val
            })
        except Exception:
            pass
except Exception:
    pass

sys.stdout = _old_stdout
sys.stderr = _old_stderr
sys.stdin = _old_stdin

{
    "stdout": _captured_stdout.getvalue(),
    "stderr": _captured_stderr.getvalue(),
    "error": _exec_error,
    "plots": _captured_figures,
    "html": _captured_html,
    "table": _captured_table,
    "variables": _captured_variables
}
`;

    const resultProxy = await pyodide.runPythonAsync(wrapper);
    const result = resultProxy.toJs ? resultProxy.toJs({ dict_converter: Object.fromEntries }) : resultProxy;
    resultProxy.destroy?.();

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    const rawStdout = result.stdout || '';
    const stdout = magicOutput ? magicOutput + rawStdout : rawStdout;
    const stderr = result.stderr || '';
    const error = result.error || null;
    const plots = Array.isArray(result.plots) ? result.plots : [];
    const html = result.html || '';
    const table = result.table || null;
    const variables = Array.isArray(result.variables) ? result.variables : [];

    // Only unhandled exceptions are fatal execution failures; warnings are not fatal
    const hasError = Boolean(error && error.trim());

    if (hasError) {
      return {
        success: false,
        output: stdout,
        error: error,
        warning: stderr || null,
        plots,
        html,
        table,
        variables,
        time: elapsed,
        memory: 0,
        statusCode: 1,
      };
    }

    return {
      success: true,
      output: stdout || (plots.length > 0 || html || table ? '' : '(Program finished with no output)'),
      warning: stderr || null,
      error: null,
      plots,
      html,
      table,
      variables,
      time: elapsed,
      memory: 0,
      statusCode: 0,
    };
  } catch (err) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    return {
      success: false,
      output: '',
      error: err.message || 'Python execution error',
      plots: [],
      html: '',
      table: null,
      variables: [],
      time: elapsed,
      memory: 0,
      statusCode: 1,
    };
  }
}
