import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  getStarterTemplate,
  getLanguageById,
  getLanguageFromFilename,
  getDefaultFilename,
} from '../services/languageDetector';
import { executeCode } from '../services/judge0Service';
import { explainError, generateInputs, getLogicHint, chatWithAI } from '../services/aiService';
import { getConfig, updateConfig } from '../services/configService';
import { decodeSharedWorkspace, clearShareHash } from '../services/shareService';
import { recordSnapshot } from '../services/historyService';
import { formatCode } from '../services/formatterService';
import {
  getActiveUser,
  logoutUser,
  saveUserWorkspace,
  loadUserWorkspace,
} from '../services/authService';
import {
  applyCustomPalette,
  clearCustomPaletteOverrides,
} from '../services/themeService';
import {
  joinCollabRoom,
  leaveCollabRoom,
  broadcastWorkspaceChanges,
  sendRoomChatMessage,
  sendRoomTyping,
  sendRoomMessage,
  CLIENT_ID,
  getRoomFromUrl,
  getLatestRoomSnapshot,
  isValidRoomId,
  normalizeRoomId,
} from '../services/liveShareService';

const AppContext = createContext(null);

const defaultLang = getLanguageById(71); // Python 3

const STORAGE_FILES_KEY = 'fullcode_files_v3';
const STORAGE_ACTIVE_KEY = 'fullcode_active_file_id_v3';
const STORAGE_STDIN_KEY = 'fullcode_stdin_v3';
const STORAGE_FOLDERS_KEY = 'fullcode_folders_v3';
const STORAGE_OPEN_TABS_KEY = 'fullcode_open_tabs_v3';

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

function loadSavedFolders() {
  try {
    const raw = localStorage.getItem(STORAGE_FOLDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load saved folders:', e);
  }
  return [];
}

function loadSavedActiveId(files) {
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVE_KEY);
    if (saved && files.some((f) => f.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to load active file id:', e);
  }
  return files[0]?.id || 'file-1';
}

function loadSavedOpenTabs(files, activeId) {
  try {
    const saved = localStorage.getItem(STORAGE_OPEN_TABS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const validIds = parsed.filter((id) => files.some((f) => f.id === id));
        if (validIds.length > 0) {
          if (activeId && !validIds.includes(activeId)) {
            validIds.push(activeId);
          }
          return validIds;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load open tabs:', e);
  }
  return activeId ? [activeId] : (files[0] ? [files[0].id] : []);
}

function loadSavedStdin() {
  try {
    return localStorage.getItem(STORAGE_STDIN_KEY) || '';
  } catch {
    return '';
  }
}

const savedFiles = loadSavedFiles();
const savedFolders = loadSavedFolders();
const savedActiveId = loadSavedActiveId(savedFiles);
const savedOpenTabs = loadSavedOpenTabs(savedFiles, savedActiveId);

// Check if a shared workspace is in URL hash
const sharedPayload = decodeSharedWorkspace();
let initialFiles = savedFiles;
let initialFolders = savedFolders;
let initialActiveId = savedActiveId;
let initialOpenTabs = savedOpenTabs;
let initialStdin = loadSavedStdin();

if (sharedPayload && Array.isArray(sharedPayload.files) && sharedPayload.files.length > 0) {
  initialFiles = sharedPayload.files.map((sf, idx) => ({
    id: `shared-${Date.now()}-${idx}`,
    name: sf.name,
    content: sf.content,
    language: getLanguageById(sf.langId) || getLanguageFromFilename(sf.name),
  }));
  initialActiveId = initialFiles[0]?.id;
  initialOpenTabs = [initialActiveId];
  if (sharedPayload.stdin) initialStdin = sharedPayload.stdin;
  clearShareHash();
}

const initialActiveFile = initialFiles.find((f) => f.id === initialActiveId) || initialFiles[0];
const initialConfig = getConfig();
const initialUser = getActiveUser();

const initialState = {
  activeUser: initialUser,
  authModalOpen: false,
  files: initialFiles,
  folders: initialFolders,
  openFileIds: initialOpenTabs,
  activeFileId: initialActiveId,
  code: initialActiveFile ? initialActiveFile.content : getStarterTemplate(71),
  detectedLanguage: initialActiveFile ? initialActiveFile.language : defaultLang,
  output: '',
  stderr: '',
  compileOutput: '',
  executionStatus: 'idle', // idle | compiling | running | success | error
  executionTime: null,
  executionMemory: null,
  errorLine: null,
  stdin: initialStdin,
  inputDescription: '',
  aiExplanation: '',
  chatMessages: [],
  sidebarOpen: false,
  explorerOpen: initialConfig.explorerOpen ?? true,
  explorerWidth: initialConfig.explorerWidth ?? 240,
  hintModalOpen: false,
  settingsModalOpen: false,
  shareModalOpen: false,
  historyModalOpen: false,
  saveAsModalOpen: false,
  saveAsTargetFile: null,
  collabModalOpen: false,
  incomingModalOpen: false,
  incomingUpdate: null,
  collabRoomId: null,
  collabPeers: [],
  roomChatMessages: [],
  roomTypingUsers: [],
  roomAutoSync: false,
  roomChatDrawerOpen: false,
  unreadRoomChatCount: 0,
  currentHint: null,
  hintLevel: 1,
  config: initialConfig,
  cursorPosition: { line: 1, column: 1 },
  selectedCode: null,
  toast: null,
  practiceOpen: false,
  focusMode: false,
  terminalHidden: false,
};

function saveStateToStorage(files, activeFileId, stdin, folders, openFileIds) {
  try {
    if (files) localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
    if (activeFileId) localStorage.setItem(STORAGE_ACTIVE_KEY, activeFileId);
    if (stdin !== undefined) localStorage.setItem(STORAGE_STDIN_KEY, stdin);
    if (folders) localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
    if (openFileIds) localStorage.setItem(STORAGE_OPEN_TABS_KEY, JSON.stringify(openFileIds));
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

      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin, state.folders, state.openFileIds);

      return {
        ...state,
        code: newCode,
        files: updatedFiles,
        errorLine: null,
      };
    }

    case 'SET_LANGUAGE': {
      const newLang = action.payload.language;
      const loadTemplate = action.payload.loadTemplate;

      const updatedFiles = state.files.map((file) => {
        if (file.id === state.activeFileId) {
          const newName = file.name.includes('.')
            ? file.name.split('.')[0] + getDefaultFilename(newLang.id).slice(getDefaultFilename(newLang.id).lastIndexOf('.'))
            : getDefaultFilename(newLang.id);

          return {
            ...file,
            name: newName,
            language: newLang,
            content: loadTemplate ? getStarterTemplate(newLang.id) : file.content,
          };
        }
        return file;
      });

      const currentActive = updatedFiles.find((f) => f.id === state.activeFileId);
      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin, state.folders, state.openFileIds);

      return {
        ...state,
        detectedLanguage: newLang,
        code: currentActive ? currentActive.content : state.code,
        files: updatedFiles,
        errorLine: null,
      };
    }

    case 'ADD_FILE': {
      const { name: inputName, content: inputContent, folder, openTab } = typeof action.payload === 'string'
        ? { name: action.payload, content: undefined, folder: undefined, openTab: true }
        : action.payload;

      const shouldOpen = openTab !== false;

      let rawName = inputName || getDefaultFilename(state.detectedLanguage.id);
      let targetName = folder ? `${folder}/${rawName}` : rawName;

      // Ensure unique filename
      let uniqueName = targetName;
      let counter = 1;
      while (state.files.some((f) => f.name === uniqueName)) {
        const dotIdx = targetName.lastIndexOf('.');
        if (dotIdx !== -1) {
          uniqueName = `${targetName.substring(0, dotIdx)}_${counter}${targetName.substring(dotIdx)}`;
        } else {
          uniqueName = `${targetName}_${counter}`;
        }
        counter++;
      }

      const langFromExt = getLanguageFromFilename(uniqueName);
      const fileLang = langFromExt || state.detectedLanguage;
      const fileContent = inputContent !== undefined ? inputContent : getStarterTemplate(fileLang.id);

      const newFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: uniqueName,
        content: fileContent,
        language: fileLang,
      };

      const updatedFiles = [...state.files, newFile];
      const updatedOpenIds = shouldOpen
        ? state.openFileIds.includes(newFile.id)
          ? state.openFileIds
          : [...state.openFileIds, newFile.id]
        : state.openFileIds;

      const nextActiveId = shouldOpen ? newFile.id : state.activeFileId;
      const nextActiveFile = updatedFiles.find((f) => f.id === nextActiveId) || newFile;

      // If new file introduces folder prefix, auto register folder
      let updatedFolders = state.folders;
      if (uniqueName.includes('/')) {
        const folderPart = uniqueName.substring(0, uniqueName.lastIndexOf('/'));
        if (!updatedFolders.includes(folderPart)) {
          updatedFolders = [...updatedFolders, folderPart];
        }
      }

      saveStateToStorage(updatedFiles, nextActiveId, state.stdin, updatedFolders, updatedOpenIds);

      return {
        ...state,
        files: updatedFiles,
        folders: updatedFolders,
        openFileIds: updatedOpenIds,
        activeFileId: nextActiveId,
        code: nextActiveFile.content,
        detectedLanguage: nextActiveFile.language,
        errorLine: null,
      };
    }

    case 'SELECT_FILE': {
      const fileId = action.payload;
      const targetFile = state.files.find((f) => f.id === fileId);
      if (!targetFile) return state;

      const updatedOpenIds = state.openFileIds.includes(fileId)
        ? state.openFileIds
        : [...state.openFileIds, fileId];

      saveStateToStorage(state.files, fileId, state.stdin, state.folders, updatedOpenIds);

      return {
        ...state,
        activeFileId: fileId,
        openFileIds: updatedOpenIds,
        code: targetFile.content,
        detectedLanguage: targetFile.language,
        errorLine: null,
      };
    }

    case 'CLOSE_TAB': {
      const fileIdToClose = action.payload;
      const filteredOpenIds = state.openFileIds.filter((id) => id !== fileIdToClose);

      if (filteredOpenIds.length === 0) {
        if (state.files.length > 0) {
          filteredOpenIds.push(state.files[0].id);
        }
      }

      let newActiveId = state.activeFileId;
      if (state.activeFileId === fileIdToClose) {
        newActiveId = filteredOpenIds[filteredOpenIds.length - 1] || state.files[0]?.id;
      }

      const newActiveFile = state.files.find((f) => f.id === newActiveId) || state.files[0];
      saveStateToStorage(state.files, newActiveId, state.stdin, state.folders, filteredOpenIds);

      return {
        ...state,
        openFileIds: filteredOpenIds,
        activeFileId: newActiveId,
        code: newActiveFile ? newActiveFile.content : state.code,
        detectedLanguage: newActiveFile ? newActiveFile.language : state.detectedLanguage,
        errorLine: null,
      };
    }

    case 'CLOSE_FILE': {
      const fileIdToClose = action.payload;
      const filteredFiles = state.files.filter((f) => f.id !== fileIdToClose);
      const filteredOpenIds = state.openFileIds.filter((id) => id !== fileIdToClose);

      if (filteredFiles.length === 0) {
        const defaultFile = {
          id: `file-${Date.now()}`,
          name: 'main.py',
          content: getStarterTemplate(71),
          language: defaultLang,
        };
        const resetFiles = [defaultFile];
        const resetOpen = [defaultFile.id];
        saveStateToStorage(resetFiles, defaultFile.id, state.stdin, state.folders, resetOpen);

        return {
          ...state,
          files: resetFiles,
          openFileIds: resetOpen,
          activeFileId: defaultFile.id,
          code: defaultFile.content,
          detectedLanguage: defaultFile.language,
          errorLine: null,
        };
      }

      let newActiveId = state.activeFileId;
      if (state.activeFileId === fileIdToClose) {
        newActiveId = filteredOpenIds[filteredOpenIds.length - 1] || filteredFiles[0].id;
      }

      const newActiveFile = filteredFiles.find((f) => f.id === newActiveId) || filteredFiles[0];
      const finalOpenIds = filteredOpenIds.includes(newActiveFile.id)
        ? filteredOpenIds
        : [...filteredOpenIds, newActiveFile.id];

      saveStateToStorage(filteredFiles, newActiveId, state.stdin, state.folders, finalOpenIds);

      return {
        ...state,
        files: filteredFiles,
        openFileIds: finalOpenIds,
        activeFileId: newActiveId,
        code: newActiveFile.content,
        detectedLanguage: newActiveFile.language,
        errorLine: null,
      };
    }

    case 'RENAME_FILE': {
      const { id, newName } = action.payload;
      const trimmed = newName.trim();
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

      let updatedFolders = state.folders;
      if (trimmed.includes('/')) {
        const folderPart = trimmed.substring(0, trimmed.lastIndexOf('/'));
        if (!updatedFolders.includes(folderPart)) {
          updatedFolders = [...updatedFolders, folderPart];
        }
      }

      const currentActive = updatedFiles.find((f) => f.id === state.activeFileId);
      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin, updatedFolders, state.openFileIds);

      return {
        ...state,
        files: updatedFiles,
        folders: updatedFolders,
        detectedLanguage: currentActive ? currentActive.language : state.detectedLanguage,
      };
    }

    case 'ADD_FOLDER': {
      const folderName = action.payload.trim().replace(/\/+$/, '');
      if (!folderName || state.folders.includes(folderName)) return state;

      const updatedFolders = [...state.folders, folderName];
      saveStateToStorage(state.files, state.activeFileId, state.stdin, updatedFolders, state.openFileIds);

      return {
        ...state,
        folders: updatedFolders,
      };
    }

    case 'RENAME_FOLDER': {
      const { oldName, newName } = action.payload;
      const cleanNew = newName.trim().replace(/\/+$/, '');
      if (!cleanNew || cleanNew === oldName) return state;

      const updatedFolders = state.folders.map((f) =>
        f === oldName ? cleanNew : f.startsWith(`${oldName}/`) ? `${cleanNew}/${f.slice(oldName.length + 1)}` : f
      );
      const updatedFiles = state.files.map((file) => {
        if (file.name.startsWith(`${oldName}/`)) {
          return {
            ...file,
            name: `${cleanNew}/${file.name.slice(oldName.length + 1)}`,
          };
        }
        return file;
      });

      saveStateToStorage(updatedFiles, state.activeFileId, state.stdin, updatedFolders, state.openFileIds);

      return {
        ...state,
        folders: updatedFolders,
        files: updatedFiles,
      };
    }

    case 'DELETE_FOLDER': {
      const folderToDelete = action.payload;
      const updatedFolders = state.folders.filter(
        (f) => f !== folderToDelete && !f.startsWith(`${folderToDelete}/`)
      );
      let updatedFiles = state.files.filter((f) => !f.name.startsWith(`${folderToDelete}/`));

      if (updatedFiles.length === 0) {
        const defaultFile = {
          id: `file-${Date.now()}`,
          name: 'main.py',
          content: getStarterTemplate(71),
          language: defaultLang,
        };
        updatedFiles = [defaultFile];
      }

      let newActiveId = state.activeFileId;
      if (!updatedFiles.some((f) => f.id === newActiveId)) {
        newActiveId = updatedFiles[0].id;
      }
      const newActiveFile = updatedFiles.find((f) => f.id === newActiveId) || updatedFiles[0];

      saveStateToStorage(updatedFiles, newActiveId, state.stdin, updatedFolders);

      return {
        ...state,
        folders: updatedFolders,
        files: updatedFiles,
        activeFileId: newActiveId,
        code: newActiveFile.content,
        detectedLanguage: newActiveFile.language,
      };
    }

    case 'SET_EXECUTION_STATUS':
      return { ...state, executionStatus: action.payload };

    case 'SET_EXECUTION_RESULT':
      return {
        ...state,
        output: action.payload.output ?? action.payload.stdout ?? '',
        stderr: action.payload.error ?? action.payload.stderr ?? '',
        compileOutput: action.payload.compilerWarnings ?? action.payload.compile_output ?? '',
        executionTime: action.payload.time,
        executionMemory: action.payload.memory,
        errorLine: action.payload.errorLine,
        sqlData: action.payload.sqlData || null,
        executionStatus: action.payload.success ? 'success' : 'error',
      };

    case 'SET_STDIN': {
      saveStateToStorage(state.files, state.activeFileId, action.payload, state.folders, state.openFileIds);
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
    case 'TOGGLE_EXPLORER':
      return { ...state, explorerOpen: !state.explorerOpen };
    case 'SET_EXPLORER':
      return { ...state, explorerOpen: action.payload };
    case 'SET_EXPLORER_WIDTH':
      return { ...state, explorerWidth: action.payload };
    case 'TOGGLE_HINT_MODAL':
      return { ...state, hintModalOpen: !state.hintModalOpen, hintLevel: 1, currentHint: null };
    case 'SET_HINT':
      return { ...state, currentHint: action.payload, hintLevel: action.payload.level };
    case 'SET_HINT_LEVEL':
      return { ...state, hintLevel: action.payload };
    case 'SET_SELECTION':
      return { ...state, selectedCode: action.payload };
    case 'TOGGLE_PRACTICE':
      return { ...state, practiceOpen: !state.practiceOpen };
    case 'TOGGLE_SHARE_MODAL':
      return { ...state, shareModalOpen: !state.shareModalOpen };
    case 'SET_SHARE_MODAL':
      return { ...state, shareModalOpen: action.payload };
    case 'TOGGLE_HISTORY_MODAL':
      return { ...state, historyModalOpen: !state.historyModalOpen };
    case 'SET_HISTORY_MODAL':
      return { ...state, historyModalOpen: action.payload };
    case 'SET_SAVE_AS_MODAL':
      return {
        ...state,
        saveAsModalOpen: action.payload.isOpen,
        saveAsTargetFile: action.payload.targetFile || null,
      };
    case 'SET_AUTH_MODAL':
      return { ...state, authModalOpen: action.payload };
    case 'TOGGLE_COLLAB_MODAL':
      return { ...state, collabModalOpen: !state.collabModalOpen };
    case 'SET_COLLAB_MODAL':
      return { ...state, collabModalOpen: action.payload };
    case 'SET_INCOMING_MODAL':
      return {
        ...state,
        incomingModalOpen: action.payload.isOpen,
        incomingUpdate: action.payload.updateData || null,
      };
    case 'SET_COLLAB_ROOM':
      return {
        ...state,
        collabRoomId: action.payload,
        roomChatMessages: action.payload ? state.roomChatMessages : [],
        roomTypingUsers: [],
      };
    case 'SET_COLLAB_PEERS':
      return { ...state, collabPeers: action.payload };
    case 'ADD_ROOM_CHAT_MSG':
      return {
        ...state,
        roomChatMessages: [...state.roomChatMessages, action.payload],
        unreadRoomChatCount:
          state.roomChatDrawerOpen || action.payload.senderClientId === CLIENT_ID
            ? state.unreadRoomChatCount
            : state.unreadRoomChatCount + 1,
      };
    case 'SET_ROOM_TYPING': {
      const { user, isTyping, senderClientId } = action.payload;
      const filtered = state.roomTypingUsers.filter((u) => u.clientId !== senderClientId);
      return {
        ...state,
        roomTypingUsers: isTyping ? [...filtered, { ...user, clientId: senderClientId }] : filtered,
      };
    }
    case 'TOGGLE_ROOM_CHAT_DRAWER':
      return {
        ...state,
        roomChatDrawerOpen: !state.roomChatDrawerOpen,
        unreadRoomChatCount: !state.roomChatDrawerOpen ? 0 : state.unreadRoomChatCount,
      };
    case 'SET_ROOM_CHAT_DRAWER':
      return {
        ...state,
        roomChatDrawerOpen: action.payload,
        unreadRoomChatCount: action.payload ? 0 : state.unreadRoomChatCount,
      };
    case 'SET_ROOM_AUTO_SYNC':
      return { ...state, roomAutoSync: action.payload };
    case 'CLEAR_UNREAD_ROOM_CHAT':
      return { ...state, unreadRoomChatCount: 0 };
    case 'SET_ACTIVE_USER':
      return { ...state, activeUser: action.payload };
    case 'TOGGLE_FOCUS_MODE':
      return { ...state, focusMode: !state.focusMode };
    case 'SET_FOCUS_MODE':
      return { ...state, focusMode: action.payload };
    case 'TOGGLE_TERMINAL':
      return { ...state, terminalHidden: !state.terminalHidden };
    case 'SET_TERMINAL_HIDDEN':
      return { ...state, terminalHidden: action.payload };
    case 'REORDER_TABS': {
      const { sourceId, targetId } = action.payload;
      if (!sourceId || !targetId || sourceId === targetId) return state;
      const currentTabs = [...state.openFileIds];
      const sourceIndex = currentTabs.indexOf(sourceId);
      const targetIndex = currentTabs.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return state;
      currentTabs.splice(sourceIndex, 1);
      currentTabs.splice(targetIndex, 0, sourceId);
      saveStateToStorage(state.files, state.activeFileId, state.stdin, state.folders, currentTabs);
      return {
        ...state,
        openFileIds: currentTabs,
      };
    }
    case 'HYDRATE_USER_WORKSPACE': {
      const payload = action.payload;
      const curFile = payload.files.find((f) => f.id === payload.activeFileId) || payload.files[0];
      return {
        ...state,
        activeUser: payload.activeUser,
        files: payload.files,
        folders: payload.folders || [],
        activeFileId: payload.activeFileId,
        openFileIds: payload.openFileIds || [payload.activeFileId],
        stdin: payload.stdin || '',
        code: curFile ? curFile.content : '',
        detectedLanguage: curFile ? curFile.language : defaultLang,
        config: payload.config || state.config,
        output: '',
        stderr: '',
        compileOutput: '',
        errorLine: null,
      };
    }
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsModalOpen: !state.settingsModalOpen };
    case 'UPDATE_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_CURSOR':
      return { ...state, cursorPosition: action.payload };
    case 'SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
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

  // Synchronize CSS data-theme and custom 3-color palette
  useEffect(() => {
    const theme = state.config?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'custom' && state.config?.customPalette) {
      applyCustomPalette(state.config.customPalette);
    } else {
      clearCustomPaletteOverrides();
    }
  }, [state.config?.theme, state.config?.customPalette]);

  const showToast = useCallback((message, duration = 3000) => {
    dispatch({ type: 'SHOW_TOAST', payload: message });
    setTimeout(() => {
      dispatch({ type: 'CLEAR_TOAST' });
    }, duration);
  }, []);

  const handleSelectLanguage = useCallback((langObj, loadTemplate = false) => {
    dispatch({
      type: 'SET_LANGUAGE',
      payload: { language: langObj, loadTemplate },
    });
  }, []);

  const handleAddFile = useCallback((name, content, folder, openTab = true) => {
    dispatch({
      type: 'ADD_FILE',
      payload: { name, content, folder, openTab },
    });
  }, []);

  const handleSelectFile = useCallback((id) => {
    dispatch({ type: 'SELECT_FILE', payload: id });
  }, []);

  const handleCloseTab = useCallback((id) => {
    dispatch({ type: 'CLOSE_TAB', payload: id });
  }, []);

  const handleCloseFile = useCallback((id) => {
    dispatch({ type: 'CLOSE_FILE', payload: id });
  }, []);

  const handleRenameFile = useCallback((id, newName) => {
    dispatch({ type: 'RENAME_FILE', payload: { id, newName } });
    showToast(`Renamed file to ${newName} ✏️`);
  }, [showToast]);

  const handleAddFolder = useCallback((folderName) => {
    dispatch({ type: 'ADD_FOLDER', payload: folderName });
    showToast(`Created folder ${folderName}/ 📁`);
  }, [showToast]);

  const handleRenameFolder = useCallback((oldName, newName) => {
    dispatch({ type: 'RENAME_FOLDER', payload: { oldName, newName } });
    showToast(`Renamed folder to ${newName}/ ✏️`);
  }, [showToast]);

  const handleDeleteFolder = useCallback((folderName) => {
    dispatch({ type: 'DELETE_FOLDER', payload: folderName });
    showToast(`Deleted folder ${folderName}/ 🗑️`);
  }, [showToast]);

  // Save single active file: Opens "Save As" modal for custom name & target selection
  const handleSaveActiveFile = useCallback((targetFile = null) => {
    const fileToSave = targetFile || state.files.find((f) => f.id === state.activeFileId) || state.files[0];
    if (!fileToSave) return;
    dispatch({
      type: 'SET_SAVE_AS_MODAL',
      payload: { isOpen: true, targetFile: fileToSave },
    });
  }, [state.files, state.activeFileId]);

  // Download entire workspace folder or specific folder as a ZIP archive
  const handleDownloadWorkspace = useCallback(async (targetFolder = null) => {
    try {
      const zip = new JSZip();
      const filesToInclude = targetFolder
        ? state.files.filter((f) => f.name.startsWith(`${targetFolder}/`))
        : state.files;

      if (filesToInclude.length === 0) {
        showToast('No files to package 📁');
        return;
      }

      showToast('Packaging ZIP archive... 📦');

      filesToInclude.forEach((file) => {
        const filePath = targetFolder && file.name.startsWith(`${targetFolder}/`)
          ? file.name.slice(targetFolder.length + 1)
          : file.name;
        zip.file(filePath, file.content);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const zipFileName = targetFolder ? `${targetFolder}.zip` : 'fullcode-project.zip';
      anchor.download = zipFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      showToast(`Downloaded ${zipFileName} (${filesToInclude.length} files) 📦`);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
      showToast(`Error generating ZIP: ${err.message}`);
    }
  }, [state.files, showToast]);

  // Switch Active User & Hydrate Isolated Workspace
  const handleSwitchUser = useCallback((newUser) => {
    if (!newUser) return;

    // Save previous user's workspace
    const currentUserId = state.activeUser?.id || null;
    saveUserWorkspace(currentUserId, {
      files: state.files,
      folders: state.folders,
      activeFileId: state.activeFileId,
      openFileIds: state.openFileIds,
      stdin: state.stdin,
      config: state.config,
    });

    // Load target user's workspace
    const targetWorkspace = loadUserWorkspace(newUser.id);
    let newFiles, newFolders, newActiveId, newOpenIds, newStdin, newConfig;

    if (targetWorkspace && Array.isArray(targetWorkspace.files) && targetWorkspace.files.length > 0) {
      newFiles = targetWorkspace.files;
      newFolders = targetWorkspace.folders || [];
      newActiveId = targetWorkspace.activeFileId || newFiles[0].id;
      newOpenIds = targetWorkspace.openFileIds || [newActiveId];
      newStdin = targetWorkspace.stdin || '';
      newConfig = targetWorkspace.config || state.config;
    } else {
      const defaultStarter = {
        id: `file-${Date.now()}`,
        name: 'main.py',
        content: getStarterTemplate(71),
        language: getLanguageById(71),
      };
      newFiles = [defaultStarter];
      newFolders = [];
      newActiveId = defaultStarter.id;
      newOpenIds = [defaultStarter.id];
      newStdin = '';
      newConfig = state.config;
    }

    dispatch({
      type: 'HYDRATE_USER_WORKSPACE',
      payload: {
        activeUser: newUser,
        files: newFiles,
        folders: newFolders,
        activeFileId: newActiveId,
        openFileIds: newOpenIds,
        stdin: newStdin,
        config: newConfig,
      },
    });

    saveStateToStorage(newFiles, newActiveId, newStdin, newFolders, newOpenIds);
  }, [state.activeUser, state.files, state.folders, state.activeFileId, state.openFileIds, state.stdin, state.config]);

  // Logout User & Return to Guest Workspace
  const handleLogoutUser = useCallback(() => {
    if (state.activeUser) {
      saveUserWorkspace(state.activeUser.id, {
        files: state.files,
        folders: state.folders,
        activeFileId: state.activeFileId,
        openFileIds: state.openFileIds,
        stdin: state.stdin,
        config: state.config,
      });
    }
    logoutUser();

    // Load guest workspace or clean starter
    const guestWorkspace = loadUserWorkspace(null);
    let newFiles, newFolders, newActiveId, newOpenIds, newStdin;

    if (guestWorkspace && Array.isArray(guestWorkspace.files) && guestWorkspace.files.length > 0) {
      newFiles = guestWorkspace.files;
      newFolders = guestWorkspace.folders || [];
      newActiveId = guestWorkspace.activeFileId || newFiles[0].id;
      newOpenIds = guestWorkspace.openFileIds || [newActiveId];
      newStdin = guestWorkspace.stdin || '';
    } else {
      const defaultStarter = {
        id: `file-${Date.now()}`,
        name: 'main.py',
        content: getStarterTemplate(71),
        language: getLanguageById(71),
      };
      newFiles = [defaultStarter];
      newFolders = [];
      newActiveId = defaultStarter.id;
      newOpenIds = [defaultStarter.id];
      newStdin = '';
    }

    dispatch({
      type: 'HYDRATE_USER_WORKSPACE',
      payload: {
        activeUser: null,
        files: newFiles,
        folders: newFolders,
        activeFileId: newActiveId,
        openFileIds: newOpenIds,
        stdin: newStdin,
        config: state.config,
      },
    });

    saveStateToStorage(newFiles, newActiveId, newStdin, newFolders, newOpenIds);
    showToast('Logged out 👋 Switched to Guest workspace');
  }, [state.activeUser, state.files, state.folders, state.activeFileId, state.openFileIds, state.stdin, state.config, showToast]);

  // Execute Code with Instant Auto-Input Detection
  const handleRunCode = useCallback(async () => {
    dispatch({ type: 'SET_EXECUTION_STATUS', payload: 'running' });

    try {
      const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
      const hasSelection = Boolean(state.selectedCode && state.selectedCode.trim());
      const codeToRun = hasSelection ? state.selectedCode.trim() : activeFile.content;

      // Auto-record snapshot in version history
      recordSnapshot(activeFile.name, codeToRun, state.detectedLanguage?.name, 'Code Run');

      let effectiveStdin = state.stdin;

      // Auto Input Detection on Run
      const expectsInput =
        /Scanner|BufferedReader|System\.in|cin\s*>>|scanf|input\(|readline|readLine|fmt\.Scan|fgets\(STDIN\)|gets\(|<STDIN>|prompt\(/.test(
          codeToRun
        );

      if (expectsInput && (!effectiveStdin || !effectiveStdin.trim())) {
        const hasMatrix =
          /matrix|grid|2d|2D|\[\s*\]\s*\[/.test(codeToRun) ||
          (/for.*for/.test(codeToRun) && /input|scanf|cin|scan|read|nextInt/.test(codeToRun));
        const hasArray =
          /array|arr|list|vector/.test(codeToRun) ||
          (/for/.test(codeToRun) && /input|scanf|cin|scan|read|nextInt/.test(codeToRun));

        if (hasMatrix) {
          effectiveStdin = '3 3\n1 2 3\n4 5 6\n7 8 9';
        } else if (hasArray) {
          effectiveStdin = '5\n10 20 30 40 50';
        } else {
          effectiveStdin = '42\nHello World';
        }

        dispatch({ type: 'SET_STDIN', payload: effectiveStdin });
        showToast('Auto-generated input for code execution 💡');
      }

      const result = await executeCode(
        codeToRun,
        state.detectedLanguage.id,
        effectiveStdin
      );

      dispatch({ type: 'SET_EXECUTION_RESULT', payload: result });

      if (result.error && state.config.mockAI) {
        explainError(codeToRun, result.error, state.detectedLanguage.name).then((explanation) => {
          dispatch({ type: 'SET_AI_EXPLANATION', payload: explanation });
        });
      }
    } catch (err) {
      dispatch({
        type: 'SET_EXECUTION_RESULT',
        payload: {
          success: false,
          output: '',
          error: err.message || 'Execution failed',
          time: null,
          memory: null,
        },
      });
    }
  }, [state.files, state.activeFileId, state.selectedCode, state.stdin, state.detectedLanguage, state.config.mockAI, showToast]);

  const handleFormatCode = useCallback(() => {
    const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
    if (!activeFile) return;

    try {
      const formatted = formatCode(activeFile.content, activeFile.language?.id || 71);
      if (formatted !== activeFile.content) {
        dispatch({ type: 'SET_CODE', payload: formatted });
        recordSnapshot(activeFile.name, formatted, activeFile.language?.name, 'Auto Format');
        showToast('Code formatted cleanly ✨');
      } else {
        showToast('Code is already cleanly formatted 👍');
      }
    } catch (err) {
      showToast(`Format failed: ${err.message}`);
    }
  }, [state.files, state.activeFileId, showToast]);

  const handleGenerateInputs = useCallback(async () => {
    const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
    try {
      showToast('Generating smart inputs with AI...');
      const inputs = await generateInputs(activeFile.content, state.detectedLanguage.name);
      dispatch({ type: 'SET_STDIN', payload: inputs });
      showToast('Sample inputs generated! ✨');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }, [state.files, state.activeFileId, state.detectedLanguage, showToast]);

  const handleGetHint = useCallback(async () => {
    const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
    try {
      const hint = await getLogicHint(
        activeFile.content,
        state.detectedLanguage.name,
        state.hintLevel
      );
      dispatch({ type: 'SET_HINT', payload: { ...hint, level: state.hintLevel } });
    } catch (err) {
      showToast(`Error fetching hint: ${err.message}`);
    }
  }, [state.files, state.activeFileId, state.detectedLanguage, state.hintLevel, showToast]);

  const handleSendMessage = useCallback(
    async (userMessage) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: { role: 'user', content: userMessage, timestamp: Date.now() },
      });

      dispatch({ type: 'SET_CHAT_TYPING', payload: true });

      try {
        const activeFile = state.files.find((f) => f.id === state.activeFileId) || state.files[0];
        const reply = await chatWithAI(
          userMessage,
          activeFile.content,
          state.detectedLanguage.name,
          state.output,
          state.stderr
        );

        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: { role: 'assistant', content: reply, timestamp: Date.now() },
        });
      } catch (err) {
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: {
            role: 'assistant',
            content: `I encountered an error: ${err.message}`,
            timestamp: Date.now(),
          },
        });
      } finally {
        dispatch({ type: 'SET_CHAT_TYPING', payload: false });
      }
    },
    [state.files, state.activeFileId, state.detectedLanguage, state.output, state.stderr]
  );

  // Collab state references to avoid stale closure in message events
  const filesRef = useRef(state.files);
  const foldersRef = useRef(state.folders);
  const activeUserRef = useRef(state.activeUser);
  const collabPeersRef = useRef(state.collabPeers);
  const roomChatDrawerOpenRef = useRef(state.roomChatDrawerOpen);

  useEffect(() => {
    filesRef.current = state.files;
    foldersRef.current = state.folders;
    activeUserRef.current = state.activeUser;
    collabPeersRef.current = state.collabPeers;
    roomChatDrawerOpenRef.current = state.roomChatDrawerOpen;
  });

  // Live Collaboration Handlers
  const handleJoinCollabRoom = useCallback((roomId) => {
    if (!roomId) return;
    const joinedId = joinCollabRoom(roomId, activeUserRef.current, (message) => {
      if (!message) return;

      if (message.type === 'PEER_JOIN') {
        const peer = {
          ...message.user,
          clientId: message.senderClientId,
        };
        dispatch({
          type: 'SET_COLLAB_PEERS',
          payload: [
            ...collabPeersRef.current.filter((p) => p.clientId !== message.senderClientId),
            peer,
          ],
        });
        showToast(`${peer.username || 'Collaborator'} joined the room! 👥`);

        // Send back an acknowledgment so the joining peer registers us too
        sendRoomMessage({
          type: 'PEER_ACK',
          user: activeUserRef.current || { username: 'Collaborator', avatarInitials: 'CB', avatarColor: '#00d4ff' },
          senderClientId: CLIENT_ID,
        });

        // Automatically push current workspace to newly joined peer
        if (filesRef.current && filesRef.current.length > 0) {
          broadcastWorkspaceChanges(
            activeUserRef.current,
            filesRef.current,
            foldersRef.current,
            'Auto sync workspace for joined peer'
          );
        }
      } else if (message.type === 'PEER_ACK') {
        const peer = {
          ...message.user,
          clientId: message.senderClientId,
        };
        dispatch({
          type: 'SET_COLLAB_PEERS',
          payload: [
            ...collabPeersRef.current.filter((p) => p.clientId !== message.senderClientId),
            peer,
          ],
        });
      } else if (message.type === 'PEER_LEAVE') {
        dispatch({
          type: 'SET_COLLAB_PEERS',
          payload: collabPeersRef.current.filter((p) => p.clientId !== message.senderClientId),
        });
        showToast(`${message.user?.username || 'Collaborator'} left the room 👋`);
      } else if (message.type === 'PUSH_WORKSPACE') {
        dispatch({
          type: 'SET_INCOMING_MODAL',
          payload: { isOpen: true, updateData: message },
        });
      } else if (message.type === 'REQUEST_REFRESH') {
        broadcastWorkspaceChanges(
          activeUserRef.current,
          filesRef.current,
          foldersRef.current,
          'Auto response to refresh request'
        );
      } else if (message.type === 'CHAT_MESSAGE') {
        dispatch({
          type: 'ADD_ROOM_CHAT_MSG',
          payload: message,
        });
        if (!roomChatDrawerOpenRef.current) {
          showToast(`💬 ${message.sender?.username || 'Member'}: ${message.text || 'Shared code snippet'}`);
        }
      } else if (message.type === 'USER_TYPING') {
        dispatch({
          type: 'SET_ROOM_TYPING',
          payload: {
            user: message.sender,
            isTyping: message.isTyping,
            senderClientId: message.senderClientId,
          },
        });
      }
    }, (peersList) => {
      if (Array.isArray(peersList)) {
        dispatch({ type: 'SET_COLLAB_PEERS', payload: peersList });
      }
    });

    if (joinedId) {
      dispatch({ type: 'SET_COLLAB_ROOM', payload: joinedId });

      // If room snapshot already exists, load it immediately on joining
      const existingSnapshot = getLatestRoomSnapshot(joinedId);
      if (existingSnapshot && Array.isArray(existingSnapshot.files) && existingSnapshot.files.length > 0) {
        dispatch({
          type: 'SET_INCOMING_MODAL',
          payload: { isOpen: true, updateData: existingSnapshot },
        });
      }
    }
  }, [showToast]);

  const handlePullRoomChanges = useCallback(() => {
    if (!state.collabRoomId) return;

    // 1. Check if there is an existing room snapshot saved
    const snapshot = getLatestRoomSnapshot(state.collabRoomId);
    if (snapshot && Array.isArray(snapshot.files) && snapshot.files.length > 0) {
      dispatch({
        type: 'SET_INCOMING_MODAL',
        payload: {
          isOpen: true,
          updateData: {
            sender: snapshot.sender || { username: 'Room Snapshot' },
            files: snapshot.files,
            folders: snapshot.folders || [],
            note: snapshot.note || 'Latest recorded room snapshot',
            timestamp: snapshot.timestamp || Date.now(),
          },
        },
      });
      showToast('Loaded latest room changes! 📥');
    }

    // 2. Also send request to all online peers
    requestRoomRefresh(state.activeUser);
    showToast('Requested latest changes from room members 🔄');
  }, [state.collabRoomId, state.activeUser, showToast]);

  const handleLeaveCollabRoom = useCallback(() => {
    leaveCollabRoom(state.activeUser);
    dispatch({ type: 'SET_COLLAB_ROOM', payload: null });
    dispatch({ type: 'SET_COLLAB_PEERS', payload: [] });
  }, [state.activeUser]);

  const handleSendRoomChatMessage = useCallback((text, codeSnippet = null) => {
    if (!state.collabRoomId) return;
    const msgId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const msg = {
      type: 'CHAT_MESSAGE',
      id: msgId,
      roomId: state.collabRoomId,
      sender: state.activeUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
      senderClientId: CLIENT_ID,
      text: text ? text.trim() : '',
      codeSnippet: codeSnippet || null,
      timestamp: Date.now(),
    };
    sendRoomChatMessage(state.activeUser, text, codeSnippet);
    dispatch({ type: 'ADD_ROOM_CHAT_MSG', payload: msg });
  }, [state.collabRoomId, state.activeUser]);

  const handleSendRoomTyping = useCallback((isTyping) => {
    if (!state.collabRoomId) return;
    sendRoomTyping(state.activeUser, isTyping);
  }, [state.collabRoomId, state.activeUser]);

  const handleAcceptIncomingChanges = useCallback(() => {
    const updateData = state.incomingUpdate;
    if (!updateData || !Array.isArray(updateData.files)) return;

    // Merge incoming files
    const incomingFiles = updateData.files;
    const incomingFolders = updateData.folders || [];

    const existingFileNames = new Set(incomingFiles.map((f) => f.name));
    const retainedFiles = state.files.filter((f) => !existingFileNames.has(f.name));

    const mergedFiles = [
      ...incomingFiles.map((f) => ({
        id: f.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: f.name,
        content: f.content,
        language: f.language || getLanguageFromFilename(f.name),
      })),
      ...retainedFiles,
    ];

    const mergedFolders = Array.from(new Set([...state.folders, ...incomingFolders]));
    const nextActiveId = mergedFiles[0]?.id || state.activeFileId;
    const nextActiveFile = mergedFiles.find((f) => f.id === nextActiveId) || mergedFiles[0];

    saveStateToStorage(mergedFiles, nextActiveId, state.stdin, mergedFolders, [nextActiveId]);

    dispatch({
      type: 'HYDRATE_USER_WORKSPACE',
      payload: {
        activeUser: state.activeUser,
        files: mergedFiles,
        folders: mergedFolders,
        activeFileId: nextActiveId,
        openFileIds: [nextActiveId],
        stdin: state.stdin,
        config: state.config,
      },
    });

    dispatch({
      type: 'SET_INCOMING_MODAL',
      payload: { isOpen: false, updateData: null },
    });

    showToast(`Applied ${incomingFiles.length} workspace file(s) from ${updateData.sender?.username || 'room'}! 🚀`);
  }, [state.incomingUpdate, state.files, state.folders, state.activeFileId, state.stdin, state.activeUser, state.config, showToast]);

  const handleDeclineIncomingChanges = useCallback(() => {
    dispatch({
      type: 'SET_INCOMING_MODAL',
      payload: { isOpen: false, updateData: null },
    });
    showToast('Declined workspace update ❌');
  }, [showToast]);

  // Auto-join room if room code in URL hash on boot
  useEffect(() => {
    const roomCodeFromUrl = getRoomFromUrl();
    if (roomCodeFromUrl && !state.collabRoomId) {
      if (isValidRoomId(roomCodeFromUrl)) {
        handleJoinCollabRoom(normalizeRoomId(roomCodeFromUrl));
      } else {
        showToast(`Invalid room ID in link: ${roomCodeFromUrl} ❌`);
      }
    }
  }, [handleJoinCollabRoom, state.collabRoomId, showToast]);

  const handleUpdateConfig = useCallback((newConfig) => {
    updateConfig(newConfig);
    dispatch({ type: 'UPDATE_CONFIG', payload: newConfig });
  }, []);

  const handleReorderTabs = useCallback((sourceId, targetId) => {
    dispatch({ type: 'REORDER_TABS', payload: { sourceId, targetId } });
  }, []);

  const handleToggleFocusMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_FOCUS_MODE' });
  }, []);

  const handleToggleTerminal = useCallback(() => {
    dispatch({ type: 'TOGGLE_TERMINAL' });
  }, []);

  const value = {
    state,
    collabRoomId: state.collabRoomId,
    collabPeers: state.collabPeers,
    dispatch,
    handleSelectLanguage,
    handleAddFile,
    handleSelectFile,
    handleCloseTab,
    handleCloseFile,
    handleRenameFile,
    handleAddFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleSaveActiveFile,
    handleDownloadWorkspace,
    handleRunCode,
    handleFormatCode,
    handleGenerateInputs,
    handleGetHint,
    handleSendMessage,
    handleUpdateConfig,
    handleSwitchUser,
    handleLogoutUser,
    handleJoinCollabRoom,
    handleLeaveCollabRoom,
    handlePullRoomChanges,
    handleSendRoomChatMessage,
    handleSendRoomTyping,
    handleAcceptIncomingChanges,
    handleDeclineIncomingChanges,
    handleReorderTabs,
    handleToggleFocusMode,
    handleToggleTerminal,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
