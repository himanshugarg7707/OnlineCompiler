/**
 * Java Preprocessor & Entry Point Resolver
 * Preprocesses Java code to ensure 100% reliable execution in online and cloud sandboxes
 * (Judge0 CE, Godbolt, Wandbox, Piston, and local javac/java).
 *
 * Supports:
 * - Java 21-26 instance void main() and Unnamed / Implicitly Declared Classes (JEP 445 / 463 / 477 / 495)
 * - Automatic java.io.IO helper bridge (IO.print, IO.println, IO.readln)
 * - Co-existence of helper classes (e.g. class Node, class Tree) alongside top-level main
 * - Renaming of entry point class to Main and constructor harmonization
 * - Package declaration stripping for flat sandbox directories
 */

/**
 * Safely replaces whole-word identifier tokens in source code while preserving
 * string literals, character literals, single-line comments, and multi-line comments.
 */
export function replaceJavaIdentifierSafely(source, fromIdent, toIdent) {
  if (!source || !fromIdent || fromIdent === toIdent) return source;
  const tokens = [];
  const placeholderPrefix = `__JAVA_LITERAL_${Date.now()}_`;

  // Mask strings and comments so their contents are never altered
  const masked = source.replace(/("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, (match) => {
    const idx = tokens.length;
    tokens.push(match);
    return `${placeholderPrefix}${idx}__`;
  });

  const regex = new RegExp(`\\b${fromIdent}\\b`, 'g');
  const replaced = masked.replace(regex, toIdent);

  // Restore masked strings and comments
  return replaced.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, 'g'), (_, idx) => {
    return tokens[parseInt(idx, 10)] ?? '';
  });
}

/**
 * Normalizes user-written Java main methods into canonical standard JVM entrypoint:
 * - C#-style / Java 21 instance main (e.g. `void main()`, `void Main(String[] args)`)
 * - Array syntax variations (e.g. `String args[]`, `String... args`, `String[] args`)
 */
export function normalizeJavaMainMethod(code) {
  if (!code || typeof code !== 'string') return code;
  let res = code;

  // 1. Capitalized Main with public static -> public static void main(
  res = res.replace(
    /\bpublic\s+static\s+void\s+Main\s*\(/g,
    'public static void main('
  );

  // 2. Convert protected/private static void main/Main -> public static void main(
  res = res.replace(
    /\b(?:protected|private)\s+static\s+void\s+main\s*\(/gi,
    'public static void main('
  );

  // 3. Package-private: static void main NOT preceded by public, protected, or private
  res = res.replace(
    /(?<!\b(?:public|protected|private)\s+)\bstatic\s+void\s+main\s*\(/gi,
    'public static void main('
  );

  // 4. Instance main in Java 21-26: normalize typo capitalized Main to main, preserve instance void main()
  res = res.replace(
    /\b(?:public\s+|protected\s+|private\s+)?void\s+Main\s*\(/g,
    'void main('
  );

  // 5. Clean up any parameter variations for public static void main
  res = res.replace(
    /\b(public\s+static\s+void\s+main\s*\()\s*String\s*\[\s*\]\s*args\s*\)/g,
    '$1String[] args)'
  );
  res = res.replace(
    /\b(public\s+static\s+void\s+main\s*\()\s*String\s+(\w+)\s*\[\s*\]\s*\)/g,
    '$1String[] $2)'
  );
  res = res.replace(
    /\b(public\s+static\s+void\s+main\s*\()\s*String\s*\.\.\.\s*(\w+)\s*\)/g,
    '$1String[] $2)'
  );
  res = res.replace(
    /\b(public\s+static\s+void\s+main\s*\()\s*\)/g,
    '$1String[] args)'
  );

  // 6. Safety deduplication: ensure no repeated 'public' modifier
  res = res.replace(/\bpublic\s*public\b/g, 'public');

  return res;
}

/**
 * Preprocesses Java code to ensure 100% reliable execution in online and cloud sandboxes (Judge0 CE, Godbolt, Wandbox, Piston):
 * 1. Strips package headers (sandboxes compile in a flat directory).
 * 2. Distinguishes class-enclosed main vs. top-level implicitly declared classes (Java 21-26).
 * 3. Keeps sibling classes intact (e.g. Node, Tree, Helper) without incorrectly renaming them to Main.
 * 4. Demotes public classes to package-private to avoid filename mismatch errors.
 * 5. Guarantees a canonical `public static void main(String[] args)` JVM entry point (including bridge for Java 21-26 instance `void main()`).
 * 6. Injects fallback `class IO` for standard input/output when `IO.print`/`IO.println`/`IO.readln` are used.
 */
export function prepareJavaForExecution(code) {
  if (!code || typeof code !== 'string') return code;

  // 1. Strip package declaration (sandbox has flat directory structure)
  let clean = code.replace(/^\s*package\s+[\w.]+;\s*$/gm, '// package stripped');
  clean = clean.replace(/\bpublic\s*public\b/g, 'public');

  // Mask string literals and comments while preserving EXACT character offsets
  const masked = clean.replace(/("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, (match) => {
    return match.replace(/[^\n]/g, ' ');
  });

  // Find all classes/records/enums/interfaces at depth 0
  const classes = [];
  const declRegex = /(?:^|\n)\s*(?:(?:public|protected|private|static|final|abstract)\s+)*(class|record|enum|interface)\s+([A-Za-z0-9_$]+)/g;
  let match;
  while ((match = declRegex.exec(masked)) !== null) {
    const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
    const kind = match[1];
    const name = match[2];
    const openBrace = masked.indexOf('{', start);
    if (openBrace !== -1) {
      let cDepth = 1;
      let j = openBrace + 1;
      while (j < masked.length && cDepth > 0) {
        if (masked[j] === '{') cDepth++;
        else if (masked[j] === '}') cDepth--;
        j++;
      }
      classes.push({
        name,
        kind,
        start,
        bodyStart: openBrace,
        end: j,
        code: clean.substring(start, j),
      });
      declRegex.lastIndex = j;
    }
  }

  // Find main method
  const mainRegex = /\b(?:(?:public|protected|private)\s+)?(?:static\s+)?void\s+main\s*\(/g;
  let mainMatch = null;
  let m;
  while ((m = mainRegex.exec(masked)) !== null) {
    mainMatch = { index: m.index, match: m[0] };
    break;
  }

  // Determine if main is enclosed in one of the declared classes
  let enclosingClass = null;
  if (mainMatch) {
    for (const cls of classes) {
      if (mainMatch.index > cls.bodyStart && mainMatch.index < cls.end) {
        enclosingClass = cls;
        break;
      }
    }
  }

  const ioFallback = `\n\nclass IO {
    public static void print(Object o) { System.out.print(o); }
    public static void print() {}
    public static void println(Object o) { System.out.println(o); }
    public static void println() { System.out.println(); }
    public static String readln(String prompt) {
        if (prompt != null) System.out.print(prompt);
        try { return new java.util.Scanner(System.in).nextLine(); } catch (Exception e) { return ""; }
    }
    public static String readln() { return readln(null); }
}`;

  // CASE 1: Top-level main (Java 21-26 implicit class) OR bare statements outside any class
  if (!enclosingClass) {
    // Separate imports, declared classes, and top-level remaining body
    const imports = [];
    const classSpans = classes.map((c) => ({ start: c.start, end: c.end }));

    // Extract non-class parts
    let nonClassText = '';
    let lastEnd = 0;
    for (const span of classSpans) {
      if (span.start > lastEnd) {
        nonClassText += clean.substring(lastEnd, span.start) + '\n';
      }
      lastEnd = Math.max(lastEnd, span.end);
    }
    if (lastEnd < clean.length) {
      nonClassText += clean.substring(lastEnd);
    }

    const nonClassLines = nonClassText.split('\n');
    const remainingLines = [];
    for (const line of nonClassLines) {
      if (/^\s*import\s+[\w.*]+;\s*$/.test(line.trim())) {
        imports.push(line.trim());
      } else {
        remainingLines.push(line);
      }
    }

    const impSet = new Set(['import java.util.*;', 'import java.io.*;', ...imports]);
    const topLevelBody = remainingLines.join('\n').trim();

    // Check what kind of main method or statements exist in topLevelBody
    const hasCanonicalStaticMain = /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*args\s*\)/.test(topLevelBody);
    const hasAnyStaticMain = /\b(?:public\s+)?static\s+void\s+main\s*\(/.test(topLevelBody);
    const hasInstanceVoidMain = /\bvoid\s+main\s*\(\s*\)/.test(topLevelBody);
    const hasInstanceVoidMainWithArgs = /\bvoid\s+main\s*\(\s*String\s*\[\s*\]\s*args\s*\)/.test(topLevelBody);
    const instanceMethodMatch = topLevelBody.match(/(?:^|\n)\s*(?:(?:public|protected|private)\s+)?void\s+([A-Za-z0-9_$]+)\s*\(\s*\)/);
    const instanceMethodWithArgsMatch = topLevelBody.match(/(?:^|\n)\s*(?:(?:public|protected|private)\s+)?void\s+([A-Za-z0-9_$]+)\s*\(\s*String\s*\[\s*\]\s*args\s*\)/);

    let wrappedMainClass = '';
    if (hasCanonicalStaticMain) {
      wrappedMainClass = `class Main {\n${topLevelBody}\n}`;
    } else if (hasAnyStaticMain) {
      const normalizedBody = topLevelBody.replace(
        /\b(?:private|protected|public)?\s*static\s+void\s+main\s*\([^)]*\)/,
        'public static void main(String[] args)'
      );
      wrappedMainClass = `class Main {\n${normalizedBody}\n}`;
    } else if (hasInstanceVoidMain) {
      wrappedMainClass = `class Main {\n${topLevelBody}\n\n    public static void main(String[] args) throws Throwable {\n        new Main().main();\n    }\n}`;
    } else if (hasInstanceVoidMainWithArgs) {
      wrappedMainClass = `class Main {\n${topLevelBody}\n\n    public static void main(String[] args) throws Throwable {\n        new Main().main(args);\n    }\n}`;
    } else if (instanceMethodMatch) {
      const targetMethod = instanceMethodMatch[1];
      wrappedMainClass = `class Main {\n${topLevelBody}\n\n    public static void main(String[] args) throws Throwable {\n        new Main().${targetMethod}();\n    }\n}`;
    } else if (instanceMethodWithArgsMatch) {
      const targetMethod = instanceMethodWithArgsMatch[1];
      wrappedMainClass = `class Main {\n${topLevelBody}\n\n    public static void main(String[] args) throws Throwable {\n        new Main().${targetMethod}(args);\n    }\n}`;
    } else if (topLevelBody) {
      // Loose statements (e.g. IO.println("hello"))
      wrappedMainClass = `class Main {\n    public static void main(String[] args) throws Throwable {\n${topLevelBody}\n    }\n}`;
    } else {
      wrappedMainClass = `class Main {\n    public static void main(String[] args) throws Throwable {\n        // Code compiled successfully\n    }\n}`;
    }

    // Demote any public modifiers on sibling classes
    const sanitizedClasses = classes.map((c) => {
      return c.code.replace(
        /\bpublic\s+(final\s+|abstract\s+)?(class|record|enum|interface)\s+([A-Za-z0-9_$]+)/g,
        (m, mod, type, name) => `${mod || ''}${type} ${name}`
      );
    });

    let result = `${Array.from(impSet).join('\n')}\n\n${sanitizedClasses.join('\n\n')}\n\n${wrappedMainClass}`;

    if (/\bIO\.(print|println|readln)\b/.test(result) && !/\bclass\s+IO\b/.test(result)) {
      result += ioFallback;
    }

    return result;
  }

  // CASE 2: Main method is enclosed inside one of the declared classes (enclosingClass)
  // Demote all public classes so javac never complains about filename mismatch
  clean = clean.replace(
    /\bpublic\s+(final\s+|abstract\s+)?(class|record|enum|interface)\s+([A-Za-z0-9_$]+)/g,
    (m, mod, type, name) => `${mod || ''}${type} ${name}`
  );

  // If enclosing class is not Main, rename it to Main
  const targetClassName = enclosingClass.name;
  if (targetClassName !== 'Main') {
    const existingMain = classes.find((c) => c.name === 'Main');
    if (existingMain) {
      clean = clean.replace(/\bclass\s+Main\b/g, 'class OldMain');
    }
    clean = replaceJavaIdentifierSafely(clean, targetClassName, 'Main');
  }

  // Ensure class Main contains canonical static main entry point
  const hasCanonicalStaticMain = /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*args\s*\)/.test(clean);
  const hasAnyStaticMain = /\b(?:public\s+)?static\s+void\s+main\s*\(/.test(clean);
  const hasInstanceVoidMain = /\bvoid\s+main\s*\(\s*\)/.test(clean);
  const hasInstanceVoidMainWithArgs = /\bvoid\s+main\s*\(\s*String\s*\[\s*\]\s*args\s*\)/.test(clean);
  const instanceMethodMatch = clean.match(/(?:^|\n)\s*(?:(?:public|protected|private)\s+)?void\s+([A-Za-z0-9_$]+)\s*\(\s*\)/);
  const instanceMethodWithArgsMatch = clean.match(/(?:^|\n)\s*(?:(?:public|protected|private)\s+)?void\s+([A-Za-z0-9_$]+)\s*\(\s*String\s*\[\s*\]\s*args\s*\)/);

  if (!hasCanonicalStaticMain) {
    if (hasAnyStaticMain) {
      clean = clean.replace(
        /\b(?:private|protected|public)?\s*static\s+void\s+main\s*\([^)]*\)/,
        'public static void main(String[] args)'
      );
    } else if (hasInstanceVoidMain) {
      clean = clean.replace(
        /(\bclass\s+Main\b[^{]*\{)/,
        `$1\n    public static void main(String[] args) throws Throwable {\n        new Main().main();\n    }`
      );
    } else if (hasInstanceVoidMainWithArgs) {
      clean = clean.replace(
        /(\bclass\s+Main\b[^{]*\{)/,
        `$1\n    public static void main(String[] args) throws Throwable {\n        new Main().main(args);\n    }`
      );
    } else if (instanceMethodMatch) {
      const targetMethod = instanceMethodMatch[1];
      clean = clean.replace(
        /(\bclass\s+Main\b[^{]*\{)/,
        `$1\n    public static void main(String[] args) throws Throwable {\n        new Main().${targetMethod}();\n    }`
      );
    } else if (instanceMethodWithArgsMatch) {
      const targetMethod = instanceMethodWithArgsMatch[1];
      clean = clean.replace(
        /(\bclass\s+Main\b[^{]*\{)/,
        `$1\n    public static void main(String[] args) throws Throwable {\n        new Main().${targetMethod}(args);\n    }`
      );
    }
  }

  if (/\bIO\.(print|println|readln)\b/.test(clean) && !/\bclass\s+IO\b/.test(clean)) {
    clean += ioFallback;
  }

  return clean;
}
