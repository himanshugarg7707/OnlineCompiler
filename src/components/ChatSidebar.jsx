import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { toPlainText } from '../services/aiService';
import MarkdownWithCopy from './MarkdownWithCopy';
import { Send, X, Sparkles, Bot, User, History, MessageSquarePlus } from 'lucide-react';
import LuciaChatHistoryPanel from './LuciaChatHistoryPanel';
import './ChatSidebar.css';

const QUICK_ACTIONS = [
  { label: '📖 Explain code', message: 'Explain my code in detail' },
  { label: '🐛 Find bugs', message: 'Find bugs in my code' },
  { label: '💡 Give hint', message: 'Give me a hint for solving this problem' },
  { label: '⚡ Optimize', message: 'How can I optimize this code?' },
  { label: '📊 Complexity', message: 'What is the time complexity of my code?' },
];

export default function ChatSidebar() {
  const { state, dispatch, handleSendMessage } = useApp();
  const { sidebarOpen, chatMessages, chatTyping, chatHistories, activeChatId } = state;
  const [inputValue, setInputValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('fullcode_lucia_sidebar_width'));
      return Number.isFinite(saved) && saved >= 280 ? saved : 380;
    } catch { return 380; }
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (!isResizing) return undefined;
    const handleMove = (event) => {
      if (!resizeStart.current) return;
      const maxWidth = Math.max(320, Math.min(760, window.innerWidth * 0.7));
      const nextWidth = Math.max(280, Math.min(maxWidth, resizeStart.current.width - (event.clientX - resizeStart.current.x)));
      setSidebarWidth(nextWidth);
    };
    const handleUp = () => {
      setIsResizing(false);
      resizeStart.current = null;
      try { localStorage.setItem('fullcode_lucia_sidebar_width', String(sidebarWidth)); } catch {}
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizing, sidebarWidth]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message) return;
    setInputValue('');
    handleSendMessage(message);
  };

  const handleQuickAction = (action) => {
    handleSendMessage(action.message);
  };

  if (!sidebarOpen) return null;

  return (
    <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`} style={{ '--lucia-sidebar-width': `${sidebarWidth}px` }}>
      <div
        className="chat-sidebar-resize-handle"
        role="separator"
        aria-label="Resize Lucia panel"
        aria-orientation="vertical"
        aria-valuemin={280}
        aria-valuemax={Math.max(320, Math.min(760, typeof window === 'undefined' ? 760 : window.innerWidth * 0.7))}
        aria-valuenow={Math.round(sidebarWidth)}
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault();
          resizeStart.current = { x: event.clientX, width: sidebarWidth };
          setIsResizing(true);
        }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          setSidebarWidth((width) => {
            const next = Math.max(280, Math.min(760, width + (event.key === 'ArrowLeft' ? 24 : -24)));
            try { localStorage.setItem('fullcode_lucia_sidebar_width', String(next)); } catch {}
            return next;
          });
        }}
      />
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span className="lucia-sidebar-mark" aria-hidden="true"><Sparkles size={15} /></span>
          <span>{state.config?.aiAssistantName || 'Lucia'}</span>
        </div>
        <div className="sidebar-header-actions">
          <button className="btn-icon" onClick={() => dispatch({ type: 'NEW_LUCIA_CHAT' })} title="Start a new Lucia chat" aria-label="Start a new Lucia chat">
            <MessageSquarePlus size={15} />
          </button>
          <button className={`btn-icon ${historyOpen ? 'active' : ''}`} onClick={() => setHistoryOpen((open) => !open)} title="Chat history" aria-label="Open Lucia chat history">
            <History size={15} />
          </button>
          <button className="btn-icon" onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })} aria-label="Close Lucia chat">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        <LuciaChatHistoryPanel
          chats={chatHistories}
          activeChatId={activeChatId}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => { dispatch({ type: 'NEW_LUCIA_CHAT' }); setHistoryOpen(false); }}
          onOpenChat={(id) => { dispatch({ type: 'OPEN_LUCIA_CHAT', payload: id }); setHistoryOpen(false); }}
          onDeleteChat={(id) => dispatch({ type: 'DELETE_LUCIA_CHAT', payload: id })}
          onRenameChat={(id, title) => dispatch({ type: 'RENAME_LUCIA_CHAT', payload: { id, title } })}
        />
        {chatMessages.length === 0 && (
          <div className="chat-welcome animate-slide-up">
            <div className="welcome-icon">
              <Bot size={32} />
            </div>
            <h3>Hi! I&apos;m {state.config?.aiAssistantName || 'Lucia'} 👋</h3>
            <p>Ask me anything about your code, or try a quick action below:</p>
            <div className="quick-actions">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.role} animate-slide-up`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? (
                <User size={14} />
              ) : (
                <Bot size={14} />
              )}
            </div>
            <div className="message-bubble">
              {msg.role === 'assistant' ? (
                <div className="md-content">
                  <MarkdownWithCopy>
                    {toPlainText(msg.content)}
                  </MarkdownWithCopy>
                </div>
              ) : (
                <p>{toPlainText(msg.content)}</p>
              )}
            </div>
          </div>
        ))}

        {chatTyping && (
          <div className="chat-message assistant animate-fade-in">
            <div className="message-avatar">
              <Bot size={14} />
            </div>
            <div className="message-bubble typing-bubble">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions (show when there are messages) */}
      {chatMessages.length > 0 && (
        <div className="quick-actions-bar">
          {QUICK_ACTIONS.slice(0, 3).map((action) => (
            <button
              key={action.label}
              className="quick-action-chip"
              onClick={() => handleQuickAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about your code..."
          disabled={chatTyping}
        />
        <button
          type="submit"
          className="btn-send"
          disabled={!inputValue.trim() || chatTyping}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
