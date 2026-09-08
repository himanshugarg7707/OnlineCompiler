/**
 * Real-time Multi-Language Syntax Validator
 * Inspects code in real-time as the developer types and extracts line/column syntax errors.
 * Compatible with Monaco Editor Markers API.
 */

// Simple bracket pair stack validator
function checkBracketMatching(code) {
  const lines = code.split('\n');
  const stack = [];
  const errors = [];

  const openPairs = { '{': '}', '(': ')', '[': ']' };
  const closePairs = { '}': '{', ')': '(', ']': '[' };

  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let inString = null; // '"', "'", '`'
    let isEscaped = false;

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      const nextChar = line[colIdx + 1];

      // Handle comments
      if (!inString) {
        if (!inBlockComment && char === '/' && nextChar === '*') {
          inBlockComment = true;
          colIdx++;
          continue;
        }
        if (inBlockComment && char === '*' && nextChar === '/') {
          inBlockComment = false;
          colIdx++;
          continue;
        }
        if (!inBlockComment && (char === '/' && nextChar === '/' || char === '#')) {
          break; // Rest of line is single-line comment
        }
      }

      if (inBlockComment) continue;

      // Handle strings
      if (inString) {
        if (char === '\\' && !isEscaped) {
          isEscaped = true;
          continue;
        }
        if (char === inString && !isEscaped) {
          inString = null;
        }
        isEscaped = false;
        continue;
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = char;
          continue;
        }
      }

      // Check brackets
      if (openPairs[char]) {
        stack.push({ char, line: lineIdx + 1, col: colIdx + 1 });
      } else if (closePairs[char]) {
        if (stack.length === 0) {
          errors.push({
            startLineNumber: lineIdx + 1,
            startColumn: colIdx + 1,
            endLineNumber: lineIdx + 1,
            endColumn: colIdx + 2,
            message: `Unexpected closing '${char}' with no matching opening bracket`,
            severity: 8, // Monaco MarkerSeverity.Error
          });
        } else {
          const last = stack.pop();
          if (last.char !== closePairs[char]) {
            errors.push({
              startLineNumber: lineIdx + 1,
              startColumn: colIdx + 1,
              endLineNumber: lineIdx + 1,
              endColumn: colIdx + 2,
              message: `Mismatched bracket: expected '${openPairs[last.char]}' to close '${last.char}' from line ${last.line}, but found '${char}'`,
              severity: 8,
            });
          }
        }
      }
    }

    // Unterminated single-line string check (except template literals `)
    if (inString && inString !== '`') {
      errors.push({
        startLineNumber: lineIdx + 1,
        startColumn: 1,
        endLineNumber: lineIdx + 1,
        endColumn: line.length + 1,
        message: `Unclosed string literal starting with ${inString}`,
        severity: 8,
      });
    }
  }

  // Any leftover unclosed opening brackets
  while (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push({
      startLineNumber: unclosed.line,
      startColumn: unclosed.col,
      endLineNumber: unclosed.line,
      endColumn: unclosed.col + 1,
      message: `Unclosed bracket '${unclosed.char}'`,
      severity: 8,
    });
  }

  return errors;
}

// JavaScript / TypeScript Parser
function validateJavaScript(code) {
  const errors = checkBracketMatching(code);
  if (errors.length > 0) return errors;

  try {
    // Check using native Function parser constructor
    new Function(code);
  } catch (err) {
    // Attempt to extract line and column from error message
    const lineMatch = err.message.match(/line (\d+)/i) || err.stack?.match(/:(\d+):(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
    const col = lineMatch && lineMatch[2] ? parseInt(lineMatch[2], 10) : 1;

    errors.push({
      startLineNumber: Math.max(1, line),
      startColumn: Math.max(1, col),
      endLineNumber: Math.max(1, line),
      endColumn: Math.max(1, col) + 5,
      message: err.message,
      severity: 8,
    });
  }

  return errors;
}

// JSON Validator
function validateJSON(code) {
  if (!code.trim()) return [];
  try {
    JSON.parse(code);
    return [];
  } catch (err) {
    const posMatch = err.message.match(/position (\d+)/i);
    let line = 1;
    let col = 1;
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const sub = code.slice(0, pos);
      const splitLines = sub.split('\n');
      line = splitLines.length;
      col = splitLines[splitLines.length - 1].length + 1;
    }
    return [
      {
        startLineNumber: line,
        startColumn: col,
        endLineNumber: line,
        endColumn: col + 2,
        message: `JSON Syntax Error: ${err.message}`,
        severity: 8,
      },
    ];
  }
}

// Python Validator
function validatePython(code) {
  const errors = checkBracketMatching(code);
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check statements requiring colon
    const needsColonRegex = /^(def\s+\w+\s*\(.*\)|if\s+.+|elif\s+.+|else|for\s+.+\s+in\s+.+|while\s+.+|class\s+\w+.*|try|except.*|finally|with\s+.+)$/;
    if (needsColonRegex.test(trimmed) && !trimmed.endsWith(':')) {
      errors.push({
        startLineNumber: i + 1,
        startColumn: line.length,
        endLineNumber: i + 1,
        endColumn: line.length + 1,
        message: `Python syntax: expected ':' at end of statement`,
        severity: 8,
      });
    }

    // Check invalid print statement in Python 3
    if (/^print\s+["'][^)]+/.test(trimmed)) {
      errors.push({
        startLineNumber: i + 1,
        startColumn: line.indexOf('print') + 1,
        endLineNumber: i + 1,
        endColumn: line.indexOf('print') + 6,
        message: `Missing parentheses in call to 'print'. Did you mean print(...)?`,
        severity: 8,
      });
    }
  }

  return errors;
}

// Java / C++ / C / C# Validator
function validateJavaCpp(code, langId) {
  const errors = checkBracketMatching(code);
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Common missing semicolon check for simple statements
    if (
      trimmed &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('#') &&
      !trimmed.endsWith('{') &&
      !trimmed.endsWith('}') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith(':') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith('\\')
    ) {
      // If it looks like a variable assignment or return statement
      if (
        /^(return|int|long|double|float|boolean|char|String|auto|var)\s+.+=.+/.test(trimmed) ||
        /^(System\.out\.println|cout|printf)\s*\(.+/.test(trimmed) ||
        /^(import|package)\s+[\w.]+/.test(trimmed)
      ) {
        errors.push({
          startLineNumber: i + 1,
          startColumn: line.length,
          endLineNumber: i + 1,
          endColumn: line.length + 1,
          message: `Expected ';' at end of statement`,
          severity: 8,
        });
      }
    }
  }

  return errors;
}

/**
 * Main validator entry point
 * @param {string} code 
 * @param {string|number} languageIdOrName 
 * @returns {Array<{startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number, message: string, severity: number}>}
 */
export function validateCodeSyntax(code, languageIdOrName) {
  if (!code || typeof code !== 'string') return [];

  const lang = String(languageIdOrName).toLowerCase();

  if (lang.includes('json')) {
    return validateJSON(code);
  }

  if (lang.includes('javascript') || lang.includes('js') || lang.includes('typescript') || lang.includes('ts')) {
    return validateJavaScript(code);
  }

  if (lang.includes('python') || lang.includes('py')) {
    return validatePython(code);
  }

  if (
    lang.includes('java') ||
    lang.includes('cpp') ||
    lang.includes('c++') ||
    lang.includes('csharp') ||
    lang.includes('c')
  ) {
    return validateJavaCpp(code, lang);
  }

  // Fallback to bracket matching
  return checkBracketMatching(code);
}
