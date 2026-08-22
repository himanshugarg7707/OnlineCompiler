import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, RotateCcw, Check, Search, Code2 } from 'lucide-react';
import { getSupportedLanguages, getLanguageById } from '../services/languageDetector';
import { resetConfig } from '../services/configService';
import './SettingsModal.css';

export default function SettingsModal() {
  const { state, dispatch, handleUpdateConfig, handleSelectLanguage } = useApp();
  const { settingsModalOpen, config, detectedLanguage } = state;
  const [localConfig, setLocalConfig] = useState(config);
  const [langSearch, setLangSearch] = useState('');

  const supportedLanguages = getSupportedLanguages();

  const filteredLanguages = supportedLanguages.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.monacoLanguage.toLowerCase().includes(langSearch.toLowerCase())
  );

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && settingsModalOpen) {
        dispatch({ type: 'TOGGLE_SETTINGS' });
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [settingsModalOpen, dispatch]);

  const handleLanguageChange = (langObj, loadTemplate = false) => {
    handleSelectLanguage(langObj, loadTemplate);
  };

  const handleConfigChange = (key, value) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    handleUpdateConfig(updated);
  };

  const handleReset = () => {
    const defaults = resetConfig();
    setLocalConfig(defaults);
    handleUpdateConfig(defaults);
  };

  if (!settingsModalOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dispatch({ type: 'TOGGLE_SETTINGS' });
        }
      }}
    >
      <div className="settings-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title-group">
            <Code2 size={20} className="settings-icon" />
            <h2>Preferences & Language</h2>
          </div>
          <button
            className="btn-icon"
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          >
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          {/* Programming Language Selection */}
          <div className="settings-section">
            <h3 className="section-title">Programming Language</h3>
            <p className="section-desc">
              Choose the language for the active code editor.
            </p>

            <div className="settings-lang-search">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search from 19 supported languages..."
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                className="settings-search-input"
              />
            </div>

            <div className="settings-lang-grid">
              {filteredLanguages.map((lang) => {
                const isSelected = detectedLanguage.id === lang.id;
                return (
                  <div
                    key={lang.id}
                    className={`settings-lang-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleLanguageChange(getLanguageById(lang.id), false)}
                  >
                    <div className="lang-card-main">
                      <span className="lang-card-emoji">{lang.icon}</span>
                      <span className="lang-card-name">{lang.name}</span>
                    </div>

                    <div className="lang-card-actions">
                      <button
                        className="btn-card-template"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLanguageChange(getLanguageById(lang.id), true);
                        }}
                        title="Load starter template"
                      >
                        Template
                      </button>
                      {isSelected && <Check size={16} className="card-check" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editor Settings */}
          <div className="settings-section">
            <h3 className="section-title">Editor Preferences</h3>

            <div className="setting-field">
              <label className="field-label">
                Font Size: <strong>{localConfig.fontSize}px</strong>
              </label>
              <input
                type="range"
                className="field-range"
                min="12"
                max="24"
                value={localConfig.fontSize}
                onChange={(e) =>
                  handleConfigChange('fontSize', parseInt(e.target.value))
                }
              />
              <div className="range-labels">
                <span>12px</span>
                <span>24px</span>
              </div>
            </div>

            <div className="setting-toggle">
              <div>
                <span className="toggle-label">Code Minimap</span>
                <span className="toggle-desc">
                  Show visual minimap preview on the right
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localConfig.minimap}
                  onChange={(e) =>
                    handleConfigChange('minimap', e.target.checked)
                  }
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button className="btn-ghost" onClick={handleReset}>
            <RotateCcw size={14} />
            <span>Reset to Defaults</span>
          </button>
          <button
            className="btn-primary"
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
