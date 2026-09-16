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

  // 2. Check if starting with numbers followed by letters (e.g. "01java" -> "java_01")
  const leadingDigitsLettersMatch = newStem.match(/^(\d+)([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
  if (leadingDigitsLettersMatch) {
    const digits = leadingDigitsLettersMatch[1];
    const letters = leadingDigitsLettersMatch[2];
    newStem = `${letters}_${digits}`;
  } else if (/^\d+$/.test(newStem)) {
    // Purely numeric (e.g. "01" -> "file_01")
    newStem = `file_${newStem}`;
  }

  // 3. Fallback if empty
  if (!newStem || newStem === '_') {
    newStem = ext ? `file_01` : `file`;
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
 * e.g. "java_01" -> "Java_01", "hello_world" -> "HelloWorld"
 */
export function getJavaClassNameFromStem(stem) {
  if (!stem) return 'Main';
  // Capitalize first letter
  let className = stem.charAt(0).toUpperCase() + stem.slice(1);
  // Ensure valid Java identifier: must start with [A-Za-z_$]
  if (!/^[a-zA-Z_$]/.test(className)) {
    className = `Class_${className}`;
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
    return javaCode.replace(classRegex, `public class ${className}`);
  }
  return javaCode;
}
