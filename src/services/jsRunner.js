// In-Browser JavaScript Execution Runner
// Captures console.log, console.error, and expressions with instant execution

export async function executeJavaScriptInBrowser(code, stdin = '') {
  const startTime = performance.now();
  const logs = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  const stringify = (args) =>
    args
      .map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

  console.log = (...args) => logs.push(stringify(args));
  console.warn = (...args) => logs.push('[warn] ' + stringify(args));
  console.error = (...args) => logs.push('[error] ' + stringify(args));
  console.info = (...args) => logs.push(stringify(args));

  const inputLines = stdin ? stdin.split('\n') : [];
  let inputIdx = 0;
  const promptPolyfill = () => {
    if (inputIdx < inputLines.length) {
      return inputLines[inputIdx++];
    }
    return '';
  };

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction('prompt', 'stdin', code);
    await runner(promptPolyfill, stdin);

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    const outputText = logs.join('\n');

    return {
      success: true,
      output: outputText || '(Program finished with no output)',
      error: null,
      time: elapsed,
      memory: 0,
      statusCode: 0,
    };
  } catch (err) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
    return {
      success: false,
      output: logs.join('\n'),
      error: err.stack || err.message || 'JavaScript Execution Error',
      time: elapsed,
      memory: 0,
      statusCode: 1,
    };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.info = originalInfo;
  }
}
