import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Universal Native SQLite Engine Adapter ─────────────────────────────────
// Uses Node 22+ built-in node:sqlite (zero glibc/native-addon issues on Vercel)
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  // Node without node:sqlite fallback
}

class NodeSqliteAdapter {
  constructor(filename) {
    this.rawDb = new DatabaseSync(filename);
  }

  run(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    try {
      // PRAGMA or multi-statement commands without prepare support
      if (sql.trim().toUpperCase().startsWith('PRAGMA')) {
        this.rawDb.exec(sql);
        if (cb) cb.call({ changes: 0, lastID: 0 }, null);
        return;
      }
      const stmt = this.rawDb.prepare(sql);
      const res = stmt.run(...(params || []));
      const context = { changes: Number(res.changes || 0), lastID: Number(res.lastInsertRowid || 0) };
      if (cb) cb.call(context, null);
    } catch (err) {
      if (cb) cb(err);
      else throw err;
    }
  }

  all(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    try {
      const stmt = this.rawDb.prepare(sql);
      const rows = stmt.all(...(params || []));
      // Normalize rows to standard plain objects
      const normalized = rows.map((r) => ({ ...r }));
      if (cb) cb(null, normalized);
    } catch (err) {
      if (cb) cb(err, []);
    }
  }

  get(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    try {
      const stmt = this.rawDb.prepare(sql);
      const row = stmt.get(...(params || []));
      const normalized = row ? { ...row } : null;
      if (cb) cb(null, normalized);
    } catch (err) {
      if (cb) cb(err, null);
    }
  }

  exec(sql, cb) {
    try {
      this.rawDb.exec(sql);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  close(cb) {
    try {
      this.rawDb.close();
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_DIR = isServerless
  ? path.join(os.tmpdir(), 'fullcode_databases')
  : path.join(__dirname, 'data', 'databases');

// Ensure directory exists
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('DB directory initialization warning:', err.message);
}

let isSeeded = false;
let seedPromise = null;

export async function ensureSeeded() {
  if (isSeeded) return;
  if (!seedPromise) {
    seedPromise = seedSampleDatabases()
      .then(() => {
        isSeeded = true;
      })
      .catch((err) => {
        console.warn('Automatic database seed notice:', err.message);
      });
  }
  return seedPromise;
}

// Active database connection cache
const dbConnections = new Map();
let lastActiveDatabase = 'main_db';

/**
 * Locate which database holds a specific table
 */
export async function findDatabaseForTable(tableName) {
  if (!tableName) return null;
  const cleanTable = tableName.replace(/["'`]/g, '').toLowerCase();
  const dbs = await listDatabases();
  for (const d of dbs) {
    const { db } = getDbConnection(d.name);
    const hasTable = await new Promise((res) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND LOWER(name) = ?;",
        [cleanTable],
        (err, row) => res(Boolean(row))
      );
    });
    if (hasTable) return d.name;
  }
  return null;
}

/**
 * Get or create a sqlite3 database connection
 */
export function getDbConnection(dbName = 'main_db') {
  const sanitized = (dbName || 'main_db').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dbPath = path.join(DB_DIR, `${sanitized}.sqlite`);

  if (!dbConnections.has(sanitized)) {
    let db;
    if (DatabaseSync) {
      db = new NodeSqliteAdapter(dbPath);
    } else {
      const sqlite3 = require('sqlite3');
      db = new sqlite3.Database(dbPath);
    }
    // Enable WAL mode and foreign keys for high performance
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;');
    dbConnections.set(sanitized, db);
  }

  return { db: dbConnections.get(sanitized), sanitized, dbPath };
}

/**
 * List all available databases with size and table stats
 */
export async function listDatabases() {
  await ensureSeeded();
  if (!fs.existsSync(DB_DIR)) return [];
  const files = fs.readdirSync(DB_DIR).filter((f) => f.endsWith('.sqlite'));
  const databases = [];

  for (const file of files) {
    const dbName = file.replace('.sqlite', '');
    const fullPath = path.join(DB_DIR, file);
    const stats = fs.statSync(fullPath);

    const schema = await getDatabaseSchema(dbName);
    databases.push({
      name: dbName,
      sizeBytes: stats.size,
      tablesCount: schema.tables.length,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
    });
  }

  return databases;
}

/**
 * Create a new database
 */
export async function createDatabase(dbName) {
  const sanitized = dbName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const { db } = getDbConnection(sanitized);

  // Initialize a metadata table
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS _codeforge_meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      (err) => (err ? reject(err) : resolve())
    );
  });

  return { name: sanitized, success: true };
}

/**
 * Delete a database
 */
export async function deleteDatabase(dbName) {
  const sanitized = dbName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  if (dbConnections.has(sanitized)) {
    const db = dbConnections.get(sanitized);
    await new Promise((resolve) => db.close(resolve));
    dbConnections.delete(sanitized);
  }

  const dbPath = path.join(DB_DIR, `${sanitized}.sqlite`);
  const walPath = path.join(DB_DIR, `${sanitized}.sqlite-wal`);
  const shmPath = path.join(DB_DIR, `${sanitized}.sqlite-shm`);

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  return { success: true, name: sanitized };
}

/**
 * Split SQL script into individual executable statements
 */
function splitSqlStatements(sqlText) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1];

    // Handle single-line comment (-- or #)
    if (!inSingleQuote && !inDoubleQuote && !inBlockComment) {
      if ((char === '-' && nextChar === '-') || char === '#') {
        inLineComment = true;
      }
    }
    if (inLineComment && (char === '\n' || char === '\r')) {
      inLineComment = false;
      current += ' ';
      continue;
    }
    if (inLineComment) {
      continue;
    }

    // Handle block comments (/* ... */)
    if (!inSingleQuote && !inDoubleQuote && !inLineComment) {
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
    }
    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++;
      current += ' ';
      continue;
    }
    if (inBlockComment) {
      continue;
    }

    // Handle string literals
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    // Split on semicolon
    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }

  const lastTrimmed = current.trim();
  if (lastTrimmed) {
    statements.push(lastTrimmed);
  }

  return statements;
}

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/**
 * Transpile MySQL / Oracle / PostgreSQL dialect constructs into SQLite-compatible SQL
 */
export function transpileSqlForSqlite(sql) {
  if (!sql) return '';
  let s = sql.trim();

  // 1. STR_TO_DATE('17-JUN-1987', '%d-%M-%Y') and TO_DATE(...) -> ISO format '1987-06-17'
  s = s.replace(/(?:STR_TO_DATE|TO_DATE)\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/gi, (match, dateStr) => {
    const dmyMatch = dateStr.match(/^(\d{1,2})[-/]([A-Za-z]+)[-/](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const monName = dmyMatch[2].toLowerCase();
      const month = MONTH_MAP[monName] || '01';
      const year = dmyMatch[3];
      return `'${year}-${month}-${day}'`;
    }
    const dmyNumMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyNumMatch) {
      const day = dmyNumMatch[1].padStart(2, '0');
      const month = dmyNumMatch[2].padStart(2, '0');
      const year = dmyNumMatch[3];
      return `'${year}-${month}-${day}'`;
    }
    const ymdMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      return `'${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}'`;
    }
    return `'${dateStr}'`;
  });

  // 2. Subquery operators: > ALL, < ALL, >= ALL, <= ALL, > ANY, etc.
  s = s.replace(/>\s*ALL\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '> (SELECT MAX($1) FROM');
  s = s.replace(/>=\s*ALL\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '>= (SELECT MAX($1) FROM');
  s = s.replace(/<\s*ALL\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '< (SELECT MIN($1) FROM');
  s = s.replace(/<=\s*ALL\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '<= (SELECT MIN($1) FROM');
  s = s.replace(/>\s*ANY\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '> (SELECT MIN($1) FROM');
  s = s.replace(/>=\s*ANY\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '>= (SELECT MIN($1) FROM');
  s = s.replace(/<\s*ANY\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '< (SELECT MAX($1) FROM');
  s = s.replace(/<=\s*ANY\s*\(\s*SELECT\s+([a-zA-Z0-9_.*]+)\s+FROM\b/gi, '<= (SELECT MAX($1) FROM');
  s = s.replace(/=\s*ANY\s*\(/gi, 'IN (');
  s = s.replace(/(?:!=|<>)\s*ALL\s*\(/gi, 'NOT IN (');

  // 3. Normalize common field aliases: emp_id -> employee_id in employees queries
  if (/\bemployees\b/i.test(s) && /\bemp_id\b/i.test(s)) {
    s = s.replace(/\bemp_id\b/gi, 'employee_id');
  }

  // 4. CREATE TABLE normalization
  if (/^CREATE\s+TABLE\b/i.test(s)) {
    // Strip UNSIGNED
    s = s.replace(/\bUNSIGNED\b/gi, '');

    // Convert INT(11) etc. to INTEGER
    s = s.replace(/\b(?:INT|INTEGER|TINYINT|SMALLINT|MEDIUMINT|BIGINT)\s*(?:\(\s*\d+\s*\))?/gi, 'INTEGER');

    // Strip trailing MySQL engine / charset options after closing parenthesis
    s = s.replace(/\)\s*(?:ENGINE\s*=\s*\w+|DEFAULT\s+CHARSET\s*=\s*\w+|CHARSET\s*=\s*\w+|COLLATE\s*=\s*\w+|AUTO_INCREMENT\s*=\s*\d+)+;/gi, ');');

    // Normalize MySQL collations to NOCASE or strip
    s = s.replace(/COLLATE\s*(?:=\s*)?(?:utf8\w*|latin1\w*)/gi, 'COLLATE NOCASE');

    // Handle AUTO_INCREMENT
    if (/PRIMARY\s+KEY\s*\([^)]*\b/i.test(s)) {
      s = s.replace(/\bAUTO_INCREMENT\b/gi, '');
    } else {
      s = s.replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT');
    }
  }

  return s;
}

/**
 * Execute SQL Query or multi-statement script on target database
 * Supports MySQL / PostgreSQL DDL extensions:
 * - CREATE DATABASE <name> / CREATE SCHEMA <name>
 * - USE <name>
 * - SHOW DATABASES / SHOW SCHEMAS
 * - SHOW TABLES [FROM <name>]
 * - DESCRIBE <table> / DESC <table>
 * - DROP DATABASE <name> / DROP SCHEMA <name>
 */
export async function executeSqlQuery(initialDbName = 'main_db', sqlQuery) {
  await ensureSeeded();
  const startTime = performance.now();
  let currentDb = (initialDbName && initialDbName !== 'main_db' ? initialDbName : lastActiveDatabase) || 'main_db';

  const cleanQuery = (sqlQuery || '').trim();
  if (!cleanQuery) {
    return {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: '0.00',
      database: currentDb,
    };
  }

  let statements = splitSqlStatements(cleanQuery);
  const executionLogs = [];

  // If entire script was commented out with '-- ' or '# ' (e.g. pasted directly from tutorials/workbench)
  if (statements.length === 0) {
    const lines = cleanQuery.split('\n');
    const hasCommentedSql = lines.some((l) =>
      /^\s*(?:--|#)\s*(?:CREATE|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|USE|SHOW|PRAGMA)\b/i.test(l)
    );
    if (hasCommentedSql) {
      const uncommented = lines.map((l) => l.replace(/^\s*(?:--|#)\s?/, '')).join('\n');
      const retryStatements = splitSqlStatements(uncommented);
      if (retryStatements.length > 0) {
        statements = retryStatements;
        executionLogs.push("💡 Note: Your SQL script had '--' comment prefixes. FullCode automatically uncommented and executed it for you.");
      }
    }
  }

  if (statements.length === 0) {
    return {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: '0.00',
      database: currentDb,
    };
  }

  let finalResult = null;
  let lastModifiedTable = null;

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    // 1. CREATE DATABASE / CREATE SCHEMA
    const createDbMatch = trimmed.match(/^CREATE\s+(?:DATABASE|SCHEMA)\s+(?:(IF\s+NOT\s+EXISTS)\s+)?([a-zA-Z0-9_-]+)/i);
    if (createDbMatch) {
      const isIfNotExists = Boolean(createDbMatch[1]);
      const newDb = createDbMatch[2].toLowerCase();
      if (!isIfNotExists) {
        // Reset database if re-running CREATE DATABASE
        await deleteDatabase(newDb);
      }
      await createDatabase(newDb);
      currentDb = newDb;
      lastActiveDatabase = currentDb;
      executionLogs.push(`✅ Database '${newDb}' created.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Database '${newDb}' created successfully.` }],
        rowCount: 1,
        database: currentDb,
        type: 'DDL',
      };
      continue;
    }

    // 2. USE <db>
    const useDbMatch = trimmed.match(/^USE\s+([a-zA-Z0-9_-]+)/i);
    if (useDbMatch) {
      const targetDb = useDbMatch[1].toLowerCase();
      // Ensure target database exists
      await createDatabase(targetDb);
      currentDb = targetDb;
      lastActiveDatabase = currentDb;
      executionLogs.push(`🔄 Database changed to '${currentDb}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Database changed to '${currentDb}'.` }],
        rowCount: 1,
        database: currentDb,
        type: 'USE',
      };
      continue;
    }

    // 3. SHOW DATABASES / SHOW SCHEMAS / .databases
    if (/^(?:SHOW\s+(?:DATABASES|SCHEMAS)|\.DATABASES?)\b/i.test(trimmed)) {
      const dbs = await listDatabases();
      finalResult = {
        success: true,
        columns: ['Database', 'Tables_Count', 'Size_KB'],
        rows: dbs.map((d) => ({
          Database: d.name,
          Tables_Count: d.tablesCount,
          Size_KB: (d.sizeBytes / 1024).toFixed(1),
        })),
        rowCount: dbs.length,
        database: currentDb,
        type: 'SELECT',
      };
      continue;
    }

    // 4. SHOW TABLES [FROM <db>] / .tables
    const showTablesMatch = trimmed.match(/^(?:SHOW\s+TABLES(?:\s+FROM\s+([a-zA-Z0-9_-]+))?|\.TABLES?)\b/i);
    if (showTablesMatch) {
      const targetDb = showTablesMatch[1] ? showTablesMatch[1].toLowerCase() : currentDb;
      const { db } = getDbConnection(targetDb);
      const tables = await new Promise((resolve) => {
        db.all(
          "SELECT name AS Tables_in_database FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_codeforge_%' ORDER BY name ASC;",
          (err, rows) => resolve(err || !rows ? [] : rows)
        );
      });
      finalResult = {
        success: true,
        columns: [`Tables_in_${targetDb}`],
        rows: tables.map((t) => ({ [`Tables_in_${targetDb}`]: t.Tables_in_database })),
        rowCount: tables.length,
        database: targetDb,
        type: 'SELECT',
      };
      continue;
    }

    // 4b. .schema [table] or SCHEMA [table]
    const schemaMatch = trimmed.match(/^(?:\.SCHEMA|SCHEMA)(?:\s+([a-zA-Z0-9_"-]+))?$/i);
    if (schemaMatch) {
      const targetTable = schemaMatch[1] ? schemaMatch[1].replace(/["'`]/g, '').toLowerCase() : null;
      const { db } = getDbConnection(currentDb);
      const schemaRows = await new Promise((resolve) => {
        if (targetTable) {
          db.all(
            "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE (LOWER(name) = ? OR LOWER(tbl_name) = ?) AND sql IS NOT NULL ORDER BY type DESC, name ASC;",
            [targetTable, targetTable],
            (err, rows) => resolve(err || !rows ? [] : rows)
          );
        } else {
          db.all(
            "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_codeforge_%' AND sql IS NOT NULL ORDER BY type DESC, name ASC;",
            [],
            (err, rows) => resolve(err || !rows ? [] : rows)
          );
        }
      });

      if (schemaRows.length === 0 && targetTable) {
        return {
          success: false,
          error: `Table or view '${targetTable}' does not exist in database '${currentDb}'.`,
          sql: trimmed,
          database: currentDb,
        };
      }

      schemaRows.forEach((r) => {
        if (r.sql) executionLogs.push(`${r.sql};`);
      });

      finalResult = {
        success: true,
        columns: ['type', 'name', 'tbl_name', 'sql'],
        rows: schemaRows,
        rowCount: schemaRows.length,
        database: currentDb,
        type: 'SELECT',
      };
      continue;
    }

    // 4c. SHOW CREATE TABLE / SHOW CREATE VIEW <table>
    const showCreateMatch = trimmed.match(/^SHOW\s+CREATE\s+(?:TABLE|VIEW)\s+([a-zA-Z0-9_"-]+)/i);
    if (showCreateMatch) {
      const targetTable = showCreateMatch[1].replace(/["'`]/g, '').toLowerCase();
      const { db } = getDbConnection(currentDb);
      const row = await new Promise((resolve) => {
        db.get(
          "SELECT name, sql FROM sqlite_master WHERE (LOWER(name) = ? OR LOWER(tbl_name) = ?) AND sql IS NOT NULL;",
          [targetTable, targetTable],
          (err, r) => resolve(r || null)
        );
      });

      if (!row) {
        return {
          success: false,
          error: `Table '${targetTable}' does not exist in database '${currentDb}'.`,
          sql: trimmed,
          database: currentDb,
        };
      }

      executionLogs.push(`${row.sql};`);
      finalResult = {
        success: true,
        columns: ['Table', 'Create Table'],
        rows: [{ Table: row.name, 'Create Table': row.sql }],
        rowCount: 1,
        database: currentDb,
        type: 'SELECT',
      };
      continue;
    }

    // 4d. .indices / .indexes [table]
    const indexMatch = trimmed.match(/^(?:\.INDICES|\.INDEXES)(?:\s+([a-zA-Z0-9_"-]+))?$/i);
    if (indexMatch) {
      const targetTable = indexMatch[1] ? indexMatch[1].replace(/["'`]/g, '').toLowerCase() : null;
      const { db } = getDbConnection(currentDb);
      const rows = await new Promise((resolve) => {
        if (targetTable) {
          db.all(
            "SELECT name AS index_name, tbl_name AS table_name, sql FROM sqlite_master WHERE type = 'index' AND (LOWER(tbl_name) = ? OR LOWER(name) = ?);",
            [targetTable, targetTable],
            (err, r) => resolve(r || [])
          );
        } else {
          db.all(
            "SELECT name AS index_name, tbl_name AS table_name, sql FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%';",
            [],
            (err, r) => resolve(r || [])
          );
        }
      });
      finalResult = {
        success: true,
        columns: ['index_name', 'table_name', 'sql'],
        rows,
        rowCount: rows.length,
        database: currentDb,
        type: 'SELECT',
      };
      continue;
    }

    // 4e. .dump [table]
    const dumpMatch = trimmed.match(/^\.DUMP(?:\s+([a-zA-Z0-9_"-]+))?$/i);
    if (dumpMatch) {
      const targetTable = dumpMatch[1] ? dumpMatch[1].replace(/["'`]/g, '').toLowerCase() : null;
      const { db } = getDbConnection(currentDb);
      const dumpLines = ['PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;'];

      const dumpTables = await new Promise((resolve) => {
        const query = targetTable
          ? "SELECT name, sql FROM sqlite_master WHERE type='table' AND LOWER(name) = ?;"
          : "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_codeforge_%' ORDER BY name ASC;";
        const params = targetTable ? [targetTable] : [];
        db.all(query, params, (err, r) => resolve(r || []));
      });

      for (const t of dumpTables) {
        if (t.sql) dumpLines.push(`${t.sql};`);
        const rows = await new Promise((res) => {
          db.all(`SELECT * FROM "${t.name}";`, (err, r) => res(r || []));
        });
        for (const row of rows) {
          const cols = Object.keys(row);
          const vals = cols.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            return `'${String(v).replace(/'/g, "''")}'`;
          });
          dumpLines.push(`INSERT INTO "${t.name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`);
        }
      }
      dumpLines.push('COMMIT;');

      executionLogs.push(dumpLines.join('\n'));
      finalResult = {
        success: true,
        columns: ['SQL_Dump_Script'],
        rows: dumpLines.map((line) => ({ SQL_Dump_Script: line })),
        rowCount: dumpLines.length,
        database: currentDb,
        type: 'SELECT',
      };
      continue;
    }

    // 5. DESCRIBE / DESC <table> / SHOW COLUMNS FROM <table>
    const descMatch = trimmed.match(/^(?:DESCRIBE|DESC|SHOW\s+(?:COLUMNS|FIELDS)\s+FROM)\s+([a-zA-Z0-9_"-]+)/i);
    if (descMatch) {
      const table = descMatch[1].replace(/["']/g, '');
      const { db } = getDbConnection(currentDb);
      const info = await new Promise((resolve) => {
        db.all(`PRAGMA table_info("${table}");`, (err, rows) => resolve(err || !rows ? [] : rows));
      });
      finalResult = {
        success: true,
        columns: ['Field', 'Type', 'Null', 'Key', 'Default'],
        rows: info.map((r) => ({
          Field: r.name,
          Type: r.type || 'TEXT',
          Null: r.notnull ? 'NO' : 'YES',
          Key: r.pk ? 'PRI' : '',
          Default: r.dflt_value === null ? 'NULL' : String(r.dflt_value),
        })),
        rowCount: info.length,
        database: currentDb,
        type: 'SELECT',
      };
      continue;
    }

    // 6. DROP DATABASE / DROP SCHEMA
    const dropDbMatch = trimmed.match(/^DROP\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_-]+)/i);
    if (dropDbMatch) {
      const targetDb = dropDbMatch[1];
      await deleteDatabase(targetDb);
      executionLogs.push(`🗑️ Database '${targetDb}' dropped.`);
      if (currentDb === targetDb.toLowerCase()) {
        currentDb = 'main_db';
        lastActiveDatabase = 'main_db';
      }
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Database '${targetDb}' dropped successfully.` }],
        rowCount: 1,
        database: currentDb,
        type: 'DDL',
      };
      continue;
    }

    // 6b. COMMIT / ROLLBACK / BEGIN (Graceful transaction control)
    if (/^COMMIT\b/i.test(trimmed)) {
      try {
        const { db } = getDbConnection(currentDb);
        await new Promise((res) => db.run('COMMIT;', () => res()));
      } catch {
        // Safe to ignore if no transaction active in SQLite
      }
      executionLogs.push('💾 Transaction committed.');
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Transaction committed successfully.' }],
        rowCount: 1,
        database: currentDb,
        type: 'MUTATION',
      };
      continue;
    }
    if (/^ROLLBACK\b/i.test(trimmed)) {
      try {
        const { db } = getDbConnection(currentDb);
        await new Promise((res) => db.run('ROLLBACK;', () => res()));
      } catch {
        // Safe to ignore if no transaction active
      }
      executionLogs.push('🔄 Transaction rolled back.');
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Transaction rolled back.' }],
        rowCount: 1,
        database: currentDb,
        type: 'MUTATION',
      };
      continue;
    }
    if (/^BEGIN(?:\s+TRANSACTION)?\b/i.test(trimmed)) {
      try {
        const { db } = getDbConnection(currentDb);
        await new Promise((res) => db.run('BEGIN TRANSACTION;', () => res()));
      } catch {
        // Safe to ignore if already in transaction
      }
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Transaction started.' }],
        rowCount: 1,
        database: currentDb,
        type: 'MUTATION',
      };
      continue;
    }

    // 6c. MySQL SET FOREIGN_KEY_CHECKS = 0 | 1 and session variables
    if (/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*0\b/i.test(trimmed)) {
      const { db } = getDbConnection(currentDb);
      await new Promise((res) => db.run('PRAGMA foreign_keys = OFF;', () => res()));
      executionLogs.push('⚙️ FOREIGN_KEY_CHECKS disabled (PRAGMA foreign_keys = OFF).');
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'FOREIGN_KEY_CHECKS = 0' }],
        rowCount: 1,
        database: currentDb,
        type: 'PRAGMA',
      };
      continue;
    }
    if (/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*1\b/i.test(trimmed)) {
      const { db } = getDbConnection(currentDb);
      await new Promise((res) => db.run('PRAGMA foreign_keys = ON;', () => res()));
      executionLogs.push('⚙️ FOREIGN_KEY_CHECKS enabled (PRAGMA foreign_keys = ON).');
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'FOREIGN_KEY_CHECKS = 1' }],
        rowCount: 1,
        database: currentDb,
        type: 'PRAGMA',
      };
      continue;
    }
    if (/^SET\s+[@a-zA-Z0-9_.]+\s*=/i.test(trimmed)) {
      executionLogs.push(`⚙️ Session variable set (${trimmed}).`);
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'OK' }],
        rowCount: 1,
        database: currentDb,
        type: 'PRAGMA',
      };
      continue;
    }

    // 6d. LOCK TABLES / UNLOCK TABLES (MySQL dump compatibility)
    if (/^(?:LOCK\s+TABLES|UNLOCK\s+TABLES)\b/i.test(trimmed)) {
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'OK' }],
        rowCount: 1,
        database: currentDb,
        type: 'MUTATION',
      };
      continue;
    }

    // 6e. ALTER TABLE ... ADD UNIQUE INDEX (cols) -> CREATE UNIQUE INDEX
    const addUniqueIdxMatch = trimmed.match(/^ALTER\s+TABLE\s+([a-zA-Z0-9_"-]+)\s+ADD\s+UNIQUE\s+(?:INDEX|KEY)?\s*(?:([a-zA-Z0-9_"-]+)\s*)?\(([^)]+)\)/i);
    if (addUniqueIdxMatch) {
      const table = addUniqueIdxMatch[1].replace(/["'`]/g, '');
      const idxName = addUniqueIdxMatch[2] ? addUniqueIdxMatch[2].replace(/["'`]/g, '') : `idx_${table}_uniq_${Date.now()}`;
      const cols = addUniqueIdxMatch[3];
      const indexSql = `CREATE UNIQUE INDEX IF NOT EXISTS "${idxName}" ON "${table}" (${cols});`;
      const { db } = getDbConnection(currentDb);
      await new Promise((res, rej) => db.run(indexSql, (err) => (err ? rej(err) : res())));
      executionLogs.push(`✅ Unique index '${idxName}' created on '${table}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Unique index '${idxName}' created on '${table}'.` }],
        rowCount: 1,
        database: currentDb,
        type: 'DDL',
      };
      continue;
    }

    // 6f. ALTER TABLE ... ADD INDEX (cols) -> CREATE INDEX
    const addIdxMatch = trimmed.match(/^ALTER\s+TABLE\s+([a-zA-Z0-9_"-]+)\s+ADD\s+INDEX\s*(?:([a-zA-Z0-9_"-]+)\s*)?\(([^)]+)\)/i);
    if (addIdxMatch) {
      const table = addIdxMatch[1].replace(/["'`]/g, '');
      const idxName = addIdxMatch[2] ? addIdxMatch[2].replace(/["'`]/g, '') : `idx_${table}_${Date.now()}`;
      const cols = addIdxMatch[3];
      const indexSql = `CREATE INDEX IF NOT EXISTS "${idxName}" ON "${table}" (${cols});`;
      const { db } = getDbConnection(currentDb);
      await new Promise((res, rej) => db.run(indexSql, (err) => (err ? rej(err) : res())));
      executionLogs.push(`✅ Index '${idxName}' created on '${table}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Index '${idxName}' created on '${table}'.` }],
        rowCount: 1,
        database: currentDb,
        type: 'DDL',
      };
      continue;
    }

    // 6g. ALTER TABLE ... ADD FOREIGN KEY (SQLite validates at CREATE TABLE time)
    if (/^ALTER\s+TABLE\s+[a-zA-Z0-9_"-]+\s+ADD\s+(?:CONSTRAINT\s+[a-zA-Z0-9_"-]+\s+)?FOREIGN\s+KEY\b/i.test(trimmed)) {
      executionLogs.push(`ℹ️ Foreign key constraint noted (SQLite enforces foreign keys declared at table creation).`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Foreign key constraint noted.' }],
        rowCount: 1,
        database: currentDb,
        type: 'DDL',
      };
      continue;
    }

    // 6h. CREATE VIEW / CREATE OR REPLACE VIEW
    const createViewMatch = trimmed.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:(IF\s+NOT\s+EXISTS)\s+)?([a-zA-Z0-9_"-]+)/i);
    if (createViewMatch) {
      const isIfNotExists = Boolean(createViewMatch[1]);
      const viewName = createViewMatch[2].replace(/["'`]/g, '');
      lastModifiedTable = viewName;
      if (!isIfNotExists) {
        const { db } = getDbConnection(currentDb);
        await new Promise((res) => db.run(`DROP VIEW IF EXISTS "${viewName}";`, () => res()));
      }
    }

    // Transpile statement through SQLite dialect preprocessor
    let executionSql = transpileSqlForSqlite(trimmed);

    // 7. Handle CREATE TABLE re-runs cleanly + support NOCASE
    const createTableMatch = trimmed.match(/^CREATE\s+TABLE\s+(?:(IF\s+NOT\s+EXISTS)\s+)?([a-zA-Z0-9_"-]+)/i);
    if (createTableMatch) {
      const isIfNotExists = Boolean(createTableMatch[1]);
      const tblName = createTableMatch[2].replace(/["'`]/g, '');
      lastModifiedTable = tblName;
      if (!isIfNotExists) {
        const { db } = getDbConnection(currentDb);
        await new Promise((res) => db.run(`DROP TABLE IF EXISTS "${tblName}";`, () => res()));
      }
      // Inject COLLATE NOCASE for case-insensitive string operations like MySQL
      executionSql = executionSql.replace(/(VARCHAR\s*\([^)]+\)|TEXT|CHAR\s*\([^)]+\))(?!\s+COLLATE)/gi, '$1 COLLATE NOCASE');
    }

    // Track table name for INSERT, UPDATE, DELETE
    const mutationMatch = trimmed.match(/^(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-zA-Z0-9_"-]+)/i);
    if (mutationMatch) {
      lastModifiedTable = mutationMatch[1].replace(/["'`]/g, '');
    }

    // Auto-locate table across databases if not in currentDb
    const tableRefMatch = trimmed.match(/\b(?:FROM|INTO|UPDATE|TABLE)\s+([a-zA-Z0-9_"-]+)/i);
    if (tableRefMatch && !createDbMatch && !useDbMatch) {
      const referencedTable = tableRefMatch[1].replace(/["'`]/g, '');
      const isSystemTable = /^(sqlite_|sqlite_master|sqlite_schema|_codeforge_)/i.test(referencedTable);
      if (!isSystemTable) {
        const { db: testDb } = getDbConnection(currentDb);
        const existsLocally = await new Promise((res) => {
          testDb.get(
            "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND LOWER(name) = ?;",
            [referencedTable.toLowerCase()],
            (err, row) => res(Boolean(row))
          );
        });
        if (!existsLocally && !createTableMatch) {
          const altDb = await findDatabaseForTable(referencedTable);
          if (altDb && altDb !== currentDb) {
            currentDb = altDb;
            lastActiveDatabase = altDb;
            executionLogs.push(`🔄 Context switched to database '${currentDb}' (contains '${referencedTable}').`);
          }
        }
      }
    }

    // Support MySQL-like case-insensitivity on string comparisons in DELETE, UPDATE, SELECT
    if (/^(DELETE|UPDATE|SELECT)\b/i.test(trimmed)) {
      executionSql = executionSql.replace(/(=\s*(?:'[^']+'|"[^"]+"))(?!\s+COLLATE)/gi, '$1 COLLATE NOCASE');
    }

    // 8. Regular SQL Execution (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, etc.)
    const { db } = getDbConnection(currentDb);
    const isSelect = /^(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(trimmed);

    const stepResult = await new Promise((resolve) => {
      if (isSelect) {
        db.all(executionSql, [], (err, rows) => {
          if (err) {
            return resolve({
              success: false,
              error: err.message,
              sql: executionSql,
              database: currentDb,
            });
          }
          const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
          return resolve({
            success: true,
            columns,
            rows: rows || [],
            rowCount: rows ? rows.length : 0,
            database: currentDb,
            type: 'SELECT',
          });
        });
      } else {
        db.run(executionSql, function (err) {
          if (err) {
            return resolve({
              success: false,
              error: err.message,
              sql: executionSql,
              database: currentDb,
            });
          }
          const changes = this.changes || 0;
          if (/^INSERT\s+INTO/i.test(trimmed)) {
            executionLogs.push(`✅ ${changes} row(s) inserted into '${lastModifiedTable || 'table'}'.`);
          } else if (/^UPDATE/i.test(trimmed)) {
            executionLogs.push(`✏️ ${changes} row(s) updated in '${lastModifiedTable || 'table'}'.`);
          } else if (/^DELETE\s+FROM/i.test(trimmed)) {
            if (changes > 0) {
              executionLogs.push(`🗑️ ${changes} row(s) deleted from '${lastModifiedTable || 'table'}'.`);
            } else {
              executionLogs.push(`⚠️ 0 rows deleted from '${lastModifiedTable || 'table'}' (no records matched WHERE criteria).`);
            }
          } else if (/^CREATE\s+TABLE/i.test(trimmed)) {
            executionLogs.push(`✅ Table '${lastModifiedTable || 'table'}' created in '${currentDb}'.`);
          }

          return resolve({
            success: true,
            columns: ['status', 'rows_affected'],
            rows: [
              {
                status: 'SUCCESS',
                rows_affected: changes,
              },
            ],
            rowCount: 1,
            database: currentDb,
            type: 'MUTATION',
          });
        });
      }
    });

    if (!stepResult.success) {
      const elapsed = (performance.now() - startTime).toFixed(2);
      return {
        ...stepResult,
        executionTimeMs: elapsed,
        logs: executionLogs,
      };
    }

    // Save as finalResult
    finalResult = stepResult;
  }

  const elapsed = (performance.now() - startTime).toFixed(2);

  // If user ran mutations without a trailing SELECT, auto-preview the modified table rows
  if (finalResult && finalResult.type !== 'SELECT' && lastModifiedTable) {
    const { db } = getDbConnection(currentDb);
    const previewRows = await new Promise((resolve) => {
      db.all(`SELECT * FROM "${lastModifiedTable}" LIMIT 50;`, (err, rows) => {
        resolve(err || !rows ? [] : rows);
      });
    });
    const colInfo = await new Promise((resolve) => {
      db.all(`PRAGMA table_info("${lastModifiedTable}");`, (err, rows) => {
        resolve(err || !rows ? [] : rows);
      });
    });
    const cols = colInfo.length > 0
      ? colInfo.map((c) => c.name)
      : (previewRows && previewRows.length > 0 ? Object.keys(previewRows[0]) : ['status']);

    finalResult = {
      success: true,
      columns: cols,
      rows: previewRows || [],
      rowCount: previewRows ? previewRows.length : 0,
      database: currentDb,
      previewTable: lastModifiedTable,
      type: 'MUTATION_PREVIEW',
    };
  }

  if (!finalResult) {
    finalResult = {
      success: true,
      columns: ['status'],
      rows: [{ status: 'Query executed successfully.' }],
      rowCount: 1,
    };
  }

  return {
    ...finalResult,
    executionTimeMs: elapsed,
    database: currentDb,
    previewTable: lastModifiedTable,
    logs: executionLogs,
  };
}

/**
 * Get schema of all tables in a database
 */
export async function getDatabaseSchema(dbName = 'main_db') {
  const { db } = getDbConnection(dbName);

  const tables = await new Promise((resolve) => {
    db.all(
      "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_codeforge_%' ORDER BY name ASC;",
      (err, rows) => {
        if (err || !rows) return resolve([]);
        resolve(rows);
      }
    );
  });

  const fullSchema = [];

  for (const table of tables) {
    const columns = await new Promise((resolve) => {
      db.all(`PRAGMA table_info("${table.name}");`, (err, rows) => {
        if (err || !rows) return resolve([]);
        resolve(
          rows.map((r) => ({
            name: r.name,
            type: r.type || 'TEXT',
            notNull: Boolean(r.notnull),
            isPrimaryKey: Boolean(r.pk),
            defaultValue: r.dflt_value,
          }))
        );
      });
    });

    const countRow = await new Promise((resolve) => {
      db.get(`SELECT COUNT(*) as count FROM "${table.name}";`, (err, row) => {
        resolve(row ? row.count : 0);
      });
    });

    fullSchema.push({
      tableName: table.name,
      type: table.type,
      rowCount: countRow,
      sql: table.sql || null,
      columns,
    });
  }

  return { database: dbName, tables: fullSchema };
}

/**
 * Get table data with pagination
 */
export async function getTableData(dbName = 'main_db', tableName, limit = 100, offset = 0) {
  const { db } = getDbConnection(dbName);

  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  const total = await new Promise((resolve) => {
    db.get(`SELECT COUNT(*) as count FROM "${tableName}";`, (err, row) => {
      resolve(row ? row.count : 0);
    });
  });

  const rows = await new Promise((resolve, reject) => {
    db.all(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?;`, [safeLimit, safeOffset], (err, res) => {
      if (err) return reject(err);
      resolve(res || []);
    });
  });

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    database: dbName,
    tableName,
    columns,
    rows,
    total,
    limit: safeLimit,
    offset: safeOffset,
  };
}

/**
 * Seed initial sample databases if empty
 */
export async function seedSampleDatabases() {
  // Always ensure essential default tables exist in main_db
  const { db: mainDb } = getDbConnection('main_db');
  await new Promise((resolve) => {
    mainDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        role TEXT DEFAULT 'developer',
        rating INTEGER DEFAULT 1500
      );
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT DEFAULT 'Engineering',
        salary INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO employees (id, name, department, salary) VALUES
        (1, 'Alex Mercer', 'Engineering', 95000),
        (2, 'Sarah Connor', 'Management', 120000),
        (3, 'Bruce Wayne', 'Executive', 250000),
        (4, 'Peter Parker', 'Engineering', 85000),
        (5, 'Clark Kent', 'Editorial', 75000),
        (6, 'Diana Prince', 'Operations', 110000),
        (7, 'Tony Stark', 'Engineering', 300000),
        (8, 'Barry Allen', 'Research', 90000);
    `, () => resolve());
  });

  const existing = fs.readdirSync(DB_DIR).filter((f) => f.endsWith('.sqlite'));
  if (existing.length > 1) return;

  console.log('🌱 Seeding sample databases (ecommerce_db, university_db)...');

  // 1. Ecommerce Database
  const { db: ecommerceDb } = getDbConnection('ecommerce_db');
  await new Promise((resolve) => {
    ecommerceDb.exec(
      `
      CREATE TABLE IF NOT EXISTS customers (
        customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        country TEXT DEFAULT 'USA',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        order_date DATE DEFAULT (DATE('now')),
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'Completed',
        FOREIGN KEY(customer_id) REFERENCES customers(customer_id)
      );

      INSERT INTO customers (name, email, country) VALUES
        ('Alice Johnson', 'alice@example.com', 'USA'),
        ('Bob Smith', 'bob@example.com', 'Canada'),
        ('Charlie Brown', 'charlie@example.com', 'UK'),
        ('Diana Prince', 'diana@example.com', 'Germany'),
        ('Evan Wright', 'evan@example.com', 'Australia');

      INSERT INTO products (name, category, price, stock) VALUES
        ('Quantum Laptop Pro', 'Electronics', 1299.99, 45),
        ('Wireless Noise-Cancelling Headphones', 'Electronics', 249.50, 120),
        ('Ergonomic Mechanical Keyboard', 'Accessories', 119.00, 85),
        ('4K Ultra HD Monitor 32"', 'Electronics', 499.00, 30),
        ('USB-C Multiport Hub', 'Accessories', 39.99, 200);

      INSERT INTO orders (customer_id, total_amount, status) VALUES
        (1, 1299.99, 'Delivered'),
        (2, 289.49, 'Processing'),
        (3, 499.00, 'Shipped'),
        (1, 158.99, 'Delivered'),
        (4, 39.99, 'Pending');
      `,
      () => resolve()
    );
  });

  // 2. University Database
  const { db: universityDb } = getDbConnection('university_db');
  await new Promise((resolve) => {
    universityDb.exec(
      `
      CREATE TABLE IF NOT EXISTS departments (
        dept_id INTEGER PRIMARY KEY AUTOINCREMENT,
        dept_name TEXT NOT NULL,
        budget REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        gpa REAL NOT NULL,
        dept_id INTEGER,
        FOREIGN KEY(dept_id) REFERENCES departments(dept_id)
      );

      CREATE TABLE IF NOT EXISTS courses (
        course_id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        credits INTEGER NOT NULL,
        dept_id INTEGER,
        FOREIGN KEY(dept_id) REFERENCES departments(dept_id)
      );

      INSERT INTO departments (dept_name, budget) VALUES
        ('Computer Science', 850000),
        ('Mathematics', 450000),
        ('Physics', 620000);

      INSERT INTO students (first_name, last_name, gpa, dept_id) VALUES
        ('Alex', 'Mercer', 3.85, 1),
        ('Sarah', 'Connor', 3.92, 1),
        ('Bruce', 'Wayne', 3.70, 2),
        ('Peter', 'Parker', 3.98, 3),
        ('Clark', 'Kent', 3.65, 2);

      INSERT INTO courses (course_name, credits, dept_id) VALUES
        ('Data Structures & Algorithms', 4, 1),
        ('Database Management Systems', 3, 1),
        ('Linear Algebra', 3, 2),
        ('Quantum Mechanics', 4, 3);
      `,
      () => resolve()
    );
  });

  console.log('✅ Sample databases seeded successfully.');
}
