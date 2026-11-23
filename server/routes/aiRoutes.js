import { Router } from 'express';
import { requireAuth } from './authRoutes.js';
import { isHostedEnvironment } from '../hostedMode.js';

const router = Router();
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
].filter(Boolean);

let verifiedBackendModel = null;
let cachedServerModels = null;
let lastServerKey = '';
const requestsByIp = new Map();

async function getServerSupportedModels(key) {
  if (!key) return CANDIDATE_MODELS;
  if (cachedServerModels && lastServerKey === key) return cachedServerModels;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const models = (data?.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        .filter((name) => !name.includes('embedding') && !name.includes('aqa') && !name.includes('imagen'));
      if (models.length > 0) {
        models.sort((a, b) => {
          const aWeight = a.includes('1.5-flash') ? 4 : a.includes('2.0-flash') ? 3 : a.includes('flash') ? 2 : 1;
          const bWeight = b.includes('1.5-flash') ? 4 : b.includes('2.0-flash') ? 3 : b.includes('flash') ? 2 : 1;
          return bWeight - aWeight;
        });
        cachedServerModels = models;
        lastServerKey = key;
        return models;
      }
    }
  } catch {}
  return CANDIDATE_MODELS;
}

function shouldCascadeModel(status, errMsg) {
  const normalized = (errMsg || '').toLowerCase();
  // Don't cascade if the user's API key itself is permanently invalid
  if (
    normalized.includes('api key not valid') ||
    normalized.includes('api_key_invalid') ||
    normalized.includes('bad api key') ||
    normalized.includes('key has expired')
  ) {
    return false;
  }
  // Always cascade on server unavailable, high demand, rate limit, capacity, not found, overload
  if ([404, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }
  if (
    normalized.includes('high demand') ||
    normalized.includes('spikes in demand') ||
    normalized.includes('overloaded') ||
    normalized.includes('capacity') ||
    normalized.includes('unavailable') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('rate limit') ||
    normalized.includes('quota') ||
    normalized.includes('not found') ||
    normalized.includes('not supported') ||
    normalized.includes('try again') ||
    normalized.includes('temporary')
  ) {
    return true;
  }
  return false;
}

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
  const candidateList = await getServerSupportedModels(key);
  const modelPool = [
    requestedModel,
    verifiedBackendModel,
    ...candidateList,
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
      // If model not found, overloaded, high demand, rate limited, try next model in cascade
      if (shouldCascadeModel(upstream.status, errMsg)) {
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
