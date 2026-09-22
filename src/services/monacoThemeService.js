// Monaco Editor Themes & Autocomplete Configuration Service
// Ensures 100% consistent color themes, syntax highlighting, and suggestions model across CodeEditor and Notebooks

export const MONACO_THEMES = {
  'dark': 'fullcode-dark',
  'baby-pink': 'fullcode-baby-pink',
  'baby-pink-dark': 'fullcode-baby-pink-dark',
  'cyberpunk': 'fullcode-cyberpunk',
  'monokai': 'fullcode-monokai',
  'light': 'fullcode-light',
  'nord': 'fullcode-nord',
  'custom': 'fullcode-custom',
};

export function getMonacoThemeName(theme) {
  return MONACO_THEMES[theme] || 'fullcode-dark';
}

function getLuminance(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function defineCustomMonacoTheme(monaco, palette) {
  if (!monaco || !palette || !palette.bg) return;
  const isDark = getLuminance(palette.bg) < 140;
  const cleanHex = (h) => (h ? String(h).replace('#', '') : '');

  monaco.editor.defineTheme('fullcode-custom', {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: isDark ? '64748b' : '94a3b8', fontStyle: 'italic' },
      { token: 'keyword', foreground: cleanHex(palette.primary) || '00d4ff', fontStyle: 'bold' },
      { token: 'string', foreground: isDark ? '34d399' : '16a34a' },
      { token: 'number', foreground: isDark ? 'fb923c' : 'ea580c' },
      { token: 'type', foreground: cleanHex(palette.secondary) || '8b5cf6' },
      { token: 'function', foreground: cleanHex(palette.primary) || '00d4ff' },
      { token: 'variable', foreground: isDark ? 'f8fafc' : '0f172a' },
      { token: 'operator', foreground: cleanHex(palette.primary) || '00d4ff' },
    ],
    colors: {
      'editor.background': palette.bg,
      'editor.foreground': isDark ? '#f8fafc' : '#0f172a',
      'editor.lineHighlightBackground': isDark ? '#ffffff0f' : '#00000008',
      'editor.selectionBackground': `${palette.primary}35`,
      'editorCursor.foreground': palette.primary || '#00d4ff',
      'editorLineNumber.foreground': isDark ? '#64748b' : '#94a3b8',
      'editorLineNumber.activeForeground': isDark ? '#f8fafc' : '#0f172a',
      'minimap.background': palette.bg,
      'editorGutter.background': palette.bg,
    },
  });
}

export function registerCustomThemes(monaco, config) {
  if (!monaco) return;

  // 1. Full Code Dark (Default)
  monaco.editor.defineTheme('fullcode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '636d76', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'ffa657' },
      { token: 'operator', foreground: 'ff7b72' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#161b2280',
      'editor.selectionBackground': '#264f7840',
      'editorCursor.foreground': '#00d4ff',
      'editorLineNumber.foreground': '#484f5880',
      'editorLineNumber.activeForeground': '#e6edf3',
      'editor.selectionHighlightBackground': '#264f7830',
      'editorBracketMatch.background': '#264f7830',
      'editorBracketMatch.border': '#264f7850',
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',
      'scrollbarSlider.background': '#484f5840',
      'scrollbarSlider.hoverBackground': '#484f5860',
      'scrollbarSlider.activeBackground': '#484f5880',
      'minimap.background': '#0d1117',
      'editorGutter.background': '#0d1117',
    },
  });

  // 2. Baby Pink Theme (Sakura Blossom Light)
  monaco.editor.defineTheme('fullcode-baby-pink', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'a87285', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'db2777', fontStyle: 'bold' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'd97706' },
      { token: 'type', foreground: '7c3aed' },
      { token: 'function', foreground: 'e11d48' },
      { token: 'variable', foreground: '831843' },
      { token: 'operator', foreground: 'ec4899' },
    ],
    colors: {
      'editor.background': '#fff0f5',
      'editor.foreground': '#4a1525',
      'editor.lineHighlightBackground': '#fce7f380',
      'editor.selectionBackground': '#fbcfe890',
      'editorCursor.foreground': '#db2777',
      'editorLineNumber.foreground': '#d48c9f',
      'editorLineNumber.activeForeground': '#831843',
      'editor.selectionHighlightBackground': '#fbcfe850',
      'editorBracketMatch.background': '#fbcfe870',
      'editorBracketMatch.border': '#f472b6',
      'editorIndentGuide.background': '#fbcfe850',
      'editorIndentGuide.activeBackground': '#f472b680',
      'scrollbarSlider.background': '#f472b630',
      'scrollbarSlider.hoverBackground': '#f472b660',
      'scrollbarSlider.activeBackground': '#db277780',
      'minimap.background': '#fff0f5',
      'editorGutter.background': '#fff0f5',
    },
  });

  // 3. Baby Pink Dark Theme (Obsidian Rose)
  monaco.editor.defineTheme('fullcode-baby-pink-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'be185d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f472b6', fontStyle: 'bold' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'fb923c' },
      { token: 'type', foreground: 'e879f9' },
      { token: 'function', foreground: 'ec4899' },
      { token: 'variable', foreground: 'fdf2f8' },
      { token: 'operator', foreground: 'f472b6' },
    ],
    colors: {
      'editor.background': '#12070f',
      'editor.foreground': '#fdf2f8',
      'editor.lineHighlightBackground': '#250f2080',
      'editor.selectionBackground': '#ec489940',
      'editorCursor.foreground': '#f472b6',
      'editorLineNumber.foreground': '#be185d',
      'editorLineNumber.activeForeground': '#fdf2f8',
      'editor.selectionHighlightBackground': '#ec489930',
      'editorBracketMatch.background': '#ec489930',
      'editorBracketMatch.border': '#f472b6',
      'editorIndentGuide.background': '#250f20',
      'editorIndentGuide.activeBackground': '#33152c',
      'scrollbarSlider.background': '#ec489930',
      'scrollbarSlider.hoverBackground': '#ec489960',
      'scrollbarSlider.activeBackground': '#f472b680',
      'minimap.background': '#12070f',
      'editorGutter.background': '#12070f',
    },
  });

  // 4. Cyberpunk Neon
  monaco.editor.defineTheme('fullcode-cyberpunk', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '715c99', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff007f', fontStyle: 'bold' },
      { token: 'string', foreground: '00ff88' },
      { token: 'number', foreground: 'ff7700' },
      { token: 'type', foreground: '00f0ff' },
      { token: 'function', foreground: 'b400ff' },
      { token: 'variable', foreground: 'f5f0ff' },
      { token: 'operator', foreground: '00f0ff' },
    ],
    colors: {
      'editor.background': '#0a0518',
      'editor.foreground': '#f5f0ff',
      'editor.lineHighlightBackground': '#1d0f3f60',
      'editor.selectionBackground': '#b400ff40',
      'editorCursor.foreground': '#00f0ff',
      'editorLineNumber.foreground': '#5c4585',
      'editorLineNumber.activeForeground': '#00f0ff',
      'scrollbarSlider.background': '#9d00ff40',
      'scrollbarSlider.hoverBackground': '#9d00ff70',
      'minimap.background': '#0a0518',
      'editorGutter.background': '#0a0518',
    },
  });

  // 5. Monokai Pro
  monaco.editor.defineTheme('fullcode-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'operator', foreground: 'f92672' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d3280',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f0',
      'editorLineNumber.foreground': '#75715e',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'minimap.background': '#272822',
      'editorGutter.background': '#272822',
    },
  });

  // 6. Clean Light
  monaco.editor.defineTheme('fullcode-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'string', foreground: '16a34a' },
      { token: 'number', foreground: 'ea580c' },
      { token: 'type', foreground: '7c3aed' },
      { token: 'function', foreground: '2563eb' },
      { token: 'variable', foreground: '0f172a' },
      { token: 'operator', foreground: '0284c7' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0f172a',
      'editor.lineHighlightBackground': '#f1f5f9',
      'editor.selectionBackground': '#bae6fd60',
      'editorCursor.foreground': '#0284c7',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#0f172a',
      'minimap.background': '#ffffff',
      'editorGutter.background': '#ffffff',
    },
  });

  // 7. Nord Frost
  monaco.editor.defineTheme('fullcode-nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'eceff4' },
      { token: 'operator', foreground: '81a1c1' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#eceff4',
      'editor.lineHighlightBackground': '#3b425280',
      'editor.selectionBackground': '#434c5e',
      'editorCursor.foreground': '#88c0d0',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
      'minimap.background': '#2e3440',
      'editorGutter.background': '#2e3440',
    },
  });

  // 8. Custom Theme
  if (config?.theme === 'custom' && config?.customPalette) {
    defineCustomMonacoTheme(monaco, config.customPalette);
  }
}

export function getMonacoEditorOptions(config, isCell = false) {
  const base = {
    fontSize: config?.fontSize || 13,
    tabSize: config?.tabSize || 4,
    wordWrap: config?.wordWrap ? 'on' : 'off',
    fontFamily: config?.fontFamily || "'JetBrains Mono', 'Fira Code', monospace",
    fontLigatures: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    automaticLayout: true,
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    // Auto-closing brackets, quotes, surround & formatting
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoClosingComments: 'always',
    autoClosingOvertype: 'always',
    autoSurround: 'languageDefined',
    matchBrackets: 'always',
    formatOnType: true,
    formatOnPaste: true,
    // Autocomplete & suggestions model: safe for fast typing
    fixedOverflowWidgets: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'off',
    tabCompletion: 'onlySnippets',
    acceptSuggestionOnCommitCharacter: false,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    quickSuggestionsDelay: 10,
    snippetSuggestions: 'inline',
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showVariables: true,
      showFunctions: true,
      preview: false,
      showInlineDetails: true,
      maxVisibleSuggestions: 7,
      filterGraceful: true,
      matchOnWordStartOnly: true,
      selectionMode: 'whenQuickSuggestion',
      localityBonus: true,
    },
    wordBasedSuggestionsMode: 'currentDocument',
  };

  if (isCell) {
    return {
      ...base,
      minimap: { enabled: false },
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 4,
      scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'auto',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 6,
        handleMouseWheel: false,
        alwaysConsumeMouseWheel: false,
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
    };
  }

  return {
    ...base,
    minimap: { enabled: config?.minimap },
    lineNumbers: config?.lineNumbers !== false ? 'on' : 'off',
    padding: { top: 12, bottom: 12 },
    scrollBeyondLastLine: false,
  };
}
