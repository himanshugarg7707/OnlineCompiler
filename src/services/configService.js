// Configuration Service
// Manages API keys, endpoints, and app settings via localStorage

const CONFIG_KEY = 'codeforge_config';

const DEFAULT_CONFIG = {
  // Theme settings ('antigravity-google' | 'dark' | 'baby-pink' | 'baby-pink-dark' | 'cyberpunk' | 'monokai' | 'light' | 'nord' | 'custom')
  theme: 'antigravity-google',
  customPalette: {
    bg: '#0b1326',
    primary: '#adc6ff',
    secondary: '#4cd7f6',
  },

  // API Keys (Optional)
  claudeApiKey: '',
  geminiApiKey: '',
  aiProvider: 'gemini',
  luciaResponseStyle: 'code-first',
  aiAssistantName: 'Lucia',
  aiConversationMode: 'code',
  aiCustomInstructions: '',
  aiTone: 'friendly',
  aiDetailLevel: 'balanced',
  aiTeachingLevel: 'adaptive',
  aiResponseFormat: 'markdown',
  judge0ApiKey: '',
  judge0Host: 'judge0-ce.p.rapidapi.com',

  // Mode toggles (MockAI true enables instant built-in zero-key AI tutor)
  mockAI: true,
  mockExecution: false,

  // Editor settings
  fontSize: 16,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 4,
  minimap: true,
  wordWrap: 'off',
  lineNumbers: true,
  suggestionsWhileTyping: true,
  inlineAiAutocomplete: true,
  workspaceUiScale: 1,

  // Terminal settings ('bottom' | 'right')
  terminalPosition: 'bottom',

  // UI settings
  sidebarOpen: false,
  explorerOpen: true,
  explorerWidth: 240,

  // Notebook Export settings ('split' | 'ipynb')
  // 'split': splits cells into java/java_01.java, python/python_01.py, etc. in a ZIP archive
  // 'ipynb': exports standard single .ipynb notebook
  notebookExportMode: 'split',
};

/**
 * Convert scale config (numeric or legacy string) into a clean bounded numeric multiplier.
 */
export function getWorkspaceScaleValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1.4, Math.max(0.7, value));
  }
  return ({ small: 0.85, medium: 1, zoomed: 1.15 })[value] || 1;
}

/**
 * Forcefully apply UI scale and compiler font settings across the entire DOM,
 * CSS variables, and all listening components (Monaco Editor, panels, layouts).
 */
export function applyGlobalAppConfig(config) {
  if (typeof document === 'undefined') return;
  const cfg = config || getConfig();
  const scale = getWorkspaceScaleValue(cfg.workspaceUiScale);
  const fontSize = Number(cfg.fontSize) || 16;
  const fontFamily = cfg.fontFamily || "'JetBrains Mono', monospace";

  try {
    // 1. Force global UI scale (zoom) on root document
    document.documentElement.style.zoom = String(scale);
    document.documentElement.style.setProperty('--workspace-ui-scale', String(scale));
    document.documentElement.style.setProperty('--app-ui-scale', String(scale));
  } catch (e) {
    console.warn('Failed to apply UI scale zoom:', e);
  }

  try {
    // 2. Force editor typography variables across whole app
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--editor-font-family', fontFamily);
    document.documentElement.style.setProperty('--font-mono', fontFamily);
  } catch (e) {
    console.warn('Failed to apply typography CSS variables:', e);
  }

  try {
    // 3. Notify Monaco and all listeners immediately
    window.dispatchEvent(
      new CustomEvent('fullcode-config-applied', {
        detail: { scale, fontSize, fontFamily, config: cfg },
      })
    );
    window.dispatchEvent(new Event('resize'));
    if (window.monaco?.editor?.remeasureFonts) {
      window.monaco.editor.remeasureFonts();
    }
  } catch {}
}

/**
 * Get the current configuration
 */
export function getConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.aiProvider === 'lucia') parsed.aiProvider = 'gemini';
      if (!parsed.aiProvider) parsed.aiProvider = 'gemini';
      if (!['mock', 'gemini'].includes(parsed.aiProvider)) parsed.aiProvider = 'gemini';
      // Upgrade legacy or baby-pink themes to official Google Antigravity theme
      if ((parsed.theme === 'baby-pink' || !parsed.theme) && !localStorage.getItem('fullcode_antigravity_official_v4')) {
        localStorage.setItem('fullcode_antigravity_official_v4', 'true');
        parsed.theme = 'antigravity-google';
        localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...DEFAULT_CONFIG, ...parsed }));
      }
      const loaded = { ...DEFAULT_CONFIG, ...parsed };
      applyGlobalAppConfig(loaded);
      return loaded;
    }
  } catch (e) {
    console.warn('Failed to load config:', e);
  }
  const fallback = { ...DEFAULT_CONFIG };
  applyGlobalAppConfig(fallback);
  return fallback;
}

/**
 * Update configuration (partial update)
 */
export function updateConfig(updates) {
  const current = getConfig();
  const newConfig = { ...current, ...updates };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
  } catch (e) {
    console.warn('Failed to save config:', e);
  }
  applyGlobalAppConfig(newConfig);
  return newConfig;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch (e) {
    console.warn('Failed to reset config:', e);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Check if real API mode is available
 */
export function isAIReady() {
  const config = getConfig();
  return config.aiProvider === 'gemini' || Boolean(config.geminiApiKey);
}

export function isExecutionReady() {
  const config = getConfig();
  return !config.mockExecution && config.judge0ApiKey.length > 0;
}
