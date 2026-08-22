// In-Browser Python WebAssembly Engine (Pyodide)
// Supports NumPy, math, statistics, and full standard library without server latency

let pyodideInstance = null;
let isLoadingPyodide = false;
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
 * Execute Python code in WebAssembly with real stdout/stderr capture and NumPy support
 */
export async function executePythonInBrowser(code, stdin = '') {
  const startTime = performance.now();

  try {
    const pyodide = await getPyodide();

    // Check if code imports numpy or other packages and load them
    if (/\bimport\s+numpy\b|\bfrom\s+numpy\b/.test(code)) {
      await pyodide.loadPackage('numpy');
    }
    if (/\bimport\s+pandas\b|\bfrom\s+pandas\b/.test(code)) {
      await pyodide.loadPackage('pandas');
    }
    if (/\bimport\s+scipy\b|\bfrom\s+scipy\b/.test(code)) {
      await pyodide.loadPackage('scipy');
    }

    // Set up standard input lines and stdout/stderr capture
    const inputLines = stdin ? stdin.split('\n') : [];
    const inputJson = JSON.stringify(inputLines);

    // Python wrapper script to redirect sys.stdout and mock sys.stdin
    const wrapper = `
import sys
import io

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
        return "0\\n"  # fallback default if exhausted
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

_user_code = ${JSON.stringify(code)}

_exec_error = None
try:
    exec(_user_code, globals())
except Exception as e:
    import traceback
    _exec_error = traceback.format_exc()

sys.stdout = _old_stdout
sys.stderr = _old_stderr
sys.stdin = _old_stdin

{
    "stdout": _captured_stdout.getvalue(),
    "stderr": _exec_error or _captured_stderr.getvalue()
}
`;

    const resultProxy = await pyodide.runPythonAsync(wrapper);
    const result = resultProxy.toJs ? resultProxy.toJs({ dict_converter: Object.fromEntries }) : resultProxy;
    resultProxy.destroy?.();

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

    if (stderr && stderr.trim()) {
      return {
        success: false,
        output: stdout,
        error: stderr,
        time: elapsed,
        memory: 0,
        statusCode: 1,
      };
    }

    return {
      success: true,
      output: stdout || '(Program finished with no output)',
      error: null,
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
      time: elapsed,
      memory: 0,
      statusCode: 1,
    };
  }
}
