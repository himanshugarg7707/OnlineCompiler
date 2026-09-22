// Code Execution Engine
// Uses WebAssembly Pyodide for Python (with full NumPy support)
// Uses In-Browser runner for JavaScript
// Uses Godbolt Compiler Explorer API (primary) + Wandbox API (fallback)
// for C, C++, Java, C#, Go, Rust, Ruby, PHP, R, Perl, Scala, Swift, Kotlin, TypeScript

import { getConfig } from './configService';
import { executePythonInBrowser } from './pythonRunner';
import { executeJavaScriptInBrowser } from './jsRunner';
import { executeSqlInBrowser } from './sqlRunner';
import { prepareJavaCellCode, prepareCppCellCode, prepareCCellCode } from './languageDetector';

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

/**
 * Execute code with optimal execution engine
 */
export async function executeCode(code, languageId, stdin = '', allFiles = []) {
  const config = getConfig();

  if (config.mockExecution) {
    return mockExecute(code, languageId, stdin);
  }

  // Fast client cache for repeated identical runs (instant 0ms response)
  const cacheKey = `${languageId}:${(stdin || '').trim()}:${code.trim()}`;
  if (clientExecutionCache.has(cacheKey)) {
    const cached = clientExecutionCache.get(cacheKey);
    return { ...cached, time: '0.001', cached: true };
  }

  // 1. Python — Use in-browser WebAssembly with NumPy, Pandas, Matplotlib
  if (languageId === 71) {
    try {
      const res = await executePythonInBrowser(code, stdin);
      if (res) clientExecutionCache.set(cacheKey, res);
      return res;
    } catch (e) {
      console.warn('Pyodide failed, trying Godbolt cloud compiler:', e);
      // Fallback: try Godbolt, then Wandbox
      return cloudExecuteWithFallback(code, languageId, stdin);
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

    // Try native backend SQLite first (full SQL support: DDL, DML, joins, aggregates like sum/count/avg)
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

  // 6. Cloud Compiled Languages — Godbolt (primary) → Wandbox (fallback)
  // Preprocess Java: replace 'public class' with 'class' and strip package header
  let processedCode = code;
  if (languageId === 62) {
    processedCode = code
      .replace(/\bpublic\s+class\b/g, 'class')
      .replace(/^\s*package\s+[\w.]+;\s*$/gm, '// package stripped');
  }

  const result = await cloudExecuteWithFallback(processedCode, languageId, stdin);
  if (result && (result.success || result.error)) {
    clientExecutionCache.set(cacheKey, result);
  }
  return result;
}

/**
 * Cloud execution with Godbolt → Wandbox → error message fallback chain
 */
async function cloudExecuteWithFallback(code, languageId, stdin) {
  // Try Godbolt first
  const godboltCompiler = GODBOLT_COMPILERS[languageId];
  if (godboltCompiler) {
    try {
      const result = await godboltExecute(code, godboltCompiler, languageId, stdin);
      if (result) return result;
    } catch (err) {
      console.warn('Godbolt failed:', err.message, '— trying Wandbox fallback');
    }
  }

  // Try Wandbox as fallback
  const wandboxCompiler = WANDBOX_COMPILERS[languageId];
  if (wandboxCompiler) {
    try {
      const result = await wandboxExecute(code, wandboxCompiler, languageId, stdin);
      if (result) return result;
    } catch (err) {
      console.warn('Wandbox also failed:', err.message);
    }
  }

  // Both APIs failed — show clear error instead of fake output
  return executionUnavailable(languageId);
}

/**
 * Execute via Godbolt Compiler Explorer API (godbolt.org)
 * Supports execution with stdin and returns stdout/stderr
 */
async function godboltExecute(code, compilerInfo, languageId, stdin) {
  const startTime = performance.now();

  const response = await fetch(`https://godbolt.org/api/compiler/${compilerInfo.id}/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      source: code,
      options: {
        userArguments: '',
        executeParameters: {
          args: '',
          stdin: stdin || '',
        },
        filters: {
          execute: true,
        },
      },
    }),
  });

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
    compilerWarnings,
  };
}

/**
 * Execute via Wandbox API (fallback)
 */
async function wandboxExecute(code, compiler, languageId, stdin) {
  const startTime = performance.now();

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
    });

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
