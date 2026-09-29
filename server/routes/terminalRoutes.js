import { Router } from 'express';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = Router();

// Track session working directories
let defaultWorkspaceCwd = process.cwd();

// GET /api/terminal/info - Get terminal environment information
router.get('/info', (req, res) => {
  const isServerless = Boolean(process.env.VERCEL);
  const homeDir = os.homedir();
  const username = os.userInfo().username || 'developer';
  const hostname = os.hostname() || 'fullcode-mac';

  res.json({
    isLocal: !isServerless,
    platform: process.platform,
    shell: process.platform === 'darwin' ? '/bin/zsh' : (process.env.SHELL || '/bin/bash'),
    username,
    hostname,
    defaultCwd: defaultWorkspaceCwd,
    homeDir,
    nodeVersion: process.version,
  });
});

// POST /api/terminal/exec - Execute real shell command in local terminal
router.post('/exec', async (req, res) => {
  if (process.env.VERCEL) {
    return res.status(403).json({
      success: false,
      stdout: '',
      stderr: 'Terminal execution is disabled in cloud serverless mode. Open FullCode macOS App or run "npm run dev" locally for real native terminal.',
      exitCode: 1,
      cwd: '/',
    });
  }

  const { command, cwd: requestedCwd } = req.body;
  const startTime = performance.now();

  if (!command || !command.trim()) {
    return res.json({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      cwd: requestedCwd || defaultWorkspaceCwd,
      time: '0.000',
    });
  }

  const trimmedCmd = command.trim();
  let workingDir = requestedCwd || defaultWorkspaceCwd;

  // Verify working directory exists
  try {
    if (!fs.existsSync(workingDir)) {
      workingDir = defaultWorkspaceCwd;
    }
  } catch {
    workingDir = defaultWorkspaceCwd;
  }

  // Handle 'cd' commands directly in Node
  if (trimmedCmd === 'cd' || trimmedCmd.startsWith('cd ')) {
    const target = trimmedCmd.slice(2).trim();
    let newPath;

    if (!target || target === '~') {
      newPath = os.homedir();
    } else if (target === '-') {
      newPath = defaultWorkspaceCwd;
    } else if (path.isAbsolute(target)) {
      newPath = target;
    } else {
      newPath = path.resolve(workingDir, target);
    }

    try {
      if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
        return res.json({
          success: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          cwd: newPath,
          time: elapsed,
        });
      } else {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
        return res.json({
          success: false,
          stdout: '',
          stderr: `cd: no such file or directory: ${target}`,
          exitCode: 1,
          cwd: workingDir,
          time: elapsed,
        });
      }
    } catch (err) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
      return res.json({
        success: false,
        stdout: '',
        stderr: `cd: ${err.message}`,
        exitCode: 1,
        cwd: workingDir,
        time: elapsed,
      });
    }
  }

  // Execute command using user's shell
  const shell = process.platform === 'darwin' ? '/bin/zsh' : (process.env.SHELL || '/bin/bash');
  const timeoutMs = 20000; // 20s max for interactive terminal commands

  let stdout = '';
  let stderr = '';
  let isTimedOut = false;

  try {
    const child = spawn(shell, ['-l', '-c', trimmedCmd], {
      cwd: workingDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        FORCE_COLOR: '1',
      },
    });

    const timer = setTimeout(() => {
      isTimedOut = true;
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 500000) {
        stdout = stdout.slice(0, 500000) + '\n... [Terminal output capped at 500KB]';
        try { child.kill('SIGTERM'); } catch {}
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 250000) {
        stderr = stderr.slice(0, 250000) + '\n... [Stderr capped]';
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
      res.json({
        success: false,
        stdout,
        stderr: err.message,
        exitCode: 1,
        cwd: workingDir,
        time: elapsed,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

      if (isTimedOut) {
        return res.json({
          success: false,
          stdout,
          stderr: (stderr ? stderr + '\n' : '') + '⏱️ Command execution timed out (limit: 20s).',
          exitCode: 124,
          cwd: workingDir,
          time: elapsed,
        });
      }

      res.json({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code ?? 0,
        cwd: workingDir,
        time: elapsed,
      });
    });
  } catch (err) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    res.json({
      success: false,
      stdout: '',
      stderr: `Failed to execute: ${err.message}`,
      exitCode: 1,
      cwd: workingDir,
      time: elapsed,
    });
  }
});

export default router;
