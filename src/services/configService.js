// Configuration Service
// Manages API keys, endpoints, and app settings via localStorage

const CONFIG_KEY = 'codeforge_config';

const DEFAULT_CONFIG = {
  // Theme settings ('dark' | 'baby-pink' | 'cyberpunk' | 'monokai' | 'light' | 'nord' | 'custom')
  theme: 'dark',
  customPalette: {
    bg: '#0f172a',
    primary: '#00d4ff',
    secondary: '#b480ff',
  },

  // API Keys (Optional)
  claudeApiKey: '',
  judge0ApiKey: '',
  judge0Host: 'judge0-ce.p.rapidapi.com',

  // Mode toggles (MockAI true enables instant built-in zero-key AI tutor)
  mockAI: true,
  mockExecution: false,

  // Editor settings
  fontSize: 16,
  minimap: true,
  wordWrap: 'off',
  lineNumbers: true,

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
 * Get the current configuration
 */
export function getConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load config:', e);
  }
  return { ...DEFAULT_CONFIG };
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
  return !config.mockAI && config.claudeApiKey.length > 0;
}

export function isExecutionReady() {
  const config = getConfig();
  return !config.mockExecution && config.judge0ApiKey.length > 0;
}
