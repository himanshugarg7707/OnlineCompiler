// Smart Test Case Generator Engine
// Automatically analyzes user's code, infers input types/shapes,
// and synthesizes Sample, Varied, Edge, and Stress test cases.

/**
 * Infer the input schema and pattern from source code
 * @param {string} code - Source code
 * @returns {object} Pattern details { type, count, hasLoop, isString, isNumeric }
 */
export function detectInputPattern(code = '') {
  if (!code || typeof code !== 'string') {
    return { type: 'unknown' };
  }

  // Check if code even reads stdin
  const readsInput = /Scanner|System\.in|sc\.(next|nextInt|nextLine|nextDouble|nextLong)|cin\s*>>|scanf|input\(|sys\.stdin|readline|readLine|fmt\.Scan|prompt\(|<STDIN>/i.test(code);

  if (!readsInput) {
    return { type: 'no_input' };
  }

  // 1. Matrix / 2D Grid pattern (nested loops reading input)
  const isMatrix =
    /matrix|grid|board|2d|2D|\[\s*\]\s*\[/.test(code) ||
    (/for\s*\(.*?\)\s*\{?[^}]*for\s*\(.*?\)/s.test(code) && /next|scanf|cin|read/i.test(code));
  if (isMatrix) {
    return { type: 'matrix' };
  }

  // 2. Collection of Strings (e.g. ArrayList<String> list.add(sc.next()))
  const isStringCollection =
    /(?:List|ArrayList|LinkedList|Vector|Set|HashSet|Queue|Deque)<\s*String\s*>/.test(code) ||
    (/(?:list|arr|words|tokens)\.(add|push|append|insert)\s*\([^)]*(?:next\(\)|nextLine\(\)|input\(\)|cin)/i.test(code) && /String\b/i.test(code)) ||
    (/for\s*\(.*?\)\s*\{?[^}]*\.add\s*\([^)]*sc\.next\(\)/s.test(code));

  if (isStringCollection) {
    return { type: 'string_collection' };
  }

  // 3. Array / Collection of Integers
  const isNumberCollection =
    /(?:List|ArrayList|LinkedList|Vector)<\s*(?:Integer|Long|Double|int)\s*>/.test(code) ||
    /(?:int|long|double)\s*\[\s*\]\s*\w+\s*=\s*new\s+(?:int|long|double)\s*\[/i.test(code) ||
    /vector<\s*int\s*>/.test(code) ||
    (/for\s*\(.*?\)\s*\{?[^}]*(?:\.add|push_back|\[\w+\])\s*=\s*[^;]*(?:nextInt|cin|scanf|int\(input)/s.test(code)) ||
    /list\(map\(int,\s*input\(\)\.split\(\)\)\)/.test(code);

  if (isNumberCollection) {
    return { type: 'number_array' };
  }

  // 4. Single or Multiple Strings
  const isStringOnly =
    /(?:String|char\s*\*|str|std::string)\s+\w+\s*=\s*(?:sc\.(?:next|nextLine)\(\)|input\(\)|getline)/i.test(code) ||
    (/(?:sc\.next\(\)|sc\.nextLine\(\)|input\(\))/.test(code) && !/nextInt|nextDouble|int\(input\)/.test(code));

  if (isStringOnly) {
    return { type: 'string' };
  }

  // 5. Two or Three Integers (e.g. N K, A B, X Y)
  const inputCount = (code.match(/nextInt|nextDouble|scanf|cin\s*>>|int\(input\(\)\)/g) || []).length;
  if (inputCount === 2) {
    return { type: 'pairs' };
  }
  if (inputCount === 3) {
    return { type: 'triplet' };
  }

  // 6. Generic single integer
  if (/nextInt|int\(input\(\)\)|scanf\("%d"|cin\s*>>\s*[A-Za-z0-9_]+/i.test(code)) {
    return { type: 'integer' };
  }

  return { type: 'generic' };
}

export function getPatternLabel(patternType = 'generic') {
  switch (patternType) {
    case 'string_collection':
      return 'Collection of N Strings (e.g. List<String>)';
    case 'number_array':
      return 'Array of N Numbers (e.g. int[] / List<Integer>)';
    case 'matrix':
      return '2D Matrix / Grid';
    case 'string':
      return 'String / Text Line';
    case 'pairs':
      return 'Two Integers (A, B)';
    case 'triplet':
      return 'Three Integers (A, B, C)';
    case 'integer':
      return 'Single Integer (N)';
    case 'no_input':
      return 'No Stdin (Stand-alone Program)';
    default:
      return 'Standard Competitive I/O';
  }
}

/**
 * Generate randomized input matching the detected pattern for automated stress testing
 */
const RANDOM_WORDS = [
  'apple', 'banana', 'cherry', 'dragonfruit', 'elderberry',
  'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango',
  'nectarine', 'orange', 'papaya', 'quince', 'raspberry',
  'strawberry', 'tangerine', 'ugli', 'vanilla', 'watermelon'
];

export function generateRandomInputForPattern(patternType = 'generic', options = {}) {
  const { min = 1, max = 100, length = 5 } = options;

  switch (patternType) {
    case 'string_collection': {
      const count = Math.min(Math.max(length, 1), 10);
      const shuffled = [...RANDOM_WORDS].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      return `${count}\n${selected.join(' ')}`;
    }

    case 'number_array': {
      const count = Math.min(Math.max(length, 1), 20);
      const arr = Array.from({ length: count }, () =>
        Math.floor(Math.random() * (max - min + 1)) + min
      );
      return `${count}\n${arr.join(' ')}`;
    }

    case 'matrix': {
      const rows = Math.min(Math.max(Math.floor(length / 2) || 2, 2), 4);
      const cols = Math.min(Math.max(Math.floor(length / 2) || 2, 2), 4);
      const matrixLines = [`${rows} ${cols}`];
      for (let r = 0; r < rows; r++) {
        const rowVals = Array.from({ length: cols }, () =>
          Math.floor(Math.random() * (max - min + 1)) + min
        );
        matrixLines.push(rowVals.join(' '));
      }
      return matrixLines.join('\n');
    }

    case 'string': {
      const word = RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
      return `${word}`;
    }

    case 'pairs': {
      const a = Math.floor(Math.random() * (max - min + 1)) + min;
      const b = Math.floor(Math.random() * (max - min + 1)) + min;
      return `${a} ${b}`;
    }

    case 'triplet': {
      const a = Math.floor(Math.random() * (max - min + 1)) + min;
      const b = Math.floor(Math.random() * (max - min + 1)) + min;
      const c = Math.floor(Math.random() * (max - min + 1)) + min;
      return `${a} ${b} ${c}`;
    }

    case 'integer': {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      return `${num}`;
    }

    case 'no_input': {
      return '';
    }

    default: {
      const count = Math.min(Math.max(length, 1), 10);
      const arr = Array.from({ length: count }, () =>
        Math.floor(Math.random() * (max - min + 1)) + min
      );
      return `${count}\n${arr.join(' ')}`;
    }
  }
}

/**
 * Generate a smart set of test cases based on the detected code pattern
 * @param {string} code - Source code
 * @returns {Array} Array of test case templates { name, input, expectedOutput }
 */
export function buildSmartTestCases(code = '') {
  const pattern = detectInputPattern(code);

  switch (pattern.type) {
    case 'no_input':
      return [
        {
          name: 'Default Execution',
          input: '',
          expectedOutput: '',
        },
      ];

    case 'string_collection':
      return [
        {
          name: 'Sample Case: 5 Words',
          input: '5\napple banana cherry date elderberry',
          expectedOutput: '',
        },
        {
          name: 'Varied Case: Short Words',
          input: '3\nhi hello world',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Empty List (N=0)',
          input: '0\n',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Single Word (N=1)',
          input: '1\nalgorithm',
          expectedOutput: '',
        },
      ];

    case 'number_array':
      return [
        {
          name: 'Sample Case: Standard Array',
          input: '5\n10 20 30 40 50',
          expectedOutput: '',
        },
        {
          name: 'Varied Case: Mixed & Negative Values',
          input: '6\n-4 12 0 -9 8 3',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Empty / Zero Elements',
          input: '0\n',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Single Element (N=1)',
          input: '1\n42',
          expectedOutput: '',
        },
      ];

    case 'matrix':
      return [
        {
          name: 'Sample 3x3 Matrix',
          input: '3 3\n1 2 3\n4 5 6\n7 8 9',
          expectedOutput: '',
        },
        {
          name: 'Varied 2x4 Grid',
          input: '2 4\n5 10 15 20\n25 30 35 40',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: 1x1 Matrix',
          input: '1 1\n99',
          expectedOutput: '',
        },
      ];

    case 'string':
      return [
        {
          name: 'Sample Case: Palindrome Word',
          input: 'racecar',
          expectedOutput: '',
        },
        {
          name: 'Varied Case: Alphanumeric String',
          input: 'FullCode2026',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Single Character',
          input: 'a',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Empty String',
          input: '',
          expectedOutput: '',
        },
      ];

    case 'pairs':
      return [
        {
          name: 'Sample Case: Standard Pair',
          input: '15 4',
          expectedOutput: '',
        },
        {
          name: 'Varied Case: Equal Values',
          input: '25 25',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Zero Value',
          input: '0 10',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Negative Numbers',
          input: '-7 14',
          expectedOutput: '',
        },
      ];

    case 'triplet':
      return [
        {
          name: 'Sample Triplet (A B C)',
          input: '3 7 12',
          expectedOutput: '',
        },
        {
          name: 'Varied Case: Descending Values',
          input: '100 50 25',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: With Zero',
          input: '0 0 5',
          expectedOutput: '',
        },
      ];

    case 'integer':
      return [
        {
          name: 'Sample Case: Positive Integer',
          input: '12',
          expectedOutput: '',
        },
        {
          name: 'Varied Case: Large Number',
          input: '1000',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Zero (0)',
          input: '0',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Negative Integer',
          input: '-5',
          expectedOutput: '',
        },
      ];

    default:
      return [
        {
          name: 'Sample Case 1',
          input: '5\n1 2 3 4 5',
          expectedOutput: '',
        },
        {
          name: 'Sample Case 2',
          input: '3\n10 20 30',
          expectedOutput: '',
        },
        {
          name: 'Edge Case: Empty / Zero',
          input: '0\n',
          expectedOutput: '',
        },
      ];
  }
}

/**
 * Fully synthesizes test cases and runs user code to establish expected output baselines
 * @param {string} code - User's active code
 * @param {number} languageId - Active language ID
 * @param {Array} files - IDE files list
 * @param {string} filename - Filename of active code
 * @param {Function} executeCodeFn - Reference to executeCode function
 * @returns {Promise<Array>} Complete test cases ready to load into Test Suite
 */
export async function generateAndEvaluateTestCases(code, languageId, files, filename, executeCodeFn) {
  const templates = buildSmartTestCases(code);
  const synthesizedCases = [];

  for (let i = 0; i < templates.length; i++) {
    const tpl = templates[i];
    const tcId = `tc-auto-${Date.now()}-${i + 1}`;

    let actualOut = '';
    let status = 'idle';
    let elapsed = null;

    if (executeCodeFn && code && code.trim()) {
      try {
        const start = performance.now();
        const res = await executeCodeFn(code, languageId, tpl.input, files, filename);
        elapsed = Math.round(performance.now() - start);

        const rawOut = res?.output ?? res?.stdout ?? '';
        const rawErr = res?.error ?? res?.stderr ?? '';
        const cleanOut = rawOut === '(Program finished with no output)' ? '' : rawOut;
        const hasErr = res?.success === false || Boolean(rawErr && !cleanOut);

        if (!hasErr) {
          actualOut = cleanOut;
          status = 'passed';
        } else {
          actualOut = rawErr || 'Execution error';
          status = 'error';
        }
      } catch (err) {
        actualOut = err.message || 'Error executing test case';
        status = 'error';
      }
    }

    synthesizedCases.push({
      id: tcId,
      name: tpl.name,
      input: tpl.input,
      expectedOutput: actualOut && status === 'passed' ? actualOut.trim() : (tpl.expectedOutput || ''),
      actualOutput: actualOut,
      status: status,
      executionTime: elapsed,
    });
  }

  return synthesizedCases;
}
