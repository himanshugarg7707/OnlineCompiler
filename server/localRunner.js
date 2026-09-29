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

  try {
    // 1. Python 3 (languageId: 71)
    if (languageId === 71) {
      if (!compilers.python3) {
        return { canExecuteLocally: false, reason: 'Python 3 not found on system' };
      }
      const filePath = path.join(tempDir, 'main.py');
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
      };
    }

    // 2. JavaScript / Node.js (languageId: 63)
    if (languageId === 63) {
      if (!compilers.node) {
        return { canExecuteLocally: false, reason: 'Node.js not found on system' };
      }
      const filePath = path.join(tempDir, 'main.js');
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
      };
    }

    // 3. TypeScript (languageId: 74)
    if (languageId === 74) {
      if (!compilers.node) {
        return { canExecuteLocally: false, reason: 'Node.js not found on system' };
      }
      const filePath = path.join(tempDir, 'main.ts');
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
      };
    }

    // 4. C (languageId: 50)
    if (languageId === 50) {
      const cCompiler = compilers.clang || compilers.gcc;
      if (!cCompiler) {
        return { canExecuteLocally: false, reason: 'C compiler (clang/gcc) not found' };
      }
      const srcPath = path.join(tempDir, 'main.c');
      const outPath = path.join(tempDir, 'main.out');
      fs.writeFileSync(srcPath, code, 'utf8');

      // Compile
      const compileRes = await runProcess(cCompiler, ['-O2', srcPath, '-o', outPath, '-lm'], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Compilation Error:\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
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
      };
    }

    // 5. C++ (languageId: 54)
    if (languageId === 54) {
      const cppCompiler = compilers.clangpp || compilers.gpp;
      if (!cppCompiler) {
        return { canExecuteLocally: false, reason: 'C++ compiler (clang++/g++) not found' };
      }
      const srcPath = path.join(tempDir, 'main.cpp');
      const outPath = path.join(tempDir, 'main.out');
      fs.writeFileSync(srcPath, code, 'utf8');

      // Compile
      const compileRes = await runProcess(cppCompiler, ['-std=c++17', '-O2', srcPath, '-o', outPath], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Compilation Error:\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
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
      };
    }

    // 6. Java (languageId: 62)
    if (languageId === 62) {
      if (!compilers.javac || !compilers.java) {
        return { canExecuteLocally: false, reason: 'Java compiler (javac/java) not found' };
      }

      // Detect entrypoint class name (the one containing main(), or public class, or Main)
      let className = 'Main';
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
      const srcPath = path.join(tempDir, `${className}.java`);
      fs.writeFileSync(srcPath, code, 'utf8');

      // Compile
      const compileRes = await runProcess(compilers.javac, [srcPath], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Java Compilation Error:\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
        };
      }

      // Run
      const execRes = await runProcess(compilers.java, ['-cp', tempDir, className], { cwd: tempDir }, stdin);
      return {
        success: execRes.success,
        output: execRes.stdout,
        error: execRes.stderr,
        time: execRes.time,
        statusCode: execRes.exitCode,
        isLocal: true,
        engine: 'local',
      };
    }

    // 7. Go (languageId: 60)
    if (languageId === 60) {
      if (!compilers.go) {
        return { canExecuteLocally: false, reason: 'Go compiler not found' };
      }
      const srcPath = path.join(tempDir, 'main.go');
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
      };
    }

    // 8. Swift (languageId: 83)
    if (languageId === 83) {
      if (!compilers.swift) {
        return { canExecuteLocally: false, reason: 'Swift compiler not found' };
      }
      const srcPath = path.join(tempDir, 'main.swift');
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
      };
    }

    // 9. Rust (languageId: 73)
    if (languageId === 73) {
      if (!compilers.rustc) {
        return { canExecuteLocally: false, reason: 'Rust compiler (rustc) not found' };
      }
      const srcPath = path.join(tempDir, 'main.rs');
      const outPath = path.join(tempDir, 'main.out');
      fs.writeFileSync(srcPath, code, 'utf8');

      const compileRes = await runProcess(compilers.rustc, ['-O', srcPath, '-o', outPath], { cwd: tempDir });
      if (!compileRes.success) {
        return {
          success: false,
          output: '',
          error: `Rust Compilation Error:\n${compileRes.stderr || compileRes.stdout}`,
          time: compileRes.time,
          statusCode: 1,
          isLocal: true,
          engine: 'local',
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
