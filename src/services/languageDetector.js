// Language Detection Service
// Analyzes code text and returns the detected language with Judge0 ID
// Supports 19 industry-demanded languages

const LANGUAGE_PATTERNS = [
  {
    id: 71,
    name: 'Python 3',
    monacoLanguage: 'python',
    icon: '🐍',
    patterns: [
      /\bdef\s+\w+\s*\(/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import/,
      /\bprint\s*\(/,
      /\belif\b/,
      /\bself\./,
      /\bclass\s+\w+.*:/,
      /^\s{4}\w/m,
      /\brange\s*\(/,
      /\binput\s*\(/,
      /\blen\s*\(/,
      /\bfor\s+\w+\s+in\b/,
      /\bTrue\b|\bFalse\b|\bNone\b/,
      /\blambda\b/,
      /\blist\s*\(|\bdict\s*\(|\btuple\s*\(/,
      /__\w+__/,
    ],
    weight: 1,
  },
  {
    id: 54,
    name: 'C++',
    monacoLanguage: 'cpp',
    icon: '⚡',
    patterns: [
      /\b#include\s*<\w+>/,
      /\bcout\b/,
      /\bcin\b/,
      /\bstd::/,
      /\busing\s+namespace\s+std/,
      /\bendl\b/,
      /\bvector\s*</,
      /\bstring\s+\w+/,
      /\bclass\s+\w+\s*\{/,
      /\btemplate\s*</,
      /\bnamespace\b/,
      /\bcerr\b/,
      /\bauto\s+\w+\s*=/,
      /\bnew\s+\w+/,
      /\bdelete\b/,
    ],
    weight: 1.1,
  },
  {
    id: 50,
    name: 'C',
    monacoLanguage: 'c',
    icon: '🔧',
    patterns: [
      /\b#include\s*<stdio\.h>/,
      /\b#include\s*<stdlib\.h>/,
      /\b#include\s*<string\.h>/,
      /\bprintf\s*\(/,
      /\bscanf\s*\(/,
      /\bmalloc\s*\(/,
      /\bfree\s*\(/,
      /\bint\s+main\s*\(/,
      /\bstruct\s+\w+\s*\{/,
      /\btypedef\b/,
      /\bsizeof\s*\(/,
      /\bNULL\b/,
    ],
    weight: 0.9,
  },
  {
    id: 62,
    name: 'Java',
    monacoLanguage: 'java',
    icon: '☕',
    patterns: [
      /\bpublic\s+class\b/,
      /\bSystem\.out\.print/,
      /\bpublic\s+static\s+void\s+main/,
      /\bimport\s+java\./,
      /\bString\[\]\s+args/,
      /\bnew\s+Scanner/,
      /\bprivate\s+\w+/,
      /\bprotected\s+\w+/,
      /\bextends\s+\w+/,
      /\bimplements\s+\w+/,
      /\b@Override\b/,
      /\bArrayList\b/,
      /\bHashMap\b/,
      /\bthrows\s+\w+/,
    ],
    weight: 1.2,
  },
  {
    id: 63,
    name: 'JavaScript',
    monacoLanguage: 'javascript',
    icon: '🌐',
    patterns: [
      /\bconsole\.log\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\b=>\s*[\{(]/,
      /\bfunction\s+\w+\s*\(/,
      /\brequire\s*\(/,
      /\bmodule\.exports/,
      /\bdocument\./,
      /\bwindow\./,
      /\basync\s+function/,
      /\bawait\s+/,
      /\bPromise\./,
      /\.then\s*\(/,
      /\.map\s*\(/,
      /\.filter\s*\(/,
      /\bprocess\./,
    ],
    weight: 0.95,
  },
  {
    id: 74,
    name: 'TypeScript',
    monacoLanguage: 'typescript',
    icon: '🔷',
    patterns: [
      /\binterface\s+\w+\s*\{/,
      /:\s*(string|number|boolean|any|void|never)\b/,
      /\benum\s+\w+\s*\{/,
      /\btype\s+\w+\s*=/,
      /\bas\s+(string|number|any|unknown)\b/,
      /\b<\w+>\s*\(/,
      /\bReadonly<\w+>/,
      /\bPartial<\w+>/,
      /\bRecord<\w+/,
      /\bimport\s+.*\s+from\s+['"].*['"]/,
      /\bexport\s+(interface|type|enum)\b/,
      /\bconsole\.log\s*\(/,
      /\bconst\s+\w+:\s*\w+/,
      /\blet\s+\w+:\s*\w+/,
    ],
    weight: 1.3,
  },
  {
    id: 51,
    name: 'C#',
    monacoLanguage: 'csharp',
    icon: '💜',
    patterns: [
      /\busing\s+System/,
      /\bnamespace\s+\w+/,
      /\bConsole\.Write/,
      /\bConsole\.Read/,
      /\bstatic\s+void\s+Main\s*\(/,
      /\bstring\[\]\s+args/,
      /\bvar\s+\w+\s*=/,
      /\bList<\w+>/,
      /\bDictionary<\w+/,
      /\basync\s+Task/,
      /\bLINQ\b|\bfrom\s+\w+\s+in\b/,
      /\bforeach\s*\(/,
      /\bget\s*;\s*set\s*;/,
      /\b\[Serializable\]|\b\[Required\]/,
    ],
    weight: 1.25,
  },
  {
    id: 78,
    name: 'Kotlin',
    monacoLanguage: 'kotlin',
    icon: '🟣',
    patterns: [
      /\bfun\s+main\s*\(/,
      /\bfun\s+\w+\s*\(/,
      /\bval\s+\w+/,
      /\bvar\s+\w+/,
      /\bprintln\s*\(/,
      /\bwhen\s*\(/,
      /\bdata\s+class\b/,
      /\bcompanion\s+object\b/,
      /\bsuspend\s+fun\b/,
      /\bsealed\s+class\b/,
      /\blistOf\s*\(|\bmapOf\s*\(/,
      /\bit\.\w+/,
      /\b\?\.\w+/,
      /\b!!\./,
    ],
    weight: 1.3,
  },
  {
    id: 83,
    name: 'Swift',
    monacoLanguage: 'swift',
    icon: '🧡',
    patterns: [
      /\bimport\s+Foundation/,
      /\bimport\s+UIKit/,
      /\bfunc\s+\w+\s*\(/,
      /\bvar\s+\w+:\s*\w+/,
      /\blet\s+\w+:\s*\w+/,
      /\bprint\s*\(/,
      /\bguard\s+let\b/,
      /\bif\s+let\b/,
      /\bstruct\s+\w+\s*\{/,
      /\bprotocol\s+\w+\s*\{/,
      /\benum\s+\w+\s*:\s*\w+/,
      /\b@IBOutlet\b|\b@IBAction\b/,
      /\b\?\?/,
      /\boptional\b|\bString\?/,
    ],
    weight: 1.2,
  },
  {
    id: 60,
    name: 'Go',
    monacoLanguage: 'go',
    icon: '🐹',
    patterns: [
      /\bpackage\s+main\b/,
      /\bfunc\s+\w+\s*\(/,
      /\bfmt\./,
      /\bimport\s+"/,
      /\bimport\s+\(/,
      /\b:=\s*/,
      /\bchan\s+\w+/,
      /\bgo\s+func/,
      /\bdefer\b/,
      /\bstruct\s*\{/,
      /\binterface\s*\{/,
      /\bgoroutine\b/,
    ],
    weight: 1.15,
  },
  {
    id: 73,
    name: 'Rust',
    monacoLanguage: 'rust',
    icon: '🦀',
    patterns: [
      /\bfn\s+main\s*\(\)/,
      /\blet\s+mut\b/,
      /\bprintln!\s*\(/,
      /\buse\s+std::/,
      /\bimpl\s+\w+/,
      /\bpub\s+fn\b/,
      /\b->\s*\w+/,
      /\bOption<\w+>/,
      /\bResult<\w+/,
      /\bmatch\s+\w+/,
      /\bString::from/,
      /\b&str\b/,
      /\bvec!\[/,
      /\bunwrap\(\)/,
    ],
    weight: 1.2,
  },
  {
    id: 68,
    name: 'PHP',
    monacoLanguage: 'php',
    icon: '🐘',
    patterns: [
      /^<\?php/m,
      /\$\w+\s*=/,
      /\becho\s+/,
      /\bfunction\s+\w+\s*\(/,
      /\barray\s*\(/,
      /\b->\w+/,
      /\b::\w+/,
      /\b\$this->/,
      /\bforeach\s*\(/,
      /\bnamespace\s+\w+/,
      /\buse\s+\w+\\\w+/,
      /\bpublic\s+function\b/,
      /\bnew\s+\w+\(/,
      /\bprint_r\s*\(/,
    ],
    weight: 1.15,
  },
  {
    id: 72,
    name: 'Ruby',
    monacoLanguage: 'ruby',
    icon: '💎',
    patterns: [
      /\bdef\s+\w+/,
      /\bputs\s+/,
      /\bend\b/,
      /\bclass\s+\w+\s*<?\s*/,
      /\brequire\s+['"]/,
      /\battr_accessor\b/,
      /\battr_reader\b/,
      /\bmodule\s+\w+/,
      /\bdo\s*\|/,
      /\.each\s+do/,
      /\b@\w+/,
      /\byield\b/,
      /\bnil\b/,
      /\buntil\b/,
    ],
    weight: 1.1,
  },
  {
    id: 80,
    name: 'R',
    monacoLanguage: 'r',
    icon: '📊',
    patterns: [
      /\b<-\s*/,
      /\blibrary\s*\(/,
      /\bfunction\s*\(/,
      /\bdata\.frame\s*\(/,
      /\bc\s*\(/,
      /\bggplot\s*\(/,
      /\bprint\s*\(/,
      /\bcat\s*\(/,
      /\bfor\s*\(\w+\s+in\b/,
      /\bif\s*\(.+\)\s*\{/,
      /\bmatrix\s*\(/,
      /\bsum\s*\(|mean\s*\(|sd\s*\(/,
      /\bTRUE\b|\bFALSE\b/,
      /\bNA\b/,
    ],
    weight: 1.15,
  },
  {
    id: 85,
    name: 'Perl',
    monacoLanguage: 'perl',
    icon: '🐪',
    patterns: [
      /^#!.*perl/m,
      /\buse\s+strict\b/,
      /\buse\s+warnings\b/,
      /\bmy\s+\$/,
      /\$\w+\s*=/,
      /\bprint\s+"/,
      /\bsub\s+\w+\s*\{/,
      /\bforeach\s+my\b/,
      /\bdie\s+"/,
      /\b=~\s*[\/sm]/,
      /\@\w+/,
      /\%\w+/,
      /\bchomp\b/,
      /\bqw\s*[\(\[]/,
    ],
    weight: 1.1,
  },
  {
    id: 81,
    name: 'Scala',
    monacoLanguage: 'scala',
    icon: '🔴',
    patterns: [
      /\bobject\s+\w+/,
      /\bdef\s+main\s*\(args/,
      /\bval\s+\w+/,
      /\bvar\s+\w+/,
      /\bprintln\s*\(/,
      /\bcase\s+class\b/,
      /\btrait\s+\w+/,
      /\bimplicit\s+(val|def)\b/,
      /\bSeq\[|List\[|Map\[/,
      /\b=>\s*\{/,
      /\bfor\s*\{/,
      /\byield\b/,
      /\bimport\s+scala\./,
      /\bextends\s+App\b/,
    ],
    weight: 1.2,
  },
  {
    id: 82,
    name: 'SQL',
    monacoLanguage: 'sql',
    icon: '🗃️',
    patterns: [
      /\bSELECT\b/i,
      /\bFROM\b/i,
      /\bWHERE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\b.*\bSET\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bALTER\s+TABLE\b/i,
      /\bDROP\s+TABLE\b/i,
      /\bJOIN\b/i,
      /\bGROUP\s+BY\b/i,
      /\bORDER\s+BY\b/i,
      /\bHAVING\b/i,
      /\bINNER\s+JOIN\b|\bLEFT\s+JOIN\b/i,
      /\bPRIMARY\s+KEY\b/i,
      /\bFOREIGN\s+KEY\b/i,
    ],
    weight: 1.3,
  },
  {
    id: 0,
    name: 'HTML',
    monacoLanguage: 'html',
    icon: '🌍',
    patterns: [
      /<!DOCTYPE\s+html>/i,
      /<html\b/i,
      /<head\b/i,
      /<body\b/i,
      /<div\b/i,
      /<span\b/i,
      /<h[1-6]\b/i,
      /<p\b[^h]/i,
      /<a\s+href/i,
      /<img\s+/i,
      /<table\b/i,
      /<form\b/i,
      /<input\b/i,
      /<link\b.*rel=/i,
      /<meta\b/i,
      /<\/\w+>/,
    ],
    weight: 1.3,
  },
  {
    id: 1,
    name: 'CSS',
    monacoLanguage: 'css',
    icon: '🎨',
    patterns: [
      /\{[^}]*:\s*[^;]+;/,
      /\bcolor\s*:/,
      /\bbackground\s*:/,
      /\bfont-size\s*:/,
      /\bmargin\s*:/,
      /\bpadding\s*:/,
      /\bdisplay\s*:\s*(flex|grid|block|none)/,
      /\bposition\s*:\s*(absolute|relative|fixed)/,
      /\b@media\b/,
      /\b@keyframes\b/,
      /\b@import\b/,
      /\b:hover\b|\b:focus\b|\b::before\b|\b::after\b/,
      /\b\.[\w-]+\s*\{/,
      /\b#[\w-]+\s*\{/,
      /\bvar\s*\(--[\w-]+\)/,
      /\b:root\s*\{/,
    ],
    weight: 1.25,
  },
];

const DEFAULT_LANGUAGE = {
  id: 71,
  name: 'Python 3',
  monacoLanguage: 'python',
  icon: '🐍',
};

/**
 * Detect the programming language of the given code.
 * Returns { id, name, monacoLanguage, icon, confidence }
 */
export function detectLanguage(code) {
  if (!code || code.trim().length < 5) {
    return { ...DEFAULT_LANGUAGE, confidence: 0 };
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const lang of LANGUAGE_PATTERNS) {
    let matchCount = 0;
    for (const pattern of lang.patterns) {
      if (pattern.test(code)) {
        matchCount++;
      }
    }

    const score = (matchCount / lang.patterns.length) * lang.weight;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = lang;
    }
  }

  // Disambiguate C vs C++: if both match, check for C++ specific features
  if (bestMatch && bestMatch.id === 50) {
    const cppLang = LANGUAGE_PATTERNS.find((l) => l.id === 54);
    let cppMatches = 0;
    for (const pattern of cppLang.patterns) {
      if (pattern.test(code)) cppMatches++;
    }
    if (cppMatches >= 2) {
      bestMatch = cppLang;
      bestScore = (cppMatches / cppLang.patterns.length) * cppLang.weight;
    }
  }

  // Disambiguate JavaScript vs TypeScript
  if (bestMatch && bestMatch.id === 63) {
    const tsLang = LANGUAGE_PATTERNS.find((l) => l.id === 74);
    let tsMatches = 0;
    for (const pattern of tsLang.patterns) {
      if (pattern.test(code)) tsMatches++;
    }
    if (tsMatches >= 3) {
      bestMatch = tsLang;
      bestScore = (tsMatches / tsLang.patterns.length) * tsLang.weight;
    }
  }

  // Disambiguate Ruby vs Python (both use def)
  if (bestMatch && (bestMatch.id === 72 || bestMatch.id === 71)) {
    if (/\bend\b/.test(code) && /\bputs\b/.test(code)) {
      bestMatch = LANGUAGE_PATTERNS.find((l) => l.id === 72);
    } else if (/\bprint\s*\(/.test(code) || /\bself\./.test(code)) {
      bestMatch = LANGUAGE_PATTERNS.find((l) => l.id === 71);
    }
  }

  if (bestMatch && bestScore > 0.05) {
    return {
      id: bestMatch.id,
      name: bestMatch.name,
      monacoLanguage: bestMatch.monacoLanguage,
      icon: bestMatch.icon,
      confidence: Math.min(bestScore * 100, 100),
    };
  }

  return { ...DEFAULT_LANGUAGE, confidence: 0 };
}

/**
 * Get the starter template for a language
 */
export function getStarterTemplate(languageId) {
  const templates = {
    71: `# Welcome to CodeForge AI! 🚀
# Start typing your Python code here...

n = int(input())
matrix = []
for i in range(n):
    row = list(map(int, input().split()))
    matrix.append(row)

# Print the matrix
for row in matrix:
    print(' '.join(map(str, row)))
`,
    54: `// Welcome to CodeForge AI! 🚀
// Start typing your C++ code here...

#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    vector<vector<int>> matrix(n, vector<int>(n));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            cin >> matrix[i][j];
    
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++)
            cout << matrix[i][j] << " ";
        cout << endl;
    }
    
    return 0;
}
`,
    50: `/* Welcome to CodeForge AI! 🚀 */
/* Start typing your C code here... */

#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    
    int matrix[100][100];
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            scanf("%d", &matrix[i][j]);
    
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++)
            printf("%d ", matrix[i][j]);
        printf("\\n");
    }
    
    return 0;
}
`,
    62: `// Welcome to CodeForge AI! 🚀
// Start typing your Java code here...

import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        
        int[][] matrix = new int[n][n];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                matrix[i][j] = sc.nextInt();
        
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++)
                System.out.print(matrix[i][j] + " ");
            System.out.println();
        }
    }
}
`,
    63: `// Welcome to CodeForge AI! 🚀
// Start typing your JavaScript code here...

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

const lines = [];
rl.on('line', (line) => lines.push(line.trim()));
rl.on('close', () => {
    const n = parseInt(lines[0]);
    const matrix = [];
    for (let i = 1; i <= n; i++) {
        matrix.push(lines[i].split(' ').map(Number));
    }
    matrix.forEach(row => console.log(row.join(' ')));
});
`,
    74: `// Welcome to CodeForge AI! 🚀
// Start typing your TypeScript code here...

interface Matrix {
    rows: number;
    cols: number;
    data: number[][];
}

function createMatrix(rows: number, cols: number): Matrix {
    const data: number[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Math.floor(Math.random() * 100))
    );
    return { rows, cols, data };
}

function printMatrix(matrix: Matrix): void {
    matrix.data.forEach(row => {
        console.log(row.join('\\t'));
    });
}

const m: Matrix = createMatrix(4, 4);
console.log(\`Matrix (\${m.rows}x\${m.cols}):\`);
printMatrix(m);
`,
    51: `// Welcome to CodeForge AI! 🚀
// Start typing your C# code here...

using System;
using System.Collections.Generic;

namespace CodeForge
{
    class Program
    {
        static void Main(string[] args)
        {
            int n = int.Parse(Console.ReadLine());
            int[,] matrix = new int[n, n];
            
            for (int i = 0; i < n; i++)
            {
                string[] row = Console.ReadLine().Split(' ');
                for (int j = 0; j < n; j++)
                    matrix[i, j] = int.Parse(row[j]);
            }
            
            for (int i = 0; i < n; i++)
            {
                for (int j = 0; j < n; j++)
                    Console.Write(matrix[i, j] + " ");
                Console.WriteLine();
            }
        }
    }
}
`,
    78: `// Welcome to CodeForge AI! 🚀
// Start typing your Kotlin code here...

fun main() {
    val n = readLine()!!.trim().toInt()
    val matrix = Array(n) { IntArray(n) }
    
    for (i in 0 until n) {
        val row = readLine()!!.trim().split(" ").map { it.toInt() }
        for (j in 0 until n) {
            matrix[i][j] = row[j]
        }
    }
    
    for (row in matrix) {
        println(row.joinToString(" "))
    }
}
`,
    83: `// Welcome to CodeForge AI! 🚀
// Start typing your Swift code here...

import Foundation

let n = Int(readLine()!)!
var matrix = [[Int]]()

for _ in 0..<n {
    let row = readLine()!.split(separator: " ").map { Int($0)! }
    matrix.append(row)
}

for row in matrix {
    print(row.map { String($0) }.joined(separator: " "))
}
`,
    60: `// Welcome to CodeForge AI! 🚀
// Start typing your Go code here...

package main

import "fmt"

func main() {
    var n int
    fmt.Scan(&n)
    
    matrix := make([][]int, n)
    for i := 0; i < n; i++ {
        matrix[i] = make([]int, n)
        for j := 0; j < n; j++ {
            fmt.Scan(&matrix[i][j])
        }
    }
    
    for i := 0; i < n; i++ {
        for j := 0; j < n; j++ {
            fmt.Printf("%d ", matrix[i][j])
        }
        fmt.Println()
    }
}
`,
    73: `// Welcome to CodeForge AI! 🚀
// Start typing your Rust code here...

use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    
    let n: usize = lines.next().unwrap().unwrap().trim().parse().unwrap();
    let mut matrix = vec![vec![0i32; n]; n];
    
    for i in 0..n {
        let line = lines.next().unwrap().unwrap();
        let nums: Vec<i32> = line.trim().split_whitespace()
            .map(|x| x.parse().unwrap())
            .collect();
        matrix[i] = nums;
    }
    
    for row in &matrix {
        let s: Vec<String> = row.iter().map(|x| x.to_string()).collect();
        println!("{}", s.join(" "));
    }
}
`,
    68: `<?php
// Welcome to CodeForge AI! 🚀
// Start typing your PHP code here...

$n = intval(trim(fgets(STDIN)));
$matrix = [];

for ($i = 0; $i < $n; $i++) {
    $row = array_map('intval', explode(' ', trim(fgets(STDIN))));
    $matrix[] = $row;
}

foreach ($matrix as $row) {
    echo implode(' ', $row) . "\\n";
}
?>
`,
    72: `# Welcome to CodeForge AI! 🚀
# Start typing your Ruby code here...

n = gets.to_i
matrix = []

n.times do
  row = gets.split.map(&:to_i)
  matrix << row
end

matrix.each do |row|
  puts row.join(' ')
end
`,
    80: `# Welcome to CodeForge AI! 🚀
# Start typing your R code here...

n <- as.integer(readline())
matrix_data <- c()

for (i in 1:n) {
  row <- as.integer(strsplit(readline(), " ")[[1]])
  matrix_data <- c(matrix_data, row)
}

mat <- matrix(matrix_data, nrow = n, byrow = TRUE)
print(mat)
`,
    85: `#!/usr/bin/perl
# Welcome to CodeForge AI! 🚀
# Start typing your Perl code here...

use strict;
use warnings;

my $n = <STDIN>;
chomp $n;

my @matrix;
for my $i (0..$n-1) {
    my $line = <STDIN>;
    chomp $line;
    push @matrix, [split /\\s+/, $line];
}

foreach my $row (@matrix) {
    print join(' ', @$row), "\\n";
}
`,
    81: `// Welcome to CodeForge AI! 🚀
// Start typing your Scala code here...

object Main extends App {
    val n = scala.io.StdIn.readInt()
    val matrix = Array.ofDim[Int](n, n)
    
    for (i <- 0 until n) {
        val row = scala.io.StdIn.readLine().split(" ").map(_.toInt)
        for (j <- 0 until n) {
            matrix(i)(j) = row(j)
        }
    }
    
    for (row <- matrix) {
        println(row.mkString(" "))
    }
}
`,
    82: `-- Welcome to CodeForge AI! 🚀
-- Start typing your SQL code here...

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    grade INTEGER,
    score REAL
);

INSERT INTO students (name, grade, score) VALUES
    ('Alice', 10, 95.5),
    ('Bob', 10, 88.2),
    ('Charlie', 11, 91.7),
    ('Diana', 11, 97.3),
    ('Eve', 10, 82.1);

SELECT name, grade, score
FROM students
WHERE score > 85
ORDER BY score DESC;
`,
    0: `<!-- Welcome to CodeForge AI! 🚀 -->
<!-- Start typing your HTML code here... -->

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0d1117;
            color: #e6edf3;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .card {
            background: #161b22;
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid #30363d;
            max-width: 400px;
            text-align: center;
        }
        h1 { color: #00d4ff; }
        p { color: #8b949e; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello, World!</h1>
        <p>Built with CodeForge AI ⚡</p>
    </div>
</body>
</html>
`,
    1: `/* Welcome to CodeForge AI! 🚀 */
/* Start typing your CSS code here... */

:root {
    --primary: #00d4ff;
    --bg-dark: #0d1117;
    --bg-card: #161b22;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --border: #30363d;
    --radius: 12px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', sans-serif;
    background: var(--bg-dark);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    max-width: 1200px;
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 212, 255, 0.15);
}
`,
  };

  return templates[languageId] || templates[71];
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages() {
  return LANGUAGE_PATTERNS.map((l) => ({
    id: l.id,
    name: l.name,
    monacoLanguage: l.monacoLanguage,
    icon: l.icon,
  }));
}

/**
 * Get language by Judge0 ID
 */
export function getLanguageById(id) {
  const found = LANGUAGE_PATTERNS.find((l) => l.id === id);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      monacoLanguage: found.monacoLanguage,
      icon: found.icon,
      confidence: 100,
    };
  }
  return DEFAULT_LANGUAGE;
}

const EXTENSION_MAP = {
  py: 71,
  cpp: 54,
  cc: 54,
  cxx: 54,
  hpp: 54,
  h: 50,
  c: 50,
  java: 62,
  js: 63,
  mjs: 63,
  cjs: 63,
  ts: 74,
  tsx: 74,
  cs: 51,
  kt: 78,
  kts: 78,
  swift: 83,
  go: 60,
  rs: 73,
  php: 68,
  rb: 72,
  r: 80,
  pl: 85,
  pm: 85,
  scala: 81,
  sc: 81,
  sql: 82,
  html: 0,
  htm: 0,
  css: 1,
};

const DEFAULT_EXTENSIONS = {
  71: 'main.py',
  54: 'main.cpp',
  50: 'main.c',
  62: 'Main.java',
  63: 'index.js',
  74: 'index.ts',
  51: 'Program.cs',
  78: 'Main.kt',
  83: 'main.swift',
  60: 'main.go',
  73: 'main.rs',
  68: 'index.php',
  72: 'main.rb',
  80: 'main.r',
  85: 'main.pl',
  81: 'Main.scala',
  82: 'query.sql',
  0: 'index.html',
  1: 'styles.css',
};

/**
 * Get language based on file name extension
 */
export function getLanguageFromFilename(filename) {
  if (!filename) return null;
  const parts = filename.split('.');
  if (parts.length < 2) return null;
  const ext = parts.pop().toLowerCase();
  const langId = EXTENSION_MAP[ext];
  if (langId !== undefined) {
    return getLanguageById(langId);
  }
  return null;
}

/**
 * Get standard filename for a language ID
 */
export function getDefaultFilename(languageId) {
  return DEFAULT_EXTENSIONS[languageId] || 'file.txt';
}

