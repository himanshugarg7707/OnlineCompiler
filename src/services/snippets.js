// Code Snippets & IntelliSense Word Recommendations
// Comprehensive autocomplete suggestions, keywords, and standard library methods for all 19 languages

/**
 * Register completion providers for Monaco editor
 */
export function registerSnippets(monaco) {
  const languages = [
    'python', 'cpp', 'c', 'java', 'javascript', 'typescript',
    'csharp', 'kotlin', 'swift', 'go', 'rust', 'php', 'ruby',
    'r', 'perl', 'scala', 'sql', 'html', 'css',
  ];

  languages.forEach((langId) => {
    const items = COMPLETIONS[langId] || [];
    if (items.length === 0) return;

    monaco.languages.registerCompletionItemProvider(langId, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: items.map((s, idx) => ({
            label: s.label || s.prefix,
            kind: s.kind ? monaco.languages.CompletionItemKind[s.kind] : monaco.languages.CompletionItemKind.Snippet,
            documentation: s.doc || s.description,
            insertText: s.insertText || s.body,
            insertTextRules: s.insertTextRules ?? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: s.detail || (s.kind ? s.kind : 'Snippet'),
            sortText: String(idx).padStart(4, '0'),
          })),
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
    { prefix: 'main', label: 'main boilerplate', body: '#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n\tios_base::sync_with_stdio(false);\n\tcin.tie(NULL);\n\n\t${1:cout << "Hello, CodeForge AI!" << endl;}\n\n\treturn 0;\n}', detail: 'C++ Main Boilerplate', doc: 'Fast I/O main structure' },
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
    { prefix: 'main', label: 'Main Class & method', body: 'import java.util.*;\n\nclass Main {\n\tpublic static void main(String[] args) {\n\t\tScanner sc = new Scanner(System.in);\n\t\tSystem.out.println("Hello, Java in CodeForge AI!");\n\t\t${1}\n\t}\n}', detail: 'Java Class Boilerplate', doc: 'Main execution template' },
    { prefix: 'sout', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'Print to stdout', doc: 'Print line' },
    { prefix: 'scanner', label: 'Scanner sc = new Scanner(System.in)', body: 'Scanner ${1:sc} = new Scanner(System.in);\nint ${2:n} = ${1:sc}.nextInt();', detail: 'Scanner input', doc: 'Read tokens from stdin' },
    { prefix: 'list', label: 'List<String> list = new ArrayList<>()', body: 'List<${1:String}> ${2:list} = new ArrayList<>();\n${2:list}.add("${3:Item}");', detail: 'ArrayList collection', doc: 'Dynamic list' },
    { prefix: 'map', label: 'Map<K, V> map = new HashMap<>()', body: 'Map<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();\n${3:map}.put("${4:key}", ${5:100});', detail: 'HashMap dictionary', doc: 'Key-value map' },
    { prefix: 'fori', label: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'Standard for loop', doc: 'Loop counter' },
    { prefix: 'fore', label: 'for (Type item : collection)', body: 'for (${1:String} ${2:item} : ${3:list}) {\n\tSystem.out.println(${2:item});\n}', detail: 'Enhanced for-each loop', doc: 'Iterate over items' },
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
    { prefix: 'fetchdb', label: 'Fetch CodeForge SQL API', body: 'const res = await fetch("/api/db/query", {\n\tmethod: "POST",\n\theaders: { "Content-Type": "application/json" },\n\tbody: JSON.stringify({\n\t\tdatabase: "${1:ecommerce_db}",\n\t\tquery: "${2:SELECT * FROM customers LIMIT 5}"\n\t})\n});\nconst result = await res.json();\nconsole.table(result.rows);', detail: 'Query backend database', doc: 'Call CodeForge SQL endpoint' },
  ],

  // ─── Go ─────────────────────────────────────────────────────────────────
  go: [
    { prefix: 'main', label: 'package main boilerplate', body: 'package main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("Hello, Go in CodeForge AI!")\n\t${1}\n}', detail: 'Go main template', doc: 'Executable Go program' },
    { prefix: 'pl', label: 'fmt.Println()', body: 'fmt.Println(${1})', detail: 'fmt.Println', doc: 'Print line' },
    { prefix: 'forr', label: 'for idx, val := range slice', body: 'for ${1:idx}, ${2:val} := range ${3:items} {\n\tfmt.Println(${1:idx}, ${2:val})\n}', detail: 'for range loop', doc: 'Iterate over slice or map' },
    { prefix: 'struct', label: 'type Name struct', body: 'type ${1:Person} struct {\n\tName string\n\tAge  int\n}', detail: 'Struct definition', doc: 'Define custom struct type' },
  ],

  // ─── Rust ───────────────────────────────────────────────────────────────
  rust: [
    { prefix: 'main', label: 'fn main() boilerplate', body: 'fn main() {\n\tprintln!("Hello, Rust in CodeForge AI!");\n\t${1}\n}', detail: 'Rust main function', doc: 'Rust entry point' },
    { prefix: 'pl', label: 'println!()', body: 'println!("${1:Hello}");', detail: 'println! macro', doc: 'Print formatted line' },
    { prefix: 'vec', label: 'let mut v = vec![]', body: 'let mut ${1:v} = vec![${2:1, 2, 3}];\n${1:v}.push(${3:4});\nprintln!("{:?}", ${1:v});', detail: 'Vec collection', doc: 'Growable array vector' },
    { prefix: 'struct', label: 'struct Name { ... }', body: '#[derive(Debug)]\nstruct ${1:User} {\n\tusername: String,\n\tscore: u32,\n}', detail: 'Struct with Debug', doc: 'Custom struct type' },
  ],

  // ─── HTML ───────────────────────────────────────────────────────────────
  html: [
    { prefix: 'html5', label: 'HTML5 Boilerplate', body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t<h1>${2:Hello World}</h1>\n\t<p>${3:Welcome to CodeForge AI!}</p>\n</body>\n</html>', detail: 'HTML5 Template', doc: 'Complete HTML5 document' },
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
