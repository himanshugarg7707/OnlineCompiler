import { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../context/AppContext';
import { registerSnippets } from '../services/snippets';
import FileTabs from './FileTabs';
import './CodeEditor.css';

let snippetsRegistered = false;

export default function CodeEditor() {
  const { state, handleCodeChange, dispatch } = useApp();
  const { code, detectedLanguage, errorLine, config } = state;
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register autocomplete snippets once
    if (!snippetsRegistered) {
      registerSnippets(monaco);
      snippetsRegistered = true;
    }

    // Define custom dark theme
    monaco.editor.defineTheme('codeforge-dark', {
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

    monaco.editor.setTheme('codeforge-dark');

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Will be handled by parent
      document.dispatchEvent(new CustomEvent('codeforge-run'));
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      dispatch({
        type: 'SET_CURSOR',
        payload: { line: e.position.lineNumber, column: e.position.column },
      });
    });

    // Focus editor
    editor.focus();
  }, [dispatch]);

  // Update language when detection changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monaco = window.monaco;
        if (monaco) {
          monaco.editor.setModelLanguage(model, detectedLanguage.monacoLanguage);
        }
      }
    }
  }, [detectedLanguage.monacoLanguage]);

  // Update error decorations
  useEffect(() => {
    if (editorRef.current && window.monaco) {
      const monaco = window.monaco;
      
      if (errorLine) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          [
            {
              range: new monaco.Range(errorLine, 1, errorLine, 1),
              options: {
                isWholeLine: true,
                className: 'error-line-decoration',
                glyphMarginClassName: 'error-glyph-margin',
                overviewRuler: {
                  color: '#f85149',
                  position: monaco.editor.OverviewRulerLane.Full,
                },
              },
            },
          ]
        );
      } else {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          []
        );
      }
    }
  }, [errorLine]);

  // Listen for run keyboard shortcut
  useEffect(() => {
    const handleRun = () => {
      const runBtn = document.querySelector('.btn-run');
      if (runBtn && !runBtn.disabled) runBtn.click();
    };
    document.addEventListener('codeforge-run', handleRun);
    return () => document.removeEventListener('codeforge-run', handleRun);
  }, []);

  const handleChange = useCallback(
    (value) => {
      handleCodeChange(value || '');
    },
    [handleCodeChange]
  );

  return (
    <div className="code-editor-container">
      <FileTabs />
      <div className="editor-wrapper">
        <div className="editor-glow-top" />
        <Editor
          height="100%"
          language={detectedLanguage.monacoLanguage}
          value={code}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme="codeforge-dark"
          options={{
            fontSize: config.fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: config.minimap },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            wordWrap: config.wordWrap || 'off',
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            acceptSuggestionOnEnter: 'on',
            acceptSuggestionOnCommitCharacter: true,
            tabCompletion: 'on',
            snippetSuggestions: 'top',
            wordBasedSuggestions: 'allDocuments',
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: 'selection',
          }}
          loading={
            <div className="editor-loading">
              <div className="spinner" />
              <span>Loading editor...</span>
            </div>
          }
        />
      </div>
    </div>
  );
}

