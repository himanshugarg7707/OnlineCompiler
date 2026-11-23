import { Router } from 'express';
import { findSessionUser, parseSessionCookie, registerOrLogin, revokeSession, sessionCookieOptions, updateOwnProfile } from '../authStore.js';

const router = Router();
const attempts = new Map();

function authError(res, error) {
  if (error.status) return res.status(error.status).json({ success: false, error: error.message });
  console.error('[Auth] Request failed:', error);
  return res.status(503).json({ success: false, error: 'Account service is temporarily unavailable. Your local workspace is still available.' });
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const state = attempts.get(key) || { count: 0, until: now + 60_000 };
  if (now > state.until) {
    state.count = 0;
    state.until = now + 60_000;
  }
  state.count++;
  attempts.set(key, state);
  if (attempts.size > 10_000) {
    for (const [ip, attempt] of attempts) if (attempt.until < now) attempts.delete(ip);
  }
  if (state.count > 12) return res.status(429).json({ success: false, error: 'Too many sign-in attempts. Wait a minute and try again.' });
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const user = await findSessionUser(parseSessionCookie(req));
    if (!user) return res.status(401).json({ success: false, error: 'Sign in to sync this workspace.' });
    req.authUser = user;
    return next();
  } catch (error) {
    return authError(res, error);
  }
}

router.post(['/login', '/register'], rateLimit, async (req, res) => {
  try {
    const result = await registerOrLogin(req.body || {});
    res.setHeader('Set-Cookie', sessionCookieOptions(result.token, result.expiresAt.getTime() - Date.now()));
    return res.json({ success: true, user: result.user, isNew: result.isNew });
  } catch (error) {
    return authError(res, error);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ success: true, user: req.authUser }));

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const user = await updateOwnProfile(req.authUser.id, req.body || {});
    return res.json({ success: true, user });
  } catch (error) {
    return authError(res, error);
  }
});

router.post('/logout', async (req, res) => {
  try { await revokeSession(parseSessionCookie(req)); }
  catch (error) { console.error('[Auth] Session revocation failed:', error); }
  res.setHeader('Set-Cookie', sessionCookieOptions('', 0));
  return res.json({ success: true });
});

export default router;
