// Configuration Service
// Manages API keys, endpoints, and app settings via localStorage

const CONFIG_KEY = 'codeforge_config';

const DEFAULT_CONFIG = {
  // Theme settings ('dark' | 'baby-pink' | 'cyberpunk' | 'monokai' | 'light' | 'nord')
  theme: 'dark',

  // API Keys (Optional)
  claudeApiKey: '',
  judge0ApiKey: '',
  judge0Host: 'judge0-ce.p.rapidapi.com',

  // Mode toggles (MockAI true enables instant built-in zero-key AI tutor)
  mockAI: true,
  mockExecution: false,

  // Editor settings
  fontSize: 15,
  minimap: true,
  wordWrap: 'off',

  // UI settings
  sidebarOpen: false,
  explorerOpen: true,
  explorerWidth: 240,
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
