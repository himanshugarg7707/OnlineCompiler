// Live Real-Time Multi-Browser & Global Cloud Collaboration Service
// Powered by Global WebSockets PubSub (HiveMQ / EMQX TLS) + BroadcastChannel (Local 0ms) + LocalStorage Snapshot

import mqtt from 'mqtt';

let activeChannel = null;
let currentRoomId = null;
let messageListener = null;
let peersListener = null;
let storageListener = null;
let mqttClient = null;
let heartbeatTimer = null;
let pruneTimer = null;

const livePeersMap = new Map(); // clientId -> { user, clientId, lastSeen }
const processedMessageIds = new Set();

// Reliable Public High-Speed WebSocket MQTT Brokers
const BROKER_URLS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

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

export function isValidRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return false;
  const clean = roomId.trim().toUpperCase();
  const roomPattern = /^(ROOM-)?[A-Z0-9]{3,12}$/i;
  return roomPattern.test(clean);
}

export function normalizeRoomId(roomId) {
  if (!roomId) return '';
  let clean = roomId.trim().toUpperCase();
  if (!clean.startsWith('ROOM-')) {
    clean = `ROOM-${clean}`;
  }
  return clean;
}

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

export function saveRoomSnapshot(roomId, snapshotData) {
  if (!roomId || !snapshotData) return;
  try {
    localStorage.setItem(`fullcode_room_snapshot_${roomId}`, JSON.stringify(snapshotData));
  } catch (err) {
    console.warn('Failed to save room snapshot:', err);
  }
}

export function getLatestRoomSnapshot(roomId) {
  if (!roomId) return null;
  try {
    const raw = localStorage.getItem(`fullcode_room_snapshot_${roomId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getRoomTopic(roomId) {
  return `fullcode/collab/v2/${roomId.replace(/[^A-Za-z0-9_-]/g, '')}`;
}

function notifyPeersUpdate() {
  if (typeof peersListener === 'function') {
    const activePeers = Array.from(livePeersMap.values()).map((p) => ({
      ...p.user,
      clientId: p.clientId,
    }));
    peersListener(activePeers);
  }
}

function handleIncomingMessage(msg, callback) {
  if (!msg || typeof callback !== 'function') return;

  // Ignore messages sent by this exact client instance
  if (msg.senderClientId === CLIENT_ID) return;

  // Deduplicate
  const msgKey = msg.id || `${msg.type}_${msg.senderClientId}_${msg.timestamp}`;
  if (processedMessageIds.has(msgKey)) return;
  processedMessageIds.add(msgKey);

  if (processedMessageIds.size > 500) {
    const firstKey = processedMessageIds.values().next().value;
    processedMessageIds.delete(firstKey);
  }

  // Update peer tracking if sender information is present
  if (msg.senderClientId) {
    const user = msg.user || msg.sender;
    if (user) {
      livePeersMap.set(msg.senderClientId, {
        clientId: msg.senderClientId,
        user,
        lastSeen: Date.now(),
      });
      notifyPeersUpdate();
    }
  }

  if (msg.type === 'PEER_LEAVE' && msg.senderClientId) {
    livePeersMap.delete(msg.senderClientId);
    notifyPeersUpdate();
  }

  if (msg.type === 'PEER_HEARTBEAT') {
    // Already updated livePeersMap above, do not bubble up as chat/workspace event
    return;
  }

  if (msg.type === 'PUSH_WORKSPACE' && Array.isArray(msg.files) && currentRoomId) {
    saveRoomSnapshot(currentRoomId, msg);
  }

  callback(msg);
}

/**
 * Join or create a global collaboration room
 */
export function joinCollabRoom(roomId, currentUser, onMessage, onPeersUpdate) {
  if (!roomId) return null;
  const cleanId = normalizeRoomId(roomId);

  // Clean up previous room connection
  cleanupCurrentRoom();

  currentRoomId = cleanId;
  messageListener = onMessage;
  peersListener = onPeersUpdate;
  livePeersMap.clear();

  // 1. Local BroadcastChannel for instant same-browser tabs (0ms)
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

  // 2. Storage event listener
  storageListener = (event) => {
    if (event.key === `fullcode_sync_msg_${cleanId}` && event.newValue) {
      try {
        const payload = JSON.parse(event.newValue);
        handleIncomingMessage(payload, onMessage);
      } catch {}
    }
  };
  window.addEventListener('storage', storageListener);

  // 3. Connect to Global Real-Time WebSocket PubSub (HiveMQ / EMQX)
  connectGlobalMqtt(cleanId, currentUser, onMessage);

  // 4. Start Peer Heartbeat & Stale Pruning Timers
  startHeartbeat(cleanId, currentUser);

  // Announce local join
  const joinMsg = {
    type: 'PEER_JOIN',
    id: `join-${Date.now()}-${CLIENT_ID}`,
    roomId: cleanId,
    senderClientId: CLIENT_ID,
    user: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
    timestamp: Date.now(),
  };
  sendLocalMessage(joinMsg);

  return cleanId;
}

function connectGlobalMqtt(roomId, currentUser, onMessage) {
  const topic = getRoomTopic(roomId);
  const brokerUrl = BROKER_URLS[0];

  try {
    const client = mqtt.connect(brokerUrl, {
      clientId: `fullcode_${CLIENT_ID.replace(/[^A-Za-z0-9]/g, '')}_${Math.random().toString(36).slice(2, 6)}`,
      clean: true,
      connectTimeout: 7000,
      reconnectPeriod: 3000,
      keepalive: 30,
    });

    mqttClient = client;

    client.on('connect', () => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (!err) {
          // Announce global join to everyone worldwide in this room
          const joinMsg = {
            type: 'PEER_JOIN',
            id: `join-${Date.now()}-${CLIENT_ID}`,
            roomId,
            senderClientId: CLIENT_ID,
            user: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
            timestamp: Date.now(),
          };
          sendMqttMessage(joinMsg);
        }
      });
    });

    client.on('message', (receivedTopic, payloadBuffer) => {
      if (receivedTopic === topic) {
        try {
          const payload = JSON.parse(payloadBuffer.toString());
          handleIncomingMessage(payload, onMessage);
        } catch (e) {
          console.warn('Failed to parse incoming MQTT payload:', e);
        }
      }
    });

    client.on('error', (err) => {
      console.warn('[Collab] Global MQTT connection error, retrying with fallback broker...', err.message);
      // Attempt fallback broker
      if (BROKER_URLS[1] && brokerUrl !== BROKER_URLS[1]) {
        try {
          client.end(true);
          mqttClient = mqtt.connect(BROKER_URLS[1], {
            clientId: `fullcode_${CLIENT_ID.replace(/[^A-Za-z0-9]/g, '')}`,
            clean: true,
          });
        } catch {}
      }
    });
  } catch (err) {
    console.warn('[Collab] Failed to initiate MQTT client:', err);
  }
}

function startHeartbeat(roomId, currentUser) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (pruneTimer) clearInterval(pruneTimer);

  // Send heartbeat every 6 seconds
  heartbeatTimer = setInterval(() => {
    if (!currentRoomId || currentRoomId !== roomId) return;
    const hb = {
      type: 'PEER_HEARTBEAT',
      id: `hb-${Date.now()}-${CLIENT_ID}`,
      roomId,
      senderClientId: CLIENT_ID,
      user: currentUser || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
      timestamp: Date.now(),
    };
    sendRoomMessage(hb);
  }, 6000);

  // Prune peers inactive for > 16 seconds
  pruneTimer = setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [cId, peer] of livePeersMap.entries()) {
      if (now - peer.lastSeen > 16000) {
        livePeersMap.delete(cId);
        changed = true;
      }
    }
    if (changed) {
      notifyPeersUpdate();
    }
  }, 4000);
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

function sendMqttMessage(payload) {
  if (mqttClient && mqttClient.connected && currentRoomId) {
    try {
      const topic = getRoomTopic(currentRoomId);
      mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
    } catch {}
  }
}

/**
 * Send a message to the active collaboration room (Broadcasts to Global Cloud WebSocket + Local Channel)
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

  processedMessageIds.add(payload.id);

  // 1. Send locally (0ms)
  sendLocalMessage(payload);

  // 2. Broadcast worldwide over Global WebSocket PubSub
  sendMqttMessage(payload);

  return true;
}

/**
 * Broadcast workspace changes to everyone worldwide in the room
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

  saveRoomSnapshot(currentRoomId, payload);
  return sendRoomMessage(payload);
}

/**
 * Send a chat message to everyone worldwide in the room
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

function cleanupCurrentRoom() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
  if (mqttClient) {
    try {
      mqttClient.end(true);
    } catch {}
    mqttClient = null;
  }
  if (activeChannel) {
    try {
      activeChannel.close();
    } catch {}
    activeChannel = null;
  }
  if (storageListener) {
    window.removeEventListener('storage', storageListener);
    storageListener = null;
  }
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

  cleanupCurrentRoom();

  currentRoomId = null;
  messageListener = null;
  peersListener = null;
  livePeersMap.clear();

  if (window.location.hash && window.location.hash.includes('room=')) {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
}

export function getCurrentRoomId() {
  return currentRoomId;
}
