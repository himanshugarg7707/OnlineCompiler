import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Cookie,
  ShieldCheck,
  Check,
  X,
  Sliders,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Sparkles,
  Lock,
} from 'lucide-react';
import { getCookieConsent, saveCookieConsent } from '../services/storageService';
import './CookieConsentBanner.css';

export default function CookieConsentBanner({ onOpenSettings }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState({
    persistentStorage: true,
    themeMemory: true,
    historyMemory: true,
  });

  useEffect(() => {
    // Show banner after a slight delay if consent hasn't been given yet
    const existing = getCookieConsent();
    if (!existing) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    saveCookieConsent({
      accepted: true,
      persistentStorage: true,
      themeMemory: true,
      historyMemory: true,
    });
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    saveCookieConsent({
      accepted: false,
      persistentStorage: false,
      themeMemory: false,
      historyMemory: false,
    });
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({
      accepted: true,
      ...prefs,
    });
    setIsVisible(false);
  };

  return createPortal(
    <div className="cookie-banner-wrapper animate-slide-up">
      <div className="cookie-banner-card">
        <div className="cookie-banner-header">
          <div className="cookie-icon-badge">
            <Cookie size={18} className="cookie-icon" />
          </div>

          <div className="cookie-title-group">
            <h3>Permanent Memory & Cookies</h3>
            <span className="cookie-badge-privacy">
              <ShieldCheck size={11} /> 100% Local & Private
            </span>
          </div>

          <button
            className="cookie-close-btn"
            onClick={handleEssentialOnly}
            title="Dismiss / Essential Only"
          >
            <X size={14} />
          </button>
        </div>

        <p className="cookie-description">
          Full Code uses persistent browser storage and cookies to save your multi-file workspaces,
          user profiles, custom themes, and autosaved history locally on your device with zero data loss.
        </p>

        {showDetails && (
          <div className="cookie-custom-options animate-slide-down">
            <label className="cookie-toggle-row">
              <div className="cookie-toggle-info">
                <strong>Persistent Workspace Storage</strong>
                <span>Preserves all project files, folders, and multi-level structure across sessions</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.persistentStorage}
                onChange={(e) => setPrefs({ ...prefs, persistentStorage: e.target.checked })}
                className="cookie-checkbox"
              />
            </label>

            <label className="cookie-toggle-row">
              <div className="cookie-toggle-info">
                <strong>Custom Theme & Layout Memory</strong>
                <span>Stores 3-color palettes, dark mode, font sizes, and layout preferences</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.themeMemory}
                onChange={(e) => setPrefs({ ...prefs, themeMemory: e.target.checked })}
                className="cookie-checkbox"
              />
            </label>

            <label className="cookie-toggle-row">
              <div className="cookie-toggle-info">
                <strong>Version History Snapshots</strong>
                <span>Keeps offline local snapshots of code revisions for one-click rollback</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.historyMemory}
                onChange={(e) => setPrefs({ ...prefs, historyMemory: e.target.checked })}
                className="cookie-checkbox"
              />
            </label>
          </div>
        )}

        <div className="cookie-actions">
          <button
            type="button"
            className="btn-cookie-customize"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Sliders size={12} />
            <span>{showDetails ? 'Hide Options' : 'Customize'}</span>
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <div className="cookie-main-buttons">
            <button
              type="button"
              className="btn-cookie-essential"
              onClick={handleEssentialOnly}
              title="Save essential session data only"
            >
              Essential Only
            </button>

            {showDetails ? (
              <button
                type="button"
                className="btn-cookie-accept"
                onClick={handleSaveCustom}
              >
                <Check size={13} />
                <span>Save Preferences</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-cookie-accept"
                onClick={handleAcceptAll}
              >
                <Sparkles size={13} />
                <span>Accept & Enable Permanent Memory</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
