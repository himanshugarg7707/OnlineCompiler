import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  loginOrRegister,
  generateFirstLastInitials,
  getActiveUser,
  logoutUser,
} from '../services/authService';
import {
  X,
  Sparkles,
  Zap,
  Terminal,
  Database,
  Users,
  BrainCircuit,
  Lock,
  Share2,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Check,
  Code2,
} from 'lucide-react';
import './WelcomeLandingModal.css';

export default function WelcomeLandingModal({ isOpen, onClose }) {
  const { state, dispatch, handleSwitchUser, handleLogoutUser, showToast } = useApp();
  const { activeUser } = state;

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const previewInitials = useMemo(() => {
    return generateFirstLastInitials(username);
  }, [username]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { label: 'None', score: 0, color: 'transparent' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: 'Weak', score: 1, color: '#ef4444' };
    if (score <= 4) return { label: 'Medium', score: 2, color: '#f59e0b' };
    return { label: 'Strong', score: 3, color: '#10b981' };
  }, [password]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    const cleanPwd = password.trim();

    if (!cleanUser) {
      setError('Please choose a username.');
      return;
    }
    if (cleanPwd.length < 3) {
      setError('Password must be at least 3 characters.');
      return;
    }
    if (mode === 'signup' && confirmPassword.trim() && cleanPwd !== confirmPassword.trim()) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    const res = loginOrRegister(cleanUser, cleanPwd);
    if (!res.success) {
      setError(res.error || 'Authentication failed');
      return;
    }

    try {
      localStorage.setItem('fullcode_visited_landing_v1', 'true');
    } catch {}

    handleSwitchUser(res.user);
    showToast(`Welcome aboard, ${res.user.username}! Let's pick your subject notebook 📚`);
    onClose();
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'notebook-setup' });
  };

  const handleSkipToEditor = () => {
    try {
      localStorage.setItem('fullcode_visited_landing_v1', 'true');
    } catch {}
    onClose();
  };

  const handleLogout = () => {
    handleLogoutUser();
    showToast('Logged out of account');
  };

  const featuresComparison = [
    {
      icon: <Zap size={18} className="feat-icon zap" />,
      title: 'Zero Setup vs 10GB Local Installs',
      desc: 'No downloading gigabytes of SDKs, C++ compilers, Python packages, or JDKs. Open browser and start executing instantly.',
    },
    {
      icon: <Database size={18} className="feat-icon db" />,
      title: 'In-Browser SQLite & SQL Engine',
      desc: 'Execute real DDL and DML queries, inspect database schemas, create tables, and export datasets with zero server configuration.',
    },
    {
      icon: <Users size={18} className="feat-icon collab" />,
      title: 'Live Cross-Browser Peer Collaboration',
      desc: 'Share a live room ID, co-code in real time with shared cursors, voice-over, and instant room chat across any browser.',
    },
    {
      icon: <BrainCircuit size={18} className="feat-icon ai" />,
      title: 'Deep AI Code Walkthrough & Dry Run',
      desc: 'Unlike generic auto-completers, our built-in tutor explains execution line by line, builds dry run trace tables, and flags gotchas.',
    },
    {
      icon: <Lock size={18} className="feat-icon lock" />,
      title: 'Password-Protected Files & Folders',
      desc: 'Encrypt and pin passwords to sensitive code files or assignments right inside your workspace so only authorized users can unlock them.',
    },
    {
      icon: <Share2 size={18} className="feat-icon share" />,
      title: 'Instant URL Session Sharing',
      desc: 'Compress and share full multi-file workspaces in a single link. Collaborators load your entire setup with a single click.',
    },
  ];

  return createPortal(
    <div className="modal-backdrop landing-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="landing-modal animate-slide-up">
        {/* Dismiss / Close Pill */}
        <button className="landing-close-btn" onClick={onClose} title="Skip to editor (Esc)">
          <X size={18} />
        </button>

        {/* Left Hero & Feature Showcase Column */}
        <div className="landing-left-column">
          <div className="landing-brand-badge">
            <Sparkles size={13} />
            <span>Next-Generation Cloud & Browser IDE</span>
          </div>

          <h1 className="landing-headline">
            Everything VS Code has. <br />
            <span className="landing-gradient-text">Plus everything it doesn't.</span>
          </h1>

          <p className="landing-subtext">
            Full Code combines instantaneous 17+ language compilation, an in-browser relational database engine, real-time collaboration, and intelligent AI code walkthroughs into one seamless browser IDE.
          </p>

          {/* Feature Highlights Grid */}
          <div className="landing-features-grid">
            {featuresComparison.map((feat, idx) => (
              <div key={idx} className="landing-feature-card">
                <div className="landing-feature-header">
                  <div className="feat-icon-wrap">{feat.icon}</div>
                  <h4>{feat.title}</h4>
                </div>
                <p>{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick Advantage Badges */}
          <div className="landing-advantages-bar">
            <span className="adv-pill"><Check size={12} /> 17+ Languages</span>
            <span className="adv-pill"><Check size={12} /> Live Multi-Cursor</span>
            <span className="adv-pill"><Check size={12} /> SQLite & MySQL DDL</span>
            <span className="adv-pill"><Check size={12} /> File Pin Locks</span>
            <span className="adv-pill"><Check size={12} /> 100% Free & Fast</span>
          </div>
        </div>

        {/* Right Auth / Sign Up Form Column */}
        <div className="landing-right-column">
          <div className="landing-auth-card">
            {activeUser ? (
              /* If already logged in, show current profile & status */
              <div className="landing-profile-view">
                <div
                  className="landing-user-avatar"
                  style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
                >
                  <span>{activeUser.avatarInitials || 'FC'}</span>
                </div>

                <div className="landing-profile-header">
                  <h3>Welcome back, {activeUser.username}!</h3>
                  <span className="landing-profile-sub">
                    You are logged in with isolated personal workspace storage.
                  </span>
                </div>

                <div className="landing-profile-stats">
                  <div className="stat-box">
                    <span className="stat-label">Initials</span>
                    <strong>{activeUser.avatarInitials}</strong>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Status</span>
                    <strong style={{ color: 'var(--accent-green)' }}>Active</strong>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Member Since</span>
                    <span>{new Date(activeUser.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                <button className="btn-enter-editor-primary" onClick={onClose}>
                  <span>Continue to Code Editor</span>
                  <ArrowRight size={15} />
                </button>

                <button className="btn-landing-logout" onClick={handleLogout}>
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              /* Sign Up & Login Tabs */
              <>
                <div className="landing-card-top">
                  <div className="landing-auth-logo">
                    <Code2 size={22} className="logo-svg" />
                    <span>Full Code</span>
                  </div>
                  <h3>{mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}</h3>
                  <p>
                    {mode === 'signup'
                      ? 'Save custom workspaces, protect files, and sync projects.'
                      : 'Sign in to access your saved files and isolated workspaces.'}
                  </p>
                </div>

                {/* Tab switcher */}
                <div className="landing-tab-switcher">
                  <button
                    className={`landing-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                  >
                    Register / Sign Up
                  </button>
                  <button
                    className={`landing-tab-btn ${mode === 'signin' ? 'active' : ''}`}
                    onClick={() => {
                      setMode('signin');
                      setError('');
                    }}
                  >
                    Sign In
                  </button>
                </div>

                {error && <div className="landing-error-banner">{error}</div>}

                <form className="landing-form" onSubmit={handleSubmit}>
                  {/* Username Field */}
                  <div className="landing-input-field">
                    <label>Username</label>
                    <div className="landing-input-wrap">
                      <User size={15} className="input-icon" />
                      <input
                        type="text"
                        placeholder="Choose username (e.g. dev_coder)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                      />
                      {username.trim() && (
                        <div className="username-initials-preview" title="Auto-generated Avatar Logo">
                          {previewInitials}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="landing-input-field">
                    <label>Password</label>
                    <div className="landing-input-wrap">
                      <Lock size={15} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Password Strength Meter (Only on Signup) */}
                    {mode === 'signup' && password && (
                      <div className="password-strength-bar">
                        <div className="strength-indicators">
                          <div className={`bar ${passwordStrength.score >= 1 ? 'filled' : ''}`} style={{ background: passwordStrength.score >= 1 ? passwordStrength.color : '' }} />
                          <div className={`bar ${passwordStrength.score >= 2 ? 'filled' : ''}`} style={{ background: passwordStrength.score >= 2 ? passwordStrength.color : '' }} />
                          <div className={`bar ${passwordStrength.score >= 3 ? 'filled' : ''}`} style={{ background: passwordStrength.score >= 3 ? passwordStrength.color : '' }} />
                        </div>
                        <span className="strength-label" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password (On Signup) */}
                  {mode === 'signup' && (
                    <div className="landing-input-field">
                      <label>Confirm Password</label>
                      <div className="landing-input-wrap">
                        <ShieldCheck size={15} className="input-icon" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="landing-form-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember this device</span>
                    </label>
                  </div>

                  {/* Primary Submit Button */}
                  <button type="submit" className="btn-landing-submit">
                    <span>{mode === 'signup' ? 'Create Account & Start Coding' : 'Sign In'}</span>
                    <ArrowRight size={15} />
                  </button>

                  <div className="landing-divider">
                    <span>or</span>
                  </div>

                  {/* Continue as Guest Button */}
                  <button
                    type="button"
                    className="btn-landing-guest"
                    onClick={handleSkipToEditor}
                  >
                    <span>Continue as Guest / Enter Editor</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
