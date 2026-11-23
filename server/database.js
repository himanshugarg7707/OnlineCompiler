import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.PG_POOL_MAX) || 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      application_name: 'onlinecompiler-backend',
    })
  : null;

export function isDatabaseConfigured() {
  return Boolean(pool);
}
