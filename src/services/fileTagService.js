/**
 * AI File Glance & Heuristic Concept Classifier
 * Inspects a file's code to instantly derive:
 * - 1-2 word punchy concept tag (e.g. 'OOP · Inheritance', 'Function · Recursion', 'DP · Memoization')
 * - Concept badges (e.g. ['Classes', 'Polymorphism', 'super()'])
 * - 1-sentence quick summary of file internals
 */

export function analyzeFileContent(code, fileName = '') {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      tag: 'Empty · File',
      badge: 'Empty',
      concepts: ['Blank File'],
      summary: 'Empty code file ready for your logic.',
    };
  }

  const clean = code.toLowerCase();
  const baseName = fileName.toLowerCase();

  // 1. SQL / Database
  if (
    clean.includes('select') &&
    (clean.includes('from') || clean.includes('join') || clean.includes('create table') || clean.includes('insert into')) ||
    baseName.endsWith('.sql')
  ) {
    return {
      tag: 'SQL · Relational',
      badge: 'Database',
      concepts: ['Relational Schema', 'CRUD Queries', 'Indexes'],
      summary: 'Executes relational database queries, table operations, or schema definitions.',
    };
  }

  // 2. React / Frontend
  if (
    clean.includes('usestate') ||
    clean.includes('useeffect') ||
    clean.includes('react') ||
    baseName.endsWith('.jsx') ||
    baseName.endsWith('.tsx')
  ) {
    const isHooks = clean.includes('usestate') || clean.includes('useeffect');
    return {
      tag: isHooks ? 'React · Hooks' : 'React · Component',
      badge: 'React',
      concepts: isHooks ? ['State Lifecycle', 'Reactive UI', 'Hooks'] : ['Virtual DOM', 'JSX Components'],
      summary: 'Defines reactive user interface components with dynamic lifecycle rendering.',
    };
  }

  // 3. OOP & Inheritance
  if (
    clean.includes('extends ') ||
    clean.includes('implements ') ||
    (clean.includes('class ') && (clean.includes('super(') || clean.includes('super.')))
  ) {
    return {
      tag: 'OOP · Inheritance',
      badge: 'Inheritance',
      concepts: ['Class Hierarchy', 'Method Overriding', 'Polymorphism'],
      summary: 'Hierarchical object-oriented structure inheriting methods and state from a base class.',
    };
  }

  // 4. OOP & Encapsulation / Interface
  if (clean.includes('interface ') || clean.includes('abstract class ')) {
    return {
      tag: 'OOP · Interface',
      badge: 'Polymorphism',
      concepts: ['Contracts', 'Abstract Methods', 'Decoupling'],
      summary: 'Declares abstract contracts and interfaces defining required behavioral signatures.',
    };
  }

  if (
    clean.includes('class ') &&
    (clean.includes('private ') || clean.includes('get') && clean.includes('set') || clean.includes('constructor'))
  ) {
    return {
      tag: 'OOP · Classes',
      badge: 'Encapsulation',
      concepts: ['Encapsulation', 'Getters/Setters', 'State Blueprints'],
      summary: 'Structured domain entity blueprint encapsulating private attributes and accessors.',
    };
  }

  // 5. Recursion
  // Look for function name calling itself
  const funcMatch = code.match(/function\s+([a-zA-Z0-9_$]+)\s*\(|def\s+([a-zA-Z0-9_$]+)\s*\(|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/);
  if (funcMatch) {
    const name = funcMatch[1] || funcMatch[2] || funcMatch[3];
    if (name && name !== 'if' && name !== 'for' && name !== 'while' && name !== 'main') {
      const occurrences = (code.match(new RegExp(`\\b${name}\\s*\\(`, 'g')) || []).length;
      if (occurrences >= 2) {
        return {
          tag: 'Function · Recursion',
          badge: 'Recursion',
          concepts: ['Call Stack', 'Base Conditions', 'Self-Invocation'],
          summary: `Deconstructs problems recursively with self-referencing calls to '${name}()'.`,
        };
      }
    }
  }

  // 6. Dynamic Programming & Memoization
  if (
    clean.includes('dp[') ||
    clean.includes('memo[') ||
    clean.includes('memoization') ||
    clean.includes('tabulation') ||
    (clean.includes('fib') && clean.includes('['))
  ) {
    return {
      tag: 'DP · Memoization',
      badge: 'Dynamic Prog',
      concepts: ['Optimal Substructure', 'Cache Lookups', 'State Transitions'],
      summary: 'Solves complex subproblems efficiently by storing computed results in memoized states.',
    };
  }

  // 7. Graph & Tree Traversals
  if (
    clean.includes('bfs') ||
    clean.includes('dfs') ||
    (clean.includes('adj') && clean.includes('visited')) ||
    (clean.includes('treenode') || clean.includes('root.left') || clean.includes('root.right'))
  ) {
    const isTree = clean.includes('treenode') || clean.includes('root.left');
    return {
      tag: isTree ? 'Tree · Traversal' : 'Graph · BFS/DFS',
      badge: isTree ? 'Binary Tree' : 'Graph Algo',
      concepts: isTree ? ['Branching', 'Nodes & Edges', 'Depths'] : ['Adjacency Matrix', 'Breadth/Depth Scan'],
      summary: isTree
        ? 'Navigates and manipulates hierarchical tree node structures and branch paths.'
        : 'Traverses interconnected graph networks tracking visited nodes and frontiers.',
    };
  }

  // 8. Binary Search & Algorithms
  if (
    (clean.includes('low') && clean.includes('high') && clean.includes('mid')) ||
    clean.includes('binarysearch')
  ) {
    return {
      tag: 'Algorithm · Binary Search',
      badge: 'O(log N)',
      concepts: ['Halving Search Space', 'Pointers', 'Logarithmic Speed'],
      summary: 'Performs efficient logarithmic search by repeatedly halving the active search space.',
    };
  }

  // 9. Sorting & Arrays
  if (
    clean.includes('arrays.sort') ||
    clean.includes('collections.sort') ||
    clean.includes('quicksort') ||
    clean.includes('mergesort') ||
    (clean.includes('sort(') && clean.includes('['))
  ) {
    return {
      tag: 'Algorithm · Sorting',
      badge: 'Sort & Order',
      concepts: ['Array Ordering', 'Comparators', 'Partitioning'],
      summary: 'Sorts and re-indexes collection elements using comparator criteria.',
    };
  }

  // 10. Fast I/O & Competitive Programming
  if (
    clean.includes('bufferedreader') ||
    clean.includes('stringtokenizer') ||
    clean.includes('scanner') ||
    clean.includes('cin.tie')
  ) {
    return {
      tag: 'Fast I/O · Streams',
      badge: 'Stream I/O',
      concepts: ['Token Parsing', 'Buffer Streams', 'Standard In/Out'],
      summary: 'High-throughput buffered stream processing for rapid input and output operations.',
    };
  }

  // 11. Concurrency & Threads
  if (
    clean.includes('thread') ||
    clean.includes('executor') ||
    clean.includes('async') && clean.includes('await') ||
    clean.includes('promise')
  ) {
    return {
      tag: 'Async · Concurrency',
      badge: 'Async Flow',
      concepts: ['Non-Blocking', 'Event Loop', 'Thread Pool'],
      summary: 'Orchestrates asynchronous tasks, non-blocking promises, or concurrent worker threads.',
    };
  }

  // 12. Math & Number Theory
  if (
    clean.includes('gcd') ||
    clean.includes('isprime') ||
    clean.includes('modulo') ||
    clean.includes('math.sqrt') ||
    clean.includes('math.pow')
  ) {
    return {
      tag: 'Math · Number Theory',
      badge: 'Mathematics',
      concepts: ['Primes & Factors', 'Modular Arithmetic', 'Euclidean GCD'],
      summary: 'Evaluates numeric formulas, prime factorization, or modular mathematical operations.',
    };
  }

  // Fallback / General
  const lineCount = code.split('\n').length;
  return {
    tag: lineCount > 20 ? 'Logic · Script' : 'Code · Snippet',
    badge: 'Standard',
    concepts: ['Subroutines', 'Variables', 'Control Flow'],
    summary: 'Executable logic with structured statements, loops, and control flow.',
  };
}
