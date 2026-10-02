// Code Execution Engine
// Uses WebAssembly Pyodide for Python (with full NumPy support)
// Uses In-Browser runner for JavaScript
// Uses Godbolt Compiler Explorer API (primary) + Wandbox API (fallback)
// for C, C++, Java, C#, Go, Rust, Ruby, PHP, R, Perl, Scala, Swift, Kotlin, TypeScript

import { getConfig } from './configService';
import { executePythonInBrowser } from './pythonRunner';
import { executeJavaScriptInBrowser } from './jsRunner';
import { executeSqlInBrowser } from './sqlRunner';
import { prepareJavaCellCode, prepareCppCellCode, prepareCCellCode, normalizeJavaMainMethod, getCompilationIdentifier, getLanguageById } from './languageDetector';

// ─── Godbolt Compiler Explorer — Primary Execution Engine ─────────────────────
// Free, no API key, actively maintained, supports execution with stdin
const GODBOLT_COMPILERS = {
  71: { id: 'python312', lang: 'python' },          // Python 3
  54: { id: 'g132', lang: 'c++' },                   // C++ (GCC 13.2)
  50: { id: 'cg132', lang: 'c' },                    // C (GCC 13.2)
  62: { id: 'java2501', lang: 'java' },               // Java (JDK 25)
  74: null,                                            // TypeScript (in-browser)
  51: { id: 'dotnet90csharpmono', lang: 'csharp' },    // C# (dotnet 9.0 mono)
  78: { id: 'kotlinc2220', lang: 'kotlin' },          // Kotlin (2.2.20)
  83: null,                                            // Swift
  60: { id: 'gl1260', lang: 'go' },                   // Go (1.26.0)
  73: { id: 'r1890', lang: 'rust' },                  // Rust (1.89.0)
  72: { id: 'ruby405', lang: 'ruby' },                // Ruby (4.0.5)
  85: null,                                            // Perl
  81: null,                                            // Scala
};

// Fast in-memory cache for 0ms re-runs of identical code & input
const clientExecutionCache = new Map();

// ─── Wandbox — Secondary Fallback Compiler ────────────────────────────────────
const WANDBOX_COMPILERS = {
  71: 'cpython-3.12.7',      // Python 3 (fallback)
  54: 'gcc-13.2.0',          // C++
  50: 'gcc-13.2.0-c',        // C
  62: 'openjdk-jdk-22+36',   // Java
  63: 'nodejs-20.17.0',      // JavaScript (fallback)
  74: 'typescript-5.6.2',    // TypeScript
  51: 'dotnetcore-8.0.402',  // C#
  78: null,                  // Kotlin
  83: 'swift-6.0.1',         // Swift
  60: 'go-1.23.2',           // Go
  73: 'rust-1.82.0',         // Rust
  68: 'php-8.3.12',          // PHP
  72: 'ruby-4.0.2',          // Ruby
  80: 'r-4.4.1',             // R
  85: 'perl-5.42.0',         // Perl
  81: 'scala-3.5.1',         // Scala
  82: 'sqlite-3.46.1',       // SQL
  0: null,                   // HTML
  1: null,                   // CSS
};

// Human-readable language names for error messages
const LANGUAGE_NAMES = {
  71: 'Python', 54: 'C++', 50: 'C', 62: 'Java', 63: 'JavaScript',
  74: 'TypeScript', 51: 'C#', 78: 'Kotlin', 83: 'Swift', 60: 'Go',
  73: 'Rust', 68: 'PHP', 72: 'Ruby', 80: 'R', 85: 'Perl', 81: 'Scala',
  82: 'SQL', 0: 'HTML', 1: 'CSS',
};

// Cache local server availability
let localServerStatusCache = null;
let lastStatusCheckTime = 0;

/**
 * Detect whether the app is running in a local machine environment (e.g. localhost, local network, native macOS app).
 * If true, native host compilers are accessible via /api/execute.
 * If false (e.g. deployed on Vercel, Netlify, Cloudflare), local pings are skipped entirely for 0ms overhead!
 */
export function isLocalEnvironment() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return Boolean(
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    window.webkit?.messageHandlers?.nativeHost
  );
}

/**
 * Check if the local backend server is running and local native compilers are available
 */
export async function checkLocalServerStatus(forceRefresh = false) {
  // If running on Vercel or cloud web deployment, immediately return without wasting network roundtrips
  if (!isLocalEnvironment()) {
    return {
      isLocalRunning: false,
      available: false,
      compilers: {},
      platform: 'web',
    };
  }

  const now = Date.now();
  if (!forceRefresh && localServerStatusCache && now - lastStatusCheckTime < 15000) {
    return localServerStatusCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/execute/status', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      localServerStatusCache = {
        isLocalRunning: true,
        available: Boolean(data.available),
        compilers: data.compilers || {},
        platform: data.platform || 'darwin',
      };
      lastStatusCheckTime = now;
      return localServerStatusCache;
    }
  } catch {
    // Backend not responding or serverless
  }

  localServerStatusCache = {
    isLocalRunning: false,
    available: false,
    compilers: {},
    platform: 'web',
  };
  lastStatusCheckTime = now;
  return localServerStatusCache;
}

/**
 * Attempt ultra-fast local native execution via backend server
 */
async function tryLocalExecution(code, languageId, stdin = '', filename = '') {
  // Only attempt if on local machine with native backend runner
  if (!isLocalEnvironment()) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        languageId,
        stdin,
        filename,
        preferLocal: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && !result.useClientRunner && typeof result.success === 'boolean') {
        return result;
      }
    }
  } catch {
    // Fall back to in-browser / cloud execution
  }
  return null;
}

/**
 * Execute code with optimal execution engine
 */
export async function executeCode(code, languageId, stdin = '', allFiles = [], filename = '') {
  const config = getConfig();

  const withCompilerMeta = (res) => {
    if (!res || typeof res !== 'object') return res;
    if (!res.compilerInfo) {
      res.compilerInfo = getCompilationIdentifier(getLanguageById(languageId), filename);
    }
    return res;
  };

  if (config.mockExecution) {
    return withCompilerMeta(mockExecute(code, languageId, stdin));
  }

  // Fast client cache for repeated identical runs (instant 0ms response)
  const cacheKey = `${languageId}:${(stdin || '').trim()}:${code.trim()}`;
  if (clientExecutionCache.has(cacheKey)) {
    const cached = clientExecutionCache.get(cacheKey);
    return withCompilerMeta({ ...cached, time: '0.001', cached: true });
  }

  // 0. Try Fast Local Native Backend Runner (Only on local machine with native compilers)
  const isCloudForced = typeof localStorage !== 'undefined' && localStorage.getItem('fullcode_engine_mode') === 'cloud';
  if (isLocalEnvironment() && !isCloudForced && languageId !== 0 && languageId !== 1 && languageId !== 710) {
    try {
      const localRes = await tryLocalExecution(code, languageId, stdin, filename);
      if (localRes && (localRes.isLocal || localRes.engine === 'local' || localRes.engine === 'sqlite')) {
        clientExecutionCache.set(cacheKey, localRes);
        return withCompilerMeta(localRes);
      }
    } catch {
      // Local backend unreachable or not supported; continue to in-browser / cloud execution
    }
  }

  // 1. Python — Use in-browser WebAssembly with NumPy, Pandas, Matplotlib
  if (languageId === 71) {
    try {
      const res = await executePythonInBrowser(code, stdin);
      if (res) clientExecutionCache.set(cacheKey, res);
      return withCompilerMeta(res);
    } catch (e) {
      console.warn('Pyodide failed, trying Godbolt cloud compiler:', e);
      // Fallback: try Godbolt, then Wandbox
      return withCompilerMeta(await cloudExecuteWithFallback(code, languageId, stdin));
    }
  }

  // 1b. Jupyter Notebook (.ipynb) — Run all code cells in appropriate engine
  if (languageId === 710) {
    try {
      let combinedCode = code;
      let notebookLanguage = 'python';
      try {
        const parsed = JSON.parse(code);
        if (parsed) {
          const specLang =
            parsed.metadata?.kernelspec?.language ||
            parsed.metadata?.language_info?.name ||
            parsed.cells?.find((c) => c.metadata?.language)?.metadata?.language;
          if (specLang) {
            notebookLanguage = String(specLang).toLowerCase();
          }
          if (Array.isArray(parsed.cells)) {
            combinedCode = parsed.cells
              .filter((c) => c.cell_type === 'code')
              .map((c) => (Array.isArray(c.source) ? c.source.join('') : c.source || ''))
              .join('\n\n');
          }
        }
      } catch (err) {
        // Raw code fallback
      }

      // Check code content fallback if language wasn't explicit
      if (notebookLanguage === 'python') {
        if (/\bclass\s+\w+|\bSystem\.(out|err)\.|\bScanner\b|\bimport\s+java\.|\bpublic\s+(class|static|void)/.test(combinedCode)) {
          notebookLanguage = 'java';
        } else if (/\b#include\s*<iostream>|\bcout\s*<<|\bcin\s*>>|\busing\s+namespace\s+std/.test(combinedCode)) {
          notebookLanguage = 'cpp';
        }
      }

      if (notebookLanguage === 'java') {
        const prepared = prepareJavaCellCode(combinedCode);
        return await executeCode(prepared, 62, stdin);
      }
      if (notebookLanguage === 'cpp' || notebookLanguage === 'c++') {
        const prepared = prepareCppCellCode(combinedCode);
        return await executeCode(prepared, 54, stdin);
      }
      if (notebookLanguage === 'javascript' || notebookLanguage === 'js') {
        return await executeJavaScriptInBrowser(combinedCode, stdin);
      }
      if (notebookLanguage === 'c') {
        const prepared = prepareCCellCode(combinedCode);
        return await executeCode(prepared, 50, stdin);
      }

      return await executePythonInBrowser(combinedCode, stdin);
    } catch (e) {
      return {
        success: false,
        output: '',
        error: e.message || 'Notebook execution failed',
        time: '0.000',
        memory: 0,
        statusCode: 1,
      };
    }
  }

  // 2. JavaScript — Use in-browser runner
  if (languageId === 63) {
    const res = await executeJavaScriptInBrowser(code, stdin);
    if (res) clientExecutionCache.set(cacheKey, res);
    return res;
  }

  // 3. HTML — Launch live HTML page in a new browser tab
  if (languageId === 0) {
    return launchHtmlInBrowser(code, allFiles);
  }

  // 4. CSS — Preview stylesheet in HTML page in new tab
  if (languageId === 1) {
    return launchCssInBrowser(code, allFiles);
  }

  // 5. SQL — Native SQLite Backend Engine with In-Browser Fallback
  if (languageId === 82) {
    let activeDatabase = undefined;
    if (typeof localStorage !== 'undefined') {
      activeDatabase = localStorage.getItem('fullcode_active_db') || undefined;
    }

    // Try native backend SQLite first ONLY when running on local machine
    if (isLocalEnvironment()) {
      try {
        const response = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, languageId: 82, database: activeDatabase }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result && typeof result.success === 'boolean') {
            if (result.sqlData?.database && typeof localStorage !== 'undefined') {
              localStorage.setItem('fullcode_active_db', result.sqlData.database);
            }
            // Notify DatabasePanel to refresh database explorer and sync active database
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('database-updated', {
                  detail: {
                    database: result.sqlData?.database,
                    table: result.sqlData?.previewTable,
                  },
                })
              );
            }
            return result;
          }
        }
      } catch (err) {
        console.warn('Backend SQL API unreachable, using in-browser SQL runner:', err.message);
      }
    }

    // In-browser SQL runner fallback (offline / serverless)
    try {
      const result = await executeSqlInBrowser(code);
      if (result) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('database-updated', {
              detail: { database: result.sqlData?.database },
            })
          );
        }
        return result;
      }
    } catch (err) {
      console.warn('In-browser SQL error:', err.message);
    }
  }

  // 6. Cloud Compiled Languages — Judge0 CE (fast primary) → Godbolt (secondary) → Wandbox (tertiary)
  let processedCode = code;
  if (languageId === 62) {
    processedCode = prepareJavaForExecution(code);
  }

  const result = await cloudExecuteWithFallback(processedCode, languageId, stdin);
  if (result && result.success && !result.error) {
    clientExecutionCache.set(cacheKey, result);
  }
  return withCompilerMeta(result);
}

/**
 * Preprocesses Java code to ensure 100% reliable execution in the sandbox:
 * 1. Automatically wraps bare statements without class/method into standard Main
 * 2. Renames class containing main() to 'class Main' so javac matches Main.java
 * 3. Demotes other public classes to package-private to avoid single-public-class errors
 * 4. Updates constructor names to match Main
 * 5. Strips package headers
 */
export function prepareJavaForExecution(code) {
  if (!code || typeof code !== 'string') return code;

  // 1. Strip package declaration (sandbox has flat directory structure)
  let clean = code.replace(/^\s*package\s+[\w.]+;\s*$/gm, '// package stripped');

  // Normalize any main/Main method signatures to canonical JVM entry point
  clean = normalizeJavaMainMethod(clean);

  // If code already contains class Main with main method, return clean as-is
  if (/\b(?:public\s+|final\s+|abstract\s+)*class\s+Main\b/.test(clean) && /\b(?:public\s+)?static\s+void\s+main\b/.test(clean)) {
    return clean;
  }

  // 2. Bare statements check (e.g. System.out.println("hello"))
  if (!/\b(?:class|record|enum|interface)\s+([A-Za-z0-9_$]+)/.test(clean)) {
    const lines = clean.split('\n');
    const imports = [];
    const body = [];
    for (const l of lines) {
      if (/^\s*import\s+[\w.*]+;\s*$/.test(l)) {
        imports.push(l.trim());
      } else {
        body.push(l);
      }
    }
    const impSet = new Set(['import java.util.*;', 'import java.io.*;', ...imports]);
    return `${Array.from(impSet).join('\n')}\n\nclass Main {\n    public static void main(String[] args) throws Throwable {\n${body.join('\n')}\n    }\n}`;
  }

  // 3. Find all top-level classes/records/enums
  const classRegex = /\b(?:public\s+)?(?:final\s+|abstract\s+)?(class|record|enum)\s+([A-Za-z0-9_$]+)/g;
  const classes = [];
  let match;
  while ((match = classRegex.exec(clean)) !== null) {
    classes.push({ name: match[2], index: match.index });
  }

  // 4. Ensure any main method has public static void main
  clean = clean.replace(/\b(?:private|protected)\s+static\s+void\s+main\b/g, 'public static void main');

  // 5. Find which class contains the main method
  const mainMatch = clean.match(/\bpublic\s+static\s+void\s+main\s*\(/) || clean.match(/\bstatic\s+void\s+main\s*\(/);
  let classWithMain = null;
  if (mainMatch) {
    const mainIndex = mainMatch.index;
    const preceding = classes.filter((c) => c.index < mainIndex);
    if (preceding.length > 0) {
      classWithMain = preceding[preceding.length - 1].name;
    }
  }

  // 6. Demote any public class / record / enum / interface to package-private
  // This automatically removes the "file class" restriction where the class name must match filename.
  clean = clean.replace(
    /\bpublic\s+(final\s+|abstract\s+)?(class|record|enum|interface)\s+([A-Za-z0-9_$]+)/g,
    (m, mod, type, name) => `${mod || ''}${type} ${name}`
  );

  // 7. Check if Main class already exists
  const hasMainClass = classes.some((c) => c.name === 'Main');

  if (hasMainClass) {
    // If Main does NOT contain main method, but another class does, inject forwarder into Main
    if (classWithMain && classWithMain !== 'Main') {
      clean = clean.replace(
        /(\b(?:final\s+|abstract\s+)?class\s+Main\b[^{]*\{)/,
        `$1\n    public static void main(String[] args) throws Throwable {\n        ${classWithMain}.main(args);\n    }`
      );
    }
  } else {
    // No Main class exists. Create class Main bridge AT THE TOP so Main is the first class!
    // IMPORTANT: Hoist all import statements above the bridge to avoid illegal Java
    // (imports must appear before any class/interface/enum definitions)
    const importLines = [];
    clean = clean.replace(/^\s*import\s+[\w.*]+;\s*$/gm, (m) => {
      importLines.push(m.trim());
      return ''; // Remove from original position
    });
    const importBlock = importLines.length > 0 ? importLines.join('\n') + '\n\n' : '';

    if (classWithMain) {
      clean = `${importBlock}class Main {\n    public static void main(String[] args) throws Throwable {\n        ${classWithMain}.main(args);\n    }\n}\n\n` + clean;
    } else {
      clean = `${importBlock}class Main {\n    public static void main(String[] args) throws Throwable {\n        // Code compiled successfully\n    }\n}\n\n` + clean;
    }
  }

  return clean;
}

// Judge0 CE Language IDs (ultra-fast containerized execution)
const JUDGE0_CE_LANGUAGES = {
  50: 50, // C (GCC 9.2.0)
  54: 54, // C++ (GCC 9.2.0)
  62: 62, // Java (OpenJDK 13.0.1)
  51: 51, // C# (Mono 6.6.0.161)
  60: 60, // Go (1.13.5)
  73: 73, // Rust (1.40.0)
  68: 68, // PHP (7.4.1)
  72: 72, // Ruby (2.7.0)
  78: 78, // Kotlin (1.3.70)
  74: 74, // TypeScript (3.7.4)
  83: 83, // Swift (5.2.3)
  81: 81, // Scala (2.13.2)
};

/**
 * Execute via Judge0 CE API (Ultra-fast synchronous execution)
 */
async function judge0CeExecute(code, languageId, stdin = '') {
  const judge0LangId = JUDGE0_CE_LANGUAGES[languageId];
  if (!judge0LangId) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const startTime = performance.now();
    const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: judge0LangId,
        stdin: stdin || '',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Judge0 CE returned HTTP ${response.status}`);
      return null;
    }

    let result = await response.json();
    let statusId = result.status?.id;

    // If still in queue or processing (1 = In Queue, 2 = Processing), do quick poll
    if (statusId === 1 || statusId === 2) {
      const token = result.token;
      if (token) {
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 250));
          try {
            const pollRes = await fetch(`https://ce.judge0.com/submissions/${token}?base64_encoded=false`);
            if (pollRes.ok) {
              result = await pollRes.json();
              statusId = result.status?.id;
              if (statusId > 2) break;
            }
          } catch (e) {
            break;
          }
        }
      }
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    // Status 3 = Accepted (Successful execution)
    if (statusId === 3) {
      return {
        success: true,
        output: result.stdout || '',
        error: result.stderr || '',
        time: result.time || elapsed,
        memory: result.memory || 0,
        statusCode: 0,
      };
    }

    // Status 6 = Compilation Error
    if (statusId === 6) {
      return {
        success: false,
        output: result.stdout || '',
        error: result.compile_output || result.stderr || 'Compilation Error',
        time: elapsed,
        memory: 0,
        statusCode: 1,
      };
    }

    // Status 4 = Wrong Answer, 5 = Time Limit Exceeded, 7-12 = Runtime Errors
    if (statusId && statusId > 3) {
      let errMsg = result.stderr || result.compile_output || result.message || result.status?.description || 'Execution Error';
      if (statusId === 5) {
        errMsg = 'Time Limit Exceeded (execution timed out). Check for infinite loops or provide required input.';
      }
      return {
        success: false,
        output: result.stdout || '',
        error: errMsg,
        time: result.time || elapsed,
        memory: result.memory || 0,
        statusCode: 1,
      };
    }

    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Judge0 CE execute error:', err.message);
    return null;
  }
}

/**
 * Execute via Piston Engine (emkc.org/api/v2/piston)
 * Fast containerized execution without keys
 */
async function pistonExecute(code, languageId, stdin = '') {
  const PISTON_LANGUAGES = {
    71: { language: 'python', version: '3.10.0' },
    54: { language: 'c++', version: '10.2.0' },
    50: { language: 'c', version: '10.2.0' },
    62: { language: 'java', version: '15.0.2', filename: 'Main.java' },
    51: { language: 'csharp.net', version: '6.12.0' },
    60: { language: 'go', version: '1.16.2' },
    73: { language: 'rust', version: '1.68.2' },
    68: { language: 'php', version: '8.2.3' },
    72: { language: 'ruby', version: '3.0.1' },
    78: { language: 'kotlin', version: '1.8.20' },
    83: { language: 'swift', version: '5.3.3' },
    81: { language: 'scala', version: '3.2.2' },
    74: { language: 'typescript', version: '5.0.3' },
  };

  const conf = PISTON_LANGUAGES[languageId];
  if (!conf) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  try {
    const startTime = performance.now();
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: conf.language,
        version: conf.version,
        files: [{ name: conf.filename || 'main', content: code }],
        stdin: stdin || '',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    if (data && data.run) {
      const exitCode = data.run.code ?? 0;
      const stdout = data.run.stdout || '';
      const stderr = data.run.stderr || '';

      if (exitCode === 0) {
        return {
          success: true,
          output: stdout || '(Program finished with no output)',
          error: null,
          time: elapsed,
          memory: 0,
          statusCode: 0,
        };
      } else {
        return {
          success: false,
          output: stdout,
          error: stderr || `Process exited with code ${exitCode}`,
          time: elapsed,
          memory: 0,
          statusCode: exitCode,
        };
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('Piston execute error:', e.message);
  }
  return null;
}

/**
 * Cloud execution with Judge0 CE (fast primary) → Piston (fast secondary) → Godbolt (tertiary) → Wandbox (quaternary)
 */
async function cloudExecuteWithFallback(code, languageId, stdin) {
  // 1. Try Judge0 CE first (Fastest: ~1-1.5s roundtrip vs 5-8s)
  try {
    const judge0Res = await judge0CeExecute(code, languageId, stdin);
    if (judge0Res) return judge0Res;
  } catch (err) {
    console.warn('Judge0 CE failed:', err.message, '— trying Piston fallback');
  }

  // 2. Try Piston runner
  try {
    const pistonRes = await pistonExecute(code, languageId, stdin);
    if (pistonRes) return pistonRes;
  } catch (err) {
    console.warn('Piston failed:', err.message, '— trying Godbolt fallback');
  }

  // 3. Try Godbolt Compiler Explorer
  const godboltCompiler = GODBOLT_COMPILERS[languageId];
  if (godboltCompiler) {
    try {
      const result = await godboltExecute(code, godboltCompiler, languageId, stdin);
      if (result) return result;
    } catch (err) {
      console.warn('Godbolt failed:', err.message, '— trying Wandbox fallback');
    }
  }

  // 4. Try Wandbox fallback
  const wandboxCompiler = WANDBOX_COMPILERS[languageId];
  if (wandboxCompiler) {
    try {
      const result = await wandboxExecute(code, wandboxCompiler, languageId, stdin);
      if (result) return result;
    } catch (err) {
      console.warn('Wandbox also failed:', err.message);
    }
  }

  // All APIs failed — show clear error instead of fake output
  return executionUnavailable(languageId);
}

/**
 * Execute via Godbolt Compiler Explorer API (godbolt.org)
 * Supports execution with stdin and returns stdout/stderr
 */
async function godboltExecute(code, compilerInfo, languageId, stdin) {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  // Godbolt compiles example.java, so 'public class Main' throws error that class Main is public and must be in Main.java
  const sourceCode = languageId === 62 ? code.replace(/\bpublic\s+class\s+Main\b/g, 'class Main') : code;

  try {
    const response = await fetch(`https://godbolt.org/api/compiler/${compilerInfo.id}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        source: sourceCode,
        options: {
          userArguments: '',
          executeParameters: {
            args: [],
            stdin: stdin || '',
          },
          filters: {
            execute: true,
          },
          skipAsm: true,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    if (!response.ok) {
      console.warn('Godbolt returned HTTP', response.status);
      return null; // Signal to try next fallback
    }

  const result = await response.json();

  // Check if execution actually ran
  const execResult = result.execResult;
  if (!execResult || !execResult.didExecute) {
    // Compilation might have failed
    const compileStderr = (result.stderr || []).map((s) => s.text).join('\n');
    const compileStdout = (result.stdout || []).map((s) => s.text).join('\n');

    if (compileStderr || result.code !== 0) {
      return {
        success: false,
        output: compileStdout,
        error: compileStderr || `Compilation failed (exit code ${result.code})`,
        time: elapsed,
        memory: 0,
        statusCode: result.code || 1,
      };
    }
    return null; // Unexpected response, try fallback
  }

  // Extract execution output
  const stdout = (execResult.stdout || []).map((s) => s.text).join('\n');
  const stderr = (execResult.stderr || []).map((s) => s.text).join('\n');
  const exitCode = execResult.code ?? 0;

  // Check for build errors (compilation succeeded but there may be warnings)
  const buildStderr = (execResult.buildResult?.stderr || []).map((s) => s.text).join('\n');
  const compilerWarnings = buildStderr || null;

  if (exitCode !== 0 || (stderr && !stdout)) {
    let errorMsg = stderr || `Program exited with code ${exitCode}`;

    if (errorMsg.includes('EOFError') || errorMsg.includes('EOF when reading a line')) {
      errorMsg +=
        '\n\n💡 Tip: Your code expects input. Switch to the "Input" tab and enter values, or click "Auto-Generate Input".';
    }

    return {
      success: false,
      output: stdout,
      error: errorMsg,
      time: elapsed,
      memory: 0,
      statusCode: exitCode || 1,
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
    clearTimeout(timeoutId);
    console.warn('Godbolt execute error:', err.message);
    return null;
  }
}

/**
 * Execute via Wandbox API (fallback)
 */
async function wandboxExecute(code, compiler, languageId, stdin) {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        compiler,
        stdin: stdin || '',
        save: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    if (!response.ok) {
      console.warn('Wandbox returned', response.status);
      return null; // Signal to try next fallback
    }

    const result = await response.json();

    const programOutput = result.program_output || result.program_message || '';
    const programError = result.program_error || '';
    const compilerError = result.compiler_error || result.compiler_message || '';
    const statusCode = result.status ?? '0';

    // Detect Wandbox server errors (like "Failed to get uid")
    if (programError.includes('Failed to get uid') || compilerError.includes('Failed to get uid')) {
      console.warn('Wandbox server error (uid failure)');
      return null; // Signal to try next fallback instead of returning fake result
    }

    const hasFailed =
      (statusCode !== '0' && statusCode !== 0) ||
      Boolean(programError) ||
      (Boolean(compilerError) && !programOutput);

    if (hasFailed) {
      let rawError = programError || compilerError || result.signal || 'Execution failed';

      if (rawError.includes('EOFError') || rawError.includes('EOF when reading a line')) {
        rawError +=
          '\n\n💡 Tip: Your code expects input. Switch to the "Input" tab and enter values, or click "Auto-Generate Input".';
      }

      return {
        success: false,
        output: programOutput,
        error: rawError,
        time: elapsed,
        memory: 0,
        statusCode: parseInt(statusCode) || 1,
      };
    }

    return {
      success: true,
      output: programOutput || '(Program finished with no output)',
      error: null,
      time: elapsed,
      memory: 0,
      statusCode: 0,
      compilerWarnings: compilerError || null,
    };
  } catch (err) {
    console.warn('Wandbox network error:', err.message);
    return null; // Signal to try next fallback
  }
}

/**
 * Show clear error when all execution backends are unavailable
 * Instead of showing fake "Hello, World!" output which is misleading
 */
function executionUnavailable(languageId) {
  const langName = LANGUAGE_NAMES[languageId] || 'this language';

  return {
    success: false,
    output: '',
    error:
      `⚠️ Cloud compiler temporarily unavailable for ${langName}.\n\n` +
      `The remote compilation services (Godbolt & Wandbox) are not responding.\n` +
      `This is a temporary issue — please try again in a few seconds.\n\n` +
      `💡 Tip: Python and JavaScript run locally in your browser and are always available.`,
    time: '0.000',
    memory: 0,
    statusCode: 1,
  };
}

/**
 * Mock execution fallback (only used when mockExecution is explicitly enabled in settings)
 */
function mockExecute(code, languageId, stdin) {
  return new Promise((resolve) => {
    const delay = 100 + Math.random() * 200;
    setTimeout(() => {
      const output = generateMockOutput(code, languageId, stdin);
      resolve({
        success: true,
        output,
        error: null,
        time: (delay / 1000).toFixed(3),
        memory: 1024,
        statusCode: 0,
      });
    }, delay);
  });
}

function generateMockOutput(code, langId, stdin) {
  if (stdin && stdin.trim()) {
    const lines = stdin.trim().split('\n');
    const firstNum = parseInt(lines[0]);
    if (!isNaN(firstNum) && firstNum <= 10) {
      return lines.slice(1, firstNum + 1).join('\n') + '\n';
    }
    return stdin.trim() + '\n';
  }

  const outputs = {
    71: 'Hello, World!\n',
    54: 'Hello, World!\n',
    50: 'Hello, World!\n',
    62: 'Hello, World!\n',
    63: 'Hello, World!\n',
    74: 'Hello, World!\n',
    51: 'Hello, World!\n',
    78: 'Hello, World!\n',
    83: 'Hello, World!\n',
    60: 'Hello, World!\n',
    73: 'Hello, World!\n',
    68: 'Hello, World!\n',
    72: 'Hello, World!\n',
    80: '[1] "Hello, World!"\n',
    85: 'Hello, World!\n',
    81: 'Hello, World!\n',
    82: 'id | name    | score\n1  | Alice   | 95.5\n',
    0: '<!DOCTYPE html> rendered successfully.\n',
    1: 'CSS validated successfully.\n',
  };

  return outputs[langId] || 'Program executed successfully.\n';
}

/**
 * Launch HTML in a new browser tab with optional bundled CSS & JS from open tabs
 */
function launchHtmlInBrowser(htmlCode, allFiles = []) {
  const startTime = performance.now();

  try {
    let finalHtml = htmlCode.trim();

    // Collect open CSS files
    const cssFiles = allFiles.filter((f) => f.name.endsWith('.css') || f.language?.id === 1);
    const cssContent = cssFiles.map((f) => f.content).join('\n\n');

    // Collect open JS files
    const jsFiles = allFiles.filter(
      (f) => (f.name.endsWith('.js') || f.language?.id === 63) && !f.name.endsWith('.json')
    );
    const jsContent = jsFiles.map((f) => f.content).join('\n\n');

    // If it's a snippet without <html> or <body>, wrap it nicely
    if (!/<html[\s>]/i.test(finalHtml)) {
      finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeForge AI — Live Preview</title>
  ${cssContent ? `<style>\n${cssContent}\n</style>` : ''}
</head>
<body>
  ${finalHtml}
  ${jsContent ? `<script>\n${jsContent}\n</script>` : ''}
</body>
</html>`;
    } else {
      // Inject CSS into <head>
      if (cssContent) {
        if (/<\/head>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/head>/i, `<style>\n${cssContent}\n</style>\n</head>`);
        } else {
          finalHtml = `<style>\n${cssContent}\n</style>\n` + finalHtml;
        }
      }
      // Inject JS before </body>
      if (jsContent) {
        if (/<\/body>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/body>/i, `<script>\n${jsContent}\n</script>\n</body>`);
        } else {
          finalHtml = finalHtml + `\n<script>\n${jsContent}\n</script>`;
        }
      }
    }

    // Create a Blob HTML URL
    const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
    const previewUrl = URL.createObjectURL(blob);

    // Open in a new tab
    const newWindow = window.open(previewUrl, '_blank');
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    return {
      success: true,
      output: `🚀 Live HTML preview launched in a new browser tab!\n\n🌐 Page URL:\n${previewUrl}\n\n✨ Status: Opened in a new browser tab.\nTip: Edit your HTML/CSS and click 'Run' again to re-render in a new tab.`,
      error: null,
      time: elapsed,
      memory: 0,
      statusCode: 0,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: 'Failed to launch HTML preview: ' + err.message,
      time: '0.001',
      memory: 0,
      statusCode: 1,
    };
  }
}

/**
 * Launch CSS Preview in a new browser tab
 */
function launchCssInBrowser(cssCode, allFiles = []) {
  const startTime = performance.now();

  try {
    const htmlFile = allFiles.find((f) => f.name.endsWith('.html') || f.language?.id === 0);
    const bodyContent = htmlFile ? htmlFile.content : `
<div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 2rem auto; text-align: center;">
  <h1>🎨 CSS Stylesheet Preview</h1>
  <p>Your CSS rules are applied to this preview page.</p>
  <button style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Sample Button</button>
</div>`;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeForge AI — CSS Preview</title>
  <style>
${cssCode}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const previewUrl = URL.createObjectURL(blob);
    window.open(previewUrl, '_blank');
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

    return {
      success: true,
      output: `🎨 CSS Preview launched in a new browser tab!\n\n🌐 Preview URL:\n${previewUrl}`,
      error: null,
      time: elapsed,
      memory: 0,
      statusCode: 0,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: 'Failed to launch CSS preview: ' + err.message,
      time: '0.001',
      memory: 0,
      statusCode: 1,
    };
  }
}
