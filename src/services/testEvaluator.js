// Test Case Evaluator Engine for Practice Questions
import { executeCode } from './judge0Service';

/**
 * Normalizes output string for fuzzy comparison (ignoring trailing whitespace/newlines & prompt strings)
 */
function normalizeOutput(out) {
  if (!out) return '';
  return out
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/^[^\n]*:\s*/i, '') // strip common prompt prefixes like "Enter number: "
    .trim()
    .toLowerCase();
}

/**
 * Checks if expected output is a wildcard or "any output" pattern
 */
function isAnyOutputPattern(expected) {
  if (!expected) return true;
  const lower = expected.trim().toLowerCase();
  return (
    lower === '*' ||
    lower === 'any' ||
    lower === 'any output' ||
    lower === 'any valid output' ||
    lower === 'any integer' ||
    lower === 'any number' ||
    lower.startsWith('any ') ||
    lower.includes('any output') ||
    lower.includes('any valid')
  );
}

/**
 * Evaluate user's code against a suite of test cases
 * @param {string} code - User's code
 * @param {object} language - Selected language object { id, monacoLanguage, name }
 * @param {Array} testCases - Array of { input, expectedOutput }
 * @returns {Promise<object>} - Evaluation result summary
 */
export async function evaluateTestCases(code, language, testCases = []) {
  if (!code || !code.trim()) {
    return {
      success: false,
      error: 'Code is empty. Please write a solution first.',
      results: [],
      passedCount: 0,
      totalCount: testCases.length,
    };
  }

  const results = [];
  let passedCount = 0;
  const langId = language?.id || 71;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const input = tc.input !== undefined ? String(tc.input) : '';
    const expected = String(tc.expectedOutput || '').trim();

    try {
      const startTime = performance.now();
      // executeCode automatically routes to Pyodide / JS browser runner / SQLite / Wandbox
      const runResult = await executeCode(code, langId, input);
      const elapsed = Math.round(performance.now() - startTime);

      if (runResult.status === 'error' || runResult.stderr || runResult.compile_output) {
        results.push({
          testIndex: i + 1,
          input,
          expected,
          actual: runResult.stderr || runResult.compile_output || 'Runtime Error',
          passed: false,
          executionTime: elapsed,
          error: runResult.stderr || runResult.compile_output || 'Runtime Error',
        });
      } else {
        const actualOutput = runResult.output || '';
        const normalizedActual = normalizeOutput(actualOutput);
        const normalizedExpected = normalizeOutput(expected);

        // Check if expected is "any output" or flexible match
        const isWildcard = isAnyOutputPattern(expected);
        const isPassed =
          (isWildcard && actualOutput.trim().length > 0 && actualOutput !== '(Program finished with no output)') ||
          normalizedActual === normalizedExpected ||
          normalizedActual.endsWith(normalizedExpected) ||
          normalizedActual.includes(normalizedExpected);

        if (isPassed) passedCount++;

        results.push({
          testIndex: i + 1,
          input,
          expected: expected || 'Any valid output',
          actual: actualOutput.trim(),
          passed: isPassed,
          executionTime: elapsed,
          error: null,
        });
      }
    } catch (err) {
      results.push({
        testIndex: i + 1,
        input,
        expected,
        actual: err.message || 'Execution failed',
        passed: false,
        executionTime: 0,
        error: err.message || 'Execution failed',
      });
    }
  }

  const allPassed = passedCount === testCases.length && testCases.length > 0;

  return {
    success: true,
    allPassed,
    passedCount,
    totalCount: testCases.length,
    results,
  };
}
