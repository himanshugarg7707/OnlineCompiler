import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache discovered compiler paths to avoid repeated `which` lookups
let cachedCompilers = null;

/**
 * Detect available compilers and interpreters on the local system
 */
export async function detectLocalCompilers() {
  if (cachedCompilers) return cachedCompilers;

  // On restricted serverless environments like Vercel, local execution is disabled
  if (process.env.VERCEL) {
    cachedCompilers = { available: false, isServerless: true, compilers: {} };
    return cachedCompilers;
  }

  const binaries = [
    { key: 'python3', cmd: 'python3' },
    { key: 'node', cmd: 'node' },
    { key: 'clang', cmd: 'clang' },
    { key: 'clangpp', cmd: 'clang++' },
    { key: 'gcc', cmd: 'gcc' },
    { key: 'gpp', cmd: 'g++' },
    { key: 'javac', cmd: 'javac' },
    { key: 'java', cmd: 'java' },
    { key: 'go', cmd: 'go' },
    { key: 'swift', cmd: 'swift' },
    { key: 'rustc', cmd: 'rustc' },
    { key: 'sqlite3', cmd: 'sqlite3' },
    { key: 'zsh', cmd: 'zsh' },
    { key: 'bash', cmd: 'bash' },
  ];

  const found = {};
  await Promise.all(
    binaries.map(async ({ key, cmd }) => {
      try {
        const { stdout } = await execAsync(`which ${cmd} 2>/dev/null`);
        const trimmed = stdout.trim();
        if (trimmed) {
          found[key] = trimmed;
        }
      } catch {
        // Not found on system
      }
    })
  );

  cachedCompilers = {
    available: Object.keys(found).length > 0,
    isLocal: true,
    platform: process.platform,
    compilers: found,
  };

  return cachedCompilers;
}

/**
 * Execute a command with input, timeout, and memory management
 */
function runProcess(command, args, options = {}, stdinData = '') {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const timeoutMs = options.timeoutMs || 10000;

    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    let child;
    try {
      child = spawn(command, args, {
        cwd: options.cwd || os.tmpdir(),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          NODE_NO_WARNINGS: '1',
        },
        shell: options.shell || false,
      });
    } catch (err) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
      return resolve({
        success: false,
        stdout: '',
        stderr: `Failed to spawn process: ${err.message}`,
        exitCode: 1,
        time: elapsed,
      });
    }

    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {}
    }, timeoutMs);

    if (stdinData) {
      try {
        child.stdin.write(stdinData);
        child.stdin.end();
      } catch {}
    } else {
      try {
        child.stdin.end();
      } catch {}
    }

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
      // Cap at 1MB to prevent terminal freeze
      if (stdout.length > 1000000) {
        stdout = stdout.slice(0, 1000000) + '\n... [Output truncated at 1MB]';
        try { child.kill('SIGTERM'); } catch {}
      }
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 500000) {
        stderr = stderr.slice(0, 500000) + '\n... [Error output truncated]';
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
      resolve({
        success: false,
        stdout,
        stderr: (stderr ? stderr + '\n' : '') + err.message,
        exitCode: 1,
        time: elapsed,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

      if (isTimedOut) {
        return resolve({
          success: false,
          stdout,
          stderr: (stderr ? stderr + '\n' : '') + '⏱️ Execution timed out (limit: 10s). Check for infinite loops or provide required input.',
          exitCode: 124,
          time: elapsed,
        });
      }

      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code ?? 0,
        time: elapsed,
      });
    });
  });
}

/**
 * Execute code using local system compilers
 * @param {Object} params - { code, languageId, stdin, filename }
 */
export async function executeCodeLocally({ code, languageId, stdin = '', filename = '' }) {
  const compilerInfo = await detectLocalCompilers();
  if (!compilerInfo.available) {
    return {
      canExecuteLocally: false,
      reason: 'Local execution is not available in this environment.',
    };
  }

  const { compilers } = compilerInfo;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fullcode-run-'));
  const cleanFilename = filename ? path.basename(filename) : '';

  try {
    // 1. Python 3 (languageId: 71)
    if (languageId === 71) {
      if (!compilers.python3) {
        return { canExecuteLocally: false, reason: 'Python 3 not found on system' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.py')) ? cleanFilename : 'main.py';
      const filePath = path.join(tempDir, srcName);
      fs.writeFileSync(filePath, code, 'utf8');
      const res = await runProcess(compilers.python3, ['-u', filePath], { cwd: tempDir }, stdin);
      return {
        success: res.success,
        output: res.stdout,
        error: res.stderr,
        time: res.time,
        statusCode: res.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'Python 3.12 (CPython)',
        compilerCommand: `python3 -u ${srcName}`,
      };
    }

    // 2. JavaScript / Node.js (languageId: 63)
    if (languageId === 63) {
      if (!compilers.node) {
        return { canExecuteLocally: false, reason: 'Node.js not found on system' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.js')) ? cleanFilename : 'index.js';
      const filePath = path.join(tempDir, srcName);
      fs.writeFileSync(filePath, code, 'utf8');
      const res = await runProcess(compilers.node, [filePath], { cwd: tempDir }, stdin);
      return {
        success: res.success,
        output: res.stdout,
        error: res.stderr,
        time: res.time,
        statusCode: res.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'Node.js (V8 Engine)',
        compilerCommand: `node ${srcName}`,
      };
    }

    // 3. TypeScript (languageId: 74)
    if (languageId === 74) {
      if (!compilers.node) {
        return { canExecuteLocally: false, reason: 'Node.js not found on system' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.ts')) ? cleanFilename : 'index.ts';
      const filePath = path.join(tempDir, srcName);
      fs.writeFileSync(filePath, code, 'utf8');
      // Node 22+ runs TS directly or with --experimental-strip-types
      const res = await runProcess(compilers.node, ['--experimental-strip-types', filePath], { cwd: tempDir }, stdin);
      return {
        success: res.success,
        output: res.stdout,
        error: res.stderr,
        time: res.time,
        statusCode: res.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'TypeScript 5.6 (Node.js)',
        compilerCommand: `node --strip-types ${srcName}`,
      };
    }

    // 4. C (languageId: 50)
    if (languageId === 50) {
      const cCompiler = compilers.clang || compilers.gcc;
      if (!cCompiler) {
        return { canExecuteLocally: false, reason: 'C compiler (clang/gcc) not found' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.c')) ? cleanFilename : 'main.c';
      const outName = srcName.replace(/\.c$/, '.out');
      const srcPath = path.join(tempDir, srcName);
      const outPath = path.join(tempDir, outName);
      fs.writeFileSync(srcPath, code, 'utf8');

      const compName = compilers.clang ? 'Clang C Compiler' : 'GCC C Compiler';
      // Compile
      const compileRes = await runProcess(cCompiler, ['-O2', srcPath, '-o', outPath, '-lm'], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Compilation Error (${compName}):\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
          compiler: compName,
          compilerCommand: `gcc -O2 ${srcName} -o ${outName} -lm`,
        };
      }

      // Execute binary
      const execRes = await runProcess(outPath, [], { cwd: tempDir }, stdin);
      return {
        success: execRes.success,
        output: execRes.stdout,
        error: execRes.stderr,
        time: execRes.time,
        statusCode: execRes.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: compName,
        compilerCommand: `gcc -O2 ${srcName} -o ${outName} && ./${outName}`,
      };
    }

    // 5. C++ (languageId: 54)
    if (languageId === 54) {
      const cppCompiler = compilers.clangpp || compilers.gpp;
      if (!cppCompiler) {
        return { canExecuteLocally: false, reason: 'C++ compiler (clang++/g++) not found' };
      }
      const srcName = (cleanFilename && (cleanFilename.endsWith('.cpp') || cleanFilename.endsWith('.cc'))) ? cleanFilename : 'main.cpp';
      const outName = srcName.replace(/\.(cpp|cc)$/, '.out');
      const srcPath = path.join(tempDir, srcName);
      const outPath = path.join(tempDir, outName);
      fs.writeFileSync(srcPath, code, 'utf8');

      const compName = compilers.clangpp ? 'Apple Clang++ (C++17)' : 'G++ 13.2 (C++17)';
      // Compile
      const compileRes = await runProcess(cppCompiler, ['-std=c++17', '-O2', srcPath, '-o', outPath], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Compilation Error (${compName}):\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
          compiler: compName,
          compilerCommand: `g++ -std=c++17 -O2 ${srcName} -o ${outName}`,
        };
      }

      // Execute binary
      const execRes = await runProcess(outPath, [], { cwd: tempDir }, stdin);
      return {
        success: execRes.success,
        output: execRes.stdout,
        error: execRes.stderr,
        time: execRes.time,
        statusCode: execRes.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: compName,
        compilerCommand: `g++ -std=c++17 -O2 ${srcName} -o ${outName} && ./${outName}`,
      };
    }

    // 6. Java (languageId: 62)
    if (languageId === 62) {
      if (!compilers.javac || !compilers.java) {
        return { canExecuteLocally: false, reason: 'Java compiler (javac/java) not found' };
      }

      // Detect package name (e.g., "package HashMap;")
      const pkgMatch = code.match(/^\s*package\s+([A-Za-z0-9_$.]+)\s*;/m);
      const packageName = pkgMatch ? pkgMatch[1] : null;

      // Detect entrypoint class name (the one containing main(), or public class, or filename stem, or Main)
      let className = (cleanFilename && cleanFilename.endsWith('.java'))
        ? cleanFilename.replace(/\.java$/, '')
        : 'Main';

      const mainRegex = /\b(?:public\s+)?class\s+([A-Za-z0-9_$]+)\b[^{]*\{[^}]*?\b(?:public\s+)?static\s+void\s+main\b/s;
      const classWithMainMatch = code.match(mainRegex);
      if (classWithMainMatch) {
        className = classWithMainMatch[1];
      } else {
        const publicClassMatch = code.match(/\bpublic\s+class\s+([A-Za-z0-9_$]+)/);
        if (publicClassMatch) {
          className = publicClassMatch[1];
        } else if (/\bclass\s+Main\b/.test(code)) {
          className = 'Main';
        } else {
          const anyClassMatch = code.match(/\bclass\s+([A-Za-z0-9_$]+)/);
          if (anyClassMatch) {
            className = anyClassMatch[1];
          }
        }
      }

      // Create package directory structure if needed
      let srcPath;
      if (packageName) {
        const pkgDir = path.join(tempDir, ...packageName.split('.'));
        fs.mkdirSync(pkgDir, { recursive: true });
        srcPath = path.join(pkgDir, `${className}.java`);
      } else {
        srcPath = path.join(tempDir, `${className}.java`);
      }
      fs.writeFileSync(srcPath, code, 'utf8');

      // Compile with -d flag to output classes to tempDir root (respects package structure)
      const compileRes = await runProcess(compilers.javac, ['-d', tempDir, srcPath], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Java Compilation Error (javac):\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
          compiler: 'OpenJDK (javac 21)',
          compilerCommand: `javac ${className}.java`,
        };
      }

      // Run with package-qualified class name if package exists
      const runClass = packageName ? `${packageName}.${className}` : className;
      const execRes = await runProcess(compilers.java, ['-cp', tempDir, runClass], { cwd: tempDir }, stdin);
      return {
        success: execRes.success,
        output: execRes.stdout,
        error: execRes.stderr,
        time: execRes.time,
        statusCode: execRes.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'OpenJDK (javac / java 21)',
        compilerCommand: `javac ${className}.java && java ${runClass}`,
      };
    }

    // 7. Go (languageId: 60)
    if (languageId === 60) {
      if (!compilers.go) {
        return { canExecuteLocally: false, reason: 'Go compiler not found' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.go')) ? cleanFilename : 'main.go';
      const srcPath = path.join(tempDir, srcName);
      fs.writeFileSync(srcPath, code, 'utf8');
      const res = await runProcess(compilers.go, ['run', srcPath], { cwd: tempDir }, stdin);
      return {
        success: res.success,
        output: res.stdout,
        error: res.stderr,
        time: res.time,
        statusCode: res.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'Go Compiler (gc 1.23)',
        compilerCommand: `go run ${srcName}`,
      };
    }

    // 8. Swift (languageId: 83)
    if (languageId === 83) {
      if (!compilers.swift) {
        return { canExecuteLocally: false, reason: 'Swift compiler not found' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.swift')) ? cleanFilename : 'main.swift';
      const srcPath = path.join(tempDir, srcName);
      fs.writeFileSync(srcPath, code, 'utf8');
      const res = await runProcess(compilers.swift, [srcPath], { cwd: tempDir }, stdin);
      return {
        success: res.success,
        output: res.stdout,
        error: res.stderr,
        time: res.time,
        statusCode: res.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'Apple Swift 6.0 (LLVM)',
        compilerCommand: `swift ${srcName}`,
      };
    }

    // 9. Rust (languageId: 73)
    if (languageId === 73) {
      if (!compilers.rustc) {
        return { canExecuteLocally: false, reason: 'Rust compiler (rustc) not found' };
      }
      const srcName = (cleanFilename && cleanFilename.endsWith('.rs')) ? cleanFilename : 'main.rs';
      const outName = srcName.replace(/\.rs$/, '.out');
      const srcPath = path.join(tempDir, srcName);
      const outPath = path.join(tempDir, outName);
      fs.writeFileSync(srcPath, code, 'utf8');

      const compileRes = await runProcess(compilers.rustc, ['-O', srcPath, '-o', outPath], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Rust Compilation Error (rustc):\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
          compiler: 'rustc 1.82 (Rust 2021)',
          compilerCommand: `rustc -O ${srcName} -o ${outName}`,
        };
      }

      const execRes = await runProcess(outPath, [], { cwd: tempDir }, stdin);
      return {
        success: execRes.success,
        output: execRes.stdout,
        error: execRes.stderr,
        time: execRes.time,
        statusCode: execRes.exitCode,
        isLocal: true,
        engine: 'local',
        compiler: 'rustc 1.82 (Rust 2021)',
        compilerCommand: `rustc -O ${srcName} -o ${outName} && ./${outName}`,
      };
    }

    // 10. Bash / Shell (languageId: 46)
    if (languageId === 46) {
      const sh = compilers.zsh || compilers.bash || '/bin/sh';
      const srcPath = path.join(tempDir, 'script.sh');
      fs.writeFileSync(srcPath, code, 'utf8');
      const res = await runProcess(sh, [srcPath], { cwd: tempDir }, stdin);
      return {
        success: res.success,
        output: res.stdout,
        error: res.stderr,
        time: res.time,
        statusCode: res.exitCode,
        isLocal: true,
        engine: 'local',
      };
    }

    return {
      canExecuteLocally: false,
      reason: `Language ID ${languageId} is not configured for local execution`,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: `Local execution error: ${err.message}`,
      time: '0.000',
      statusCode: 1,
      isLocal: true,
      engine: 'local',
    };
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
