// Real-Time Cross-Browser & Cloud Collaboration Relay Service
// Works across Chrome, Safari, Firefox, different computers, localhost, and Vercel

import express from 'express';

const router = express.Router();

// In-memory room store (per-instance + memory cache)
const rooms = new Map();

function getOrCreateRoom(roomId) {
  const cleanId = roomId.trim().toUpperCase();
  if (!rooms.has(cleanId)) {
    rooms.set(cleanId, {
      roomId: cleanId,
      createdAt: Date.now(),
      peers: new Map(), // clientId -> { user, lastSeen }
      messages: [],     // array of room message objects
      snapshot: null,   // latest workspace files & folders
    });
  }
  return rooms.get(cleanId);
}

// Clean up stale peers (inactive > 45 seconds)
function cleanupStalePeers(room) {
  const now = Date.now();
  for (const [cId, peerData] of room.peers.entries()) {
    if (now - peerData.lastSeen > 45000) {
      room.peers.delete(cId);
    }
  }
}

/**
 * Join collaboration room
 * POST /api/collab/join
 */
router.post('/join', (req, res) => {
  try {
    const { roomId, clientId, user } = req.body;
    if (!roomId || !clientId) {
      return res.status(400).json({ error: 'Missing roomId or clientId' });
    }

    const room = getOrCreateRoom(roomId);
    cleanupStalePeers(room);

    // Register this peer
    room.peers.set(clientId, {
      clientId,
      user: user || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
      lastSeen: Date.now(),
    });

    // Record a PEER_JOIN message if not duplicate
    const joinMsg = {
      type: 'PEER_JOIN',
      id: `join-${Date.now()}-${clientId}`,
      roomId: room.roomId,
      senderClientId: clientId,
      user: user || { username: 'Guest', avatarInitials: 'GT', avatarColor: '#00d4ff' },
      timestamp: Date.now(),
    };
    room.messages.push(joinMsg);
    if (room.messages.length > 200) room.messages.shift();

    const activePeersList = Array.from(room.peers.values()).map((p) => ({
      ...p.user,
      clientId: p.clientId,
    }));

    res.json({
      ok: true,
      roomId: room.roomId,
      peers: activePeersList,
      snapshot: room.snapshot,
      messages: room.messages.slice(-30),
    });
  } catch (err) {
    console.error('Error joining collab room:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Publish message / code / file update to room
 * POST /api/collab/publish
 */
router.post('/publish', (req, res) => {
  try {
    const { roomId, message } = req.body;
    if (!roomId || !message) {
      return res.status(400).json({ error: 'Missing roomId or message' });
    }

    const room = getOrCreateRoom(roomId);
    cleanupStalePeers(room);

    const fullMessage = {
      ...message,
      roomId: room.roomId,
      timestamp: message.timestamp || Date.now(),
    };

    // If PUSH_WORKSPACE, update room snapshot
    if (message.type === 'PUSH_WORKSPACE' && Array.isArray(message.files)) {
      room.snapshot = {
        files: message.files,
        folders: message.folders || [],
        sender: message.sender,
        note: message.note || 'Workspace snapshot',
        timestamp: Date.now(),
      };
    }

    room.messages.push(fullMessage);
    if (room.messages.length > 200) room.messages.shift();

    // Update sender's lastSeen if peer exists
    if (message.senderClientId && room.peers.has(message.senderClientId)) {
      const peer = room.peers.get(message.senderClientId);
      peer.lastSeen = Date.now();
    }

    res.json({ ok: true, messageId: fullMessage.id || Date.now() });
  } catch (err) {
    console.error('Error publishing collab message:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Poll for new messages, active peers, and latest snapshot
 * GET /api/collab/poll
 */
router.get('/poll', (req, res) => {
  try {
    const { roomId, clientId, since } = req.query;
    if (!roomId) {
      return res.status(400).json({ error: 'Missing roomId query' });
    }

    const room = getOrCreateRoom(roomId);
    cleanupStalePeers(room);

    // Heartbeat
    if (clientId && room.peers.has(clientId)) {
      const peer = room.peers.get(clientId);
      peer.lastSeen = Date.now();
    }

    const sinceTs = since ? parseInt(since, 10) : 0;
    const newMessages = room.messages.filter(
      (m) => m.timestamp > sinceTs && m.senderClientId !== clientId
    );

    const activePeersList = Array.from(room.peers.values()).map((p) => ({
      ...p.user,
      clientId: p.clientId,
    }));

    res.json({
      ok: true,
      messages: newMessages,
      peers: activePeersList,
      snapshot: room.snapshot,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error('Error polling collab messages:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Leave room
 * POST /api/collab/leave
 */
router.post('/leave', (req, res) => {
  try {
    const { roomId, clientId, user } = req.body;
    if (roomId && clientId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.peers.delete(clientId);
      room.messages.push({
        type: 'PEER_LEAVE',
        roomId,
        senderClientId: clientId,
        user,
        timestamp: Date.now(),
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
