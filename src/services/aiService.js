// AI Service
// Mock mode returns intelligent simulated responses; swap to real Claude API by setting mockAI=false

import { getConfig } from './configService';

// ─── Error Explanation ──────────────────────────────────────────────────────

export async function explainError(code, error, language) {
  const config = getConfig();

  if (!config.mockAI && config.claudeApiKey) {
    try {
      return await realAICall('explain_error', { code, error, language }, config);
    } catch (err) {
      console.warn('Real AI call failed, falling back to built-in tutor:', err);
    }
  }

  return mockExplainError(code, error, language);
}

function mockExplainError(code, error, language) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const langName = typeof language === 'object' ? (language?.name || 'this language') : (language || 'this language');
      const errStr = String(error || '');

      // Try to extract line number from error
      const lineMatch = errStr.match(/line\s+(\d+)/i) || errStr.match(/:(\d+):/);
      const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;

      let explanation = '';

      if (errStr.toLowerCase().includes('syntaxerror') || errStr.toLowerCase().includes('syntax')) {
        explanation = `## 🔍 Syntax Error Detected

**What went wrong:** Your code has a syntax mistake — think of it like a grammatical error in English. The computer can't understand what you meant because the structure doesn't follow the rules of ${langName}.

**Where:** ${errorLine ? `Line ${errorLine}` : 'See error output for details'}

**The Problem:**
${errStr.includes('print') ? "You used `print` without parentheses. In Python 3, `print` is a function and needs `()` around what you want to display." : "The compiler found something unexpected in your code structure. Check for missing brackets, semicolons, or colons."}

**How to Fix:**
${errStr.includes('print') ? "Change `print \"hello\"` to `print(\"hello\")`" : "Review the syntax near the line mentioned. Common fixes:\n- Add a missing `;` at the end of the statement\n- Add a missing `:` after `if`, `for`, `def`, or `class`\n- Check for unmatched brackets `()`, `[]`, `{}`"}

**💡 Tip:** Most syntax errors are just small typos. Read the line carefully character by character!`;
      } else if (errStr.toLowerCase().includes('nameerror') || errStr.toLowerCase().includes('undefined') || errStr.toLowerCase().includes('cannot find symbol')) {
        explanation = `## 🔍 Identifier Not Found Error

**What went wrong:** You're trying to use a variable, class, or method that doesn't exist yet or isn't imported.

**Where:** ${errorLine ? `Line ${errorLine}` : 'See error output for details'}

**Common Causes:**
1. **Typo in identifier** — Check spelling and casing (Java & Python are case-sensitive!)
2. **Variable used before declaration** — You need to declare/initialize a variable before using it
3. **Missing Import** — If using classes like \`Scanner\` or \`HashMap\`, make sure to include \`import java.util.*;\` at the top
4. **Scope issue** — The variable might be declared inside a loop or function block but accessed outside

**How to Fix:** Make sure the variable or class is imported and declared before the line where you use it.`;
      } else if (errStr.toLowerCase().includes('error:') && (errStr.includes('expected') || errStr.includes(';'))) {
        explanation = `## 🔍 Compilation Error

**What went wrong:** The compiler expected something that wasn't there. This is like forgetting punctuation at the end of a statement.

**Where:** ${errorLine ? `Line ${errorLine}` : 'See error output for details'}

**The Problem:** Most likely a missing semicolon \`;\`, bracket, or closing brace.

**How to Fix:**
- Check the line mentioned in the error
- Look for missing \`;\` at the end of statements
- Verify all opening brackets \`{\`, \`(\`, \`[\` have matching closing brackets
- Check the line *before* the error line as well!`;
      } else {
        explanation = `## 🔍 Runtime Error Analysis

**What went wrong:** Your code compiled, but encountered an error while executing.

**Where:** ${errorLine ? `Line ${errorLine}` : 'See error output for details'}

**Common Causes:**
- **NoSuchElementException / EOFError** — Your code called for input (e.g. \`sc.nextLine()\` or \`input()\`), but no input was provided in the Input tab. Click **"Auto-Generate Input & Run"** to supply sample inputs!
- **NullPointerException** — Trying to access an object or call a method on a variable that is \`null\`.
- **ArrayIndexOutOfBoundsException** — Accessing an index outside the range of the array or collection.
- **ArithmeticException** — Division by zero (\`/ 0\`).

**How to Fix:** Review the stack trace above to pinpoint the exact line, check bounds, or provide standard input if input was expected.`;
      }

      const fullMarkdown = `${explanation}\n\n### 💡 Suggested Fixes:\n` +
        [
          'Verify variable names and casing match exactly',
          'Make sure all needed libraries (like `java.util.*`) are imported',
          'Switch to the Input tab or click "Auto-Generate Input & Run" if your code reads input',
          'Review the error line number mentioned above',
        ].map((s) => `- ${s}`).join('\n');

      resolve(fullMarkdown);
    }, 200);
  });
}

export async function explainCode(code, language) {
  const config = getConfig();

  if (!config.mockAI && config.claudeApiKey) {
    try {
      const res = await realAICall('explain_code', { code, language }, config);
      return typeof res === 'string' ? res : (res?.content || res?.text || '');
    } catch (err) {
      console.warn('Real AI call failed, falling back to built-in tutor:', err);
    }
  }

  return mockExplainCode(code, language);
}

function mockExplainCode(code, language) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const langName = typeof language === 'object' ? (language?.name || 'Code') : (language || 'Code');
      const safeCode = code || '';
      const lines = safeCode.split('\n');

      // Extract Java or general class/function details
      const classMatch = safeCode.match(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/);
      const className = classMatch ? classMatch[1] : null;

      const hasHashMap = /HashMap|unordered_map|dict|\bMap\b/i.test(safeCode);
      const hasGetOrDefault = /getOrDefault/i.test(safeCode);
      const hasArrayList = /ArrayList|vector|\blist\b/i.test(safeCode);
      const hasHashSet = /HashSet|unordered_set|\bSet\b/i.test(safeCode);
      const hasQueue = /Queue|LinkedList|ArrayDeque/i.test(safeCode);
      const hasStack = /Stack|pop\(\)|push\(\)/i.test(safeCode);
      const hasLoop = /for\s*\(|while\s*\(|for\s+\w+\s+in|\.forEach/i.test(safeCode);
      const hasRecursion = /def\s+(\w+).*?\1\(|(\w+)\s*\([^)]*\)\s*\{[^\}]*?\2\(/s.test(safeCode);
      const hasScanner = /Scanner|cin|input\(|readline/i.test(safeCode);
      const hasCondition = /if\s*\(|if\s+/i.test(safeCode);
      const hasArray = /\[\]|vector|ArrayList|list\(/i.test(safeCode);
      const hasPrint = /System\.out\.print|print\(|console\.log|printf|cout/i.test(safeCode);

      // Extract user variable names
      const varMatches = [...safeCode.matchAll(/(?:int|String|char|double|long|boolean|Map<[^>]+>|HashMap<[^>]+>|List<[^>]+>|ArrayList<[^>]+>|auto|let|var|const)\s+([a-zA-Z_]\w*)/g)]
        .map((m) => m[1])
        .filter((v) => !['class', 'public', 'static', 'void', 'main'].includes(v));
      const uniqueVars = [...new Set(varMatches)].slice(0, 6);

      // Identify specific lines of interest
      const keyLines = [];
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const trimmed = lineText.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

        if (/class\s+\w+/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Class entry definition' });
        } else if (/main\s*\(/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Program execution entry point' });
        } else if (/Scanner|BufferedReader|cin|input\(/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Input reader initialization' });
        } else if (/new\s+(?:HashMap|ArrayList|HashSet|PriorityQueue|ArrayDeque)/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Data structure allocation' });
        } else if (/for\s*\(|while\s*\(/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Loop traversal & control flow' });
        } else if (/if\s*\(/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Conditional validation / decision branch' });
        } else if (/System\.out\.print|console\.log|printf|cout/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Standard output generation' });
        } else if (/return\b/.test(trimmed)) {
          keyLines.push({ num: lineNum, text: trimmed, role: 'Method termination & return value' });
        }
      });

      let summary = '';
      if (hasHashMap && hasGetOrDefault) {
        summary = `This program executes a **Frequency Counter / Hash Map algorithm** using \`getOrDefault()\`. It aggregates items into a hash table in $O(1)$ amortized time per insertion without needing separate existence checks.`;
      } else if (hasHashMap && hasLoop) {
        summary = `This program processes structured data with an in-memory **Hash Map**, allowing near-instantaneous key-based indexing and relationships.`;
      } else if (hasRecursion) {
        summary = `This program solves the problem via **Recursion**, breaking the task into self-similar sub-problems with an active call stack until terminating at a base case.`;
      } else if (hasLoop && hasArray) {
        summary = `This program performs **Sequential Iteration** over a list or array buffer, applying transformations or aggregations element by element.`;
      } else {
        summary = `This is a **${langName}** program${className ? ` inside class \`${className}\`` : ''} designed for structured data manipulation and execution.`;
      }

      let markdown = `## 🧠 Deep Code Walkthrough (${langName})

### 🎯 Purpose & What It Achieves
${summary}

---

### 🔍 Line-by-Line Execution Breakdown
`;

      if (keyLines.length > 0) {
        keyLines.slice(0, 8).forEach((k) => {
          markdown += `- **Line ${k.num}:** \`${k.text}\`  \n  ↳ *Action:* ${k.role}\n`;
        });
      } else {
        markdown += `- **Lines 1–${lines.length}:** Sequentially executes commands in the standard top-to-bottom procedural flow.\n`;
      }

      markdown += `\n---\n\n### 🧪 Dry Run Simulation Table
Here is an execution trace showing what happens step-by-step with sample input:

| Step | Line | Executing Statement | State of Variables | Standard Output |
|:---:|:---:|:---|:---|:---:|
`;

      let simStep = 1;
      if (hasScanner) {
        markdown += `| ${simStep++} | Init | \`Scanner sc = ...\` | Reads next token into memory | *(waiting for input)* |\n`;
      }
      if (uniqueVars.length > 0) {
        const firstVar = uniqueVars[0];
        markdown += `| ${simStep++} | Setup | \`${firstVar} = ...\` | \`${firstVar}\` initialized | *(none)* |\n`;
      }
      if (hasLoop) {
        markdown += `| ${simStep++} | Loop | Iteration #1 | Counter \`i = 0\`, processes first element | *(in progress)* |\n`;
        markdown += `| ${simStep++} | Loop | Iteration #2 | Counter \`i = 1\`, evaluates condition | *(in progress)* |\n`;
      }
      if (hasGetOrDefault) {
        markdown += `| ${simStep++} | Map | \`map.getOrDefault(key, 0) + 1\` | Key count updated in table | *(stored)* |\n`;
      }
      if (hasPrint) {
        markdown += `| ${simStep++} | Output | \`print(...) / sout\` | Final computed value flushed | **Sample Output** |\n`;
      }

      markdown += `\n---\n\n### ⚠️ Potential Edge Cases & Gotchas
`;

      if (hasScanner) {
        markdown += `- 🔴 **NoSuchElementException / Input Exhaustion**: If user does not provide standard input in the Input tab, \`sc.next()\` or \`sc.nextInt()\` will crash. *(Click "Auto-Generate Input & Run" to prevent this!)*\n`;
      }
      if (hasArray || hasArrayList) {
        markdown += `- 🟡 **IndexOutOfBoundsException**: Verify boundary checks. In 0-indexed arrays, accessing index \`length\` throws an error. Always loop with \`< length\`, not \`<= length\`.\n`;
      }
      if (hasLoop) {
        markdown += `- 🟡 **Infinite Loop Trap**: Ensure your loop variables are modified on every iteration so termination criteria is eventually satisfied.\n`;
      }
      if (hasHashMap) {
        markdown += `- 🟢 **Null Key/Value Handling**: When querying maps, accessing non-existent keys returns \`null\` unless using \`getOrDefault()\` or null-safe checks.\n`;
      }
      markdown += `- 🔵 **Type Capacity**: If calculating factorials, power, or large sums, regular 32-bit \`int\` (up to $2 \\times 10^9$) will overflow. Use 64-bit \`long\` for large calculations.\n`;

      markdown += `\n---\n\n### ⏱️ Time & Space Complexity
- **Time Complexity:** ${hasHashMap && hasLoop ? '⏱️ **$O(N)$** — Single linear scan with $O(1)$ amortized map operations.' : hasLoop ? '⏱️ **$O(N)$** — Proportional to input size.' : '⏱️ **$O(1)$** — Constant time.'}
- **Space Complexity:** ${hasHashMap || hasArrayList ? '💾 **$O(N)$** — Additional memory allocated for storage collection.' : '💾 **$O(1)$** — Minimal auxiliary variables.'}

---

### 💡 Clean Code & Practical Advice
${hasGetOrDefault ? '- **Idiomatic Map Usage**: `map.getOrDefault(key, 0) + 1` is clean and prevents redundant hash lookups.' : '- **Refactoring Tip**: Break down large monolithic methods into modular, testable subroutines with clear descriptive names.'}
- **Scanner Hygiene**: When using Scanner with mixed \`nextInt()\` and \`nextLine()\`, remember to consume the leftover newline character.
`;

      resolve(markdown.trim());
    }, 150);
  });
}

// ─── Auto Input Generation ──────────────────────────────────────────────────

export async function generateInputs(code, language) {
  const config = getConfig();

  if (config.mockAI) {
    return mockGenerateInputs(code, language);
  }

  return realAICall('generate_inputs', { code, language }, config);
}

function mockGenerateInputs(code, language) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let input = '';
      let description = '';

      // Sample pools for variety on every click
      const sampleStrings = [
        'programming',
        'swiss',
        'racecar',
        'datastructures',
        'algorithm',
        'developer',
        'fullcode',
        'character',
        'antigravity',
        'engineering',
        'leetcode',
        'onlinecompiler',
        'hello world',
        'madam',
        'recursion',
      ];

      // Analyze code for input patterns
      const hasMatrix =
        /matrix|grid|2d|2D|\[\s*\]\s*\[/.test(code) ||
        (/for.*for/.test(code) && /input|scanf|cin|scan|read|nextInt/.test(code));
      const hasArray =
        /array|arr|list|vector/.test(code) ||
        (/for/.test(code) && /input|scanf|cin|scan|read|nextInt/.test(code));
      const hasString =
        /String\s+\w+\s*=\s*(sc|scanner)\.next|nextLine|input\(\)|getline|gets|char|String/i.test(code) &&
        !hasArray &&
        !hasMatrix;
      const hasMultipleInputs =
        (code.match(/input\(\)|scanf|cin\s*>>|scan\.|nextInt|nextLine|read_line/g) || []).length > 2;
      const hasSingleInput =
        (code.match(/input\(\)|scanf|cin\s*>>|scan\.|nextInt|read_line/g) || []).length === 1;

      if (hasMatrix) {
        const n = Math.random() > 0.5 ? 3 : 4;
        input = `${n}\n`;
        for (let i = 0; i < n; i++) {
          const row = [];
          for (let j = 0; j < n; j++) {
            row.push(Math.floor(Math.random() * 30) + 1);
          }
          input += row.join(' ') + '\n';
        }
        description = `🤖 **Auto-detected:** Matrix input!\n\nGenerated fresh **${n}×${n} matrix** with random values (1-30).`;
      } else if (hasString) {
        const randomStr = sampleStrings[Math.floor(Math.random() * sampleStrings.length)];
        input = `${randomStr}\n`;
        description = `🤖 **Auto-detected:** String input!\n\nGenerated new sample string: **"${randomStr}"**`;
      } else if (hasArray) {
        const n = Math.floor(Math.random() * 5) + 5; // 5 to 9 elements
        const arr = [];
        for (let i = 0; i < n; i++) {
          arr.push(Math.floor(Math.random() * 50) + 1);
        }
        input = `${n}\n${arr.join(' ')}\n`;
        description = `🤖 **Auto-detected:** Array input!\n\nGenerated array with **${n} elements**: \`[${arr.join(', ')}]\``;
      } else if (hasMultipleInputs) {
        const count = Math.floor(Math.random() * 3) + 2;
        const nums = [];
        for (let i = 0; i < count; i++) {
          nums.push(Math.floor(Math.random() * 100) + 1);
        }
        input = nums.join('\n') + '\n';
        description = `🤖 **Auto-detected:** Multiple numeric inputs!\n\nGenerated test values: ${nums.join(', ')}`;
      } else if (hasSingleInput) {
        const val = Math.floor(Math.random() * 90) + 10;
        input = `${val}\n`;
        description = `🤖 **Auto-detected:** Single input value!\n\nGenerated test value: **${val}**`;
      } else {
        const randomChoice = Math.random();
        if (randomChoice < 0.4) {
          const s = sampleStrings[Math.floor(Math.random() * sampleStrings.length)];
          input = `${s}\n`;
          description = `🤖 **Auto-generated:** Test string **"${s}"**`;
        } else {
          const n = 5;
          const arr = Array.from({ length: n }, () => Math.floor(Math.random() * 20) + 1);
          input = `${n}\n${arr.join(' ')}\n`;
          description = `🤖 **Auto-generated:** Test sequence: \`${arr.join(' ')}\``;
        }
      }

      resolve({
        input: input.trim(),
        description,
      });
    }, 200);
  });
}

// ─── Logic Hints ────────────────────────────────────────────────────────────

export async function getLogicHint(code, language, hintLevel = 1) {
  const config = getConfig();

  if (config.mockAI) {
    return mockGetHint(code, language, hintLevel);
  }

  return realAICall('logic_hint', { code, language, hintLevel }, config);
}

function mockGetHint(code, language, hintLevel) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hasSort = /sort|bubble|quick|merge|insertion|selection/i.test(code);
      const hasSearch = /search|find|binary|linear|lookup/i.test(code);
      const hasMatrix = /matrix|grid|2d|2D/i.test(code);
      const hasRecursion = /recursion|recursive|factorial|fibonacci|fib/i.test(code);
      const hasDP = /dp|dynamic|memoiz|tabulation/i.test(code);

      let hints;

      if (hasSort) {
        hints = [
          {
            level: 1,
            title: '💭 Think About It...',
            content:
              "Sorting is about putting elements in order. Think about how you'd sort a hand of playing cards — you compare cards and swap them around. What's the simplest way to repeatedly find the right position for each element?",
          },
          {
            level: 2,
            title: '🧩 Approach Direction',
            content:
              "**Comparison-based sorting:** Consider these strategies:\n- **Bubble Sort**: Repeatedly swap adjacent elements if they're in wrong order. Simple but O(n²).\n- **Merge Sort**: Divide array in half, sort each half, merge them. O(n log n).\n- **Quick Sort**: Pick a pivot, partition around it, recurse on both sides.\n\nThink about which one matches your current code structure.",
          },
          {
            level: 3,
            title: '🎯 Detailed Strategy',
            content:
              "**Step-by-step approach:**\n1. Use a nested loop (outer: passes, inner: comparisons)\n2. In each pass, compare `arr[j]` with `arr[j+1]`\n3. If out of order, swap them\n4. After each pass, the largest unsorted element \"bubbles\" to its correct position\n5. Optimization: if no swaps in a pass, array is sorted — break early!\n\n**Key insight:** After `k` passes, the last `k` elements are in their final positions.",
          },
        ];
      } else if (hasSearch) {
        hints = [
          {
            level: 1,
            title: '💭 Think About It...',
            content:
              "Finding something in a collection — think about how you'd look up a word in a dictionary. Do you start from page 1 every time, or do you jump to roughly the right spot first?",
          },
          {
            level: 2,
            title: '🧩 Approach Direction',
            content:
              "**Two main approaches:**\n- **Linear Search**: Check every element one by one. Works on unsorted data. O(n).\n- **Binary Search**: Only works on **sorted** data. Jump to the middle, decide which half to search. O(log n).\n\nIs your data sorted? That determines your best approach.",
          },
          {
            level: 3,
            title: '🎯 Detailed Strategy',
            content:
              "**Binary Search step-by-step:**\n1. Set `low = 0`, `high = n-1`\n2. While `low <= high`:\n   - Calculate `mid = (low + high) / 2`\n   - If `arr[mid] == target`: found it! Return `mid`\n   - If `arr[mid] < target`: search right half → `low = mid + 1`\n   - If `arr[mid] > target`: search left half → `high = mid - 1`\n3. If loop ends: element not found\n\n**Watch out for:** integer overflow in `mid` calculation. Use `low + (high - low) / 2`",
          },
        ];
      } else if (hasRecursion || hasDP) {
        hints = [
          {
            level: 1,
            title: '💭 Think About It...',
            content:
              "Recursion is about breaking a big problem into smaller versions of the same problem. What's the simplest case (base case) where you know the answer immediately? Start there.",
          },
          {
            level: 2,
            title: '🧩 Approach Direction',
            content:
              "**Key questions to ask:**\n1. What's the **base case**? (smallest input where answer is obvious)\n2. How does solving `f(n-1)` help solve `f(n)`?\n3. Are you recalculating the same subproblems? → Use **memoization** (store results in a dictionary/array)\n\nThis transforms exponential time to polynomial time!",
          },
          {
            level: 3,
            title: '🎯 Detailed Strategy',
            content:
              "**Dynamic Programming approach:**\n1. Define state: What does `dp[i]` represent?\n2. Find recurrence: `dp[i] = f(dp[i-1], dp[i-2], ...)`\n3. Set base cases: `dp[0] = ?, dp[1] = ?`\n4. Fill table bottom-up (iteration) or top-down (recursion + memo)\n5. Return `dp[n]`\n\n**Pro tip:** Draw the recursion tree first to visualize overlapping subproblems.",
          },
        ];
      } else {
        hints = [
          {
            level: 1,
            title: '💭 Think About It...',
            content:
              "Before coding, break the problem into steps you'd explain to a friend. What are the inputs? What output do you need? What's the simplest approach that could work? Don't optimize yet — just get it working first.",
          },
          {
            level: 2,
            title: '🧩 Approach Direction',
            content:
              "**General problem-solving framework:**\n1. **Understand**: What exactly is the input and expected output?\n2. **Example**: Work through a small example by hand\n3. **Pattern**: Do you see any pattern? Does this remind you of a known algorithm?\n4. **Algorithm**: Write pseudocode for your approach\n5. **Code**: Translate pseudocode to real code\n6. **Test**: Try edge cases (empty input, single element, very large input)",
          },
          {
            level: 3,
            title: '🎯 Detailed Strategy',
            content:
              "**Common algorithm patterns to consider:**\n- **Iteration**: Simple loops for processing sequences\n- **Two pointers**: For sorted arrays or finding pairs\n- **Sliding window**: For contiguous subarray problems\n- **Hash map**: For O(1) lookups, counting frequencies\n- **Stack/Queue**: For nested structures, BFS/DFS\n- **Recursion + Memoization**: For overlapping subproblems\n\nStart with the brute force approach, then optimize!",
          },
        ];
      }

      const hint = hints.find((h) => h.level === hintLevel) || hints[0];
      resolve({
        ...hint,
        totalHints: hints.length,
        hasNext: hintLevel < hints.length,
      });
    }, 600 + Math.random() * 800);
  });
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function chatWithAI(messages, code, language) {
  const config = getConfig();

  if (config.mockAI) {
    return mockChat(messages, code, language);
  }

  return realAICall('chat', { messages, code, language }, config);
}

function mockChat(messages, code, language) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

      let response = '';

      if (lastMessage.includes('explain') || lastMessage.includes('what does')) {
        response = `## Code Explanation 📖

I can see you're writing **${language.name}** code. Here's what your code does at a high level:

1. **Input Phase**: Your code reads input data (likely from stdin)
2. **Processing**: It performs some computation on the data
3. **Output**: Results are printed to stdout

**Key observations:**
- You have ${code.split('\n').length} lines of code
- The code uses ${language.name} standard patterns
- ${/for|while/.test(code) ? "There are **loops** for iteration" : "No loops detected — consider if you need iteration"}

Would you like me to explain a specific part in more detail? 🤔`;
      } else if (lastMessage.includes('bug') || lastMessage.includes('fix') || lastMessage.includes('error') || lastMessage.includes('wrong')) {
        response = `## Bug Analysis 🐛

Let me analyze your ${language.name} code for potential issues:

**Possible issues I noticed:**
${/for.*for/.test(code) ? "- ⚠️ **Nested loops detected** — make sure loop variables don't shadow each other" : ""}
${!/return/.test(code) && language.name !== 'Python 3' ? "- ⚠️ **No return statement** — make sure your function returns the expected value" : ""}
- 🔍 Check boundary conditions (array limits, edge cases like 0 or negative numbers)
- 🔍 Verify variable initialization before use

**Quick debugging tips:**
1. Add print statements at key points to trace execution
2. Test with the smallest possible input first
3. Check if your loops run the correct number of times

Want me to look at a specific line or section? 🎯`;
      } else if (lastMessage.includes('hint') || lastMessage.includes('approach') || lastMessage.includes('how to') || lastMessage.includes('idea')) {
        response = `## 💡 Approach Hint

Without giving away the full solution, here's how I'd think about this:

**Step 1 — Understand the input/output:**
Read the problem carefully. What exactly is given? What do you need to produce?

**Step 2 — Think small first:**
Try solving it for the smallest possible input by hand. What steps did you take?

**Step 3 — Pattern recognition:**
${/sort/.test(code) ? "This looks like a sorting problem. Consider: what comparison determines the order?" : ""}
${/matrix|grid/.test(code) ? "This involves a 2D structure. Think about row-by-row or column-by-column processing." : ""}
${!/sort|matrix|grid/.test(code) ? "Think about what data structure naturally fits this problem. Array? Map? Stack?" : ""}

**Step 4 — Code it up:**
Start with the brute force. Get it working. Then optimize.

Need a more specific hint? Tell me what part you're stuck on! 🚀`;
      } else if (lastMessage.includes('optimize') || lastMessage.includes('faster') || lastMessage.includes('time complexity') || lastMessage.includes('complexity')) {
        response = `## ⚡ Optimization Analysis

**Current complexity estimate:**
${/for.*for/.test(code) ? "- **Time:** O(n²) — you have nested loops" : /for|while/.test(code) ? "- **Time:** O(n) — single loop detected" : "- **Time:** O(1) — no loops detected"}
- **Space:** ${/vector|list|array|arr|dict|map|hash/.test(code) ? "O(n) — using additional data structures" : "O(1) — constant space"}

**Optimization ideas:**
${/for.*for/.test(code) ? "1. Can you replace the inner loop with a **hash map lookup** (O(1) instead of O(n))?\n2. If data is sorted, consider **binary search** for the inner operation\n3. Could a **two-pointer technique** eliminate the nested loop?" : ""}
${!/for.*for/.test(code) ? "1. Your code looks fairly efficient already!\n2. Consider if you can reduce the number of operations inside the loop\n3. Can you precompute any values before the main processing?" : ""}

**Remember:** Optimize for readability first, speed second — unless performance is critical! 📊`;
      } else if (lastMessage.includes('hello') || lastMessage.includes('hi') || lastMessage.includes('hey')) {
        response = `## Hey there! 👋

I'm your **CodeForge AI** assistant! I'm here to help you with your ${language.name} code.

**What I can do:**
- 📖 **Explain** your code or concepts
- 🐛 **Find bugs** and suggest fixes
- 💡 **Give hints** for problem-solving approaches
- ⚡ **Optimize** your code for better performance
- 🎓 **Teach** concepts and best practices

Just ask me anything about your code! You can also use the quick action buttons below. 🚀`;
      } else {
        response = `## 🤖 Here's my analysis

Looking at your ${language.name} code (${code.split('\n').length} lines):

${code.trim().length > 0 ? `Your code appears to be working with ${/input|scanf|cin|scan|read/.test(code) ? "user input" : "static data"} and ${/print|cout|printf|fmt|println|console/.test(code) ? "producing output" : "processing silently"}.` : "It looks like you haven't written any code yet. Start typing and I'll be here to help!"}

**I can help you with:**
- Understanding errors (just paste the error message)
- Debugging logic issues
- Improving code quality
- Learning new concepts

What would you like to know? 💬`;
      }

      resolve({ content: response });
    }, 800 + Math.random() * 1200);
  });
}

// ─── Real Claude API Call ───────────────────────────────────────────────────

async function realAICall(action, data, config) {
  // Claude API integration point
  // When ready, set mockAI=false and provide claudeApiKey in settings

  const systemPrompts = {
    explain_error:
      'You are a coding tutor. Explain the following compiler/runtime error in plain English. Identify the exact line number. Give a clear fix. Be encouraging.',
    explain_code:
      'You are an expert computer science tutor and code mentor. Explain the provided code deeply and practically. DO NOT merely recite theoretical CS definitions or textbook theorems. Instead, provide: 1) Purpose and what the code achieves, 2) Line-by-line runtime execution walkthrough, 3) Step-by-step dry run simulation table with sample inputs, variable states, and outputs, 4) Potential edge case traps and gotchas (boundary conditions, null pointers, overflow, infinite loops), 5) Concrete clean-code refactoring suggestions. Format cleanly in GitHub Markdown.',
    generate_inputs:
      'Analyze the code and determine what inputs it expects (type, format, quantity). Generate realistic test inputs. Return as plain text that can be used as stdin.',
    logic_hint:
      'You are a coding mentor. Give a hint about the approach to solve this problem WITHOUT giving the full code. Be Socratic — guide the student to discover the answer.',
    chat: 'You are CodeForge AI, a friendly and knowledgeable coding assistant. Help the user with their code. Be concise but thorough. Use markdown formatting.',
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.claudeApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompts[action],
      messages: [
        {
          role: 'user',
          content: JSON.stringify(data),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  return { content: result.content[0].text };
}
