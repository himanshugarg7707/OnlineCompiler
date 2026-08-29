import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, KeyRound, Eye, EyeOff, X, ShieldAlert, Check } from 'lucide-react';
import { unlockItemInSession } from '../services/securityService';
import './PasswordPromptModal.css';

export default function PasswordPromptModal({ isOpen, targetItem, onClose, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setIsSuccess(false);
    }
  }, [isOpen, targetItem]);

  if (!isOpen || !targetItem) return null;

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a password');
      return;
    }

    const key = targetItem.key || targetItem.name;
    const success = unlockItemInSession(key, password);

    if (success) {
      setIsSuccess(true);
      setError('');
      setTimeout(() => {
        onUnlocked(targetItem);
        onClose();
      }, 300);
    } else {
      setError('Incorrect password. Access denied.');
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="password-prompt-modal modal-content animate-slide-up">
        <div className="password-prompt-header">
          <div className="prompt-header-icon-wrap">
            <Lock size={20} className="lock-icon" />
          </div>
          <button className="btn-icon" onClick={onClose} title="Cancel">
            <X size={16} />
          </button>
        </div>

        <div className="password-prompt-body">
          <h2 className="prompt-title">Protected {targetItem.isFolder ? 'Folder' : 'File'}</h2>
          <p className="prompt-subtitle">
            <strong>{targetItem.name}</strong> is protected with a password. Enter password to unlock.
          </p>

          <form onSubmit={handleUnlock} className="password-prompt-form">
            <div className="password-input-group">
              <KeyRound size={15} className="key-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
                className="password-text-input"
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <div className="prompt-error-msg animate-shake">
                <ShieldAlert size={13} />
                <span>{error}</span>
              </div>
            )}

            <div className="prompt-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn-unlock ${isSuccess ? 'success' : ''}`}
                disabled={!password}
              >
                {isSuccess ? (
                  <>
                    <Check size={14} />
                    <span>Unlocked!</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Unlock {targetItem.isFolder ? 'Folder' : 'File'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
