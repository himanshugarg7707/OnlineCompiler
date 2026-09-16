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
export async function executePythonInBrowser(code, stdin = '') {
  const startTime = performance.now();

  try {
    const pyodide = await getPyodide();

    // Ensure required packages are loaded
    await ensurePackages(pyodide, code);

    // Set up standard input lines and stdout/stderr capture
    const inputLines = stdin ? stdin.split('\n') : [];
    const inputJson = JSON.stringify(inputLines);

    // Python wrapper script to redirect sys.stdout, mock sys.stdin, and capture matplotlib & maps
    const wrapper = `
import sys
import io
import base64

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

_user_code = ${JSON.stringify(code)}
_exec_error = None

try:
    exec(_user_code, globals())
except Exception as e:
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

# Capture interactive map HTML (e.g., folium Map instance)
_captured_html = ""
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
    "stderr": _exec_error or _captured_stderr.getvalue(),
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
    const plots = Array.isArray(result.plots) ? result.plots : [];
    const html = result.html || '';

    const hasError = Boolean(stderr && stderr.trim());

    if (hasError) {
      return {
        success: false,
        output: stdout,
        error: stderr,
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
