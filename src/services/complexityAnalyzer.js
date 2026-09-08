// ─── Time & Space Complexity Analyzer ─────────────────────────────────────
// Built-in static analysis engine — no API keys needed.
// Analyzes loops, recursion, data structures, and sorting calls to determine Big-O.

/**
 * Analyze code and return time/space complexity with breakdown
 * @param {string} code - Source code to analyze
 * @param {string|object} language - Language name or language object
 * @returns {{ time: string, space: string, breakdown: Array, tips: Array, confidence: string }}
 */
export function analyzeComplexity(code, language) {
  if (!code || !code.trim()) {
    return {
      time: '—',
      space: '—',
      breakdown: [],
      tips: [],
      confidence: 'none',
    };
  }

  const langName = typeof language === 'object' ? (language?.name || '') : (language || '');
  const lines = code.split('\n');
  const cleanCode = stripComments(code, langName);

  const breakdown = [];
  const tips = [];

  // ─── Detect Patterns ────────────────────────────────────────────────

  const loopAnalysis = analyzeLoops(cleanCode, lines);
  const recursionAnalysis = analyzeRecursion(cleanCode, langName);
  const dsAnalysis = analyzeDataStructures(cleanCode);
  const sortAnalysis = analyzeSortingCalls(cleanCode);
  const mathAnalysis = analyzeMathPatterns(cleanCode);

  // ─── Determine Time Complexity ──────────────────────────────────────

  let timeComplexities = [];

  // Loop nesting
  if (loopAnalysis.maxNesting >= 3) {
    timeComplexities.push({ order: 6, label: 'O(n³)', reason: `Triple-nested loop (depth ${loopAnalysis.maxNesting})` });
    breakdown.push({ icon: '🔄', text: `Triple-nested loop detected (depth ${loopAnalysis.maxNesting})`, line: loopAnalysis.deepestLine });
    tips.push('Consider whether all 3 nested loops are necessary — sometimes you can reduce with hashing or sorting.');
  } else if (loopAnalysis.maxNesting === 2) {
    timeComplexities.push({ order: 5, label: 'O(n²)', reason: 'Double-nested loop' });
    breakdown.push({ icon: '🔄', text: 'Nested loop detected (depth 2)', line: loopAnalysis.deepestLine });
    tips.push('Nested loops give O(n²). Consider using a HashMap or Set to reduce to O(n).');
  } else if (loopAnalysis.totalLoops > 0) {
    if (loopAnalysis.hasHalving) {
      timeComplexities.push({ order: 2, label: 'O(log n)', reason: 'Loop with halving pattern (binary search)' });
      breakdown.push({ icon: '🔍', text: 'Halving/binary search pattern in loop', line: loopAnalysis.halvingLine });
    } else {
      timeComplexities.push({ order: 3, label: 'O(n)', reason: 'Single loop iterating over input' });
      breakdown.push({ icon: '🔄', text: `${loopAnalysis.totalLoops} loop(s) — single-level iteration`, line: loopAnalysis.firstLoopLine });
    }
  }

  // Recursion
  if (recursionAnalysis.detected) {
    if (recursionAnalysis.hasMemoization) {
      timeComplexities.push({ order: 3, label: 'O(n)', reason: 'Recursion with memoization/DP' });
      breakdown.push({ icon: '🧠', text: 'Recursion with memoization (top-down DP)', line: recursionAnalysis.line });
      tips.push('Memoization reduces exponential recursion to O(n) — great optimization!');
    } else if (recursionAnalysis.branchingFactor >= 2) {
      timeComplexities.push({ order: 8, label: 'O(2ⁿ)', reason: 'Branching recursion without memoization' });
      breakdown.push({ icon: '🌳', text: `Branching recursion (factor ${recursionAnalysis.branchingFactor}) without memoization`, line: recursionAnalysis.line });
      tips.push('Add memoization (HashMap/array cache) to reduce from O(2ⁿ) to O(n).');
    } else {
      timeComplexities.push({ order: 3, label: 'O(n)', reason: 'Linear recursion' });
      breakdown.push({ icon: '🔁', text: 'Linear recursion (single recursive call)', line: recursionAnalysis.line });
      tips.push('Linear recursion can often be converted to an iterative loop to save stack space.');
    }
  }

  // Sorting
  if (sortAnalysis.detected) {
    timeComplexities.push({ order: 4, label: 'O(n log n)', reason: sortAnalysis.reason });
    breakdown.push({ icon: '📊', text: sortAnalysis.reason, line: sortAnalysis.line });
  }

  // Math patterns
  if (mathAnalysis.detected) {
    timeComplexities.push({ order: mathAnalysis.order, label: mathAnalysis.label, reason: mathAnalysis.reason });
    breakdown.push({ icon: '🧮', text: mathAnalysis.reason, line: mathAnalysis.line });
  }

  // If nothing detected
  if (timeComplexities.length === 0) {
    timeComplexities.push({ order: 1, label: 'O(1)', reason: 'No loops, recursion, or iterative patterns detected' });
    breakdown.push({ icon: '⚡', text: 'Constant-time operations only' });
  }

  // Pick the dominant (highest-order) time complexity
  timeComplexities.sort((a, b) => b.order - a.order);
  const dominantTime = timeComplexities[0].label;

  // ─── Determine Space Complexity ─────────────────────────────────────

  let spaceComplexities = [];

  if (dsAnalysis.has2DArray) {
    spaceComplexities.push({ order: 5, label: 'O(n²)', reason: '2D array/matrix allocation' });
    breakdown.push({ icon: '📦', text: '2D array/matrix detected — O(n²) space', line: dsAnalysis.line2D });
  }

  if (dsAnalysis.hasHashMap || dsAnalysis.hasSet || dsAnalysis.hasList) {
    spaceComplexities.push({ order: 3, label: 'O(n)', reason: 'Dynamic data structure (HashMap/Set/List)' });
    const structures = [];
    if (dsAnalysis.hasHashMap) structures.push('HashMap/Dict');
    if (dsAnalysis.hasSet) structures.push('Set');
    if (dsAnalysis.hasList) structures.push('ArrayList/List');
    breakdown.push({ icon: '🗂️', text: `${structures.join(', ')} used — O(n) space` });
  }

  if (dsAnalysis.hasArray && !dsAnalysis.has2DArray) {
    spaceComplexities.push({ order: 3, label: 'O(n)', reason: 'Array allocation' });
  }

  if (recursionAnalysis.detected && !recursionAnalysis.isTailRecursive) {
    spaceComplexities.push({ order: 3, label: 'O(n)', reason: 'Recursive call stack' });
    breakdown.push({ icon: '📚', text: 'Recursion uses O(n) stack space' });
  }

  if (spaceComplexities.length === 0) {
    spaceComplexities.push({ order: 1, label: 'O(1)', reason: 'Only primitive variables used' });
  }

  spaceComplexities.sort((a, b) => b.order - a.order);
  const dominantSpace = spaceComplexities[0].label;

  // ─── Confidence ─────────────────────────────────────────────────────

  const confidence = timeComplexities.length + spaceComplexities.length > 2 ? 'high' : loopAnalysis.totalLoops > 0 || recursionAnalysis.detected ? 'medium' : 'low';

  return {
    time: dominantTime,
    space: dominantSpace,
    breakdown,
    tips,
    confidence,
  };
}


// ─── Helper: Strip Comments ───────────────────────────────────────────────

function stripComments(code, lang) {
  let clean = code;
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  clean = clean.replace(/\/\/.*$/gm, '');
  if (/python|ruby/i.test(lang)) {
    clean = clean.replace(/#.*$/gm, '');
    clean = clean.replace(/"""[\s\S]*?"""/g, '');
    clean = clean.replace(/'''[\s\S]*?'''/g, '');
  }
  return clean;
}


// ─── Helper: Analyze Loops ────────────────────────────────────────────────

function analyzeLoops(code, lines) {
  const result = {
    totalLoops: 0,
    maxNesting: 0,
    deepestLine: null,
    firstLoopLine: null,
    hasHalving: false,
    halvingLine: null,
  };

  let currentNesting = 0;
  let inLoop = 0;
  const loopPattern = /\b(for|while)\s*[\s(]/;
  const halvingPattern = /\/\s*2|>>\s*1|\/=\s*2|low\s*\+\s*\(.*high|mid|left\s*\+\s*\(.*right/i;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) return;

    if (loopPattern.test(trimmed)) {
      result.totalLoops++;
      inLoop++;
      currentNesting++;

      if (!result.firstLoopLine) result.firstLoopLine = idx + 1;
      if (currentNesting > result.maxNesting) {
        result.maxNesting = currentNesting;
        result.deepestLine = idx + 1;
      }

      if (halvingPattern.test(trimmed)) {
        result.hasHalving = true;
        result.halvingLine = idx + 1;
      }
    }

    if (inLoop > 0 && halvingPattern.test(trimmed) && !result.hasHalving) {
      result.hasHalving = true;
      result.halvingLine = idx + 1;
    }

    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;

    if (closes > 0 && inLoop > 0) {
      currentNesting = Math.max(0, currentNesting - closes);
      inLoop = Math.max(0, inLoop - closes);
    }
  });

  // Python indentation-based nesting detection
  if (result.totalLoops > 1 && result.maxNesting <= 1) {
    let prevLoopIndent = -1;
    let pythonMaxNesting = 0;
    let pythonCurrentNesting = 0;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const indent = line.length - line.trimStart().length;

      if (loopPattern.test(trimmed)) {
        if (prevLoopIndent >= 0 && indent > prevLoopIndent) {
          pythonCurrentNesting++;
        } else {
          pythonCurrentNesting = 1;
        }
        prevLoopIndent = indent;

        if (pythonCurrentNesting > pythonMaxNesting) {
          pythonMaxNesting = pythonCurrentNesting;
          result.deepestLine = idx + 1;
        }
      }
    });

    if (pythonMaxNesting > result.maxNesting) {
      result.maxNesting = pythonMaxNesting;
    }
  }

  return result;
}


// ─── Helper: Analyze Recursion ────────────────────────────────────────────

function analyzeRecursion(code) {
  const result = {
    detected: false,
    branchingFactor: 0,
    hasMemoization: false,
    isTailRecursive: false,
    line: null,
  };

  const funcDefs = [];
  const javaFuncPattern = /(?:public|private|protected|static|\s)+\w+\s+(\w+)\s*\([^)]*\)\s*\{/g;
  const pyFuncPattern = /def\s+(\w+)\s*\([^)]*\)\s*:/g;
  const jsFuncPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g;

  let match;
  while ((match = javaFuncPattern.exec(code)) !== null) {
    funcDefs.push({ name: match[1], index: match.index });
  }
  while ((match = pyFuncPattern.exec(code)) !== null) {
    funcDefs.push({ name: match[1], index: match.index });
  }
  while ((match = jsFuncPattern.exec(code)) !== null) {
    funcDefs.push({ name: match[1] || match[2], index: match.index });
  }

  const lines = code.split('\n');

  funcDefs.forEach((func) => {
    if (!func.name || func.name === 'main') return;

    const callPattern = new RegExp(`\\b${func.name}\\s*\\(`, 'g');
    const allCalls = [...code.matchAll(callPattern)];
    const recursiveCalls = allCalls.length - 1;

    if (recursiveCalls >= 1) {
      result.detected = true;

      lines.forEach((line, idx) => {
        if (callPattern.test(line) && idx > 0) {
          result.line = idx + 1;
        }
      });

      lines.forEach((line) => {
        const lineCalls = [...line.matchAll(callPattern)];
        if (lineCalls.length >= 2) {
          result.branchingFactor = Math.max(result.branchingFactor, lineCalls.length);
        }
      });

      if (result.branchingFactor === 0 && recursiveCalls >= 1) {
        result.branchingFactor = 1;
      }
    }
  });

  // Check for memoization
  const memoPatterns = [
    /memo|cache|dp\[|dp\s*=|@lru_cache|@cache|functools/i,
    /Map\s*<.*>\s*\w+\s*=\s*new\s*HashMap/i,
    /\bdict\s*\(\)/i,
  ];

  if (result.detected) {
    result.hasMemoization = memoPatterns.some((p) => p.test(code));
  }

  return result;
}


// ─── Helper: Analyze Data Structures ──────────────────────────────────────

function analyzeDataStructures(code) {
  return {
    hasHashMap: /HashMap|TreeMap|unordered_map|dict\(|defaultdict|Map\(\)|new\s+Map/i.test(code),
    hasSet: /HashSet|TreeSet|unordered_set|set\(|new\s+Set/i.test(code),
    hasList: /ArrayList|LinkedList|vector|list\(/i.test(code),
    hasArray: /new\s+\w+\[|int\s*\[|String\s*\[|char\s*\[|double\s*\[|boolean\s*\[|float\s*\[/i.test(code),
    has2DArray: /new\s+\w+\[\w+\]\[\w+\]|int\s*\[\s*\]\s*\[\s*\]|dp\s*\[\s*\w+\s*\]\s*\[\s*\w+\s*\]/i.test(code),
    hasStack: /Stack|Deque|ArrayDeque|\.push\(|\.pop\(/i.test(code),
    hasQueue: /Queue|\.offer\(|\.poll\(/i.test(code),
    hasPriorityQueue: /PriorityQueue|heapq|heappush|heappop/i.test(code),
    line2D: null,
  };
}


// ─── Helper: Analyze Sorting Calls ────────────────────────────────────────

function analyzeSortingCalls(code) {
  const result = { detected: false, reason: '', line: null };

  const lines = code.split('\n');
  const sortPatterns = [
    { pattern: /Arrays\.sort/i, reason: 'Arrays.sort() — dual-pivot Quicksort O(n log n)' },
    { pattern: /Collections\.sort/i, reason: 'Collections.sort() — TimSort O(n log n)' },
    { pattern: /\.sort\(/i, reason: '.sort() — built-in sorting O(n log n)' },
    { pattern: /sorted\(/i, reason: 'sorted() — Python TimSort O(n log n)' },
    { pattern: /std::sort/i, reason: 'std::sort — C++ IntroSort O(n log n)' },
    { pattern: /qsort/i, reason: 'qsort() — C Quicksort O(n log n)' },
  ];

  lines.forEach((line, idx) => {
    if (result.detected) return;
    sortPatterns.forEach((sp) => {
      if (sp.pattern.test(line)) {
        result.detected = true;
        result.reason = sp.reason;
        result.line = idx + 1;
      }
    });
  });

  return result;
}


// ─── Helper: Analyze Math Patterns ────────────────────────────────────────

function analyzeMathPatterns(code) {
  const result = { detected: false, order: 1, label: 'O(1)', reason: '', line: null };

  if (/sieve|isPrime\s*\[|prime\s*\[/i.test(code) && /sqrt|Math\.sqrt/i.test(code)) {
    result.detected = true;
    result.order = 4;
    result.label = 'O(n log log n)';
    result.reason = 'Sieve of Eratosthenes pattern detected';
  }

  if (/pow|power|fastPow/i.test(code) && /\/\s*2|>>\s*1/i.test(code)) {
    result.detected = true;
    result.order = 2;
    result.label = 'O(log n)';
    result.reason = 'Fast exponentiation / binary power pattern';
  }

  return result;
}
