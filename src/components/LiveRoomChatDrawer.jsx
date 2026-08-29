import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Send,
  X,
  Code,
  Users,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  Sparkles,
  Radio,
  FileCode,
} from 'lucide-react';
import './LiveRoomChatDrawer.css';

export default function LiveRoomChatDrawer() {
  const {
    state,
    dispatch,
    collabRoomId,
    collabPeers,
    handleSendRoomChatMessage,
    handleSendRoomTyping,
    showToast,
  } = useApp();

  const {
    roomChatMessages,
    roomTypingUsers,
    roomChatDrawerOpen,
    unreadRoomChatCount,
    activeUser,
    files,
    activeFileId,
  } = state;

  const [inputMessage, setInputMessage] = useState('');
  const [includeSnippet, setIncludeSnippet] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (roomChatDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomChatMessages, roomChatDrawerOpen, roomTypingUsers]);

  if (!collabRoomId) return null;

  const handleToggleOpen = () => {
    dispatch({ type: 'TOGGLE_ROOM_CHAT_DRAWER' });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);

    // Typing throttle
    handleSendRoomTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      handleSendRoomTyping(false);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const cleanText = inputMessage.trim();
    if (!cleanText && !includeSnippet) return;

    let snippetData = null;
    if (includeSnippet && activeFile) {
      snippetData = {
        fileName: activeFile.name,
        code: activeFile.content.slice(0, 1500),
        language: activeFile.language,
      };
    }

    handleSendRoomChatMessage(cleanText, snippetData);
    setInputMessage('');
    setIncludeSnippet(false);
    handleSendRoomTyping(false);
  };

  const handleCopyCode = (snippet, id) => {
    if (!snippet?.code) return;
    navigator.clipboard.writeText(snippet.code);
    setCopiedSnippetId(id);
    showToast(`Copied snippet for ${snippet.fileName}! 📋`);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  return createPortal(
    <div className="live-chat-portal-wrapper">
      {/* Floating Chat Trigger Bubble (Always visible when in room) */}
      {!roomChatDrawerOpen && (
        <button
          type="button"
          className="live-chat-floating-pill animate-bounce-subtle"
          onClick={handleToggleOpen}
          title="Open Live Room Chat"
        >
          <div className="chat-pill-icon-wrap">
            <MessageSquare size={16} />
            <span className="live-room-ping" />
          </div>
          <span className="chat-pill-text">Room Chat ({collabRoomId})</span>
          {unreadRoomChatCount > 0 && (
            <span className="chat-unread-badge">{unreadRoomChatCount}</span>
          )}
        </button>
      )}

      {/* Slide-Up / Expandable Chat Drawer */}
      {roomChatDrawerOpen && (
        <div className="live-chat-drawer-container animate-slide-up">
          {/* Header */}
          <div className="chat-drawer-header">
            <div className="chat-header-title-group">
              <div className="chat-live-indicator">
                <Radio size={14} />
              </div>
              <div>
                <h4>Live Room Chat</h4>
                <span className="chat-header-subtitle">
                  {collabRoomId} • {collabPeers.length + 1} online
                </span>
              </div>
            </div>

            <div className="chat-header-actions">
              <button
                type="button"
                className="btn-chat-header-icon"
                onClick={handleToggleOpen}
                title="Minimize Chat"
              >
                <Minimize2 size={14} />
              </button>
              <button
                type="button"
                className="btn-chat-header-icon"
                onClick={handleToggleOpen}
                title="Close Chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="chat-messages-stream">
            {roomChatMessages.length === 0 ? (
              <div className="chat-empty-state">
                <MessageSquare size={32} className="chat-empty-icon" />
                <p>Welcome to Room {collabRoomId}!</p>
                <span>Send a message or attach your active code snippet below to chat in real-time.</span>
              </div>
            ) : (
              roomChatMessages.map((msg, index) => {
                const isSelf = msg.senderClientId === state.activeUser?.id || msg.sender?.username === activeUser?.username;
                const senderName = msg.sender?.username || 'Collaborator';
                const senderInitials = msg.sender?.avatarInitials || 'CB';
                const senderColor = msg.sender?.avatarColor || 'var(--accent-cyan)';
                const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id || index}
                    className={`chat-msg-row ${isSelf ? 'msg-self' : 'msg-remote'}`}
                  >
                    {!isSelf && (
                      <div className="chat-msg-avatar" style={{ background: senderColor }}>
                        {senderInitials}
                      </div>
                    )}

                    <div className="chat-msg-bubble">
                      <div className="chat-msg-meta">
                        <strong className="chat-sender-name">{isSelf ? 'You' : senderName}</strong>
                        <span className="chat-msg-time">{timeFormatted}</span>
                      </div>

                      {msg.text && <div className="chat-msg-text">{msg.text}</div>}

                      {/* Code Snippet Attachment */}
                      {msg.codeSnippet && (
                        <div className="chat-snippet-card">
                          <div className="snippet-card-header">
                            <div className="snippet-file-tag">
                              <FileCode size={12} />
                              <span>{msg.codeSnippet.fileName}</span>
                            </div>
                            <button
                              type="button"
                              className="btn-copy-snippet"
                              onClick={() => handleCopyCode(msg.codeSnippet, msg.id || index)}
                              title="Copy snippet"
                            >
                              {copiedSnippetId === (msg.id || index) ? (
                                <Check size={12} color="#22c55e" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>
                                {copiedSnippetId === (msg.id || index) ? 'Copied' : 'Copy'}
                              </span>
                            </button>
                          </div>
                          <pre className="snippet-code-preview">
                            <code>{msg.codeSnippet.code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {roomTypingUsers.length > 0 && (
              <div className="chat-typing-indicator animate-pulse">
                <span className="typing-dots">•••</span>
                <span>
                  {roomTypingUsers.map((u) => u.username || 'Collaborator').join(', ')} is typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Snippet Preview Bar */}
          {includeSnippet && activeFile && (
            <div className="chat-attached-snippet-bar">
              <div className="attached-snippet-info">
                <FileCode size={13} className="snippet-icon" />
                <span>Attaching {activeFile.name}</span>
              </div>
              <button
                type="button"
                className="btn-remove-attached"
                onClick={() => setIncludeSnippet(false)}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Input Footer Form */}
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <button
              type="button"
              className={`btn-attach-code ${includeSnippet ? 'active' : ''}`}
              onClick={() => setIncludeSnippet(!includeSnippet)}
              title={includeSnippet ? 'Detach code snippet' : 'Attach active file code snippet'}
            >
              <Code size={15} />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder={includeSnippet ? 'Add comment (optional)...' : 'Type message to room...'}
              className="chat-text-input"
              autoFocus
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() && !includeSnippet}
              className="btn-send-chat"
              title="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
