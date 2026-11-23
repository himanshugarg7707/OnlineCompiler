import { Router } from 'express';
import { requireAuth } from './authRoutes.js';
import { isHostedEnvironment } from '../hostedMode.js';

const router = Router();
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const requestsByIp = new Map();

router.post('/generate', (req, res, next) => {
  if (isHostedEnvironment()) return requireAuth(req, res, next);
  return next();
}, async (req, res) => {
  const key = process.env.GEMINI_API_KEY || process.env.LUCIA_GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: { message: 'Lucia server key is not configured. Add GEMINI_API_KEY to the backend environment, or enter a key in this browser’s AI settings.' } });

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (requestsByIp.get(ip) || []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 30) return res.status(429).json({ error: { message: 'Lucia is receiving too many requests from this network. Try again in a minute.' } });
  recent.push(now);
  requestsByIp.set(ip, recent);

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(payload);
  } catch (error) {
    res.status(502).json({ error: { message: `Lucia could not reach Gemini: ${error.message}` } });
  }
});

export default router;
