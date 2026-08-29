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
      // Try to extract line number from error
      const lineMatch = error.match(/line\s+(\d+)/i) || error.match(/:(\d+):/);
      const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;

      let explanation = '';

      if (error.toLowerCase().includes('syntaxerror') || error.toLowerCase().includes('syntax')) {
        explanation = `## 🔍 Syntax Error Detected

**What went wrong:** Your code has a syntax mistake — think of it like a grammatical error in English. The computer can't understand what you meant because the structure doesn't follow the rules of ${language.name}.

**Where:** Line ${errorLine || '(see error output)'}

**The Problem:**
${error.includes('print') ? "You used `print` without parentheses. In Python 3, `print` is a function and needs `()` around what you want to display." : "The compiler found something unexpected in your code structure. Check for missing brackets, semicolons, or colons."}

**How to Fix:**
${error.includes('print') ? "Change `print \"hello\"` to `print(\"hello\")`" : "Review the syntax near the line mentioned. Common fixes:\n- Add a missing `;` at the end of the statement\n- Add a missing `:` after `if`, `for`, `def`, or `class`\n- Check for unmatched brackets `()`, `[]`, `{}`"}

**💡 Tip:** Most syntax errors are just small typos. Read the line carefully character by character!`;
      } else if (error.toLowerCase().includes('nameerror') || error.toLowerCase().includes('undefined')) {
        explanation = `## 🔍 Name Error — Variable Not Found

**What went wrong:** You're trying to use a variable or function name that doesn't exist yet. It's like trying to open a file that hasn't been created.

**Where:** Line ${errorLine || '(see error output)'}

**Common Causes:**
1. **Typo in variable name** — Check the spelling matches exactly (case-sensitive!)
2. **Variable used before assignment** — You need to create a variable before using it
3. **Scope issue** — The variable might exist inside a function but you're trying to use it outside

**How to Fix:** Make sure the variable is defined (assigned a value) before the line where you use it. Double-check the spelling!`;
      } else if (error.toLowerCase().includes('error:') && (error.includes('expected') || error.includes(';'))) {
        explanation = `## 🔍 Compilation Error

**What went wrong:** The compiler expected something that wasn't there. This is like forgetting a period at the end of a sentence — the computer doesn't know where your statement ends.

**Where:** Line ${errorLine || '(see error output)'}

**The Problem:** Most likely a missing semicolon \`;'\`, bracket, or incorrect syntax structure.

**How to Fix:**
- Check the line number mentioned in the error
- Look for missing \`;\` at the end of statements
- Verify all opening brackets \`{\`, \`(\`, \`[\` have matching closing brackets
- Make sure function calls have the right number of arguments

**💡 Tip:** The error often points to the line *after* the actual mistake, because that's where the compiler first noticed something was wrong. Check the previous line too!`;
      } else {
        explanation = `## 🔍 Runtime Error

**What went wrong:** Your code compiled fine but crashed while running. This means the logic is syntactically correct, but something went wrong during execution.

**Where:** ${errorLine ? `Line ${errorLine}` : 'See error output for details'}

**Common Causes:**
- **Division by zero** — Dividing a number by 0
- **Array out of bounds** — Accessing an index that doesn't exist
- **Null/None reference** — Trying to use something that has no value
- **Type mismatch** — Performing an operation on incompatible types
- **Stack overflow** — Infinite recursion (function calling itself forever)

**How to Fix:** Add some print/debug statements before the error line to see what values your variables have at that point. This will help you find the exact cause.`;
      }

      resolve({
        explanation,
        errorLine,
        suggestions: [
          'Add print statements to debug the values',
          'Check variable names for typos',
          'Review the syntax rules for ' + language.name,
        ],
      });
    }, 1000 + Math.random() * 1500);
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

      // Analyze code for input patterns
      const hasMatrix =
        /matrix|grid|2d|2D|\[\s*\]\s*\[/.test(code) ||
        (/for.*for/.test(code) && /input|scanf|cin|scan|read/.test(code));
      const hasArray =
        /array|arr|list|vector/.test(code) ||
        (/for/.test(code) && /input|scanf|cin|scan|read/.test(code));
      const hasString = /string|str|word|text|line/.test(code);
      const hasMultipleInputs =
        (code.match(/input\(\)|scanf|cin\s*>>|scan\.|read_line/g) || []).length > 2;
      const hasSingleInput =
        (code.match(/input\(\)|scanf|cin\s*>>|scan\.|read_line/g) || []).length === 1;

      if (hasMatrix) {
        const n = 4;
        input = `${n}\n`;
        for (let i = 0; i < n; i++) {
          const row = [];
          for (let j = 0; j < n; j++) {
            row.push(Math.floor(Math.random() * 20) + 1);
          }
          input += row.join(' ') + '\n';
        }
        description = `🤖 **Auto-detected:** Your code needs a matrix input!\n\nGenerated a **${n}×${n} matrix** with random values (1-20).\nFirst line = dimension, followed by ${n} rows of ${n} numbers each.`;
      } else if (hasArray) {
        const n = 8;
        const arr = [];
        for (let i = 0; i < n; i++) {
          arr.push(Math.floor(Math.random() * 100) + 1);
        }
        input = `${n}\n${arr.join(' ')}\n`;
        description = `🤖 **Auto-detected:** Your code needs an array input!\n\nGenerated an **array of ${n} elements** with random values (1-100).\nFirst line = size, second line = space-separated values.`;
      } else if (hasString) {
        input = 'hello world\n';
        description = `🤖 **Auto-detected:** Your code needs a string input!\n\nGenerated a sample string: "hello world"`;
      } else if (hasMultipleInputs) {
        input = '5\n10\n15\n';
        description = `🤖 **Auto-detected:** Your code needs multiple numeric inputs!\n\nGenerated 3 test numbers: 5, 10, 15`;
      } else if (hasSingleInput) {
        input = '42\n';
        description = `🤖 **Auto-detected:** Your code needs a single input!\n\nGenerated a test value: 42`;
      } else {
        input = '5\n3 7 1 9 4\n';
        description = `🤖 **Auto-generated:** Default test input.\n\nFirst line: a number (5)\nSecond line: a sequence of values`;
      }

      resolve({
        input: input.trim(),
        description,
      });
    }, 800 + Math.random() * 1000);
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
