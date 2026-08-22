import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  detectLanguage,
  getStarterTemplate,
  getLanguageById,
  getLanguageFromFilename,
  getDefaultFilename,
} from '../services/languageDetector';
import { executeCode } from '../services/judge0Service';
import { explainError, generateInputs, getLogicHint, chatWithAI } from '../services/aiService';
import { getConfig, updateConfig } from '../services/configService';

const AppContext = createContext(null);

const defaultLang = getLanguageById(71); // Python 3

const STORAGE_FILES_KEY = 'codeforge_files_v2';
const STORAGE_ACTIVE_KEY = 'codeforge_active_file_id_v2';
const STORAGE_STDIN_KEY = 'codeforge_stdin_v2';

function loadSavedFiles() {
  try {
    const raw = localStorage.getItem(STORAGE_FILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load saved files:', e);
  }
  return [
    {
      id: 'file-1',
      name: 'main.py',
      content: getStarterTemplate(71),
      language: defaultLang,
    },
  ];
}

function loadSavedActiveId(files) {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_KEY);
    if (raw && files.some((f) => f.id === raw)) {
      return raw;
    }
  } catch (e) {
    console.warn('Failed to load active file id:', e);
  }
  return files[0]?.id || 'file-1';
}

function loadSavedStdin() {
  try {
    return localStorage.getItem(STORAGE_STDIN_KEY) || '';
  } catch {
    return '';
  }
}

const savedFiles = loadSavedFiles();
const savedActiveId = loadSavedActiveId(savedFiles);
const initialActiveFile = savedFiles.find((f) => f.id === savedActiveId) || savedFiles[0];

const initialState = {
  files: savedFiles,
  activeFileId: savedActiveId,
  code: initialActiveFile ? initialActiveFile.content : getStarterTemplate(71),
  detectedLanguage: initialActiveFile ? initialActiveFile.language : defaultLang,
  output: '',
  stderr: '',
  compileOutput: '',
  executionStatus: 'idle', // idle | compiling | running | success | error
  executionTime: null,
  executionMemory: null,
  errorLine: null,
  stdin: loadSavedStdin(),
  inputDescription: '',
  aiExplanation: '',
  chatMessages: [],
  sidebarOpen: false,
  hintModalOpen: false,
  settingsModalOpen: false,
  currentHint: null,
  hintLevel: 1,
  config: getConfig(),
  cursorPosition: { line: 1, column: 1 },
};

function saveStateToStorage(files, activeFileId, stdin) {
  try {
    if (files) localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
    if (activeFileId) localStorage.setItem(STORAGE_ACTIVE_KEY, activeFileId);
    if (stdin !== undefined) localStorage.setItem(STORAGE_STDIN_KEY, stdin);
  } catch (e) {
    console.warn('Failed to persist state:', e);
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CODE': {
      const newCode = action.payload;
      const updatedFiles = state.files.map((file) => {
        if (file.id === state.activeFileId) {
          return {
            ...file,
            content: newCode,
          };
        }
        return file;
      });

      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin);

      return {
        ...state,
        files: updatedFiles,
        code: newCode,
      };
    }

    case 'SET_LANGUAGE': {
      const { language, loadTemplate = false } = action.payload;
      const updatedFiles = state.files.map((file) => {
        if (file.id === state.activeFileId) {
          const newContent = loadTemplate ? getStarterTemplate(language.id) : file.content;
          return {
            ...file,
            language,
            content: newContent,
          };
        }
        return file;
      });

      const currentActive = updatedFiles.find((f) => f.id === state.activeFileId) || updatedFiles[0];

      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin);

      return {
        ...state,
        files: updatedFiles,
        detectedLanguage: language,
        code: currentActive.content,
      };
    }

    case 'ADD_FILE': {
      let filename = action.payload?.name?.trim();
      let lang = null;

      if (filename) {
        lang = getLanguageFromFilename(filename);
      } else {
        const fileNum = state.files.length + 1;
        filename = `file${fileNum}.py`;
        lang = defaultLang;
      }

      if (!lang) {
        lang = state.detectedLanguage || defaultLang;
      }

      const newId = `file-${Date.now()}`;
      const newFile = {
        id: newId,
        name: filename,
        content: action.payload?.content || getStarterTemplate(lang.id),
        language: lang,
      };

      const updatedFiles = [...state.files, newFile];
      saveStateToStorage(updatedFiles, newId, state.stdin);

      return {
        ...state,
        files: updatedFiles,
        activeFileId: newId,
        code: newFile.content,
        detectedLanguage: newFile.language,
        errorLine: null,
      };
    }

    case 'SELECT_FILE': {
      const targetId = action.payload;
      const targetFile = state.files.find((f) => f.id === targetId);
      if (!targetFile) return state;

      saveStateToStorage(state.files, targetId, state.stdin);

      return {
        ...state,
        activeFileId: targetId,
        code: targetFile.content,
        detectedLanguage: targetFile.language,
        errorLine: null,
      };
    }

    case 'CLOSE_FILE': {
      const fileIdToClose = action.payload;
      if (state.files.length <= 1) {
        const defaultFile = {
          id: `file-${Date.now()}`,
          name: 'main.py',
          content: getStarterTemplate(71),
          language: defaultLang,
        };
        const resetFiles = [defaultFile];
        saveStateToStorage(resetFiles, defaultFile.id, state.stdin);

        return {
          ...state,
          files: resetFiles,
          activeFileId: defaultFile.id,
          code: defaultFile.content,
          detectedLanguage: defaultFile.language,
          errorLine: null,
        };
      }

      const filtered = state.files.filter((f) => f.id !== fileIdToClose);
      let newActiveId = state.activeFileId;
      if (state.activeFileId === fileIdToClose) {
        newActiveId = filtered[filtered.length - 1].id;
      }
      const newActiveFile = filtered.find((f) => f.id === newActiveId) || filtered[0];

      saveStateToStorage(filtered, newActiveId, state.stdin);

      return {
        ...state,
        files: filtered,
        activeFileId: newActiveId,
        code: newActiveFile.content,
        detectedLanguage: newActiveFile.language,
        errorLine: null,
      };
    }

    case 'RENAME_FILE': {
      const { id, newName } = action.payload;
      const trimmed = newName?.trim();
      if (!trimmed) return state;

      const langFromExt = getLanguageFromFilename(trimmed);

      const updatedFiles = state.files.map((file) => {
        if (file.id === id) {
          return {
            ...file,
            name: trimmed,
            language: langFromExt || file.language,
          };
        }
        return file;
      });

      const currentActive = updatedFiles.find((f) => f.id === state.activeFileId);
      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin);

      return {
        ...state,
        files: updatedFiles,
        detectedLanguage: currentActive ? currentActive.language : state.detectedLanguage,
      };
    }

    case 'SET_EXECUTION_STATUS':
      return { ...state, executionStatus: action.payload };

    case 'SET_OUTPUT':
      return {
        ...state,
        output: action.payload.output ?? action.payload.stdout ?? '',
        stderr: action.payload.error ?? action.payload.stderr ?? '',
        compileOutput: action.payload.compilerWarnings ?? action.payload.compile_output ?? '',
        executionTime: action.payload.time,
        executionMemory: action.payload.memory,
        errorLine: action.payload.errorLine,
        executionStatus: action.payload.success ? 'success' : 'error',
      };

    case 'SET_STDIN': {
      saveStateToStorage(state.files, state.activeFileId, action.payload);
      return { ...state, stdin: action.payload };
    }
    case 'SET_INPUT_DESCRIPTION':
      return { ...state, inputDescription: action.payload };
    case 'SET_AI_EXPLANATION':
      return { ...state, aiExplanation: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };
    case 'SET_CHAT_TYPING':
      return { ...state, chatTyping: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'TOGGLE_HINT_MODAL':
      return { ...state, hintModalOpen: !state.hintModalOpen, hintLevel: 1, currentHint: null };
    case 'SET_HINT':
      return { ...state, currentHint: action.payload, hintLevel: action.payload.level };
    case 'SET_HINT_LEVEL':
      return { ...state, hintLevel: action.payload };
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsModalOpen: !state.settingsModalOpen };
    case 'UPDATE_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_CURSOR':
      return { ...state, cursorPosition: action.payload };
    case 'CLEAR_OUTPUT':
      return {
        ...state,
        output: '',
        stderr: '',
        compileOutput: '',
        executionStatus: 'idle',
        executionTime: null,
        executionMemory: null,
        errorLine: null,
        aiExplanation: '',
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleCodeChange = useCallback(
    (newCode) => {
      dispatch({ type: 'SET_CODE', payload: newCode });
    },
    []
  );

  const handleSelectLanguage = useCallback(
    (langObj, loadTemplate = false) => {
      dispatch({
        type: 'SET_LANGUAGE',
        payload: {
          language: langObj,
          loadTemplate,
        },
      });
    },
    []
  );

  const handleAddFile = useCallback((name, content) => {
    dispatch({ type: 'ADD_FILE', payload: { name, content } });
  }, []);

  const handleSelectFile = useCallback((id) => {
    dispatch({ type: 'SELECT_FILE', payload: id });
  }, []);

  const handleCloseFile = useCallback((id) => {
    dispatch({ type: 'CLOSE_FILE', payload: id });
  }, []);

  const handleRenameFile = useCallback((id, newName) => {
    dispatch({ type: 'RENAME_FILE', payload: { id, newName } });
  }, []);

  const handleRunCode = useCallback(async () => {
    dispatch({ type: 'SET_EXECUTION_STATUS', payload: 'running' });

    try {
      const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
      const result = await executeCode(
        activeFile.content,
        activeFile.language.id,
        state.stdin,
        state.files
      );

      dispatch({ type: 'SET_OUTPUT', payload: result });
    } catch (err) {
      dispatch({
        type: 'SET_OUTPUT',
        payload: {
          success: false,
          output: '',
          error: err.message || 'Execution error',
          compilerWarnings: null,
          time: null,
          memory: null,
          errorLine: null,
        },
      });
    }
  }, [state.files, state.activeFileId, state.stdin]);

  const handleExplainError = useCallback(async () => {
    const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
    const errorText = state.stderr || state.compileOutput;
    if (!errorText) return;

    dispatch({ type: 'SET_AI_EXPLANATION', payload: '🤖 Analyzing compiler error...' });

    const explanation = await explainError(
      activeFile.content,
      errorText,
      activeFile.language
    );
    dispatch({
      type: 'SET_AI_EXPLANATION',
      payload: explanation.explanation,
    });
  }, [state.files, state.activeFileId, state.stderr, state.compileOutput]);

  const handleGenerateInput = useCallback(async () => {
    dispatch({ type: 'SET_INPUT_DESCRIPTION', payload: '🔄 Analyzing your code...' });
    const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];

    const result = await generateInputs(activeFile.content, activeFile.language);
    dispatch({ type: 'SET_STDIN', payload: result.input });
    dispatch({ type: 'SET_INPUT_DESCRIPTION', payload: result.description });
  }, [state.files, state.activeFileId]);

  const handleGetHint = useCallback(
    async (level = 1) => {
      const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
      const hint = await getLogicHint(activeFile.content, activeFile.language, level);
      dispatch({ type: 'SET_HINT', payload: hint });
    },
    [state.files, state.activeFileId]
  );

  const handleSendChat = useCallback(
    async (message) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: { role: 'user', content: message, timestamp: Date.now() },
      });
      dispatch({ type: 'SET_CHAT_TYPING', payload: true });

      const allMessages = [
        ...state.chatMessages,
        { role: 'user', content: message },
      ];

      const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];

      const response = await chatWithAI(
        allMessages,
        activeFile.content,
        activeFile.language
      );

      dispatch({ type: 'SET_CHAT_TYPING', payload: false });
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        },
      });
    },
    [state.chatMessages, state.files, state.activeFileId]
  );

  const handleUpdateConfig = useCallback((updates) => {
    const newConfig = updateConfig(updates);
    dispatch({ type: 'UPDATE_CONFIG', payload: newConfig });
  }, []);

  const value = {
    state,
    dispatch,
    handleCodeChange,
    handleSelectLanguage,
    handleAddFile,
    handleSelectFile,
    handleCloseFile,
    handleRenameFile,
    handleRunCode,
    handleExplainError,
    handleGenerateInput,
    handleGetHint,
    handleSendChat,
    handleUpdateConfig,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
