import { useState, useRef, useEffect, useCallback } from 'react';
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
  Move,
  PictureInPicture2,
  Search,
  Volume2,
  VolumeX,
  Smile,
  Trash2,
  Flame,
  ThumbsUp,
  Heart,
  Lightbulb,
  Rocket,
  PartyPopper,
} from 'lucide-react';
import './LiveRoomChatDrawer.css';

const QUICK_REACTIONS = ['👍', '🔥', '🚀', '❤️', '💡', '🎉'];

// Synthesize pleasant sound chime using Web Audio API
function playChatChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

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

  // Display mode: 'normal' | 'pip' | 'fullscreen'
  const [viewMode, setViewMode] = useState('normal');
  const [inputMessage, setInputMessage] = useState('');
  const [includeSnippet, setIncludeSnippet] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Draggable window state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const drawerRef = useRef(null);
  const prevMsgCountRef = useRef(roomChatMessages.length);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Play chime on incoming remote message
  useEffect(() => {
    if (roomChatMessages.length > prevMsgCountRef.current) {
      const lastMsg = roomChatMessages[roomChatMessages.length - 1];
      const isSelf = lastMsg?.senderClientId === activeUser?.id || lastMsg?.sender?.username === activeUser?.username;
      if (!isSelf && soundEnabled) {
        playChatChime();
      }
    }
    prevMsgCountRef.current = roomChatMessages.length;
  }, [roomChatMessages, soundEnabled, activeUser]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (roomChatDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomChatMessages, roomChatDrawerOpen, roomTypingUsers, viewMode]);

  // Handle Dragging
  const handleMouseDown = useCallback((e) => {
    // Only allow dragging on header, not on buttons or inputs
    if (viewMode === 'fullscreen') return;
    if (e.target.closest('button') || e.target.closest('input')) return;

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position, viewMode]);

  const handleTouchStart = useCallback((e) => {
    if (viewMode === 'fullscreen') return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position, viewMode]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  if (!collabRoomId) return null;

  const handleToggleOpen = () => {
    dispatch({ type: 'TOGGLE_ROOM_CHAT_DRAWER' });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);

    handleSendRoomTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      handleSendRoomTyping(false);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
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
    setShowEmojiPicker(false);
    handleSendRoomTyping(false);
  };

  const handleSendReaction = (emoji) => {
    handleSendRoomChatMessage(emoji, null);
    setShowEmojiPicker(false);
  };

  const handleCopyCode = (snippet, id) => {
    if (!snippet?.code) return;
    navigator.clipboard.writeText(snippet.code);
    setCopiedSnippetId(id);
    if (showToast) showToast(`Copied snippet for ${snippet.fileName}! 📋`);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Filtered messages by search
  const displayMessages = roomChatMessages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      msg.text?.toLowerCase().includes(q) ||
      msg.sender?.username?.toLowerCase().includes(q) ||
      msg.codeSnippet?.fileName?.toLowerCase().includes(q) ||
      msg.codeSnippet?.code?.toLowerCase().includes(q)
    );
  });

  return createPortal(
    <div
      className={`live-chat-portal-wrapper ${viewMode === 'fullscreen' ? 'is-fullscreen-root' : ''}`}
      style={
        viewMode !== 'fullscreen' && (position.x !== 0 || position.y !== 0)
          ? { transform: `translate(${position.x}px, ${position.y}px)` }
          : {}
      }
    >
      {/* Floating Chat Trigger Bubble */}
      {!roomChatDrawerOpen && (
        <button
          type="button"
          className="live-chat-floating-pill animate-bounce-subtle"
          onClick={handleToggleOpen}
          title="Open Live Room Chat (Draggable, PiP, Fullscreen)"
        >
          <div className="chat-pill-icon-wrap">
            <MessageSquare size={16} />
            <span className="live-room-ping" />
          </div>
          <span className="chat-pill-text">Live Chat ({collabRoomId})</span>
          {unreadRoomChatCount > 0 && (
            <span className="chat-unread-badge">{unreadRoomChatCount}</span>
          )}
        </button>
      )}

      {/* Slide-Up / Floating / PiP / Fullscreen Window */}
      {roomChatDrawerOpen && (
        <div
          ref={drawerRef}
          className={`live-chat-drawer-container mode-${viewMode} ${isDragging ? 'is-dragging-window' : ''}`}
        >
          {/* Header & Drag Handle */}
          <div
            className="chat-drawer-header"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            title={viewMode !== 'fullscreen' ? 'Drag header to move chat anywhere' : ''}
          >
            <div className="chat-header-title-group">
              {viewMode !== 'fullscreen' && <Move size={13} className="drag-handle-icon" />}
              <div className="chat-live-indicator">
                <Radio size={13} />
              </div>
              <div className="header-room-info">
                <h4>Room Chat</h4>
                <span className="chat-header-subtitle">
                  {collabRoomId} • {collabPeers.length + 1} online
                </span>
              </div>
            </div>

            <div className="chat-header-actions">
              {/* Sound Toggle */}
              <button
                type="button"
                className={`btn-chat-header-icon ${!soundEnabled ? 'muted' : ''}`}
                onClick={() => setSoundEnabled((prev) => !prev)}
                title={soundEnabled ? 'Mute Chat Chimes' : 'Unmute Chat Chimes'}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>

              {/* Search Toggle */}
              {viewMode !== 'pip' && (
                <button
                  type="button"
                  className={`btn-chat-header-icon ${showSearch ? 'active' : ''}`}
                  onClick={() => setShowSearch((prev) => !prev)}
                  title="Search messages"
                >
                  <Search size={13} />
                </button>
              )}

              {/* Participants Roster Toggle */}
              {viewMode !== 'pip' && (
                <button
                  type="button"
                  className={`btn-chat-header-icon ${showParticipants ? 'active' : ''}`}
                  onClick={() => setShowParticipants((prev) => !prev)}
                  title="Room Participants"
                >
                  <Users size={13} />
                </button>
              )}

              {/* Picture in Picture Mode Toggle */}
              <button
                type="button"
                className={`btn-chat-header-icon ${viewMode === 'pip' ? 'active' : ''}`}
                onClick={() => setViewMode((prev) => (prev === 'pip' ? 'normal' : 'pip'))}
                title={viewMode === 'pip' ? 'Expand from PiP mode' : 'Picture in Picture mini mode'}
              >
                <PictureInPicture2 size={13} />
              </button>

              {/* Fullscreen Mode Toggle */}
              <button
                type="button"
                className={`btn-chat-header-icon ${viewMode === 'fullscreen' ? 'active' : ''}`}
                onClick={() => setViewMode((prev) => (prev === 'fullscreen' ? 'normal' : 'fullscreen'))}
                title={viewMode === 'fullscreen' ? 'Exit Fullscreen' : 'Fullscreen Chat Tab'}
              >
                {viewMode === 'fullscreen' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>

              {/* Minimize / Close */}
              <button
                type="button"
                className="btn-chat-header-icon"
                onClick={handleToggleOpen}
                title="Minimize Chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search Bar Row (When toggled) */}
          {showSearch && viewMode !== 'pip' && (
            <div className="chat-search-bar animate-fade-in">
              <Search size={13} className="search-bar-icon" />
              <input
                type="text"
                placeholder="Search messages or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Main Chat Body (Split in Fullscreen or when Participants Open) */}
          <div className="chat-main-body-split">
            {/* Participants Sidebar */}
            {(showParticipants || viewMode === 'fullscreen') && viewMode !== 'pip' && (
              <aside className="chat-participants-pane animate-fade-in">
                <div className="pane-section-title">
                  <Users size={13} />
                  <span>Room Members ({collabPeers.length + 1})</span>
                </div>
                <div className="participants-list">
                  {/* Current User */}
                  <div className="participant-item is-self">
                    <div className="p-avatar" style={{ background: activeUser?.avatarColor || 'var(--accent-cyan)' }}>
                      {activeUser?.avatarInitials || 'ME'}
                    </div>
                    <div className="p-meta">
                      <span className="p-name">{activeUser?.username || 'You'} (Host)</span>
                      <span className="p-status">Online</span>
                    </div>
                  </div>

                  {/* Remote Peers */}
                  {collabPeers.map((peer, idx) => (
                    <div key={peer.clientId || idx} className="participant-item">
                      <div className="p-avatar" style={{ background: peer.avatarColor || 'var(--accent-purple)' }}>
                        {peer.avatarInitials || 'CB'}
                      </div>
                      <div className="p-meta">
                        <span className="p-name">{peer.username || `Collaborator ${idx + 1}`}</span>
                        <span className="p-status">Peer</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="room-meta-box">
                  <div className="room-meta-label">Invite Room Code:</div>
                  <div className="room-meta-code">{collabRoomId}</div>
                </div>
              </aside>
            )}

            {/* Messages Stream Pane */}
            <div className="chat-messages-stream">
              {displayMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <MessageSquare size={viewMode === 'pip' ? 24 : 32} className="chat-empty-icon" />
                  <p>Welcome to Room {collabRoomId}!</p>
                  <span>Real-time peer chat with draggable window and picture-in-picture mode.</span>
                </div>
              ) : (
                displayMessages.map((msg, index) => {
                  const isSelf = msg.senderClientId === activeUser?.id || msg.sender?.username === activeUser?.username;
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
                      className={`chat-msg-row ${isSelf ? 'msg-self' : 'msg-remote'} ${viewMode === 'pip' ? 'is-pip-row' : ''}`}
                    >
                      {!isSelf && viewMode !== 'pip' && (
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
                                <span>{copiedSnippetId === (msg.id || index) ? 'Copied' : 'Copy'}</span>
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
          </div>

          {/* Quick Reaction Pill Strip */}
          <div className="chat-reactions-strip">
            <div className="reactions-pill-row">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="quick-reaction-btn"
                  onClick={() => handleSendReaction(emoji)}
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Snippet Preview Bar */}
          {includeSnippet && activeFile && (
            <div className="chat-attached-snippet-bar">
              <div className="attached-snippet-info">
                <FileCode size={13} className="snippet-icon" />
                <span>Attaching active file: {activeFile.name}</span>
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
              title={includeSnippet ? 'Detach code snippet' : 'Attach active editor code snippet'}
            >
              <Code size={14} />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder={
                viewMode === 'pip'
                  ? 'Quick reply...'
                  : includeSnippet
                  ? 'Add note to code snippet...'
                  : 'Type message to room (Enter to send)...'
              }
              className="chat-text-input"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() && !includeSnippet}
              className="btn-send-chat"
              title="Send message"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
