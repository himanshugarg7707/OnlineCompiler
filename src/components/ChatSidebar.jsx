import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { Send, X, Sparkles, Bot, User } from 'lucide-react';
import './ChatSidebar.css';

const QUICK_ACTIONS = [
  { label: '📖 Explain code', message: 'Explain my code in detail' },
  { label: '🐛 Find bugs', message: 'Find bugs in my code' },
  { label: '💡 Give hint', message: 'Give me a hint for solving this problem' },
  { label: '⚡ Optimize', message: 'How can I optimize this code?' },
  { label: '📊 Complexity', message: 'What is the time complexity of my code?' },
];

export default function ChatSidebar() {
  const { state, dispatch, handleSendChat } = useApp();
  const { sidebarOpen, chatMessages, chatTyping } = state;
  const [inputValue, setInputValue] = useState('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message) return;
    setInputValue('');
    handleSendChat(message);
  };

  const handleQuickAction = (action) => {
    handleSendChat(action.message);
  };

  if (!sidebarOpen) return null;

  return (
    <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Sparkles size={16} className="sidebar-icon" />
          <span>AI Assistant</span>
        </div>
        <button
          className="btn-icon"
          onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div className="chat-welcome animate-slide-up">
            <div className="welcome-icon">
              <Bot size={32} />
            </div>
            <h3>Hi! I&apos;m your AI coding assistant 👋</h3>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
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
