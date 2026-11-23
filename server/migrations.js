import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './database.js';

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
let migrationRun;

export function runMigrations() {
  if (!pool) return Promise.reject(new Error('Database is not configured. Set DATABASE_URL on the backend.'));
  if (!migrationRun) {
    migrationRun = (async () => {
      const client = await pool.connect();
      try {
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
        const files = (await fs.readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
        for (const filename of files) {
          const sql = await fs.readFile(path.join(directory, filename), 'utf8');
          await client.query('BEGIN');
          try {
            // Transaction-scoped advisory locks work with Neon pooled connections.
            await client.query('SELECT pg_advisory_xact_lock($1)', [73429106]);
            const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [filename]);
            if (applied.rowCount) {
              await client.query('COMMIT');
              continue;
            }
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [filename]);
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        }
      } finally {
        client.release();
      }
    })().catch((error) => {
      migrationRun = null;
      throw error;
    });
  }
  return migrationRun;
}
