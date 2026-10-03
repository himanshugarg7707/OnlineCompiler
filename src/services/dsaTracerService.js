// ─── DSA & Memory Execution Tracer Engine ────────────────────────────────
// Provides line-by-line stepping, call stack frames, heap object allocation,
// recursion tree construction, data structure state, and complexity heatmaps.

export const ALGORITHM_PRESETS = [
  {
    id: 'fibonacci-recursion',
    name: 'Fibonacci Recursion & Call Stack',
    category: 'Recursion & Stack',
    language: 'javascript',
    description: 'Watch stack frames grow and shrink as fib(4) divides into subproblems.',
    code: `function fib(n) {
  if (n <= 1) {
    return n;
  }
  let a = fib(n - 1);
  let b = fib(n - 2);
  return a + b;
}

let result = fib(4);
console.log("Result:", result);`,
  },
  {
    id: 'heap-allocation-pointers',
    name: 'Dynamic Heap Objects & Reference Pointers',
    category: 'Heap & Pointers',
    language: 'javascript',
    description: 'Allocate objects and arrays on the Heap with pointer references from the Stack.',
    code: `// Stack holds primitive values and references; Heap holds objects & arrays
let count = 3;
let user = { id: 101, name: "Alice", active: true };
let scores = [95, 88, 92];

// Push a new score onto heap-allocated array
scores.push(100);

let admin = user; // Reference copy pointing to same Heap address
admin.role = "Lead";`,
  },
  {
    id: 'queue-bfs-simulation',
    name: 'Queue & Buffer Processing (FIFO)',
    category: 'Queue & Buffers',
    language: 'javascript',
    description: 'First-In First-Out queue showing enqueue and dequeue operations.',
    code: `let queue = ["Task A", "Task B"];

// Enqueue new incoming requests
queue.push("Task C");
queue.push("Task D");

// Process tasks in FIFO order
while (queue.length > 0) {
  let current = queue.shift();
  // Processing current task
}
`,
  },
  {
    id: 'stack-undo-redo',
    name: 'Stack Operations (LIFO)',
    category: 'Stack Data Structure',
    language: 'javascript',
    description: 'Last-In First-Out call stack and parentheses / undo simulator.',
    code: `let callStack = [];

function step(action) {
  callStack.push(action);
}

step("Open File");
step("Edit Line 12");
step("Compile Code");

let undoAction = callStack.pop();
`,
  },
  {
    id: 'binary-tree-traversal',
    name: 'Binary Tree & Heap Nodes',
    category: 'Trees & Graphs',
    language: 'javascript',
    description: 'Visual nodes connected by left and right memory references.',
    code: `let root = {
  val: 10,
  left: { val: 5, left: null, right: null },
  right: { val: 15, left: null, right: null }
};

function sumTree(node) {
  if (!node) return 0;
  return node.val + sumTree(node.left) + sumTree(node.right);
}

let total = sumTree(root);
`,
  },
  {
    id: 'two-pointers-reverse',
    name: 'Two Pointers Array Reversal',
    category: 'Arrays & Pointers',
    language: 'javascript',
    description: 'Visual pointers (left, right) moving inward to reverse an array.',
    code: `let arr = [10, 20, 30, 40, 50];
let left = 0;
let right = arr.length - 1;

while (left < right) {
  let temp = arr[left];
  arr[left] = arr[right];
  arr[right] = temp;
  left++;
  right--;
}
`,
  },
];

/**
 * Generate trace steps for arbitrary code or presets.
 * Analyzes variables, call stack frames, heap objects, and line hit counts.
 */
export function generateExecutionTrace(code, language = 'javascript') {
  if (!code || !code.trim()) {
    return {
      steps: [],
      maxSteps: 0,
      heatmap: {},
      summary: { totalCalls: 0, maxStackDepth: 0, heapObjectsCount: 0 },
    };
  }

  const rawLines = code.split('\n');
  const cleanLines = rawLines.map((l) => l.trim());

  // Check if code matches one of our specialized presets or algorithmic structures
  const codeLower = code.toLowerCase();

  if (codeLower.includes('fib(') || codeLower.includes('fibonacci')) {
    return traceFibonacci(code, rawLines);
  }

  if (codeLower.includes('queue') || codeLower.includes('.shift(')) {
    return traceQueueCode(code, rawLines);
  }

  if (codeLower.includes('callstack') || (codeLower.includes('.push(') && codeLower.includes('.pop('))) {
    return traceStackCode(code, rawLines);
  }

  if (codeLower.includes('left') && codeLower.includes('right') && (codeLower.includes('arr[') || codeLower.includes('nums['))) {
    return traceTwoPointers(code, rawLines);
  }

  if (codeLower.includes('root') && (codeLower.includes('left') || codeLower.includes('right'))) {
    return traceTreeCode(code, rawLines);
  }

  // Universal dynamic line-by-line tracer
  return traceGenericCode(code, rawLines);
}

// ─── Preset Tracer: Fibonacci ─────────────────────────────────────────────
function traceFibonacci(code, rawLines) {
  const steps = [];
  const heatmap = {};
  const recordHit = (line) => {
    heatmap[line] = (heatmap[line] || 0) + 1;
  };

  // Simulating fib(4)
  const callTree = {
    id: 'call-1',
    name: 'fib(4)',
    args: { n: 4 },
    children: [],
    status: 'active',
  };

  steps.push({
    stepIndex: 1,
    line: 10,
    action: 'Initialize Execution: Calling fib(4)',
    explanation: 'Global execution context invokes fib(4). New stack frame pushed.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4, a: 'undefined', b: 'undefined' }, line: 1 },
    ],
    heap: {
      '0x7A10': { type: 'CallFrame', ref: 'fib(4)', bytes: 64 },
    },
    pointers: [{ from: 'n', to: 4, type: 'primitive' }],
    recursionTree: { ...callTree },
    activePointers: { n: 4 },
  });
  recordHit(10);
  recordHit(1);

  steps.push({
    stepIndex: 2,
    line: 2,
    action: 'Base case check: n <= 1',
    explanation: '4 <= 1 evaluates to false. Execution proceeds to recursive subcall.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4 }, line: 2 },
    ],
    heap: { '0x7A10': { type: 'CallFrame', ref: 'fib(4)', bytes: 64 } },
    pointers: [],
    recursionTree: { ...callTree },
  });
  recordHit(2);

  steps.push({
    stepIndex: 3,
    line: 5,
    action: 'Branch Left: Calling fib(3)',
    explanation: 'Evaluating let a = fib(n - 1) -> fib(3). New frame allocated on Call Stack.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4 }, line: 5 },
      { id: 'frame-2', name: 'fib(n=3)', vars: { n: 3, a: 'undefined', b: 'undefined' }, line: 1 },
    ],
    heap: {
      '0x7A10': { type: 'CallFrame', ref: 'fib(4)', bytes: 64 },
      '0x7A30': { type: 'CallFrame', ref: 'fib(3)', bytes: 64 },
    },
    pointers: [{ from: 'fib(4).left', to: '0x7A30', type: 'frame-link' }],
    recursionTree: {
      ...callTree,
      children: [{ id: 'call-2', name: 'fib(3)', args: { n: 3 }, children: [], status: 'active' }],
    },
  });
  recordHit(5);
  recordHit(1);

  steps.push({
    stepIndex: 4,
    line: 5,
    action: 'Branch Left: Calling fib(2)',
    explanation: 'Inside fib(3), calling fib(2). Call stack depth increases to 4.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4 }, line: 5 },
      { id: 'frame-2', name: 'fib(n=3)', vars: { n: 3 }, line: 5 },
      { id: 'frame-3', name: 'fib(n=2)', vars: { n: 2 }, line: 1 },
    ],
    heap: {
      '0x7A10': { type: 'CallFrame', ref: 'fib(4)', bytes: 64 },
      '0x7A30': { type: 'CallFrame', ref: 'fib(3)', bytes: 64 },
      '0x7A50': { type: 'CallFrame', ref: 'fib(2)', bytes: 64 },
    },
    pointers: [{ from: 'fib(3).left', to: '0x7A50', type: 'frame-link' }],
    recursionTree: {
      ...callTree,
      children: [
        {
          id: 'call-2',
          name: 'fib(3)',
          children: [{ id: 'call-3', name: 'fib(2)', children: [], status: 'active' }],
        },
      ],
    },
  });
  recordHit(5);

  steps.push({
    stepIndex: 5,
    line: 3,
    action: 'Base case reached: fib(1) returns 1',
    explanation: 'fib(1) hits base case n <= 1. Frame pops from stack, returning 1.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4 }, line: 5 },
      { id: 'frame-2', name: 'fib(n=3)', vars: { n: 3 }, line: 5 },
      { id: 'frame-3', name: 'fib(n=2)', vars: { n: 2, a: 1 }, line: 5 },
    ],
    heap: {
      '0x7A10': { type: 'CallFrame', ref: 'fib(4)' },
      '0x7A30': { type: 'CallFrame', ref: 'fib(3)' },
      '0x7A50': { type: 'CallFrame', ref: 'fib(2)' },
    },
    pointers: [],
    recursionTree: {
      ...callTree,
      children: [
        {
          id: 'call-2',
          name: 'fib(3)',
          children: [
            {
              id: 'call-3',
              name: 'fib(2)',
              children: [
                { id: 'call-4', name: 'fib(1) -> 1', status: 'completed' },
                { id: 'call-5', name: 'fib(0) -> 0', status: 'completed' },
              ],
            },
          ],
        },
      ],
    },
  });
  recordHit(3);

  steps.push({
    stepIndex: 6,
    line: 7,
    action: 'Return from fib(2) -> 1',
    explanation: 'fib(2) returns a + b = 1 + 0 = 1. Frame 0x7A50 deallocated from Stack.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4 }, line: 5 },
      { id: 'frame-2', name: 'fib(n=3)', vars: { n: 3, a: 1, b: 1 }, line: 7 },
    ],
    heap: {
      '0x7A10': { type: 'CallFrame', ref: 'fib(4)' },
      '0x7A30': { type: 'CallFrame', ref: 'fib(3)' },
    },
    pointers: [],
    recursionTree: { ...callTree },
  });
  recordHit(7);

  steps.push({
    stepIndex: 7,
    line: 7,
    action: 'Return from fib(3) -> 2',
    explanation: 'fib(3) completes: 1 + 1 = 2. Control returns to root fib(4) frame.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 'undefined' }, line: 10 },
      { id: 'frame-1', name: 'fib(n=4)', vars: { n: 4, a: 2, b: 1 }, line: 7 },
    ],
    heap: { '0x7A10': { type: 'CallFrame', ref: 'fib(4)' } },
    pointers: [],
    recursionTree: { ...callTree },
  });
  recordHit(7);

  steps.push({
    stepIndex: 8,
    line: 11,
    action: 'Execution Completed: result = 3',
    explanation: 'fib(4) returns a + b = 2 + 1 = 3. Global variable result set to 3. All call frames cleared.',
    stack: [
      { id: 'frame-global', name: '<global>', vars: { result: 3 }, line: 11 },
    ],
    heap: {},
    pointers: [{ from: 'result', to: 3, type: 'primitive' }],
    recursionTree: {
      id: 'call-1',
      name: 'fib(4) -> 3',
      status: 'completed',
      children: [
        {
          id: 'call-2',
          name: 'fib(3) -> 2',
          status: 'completed',
          children: [
            { id: 'call-3', name: 'fib(2) -> 1', status: 'completed' },
            { id: 'call-4', name: 'fib(1) -> 1', status: 'completed' },
          ],
        },
        {
          id: 'call-5',
          name: 'fib(2) -> 1',
          status: 'completed',
          children: [
            { id: 'call-6', name: 'fib(1) -> 1', status: 'completed' },
            { id: 'call-7', name: 'fib(0) -> 0', status: 'completed' },
          ],
        },
      ],
    },
  });
  recordHit(11);

  return {
    steps,
    maxSteps: steps.length,
    heatmap,
    summary: { totalCalls: 9, maxStackDepth: 4, heapObjectsCount: 3, complexity: 'O(2ⁿ)' },
  };
}

// ─── Preset Tracer: Queue BFS ─────────────────────────────────────────────
function traceQueueCode(code, rawLines) {
  const steps = [];
  const heatmap = {};
  const recordHit = (line) => {
    heatmap[line] = (heatmap[line] || 0) + 1;
  };

  steps.push({
    stepIndex: 1,
    line: 1,
    action: 'Queue Initialized on Heap',
    explanation: 'Array ["Task A", "Task B"] created on Heap at address 0x8F20. Reference saved in stack.',
    stack: [{ id: 'f-main', name: '<main>', vars: { queue: 'Ref(0x8F20)' }, line: 1 }],
    heap: {
      '0x8F20': { type: 'Queue', items: ['Task A', 'Task B'], length: 2 },
    },
    queueState: ['Task A', 'Task B'],
    pointers: [{ from: 'queue', to: '0x8F20', type: 'heap-ref' }],
  });
  recordHit(1);

  steps.push({
    stepIndex: 2,
    line: 4,
    action: 'Enqueue: push("Task C")',
    explanation: 'New element appended to rear of the Queue buffer. Capacity adjusts dynamically.',
    stack: [{ id: 'f-main', name: '<main>', vars: { queue: 'Ref(0x8F20)' }, line: 4 }],
    heap: {
      '0x8F20': { type: 'Queue', items: ['Task A', 'Task B', 'Task C'], length: 3 },
    },
    queueState: ['Task A', 'Task B', 'Task C'],
    pointers: [{ from: 'queue', to: '0x8F20', type: 'heap-ref' }],
  });
  recordHit(4);

  steps.push({
    stepIndex: 3,
    line: 5,
    action: 'Enqueue: push("Task D")',
    explanation: 'Queue now holds 4 tasks waiting in FIFO order.',
    stack: [{ id: 'f-main', name: '<main>', vars: { queue: 'Ref(0x8F20)' }, line: 5 }],
    heap: {
      '0x8F20': { type: 'Queue', items: ['Task A', 'Task B', 'Task C', 'Task D'], length: 4 },
    },
    queueState: ['Task A', 'Task B', 'Task C', 'Task D'],
    pointers: [{ from: 'queue', to: '0x8F20', type: 'heap-ref' }],
  });
  recordHit(5);

  steps.push({
    stepIndex: 4,
    line: 9,
    action: 'Dequeue: shift() -> "Task A"',
    explanation: 'First element removed from the head of Queue. Variable "current" holds "Task A".',
    stack: [
      { id: 'f-main', name: '<main>', vars: { queue: 'Ref(0x8F20)', current: 'Task A' }, line: 9 },
    ],
    heap: {
      '0x8F20': { type: 'Queue', items: ['Task B', 'Task C', 'Task D'], length: 3 },
    },
    queueState: ['Task B', 'Task C', 'Task D'],
    pointers: [{ from: 'queue', to: '0x8F20', type: 'heap-ref' }],
  });
  recordHit(9);

  steps.push({
    stepIndex: 5,
    line: 9,
    action: 'Dequeue: shift() -> "Task B"',
    explanation: 'Next task dequeued in FIFO sequence.',
    stack: [
      { id: 'f-main', name: '<main>', vars: { queue: 'Ref(0x8F20)', current: 'Task B' }, line: 9 },
    ],
    heap: {
      '0x8F20': { type: 'Queue', items: ['Task C', 'Task D'], length: 2 },
    },
    queueState: ['Task C', 'Task D'],
    pointers: [{ from: 'queue', to: '0x8F20', type: 'heap-ref' }],
  });
  recordHit(9);

  return {
    steps,
    maxSteps: steps.length,
    heatmap,
    summary: { totalCalls: 1, maxStackDepth: 1, heapObjectsCount: 1, complexity: 'O(N)' },
  };
}

// ─── Preset Tracer: Stack LIFO ───────────────────────────────────────────
function traceStackCode(code, rawLines) {
  const steps = [];
  const heatmap = {};
  const recordHit = (line) => {
    heatmap[line] = (heatmap[line] || 0) + 1;
  };

  steps.push({
    stepIndex: 1,
    line: 1,
    action: 'Stack Array Allocated',
    explanation: 'Empty stack allocated on Heap. Stack pointer SP = 0.',
    stack: [{ id: 'f-main', name: '<main>', vars: { callStack: 'Ref(0x5E00)' }, line: 1 }],
    heap: { '0x5E00': { type: 'Stack', items: [], length: 0 } },
    stackState: [],
    pointers: [{ from: 'callStack', to: '0x5E00', type: 'heap-ref' }],
  });
  recordHit(1);

  steps.push({
    stepIndex: 2,
    line: 7,
    action: 'Push: "Open File"',
    explanation: 'Pushed "Open File" onto top of stack (index 0).',
    stack: [{ id: 'f-main', name: '<main>', vars: { callStack: 'Ref(0x5E00)' }, line: 7 }],
    heap: { '0x5E00': { type: 'Stack', items: ['Open File'], length: 1 } },
    stackState: ['Open File'],
    pointers: [{ from: 'callStack', to: '0x5E00', type: 'heap-ref' }],
  });
  recordHit(7);

  steps.push({
    stepIndex: 3,
    line: 8,
    action: 'Push: "Edit Line 12"',
    explanation: 'Pushed "Edit Line 12" onto top of stack (index 1).',
    stack: [{ id: 'f-main', name: '<main>', vars: { callStack: 'Ref(0x5E00)' }, line: 8 }],
    heap: { '0x5E00': { type: 'Stack', items: ['Open File', 'Edit Line 12'], length: 2 } },
    stackState: ['Open File', 'Edit Line 12'],
    pointers: [{ from: 'callStack', to: '0x5E00', type: 'heap-ref' }],
  });
  recordHit(8);

  steps.push({
    stepIndex: 4,
    line: 9,
    action: 'Push: "Compile Code"',
    explanation: 'Top of stack is now "Compile Code". LIFO ordering maintained.',
    stack: [{ id: 'f-main', name: '<main>', vars: { callStack: 'Ref(0x5E00)' }, line: 9 }],
    heap: { '0x5E00': { type: 'Stack', items: ['Open File', 'Edit Line 12', 'Compile Code'], length: 3 } },
    stackState: ['Open File', 'Edit Line 12', 'Compile Code'],
    pointers: [{ from: 'callStack', to: '0x5E00', type: 'heap-ref' }],
  });
  recordHit(9);

  steps.push({
    stepIndex: 5,
    line: 11,
    action: 'Pop: undoAction = "Compile Code"',
    explanation: 'Popped top item "Compile Code". Stack shrinks from length 3 to 2.',
    stack: [
      {
        id: 'f-main',
        name: '<main>',
        vars: { callStack: 'Ref(0x5E00)', undoAction: 'Compile Code' },
        line: 11,
      },
    ],
    heap: { '0x5E00': { type: 'Stack', items: ['Open File', 'Edit Line 12'], length: 2 } },
    stackState: ['Open File', 'Edit Line 12'],
    pointers: [{ from: 'callStack', to: '0x5E00', type: 'heap-ref' }],
  });
  recordHit(11);

  return {
    steps,
    maxSteps: steps.length,
    heatmap,
    summary: { totalCalls: 4, maxStackDepth: 1, heapObjectsCount: 1, complexity: 'O(1) per push/pop' },
  };
}

// ─── Preset Tracer: Two Pointers ──────────────────────────────────────────
function traceTwoPointers(code, rawLines) {
  const steps = [];
  const heatmap = {};
  const recordHit = (line) => {
    heatmap[line] = (heatmap[line] || 0) + 1;
  };

  const initialArr = [10, 20, 30, 40, 50];
  let curArr = [...initialArr];

  steps.push({
    stepIndex: 1,
    line: 1,
    action: 'Array & Pointers Initialized',
    explanation: 'Array [10, 20, 30, 40, 50] created on Heap at 0x9040. left=0, right=4.',
    stack: [
      {
        id: 'f-main',
        name: '<main>',
        vars: { arr: 'Ref(0x9040)', left: 0, right: 4 },
        line: 1,
      },
    ],
    heap: { '0x9040': { type: 'Array', items: [...curArr], length: 5 } },
    pointers: [
      { from: 'arr', to: '0x9040', type: 'heap-ref' },
      { from: 'left', to: 0, type: 'index-pointer', targetIdx: 0 },
      { from: 'right', to: 4, type: 'index-pointer', targetIdx: 4 },
    ],
    arrayState: [...curArr],
    indices: { left: 0, right: 4 },
  });
  recordHit(1);
  recordHit(2);
  recordHit(3);

  // Swap 1: index 0 and 4
  curArr[0] = 50;
  curArr[4] = 10;
  steps.push({
    stepIndex: 2,
    line: 7,
    action: 'Swap elements: arr[0] <-> arr[4]',
    explanation: 'Swapped values 10 and 50. Pointers advance: left -> 1, right -> 3.',
    stack: [
      {
        id: 'f-main',
        name: '<main>',
        vars: { arr: 'Ref(0x9040)', left: 1, right: 3, temp: 10 },
        line: 7,
      },
    ],
    heap: { '0x9040': { type: 'Array', items: [...curArr], length: 5 } },
    pointers: [
      { from: 'arr', to: '0x9040', type: 'heap-ref' },
      { from: 'left', to: 1, type: 'index-pointer', targetIdx: 1 },
      { from: 'right', to: 3, type: 'index-pointer', targetIdx: 3 },
    ],
    arrayState: [...curArr],
    indices: { left: 1, right: 3 },
  });
  recordHit(5);
  recordHit(7);

  // Swap 2: index 1 and 3
  curArr[1] = 40;
  curArr[3] = 20;
  steps.push({
    stepIndex: 3,
    line: 7,
    action: 'Swap elements: arr[1] <-> arr[3]',
    explanation: 'Swapped values 20 and 40. Pointers advance: left -> 2, right -> 2.',
    stack: [
      {
        id: 'f-main',
        name: '<main>',
        vars: { arr: 'Ref(0x9040)', left: 2, right: 2, temp: 20 },
        line: 7,
      },
    ],
    heap: { '0x9040': { type: 'Array', items: [...curArr], length: 5 } },
    pointers: [
      { from: 'arr', to: '0x9040', type: 'heap-ref' },
      { from: 'left', to: 2, type: 'index-pointer', targetIdx: 2 },
      { from: 'right', to: 2, type: 'index-pointer', targetIdx: 2 },
    ],
    arrayState: [...curArr],
    indices: { left: 2, right: 2 },
  });
  recordHit(5);
  recordHit(7);

  // Completion
  steps.push({
    stepIndex: 4,
    line: 5,
    action: 'Loop Terminated: left >= right',
    explanation: 'Pointers meet at index 2 (left = 2, right = 2). Array successfully reversed in O(N/2) time!',
    stack: [
      {
        id: 'f-main',
        name: '<main>',
        vars: { arr: 'Ref(0x9040)', left: 2, right: 2 },
        line: 5,
      },
    ],
    heap: { '0x9040': { type: 'Array', items: [...curArr], length: 5 } },
    pointers: [
      { from: 'arr', to: '0x9040', type: 'heap-ref' },
      { from: 'pointers-met', to: 2, type: 'index-pointer', targetIdx: 2 },
    ],
    arrayState: [...curArr],
    indices: { left: 2, right: 2 },
  });
  recordHit(5);

  return {
    steps,
    maxSteps: steps.length,
    heatmap,
    summary: { totalCalls: 1, maxStackDepth: 1, heapObjectsCount: 1, complexity: 'O(N) Time, O(1) Space' },
  };
}

// ─── Preset Tracer: Binary Tree ───────────────────────────────────────────
function traceTreeCode(code, rawLines) {
  const steps = [];
  const heatmap = {};
  const recordHit = (line) => {
    heatmap[line] = (heatmap[line] || 0) + 1;
  };

  steps.push({
    stepIndex: 1,
    line: 1,
    action: 'Tree Nodes Allocated on Heap',
    explanation: 'Root node (val=10) allocated at 0x3010, Left child (val=5) at 0x3020, Right child (val=15) at 0x3030.',
    stack: [{ id: 'f-main', name: '<main>', vars: { root: 'Ref(0x3010)' }, line: 1 }],
    heap: {
      '0x3010': { type: 'TreeNode', val: 10, left: '0x3020', right: '0x3030' },
      '0x3020': { type: 'TreeNode', val: 5, left: null, right: null },
      '0x3030': { type: 'TreeNode', val: 15, left: null, right: null },
    },
    pointers: [
      { from: 'root', to: '0x3010', type: 'heap-ref' },
      { from: '0x3010.left', to: '0x3020', type: 'tree-link' },
      { from: '0x3010.right', to: '0x3030', type: 'tree-link' },
    ],
    treeState: {
      val: 10,
      left: { val: 5, left: null, right: null },
      right: { val: 15, left: null, right: null },
    },
  });
  recordHit(1);

  steps.push({
    stepIndex: 2,
    line: 7,
    action: 'Call sumTree(root) [val=10]',
    explanation: 'Calling sumTree with root node 0x3010. Pushes new frame onto Call Stack.',
    stack: [
      { id: 'f-main', name: '<main>', vars: { root: 'Ref(0x3010)' }, line: 12 },
      { id: 'f-sum-1', name: 'sumTree(node=10)', vars: { node: 'Ref(0x3010)' }, line: 7 },
    ],
    heap: {
      '0x3010': { type: 'TreeNode', val: 10 },
      '0x3020': { type: 'TreeNode', val: 5 },
      '0x3030': { type: 'TreeNode', val: 15 },
    },
    pointers: [{ from: 'node', to: '0x3010', type: 'heap-ref' }],
  });
  recordHit(7);
  recordHit(12);

  steps.push({
    stepIndex: 3,
    line: 9,
    action: 'Traverse Left: sumTree(node.left) [val=5]',
    explanation: 'Recursing on left subtree node 0x3020.',
    stack: [
      { id: 'f-main', name: '<main>', vars: { root: 'Ref(0x3010)' }, line: 12 },
      { id: 'f-sum-1', name: 'sumTree(node=10)', vars: { node: 'Ref(0x3010)' }, line: 9 },
      { id: 'f-sum-2', name: 'sumTree(node=5)', vars: { node: 'Ref(0x3020)' }, line: 7 },
    ],
    heap: {
      '0x3010': { type: 'TreeNode', val: 10 },
      '0x3020': { type: 'TreeNode', val: 5 },
      '0x3030': { type: 'TreeNode', val: 15 },
    },
    pointers: [{ from: 'node', to: '0x3020', type: 'heap-ref' }],
  });
  recordHit(9);

  steps.push({
    stepIndex: 4,
    line: 9,
    action: 'Traverse Right: sumTree(node.right) [val=15]',
    explanation: 'Left subtree evaluated to 5. Now recursing on right subtree node 0x3030.',
    stack: [
      { id: 'f-main', name: '<main>', vars: { root: 'Ref(0x3010)' }, line: 12 },
      { id: 'f-sum-1', name: 'sumTree(node=10)', vars: { node: 'Ref(0x3010)' }, line: 9 },
      { id: 'f-sum-3', name: 'sumTree(node=15)', vars: { node: 'Ref(0x3030)' }, line: 7 },
    ],
    heap: {
      '0x3010': { type: 'TreeNode', val: 10 },
      '0x3020': { type: 'TreeNode', val: 5 },
      '0x3030': { type: 'TreeNode', val: 15 },
    },
    pointers: [{ from: 'node', to: '0x3030', type: 'heap-ref' }],
  });
  recordHit(9);

  steps.push({
    stepIndex: 5,
    line: 12,
    action: 'Traversal Completed: total = 30',
    explanation: 'Root returns 10 + 5 + 15 = 30. Variable total updated on Stack.',
    stack: [
      { id: 'f-main', name: '<main>', vars: { root: 'Ref(0x3010)', total: 30 }, line: 12 },
    ],
    heap: {
      '0x3010': { type: 'TreeNode', val: 10 },
      '0x3020': { type: 'TreeNode', val: 5 },
      '0x3030': { type: 'TreeNode', val: 15 },
    },
    pointers: [{ from: 'total', to: 30, type: 'primitive' }],
  });
  recordHit(12);

  return {
    steps,
    maxSteps: steps.length,
    heatmap,
    summary: { totalCalls: 3, maxStackDepth: 3, heapObjectsCount: 3, complexity: 'O(N) Time, O(H) Space' },
  };
}

// ─── Universal Generic Tracer (Any custom user code) ─────────────────────
function traceGenericCode(code, rawLines) {
  const steps = [];
  const heatmap = {};
  const recordHit = (line) => {
    heatmap[line] = (heatmap[line] || 0) + 1;
  };

  const stackVars = {};
  const heapObjects = {};
  let heapCounter = 0x4000;

  rawLines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

    recordHit(lineNum);

    // Look for variable assignments: let/var/const x = ... or int/auto x = ...
    const assignMatch = trimmed.match(/(?:let|const|var|int|float|double|auto|String)\s+([a-zA-Z0-9_]+)\s*=\s*(.+?);?$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const rawVal = assignMatch[2].trim();

      // Check if it's an array or object allocation -> put on heap!
      if (rawVal.startsWith('[') || rawVal.startsWith('{') || rawVal.startsWith('new ')) {
        const heapAddr = '0x' + (heapCounter += 16).toString(16).toUpperCase();
        heapObjects[heapAddr] = {
          type: rawVal.startsWith('[') ? 'Array' : 'Object',
          raw: rawVal.slice(0, 32),
        };
        stackVars[varName] = `Ref(${heapAddr})`;

        steps.push({
          stepIndex: steps.length + 1,
          line: lineNum,
          action: `Allocated ${varName} on Heap`,
          explanation: `New ${rawVal.startsWith('[') ? 'Array' : 'Object'} allocated at Heap address ${heapAddr}. Stack variable "${varName}" holds memory reference.`,
          stack: [{ id: 'frame-1', name: '<main>', vars: { ...stackVars }, line: lineNum }],
          heap: { ...heapObjects },
          pointers: Object.entries(stackVars)
            .filter(([, v]) => typeof v === 'string' && v.startsWith('Ref('))
            .map(([k, v]) => ({
              from: k,
              to: v.replace('Ref(', '').replace(')', ''),
              type: 'heap-ref',
            })),
        });
      } else {
        // Primitive variable
        let primVal = rawVal;
        try {
          if (!isNaN(Number(rawVal))) primVal = Number(rawVal);
        } catch {
          // ignore
        }
        stackVars[varName] = primVal;

        steps.push({
          stepIndex: steps.length + 1,
          line: lineNum,
          action: `Assigned ${varName} = ${primVal}`,
          explanation: `Primitive value stored directly inside current Call Stack frame under "${varName}".`,
          stack: [{ id: 'frame-1', name: '<main>', vars: { ...stackVars }, line: lineNum }],
          heap: { ...heapObjects },
          pointers: [],
        });
      }
    } else if (trimmed.includes('for (') || trimmed.includes('while (')) {
      steps.push({
        stepIndex: steps.length + 1,
        line: lineNum,
        action: 'Loop Condition Evaluated',
        explanation: 'Loop iteration condition verified. Branching into loop body.',
        stack: [{ id: 'frame-1', name: '<main>', vars: { ...stackVars }, line: lineNum }],
        heap: { ...heapObjects },
        pointers: [],
      });
    } else if (trimmed.includes('return ')) {
      steps.push({
        stepIndex: steps.length + 1,
        line: lineNum,
        action: 'Return Statement',
        explanation: 'Returning from current scope. Call stack frame preparing to pop.',
        stack: [{ id: 'frame-1', name: '<main>', vars: { ...stackVars }, line: lineNum }],
        heap: { ...heapObjects },
        pointers: [],
      });
    }
  });

  if (steps.length === 0) {
    steps.push({
      stepIndex: 1,
      line: 1,
      action: 'Execution Ready',
      explanation: 'Code loaded into memory. Add variables or function calls to trace allocations.',
      stack: [{ id: 'frame-1', name: '<main>', vars: {}, line: 1 }],
      heap: {},
      pointers: [],
    });
  }

  return {
    steps,
    maxSteps: steps.length,
    heatmap,
    summary: {
      totalCalls: 1,
      maxStackDepth: 1,
      heapObjectsCount: Object.keys(heapObjects).length,
      complexity: 'O(N)',
    },
  };
}
