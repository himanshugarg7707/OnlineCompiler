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
  {
    id: 99,
    name: 'Notes & Text',
    monacoLanguage: 'markdown',
    icon: '📝',
    patterns: [
      /^#\s+/m,
      /^##\s+/m,
      /^-\s+/m,
      /^\*\s+/m,
      /^\d+\.\s+/m,
      /\*\*.*\*\*/,
      /\[.*\]\(.*\)/,
    ],
    weight: 0.5,
  },
  {
    id: 710,
    name: 'Jupyter Notebook',
    monacoLanguage: 'ipynb',
    icon: '🪐',
    patterns: [
      /"nbformat"\s*:\s*\d+/,
      /"cells"\s*:\s*\[/,
      /"cell_type"\s*:\s*"(code|markdown)"/,
    ],
    weight: 2,
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
 * Generate standard Jupyter Notebook (v4) JSON template
 */
export function createDefaultNotebookJson() {
  return JSON.stringify(
    {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            '# 🪐 Jupyter Notebook\n',
            'Interactive computing environment powered by Pyodide WebAssembly.\n',
            'Directly supports **NumPy**, **Pandas**, **Matplotlib**, and interactive data exploration.'
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            'import numpy as np\n',
            'import pandas as pd\n',
            'import matplotlib.pyplot as plt\n',
            '\n',
            'print("NumPy version:", np.__version__)\n',
            'print("Pandas version:", pd.__version__)\n',
            '\n',
            '# Create a sample DataFrame\n',
            'data = {\n',
            '    "Language": ["Python", "JavaScript", "C++", "Java", "Rust"],\n',
            '    "Popularity": [95, 88, 76, 82, 70]\n',
            '}\n',
            'df = pd.DataFrame(data)\n',
            'print("\\nPopular Languages DataFrame:")\n',
            'print(df)\n',
            '\n',
            '# Render a clean plot\n',
            'plt.figure(figsize=(6, 3))\n',
            'plt.bar(df["Language"], df["Popularity"], color=["#38bdf8", "#818cf8", "#34d399", "#f59e0b", "#f472b6"])\n',
            'plt.title("Programming Languages Popularity")\n',
            'plt.ylabel("Score (%)")\n',
            'plt.tight_layout()\n',
            'plt.show()'
          ]
        }
      ],
      metadata: {
        language_info: {
          name: 'python',
          version: '3.11'
        },
        kernelspec: {
          display_name: 'Python 3 (Pyodide WebAssembly)',
          language: 'python',
          name: 'python3'
        }
      },
      nbformat: 4,
      nbformat_minor: 5
    },
    null,
    2
  );
}

/**
 * Get the starter template for a language
 */
export function getStarterTemplate(languageId) {
  const templates = {
    71: `# Start here
`,
    54: `#include <iostream>
using namespace std;

int main() {
    // Start here
    
    return 0;
}
`,
    50: `#include <stdio.h>

int main() {
    // Start here
    
    return 0;
}
`,
    62: `import java.util.*;

class Main {
    public static void main(String[] args) {
        // Start here
        
    }
}
`,
    63: `// Start here
`,
    74: `// Start here
`,
    51: `using System;

class Program {
    static void Main(string[] args) {
        // Start here
        
    }
}
`,
    78: `fun main() {
    // Start here
    
}
`,
    83: `import Foundation

// Start here
`,
    60: `package main

import "fmt"

func main() {
    // Start here
    
}
`,
    73: `fn main() {
    // Start here
    
}
`,
    68: `<?php
// Start here
`,
    72: `# Start here
`,
    80: `# Start here
`,
    85: `use strict;
use warnings;

# Start here
`,
    81: `object Main extends App {
    // Start here
    
}
`,
    82: `-- Start here
`,
    0: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
</head>
<body>
    <!-- Start here -->
    
</body>
</html>
`,
    1: `/* Start here */
`,
    99: `# 📝 Notes & Documentation

Write your notes, explanations, ideas, or documentation here...

- Note 1: 
- Note 2: 
`,
    710: createDefaultNotebookJson(),
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
  txt: 99,
  text: 99,
  notes: 99,
  note: 99,
  md: 99,
  markdown: 99,
  log: 99,
  ipynb: 710,
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
  99: 'notes.txt',
  710: 'notebook.ipynb',
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

/**
 * Calculate the next sequential filename (e.g. file_01.java, file_02.java)
 */
export function getNextSequentialFilename(files = [], activeFileId = null, detectedLanguage = null) {
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  let ext = 'java';
  let folder = null;

  if (activeFile && activeFile.name) {
    if (activeFile.name.includes('/')) {
      folder = activeFile.name.substring(0, activeFile.name.lastIndexOf('/'));
    }
    const dotIdx = activeFile.name.lastIndexOf('.');
    if (dotIdx !== -1) {
      ext = activeFile.name.substring(dotIdx + 1).toLowerCase();
    }
  } else if (detectedLanguage && detectedLanguage.id !== undefined) {
    const defaultName = getDefaultFilename(detectedLanguage.id);
    const dotIdx = defaultName.lastIndexOf('.');
    if (dotIdx !== -1) {
      ext = defaultName.substring(dotIdx + 1).toLowerCase();
    }
  }

  let highestNum = 0;
  const targetFolderPrefix = folder ? `${folder}/` : '';

  files.forEach((f) => {
    if (!f || !f.name) return;
    const relativeName = targetFolderPrefix
      ? (f.name.startsWith(targetFolderPrefix) ? f.name.slice(targetFolderPrefix.length) : null)
      : (!f.name.includes('/') ? f.name : null);
    if (!relativeName) return;

    const match = relativeName.match(/^file_(\d+)\.([^.]+)$/i);
    if (match && match[2].toLowerCase() === ext) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestNum) {
        highestNum = num;
      }
    }
  });

  let nextNum = highestNum + 1;
  let paddedNum = String(nextNum).padStart(2, '0');
  let candidateBase = `file_${paddedNum}`;
  let candidateFullName = targetFolderPrefix ? `${targetFolderPrefix}${candidateBase}.${ext}` : `${candidateBase}.${ext}`;

  while (files.some((f) => f && f.name && f.name.toLowerCase() === candidateFullName.toLowerCase())) {
    nextNum++;
    paddedNum = String(nextNum).padStart(2, '0');
    candidateBase = `file_${paddedNum}`;
    candidateFullName = targetFolderPrefix ? `${targetFolderPrefix}${candidateBase}.${ext}` : `${candidateBase}.${ext}`;
  }

  return {
    fullName: candidateFullName,
    baseName: candidateBase,
    ext,
    folder,
  };
}

/**
 * Generate starter template matching sequential filename
 */
export function getSequentialFileStarterContent(baseName, ext) {
  if (ext === 'java') {
    return `import java.util.*;\n\npublic class ${baseName} {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Start coding here\n        \n    }\n}\n`;
  }
  if (ext === 'py') {
    return `# ${baseName}.py\n# Start coding here\n\n`;
  }
  if (ext === 'cpp') {
    return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // ${baseName}.cpp\n    \n    return 0;\n}\n`;
  }
  if (ext === 'c') {
    return `#include <stdio.h>\n\nint main() {\n    // ${baseName}.c\n    \n    return 0;\n}\n`;
  }
  if (ext === 'js') {
    return `// ${baseName}.js\n\n`;
  }
  if (ext === 'ipynb') {
    return createDefaultNotebookJson();
  }
  return '';
}

