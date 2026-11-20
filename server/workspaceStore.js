import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.PG_POOL_MAX) || 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  : null;

let schemaPromise = null;

export function isWorkspaceDatabaseConfigured() {
  return Boolean(pool);
}

async function ensureSchema() {
  if (!pool) throw new Error('Workspace database is not configured. Set DATABASE_URL on the backend.');
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS compiler_workspaces (
        owner_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'Workspace',
        files JSONB NOT NULL DEFAULT '[]'::jsonb,
        folders JSONB NOT NULL DEFAULT '[]'::jsonb,
        active_file_id TEXT,
        open_file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        stdin TEXT NOT NULL DEFAULT '',
        subject_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (owner_id, workspace_id)
      );
      CREATE INDEX IF NOT EXISTS compiler_workspaces_updated_at_idx ON compiler_workspaces (owner_id, updated_at DESC);
    `).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function checkWorkspaceDatabase() {
  if (!pool) return { configured: false, connected: false };
  try {
    await ensureSchema();
    await pool.query('SELECT 1');
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: error.message };
  }
}

function assertWorkspacePayload(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.files)) {
    throw new Error('Workspace payload must include a files array.');
  }
  if (payload.files.length > 5000) throw new Error('A workspace can contain at most 5,000 files.');
  let contentBytes = 0;
  for (const file of payload.files) {
    if (!file || typeof file.name !== 'string' || typeof file.content !== 'string') {
      throw new Error('Each workspace file needs a name and text content.');
    }
    contentBytes += Buffer.byteLength(file.content, 'utf8');
    if (contentBytes > 40 * 1024 * 1024) throw new Error('Workspace source content exceeds the 40 MB limit.');
  }
}

export async function saveWorkspaceSnapshot(ownerId, workspaceId, payload) {
  await ensureSchema();
  assertWorkspacePayload(payload);
  const result = await pool.query(
    `INSERT INTO compiler_workspaces
      (owner_id, workspace_id, name, files, folders, active_file_id, open_file_ids, stdin, subject_id, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8, $9, NOW())
     ON CONFLICT (owner_id, workspace_id) DO UPDATE SET
       name = EXCLUDED.name,
       files = EXCLUDED.files,
       folders = EXCLUDED.folders,
       active_file_id = EXCLUDED.active_file_id,
       open_file_ids = EXCLUDED.open_file_ids,
       stdin = EXCLUDED.stdin,
       subject_id = EXCLUDED.subject_id,
       updated_at = NOW()
     RETURNING updated_at`,
    [
      ownerId,
      workspaceId,
      typeof payload.name === 'string' ? payload.name.slice(0, 160) : 'Workspace',
      JSON.stringify(payload.files),
      JSON.stringify(Array.isArray(payload.folders) ? payload.folders : []),
      typeof payload.activeFileId === 'string' ? payload.activeFileId : null,
      JSON.stringify(Array.isArray(payload.openFileIds) ? payload.openFileIds : []),
      typeof payload.stdin === 'string' ? payload.stdin.slice(0, 1_000_000) : '',
      typeof payload.subjectId === 'string' ? payload.subjectId.slice(0, 160) : null,
    ]
  );
  return { updatedAt: result.rows[0]?.updated_at || new Date().toISOString() };
}

export async function getWorkspaceSnapshot(ownerId, workspaceId) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT workspace_id, name, files, folders, active_file_id, open_file_ids, stdin, subject_id, updated_at
     FROM compiler_workspaces WHERE owner_id = $1 AND workspace_id = $2 LIMIT 1`,
    [ownerId, workspaceId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.workspace_id,
    name: row.name,
    files: row.files,
    folders: row.folders,
    activeFileId: row.active_file_id,
    openFileIds: row.open_file_ids,
    stdin: row.stdin,
    subjectId: row.subject_id,
    updatedAt: row.updated_at,
  };
}

export async function listWorkspaceSnapshots(ownerId) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT workspace_id, name, jsonb_array_length(files) AS file_count, updated_at
     FROM compiler_workspaces WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 100`,
    [ownerId]
  );
  return result.rows.map((row) => ({
    id: row.workspace_id,
    name: row.name,
    fileCount: Number(row.file_count),
    updatedAt: row.updated_at,
  }));
}
