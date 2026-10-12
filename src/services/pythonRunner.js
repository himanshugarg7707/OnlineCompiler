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

  // Handle map libraries like folium via micropip if needed
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

    // Ensure required packages are loaded
    await ensurePackages(pyodide, code);

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

_user_code = ${JSON.stringify(code)}
_exec_error = None
_captured_html = ""

import ast

try:
    _parsed = ast.parse(_user_code)
    if _parsed.body and isinstance(_parsed.body[-1], ast.Expr):
        _last_expr = _parsed.body.pop()
        if _parsed.body:
            exec(compile(_parsed, filename="<cell>", mode="exec"), globals())
        _res = eval(compile(ast.Expression(_last_expr.value), filename="<cell>", mode="eval"), globals())
        if _res is not None:
            if hasattr(_res, '_repr_html_'):
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

sys.stdout = _old_stdout
sys.stderr = _old_stderr
sys.stdin = _old_stdin

{
    "stdout": _captured_stdout.getvalue(),
    "stderr": _captured_stderr.getvalue(),
    "error": _exec_error,
    "plots": _captured_figures,
    "html": _captured_html
}
`;

    const resultProxy = await pyodide.runPythonAsync(wrapper);
    const result = resultProxy.toJs ? resultProxy.toJs({ dict_converter: Object.fromEntries }) : resultProxy;
    resultProxy.destroy?.();

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const error = result.error || null;
    const plots = Array.isArray(result.plots) ? result.plots : [];
    const html = result.html || '';

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
        time: elapsed,
        memory: 0,
        statusCode: 1,
      };
    }

    return {
      success: true,
      output: stdout || (plots.length > 0 || html ? '' : '(Program finished with no output)'),
      warning: stderr || null,
      error: null,
      plots,
      html,
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
      time: elapsed,
      memory: 0,
      statusCode: 1,
    };
  }
}
