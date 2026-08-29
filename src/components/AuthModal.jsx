import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  loginOrRegister,
  generateFirstLastInitials,
  getAllUsers,
  updateUserProfile,
  logoutUser,
} from '../services/authService';
import {
  X,
  LogIn,
  UserPlus,
  Lock,
  User,
  Sparkles,
  Check,
  Users,
  LogOut,
  Palette,
  Shield,
} from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const { state, handleSwitchUser, handleLogoutUser, showToast } = useApp();
  const { activeUser } = state;

  const existingUsers = useMemo(() => {
    return Object.values(getAllUsers());
  }, [isOpen, activeUser]);

  const [activeTab, setActiveTab] = useState(
    existingUsers.length > 0 ? 'switch' : 'login'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Logo customization state
  const [editInitials, setEditInitials] = useState(activeUser?.avatarInitials || '');
  const [editColor, setEditColor] = useState(activeUser?.avatarColor || '#00d4ff');

  useEffect(() => {
    if (activeUser) {
      setEditInitials(activeUser.avatarInitials || '');
      setEditColor(activeUser.avatarColor || '#00d4ff');
    }
  }, [activeUser, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (activeUser || existingUsers.length > 0) {
        setActiveTab('switch');
      } else {
        setActiveTab('login');
      }
    }
  }, [isOpen]);

  const previewInitials = useMemo(() => {
    return generateFirstLastInitials(username);
  }, [username]);

  if (!isOpen) return null;

  const handleSubmitLogin = (e) => {
    e.preventDefault();
    setError('');

    const res = loginOrRegister(username, password);
    if (!res.success) {
      setError(res.error);
      return;
    }

    handleSwitchUser(res.user);
    showToast(`Welcome, ${res.user.username}! 🎉 (Initials: ${res.user.avatarInitials})`);
    onClose();
    setUsername('');
    setPassword('');
  };

  const handleQuickSwitch = (targetUser) => {
    if (activeUser?.id === targetUser.id) return;
    handleSwitchUser(targetUser);
    showToast(`Switched profile to ${targetUser.username} (${targetUser.avatarInitials}) 👤`);
    onClose();
  };

  const handleSaveLogo = () => {
    if (!activeUser) return;
    const updated = updateUserProfile(activeUser.id, {
      avatarInitials: editInitials.toUpperCase().slice(0, 3),
      avatarColor: editColor,
    });
    if (updated) {
      handleSwitchUser(updated);
      showToast('Avatar logo updated! ✨');
    }
  };

  const handleLogout = () => {
    handleLogoutUser();
    showToast('Signed out to Guest mode 🚪');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="auth-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-title-group">
            <div className="auth-badge-icon">
              <Sparkles size={16} />
            </div>
            <div>
              <h2>Account & Workspace Profile</h2>
              <span className="auth-subtitle">
                Multi-user profiles • Isolated workspaces • Real-time synchronization
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'switch' ? 'active' : ''}`}
            onClick={() => setActiveTab('switch')}
          >
            <Users size={14} />
            <span>Switch Profile ({existingUsers.length})</span>
          </button>

          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            <UserPlus size={14} />
            <span>+ Login / Sign Up</span>
          </button>

          {activeUser && (
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'logo' ? 'active' : ''}`}
              onClick={() => setActiveTab('logo')}
            >
              <Palette size={14} />
              <span>Customize Logo</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="auth-body">
          {/* TAB 1: SWITCH PROFILE */}
          {activeTab === 'switch' && (
            <div className="auth-switch-tab-content">
              {activeUser && (
                <div className="current-user-banner">
                  <div
                    className="current-avatar-circle"
                    style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
                  >
                    {activeUser.avatarInitials}
                  </div>
                  <div className="current-user-details">
                    <div className="current-name-row">
                      <strong>{activeUser.username}</strong>
                      <span className="active-badge">✓ Active Profile</span>
                    </div>
                    <span className="current-user-meta">
                      Initials Logo: <strong>{activeUser.avatarInitials}</strong> (First & Last letter)
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-auth-logout"
                    onClick={handleLogout}
                    title="Sign out of this profile"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}

              <div className="profiles-list-section">
                <span className="section-label">AVAILABLE PROFILES (CLICK TO SWITCH)</span>
                {existingUsers.length === 0 ? (
                  <div className="empty-profiles-notice">
                    <User size={24} className="empty-icon" />
                    <p>No accounts registered yet.</p>
                    <button
                      type="button"
                      className="btn-create-first"
                      onClick={() => setActiveTab('login')}
                    >
                      <UserPlus size={14} />
                      <span>Create Your First Profile</span>
                    </button>
                  </div>
                ) : (
                  <div className="profiles-grid">
                    {existingUsers.map((u) => {
                      const isCurrent = u.id === activeUser?.id;
                      return (
                        <div
                          key={u.id}
                          className={`profile-card ${isCurrent ? 'selected' : ''}`}
                          onClick={() => handleQuickSwitch(u)}
                        >
                          <div
                            className="profile-card-avatar"
                            style={{ background: u.avatarColor || 'var(--accent-cyan)' }}
                          >
                            {u.avatarInitials}
                          </div>
                          <div className="profile-card-info">
                            <strong>{u.username}</strong>
                            <span className="profile-status-text">
                              {isCurrent ? 'Active Workspace' : 'Click to Load Workspace'}
                            </span>
                          </div>
                          {isCurrent && <Check size={14} className="profile-check" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN / REGISTER */}
          {activeTab === 'login' && (
            <div className="auth-login-tab-content">
              {/* Avatar Live Preview */}
              <div className="auth-avatar-preview-box">
                <div className="auth-avatar-preview-badge">
                  <span>{previewInitials}</span>
                </div>
                <div className="auth-avatar-preview-info">
                  <strong>Workspace Profile Logo</strong>
                  <span>
                    Generated automatically from: <em>"{username || 'Your Name'}"</em> (First & Last letter)
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitLogin} className="auth-form">
                <div className="auth-input-group">
                  <label className="auth-label">Username</label>
                  <div className="auth-input-wrap">
                    <User size={15} className="auth-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Himanshu, Alex, Sarah"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      autoFocus
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <Lock size={15} className="auth-icon" />
                    <input
                      type="password"
                      placeholder="Enter account password (min 3 chars)"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className="auth-input"
                    />
                  </div>
                </div>

                {error && <div className="auth-error-msg">{error}</div>}

                <button type="submit" className="btn-auth-submit">
                  <LogIn size={15} />
                  <span>Login / Create Account</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: CUSTOMIZE LOGO */}
          {activeTab === 'logo' && activeUser && (
            <div className="auth-logo-tab-content">
              <div className="logo-preview-center">
                <div
                  className="custom-logo-badge-large"
                  style={{ background: editColor }}
                >
                  <span>{editInitials || activeUser.avatarInitials}</span>
                </div>
                <span className="logo-preview-desc">
                  Workspace Logo for <strong>{activeUser.username}</strong>
                </span>
              </div>

              <div className="logo-form-row">
                <div className="auth-input-group">
                  <label className="auth-label">Avatar Initials (1-3 Letters)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editInitials}
                    onChange={(e) => setEditInitials(e.target.value.toUpperCase())}
                    placeholder="e.g. HU"
                    className="sec-input"
                  />
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Badge Color</label>
                  <div className="color-picker-inline">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="logo-color-input"
                    />
                    <span className="color-hex-val">{editColor}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-auth-submit"
                onClick={handleSaveLogo}
              >
                <Check size={15} />
                <span>Save Avatar Logo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
