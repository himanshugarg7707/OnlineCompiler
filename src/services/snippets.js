// ─── Variable & Function History Autocomplete Engine ─────────────────────
const KEYWORDS_SET = new Set([
  // Control flow & language structures
  'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
  'function', 'def', 'class', 'struct', 'enum', 'interface', 'type', 'import', 'from', 'as', 'export', 'default',
  'let', 'const', 'var', 'public', 'private', 'protected', 'static', 'final', 'void', 'int',
  'float', 'double', 'char', 'boolean', 'bool', 'string', 'String', 'true', 'false', 'null',
  'undefined', 'None', 'self', 'this', 'super', 'try', 'catch', 'finally', 'except', 'raise',
  'throw', 'throws', 'async', 'await', 'yield', 'lambda', 'with', 'in', 'is', 'not', 'and', 'or',
  'new', 'delete', 'typeof', 'instanceof', 'package', 'using', 'namespace', 'include', 'define',
  // Java specific keywords & core classes to preserve
  'abstract', 'assert', 'byte', 'short', 'long', 'native', 'strictfp', 'synchronized',
  'transient', 'volatile', 'implements', 'extends', 'record', 'sealed', 'permits',
  'System', 'out', 'err', 'in', 'print', 'printf', 'println', 'format',
  'Scanner', 'Math', 'Arrays', 'Collections', 'List', 'ArrayList', 'LinkedList', 'Map', 'HashMap',
  'TreeMap', 'Set', 'HashSet', 'TreeSet', 'Queue', 'Deque', 'Stack', 'StringBuilder', 'StringBuffer',
  'Integer', 'Character', 'Boolean', 'Double', 'Float', 'Long', 'Short', 'Byte', 'Object',
  'Exception', 'Throwable', 'RuntimeException', 'Override',
  // C/C++ / Python / JS
  'cout', 'cin', 'endl', 'console', 'log', 'warn', 'error', 'table',
]);

// Global session variable history store
const globalVariableHistory = new Map();

/**
 * Scan text and record discovered variables into history
 */
export function recordVariablesFromCode(codeText) {
  if (!codeText) return;
  const matches = codeText.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
  matches.forEach((w) => {
    if (w.length >= 2 && !KEYWORDS_SET.has(w) && !/^\d+$/.test(w)) {
      const isFunction = new RegExp(`\\b${w}\\s*\\(`).test(codeText);
      globalVariableHistory.set(w, {
        isFunction,
        timestamp: Date.now(),
      });
    }
  });
}

// Global registry to prevent registering duplicate completion providers
const registeredLanguages = new Set();

/**
 * Register completion providers for Monaco editor (once per language)
 */
export function registerSnippets(monaco) {
  if (!monaco || !monaco.languages) return;

  const languages = [
    'python', 'cpp', 'c', 'java', 'javascript', 'typescript',
    'csharp', 'kotlin', 'swift', 'go', 'rust', 'php', 'ruby',
    'r', 'perl', 'scala', 'sql', 'html', 'css',
  ];

  languages.forEach((langId) => {
    if (registeredLanguages.has(langId)) return;
    registeredLanguages.add(langId);

    const staticItems = COMPLETIONS[langId] || [];

    monaco.languages.registerCompletionItemProvider(langId, {
      triggerCharacters: ['.', '(', '@', '<', '$', '_'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const currentWord = word.word;
        const text = model.getValue();

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // ── Show suggestions starting on first typed character or trigger char ──
        if (currentWord.length < 1 && !isTriggerChar) {
          return { suggestions: [] };
        }

        const lowerCurrentWord = currentWord.toLowerCase();

        // 1. Static Snippets — only return those whose prefix or label starts with the typed text
        const staticSuggestions = staticItems
          .filter((s) => {
            const prefix = (s.prefix || '').toLowerCase();
            const label = (s.label || '').toLowerCase();
            return prefix.startsWith(lowerCurrentWord) || label.startsWith(lowerCurrentWord);
          })
          .map((s, idx) => ({
            label: s.label || s.prefix,
            filterText: s.prefix || s.label,
            kind: s.kind ? monaco.languages.CompletionItemKind[s.kind] : monaco.languages.CompletionItemKind.Snippet,
            documentation: s.doc || s.description,
            insertText: s.insertText || s.body,
            insertTextRules: s.insertTextRules ?? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: s.detail || (s.kind ? s.kind : 'Snippet'),
            sortText: `0000_${String(idx).padStart(4, '0')}`,
          }));

        // 2. Dynamic Variable & Identifier Suggestions (fast single-pass scan)
        const localVariables = new Map();
        if (text && text.length < 30000) {
          const matches = text.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
          for (let i = 0; i < matches.length; i++) {
            const identifier = matches[i];
            if (
              identifier.length >= 2 &&
              identifier !== currentWord &&
              !KEYWORDS_SET.has(identifier) &&
              !/^\d+$/.test(identifier) &&
              identifier.toLowerCase().startsWith(lowerCurrentWord)
            ) {
              if (!localVariables.has(identifier)) {
                localVariables.set(identifier, false);
                if (localVariables.size >= 10) break;
              }
            }
          }
        }

        // Add variables from global session history
        if (localVariables.size < 10) {
          for (const [name, info] of globalVariableHistory.entries()) {
            if (
              name.length >= 2 &&
              name !== currentWord &&
              !KEYWORDS_SET.has(name) &&
              !localVariables.has(name) &&
              name.toLowerCase().startsWith(lowerCurrentWord)
            ) {
              localVariables.set(name, info?.isFunction || false);
              if (localVariables.size >= 12) break;
            }
          }
        }

        const variableSuggestions = Array.from(localVariables.entries()).map(
          ([name, isFunction], idx) => ({
            label: name,
            filterText: name,
            kind: isFunction
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Variable,
            documentation: `User identifier (${isFunction ? 'function' : 'variable'})`,
            insertText: name,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
            range,
            detail: isFunction ? 'Function' : 'Variable',
            sortText: `0050_${String(idx).padStart(4, '0')}`,
          })
        );

        return {
          suggestions: [...staticSuggestions, ...variableSuggestions],
        };
      },
    });
  });
}

/**
 * Export snippet collection for Snippets Modal / Drawer UI
 */
export function getAllSnippetsForLanguage(langName) {
  const map = {
    python: 'python',
    py: 'python',
    sql: 'sql',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
    html: 'html',
    css: 'css',
  };
  const key = map[langName?.toLowerCase()] || 'python';
  return COMPLETIONS[key] || [];
}

// ─── Completion database ──────────────────────────────────────────────────

export const COMPLETIONS = {
  // ─── SQL ────────────────────────────────────────────────────────────────
  sql: [
    // Database & Table Creation
    { prefix: 'createdb', label: 'CREATE DATABASE', body: 'CREATE DATABASE ${1:db_name};\nUSE ${1:db_name};', detail: 'Create & Use Database', doc: 'Create a new database and switch context' },
    { prefix: 'use', label: 'USE database', body: 'USE ${1:db_name};', detail: 'Switch active database', doc: 'Switch execution context to database' },
    { prefix: 'showdb', label: 'SHOW DATABASES', body: 'SHOW DATABASES;', detail: 'List all databases', doc: 'Display all available databases' },
    { prefix: 'showtbl', label: 'SHOW TABLES', body: 'SHOW TABLES;', detail: 'List all tables', doc: 'Display tables in active database' },
    { prefix: 'desc', label: 'DESCRIBE table', body: 'DESCRIBE ${1:table_name};', detail: 'Describe table schema', doc: 'Show columns and types of table' },
    { prefix: 'creattbl', label: 'CREATE TABLE', body: 'CREATE TABLE IF NOT EXISTS ${1:table_name} (\n\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\t${2:name} TEXT NOT NULL,\n\t${3:value} REAL\n);', detail: 'Create table with primary key', doc: 'Define a new table schema' },
    { prefix: 'dropdb', label: 'DROP DATABASE', body: 'DROP DATABASE IF EXISTS ${1:db_name};', detail: 'Drop database', doc: 'Delete target database' },
    { prefix: 'droptbl', label: 'DROP TABLE', body: 'DROP TABLE IF EXISTS ${1:table_name};', detail: 'Drop table', doc: 'Delete target table' },
    { prefix: 'altertbl', label: 'ALTER TABLE ADD COLUMN', body: 'ALTER TABLE ${1:table_name} ADD COLUMN ${2:col_name} ${3:TEXT};', detail: 'Add column to table', doc: 'Modify table structure' },
    { prefix: 'createidx', label: 'CREATE INDEX', body: 'CREATE INDEX idx_${1:table}_${2:col} ON ${1:table}(${2:col});', detail: 'Create index on column', doc: 'Speed up queries on column' },

    // SQLite Schema & Introspection
    { prefix: 'schema', label: '.schema (View DDL)', body: '.schema ${1:table_name};', detail: 'SQLite .schema command', doc: 'Print CREATE TABLE DDL for database or specific table' },
    { prefix: 'pragma', label: 'PRAGMA table_info', body: 'PRAGMA table_info(${1:table_name});', detail: 'Inspect table columns', doc: 'Returns cid, name, type, notnull, dflt_value, pk' },
    { prefix: 'pragmalt', label: 'PRAGMA table_list', body: 'PRAGMA table_list;', detail: 'List all tables & views', doc: 'Returns schema, name, type, ncol, wr, strict' },
    { prefix: 'pragmafk', label: 'PRAGMA foreign_key_list', body: 'PRAGMA foreign_key_list(${1:table_name});', detail: 'Inspect foreign keys', doc: 'Returns table foreign key constraints' },
    { prefix: 'pragmaidx', label: 'PRAGMA index_list', body: 'PRAGMA index_list(${1:table_name});', detail: 'Inspect table indexes', doc: 'Returns indexes created on table' },
    { prefix: 'sqlitemaster', label: 'SELECT FROM sqlite_master', body: 'SELECT type, name, tbl_name, sql\nFROM sqlite_master\nWHERE type = \'table\' AND name NOT LIKE \'sqlite_%\';', detail: 'Query SQLite Master Schema', doc: 'Inspect SQLite system table catalog' },
    { prefix: 'showcreate', label: 'SHOW CREATE TABLE', body: 'SHOW CREATE TABLE ${1:table_name};', detail: 'Show Create Table statement', doc: 'Display table DDL definition' },

    // Data Manipulation
    { prefix: 'ins', label: 'INSERT INTO VALUES', body: 'INSERT INTO ${1:table_name} (${2:col1, col2}) VALUES\n\t(${3:\'val1\', 100});', detail: 'Insert rows', doc: 'Insert new records into table' },
    { prefix: 'insmul', label: 'INSERT MULTIPLE ROWS', body: 'INSERT INTO ${1:table_name} (${2:name, score}) VALUES\n\t(\'${3:Alice}\', ${4:95}),\n\t(\'${5:Bob}\', ${6:88});', detail: 'Insert multi-row records', doc: 'Batch insert records' },
    { prefix: 'sel', label: 'SELECT * FROM', body: 'SELECT * FROM ${1:table_name};', detail: 'Select all columns', doc: 'Query all rows from table' },
    { prefix: 'selw', label: 'SELECT WHERE', body: 'SELECT * FROM ${1:table_name}\nWHERE ${2:condition};', detail: 'Select with condition', doc: 'Filter rows with WHERE clause' },
    { prefix: 'selord', label: 'SELECT ORDER BY', body: 'SELECT * FROM ${1:table_name}\nORDER BY ${2:col_name} ${3|ASC,DESC|};', detail: 'Select sorted rows', doc: 'Sort rows by column' },
    { prefix: 'sellim', label: 'SELECT LIMIT OFFSET', body: 'SELECT * FROM ${1:table_name}\nLIMIT ${2:10} OFFSET ${3:0};', detail: 'Select paginated rows', doc: 'Pagination with LIMIT & OFFSET' },
    { prefix: 'seljoin', label: 'SELECT INNER JOIN', body: 'SELECT a.${1:col}, b.${2:col}\nFROM ${3:table1} a\nJOIN ${4:table2} b ON a.${5:id} = b.${6:table1_id};', detail: 'Join two tables', doc: 'Query relational data using INNER JOIN' },
    { prefix: 'selleftjoin', label: 'SELECT LEFT JOIN', body: 'SELECT a.*, b.*\nFROM ${1:table1} a\nLEFT JOIN ${2:table2} b ON a.${3:id} = b.${4:foreign_id};', detail: 'Left outer join', doc: 'Include all rows from left table' },
    { prefix: 'selgrp', label: 'SELECT GROUP BY & COUNT', body: 'SELECT ${1:category}, COUNT(*) as total_count, AVG(${2:price}) as avg_price\nFROM ${3:table_name}\nGROUP BY ${1:category}\nHAVING COUNT(*) > ${4:1};', detail: 'Group by with aggregates', doc: 'Aggregate rows with COUNT, AVG, HAVING' },
    { prefix: 'upd', label: 'UPDATE SET WHERE', body: 'UPDATE ${1:table_name}\nSET ${2:column} = ${3:value}\nWHERE ${4:id} = ${5:1};', detail: 'Update rows', doc: 'Update values matching condition' },
    { prefix: 'del', label: 'DELETE FROM WHERE', body: 'DELETE FROM ${1:table_name}\nWHERE ${2:id} = ${3:1};', detail: 'Delete rows', doc: 'Delete records matching condition' },

    // Advanced SQL
    { prefix: 'subq', label: 'Subquery in WHERE', body: 'SELECT * FROM ${1:table1}\nWHERE ${2:col} IN (SELECT ${2:col} FROM ${3:table2} WHERE ${4:cond});', detail: 'Subquery with IN', doc: 'Nested query condition' },
    { prefix: 'casewhen', label: 'CASE WHEN THEN END', body: 'SELECT ${1:name},\n\tCASE\n\t\tWHEN ${2:score} >= 90 THEN \'A\'\n\t\tWHEN ${2:score} >= 80 THEN \'B\'\n\t\tELSE \'C\'\n\tEND as grade\nFROM ${3:students};', detail: 'Conditional CASE column', doc: 'Compute conditional value in SELECT' },
    { prefix: 'cte', label: 'WITH CTE AS (SELECT ...)', body: 'WITH ${1:cte_name} AS (\n\tSELECT ${2:col}, COUNT(*) as cnt\n\tFROM ${3:table_name}\n\tGROUP BY ${2:col}\n)\nSELECT * FROM ${1:cte_name}\nWHERE cnt > 1;', detail: 'Common Table Expression', doc: 'Define CTE temporary table' },
    { prefix: 'trans', label: 'BEGIN TRANSACTION ... COMMIT', body: 'BEGIN TRANSACTION;\n\n${1:-- SQL queries here}\n\nCOMMIT;', detail: 'Atomic transaction block', doc: 'Execute multiple queries atomically' },
    { prefix: 'window', label: 'Window Function (ROW_NUMBER / RANK)', body: 'SELECT ${1:name}, ${2:dept}, ${3:salary},\n\tROW_NUMBER() OVER (PARTITION BY ${2:dept} ORDER BY ${3:salary} DESC) as rank_in_dept\nFROM ${4:employees};', detail: 'Window ranking function', doc: 'Calculate row rank partitioned by group' },
  ],

  // ─── Python ────────────────────────────────────────────────────────────
  python: [
    // Top snippets
    { prefix: 'pr', label: 'print', body: 'print(${1})', detail: 'print(value)', doc: 'Prints values to standard output' },
    { prefix: 'print', label: 'print()', body: 'print(${1})', detail: 'print(...)', doc: 'Print formatted output' },
    { prefix: 'prinf', label: 'print(f"...")', body: 'print(f"${1}")', detail: 'f-string print', doc: 'Print formatted f-string' },
    { prefix: 'inp', label: 'input()', body: 'input(${1})', detail: 'input()', doc: 'Read line from standard input' },
    { prefix: 'inpint', label: 'int(input())', body: 'int(input())', detail: 'int(input())', doc: 'Read integer from standard input' },
    { prefix: 'inplist', label: 'list(map(int, input().split()))', body: 'list(map(int, input().split()))', detail: 'Read integer list', doc: 'Read space-separated integers' },
    { prefix: 'for', label: 'for i in range(n)', body: 'for ${1:i} in range(${2:n}):\n\t${3:pass}', detail: 'for range loop', doc: 'For loop with range' },
    { prefix: 'fore', label: 'for item in iterable', body: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', detail: 'for-in loop', doc: 'Iterate over items' },
    { prefix: 'foren', label: 'for i, item in enumerate(list)', body: 'for ${1:i}, ${2:item} in enumerate(${3:items}):\n\tprint(${1:i}, ${2:item})', detail: 'enumerate loop', doc: 'Iterate with index and value' },
    { prefix: 'while', label: 'while condition', body: 'while ${1:condition}:\n\t${2:pass}', detail: 'while loop', doc: 'While loop structure' },
    { prefix: 'if', label: 'if condition', body: 'if ${1:condition}:\n\t${2:pass}', detail: 'if statement', doc: 'Conditional statement' },
    { prefix: 'ifelse', label: 'if-else block', body: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', detail: 'if-else branch', doc: 'Conditional branch' },
    { prefix: 'def', label: 'def function():', body: 'def ${1:function_name}(${2:args}):\n\t"""${3:Docstring}"""\n\t${4:return None}', detail: 'Function definition', doc: 'Define a function' },
    { prefix: 'class', label: 'class Name:', body: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\tself.${3:prop} = ${2:args}\n\n\tdef __repr__(self):\n\t\treturn f"${1:ClassName}({self.${3:prop}})"', detail: 'Class definition', doc: 'Define a class with __init__' },
    { prefix: 'main', label: 'if __name__ == "__main__":', body: 'def main():\n\t${1:pass}\n\nif __name__ == "__main__":\n\tmain()', detail: 'Main entry point', doc: 'Standard Python main block' },

    // Data Structures & Algorithms
    { prefix: 'listcomp', label: 'List Comprehension', body: '[${1:x} for ${1:x} in ${2:iterable} if ${3:condition}]', detail: '[x for x in list if ...]', doc: 'Create list from comprehension' },
    { prefix: 'dictcomp', label: 'Dict Comprehension', body: '{${1:k}: ${2:v} for ${1:k}, ${2:v} in ${3:items}}', detail: '{k: v for k,v in ...}', doc: 'Create dictionary from comprehension' },
    { prefix: 'lambda', label: 'lambda x: ...', body: 'lambda ${1:x}: ${2:x * 2}', detail: 'Anonymous lambda', doc: 'Inline lambda function' },
    { prefix: 'tryexcept', label: 'try-except-finally', body: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\tprint(f"Error: {e}")\nfinally:\n\t${3:pass}', detail: 'Exception handling', doc: 'Try catch block' },
    { prefix: 'binsearch', label: 'Binary Search Algorithm', body: 'def binary_search(arr, target):\n\tleft, right = 0, len(arr) - 1\n\twhile left <= right:\n\t\tmid = (left + right) // 2\n\t\tif arr[mid] == target:\n\t\t\treturn mid\n\t\telif arr[mid] < target:\n\t\t\tleft = mid + 1\n\t\telse:\n\t\t\tright = mid - 1\n\treturn -1', detail: 'O(log N) Binary Search', doc: 'Search target in sorted array' },
    { prefix: 'bfs', label: 'BFS Graph Traversal', body: 'from collections import deque\n\ndef bfs(graph, start):\n\tvisited = {start}\n\tqueue = deque([start])\n\twhile queue:\n\t\tnode = queue.popleft()\n\t\tprint(node, end=" ")\n\t\tfor neighbor in graph.get(node, []):\n\t\t\tif neighbor not in visited:\n\t\t\t\tvisited.add(neighbor)\n\t\t\t\tqueue.append(neighbor)', detail: 'Breadth-First Search', doc: 'Graph traversal using queue' },
    { prefix: 'dfs', label: 'DFS Graph Traversal', body: 'def dfs(graph, node, visited=None):\n\tif visited is None:\n\t\tvisited = set()\n\tvisited.add(node)\n\tprint(node, end=" ")\n\tfor neighbor in graph.get(node, []):\n\t\tif neighbor not in visited:\n\t\tdfs(graph, neighbor, visited)', detail: 'Depth-First Search', doc: 'Recursive graph traversal' },

    // Libraries & NumPy / SQLite
    { prefix: 'numpy', label: 'import numpy as np', body: 'import numpy as np\n\narr = np.array([${1:1, 2, 3, 4, 5}])\nprint("Array:", arr)\nprint("Mean:", np.mean(arr))\nprint("Sum:", np.sum(arr))', detail: 'NumPy array calculation', doc: 'NumPy array and stats calculation' },
    { prefix: 'pandas', label: 'import pandas as pd', body: 'import pandas as pd\n\ndata = {\n\t"Name": ["Alice", "Bob", "Charlie"],\n\t"Score": [95, 88, 92]\n}\ndf = pd.DataFrame(data)\nprint(df)\nprint("Average Score:", df["Score"].mean())', detail: 'Pandas DataFrame', doc: 'Create and summarize DataFrame' },
    { prefix: 'sqlite', label: 'sqlite3 connect & query', body: 'import sqlite3\n\nconn = sqlite3.connect("server/data/databases/${1:ecommerce_db}.sqlite")\ncursor = conn.cursor()\ncursor.execute("${2:SELECT * FROM customers LIMIT 5}")\nfor row in cursor.fetchall():\n\tprint(row)\nconn.close()', detail: 'SQLite3 database query', doc: 'Connect to database and fetch rows' },
    { prefix: 'jsonread', label: 'json loads & dumps', body: 'import json\n\ndata = {"user": "Alice", "score": 95}\njson_str = json.dumps(data, indent=2)\nprint(json_str)\nparsed = json.loads(json_str)', detail: 'JSON encode/decode', doc: 'Serialize and parse JSON' },
  ],

  // ─── C++ ───────────────────────────────────────────────────────────────
  cpp: [
    { prefix: 'main', label: 'main boilerplate', body: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n\tios_base::sync_with_stdio(false);\n\tcin.tie(NULL);\n\n\t${1:cout << "Hello, Full Code!" << endl;}\n\n\treturn 0;\n}', detail: 'C++ Main Boilerplate', doc: 'Fast I/O main structure' },
    { prefix: 'cout', label: 'cout << endl', body: 'cout << ${1:"Hello"} << endl;', detail: 'cout stream print', doc: 'Print output to stdout' },
    { prefix: 'cin', label: 'cin >> var', body: 'cin >> ${1:n};', detail: 'cin stream input', doc: 'Read input from stdin' },
    { prefix: 'vec', label: 'vector<int> v', body: 'vector<${1:int}> ${2:v} = {${3:1, 2, 3}};\n${2:v}.push_back(${4:4});', detail: 'std::vector dynamic array', doc: 'Dynamic array' },
    { prefix: 'map', label: 'unordered_map<K, V>', body: 'unordered_map<${1:string}, ${2:int}> ${3:mp};\n${3:mp}["${4:key}"] = ${5:100};', detail: 'Hash map O(1)', doc: 'Fast hash map container' },
    { prefix: 'fori', label: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3:cout << ${1:i} << " ";}\n}', detail: 'Standard for loop', doc: 'Loop from 0 to n' },
    { prefix: 'fora', label: 'for (const auto& item : vec)', body: 'for (const auto& ${1:item} : ${2:vec}) {\n\tcout << ${1:item} << " ";\n}', detail: 'Range-based for loop', doc: 'Iterate over elements' },
    { prefix: 'sort', label: 'sort(v.begin(), v.end())', body: 'sort(${1:v}.begin(), ${1:v}.end());', detail: 'std::sort O(N log N)', doc: 'Sort vector in ascending order' },
    { prefix: 'binsearch', label: 'binary_search(v.begin(), v.end(), x)', body: 'bool found = binary_search(${1:v}.begin(), ${1:v}.end(), ${2:target});', detail: 'std::binary_search', doc: 'Check if element exists in sorted range' },
    { prefix: 'pq', label: 'priority_queue<int>', body: 'priority_queue<${1:int}> ${2:pq}; // Max-heap\n${2:pq}.push(${3:10});', detail: 'Max heap priority queue', doc: 'Priority queue container' },
  ],

  // ─── Java ──────────────────────────────────────────────────────────────
  java: [
    { prefix: 'main', label: 'Main Class & method', body: 'import java.util.*;\n\nclass Main {\n\tpublic static void main(String[] args) {\n\t\t// Start here\n\t\t${1}\n\t}\n}', detail: 'Java Boilerplate', doc: 'Standard Main class with java.util.*' },
    { prefix: 'sout', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'System.out.println', doc: 'Print line to stdout' },
    { prefix: 'sop', label: 'System.out.print()', body: 'System.out.print(${1});', detail: 'System.out.print', doc: 'Print without newline to stdout' },
    { prefix: 'souf', label: 'System.out.printf()', body: 'System.out.printf("${1:%s\\n}", ${2:var});', detail: 'System.out.printf', doc: 'Formatted print to stdout' },
    { prefix: 'print', label: 'System.out.print()', body: 'System.out.print(${1});', detail: 'System.out.print', doc: 'Print to stdout' },
    { prefix: 'println', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'System.out.println', doc: 'Print line to stdout' },
    { prefix: 'System.out.println', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'System.out.println', doc: 'Print line to stdout' },
    { prefix: 'System.out.print', label: 'System.out.print()', body: 'System.out.print(${1});', detail: 'System.out.print', doc: 'Print to stdout' },
    { prefix: 'sysout', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'sysout shortcut', doc: 'Eclipse/IntelliJ print shortcut' },
    { prefix: 'syserr', label: 'System.err.println()', body: 'System.err.println(${1});', detail: 'System.err.println', doc: 'Print error line to stderr' },
    { prefix: 'scanner', label: 'Scanner sc = new Scanner(System.in)', body: 'Scanner ${1:sc} = new Scanner(System.in);\nint ${2:n} = ${1:sc}.nextInt();', detail: 'Scanner input', doc: 'Read token input from stdin' },
    { prefix: 'bfr', label: 'BufferedReader Fast I/O', body: 'BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\nStringTokenizer st = new StringTokenizer(br.readLine());', detail: 'Fast I/O', doc: 'High-speed input reader for competitive programming' },
    { prefix: 'sb', label: 'StringBuilder sb', body: 'StringBuilder ${1:sb} = new StringBuilder();\n${1:sb}.append(${2:"text"}).append("\\n");\nSystem.out.print(${1:sb}.toString());', detail: 'StringBuilder buffer', doc: 'Mutable sequence of characters' },

    { prefix: 'psvm', label: 'public static void main(String[] args)', body: 'public static void main(String[] args) {\n\t${1}\n}', detail: 'psvm method', doc: 'Standard Java main method' },
    { prefix: 'fastio', label: 'FastReader competitive programming', body: 'static class FastReader {\n\tBufferedReader br;\n\tStringTokenizer st;\n\tpublic FastReader() { br = new BufferedReader(new InputStreamReader(System.in)); }\n\tString next() {\n\t\twhile (st == null || !st.hasMoreElements()) {\n\t\t\ttry { st = new StringTokenizer(br.readLine()); } catch (IOException e) { e.printStackTrace(); }\n\t\t}\n\t\treturn st.nextToken();\n\t}\n\tint nextInt() { return Integer.parseInt(next()); }\n\tlong nextLong() { return Long.parseLong(next()); }\n\tdouble nextDouble() { return Double.parseDouble(next()); }\n\tString nextLine() { String str = ""; try { str = br.readLine(); } catch (IOException e) { e.printStackTrace(); } return str; }\n}', detail: 'FastReader Class', doc: 'Ultra fast standard input reader' },
    { prefix: 'pw', label: 'PrintWriter out = new PrintWriter(System.out)', body: 'PrintWriter out = new PrintWriter(new BufferedOutputStream(System.out));\n${1:out.println("Hello");}\nout.flush();', detail: 'Fast PrintWriter', doc: 'Fast buffered output writer' },
    { prefix: 'pair', label: 'record Pair<F, S>(F first, S second)', body: 'static record Pair<F, S>(F first, S second) {}', detail: 'Pair Record', doc: 'Generic Pair container in Java' },

    // Lists
    { prefix: 'arraylist', label: 'List<T> = new ArrayList<>()', body: 'List<${1:String}> ${2:list} = new ArrayList<>();\n${2:list}.add(${3:"Item"});', detail: 'ArrayList<E>', doc: 'Resizable array implementation of List' },
    { prefix: 'list', label: 'List<T> = new ArrayList<>()', body: 'List<${1:String}> ${2:list} = new ArrayList<>();\n${2:list}.add(${3:"Item"});', detail: 'ArrayList<E>', doc: 'Resizable array List' },
    { prefix: 'linkedlist', label: 'LinkedList<T> = new LinkedList<>()', body: 'LinkedList<${1:String}> ${2:list} = new LinkedList<>();\n${2:list}.add(${3:"Item"});', detail: 'LinkedList<E>', doc: 'Doubly-linked list implementation' },
    { prefix: 'vector', label: 'Vector<T> = new Vector<>()', body: 'Vector<${1:Integer}> ${2:vec} = new Vector<>();\n${2:vec}.add(${3:10});', detail: 'Vector<E>', doc: 'Thread-safe synchronized growable array' },
    { prefix: 'stack', label: 'Stack<T> = new Stack<>()', body: 'Stack<${1:Integer}> ${2:stack} = new Stack<>();\n${2:stack}.push(${3:10});\nint top = ${2:stack}.pop();', detail: 'Stack<E>', doc: 'LIFO stack container' },

    // Sets
    { prefix: 'hashset', label: 'Set<T> = new HashSet<>()', body: 'Set<${1:String}> ${2:set} = new HashSet<>();\n${2:set}.add(${3:"unique"});', detail: 'HashSet<E> O(1)', doc: 'Hash table based distinct elements set' },
    { prefix: 'set', label: 'Set<T> = new HashSet<>()', body: 'Set<${1:String}> ${2:set} = new HashSet<>();\n${2:set}.add(${3:"unique"});', detail: 'HashSet<E>', doc: 'Unique element collection' },
    { prefix: 'linkedhashset', label: 'Set<T> = new LinkedHashSet<>()', body: 'Set<${1:String}> ${2:set} = new LinkedHashSet<>();\n${2:set}.add(${3:"ordered"});', detail: 'LinkedHashSet<E>', doc: 'Insertion-ordered hash set' },
    { prefix: 'treeset', label: 'TreeSet<T> = new TreeSet<>()', body: 'TreeSet<${1:Integer}> ${2:set} = new TreeSet<>();\n${2:set}.add(${3:10});', detail: 'TreeSet<E> O(log N)', doc: 'Red-Black tree sorted set' },

    // Maps
    { prefix: 'hashmap', label: 'Map<K, V> = new HashMap<>()', body: 'Map<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();\n${3:map}.put(${4:"key"}, ${5:100});', detail: 'HashMap<K, V> O(1)', doc: 'Hash table key-value map' },
    { prefix: 'map', label: 'Map<K, V> = new HashMap<>()', body: 'Map<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();\n${3:map}.put(${4:"key"}, ${5:100});', detail: 'HashMap<K, V>', doc: 'Key-value map' },
    { prefix: 'getordefault', label: 'map.getOrDefault(key, 0)', body: '${1:map}.put(${2:key}, ${1:map}.getOrDefault(${2:key}, 0) + 1);', detail: 'Frequency Map Counter', doc: 'Increment frequency with getOrDefault' },
    { prefix: 'linkedhashmap', label: 'Map<K, V> = new LinkedHashMap<>()', body: 'Map<${1:String}, ${2:Integer}> ${3:map} = new LinkedHashMap<>();\n${3:map}.put(${4:"key"}, ${5:100});', detail: 'LinkedHashMap<K, V>', doc: 'Insertion-order preserving map' },
    { prefix: 'treemap', label: 'TreeMap<K, V> = new TreeMap<>()', body: 'TreeMap<${1:String}, ${2:Integer}> ${3:map} = new TreeMap<>();\n${3:map}.put(${4:"key"}, ${5:100});', detail: 'TreeMap<K, V> O(log N)', doc: 'Sorted Red-Black tree map' },
    { prefix: 'concurrenthashmap', label: 'ConcurrentHashMap<K, V>()', body: 'ConcurrentHashMap<${1:String}, ${2:Integer}> ${3:map} = new ConcurrentHashMap<>();\n${3:map}.put(${4:"key"}, ${5:100});', detail: 'ConcurrentHashMap<K, V>', doc: 'Thread-safe concurrent map' },

    // Queues & Heaps
    { prefix: 'queue', label: 'Queue<T> = new LinkedList<>()', body: 'Queue<${1:Integer}> ${2:q} = new LinkedList<>();\n${2:q}.offer(${3:10});\nint val = ${2:q}.poll();', detail: 'Queue<E>', doc: 'FIFO queue container' },
    { prefix: 'pq', label: 'PriorityQueue<T> (Min-Heap)', body: 'PriorityQueue<${1:Integer}> ${2:pq} = new PriorityQueue<>();\n${2:pq}.offer(${3:10});\nint min = ${2:pq}.poll();', detail: 'PriorityQueue<E> Min-Heap', doc: 'Min-heap priority queue' },
    { prefix: 'pqmax', label: 'PriorityQueue<T> (Max-Heap)', body: 'PriorityQueue<${1:Integer}> ${2:maxPq} = new PriorityQueue<>(Collections.reverseOrder());\n${2:maxPq}.offer(${3:10});\nint max = ${2:maxPq}.poll();', detail: 'PriorityQueue<E> Max-Heap', doc: 'Max-heap priority queue' },
    { prefix: 'deque', label: 'Deque<T> = new ArrayDeque<>()', body: 'Deque<${1:Integer}> ${2:deque} = new ArrayDeque<>();\n${2:deque}.addFirst(${3:1});\n${2:deque}.addLast(${4:2});\nint first = ${2:deque}.pollFirst();', detail: 'ArrayDeque<E>', doc: 'Double-ended queue' },

    // Utilities & Sorting
    { prefix: 'collsort', label: 'Collections.sort(list)', body: 'Collections.sort(${1:list});', detail: 'Collections.sort', doc: 'Sort list in ascending order' },
    { prefix: 'collreverse', label: 'Collections.reverse(list)', body: 'Collections.reverse(${1:list});', detail: 'Collections.reverse', doc: 'Reverse elements in list' },
    { prefix: 'collbinsearch', label: 'Collections.binarySearch(list, key)', body: 'int ${1:idx} = Collections.binarySearch(${2:list}, ${3:key});', detail: 'Collections.binarySearch', doc: 'Binary search in sorted list' },
    { prefix: 'collmin', label: 'Collections.min(list)', body: '${1:int min = }Collections.min(${2:list});', detail: 'Collections.min', doc: 'Find minimum element in collection' },
    { prefix: 'collmax', label: 'Collections.max(list)', body: '${1:int max = }Collections.max(${2:list});', detail: 'Collections.max', doc: 'Find maximum element in collection' },
    { prefix: 'arrsort', label: 'Arrays.sort(arr)', body: 'Arrays.sort(${1:arr});', detail: 'Arrays.sort', doc: 'Dual-pivot Quicksort for arrays' },
    { prefix: 'arrsort2d', label: 'Arrays.sort 2D array (a, b) -> a[0] - b[0]', body: 'Arrays.sort(${1:arr}, (a, b) -> Integer.compare(a[${2:0}], b[${2:0}]));', detail: 'Sort 2D Array', doc: 'Sort 2D array by column index' },
    { prefix: 'arrfill', label: 'Arrays.fill(arr, val)', body: 'Arrays.fill(${1:arr}, ${2:-1});', detail: 'Arrays.fill', doc: 'Fill 1D array with value' },
    { prefix: 'arrfill2d', label: 'Arrays.fill 2D matrix', body: 'for (int[] row : ${1:matrix}) Arrays.fill(row, ${2:-1});', detail: 'Fill 2D Array', doc: 'Fill entire 2D matrix with value' },
    { prefix: 'arrtolist', label: 'Arrays.asList(...)', body: 'List<${1:String}> ${2:list} = Arrays.asList(${3:"A", "B", "C"});', detail: 'Arrays.asList', doc: 'Fixed-size list backed by array' },
    { prefix: 'arrcopy', label: 'Arrays.copyOf(arr, newLength)', body: 'int[] ${1:copy} = Arrays.copyOf(${2:arr}, ${2:arr}.length);', detail: 'Arrays.copyOf', doc: 'Copy array to new instance' },

    // Loops & Iterations
    { prefix: 'fori', label: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'Standard for loop', doc: 'Loop counter 0 to n' },
    { prefix: 'forj', label: 'for (int j = 0; j < m; j++)', body: 'for (int ${1:j} = 0; ${1:j} < ${2:m}; ${1:j}++) {\n\t${3}\n}', detail: 'Nested for loop (j)', doc: 'Loop counter j from 0 to m' },
    { prefix: 'forr', label: 'for (int i = n - 1; i >= 0; i--)', body: 'for (int ${1:i} = ${2:n} - 1; ${1:i} >= 0; ${1:i}--) {\n\t${3}\n}', detail: 'Reverse for loop', doc: 'Loop backwards from n-1 down to 0' },
    { prefix: 'fore', label: 'for (Type item : collection)', body: 'for (${1:String} ${2:item} : ${3:list}) {\n\tSystem.out.println(${2:item});\n}', detail: 'Enhanced for-each loop', doc: 'Iterate over collection elements' },
    { prefix: 'while', label: 'while (condition)', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'While loop', doc: 'Standard while loop' },
    { prefix: 'dowhile', label: 'do { ... } while (condition);', body: 'do {\n\t${1}\n} while (${2:condition});', detail: 'Do-While loop', doc: 'Loop that executes body at least once' },
    { prefix: 'sw', label: 'switch (expr) { case ... }', body: 'switch (${1:val}) {\n\tcase ${2:1} -> {\n\t\t${3}\n\t}\n\tdefault -> {\n\t\t${4}\n\t}\n}', detail: 'Modern switch expression', doc: 'Pattern matching switch' },
    { prefix: 'mapentry', label: 'for (Map.Entry<K, V> entry : map.entrySet())', body: 'for (Map.Entry<${1:String}, ${2:Integer}> ${3:entry} : ${4:map}.entrySet()) {\n\tSystem.out.println(${3:entry}.getKey() + " -> " + ${3:entry}.getValue());\n}', detail: 'Iterate Map Entries', doc: 'Loop through map keys and values' },
    { prefix: 'iterator', label: 'Iterator<T> it = list.iterator()', body: 'Iterator<${1:String}> ${2:it} = ${3:list}.iterator();\nwhile (${2:it}.hasNext()) {\n\t${1:String} ${4:item} = ${2:it}.next();\n\t${5}\n}', detail: 'Iterator traversal', doc: 'Collection iterator' },

    // Math & Algorithms
    { prefix: 'mathmax', label: 'Math.max(a, b)', body: 'Math.max(${1:a}, ${2:b})', detail: 'Math.max', doc: 'Maximum of two numbers' },
    { prefix: 'mathmin', label: 'Math.min(a, b)', body: 'Math.min(${1:a}, ${2:b})', detail: 'Math.min', doc: 'Minimum of two numbers' },
    { prefix: 'mathabs', label: 'Math.abs(n)', body: 'Math.abs(${1:n})', detail: 'Math.abs', doc: 'Absolute value' },
    { prefix: 'mathpow', label: 'Math.pow(base, exp)', body: 'Math.pow(${1:base}, ${2:exp})', detail: 'Math.pow', doc: 'Power calculation' },
    { prefix: 'mathsqrt', label: 'Math.sqrt(n)', body: 'Math.sqrt(${1:n})', detail: 'Math.sqrt', doc: 'Square root calculation' },
    { prefix: 'gcd', label: 'static int gcd(int a, int b)', body: 'static int gcd(int a, int b) {\n\treturn b == 0 ? a : gcd(b, a % b);\n}', detail: 'Greatest Common Divisor', doc: 'Euclidean algorithm for GCD' },
    { prefix: 'lcm', label: 'static int lcm(int a, int b)', body: 'static int lcm(int a, int b) {\n\treturn (a / gcd(a, b)) * b;\n}', detail: 'Lowest Common Multiple', doc: 'LCM helper using GCD' },
    { prefix: 'powmod', label: 'static long powMod(base, exp, mod)', body: 'static long powMod(long base, long exp, long mod) {\n\tlong res = 1;\n\tbase %= mod;\n\twhile (exp > 0) {\n\t\tif ((exp & 1) == 1) res = (res * base) % mod;\n\t\tbase = (base * base) % mod;\n\t\texp >>= 1;\n\t}\n\treturn res;\n}', detail: 'Binary Exponentiation', doc: 'Fast modular exponentiation O(log exp)' },
    { prefix: 'isprime', label: 'static boolean isPrime(n)', body: 'static boolean isPrime(long n) {\n\tif (n <= 1) return false;\n\tif (n <= 3) return true;\n\tif (n % 2 == 0 || n % 3 == 0) return false;\n\tfor (long i = 5; i * i <= n; i += 6) {\n\t\tif (n % i == 0 || n % (i + 2) == 0) return false;\n\t}\n\treturn true;\n}', detail: 'Prime Check O(sqrt N)', doc: 'Fast primality test' },
    { prefix: 'sieve', label: 'Sieve of Eratosthenes', body: 'static boolean[] sieve(int n) {\n\tboolean[] isPrime = new boolean[n + 1];\n\tArrays.fill(isPrime, true);\n\tisPrime[0] = isPrime[1] = false;\n\tfor (int p = 2; p * p <= n; p++) {\n\t\tif (isPrime[p]) {\n\t\t\tfor (int i = p * p; i <= n; i += p) isPrime[i] = false;\n\t\t}\n\t}\n\treturn isPrime;\n}', detail: 'Sieve Algorithm', doc: 'Prime sieve up to N' },
    { prefix: 'binarysearch', label: 'Binary Search Algorithm', body: 'static int binarySearch(int[] arr, int target) {\n\tint low = 0, high = arr.length - 1;\n\twhile (low <= high) {\n\t\tint mid = low + (high - low) / 2;\n\t\tif (arr[mid] == target) return mid;\n\t\telse if (arr[mid] < target) low = mid + 1;\n\t\telse high = mid - 1;\n\t}\n\treturn -1;\n}', detail: 'Binary Search Template', doc: 'Iterative binary search' },
    { prefix: 'bfs', label: 'Breadth First Search (BFS)', body: 'Queue<Integer> q = new LinkedList<>();\nboolean[] visited = new boolean[${1:n}];\nq.offer(${2:startNode});\nvisited[${2:startNode}] = true;\n\nwhile (!q.isEmpty()) {\n\tint curr = q.poll();\n\tfor (int neighbor : ${3:adj}.get(curr)) {\n\t\tif (!visited[neighbor]) {\n\t\t\tvisited[neighbor] = true;\n\t\t\tq.offer(neighbor);\n\t\t}\n\t}\n}', detail: 'BFS Graph Traversal', doc: 'Queue-based BFS algorithm' },
    { prefix: 'dfs', label: 'Depth First Search (DFS)', body: 'static void dfs(int node, List<List<Integer>> adj, boolean[] visited) {\n\tvisited[node] = true;\n\tfor (int neighbor : adj.get(node)) {\n\t\tif (!visited[neighbor]) {\n\t\t\tdfs(neighbor, adj, visited);\n\t\t}\n\t}\n}', detail: 'DFS Graph Traversal', doc: 'Recursive DFS template' },
    { prefix: 'dsu', label: 'Disjoint Set Union (DSU / Union-Find)', body: 'static class DSU {\n\tint[] parent, rank;\n\tpublic DSU(int n) {\n\t\tparent = new int[n];\n\t\trank = new int[n];\n\t\tfor (int i = 0; i < n; i++) parent[i] = i;\n\t}\n\tpublic int find(int i) {\n\t\tif (parent[i] == i) return i;\n\t\treturn parent[i] = find(parent[i]);\n\t}\n\tpublic boolean union(int i, int j) {\n\t\tint rootI = find(i), rootJ = find(j);\n\t\tif (rootI == rootJ) return false;\n\t\tif (rank[rootI] < rank[rootJ]) parent[rootI] = rootJ;\n\t\telse if (rank[rootI] > rank[rootJ]) parent[rootJ] = rootI;\n\t\telse { parent[rootJ] = rootI; rank[rootI]++; }\n\t\treturn true;\n\t}\n}', detail: 'DSU / Union-Find', doc: 'Disjoint Set Union with path compression' },

    // Streams & Lambdas
    { prefix: 'streamfilter', label: 'list.stream().filter().collect()', body: 'List<${1:String}> ${2:filtered} = ${3:list}.stream()\n\t.filter(${4:item -> item.length() > 0})\n\t.collect(Collectors.toList());', detail: 'Stream Filter', doc: 'Filter collection into new list' },
    { prefix: 'streammap', label: 'list.stream().map().collect()', body: 'List<${1:Integer}> ${2:mapped} = ${3:list}.stream()\n\t.map(${4:String::length})\n\t.collect(Collectors.toList());', detail: 'Stream Map', doc: 'Transform collection elements' },
    { prefix: 'streamsum', label: 'list.stream().mapToInt().sum()', body: 'int ${1:sum} = ${2:list}.stream().mapToInt(${3:Integer::intValue}).sum();', detail: 'Stream Sum', doc: 'Sum integer elements with stream' },
    { prefix: 'streamgroup', label: 'list.stream().collect(groupingBy())', body: 'Map<${1:Integer}, List<${2:String}>> ${3:grouped} = ${4:list}.stream()\n\t.collect(Collectors.groupingBy(${5:String::length}));', detail: 'Stream Grouping', doc: 'Group collection into Map' },
    { prefix: 'optional', label: 'Optional<T> value check', body: 'Optional.ofNullable(${1:value}).orElse(${2:defaultValue});', detail: 'Optional orElse', doc: 'Safely handle null with Optional' },

    // OOP & Methods
    { prefix: 'constructor', label: 'Class constructor', body: 'public ${1:MyClass}(${2:int id}) {\n\tthis.${3:id} = ${2:id};\n}', detail: 'Constructor', doc: 'Define class constructor' },
    { prefix: 'getter', label: 'public Type getProperty()', body: 'public ${1:String} get${2:Name}() {\n\treturn this.${3:name};\n}', detail: 'Getter method', doc: 'Standard getter' },
    { prefix: 'setter', label: 'public void setProperty(Type value)', body: 'public void set${1:Name}(${2:String} ${3:name}) {\n\tthis.${3:name} = ${3:name};\n}', detail: 'Setter method', doc: 'Standard setter' },
    { prefix: 'tostring', label: '@Override public String toString()', body: '@Override\npublic String toString() {\n\treturn "${1:Class}[" + ${2} + "]";\n}', detail: 'toString() method', doc: 'String representation of object' },
    { prefix: 'equals', label: '@Override public boolean equals(Object o)', body: '@Override\npublic boolean equals(Object o) {\n\tif (this == o) return true;\n\tif (!(o instanceof ${1:MyClass} that)) return false;\n\treturn Objects.equals(this.${2:id}, that.${2:id});\n}\n\n@Override\npublic int hashCode() {\n\treturn Objects.hash(this.${2:id});\n}', detail: 'equals & hashCode', doc: 'Standard object identity comparison' },
    { prefix: 'comparator', label: 'Comparator.comparing()', body: 'Comparator.comparing(${1:Person::getAge}).thenComparing(${2:Person::getName})', detail: 'Chained Comparator', doc: 'Comparator for sorting objects' },
    { prefix: 'record', label: 'public record RecordName(...) {}', body: 'public record ${1:Person}(${2:String name, int age}) {}', detail: 'Java 17+ Record', doc: 'Immutable data carrier class' },
    { prefix: 'interface', label: 'public interface InterfaceName {}', body: 'public interface ${1:Identifiable} {\n\t${2:String getId();}\n}', detail: 'Interface', doc: 'Contract definition' },

    // Concurrency
    { prefix: 'thread', label: 'new Thread(() -> { ... }).start()', body: 'new Thread(() -> {\n\t${1}\n}).start();', detail: 'Spawn Thread', doc: 'Run task on new thread' },
    { prefix: 'executor', label: 'Executors.newFixedThreadPool()', body: 'ExecutorService executor = Executors.newFixedThreadPool(${1:4});\nexecutor.submit(() -> {\n\t${2}\n});\nexecutor.shutdown();', detail: 'Executor Service', doc: 'ThreadPool for managing concurrency' },

    // Exception Handling
    { prefix: 'trycatch', label: 'try { ... } catch (Exception e)', body: 'try {\n\t${1:// Code that may throw exception}\n} catch (${2:Exception} e) {\n\tSystem.err.println("Caught exception: " + e.getMessage());\n\te.printStackTrace();\n}', detail: 'Try-Catch Block', doc: 'Handle runtime & checked exceptions' },
    { prefix: 'trycatchfin', label: 'try-catch-finally block', body: 'try {\n\t${1:// Code}\n} catch (${2:Exception} e) {\n\tSystem.err.println("Error: " + e.getMessage());\n} finally {\n\t${3:// Cleanup resource code}\n}', detail: 'Try-Catch-Finally', doc: 'Execute finally block regardless of exception' },
    { prefix: 'throw', label: 'throw new Exception("message")', body: 'throw new ${1:IllegalArgumentException}("${2:Invalid argument provided}");', detail: 'Throw Exception', doc: 'Explicitly throw a new exception' },
    { prefix: 'throws', label: 'method() throws Exception', body: 'public ${1:void} ${2:doSomething}() throws ${3:Exception} {\n\t${4}\n}', detail: 'Throws Clause', doc: 'Declare method that throws checked exceptions' },
    { prefix: 'customexc', label: 'class CustomException extends Exception', body: 'static class ${1:CustomException} extends Exception {\n\tpublic ${1:CustomException}(String message) {\n\t\tsuper(message);\n\t}\n\tpublic ${1:CustomException}(String message, Throwable cause) {\n\t\tsuper(message, cause);\n\t}\n}', detail: 'Custom Exception Class', doc: 'Define custom application exception' },
    { prefix: 'trywith', label: 'try-with-resources', body: 'try (${1:Scanner sc = new Scanner(System.in)}) {\n\t${2}\n} catch (Exception e) {\n\te.printStackTrace();\n}', detail: 'Auto-closable Try', doc: 'Try with automatic resource cleanup' },
  ],

  // ─── JavaScript / TypeScript ────────────────────────────────────────────
  javascript: [
    { prefix: 'clg', label: 'console.log()', body: 'console.log(${1});', detail: 'console.log', doc: 'Print to console' },
    { prefix: 'clt', label: 'console.table()', body: 'console.table(${1});', detail: 'console.table', doc: 'Print object/array as table' },
    { prefix: 'afn', label: 'const fn = () => {}', body: 'const ${1:funcName} = (${2:args}) => {\n\t${3:return null;}\n};', detail: 'Arrow function', doc: 'ES6 Arrow function' },
    { prefix: 'asyncfn', label: 'async function', body: 'async function ${1:fetchData}() {\n\ttry {\n\t\tconst res = await fetch("${2:/api/data}");\n\t\tconst data = await res.json();\n\t\tconsole.log(data);\n\t} catch (err) {\n\t\tconsole.error(err);\n\t}\n}', detail: 'async/await function', doc: 'Asynchronous fetch helper' },
    { prefix: 'map', label: 'array.map()', body: '${1:array}.map((${2:item}) => ${3:item})', detail: 'Array transform map', doc: 'Transform each element' },
    { prefix: 'filter', label: 'array.filter()', body: '${1:array}.filter((${2:item}) => ${3:item > 0})', detail: 'Array filter', doc: 'Filter elements by predicate' },
    { prefix: 'reduce', label: 'array.reduce()', body: '${1:array}.reduce((acc, curr) => acc + curr, 0)', detail: 'Array reduce sum', doc: 'Accumulate array values' },
    { prefix: 'fetchdb', label: 'Fetch Full Code SQL API', body: 'const res = await fetch("/api/db/query", {\n\tmethod: "POST",\n\theaders: { "Content-Type": "application/json" },\n\tbody: JSON.stringify({\n\t\tdatabase: "${1:ecommerce_db}",\n\t\tquery: "${2:SELECT * FROM customers LIMIT 5}"\n\t})\n});\nconst result = await res.json();\nconsole.table(result.rows);', detail: 'Query backend database', doc: 'Call Full Code SQL endpoint' },
  ],

  // ─── Go ─────────────────────────────────────────────────────────────────
  go: [
    { prefix: 'main', label: 'package main boilerplate', body: 'package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("Hello, Go in Full Code!")\n\t${1}\n}', detail: 'Go main template', doc: 'Executable Go program' },
    { prefix: 'pl', label: 'fmt.Println()', body: 'fmt.Println(${1})', detail: 'fmt.Println', doc: 'Print line' },
    { prefix: 'forr', label: 'for idx, val := range slice', body: 'for ${1:idx}, ${2:val} := range ${3:items} {\n\tfmt.Println(${1:idx}, ${2:val})\n}', detail: 'for range loop', doc: 'Iterate over slice or map' },
    { prefix: 'struct', label: 'type Name struct', body: 'type ${1:Person} struct {\n\tName string\n\tAge  int\n}', detail: 'Struct definition', doc: 'Define custom struct type' },
  ],

  // ─── Rust ───────────────────────────────────────────────────────────────
  rust: [
    { prefix: 'main', label: 'fn main() boilerplate', body: 'fn main() {\n\tprintln!("Hello, Rust in Full Code!");\n\t${1}\n}', detail: 'Rust main function', doc: 'Rust entry point' },
    { prefix: 'pl', label: 'println!()', body: 'println!("${1:Hello}");', detail: 'println! macro', doc: 'Print formatted line' },
    { prefix: 'vec', label: 'let mut v = vec![]', body: 'let mut ${1:v} = vec![${2:1, 2, 3}];\n${1:v}.push(${3:4});\nprintln!("{:?}", ${1:v});', detail: 'Vec collection', doc: 'Growable array vector' },
    { prefix: 'struct', label: 'struct Name { ... }', body: '#[derive(Debug)]\nstruct ${1:User} {\n\tusername: String,\n\tscore: u32,\n}', detail: 'Struct with Debug', doc: 'Custom struct type' },
  ],

  // ─── HTML ───────────────────────────────────────────────────────────────
  html: [
    { prefix: 'html5', label: 'HTML5 Boilerplate', body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t<h1>${2:Hello World}</h1>\n\t<p>${3:Welcome to Full Code!}</p>\n</body>\n</html>', detail: 'HTML5 Template', doc: 'Complete HTML5 document' },
    { prefix: 'btn', label: '<button>Click Me</button>', body: '<button class="${1:btn}">${2:Click Me}</button>', detail: 'Button element', doc: 'Interactive button' },
    { prefix: 'card', label: '<div class="card">', body: '<div class="card">\n\t<h2>${1:Card Title}</h2>\n\t<p>${2:Card description goes here.}</p>\n\t<button>${3:Learn More}</button>\n</div>', detail: 'Card component', doc: 'UI Card container' },
  ],

  // ─── CSS ────────────────────────────────────────────────────────────────
  css: [
    { prefix: 'flexc', label: 'display: flex; center', body: 'display: flex;\nalign-items: center;\njustify-content: center;', detail: 'Flexbox center', doc: 'Center children both axes' },
    { prefix: 'gridc', label: 'display: grid; auto-fill', body: 'display: grid;\ngrid-template-columns: repeat(auto-fill, minmax(${1:250px}, 1fr));\ngap: ${2:1rem};', detail: 'Responsive grid', doc: 'Auto-fill CSS grid layout' },
    { prefix: 'glass', label: 'Glassmorphism effect', body: 'background: rgba(255, 255, 255, 0.05);\nbackdrop-filter: blur(12px);\n-webkit-backdrop-filter: blur(12px);\nborder: 1px solid rgba(255, 255, 255, 0.1);\nborder-radius: 12px;', detail: 'Glassmorphism container', doc: 'Frosted glass UI effect' },
  ],
};
