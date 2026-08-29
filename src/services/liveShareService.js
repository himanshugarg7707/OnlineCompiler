// Live Real-Time Multi-Browser & Cloud Collaboration Service
// Hybrid Transport: Backend API Relay (cross-browser / Vercel) + BroadcastChannel + LocalStorage (instant 0ms)

let activeChannel = null;
let currentRoomId = null;
let messageListener = null;
let peersListener = null;
let storageListener = null;
let pollTimer = null;
let lastPollTimestamp = 0;
const processedMessageIds = new Set();

// Unique per-tab client ID so tabs and browsers can distinguish each other
export const CLIENT_ID = (() => {
  try {
    let id = sessionStorage.getItem('fullcode_client_id');
    if (!id) {
      id = 'CLIENT-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
      sessionStorage.setItem('fullcode_client_id', id);
    }
    return id;
  } catch {
    return 'CLIENT-' + Math.random().toString(36).substring(2, 9);
  }
})();

export function getClientId() {
  return CLIENT_ID;
}

export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ROOM-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate room ID format (must be 3-12 alphanumeric chars, with optional ROOM- prefix)
 */
export function isValidRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return false;
  const clean = roomId.trim().toUpperCase();
  const roomPattern = /^(ROOM-)?[A-Z0-9]{3,12}$/i;
  return roomPattern.test(clean);
}

/**
 * Normalize room ID so it always has the standard ROOM- prefix
 */
export function normalizeRoomId(roomId) {
  if (!roomId) return '';
  let clean = roomId.trim().toUpperCase();
  if (!clean.startsWith('ROOM-')) {
    clean = `ROOM-${clean}`;
  }
  return clean;
}

/**
 * Get Room ID from URL hash if present (e.g. #room=ROOM-789X)
 */
export function getRoomFromUrl() {
  try {
    const hash = window.location.hash;
    if (hash && hash.includes('room=')) {
      const match = hash.match(/room=([A-Za-z0-9_-]+)/);
      return match ? match[1].toUpperCase() : null;
    }
  } catch {}
  return null;
}

export function getRoomInviteUrl(roomId) {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#room=${roomId}`;
}

/**
 * Save snapshot of room files to local room storage
 */
export function saveRoomSnapshot(roomId, snapshotData) {
  if (!roomId || !snapshotData) return;
  try {
    localStorage.setItem(`fullcode_room_snapshot_${roomId}`, JSON.stringify(snapshotData));
  } catch (err) {
    console.warn('Failed to save room snapshot:', err);
  }
}

/**
 * Get latest recorded snapshot for room
 */
export function getLatestRoomSnapshot(roomId) {
  if (!roomId) return null;
  try {
    const raw = localStorage.getItem(`fullcode_room_snapshot_${roomId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/**
 * Join or create a collaboration room (Connects both to local channel and server relay API)
 */
export function joinCollabRoom(roomId, currentUser, onMessage, onPeersUpdate) {
  if (!roomId) return null;
  const cleanId = normalizeRoomId(roomId);

  // Close previous channel & listener if any
  if (activeChannel) {
    try {
      activeChannel.close();
    } catch {}
  }
  if (storageListener) {
    window.removeEventListener('storage', storageListener);
    storageListener = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  currentRoomId = cleanId;
  messageListener = onMessage;
  peersListener = onPeersUpdate;
  lastPollTimestamp = Date.now() - 5000;

  // 1. Local BroadcastChannel for 0ms local tab sync
  const channelName = `fullcode_collab_room_${cleanId}`;
  try {
    activeChannel = new BroadcastChannel(channelName);
    activeChannel.onmessage = (event) => {
      if (event.data) {
        handleIncomingMessage(event.data, onMessage);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel not supported:', err);
  }

  // 2. Storage event fallback for local tabs
  storageListener = (event) => {
    if (event.key === `fullcode_sync_msg_${cleanId}` && event.newValue) {
      try {
        const payload = JSON.parse(event.newValue);
        handleIncomingMessage(payload, onMessage);
      } catch (e) {
        console.warn('Failed to parse storage event message:', e);
      }
    }
  };
  window.addEventListener('storage', storageListener);

  const joinMsg = {
    type: 'PEER_JOIN',
    id: `join-${Date.now()}-${CLIENT_ID}`,
    roomId: cleanId,
    senderClientId: CLIENT_ID,
    user: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
    timestamp: Date.now(),
  };

  // 3. Local announcement
  sendLocalMessage(joinMsg);

  // 4. Server join & start cross-browser polling
  joinServerRoom(cleanId, currentUser, onMessage, onPeersUpdate);

  return cleanId;
}

async function joinServerRoom(roomId, currentUser, onMessage, onPeersUpdate) {
  try {
    const res = await fetch('/api/collab/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        clientId: CLIENT_ID,
        user: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.peers && typeof onPeersUpdate === 'function') {
        const remotePeers = data.peers.filter((p) => p.clientId !== CLIENT_ID);
        onPeersUpdate(remotePeers);
      }

      // If server has a workspace snapshot, deliver it
      if (data.snapshot && Array.isArray(data.snapshot.files)) {
        saveRoomSnapshot(roomId, data.snapshot);
        if (typeof onMessage === 'function') {
          onMessage({
            type: 'PUSH_WORKSPACE',
            sender: data.snapshot.sender || { username: 'Room Cloud' },
            files: data.snapshot.files,
            folders: data.snapshot.folders || [],
            note: data.snapshot.note || 'Latest cloud room files',
            timestamp: data.snapshot.timestamp || Date.now(),
          });
        }
      }

      // Replay recent chat messages
      if (Array.isArray(data.messages)) {
        data.messages.forEach((msg) => {
          if (msg.type === 'CHAT_MESSAGE' && msg.senderClientId !== CLIENT_ID) {
            handleIncomingMessage(msg, onMessage);
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Collab] Cloud join fallback (running local):', err.message);
  }

  // Start polling every 1.8 seconds for multi-browser and cross-device sync
  startPollLoop(roomId, onMessage, onPeersUpdate);
}

function startPollLoop(roomId, onMessage, onPeersUpdate) {
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    if (!currentRoomId || currentRoomId !== roomId) {
      clearInterval(pollTimer);
      return;
    }

    try {
      const url = `/api/collab/poll?roomId=${encodeURIComponent(roomId)}&clientId=${encodeURIComponent(CLIENT_ID)}&since=${lastPollTimestamp}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      lastPollTimestamp = data.serverTime || Date.now();

      // Update peers list
      if (data.peers && typeof peersListener === 'function') {
        const remotePeers = data.peers.filter((p) => p.clientId !== CLIENT_ID);
        peersListener(remotePeers);
      }

      // Process new messages
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        data.messages.forEach((msg) => {
          handleIncomingMessage(msg, messageListener);
        });
      }

      // If snapshot updated on server, save locally
      if (data.snapshot) {
        saveRoomSnapshot(roomId, data.snapshot);
      }
    } catch {}
  }, 1800);
}

function handleIncomingMessage(msg, callback) {
  if (!msg || typeof callback !== 'function') return;
  // Ignore messages sent by this exact tab
  if (msg.senderClientId === CLIENT_ID) return;

  // Deduplicate
  const msgKey = msg.id || `${msg.type}_${msg.senderClientId}_${msg.timestamp}`;
  if (processedMessageIds.has(msgKey)) return;
  processedMessageIds.add(msgKey);

  // Keep set bounded
  if (processedMessageIds.size > 500) {
    const firstKey = processedMessageIds.values().next().value;
    processedMessageIds.delete(firstKey);
  }

  callback(msg);
}

function sendLocalMessage(payload) {
  try {
    if (activeChannel) {
      activeChannel.postMessage(payload);
    }
  } catch {}

  try {
    const storageKey = `fullcode_sync_msg_${currentRoomId}`;
    localStorage.setItem(storageKey, JSON.stringify({ ...payload, _nonce: Math.random() }));
  } catch {}
}

/**
 * Send a message to the active collaboration room (Broadcasts both locally and to server relay)
 */
export function sendRoomMessage(messageData) {
  if (!currentRoomId) return false;

  const payload = {
    ...messageData,
    id: messageData.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    roomId: currentRoomId,
    senderClientId: CLIENT_ID,
    _sentAt: Date.now(),
    timestamp: messageData.timestamp || Date.now(),
  };

  // Mark our own message as processed so we don't handle it on roundtrip
  processedMessageIds.add(payload.id);

  // 1. Send locally (0ms instant)
  sendLocalMessage(payload);

  // 2. Publish to backend server relay for other browsers / Vercel
  try {
    fetch('/api/collab/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: currentRoomId, message: payload }),
    }).catch(() => {});
  } catch {}

  return true;
}

/**
 * Broadcast workspace changes to everyone in the room
 */
export function broadcastWorkspaceChanges(currentUser, files, folders, note = '') {
  if (!currentRoomId) return false;

  const payload = {
    type: 'PUSH_WORKSPACE',
    id: `ws-${Date.now()}-${CLIENT_ID}`,
    roomId: currentRoomId,
    sender: currentUser || { username: 'Collaborator', avatarInitials: 'CB', avatarColor: '#00d4ff' },
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      content: f.content,
      language: f.language,
    })),
    folders: folders || [],
    note: note || `Updated ${files.length} workspace file(s)`,
    timestamp: Date.now(),
  };

  // Persist snapshot to room storage
  saveRoomSnapshot(currentRoomId, payload);

  return sendRoomMessage(payload);
}

/**
 * Send a chat message to everyone in the room
 */
export function sendRoomChatMessage(currentUser, text, codeSnippet = null) {
  if (!currentRoomId || (!text?.trim() && !codeSnippet)) return false;

  const msgId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return sendRoomMessage({
    type: 'CHAT_MESSAGE',
    id: msgId,
    roomId: currentRoomId,
    sender: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
    text: text ? text.trim() : '',
    codeSnippet: codeSnippet || null,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast typing status to room
 */
export function sendRoomTyping(currentUser, isTyping) {
  if (!currentRoomId) return false;

  return sendRoomMessage({
    type: 'USER_TYPING',
    roomId: currentRoomId,
    sender: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
    isTyping: Boolean(isTyping),
    timestamp: Date.now(),
  });
}

/**
 * Request peers in the room to refresh and push their current state
 */
export function requestRoomRefresh(currentUser) {
  if (!currentRoomId) return false;

  return sendRoomMessage({
    type: 'REQUEST_REFRESH',
    roomId: currentRoomId,
    sender: currentUser || { username: 'Collaborator', avatarInitials: 'CB', avatarColor: '#00d4ff' },
    timestamp: Date.now(),
  });
}

/**
 * Leave the current collaboration room
 */
export function leaveCollabRoom(currentUser) {
  if (!currentRoomId) return;

  sendRoomMessage({
    type: 'PEER_LEAVE',
    roomId: currentRoomId,
    user: currentUser,
    timestamp: Date.now(),
  });

  try {
    fetch('/api/collab/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        clientId: CLIENT_ID,
        user: currentUser,
      }),
    }).catch(() => {});
  } catch {}

  if (activeChannel) {
    try {
      activeChannel.close();
    } catch {}
  }

  if (storageListener) {
    window.removeEventListener('storage', storageListener);
    storageListener = null;
  }

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  activeChannel = null;
  currentRoomId = null;
  messageListener = null;
  peersListener = null;

  // Clear hash
  if (window.location.hash && window.location.hash.includes('room=')) {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
}

export function getCurrentRoomId() {
  return currentRoomId;
}
