// Filename and Identifier Sanitizer Service
// Enforces valid programming language identifiers for files
// Example: "01java.java" -> "java_01.java", "01.java" -> "file_01.java", "my-test.py" -> "my_test.py"

/**
 * Sanitizes a filename stem to be a valid programming language identifier.
 * - Leading digits with letters (e.g. "01java") -> "java_01"
 * - Purely numeric (e.g. "01", "123") -> "file_01", "file_123"
 * - Invalid characters (hyphens, spaces, special chars) -> replaced by underscores
 * - Reserved or empty names -> given sensible defaults
 *
 * @param {string} fullPath - Can be "01java.java" or "folder/sub/01java.java"
 * @returns {{ sanitizedPath: string, wasAdjusted: boolean, originalName: string, stem: string, ext: string }}
 */
export function sanitizeFilenameIdentifier(fullPath) {
  if (!fullPath || typeof fullPath !== 'string') {
    return {
      sanitizedPath: 'file_01.txt',
      wasAdjusted: true,
      originalName: String(fullPath || ''),
      stem: 'file_01',
      ext: 'txt',
    };
  }

  const trimmed = fullPath.trim();
  const lastSlash = trimmed.lastIndexOf('/');
  const folderPrefix = lastSlash !== -1 ? trimmed.substring(0, lastSlash + 1) : '';
  const rawFileName = lastSlash !== -1 ? trimmed.substring(lastSlash + 1) : trimmed;

  // Separate extension from base name
  // Note: Handle special multi-dot extensions like .ipynb or .tar.gz if needed, but standard is last dot
  const lastDot = rawFileName.lastIndexOf('.');
  let stem = '';
  let ext = '';

  if (lastDot === -1) {
    stem = rawFileName;
    ext = '';
  } else if (lastDot === 0) {
    // Hidden file like .gitignore or .ipynb
    stem = rawFileName.slice(1);
    ext = '';
  } else {
    stem = rawFileName.substring(0, lastDot);
    ext = rawFileName.substring(lastDot + 1);
  }

  let originalStem = stem;
  let newStem = stem;

  // 1. Replace spaces, hyphens, and invalid symbols with underscores
  newStem = newStem.replace(/[\s\-.]+/g, '_');
  // Remove any non-alphanumeric characters except underscore and dollar sign
  newStem = newStem.replace(/[^a-zA-Z0-9_$]/g, '');

  // 2. Format stem based on language compilation identifier rules
  const lowerExt = (ext || '').toLowerCase();
  const leadingDigitsLettersMatch = newStem.match(/^(\d+)([a-zA-Z_$][a-zA-Z0-9_$]*)$/);

  if (lowerExt === 'java') {
    // Java requires valid PascalCase class identifiers
    if (/^\d+$/.test(newStem)) {
      newStem = `Solution${newStem.padStart(2, '0')}`;
    } else if (leadingDigitsLettersMatch) {
      const digits = leadingDigitsLettersMatch[1];
      const letters = leadingDigitsLettersMatch[2];
      const capLetters = letters.charAt(0).toUpperCase() + letters.slice(1);
      newStem = `${capLetters}_${digits}`;
    } else if (!newStem || newStem === '_') {
      newStem = 'Solution01';
    } else {
      newStem = newStem.charAt(0).toUpperCase() + newStem.slice(1);
    }
  } else if (lowerExt === 'cs' || lowerExt === 'kt') {
    // C# and Kotlin prefer PascalCase identifiers
    if (/^\d+$/.test(newStem)) {
      newStem = `Program${newStem.padStart(2, '0')}`;
    } else if (!newStem || newStem === '_') {
      newStem = 'Program01';
    } else {
      newStem = newStem.charAt(0).toUpperCase() + newStem.slice(1);
    }
  } else {
    // Python, C, C++, JavaScript, Rust, Go prefer snake_case identifiers
    if (leadingDigitsLettersMatch) {
      const digits = leadingDigitsLettersMatch[1];
      const letters = leadingDigitsLettersMatch[2];
      newStem = `${letters}_${digits}`;
    } else if (/^\d+$/.test(newStem)) {
      newStem = `solution_${newStem.padStart(2, '0')}`;
    } else if (!newStem || newStem === '_') {
      newStem = ext ? `solution_01` : `file`;
    }
  }

  // Ensure no consecutive underscores
  newStem = newStem.replace(/_{2,}/g, '_');
  // Remove trailing underscore if present, unless it was intentional
  if (newStem.length > 1 && newStem.endsWith('_') && !originalStem.endsWith('_')) {
    newStem = newStem.slice(0, -1);
  }

  const finalFileName = ext ? `${newStem}.${ext}` : newStem;
  const sanitizedPath = folderPrefix ? `${folderPrefix}${finalFileName}` : finalFileName;
  const wasAdjusted = sanitizedPath !== trimmed;

  return {
    sanitizedPath,
    wasAdjusted,
    originalName: rawFileName,
    stem: newStem,
    ext,
  };
}

/**
 * Converts a sanitized stem into a standard Java class name (PascalCase valid identifier)
 * e.g. "solution_01" -> "Solution01", "hello_world" -> "HelloWorld"
 */
export function getJavaClassNameFromStem(stem) {
  if (!stem) return 'Main';
  // Convert snake_case to PascalCase for clean Java class naming
  let cleaned = stem.replace(/_([a-zA-Z0-9])/g, (_, ch) => ch.toUpperCase());
  let className = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  // Ensure valid Java identifier: must start with [A-Za-z_$]
  if (!/^[a-zA-Z_$]/.test(className)) {
    className = `Solution_${className}`;
  }
  return className;
}

/**
 * Adjusts Java starter template code to match the sanitized filename's class name
 */
export function syncJavaClassWithFilename(javaCode, filename) {
  if (!javaCode || !filename) return javaCode;
  const { stem, ext } = sanitizeFilenameIdentifier(filename);
  if (ext.toLowerCase() !== 'java') return javaCode;

  const className = getJavaClassNameFromStem(stem);
  // Replace public class <OldClass> with public class <className>
  const classRegex = /public\s+class\s+([a-zA-Z0-9_$]+)/;
  if (classRegex.test(javaCode)) {
    const match = javaCode.match(classRegex);
    const oldClass = match[1];
    if (oldClass === className) return javaCode;
    let updated = javaCode.replace(classRegex, `public class ${className}`);
    // Also update constructor calls so it never leaves broken constructors
    updated = updated.replace(new RegExp(`\\b${oldClass}\\s*\\(`, 'g'), `${className}(`);
    return updated;
  }
  return javaCode;
}
