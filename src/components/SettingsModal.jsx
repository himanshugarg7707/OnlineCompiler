import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  X,
  RotateCcw,
  Check,
  Search,
  Code2,
  Palette,
  Sparkles,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  FileCode,
  Folder,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  LogOut,
  Users,
  UserPlus,
  Sliders,
  Paintbrush,
} from 'lucide-react';
import { getSupportedLanguages, getLanguageById } from '../services/languageDetector';
import { resetConfig } from '../services/configService';
import {
  getProtectedItems,
  protectItem,
  removeProtectionDirect,
  lockItemInSession,
  isItemUnlocked,
} from '../services/securityService';
import {
  getActiveUser,
  getAllUsers,
  logoutUser,
  updateUserProfile,
} from '../services/authService';
import {
  applyCustomPalette,
  clearCustomPaletteOverrides,
} from '../services/themeService';
import {
  getStorageEstimate,
  isStoragePersisted,
  requestPersistentStorage,
  downloadBackupFile,
  getCookieConsent,
  saveCookieConsent,
} from '../services/storageService';
import { HardDrive, Cookie, Download } from 'lucide-react';
import './SettingsModal.css';

const THEMES = [
  {
    id: 'dark',
    name: 'Full Code Dark',
    icon: '🌌',
    description: 'Obsidian dark with cyan & purple glow',
    bgPreview: '#0d1117',
    accentPreview: '#00d4ff',
    secondaryPreview: '#b480ff',
  },
  {
    id: 'baby-pink',
    name: 'Baby Pink (Light)',
    icon: '🌸',
    description: 'Cute sakura pastel with rose accents',
    bgPreview: '#fff0f5',
    accentPreview: '#ec4899',
    secondaryPreview: '#f472b6',
    badge: 'Light',
  },
  {
    id: 'baby-pink-dark',
    name: 'Baby Pink (Dark)',
    icon: '🌺',
    description: 'Deep obsidian rose with glowing neon pink',
    bgPreview: '#12070f',
    accentPreview: '#f472b6',
    secondaryPreview: '#e879f9',
    badge: 'Popular',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    icon: '⚡',
    description: 'Deep violet with electric neon cyan',
    bgPreview: '#0a0518',
    accentPreview: '#00f0ff',
    secondaryPreview: '#ff007f',
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    icon: '🎨',
    description: 'Warm charcoal with vivid syntax colors',
    bgPreview: '#272822',
    accentPreview: '#a6e22e',
    secondaryPreview: '#f92672',
  },
  {
    id: 'light',
    name: 'Clean Light',
    icon: '☀️',
    description: 'Crisp modern white & slate styling',
    bgPreview: '#ffffff',
    accentPreview: '#0284c7',
    secondaryPreview: '#7c3aed',
  },
  {
    id: 'nord',
    name: 'Nord Frost',
    icon: '❄️',
    description: 'Arctic blue & ice frost palette',
    bgPreview: '#2e3440',
    accentPreview: '#88c0d0',
    secondaryPreview: '#b48ead',
  },
];

export default function SettingsModal() {
  const {
    state,
    dispatch,
    handleUpdateConfig,
    handleSelectLanguage,
    handleSwitchUser,
    handleLogoutUser,
    showToast,
  } = useApp();

  const { settingsModalOpen, config, detectedLanguage, files, folders, activeUser } = state;
  const [localConfig, setLocalConfig] = useState(config);
  const [langSearch, setLangSearch] = useState('');

  // User Profile Customization
  const [editInitials, setEditInitials] = useState(activeUser?.avatarInitials || '');
  const [editColor, setEditColor] = useState(activeUser?.avatarColor || '#00d4ff');

  // Custom 3-Color Palette State
  const [customBg, setCustomBg] = useState(config?.customPalette?.bg || '#0f172a');
  const [customPrimary, setCustomPrimary] = useState(config?.customPalette?.primary || '#00d4ff');
  const [customSecondary, setCustomSecondary] = useState(config?.customPalette?.secondary || '#8b5cf6');

  // Security Section State
  const [protectedItems, setProtectedItems] = useState(getProtectedItems);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSecPassword, setShowSecPassword] = useState(false);
  const [secError, setSecError] = useState('');

  const supportedLanguages = getSupportedLanguages();

  const filteredLanguages = supportedLanguages.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.monacoLanguage.toLowerCase().includes(langSearch.toLowerCase())
  );

  const [storageInfo, setStorageInfo] = useState({
    usageFormatted: '...',
    quotaFormatted: 'Unlimited',
    isPersisted: false,
  });

  useEffect(() => {
    setLocalConfig(config);
    if (settingsModalOpen) {
      setProtectedItems(getProtectedItems());
      if (activeUser) {
        setEditInitials(activeUser.avatarInitials || '');
        setEditColor(activeUser.avatarColor || '#00d4ff');
      }
      getStorageEstimate().then((est) => {
        isStoragePersisted().then((persisted) => {
          setStorageInfo({
            ...est,
            isPersisted: persisted,
          });
        });
      });
    }
  }, [config, settingsModalOpen, activeUser]);

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

    if (key === 'theme') {
      if (value !== 'custom') {
        clearCustomPaletteOverrides();
      } else if (config.customPalette) {
        applyCustomPalette(config.customPalette);
      }
    }
  };

  // Apply custom 3-color palette
  const handleApplyCustomPalette = () => {
    const palette = {
      bg: customBg,
      primary: customPrimary,
      secondary: customSecondary,
    };
    const updated = {
      ...localConfig,
      theme: 'custom',
      customPalette: palette,
    };
    setLocalConfig(updated);
    handleUpdateConfig(updated);
    applyCustomPalette(palette);
    showToast('Custom 3-color palette applied! 🎨');
  };

  // Update profile avatar
  const handleSaveProfileAvatar = () => {
    if (!activeUser) return;
    const updated = updateUserProfile(activeUser.id, {
      avatarInitials: editInitials.toUpperCase().slice(0, 3),
      avatarColor: editColor,
    });
    if (updated) {
      handleSwitchUser(updated);
      showToast('Profile avatar updated! ✨');
    }
  };

  // Logout action in settings
  const handleSettingsLogout = () => {
    handleLogoutUser();
    dispatch({ type: 'TOGGLE_SETTINGS' });
  };

  const handleRequestPersist = async () => {
    const ok = await requestPersistentStorage();
    if (ok) {
      setStorageInfo((prev) => ({ ...prev, isPersisted: true }));
      showToast('Permanent storage lock enabled in browser! 💾');
    } else {
      showToast('Browser storage persistence requested ✨');
    }
  };

  const handleDownloadBackup = () => {
    downloadBackupFile();
    showToast('Downloaded complete workspace backup! 📦');
  };

  // Handle setting protection on file or folder
  const handleAddProtection = (e) => {
    e.preventDefault();
    if (!selectedTarget) {
      setSecError('Please select a file or folder to protect');
      return;
    }
    if (!newPassword || newPassword.length < 3) {
      setSecError('Password must be at least 3 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecError('Passwords do not match');
      return;
    }

    const isFolder = selectedTarget.startsWith('folder:');
    const targetKey = isFolder ? selectedTarget.replace('folder:', '') : selectedTarget.replace('file:', '');
    const displayName = targetKey;

    protectItem(targetKey, newPassword, isFolder, displayName);
    setProtectedItems(getProtectedItems());
    setNewPassword('');
    setConfirmPassword('');
    setSecError('');
    setSelectedTarget('');
    showToast(`Protected ${displayName} with password 🔒`);
  };

  // Remove protection
  const handleRemoveProtection = (key) => {
    removeProtectionDirect(key);
    setProtectedItems(getProtectedItems());
    showToast(`Removed password protection from ${key} 🔓`);
  };

  // Toggle lock / unlock for session
  const handleToggleSessionLock = (key) => {
    const isUnlocked = isItemUnlocked(key);
    if (isUnlocked) {
      lockItemInSession(key);
      showToast(`Locked ${key} for this session 🔒`);
    } else {
      showToast(`Click the file in explorer to enter password 🔑`);
    }
    setProtectedItems({ ...getProtectedItems() });
  };

  if (!settingsModalOpen) return null;

  return createPortal(
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
            <Sliders size={20} className="settings-icon" />
            <h2>Settings & Account</h2>
          </div>
          <button
            className="btn-icon"
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          >
            <X size={16} />
          </button>
        </div>

        <div className="settings-body">
          {/* ─── 1. USER ACCOUNT & PROFILE SECTION ─── */}
          <div className="settings-section account-section">
            <div className="section-title-wrapper">
              <User size={16} className="section-icon-accent" />
              <h3 className="section-title">User Account & Workspace Profile</h3>
            </div>

            {activeUser ? (
              <div className="account-logged-box">
                <div className="account-info-header">
                  <div
                    className="account-avatar-large"
                    style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
                  >
                    {activeUser.avatarInitials}
                  </div>
                  <div className="account-info-details">
                    <div className="account-username-badge">
                      <strong>{activeUser.username}</strong>
                      <span className="account-role-tag">Active Profile</span>
                    </div>
                    <span className="account-meta">
                      Initials Logo: <strong>{activeUser.avatarInitials}</strong> (First & Last letter) • Private Workspace
                    </span>
                  </div>

                  {/* LOGOUT BUTTON IN SETTINGS */}
                  <button
                    className="btn-settings-logout"
                    onClick={handleSettingsLogout}
                    title="Sign out of this profile"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>

                {/* Avatar Customization */}
                <div className="account-customize-row">
                  <div className="avatar-edit-group">
                    <label className="sec-label">Custom Avatar Initials / Logo</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editInitials}
                      onChange={(e) => setEditInitials(e.target.value)}
                      placeholder="e.g. HU"
                      className="sec-input avatar-input"
                    />
                  </div>

                  <div className="avatar-edit-group">
                    <label className="sec-label">Avatar Badge Color</label>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="avatar-color-picker"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-save-avatar"
                    onClick={handleSaveProfileAvatar}
                  >
                    <Check size={13} />
                    <span>Save Logo</span>
                  </button>
                </div>

                {/* Switch Profiles Section */}
                <div className="account-switch-profiles-section">
                  <div className="switch-profiles-title-row">
                    <div className="switch-title-label">
                      <Users size={14} />
                      <strong>Switch Profile ({Object.values(getAllUsers()).length} accounts)</strong>
                    </div>

                    <button
                      type="button"
                      className="btn-add-profile-mini"
                      onClick={() => {
                        dispatch({ type: 'TOGGLE_SETTINGS' });
                        dispatch({ type: 'SET_AUTH_MODAL', payload: true });
                      }}
                      title="Add or Login to another account"
                    >
                      <UserPlus size={13} />
                      <span>+ Add / Login Profile</span>
                    </button>
                  </div>

                  <div className="switch-profiles-grid">
                    {Object.values(getAllUsers()).map((u) => {
                      const isCurrent = u.id === activeUser?.id;
                      return (
                        <div
                          key={u.id}
                          className={`switch-profile-card ${isCurrent ? 'current-active' : ''}`}
                          onClick={() => {
                            if (!isCurrent) {
                              handleSwitchUser(u);
                              showToast(`Switched profile to ${u.username} (${u.avatarInitials}) 👤`);
                            }
                          }}
                        >
                          <div
                            className="switch-profile-avatar"
                            style={{ background: u.avatarColor || 'var(--accent-cyan)' }}
                          >
                            {u.avatarInitials}
                          </div>
                          <div className="switch-profile-info">
                            <strong>{u.username}</strong>
                            <span className="profile-badge-status">
                              {isCurrent ? '✓ Active Profile' : 'Click to Switch'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="account-guest-box">
                <div className="guest-info">
                  <User size={20} className="guest-icon" />
                  <div>
                    <strong>Guest Workspace (Not Logged In)</strong>
                    <span>Sign in to enable multi-account profiles with isolated data and custom logo initials.</span>
                  </div>
                </div>
                <button
                  className="btn-settings-signin"
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_SETTINGS' });
                    dispatch({ type: 'SET_AUTH_MODAL', payload: true });
                  }}
                >
                  <User size={13} />
                  <span>Login / Sign In</span>
                </button>
              </div>
            )}
          </div>

          {/* ─── 2. THEMES & 3-COLOR PALETTE SECTION ─── */}
          <div className="settings-section">
            <div className="section-title-wrapper">
              <Palette size={16} className="section-icon-accent" />
              <h3 className="section-title">Color Themes & Custom Palette</h3>
            </div>
            <p className="section-desc">
              Choose from built-in themes (including Baby Pink Dark) or create a custom 3-color palette.
            </p>

            {/* Preset Themes Grid */}
            <div className="theme-options-grid">
              {THEMES.map((t) => {
                const isSelected = localConfig.theme === t.id;
                return (
                  <div
                    key={t.id}
                    className={`theme-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleConfigChange('theme', t.id)}
                  >
                    <div className="theme-card-top-row">
                      <div className="theme-icon-badge">
                        <span>{t.icon}</span>
                      </div>
                      <div className="theme-card-title-group">
                        <div className="theme-name-badge-wrap">
                          <strong className="theme-card-name">{t.name}</strong>
                          {t.badge && <span className="theme-badge">{t.badge}</span>}
                        </div>
                        <span className="theme-card-desc">{t.description}</span>
                      </div>

                      {isSelected && (
                        <div className="theme-selected-check">
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <div className="theme-palette-dots-row">
                      <span className="palette-label">Palette:</span>
                      <div className="theme-color-dots">
                        <span
                          className="theme-dot"
                          style={{ background: t.bgPreview }}
                          title={`Background: ${t.bgPreview}`}
                        />
                        <span
                          className="theme-dot"
                          style={{ background: t.accentPreview }}
                          title={`Primary Accent: ${t.accentPreview}`}
                        />
                        <span
                          className="theme-dot"
                          style={{ background: t.secondaryPreview }}
                          title={`Secondary Highlight: ${t.secondaryPreview}`}
                        />
                      </div>
                      <span className="theme-apply-label">
                        {isSelected ? '✓ Active Theme' : 'Click to Apply'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom 3-Color Palette Builder */}
            <div className="custom-palette-builder-box">
              <div className="custom-palette-header">
                <Paintbrush size={15} className="palette-icon" />
                <div>
                  <strong>Custom 3-Color Palette Engine</strong>
                  <span>Pick 3 colors to dynamically theme the entire IDE</span>
                </div>
              </div>

              <div className="custom-palette-inputs">
                <div className="palette-color-group">
                  <label className="sec-label">1. Background Color</label>
                  <div className="color-picker-wrap">
                    <input
                      type="color"
                      value={customBg}
                      onChange={(e) => setCustomBg(e.target.value)}
                      className="palette-color-input"
                    />
                    <input
                      type="text"
                      value={customBg}
                      onChange={(e) => setCustomBg(e.target.value)}
                      className="sec-input color-hex-text"
                    />
                  </div>
                </div>

                <div className="palette-color-group">
                  <label className="sec-label">2. Primary Accent</label>
                  <div className="color-picker-wrap">
                    <input
                      type="color"
                      value={customPrimary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      className="palette-color-input"
                    />
                    <input
                      type="text"
                      value={customPrimary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      className="sec-input color-hex-text"
                    />
                  </div>
                </div>

                <div className="palette-color-group">
                  <label className="sec-label">3. Secondary Highlight</label>
                  <div className="color-picker-wrap">
                    <input
                      type="color"
                      value={customSecondary}
                      onChange={(e) => setCustomSecondary(e.target.value)}
                      className="palette-color-input"
                    />
                    <input
                      type="text"
                      value={customSecondary}
                      onChange={(e) => setCustomSecondary(e.target.value)}
                      className="sec-input color-hex-text"
                    />
                  </div>
                </div>
              </div>

              <div className="custom-palette-actions">
                <button
                  type="button"
                  className="btn-apply-palette"
                  onClick={handleApplyCustomPalette}
                >
                  <Sparkles size={13} />
                  <span>Apply 3-Color Palette</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── 3. FILE & FOLDER SECURITY SECTION ─── */}
          <div className="settings-section security-section">
            <div className="section-title-wrapper">
              <Shield size={16} className="section-icon-accent security-icon" />
              <h3 className="section-title">File & Folder Password Security</h3>
            </div>
            <p className="section-desc">
              Lock sensitive code files or folders with a password to restrict access.
            </p>

            {/* Protection Setup Form */}
            <form onSubmit={handleAddProtection} className="security-protect-form">
              <div className="security-form-row">
                <div className="security-form-group flex-2">
                  <label className="sec-label">Select File or Folder</label>
                  <select
                    className="sec-select"
                    value={selectedTarget}
                    onChange={(e) => {
                      setSelectedTarget(e.target.value);
                      setSecError('');
                    }}
                  >
                    <option value="">-- Choose item to protect --</option>
                    <optgroup label="Folders">
                      {folders.map((f) => (
                        <option key={`f-${f}`} value={`folder:${f}`}>
                          📁 {f}/
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Files">
                      {files.map((file) => (
                        <option key={`file-${file.id}`} value={`file:${file.name}`}>
                          📄 {file.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="security-form-group flex-1">
                  <label className="sec-label">Set Password</label>
                  <div className="sec-input-wrap">
                    <input
                      type={showSecPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className="sec-input"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setSecError('');
                      }}
                    />
                    <button
                      type="button"
                      className="btn-sec-eye"
                      onClick={() => setShowSecPassword(!showSecPassword)}
                    >
                      {showSecPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="security-form-group flex-1">
                  <label className="sec-label">Confirm Password</label>
                  <input
                    type={showSecPassword ? 'text' : 'password'}
                    placeholder="Confirm"
                    className="sec-input"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setSecError('');
                    }}
                  />
                </div>

                <button type="submit" className="btn-set-protection">
                  <Lock size={13} />
                  <span>Protect</span>
                </button>
              </div>

              {secError && (
                <div className="sec-error-badge animate-slide-up">
                  <AlertCircle size={13} />
                  <span>{secError}</span>
                </div>
              )}
            </form>

            {/* Currently Protected Items List */}
            <div className="protected-items-manager">
              <h4 className="manager-title">
                <span>Protected Items in Workspace</span>
                <span className="manager-count">
                  {Object.keys(protectedItems).length} protected
                </span>
              </h4>

              {Object.keys(protectedItems).length === 0 ? (
                <div className="no-protected-items">
                  <KeyRound size={20} />
                  <span>No password protected files or folders. Use the form above to secure any item.</span>
                </div>
              ) : (
                <div className="protected-items-list">
                  {Object.entries(protectedItems).map(([key, item]) => {
                    const unlocked = isItemUnlocked(key);
                    return (
                      <div key={key} className="protected-item-row">
                        <div className="item-info">
                          {item.isFolder ? (
                            <Folder size={14} className="item-icon folder" />
                          ) : (
                            <FileCode size={14} className="item-icon file" />
                          )}
                          <span className="item-key">{key}</span>
                          <span className={`status-pill ${unlocked ? 'unlocked' : 'locked'}`}>
                            {unlocked ? '🔓 Unlocked in Session' : '🔒 Locked'}
                          </span>
                        </div>

                        <div className="item-actions">
                          {unlocked && (
                            <button
                              type="button"
                              className="btn-lock-session"
                              onClick={() => handleToggleSessionLock(key)}
                              title="Re-lock for this session"
                            >
                              <Lock size={11} />
                              <span>Lock Now</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-remove-protection"
                            onClick={() => handleRemoveProtection(key)}
                            title="Remove password protection"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── 4. EDITOR SETTINGS ─── */}
          <div className="settings-section">
            <h3 className="section-title">Editor Preferences</h3>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Font Size</span>
                <span className="setting-desc">Adjust Monaco editor text size</span>
              </div>
              <div className="setting-control font-size-control">
                <button
                  className="btn-font-step"
                  onClick={() => handleConfigChange('fontSize', Math.max(12, localConfig.fontSize - 1))}
                >
                  -
                </button>
                <span className="font-size-val">{localConfig.fontSize}px</span>
                <button
                  className="btn-font-step"
                  onClick={() => handleConfigChange('fontSize', Math.min(24, localConfig.fontSize + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Code Minimap</span>
                <span className="setting-desc">Show miniature code overview scrollbar</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={localConfig.minimap}
                  onChange={(e) => handleConfigChange('minimap', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Word Wrap</span>
                <span className="setting-desc">Wrap long code lines to prevent horizontal scrolling</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={localConfig.wordWrap === 'on'}
                  onChange={(e) => handleConfigChange('wordWrap', e.target.checked ? 'on' : 'off')}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* ─── 5. PERMANENT MEMORY, COOKIES & STORAGE ─── */}
          <div className="settings-section">
            <div className="section-title-wrapper">
              <HardDrive size={16} className="section-icon-accent" />
              <h3 className="section-title">Permanent Memory, Cookies & Storage</h3>
            </div>
            <p className="section-desc">
              All project files, user profiles, version snapshots, and custom themes are preserved in persistent local memory.
            </p>

            <div className="storage-status-card">
              <div className="storage-status-info">
                <div className="storage-status-row">
                  <span className="storage-label">Local Memory Usage:</span>
                  <strong className="storage-val">{storageInfo.usageFormatted}</strong>
                  <span className="storage-quota">/ {storageInfo.quotaFormatted}</span>
                </div>
                <div className="storage-status-row">
                  <span className="storage-label">Browser Persistence:</span>
                  <span className={`storage-badge-persisted ${storageInfo.isPersisted ? 'active' : ''}`}>
                    {storageInfo.isPersisted ? '✓ Guaranteed Active' : 'Standard Local'}
                  </span>
                </div>
              </div>

              <div className="storage-actions-group">
                {!storageInfo.isPersisted && (
                  <button
                    type="button"
                    className="btn-storage-action persist"
                    onClick={handleRequestPersist}
                    title="Lock browser storage against eviction"
                  >
                    <HardDrive size={13} />
                    <span>Lock Permanent Memory</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-storage-action backup"
                  onClick={handleDownloadBackup}
                  title="Download full JSON backup of your workspaces and history"
                >
                  <Download size={13} />
                  <span>Export Backup (.json)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
