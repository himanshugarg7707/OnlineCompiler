import { Router } from 'express';
import { requireAuth } from './authRoutes.js';
import { isHostedEnvironment } from '../hostedMode.js';

const router = Router();
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter(Boolean);

let verifiedBackendModel = null;
const requestsByIp = new Map();

router.post('/generate', (req, res, next) => {
  if (isHostedEnvironment()) return requireAuth(req, res, next);
  return next();
}, async (req, res) => {
  const key = (
    req.headers['x-goog-api-key'] ||
    req.body?.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.LUCIA_GEMINI_API_KEY ||
    ''
  ).trim();

  if (!key) {
    return res.status(503).json({
      error: {
        message: 'Lucia server key is not configured. Add GEMINI_API_KEY to the backend environment, or enter a key in this browser’s AI settings.',
      },
    });
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (requestsByIp.get(ip) || []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 60) {
    return res.status(429).json({
      error: { message: 'Lucia is receiving too many requests from this network. Try again in a minute.' },
    });
  }
  recent.push(now);
  requestsByIp.set(ip, recent);

  const requestBody = { ...req.body };
  delete requestBody.apiKey;
  const requestedModel = req.body?.model;
  delete requestBody.model;

  // Build list of models to try in order
  const modelPool = [
    requestedModel,
    verifiedBackendModel,
    ...CANDIDATE_MODELS,
  ].filter(Boolean);
  const modelsToTry = [...new Set(modelPool)];

  let lastPayload = null;
  let lastStatus = 502;

  for (const model of modelsToTry) {
    try {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify(requestBody || {}),
          signal: AbortSignal.timeout(60_000),
        }
      );

      const payload = await upstream.json().catch(() => ({}));

      if (upstream.ok) {
        verifiedBackendModel = model;
        return res.status(upstream.status).json({ ...payload, _usedModel: model });
      }

      lastStatus = upstream.status;
      lastPayload = payload;

      const errMsg = (payload?.error?.message || '').toLowerCase();
      // If model not found or unsupported, try next model in cascade
      if (upstream.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
        continue;
      }

      // If invalid key or quota or bad syntax, return directly
      return res.status(upstream.status).json(payload);
    } catch (error) {
      lastStatus = 502;
      lastPayload = { error: { message: `Lucia could not reach Gemini: ${error.message}` } };
    }
  }

  return res.status(lastStatus).json(lastPayload || { error: { message: 'All Gemini candidate models failed to respond.' } });
});

export default router;
