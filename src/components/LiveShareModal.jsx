import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import {
  generateRoomId,
  joinCollabRoom,
  leaveCollabRoom,
  broadcastWorkspaceChanges,
  requestRoomRefresh,
  getRoomInviteUrl,
  getCurrentRoomId,
  isValidRoomId,
  normalizeRoomId,
} from '../services/liveShareService';
import {
  X,
  Radio,
  Users,
  Copy,
  Check,
  Send,
  RotateCw,
  LogOut,
  ExternalLink,
  Plus,
  LogIn,
  Sparkles,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import './LiveShareModal.css';

export default function LiveShareModal({ isOpen, onClose }) {
  const {
    state,
    collabRoomId,
    collabPeers,
    handleJoinCollabRoom,
    handleLeaveCollabRoom,
    handlePullRoomChanges,
    showToast,
  } = useApp();

  const { files, folders, activeUser } = state;

  const [inputRoomCode, setInputRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [broadcastNote, setBroadcastNote] = useState('');

  const activeRoom = collabRoomId;

  if (!isOpen) return null;

  const handleCreateNewRoom = () => {
    const newCode = generateRoomId();
    setJoinError('');
    handleJoinCollabRoom(newCode);
    showToast(`Created Live Collab Room ${newCode}! 🚀`);
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    const raw = inputRoomCode.trim().toUpperCase();
    if (!raw) {
      setJoinError('Please enter a room code (e.g. ROOM-789X)');
      showToast('Please enter a room code ❌');
      return;
    }

    if (!isValidRoomId(raw)) {
      setJoinError(`Invalid Room ID "${raw}". Room codes must be formatted like ROOM-XXXX (3-8 alphanumeric characters).`);
      showToast(`Invalid Room ID (${raw}) ❌`);
      return;
    }

    const clean = normalizeRoomId(raw);
    setJoinError('');
    handleJoinCollabRoom(clean);
    showToast(`Joined Live Room ${clean}! 👥`);
    setInputRoomCode('');
  };

  const handleCopyCode = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom);
    setCopiedCode(true);
    showToast(`Copied Room Code ${activeRoom} 📋`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!activeRoom) return;
    const url = getRoomInviteUrl(activeRoom);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Copied Live Invite Link to clipboard! 🔗');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBroadcast = () => {
    if (!activeRoom) return;
    const ok = broadcastWorkspaceChanges(activeUser, files, folders, broadcastNote.trim());
    if (ok) {
      showToast('Broadcasted workspace changes to room members! 📡');
      setBroadcastNote('');
    } else {
      showToast('Failed to broadcast changes');
    }
  };

  const handleRequestRefresh = () => {
    if (!activeRoom) return;
    requestRoomRefresh(activeUser);
    showToast('Requested latest workspace refresh from room members! 🔄');
  };

  const handleLeave = () => {
    handleLeaveCollabRoom();
    showToast('Left live collaboration room 👋');
  };

  return createPortal(
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="live-share-modal modal-content animate-slide-up">
        {/* Header */}
        <div className="live-share-header">
          <div className="live-share-title-group">
            <div className={`live-pulse-icon ${activeRoom ? 'active' : ''}`}>
              <Radio size={16} />
            </div>
            <div>
              <h2>Live Room Collaboration</h2>
              <span className="live-share-subtitle">
                {activeRoom
                  ? `Connected to Room: ${activeRoom}`
                  : 'Real-time multi-peer workspace synchronization'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="live-share-body">
          {!activeRoom ? (
            /* Not in a room: Show Create / Join */
            <div className="live-entry-section">
              <div className="live-create-card">
                <div className="card-desc">
                  <strong>Create a New Collaboration Room</strong>
                  <span>Start a live session and invite teammates with a room code or link.</span>
                </div>
                <button
                  type="button"
                  className="btn-create-room"
                  onClick={handleCreateNewRoom}
                >
                  <Plus size={15} />
                  <span>Create Room</span>
                </button>
              </div>

              <div className="live-divider">
                <span>OR JOIN EXISTING ROOM</span>
              </div>

              <form onSubmit={handleJoinByCode} className="live-join-form">
                <div className="live-input-row">
                  <input
                    type="text"
                    placeholder="Enter Room Code (e.g. ROOM-789X)"
                    value={inputRoomCode}
                    onChange={(e) => {
                      setInputRoomCode(e.target.value.toUpperCase());
                      setJoinError('');
                    }}
                    className={`live-code-input ${joinError ? 'input-error' : ''}`}
                  />
                  <button type="submit" className="btn-join-room">
                    <LogIn size={15} />
                    <span>Join Room</span>
                  </button>
                </div>

                {joinError && (
                  <div className="live-error-box animate-slide-down">
                    <AlertCircle size={14} className="live-error-icon" />
                    <span>{joinError}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* Active Connected Room */
            <div className="live-active-room-section">
              {/* Room Code & Invite Link */}
              <div className="room-code-banner">
                <div className="room-code-display">
                  <span className="room-label">ROOM CODE:</span>
                  <strong className="room-code-val">{activeRoom}</strong>
                  <button
                    className="btn-copy-mini"
                    onClick={handleCopyCode}
                    title="Copy Room Code"
                  >
                    {copiedCode ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                  </button>
                </div>

                <button className="btn-copy-invite-link" onClick={handleCopyInviteLink}>
                  {copiedLink ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
                </button>
              </div>

              {/* Connected Peers */}
              <div className="room-peers-box">
                <div className="peers-header">
                  <Users size={13} />
                  <span>Live Peers in Room ({collabPeers.length + 1})</span>
                </div>

                <div className="peers-list">
                  {/* Self */}
                  <div className="peer-item self">
                    <div
                      className="peer-avatar"
                      style={{ background: activeUser?.avatarColor || 'var(--accent-cyan)' }}
                    >
                      {activeUser?.avatarInitials || 'YOU'}
                    </div>
                    <div className="peer-info">
                      <strong>{activeUser?.username || 'You (Active User)'}</strong>
                      <span className="peer-tag">Host / You</span>
                    </div>
                  </div>

                  {/* Remote Peers */}
                  {collabPeers.map((peer, idx) => (
                    <div key={idx} className="peer-item">
                      <div
                        className="peer-avatar"
                        style={{ background: peer.avatarColor || 'var(--accent-purple)' }}
                      >
                        {peer.avatarInitials || 'CB'}
                      </div>
                      <div className="peer-info">
                        <strong>{peer.username || 'Collaborator'}</strong>
                        <span className="peer-tag live">Connected 🟢</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Broadcast Changes */}
              <div className="room-broadcast-box">
                <div className="broadcast-header">
                  <Send size={13} />
                  <strong>Broadcast Workspace Changes</strong>
                </div>
                <p className="broadcast-desc">
                  Push your active code, files, and folders to room members. They will receive a notification to accept the updates.
                </p>

                <div className="broadcast-action-row">
                  <input
                    type="text"
                    placeholder="Optional note (e.g. Added login function)"
                    value={broadcastNote}
                    onChange={(e) => setBroadcastNote(e.target.value)}
                    className="broadcast-note-input"
                  />
                  <button className="btn-broadcast-now" onClick={handleBroadcast}>
                    <Send size={13} />
                    <span>Broadcast</span>
                  </button>
                </div>
              </div>

              {/* Footer Controls */}
              <div className="live-active-footer">
                <button
                  type="button"
                  className="btn-open-chat-modal"
                  onClick={() => {
                    dispatch({ type: 'SET_ROOM_CHAT_DRAWER', payload: true });
                    onClose();
                  }}
                  title="Open Live Chat Drawer"
                >
                  <MessageSquare size={13} />
                  <span>Open Room Chat</span>
                </button>

                <button
                  type="button"
                  className="btn-refresh-room"
                  onClick={() => {
                    handlePullRoomChanges();
                    onClose();
                  }}
                  title="Pull latest changes from room snapshot and peers"
                >
                  <RotateCw size={13} />
                  <span>Pull Latest Changes</span>
                </button>

                <button
                  type="button"
                  className="btn-leave-room"
                  onClick={handleLeave}
                >
                  <LogOut size={13} />
                  <span>Leave Room</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
