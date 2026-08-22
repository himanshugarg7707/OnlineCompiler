import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { X, ChevronRight, Lightbulb } from 'lucide-react';
import './HintPanel.css';

export default function HintPanel() {
  const { state, dispatch, handleGetHint } = useApp();
  const { hintModalOpen, currentHint, hintLevel } = state;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hintModalOpen && !currentHint) {
      fetchHint(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintModalOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && hintModalOpen) {
        dispatch({ type: 'TOGGLE_HINT_MODAL' });
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [hintModalOpen, dispatch]);

  const fetchHint = async (level) => {
    setLoading(true);
    await handleGetHint(level);
    setLoading(false);
  };

  const handleNextHint = () => {
    fetchHint(hintLevel + 1);
  };

  if (!hintModalOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dispatch({ type: 'TOGGLE_HINT_MODAL' });
        }
      }}
    >
      <div className="hint-modal modal-content">
        {/* Header */}
        <div className="hint-header">
          <div className="hint-title">
            <Lightbulb size={18} className="hint-icon" />
            <span>Logic Hints</span>
          </div>
          <button
            className="btn-icon"
            onClick={() => dispatch({ type: 'TOGGLE_HINT_MODAL' })}
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="hint-progress">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={`progress-step ${
                currentHint && level <= currentHint.level ? 'active' : ''
              } ${currentHint && level === currentHint.level ? 'current' : ''}`}
            >
              <span className="step-number">{level}</span>
              <span className="step-label">
                {level === 1 ? 'Gentle Nudge' : level === 2 ? 'Approach' : 'Strategy'}
              </span>
            </div>
          ))}
          <div
            className="progress-line"
            style={{
              width: currentHint
                ? `${((currentHint.level - 1) / 2) * 100}%`
                : '0%',
            }}
          />
        </div>

        {/* Content */}
        <div className="hint-body">
          {loading ? (
            <div className="hint-loading">
              <div className="spinner" />
              <span>Thinking of a hint...</span>
            </div>
          ) : currentHint ? (
            <div className="hint-content animate-slide-up">
              <h3 className="hint-subtitle">{currentHint.title}</h3>
              <div className="md-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentHint.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="hint-footer">
          <span className="hint-note">
            💡 Hints guide you without giving the full solution
          </span>
          {currentHint?.hasNext && (
            <button className="btn-next-hint" onClick={handleNextHint}>
              <span>Next Hint</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
