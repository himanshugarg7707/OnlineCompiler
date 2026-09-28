import express from 'express';
import { chatgptBridge } from '../chatgptClassicBridge.js';

const router = express.Router();

/**
 * POST /api/chatgpt/sync
 * Synchronizes the current file, selection, and error/terminal logs
 * into the ChatGPT Classic socket bridge.
 */
router.post('/sync', (req, res) => {
  try {
    chatgptBridge.updateContext(req.body);
    res.json({
      status: 'ok',
      syncedAt: Date.now(),
      activeFile: chatgptBridge.currentContext.activeFileName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/chatgpt/pending-edits
 * Returns and clears any direct code replacements or snippet edits
 * performed by ChatGPT Classic via setContent / replaceSelection.
 */
router.get('/pending-edits', (req, res) => {
  try {
    const edits = chatgptBridge.pullPendingEdits();
    res.json({ edits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/chatgpt/status
 * Returns connection and pairing status of ChatGPT Classic macOS app.
 */
router.get('/status', (req, res) => {
  try {
    res.json(chatgptBridge.getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
