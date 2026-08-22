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

// ─── Completion database ──────────────────────────────────────────────────

const COMPLETIONS = {
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
    { prefix: 'while', label: 'while condition', body: 'while ${1:condition}:\n\t${2:pass}', detail: 'while loop', doc: 'While loop structure' },
    { prefix: 'if', label: 'if condition', body: 'if ${1:condition}:\n\t${2:pass}', detail: 'if statement', doc: 'Conditional statement' },
    { prefix: 'ife', label: 'if-else', body: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', detail: 'if-else', doc: 'If-else branching' },
    { prefix: 'elif', label: 'elif condition', body: 'elif ${1:condition}:\n\t${2:pass}', detail: 'elif', doc: 'Else if branch' },
    { prefix: 'def', label: 'def function()', body: 'def ${1:function_name}(${2:params}):\n\t${3:pass}', detail: 'def function', doc: 'Define a function' },
    { prefix: 'defr', label: 'def function() -> return', body: 'def ${1:function_name}(${2:params}):\n\t${3:result = None}\n\treturn ${4:result}', detail: 'function with return', doc: 'Function returning a value' },
    { prefix: 'class', label: 'class ClassName', body: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', detail: 'class definition', doc: 'Define a class with __init__' },
    { prefix: 'try', label: 'try-except', body: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:print(e)}', detail: 'try-except', doc: 'Handle exceptions' },
    { prefix: 'main', label: 'if __name__ == "__main__"', body: 'if __name__ == "__main__":\n\t${1:main()}', detail: 'main guard', doc: 'Entry point guard' },
    { prefix: 'numpy', label: 'import numpy as np', body: 'import numpy as np\n', detail: 'import numpy', doc: 'Import NumPy scientific library' },
    { prefix: 'stats', label: 'import statistics as st', body: 'import statistics as st\n', detail: 'import statistics', doc: 'Python statistics library' },
    { prefix: 'math', label: 'import math', body: 'import math\n', detail: 'import math', doc: 'Python math module' },

    // Methods & Functions
    { label: 'len', insertText: 'len(${1:obj})', kind: 'Function', detail: 'len(s) -> int', doc: 'Return number of items in container' },
    { label: 'range', insertText: 'range(${1:stop})', kind: 'Function', detail: 'range(start, stop[, step])', doc: 'Generate sequence of numbers' },
    { label: 'sum', insertText: 'sum(${1:iterable})', kind: 'Function', detail: 'sum(iterable[, start])', doc: 'Sum elements of iterable' },
    { label: 'min', insertText: 'min(${1:iterable})', kind: 'Function', detail: 'min(a, b, ...)', doc: 'Return minimum value' },
    { label: 'max', insertText: 'max(${1:iterable})', kind: 'Function', detail: 'max(a, b, ...)', doc: 'Return maximum value' },
    { label: 'abs', insertText: 'abs(${1:x})', kind: 'Function', detail: 'abs(x)', doc: 'Return absolute value' },
    { label: 'round', insertText: 'round(${1:number}, ${2:ndigits})', kind: 'Function', detail: 'round(n, digits)', doc: 'Round a number' },
    { label: 'sorted', insertText: 'sorted(${1:iterable})', kind: 'Function', detail: 'sorted(iterable, key=, reverse=)', doc: 'Return a new sorted list' },
    { label: 'enumerate', insertText: 'enumerate(${1:iterable})', kind: 'Function', detail: 'enumerate(iterable, start=0)', doc: 'Yield (index, item) pairs' },
    { label: 'zip', insertText: 'zip(${1:iter1}, ${2:iter2})', kind: 'Function', detail: 'zip(*iterables)', doc: 'Combine iterables element-wise' },
    { label: 'map', insertText: 'map(${1:func}, ${2:iterable})', kind: 'Function', detail: 'map(func, *iterables)', doc: 'Apply function to every item' },
    { label: 'filter', insertText: 'filter(${1:func}, ${2:iterable})', kind: 'Function', detail: 'filter(func, iterable)', doc: 'Filter elements using predicate' },
    { label: 'append', insertText: 'append(${1:x})', kind: 'Method', detail: 'list.append(x)', doc: 'Append object to the end of list' },
    { label: 'extend', insertText: 'extend(${1:iterable})', kind: 'Method', detail: 'list.extend(iterable)', doc: 'Extend list by appending elements from iterable' },
    { label: 'pop', insertText: 'pop(${1:index})', kind: 'Method', detail: 'list.pop([i])', doc: 'Remove and return item at index' },
    { label: 'split', insertText: 'split(${1:" "})', kind: 'Method', detail: 'str.split(sep=None)', doc: 'Split string into words' },
    { label: 'join', insertText: 'join(${1:iterable})', kind: 'Method', detail: 'str.join(iterable)', doc: 'Concatenate strings with delimiter' },
    { label: 'strip', insertText: 'strip()', kind: 'Method', detail: 'str.strip([chars])', doc: 'Remove leading and trailing whitespace' },
    { label: 'replace', insertText: 'replace(${1:old}, ${2:new})', kind: 'Method', detail: 'str.replace(old, new[, count])', doc: 'Replace substring' },
    { label: 'keys', insertText: 'keys()', kind: 'Method', detail: 'dict.keys()', doc: 'Return dictionary keys' },
    { label: 'values', insertText: 'values()', kind: 'Method', detail: 'dict.values()', doc: 'Return dictionary values' },
    { label: 'items', insertText: 'items()', kind: 'Method', detail: 'dict.items()', doc: 'Return dictionary (key, value) pairs' },
    { label: 'get', insertText: 'get(${1:key}, ${2:default})', kind: 'Method', detail: 'dict.get(k, d=None)', doc: 'Get dictionary value with default' },
  ],

  // ─── Java ──────────────────────────────────────────────────────────────
  java: [
    { prefix: 'sout', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'println()', doc: 'Print line to standard output' },
    { prefix: 'pr', label: 'System.out.println()', body: 'System.out.println(${1});', detail: 'println()', doc: 'Print line to standard output' },
    { prefix: 'souf', label: 'System.out.printf()', body: 'System.out.printf("${1:%s}\\n", ${2:args});', detail: 'printf()', doc: 'Formatted print' },
    { prefix: 'main', label: 'public static void main', body: 'public static void main(String[] args) {\n\t${1}\n}', detail: 'main method', doc: 'Java main method entry point' },
    { prefix: 'psvm', label: 'public static void main', body: 'public static void main(String[] args) {\n\t${1}\n}', detail: 'psvm', doc: 'Main method' },
    { prefix: 'sc', label: 'Scanner scanner = new Scanner(System.in)', body: 'Scanner ${1:sc} = new Scanner(System.in);', detail: 'Scanner', doc: 'Read input from keyboard' },
    { prefix: 'for', label: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'for loop', doc: 'Indexed for loop' },
    { prefix: 'fore', label: 'for (Type item : collection)', body: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4}\n}', detail: 'enhanced for', doc: 'For-each collection iterator' },
    { prefix: 'while', label: 'while (condition)', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'while loop', doc: 'While loop' },
    { prefix: 'if', label: 'if (condition)', body: 'if (${1:condition}) {\n\t${2}\n}', detail: 'if statement', doc: 'If statement' },
    { prefix: 'ife', label: 'if-else', body: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}', detail: 'if-else', doc: 'If-else branching' },
    { prefix: 'try', label: 'try-catch', body: 'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${4:e.printStackTrace();}\n}', detail: 'try-catch', doc: 'Exception handling' },
    { prefix: 'class', label: 'public class Name', body: 'public class ${1:Main} {\n\t${2}\n}', detail: 'class', doc: 'Class declaration' },
    { prefix: 'arr', label: 'int[] arr = new int[n]', body: '${1:int}[] ${2:arr} = new ${1:int}[${3:n}];', detail: 'array instantiation', doc: 'Create array' },
    { prefix: 'list', label: 'List<Type> list = new ArrayList<>()', body: 'List<${1:Integer}> ${2:list} = new ArrayList<>();', detail: 'ArrayList', doc: 'Create dynamic ArrayList' },
    { prefix: 'map', label: 'Map<K, V> map = new HashMap<>()', body: 'Map<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();', detail: 'HashMap', doc: 'Create key-value HashMap' },
    { prefix: 'set', label: 'Set<Type> set = new HashSet<>()', body: 'Set<${1:Integer}> ${2:set} = new HashSet<>();', detail: 'HashSet', doc: 'Create unique HashSet' },
    { prefix: 'sort', label: 'Arrays.sort() / Collections.sort()', body: 'Arrays.sort(${1:arr});', detail: 'sort array', doc: 'Sort array elements' },
    { prefix: 'sb', label: 'StringBuilder sb = new StringBuilder()', body: 'StringBuilder ${1:sb} = new StringBuilder();', detail: 'StringBuilder', doc: 'Efficient string builder' },

    // Built-ins & keywords
    { label: 'Scanner', insertText: 'Scanner', kind: 'Class', detail: 'java.util.Scanner', doc: 'A simple text scanner which can parse primitive types and strings' },
    { label: 'ArrayList', insertText: 'ArrayList<${1:Type}>()', kind: 'Class', detail: 'java.util.ArrayList', doc: 'Resizable-array implementation of the List interface' },
    { label: 'HashMap', insertText: 'HashMap<${1:K}, ${2:V}>()', kind: 'Class', detail: 'java.util.HashMap', doc: 'Hash table based implementation of the Map interface' },
    { label: 'Math.max', insertText: 'Math.max(${1:a}, ${2:b})', kind: 'Method', detail: 'Math.max(a, b)', doc: 'Returns the greater of two values' },
    { label: 'Math.min', insertText: 'Math.min(${1:a}, ${2:b})', kind: 'Method', detail: 'Math.min(a, b)', doc: 'Returns the smaller of two values' },
    { label: 'Math.abs', insertText: 'Math.abs(${1:x})', kind: 'Method', detail: 'Math.abs(x)', doc: 'Returns the absolute value' },
    { label: 'Math.sqrt', insertText: 'Math.sqrt(${1:x})', kind: 'Method', detail: 'Math.sqrt(x)', doc: 'Returns the correctly rounded positive square root' },
    { label: 'Math.pow', insertText: 'Math.pow(${1:a}, ${2:b})', kind: 'Method', detail: 'Math.pow(a, b)', doc: 'Returns the value of the first argument raised to the power of the second' },
    { label: 'nextInt', insertText: 'nextInt()', kind: 'Method', detail: 'scanner.nextInt()', doc: 'Scans the next token of the input as an int' },
    { label: 'nextLine', insertText: 'nextLine()', kind: 'Method', detail: 'scanner.nextLine()', doc: 'Advances this scanner past the current line and returns the input that was skipped' },
    { label: 'length', insertText: 'length()', kind: 'Method', detail: 'String.length()', doc: 'Returns the length of this string' },
    { label: 'charAt', insertText: 'charAt(${1:index})', kind: 'Method', detail: 'String.charAt(i)', doc: 'Returns the char value at the specified index' },
    { label: 'substring', insertText: 'substring(${1:beginIndex}, ${2:endIndex})', kind: 'Method', detail: 'String.substring()', doc: 'Returns a string that is a substring of this string' },
    { label: 'contains', insertText: 'contains(${1:element})', kind: 'Method', detail: 'Collection.contains(o)', doc: 'Returns true if this collection contains the specified element' },
    { label: 'add', insertText: 'add(${1:element})', kind: 'Method', detail: 'List.add(e)', doc: 'Appends the specified element to the end of this list' },
    { label: 'get', insertText: 'get(${1:index})', kind: 'Method', detail: 'List.get(i)', doc: 'Returns the element at the specified position in this list' },
    { label: 'size', insertText: 'size()', kind: 'Method', detail: 'Collection.size()', doc: 'Returns the number of elements in this collection' },
  ],

  // ─── C++ ───────────────────────────────────────────────────────────────
  cpp: [
    { prefix: 'cout', label: 'std::cout << ... << std::endl;', body: 'std::cout << ${1} << std::endl;', detail: 'cout', doc: 'Print to standard output' },
    { prefix: 'cin', label: 'std::cin >> var;', body: 'std::cin >> ${1:var};', detail: 'cin', doc: 'Read from standard input' },
    { prefix: 'pr', label: 'std::cout << ... << std::endl;', body: 'std::cout << ${1} << std::endl;', detail: 'cout', doc: 'Print to standard output' },
    { prefix: 'inc', label: '#include <...>', body: '#include <${1:iostream}>', detail: '#include', doc: 'Include library header' },
    { prefix: 'main', label: 'int main()', body: 'int main() {\n\t${1}\n\treturn 0;\n}', detail: 'int main()', doc: 'C++ main function' },
    { prefix: 'for', label: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'for loop', doc: 'Standard for loop' },
    { prefix: 'fore', label: 'for (auto& item : container)', body: 'for (auto& ${1:item} : ${2:container}) {\n\t${3}\n}', detail: 'range-for', doc: 'Range-based for loop' },
    { prefix: 'while', label: 'while (condition)', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'while loop', doc: 'While loop' },
    { prefix: 'if', label: 'if (condition)', body: 'if (${1:condition}) {\n\t${2}\n}', detail: 'if statement', doc: 'If statement' },
    { prefix: 'ife', label: 'if-else', body: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}', detail: 'if-else', doc: 'If-else branching' },
    { prefix: 'vec', label: 'vector<int> v', body: 'std::vector<${1:int}> ${2:v};', detail: 'std::vector', doc: 'Dynamic array' },
    { prefix: 'map', label: 'map<K, V> m', body: 'std::map<${1:int}, ${2:int}> ${3:m};', detail: 'std::map', doc: 'Ordered red-black tree map' },
    { prefix: 'umap', label: 'unordered_map<K, V> um', body: 'std::unordered_map<${1:int}, ${2:int}> ${3:um};', detail: 'std::unordered_map', doc: 'Hash table map' },
    { prefix: 'sort', label: 'sort(v.begin(), v.end())', body: 'std::sort(${1:v}.begin(), ${1:v}.end());', detail: 'std::sort', doc: 'Sort elements in container' },
    { prefix: 'push', label: 'push_back()', body: 'push_back(${1:val});', detail: 'push_back', doc: 'Add element to back' },
    { prefix: 'cp', label: 'Competitive Programming Template', body: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n\tios_base::sync_with_stdio(false);\n\tcin.tie(NULL);\n\t\n\t${1}\n\t\n\treturn 0;\n}', detail: 'CP Template', doc: 'Fast I/O competitive programming template' },
  ],

  // ─── C ─────────────────────────────────────────────────────────────────
  c: [
    { prefix: 'pr', label: 'printf()', body: 'printf("${1:%s}\\n", ${2:args});', detail: 'printf()', doc: 'Formatted print to stdout' },
    { prefix: 'printf', label: 'printf()', body: 'printf("${1:%s}\\n", ${2:args});', detail: 'printf()', doc: 'Formatted print to stdout' },
    { prefix: 'scanf', label: 'scanf()', body: 'scanf("${1:%d}", &${2:var});', detail: 'scanf()', doc: 'Formatted read from stdin' },
    { prefix: 'inc', label: '#include <stdio.h>', body: '#include <${1:stdio.h}>', detail: '#include', doc: 'Include standard header' },
    { prefix: 'main', label: 'int main()', body: 'int main() {\n\t${1}\n\treturn 0;\n}', detail: 'main()', doc: 'C main entry point' },
    { prefix: 'for', label: 'for (int i = 0; i < n; i++)', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'for loop', doc: 'Standard for loop' },
    { prefix: 'while', label: 'while (condition)', body: 'while (${1:condition}) {\n\t${2}\n}', detail: 'while loop', doc: 'While loop' },
    { prefix: 'malloc', label: 'malloc()', body: '(${1:int} *)malloc(${2:size} * sizeof(${1:int}));', detail: 'malloc', doc: 'Allocate heap memory' },
    { prefix: 'free', label: 'free(ptr)', body: 'free(${1:ptr});', detail: 'free', doc: 'Deallocate memory' },
  ],

  // ─── JavaScript ────────────────────────────────────────────────────────
  javascript: [
    { prefix: 'cl', label: 'console.log()', body: 'console.log(${1});', detail: 'console.log', doc: 'Print output to console' },
    { prefix: 'pr', label: 'console.log()', body: 'console.log(${1});', detail: 'console.log', doc: 'Print output to console' },
    { prefix: 'fn', label: 'function name()', body: 'function ${1:name}(${2:params}) {\n\t${3}\n}', detail: 'function', doc: 'Function declaration' },
    { prefix: 'af', label: 'const fn = () => {}', body: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};', detail: 'arrow function', doc: 'Arrow function expression' },
    { prefix: 'for', label: 'for (let i = 0; i < n; i++)', body: 'for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}', detail: 'for loop', doc: 'Standard for loop' },
    { prefix: 'forof', label: 'for (const item of iterable)', body: 'for (const ${1:item} of ${2:iterable}) {\n\t${3}\n}', detail: 'for...of', doc: 'Iterate over values' },
    { prefix: 'forin', label: 'for (const key in object)', body: 'for (const ${1:key} in ${2:object}) {\n\t${3}\n}', detail: 'for...in', doc: 'Iterate over keys' },
    { prefix: 'map', label: 'arr.map()', body: '${1:arr}.map((${2:item}) => ${3:item});', detail: 'Array.map', doc: 'Transform array elements' },
    { prefix: 'filter', label: 'arr.filter()', body: '${1:arr}.filter((${2:item}) => ${3:condition});', detail: 'Array.filter', doc: 'Filter elements matching condition' },
    { prefix: 'reduce', label: 'arr.reduce()', body: '${1:arr}.reduce((${2:acc}, ${3:cur}) => ${4:acc + cur}, ${5:0});', detail: 'Array.reduce', doc: 'Reduce array to single value' },
    { prefix: 'fetch', label: 'fetch() async', body: 'const res = await fetch("${1:url}");\nconst data = await res.json();', detail: 'fetch', doc: 'Fetch network resource' },
  ],

  // ─── TypeScript ────────────────────────────────────────────────────────
  typescript: [
    { prefix: 'cl', label: 'console.log()', body: 'console.log(${1});', detail: 'console.log', doc: 'Print output to console' },
    { prefix: 'pr', label: 'console.log()', body: 'console.log(${1});', detail: 'console.log', doc: 'Print output to console' },
    { prefix: 'int', label: 'interface Name {}', body: 'interface ${1:Name} {\n\t${2:key}: ${3:string};\n}', detail: 'interface', doc: 'TypeScript interface' },
    { prefix: 'type', label: 'type Name = ...', body: 'type ${1:Name} = ${2:string};', detail: 'type alias', doc: 'Type alias' },
    { prefix: 'enum', label: 'enum Name {}', body: 'enum ${1:Name} {\n\t${2:Key},\n}', detail: 'enum', doc: 'TypeScript enumeration' },
  ],

  // ─── SQL ───────────────────────────────────────────────────────────────
  sql: [
    { prefix: 'sel', label: 'SELECT * FROM ...', body: 'SELECT ${1:*}\nFROM ${2:table_name}\nWHERE ${3:condition};', detail: 'SELECT query', doc: 'Select rows from table' },
    { prefix: 'ins', label: 'INSERT INTO ...', body: 'INSERT INTO ${1:table_name} (${2:cols})\nVALUES (${3:vals});', detail: 'INSERT', doc: 'Insert new row' },
    { prefix: 'upd', label: 'UPDATE ... SET ...', body: 'UPDATE ${1:table_name}\nSET ${2:col} = ${3:val}\nWHERE ${4:condition};', detail: 'UPDATE', doc: 'Update existing rows' },
    { prefix: 'del', label: 'DELETE FROM ...', body: 'DELETE FROM ${1:table_name}\nWHERE ${2:condition};', detail: 'DELETE', doc: 'Delete rows' },
    { prefix: 'crt', label: 'CREATE TABLE ...', body: 'CREATE TABLE ${1:table_name} (\n\tid INTEGER PRIMARY KEY,\n\tname TEXT NOT NULL\n);', detail: 'CREATE TABLE', doc: 'Create new table' },
    { prefix: 'join', label: 'INNER JOIN ...', body: 'SELECT ${1:*}\nFROM ${2:t1}\nINNER JOIN ${3:t2} ON ${2:t1}.${4:id} = ${3:t2}.${5:id};', detail: 'JOIN', doc: 'Join two tables' },
  ],

  // ─── HTML ──────────────────────────────────────────────────────────────
  html: [
    { prefix: 'html', label: '<!DOCTYPE html> template', body: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<title>${1:Title}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>', detail: 'HTML5 skeleton', doc: 'Standard HTML5 document' },
    { prefix: 'div', label: '<div class="..."></div>', body: '<div class="${1:class}">\n\t${2}\n</div>', detail: 'div tag', doc: 'Generic container element' },
    { prefix: 'btn', label: '<button>Click</button>', body: '<button type="${1:button}">${2:Click}</button>', detail: 'button tag', doc: 'Clickable button' },
    { prefix: 'input', label: '<input type="..." />', body: '<input type="${1:text}" placeholder="${2:placeholder}" />', detail: 'input tag', doc: 'Form input field' },
  ],

  // ─── CSS ───────────────────────────────────────────────────────────────
  css: [
    { prefix: 'flex', label: 'display: flex', body: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};', detail: 'flexbox', doc: 'Flex container setup' },
    { prefix: 'grid', label: 'display: grid', body: 'display: grid;\ngrid-template-columns: repeat(${1:3}, 1fr);\ngap: ${2:1rem};', detail: 'css grid', doc: 'Grid container setup' },
    { prefix: 'center', label: 'Center element', body: 'display: grid;\nplace-items: center;', detail: 'place-items: center', doc: 'Quick perfect centering' },
    { prefix: 'media', label: '@media query', body: '@media (max-width: ${1:768px}) {\n\t${2}\n}', detail: '@media', doc: 'Responsive breakpoint' },
  ],
};
