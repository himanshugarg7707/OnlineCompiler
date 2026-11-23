import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './database.js';
import { runMigrations } from './migrations.js';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const SESSION_HOURS = 12;
const USERNAME_RE = /^[\p{L}\p{N}_.-]{3,32}$/u;

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    avatarInitials: row.avatar_initials,
    avatarColor: row.avatar_color,
    avatarEmoji: '',
    createdAt: new Date(row.created_at).getTime(),
  };
}

function hashSession(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const [scheme, salt, storedHex] = String(encoded).split('$');
  if (scheme !== 'scrypt' || !salt || !storedHex) return false;
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const stored = Buffer.from(storedHex, 'hex');
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

function validateCredentials(username, password) {
  const cleanUsername = String(username || '').trim();
  if (!USERNAME_RE.test(cleanUsername)) {
    throw Object.assign(new Error('Username must be 3–32 letters, numbers, dots, dashes, or underscores.'), { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 256) {
    throw Object.assign(new Error('Password must be 10–256 characters.'), { status: 400 });
  }
  return cleanUsername;
}

async function issueSession(userId, rememberMe) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (rememberMe ? SESSION_DAYS * 86400_000 : SESSION_HOURS * 3600_000));
  await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  await pool.query(
    'INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashSession(token), expiresAt]
  );
  return { token, expiresAt };
}

export async function registerOrLogin({ username, password, rememberMe = true }) {
  if (!pool) throw Object.assign(new Error('Account service is unavailable until DATABASE_URL is configured on the backend.'), { status: 503 });
  await runMigrations();
  const cleanUsername = validateCredentials(username, password);
  const normalized = cleanUsername.toLocaleLowerCase('en-US');
  let result = await pool.query('SELECT * FROM users WHERE username_normalized = $1', [normalized]);
  let row = result.rows[0];

  if (row) {
    if (!(await verifyPassword(password, row.password_hash))) {
      throw Object.assign(new Error('Incorrect password for this account.'), { status: 401 });
    }
  } else {
    const passwordHash = await hashPassword(password);
    const initials = cleanUsername.length === 1
      ? cleanUsername.toUpperCase()
      : `${cleanUsername[0]}${cleanUsername.at(-1)}`.toUpperCase();
    const colors = ['#00d4ff', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];
    try {
      result = await pool.query(
        `INSERT INTO users (id, username, username_normalized, password_hash, avatar_initials, avatar_color)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [randomUUID(), cleanUsername, normalized, passwordHash, initials, colors[cleanUsername.length % colors.length]]
      );
      row = result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('That username is already registered. Please sign in instead.'), { status: 409 });
      }
      throw error;
    }
  }

  const session = await issueSession(row.id, Boolean(rememberMe));
  return { user: publicUser(row), ...session, isNew: result.command === 'INSERT' };
}

export async function findSessionUser(token) {
  if (!pool || !token) return null;
  await runMigrations();
  const result = await pool.query(
    `SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() LIMIT 1`,
    [hashSession(token)]
  );
  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

export async function revokeSession(token) {
  if (!pool || !token) return;
  await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSession(token)]);
}

export async function updateOwnProfile(userId, updates) {
  await runMigrations();
  const initials = typeof updates.avatarInitials === 'string' ? updates.avatarInitials.trim().toUpperCase() : undefined;
  const color = typeof updates.avatarColor === 'string' ? updates.avatarColor : undefined;
  if (initials !== undefined && !/^[A-Z0-9]{1,3}$/.test(initials)) {
    throw Object.assign(new Error('Avatar initials must be 1–3 letters or numbers.'), { status: 400 });
  }
  if (color !== undefined && !/^#[0-9a-f]{6}$/i.test(color)) {
    throw Object.assign(new Error('Avatar color must be a six-digit hex color.'), { status: 400 });
  }
  const result = await pool.query(
    `UPDATE users SET avatar_initials = COALESCE($2, avatar_initials),
     avatar_color = COALESCE($3, avatar_color), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [userId, initials ?? null, color ?? null]
  );
  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

export function sessionCookieOptions(token, maxAge) {
  const production = process.env.NODE_ENV === 'production';
  return [
    `fullcode_session=${encodeURIComponent(token || '')}`,
    `HttpOnly`,
    `Path=/api`,
    `SameSite=${production ? 'None' : 'Lax'}`,
    ...(production ? ['Secure'] : []),
    ...(maxAge ? [`Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}`] : []),
  ].join('; ');
}

export function parseSessionCookie(req) {
  const cookie = String(req.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('fullcode_session='));
  return cookie ? decodeURIComponent(cookie.slice('fullcode_session='.length)) : '';
}
