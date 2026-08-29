// Code Formatting Service for multi-language beautification

/**
 * Format code using intelligent indentation rules and syntax normalization
 * @param {string} code - Source code string
 * @param {string} langId - Language identifier
 * @returns {string} - Formatted clean code
 */
export function formatCode(code, langId) {
  if (!code || typeof code !== 'string') return code;

  const lines = code.split('\n');
  const formattedLines = [];
  let indentLevel = 0;
  const indentSize = 4;
  const indentStr = ' '.repeat(indentSize);

  // Language specific bracket / block tokens
  const isPython = langId === 'python' || langId === 'py';
  const isSql = langId === 'sql';

  if (isSql) {
    // SQL keyword uppercasing and clause splitting
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'UPDATE', 'DELETE FROM',
      'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY',
      'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'CREATE TABLE', 'DROP TABLE',
      'ALTER TABLE', 'VALUES', 'SET', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
      'LIKE', 'IS NULL', 'IS NOT NULL', 'AS', 'ON', 'DISTINCT',
    ];

    let sqlFormatted = code;
    sqlKeywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      sqlFormatted = sqlFormatted.replace(regex, kw);
    });

    return sqlFormatted.trim();
  }

  if (isPython) {
    // Python indentation cleanup
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) {
        formattedLines.push('');
        continue;
      }

      // Check if line decreases indent (dedent)
      if (/^(return|pass|break|continue|raise)\b/.test(trimmed)) {
        formattedLines.push(indentStr.repeat(Math.max(0, indentLevel)) + trimmed);
      } else if (/^(elif|else|except|finally):/.test(trimmed)) {
        formattedLines.push(indentStr.repeat(Math.max(0, indentLevel - 1)) + trimmed);
      } else {
        formattedLines.push(indentStr.repeat(Math.max(0, indentLevel)) + trimmed);
      }

      // If line ends with :, increase next line indent
      if (trimmed.endsWith(':')) {
        indentLevel++;
      }
    }
    return formattedLines.join('\n').trim();
  }

  // C-style languages (C, C++, Java, JS, TS, C#, PHP, Rust, Kotlin, etc.)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Count closing braces at start of line
    const leadingCloseBraces = (trimmed.match(/^(\}+|\)+|\]+)/) || [''])[0].length;
    const currentIndent = Math.max(0, indentLevel - leadingCloseBraces);

    formattedLines.push(indentStr.repeat(currentIndent) + trimmed);

    // Calculate net brace change
    const openBraces = (trimmed.match(/[\{\(\[]/g) || []).length;
    const closeBraces = (trimmed.match(/[\}\)\]]/g) || []).length;
    indentLevel = Math.max(0, indentLevel + openBraces - closeBraces);
  }

  return formattedLines.join('\n').trim();
}

/**
 * Trigger Monaco Editor's built-in formatting action or fallback to custom formatter
 */
export async function triggerEditorFormat(editor, monaco, code, langId) {
  if (editor) {
    try {
      const formatAction = editor.getAction('editor.action.formatDocument');
      if (formatAction && formatAction.isSupported()) {
        await formatAction.run();
        return;
      }
    } catch {
      // Fallback
    }

    // Fallback format
    const formatted = formatCode(code, langId);
    if (formatted && formatted !== code) {
      editor.setValue(formatted);
    }
  }
}
