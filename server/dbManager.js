import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, 'data', 'databases');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Active database connection cache
const dbConnections = new Map();

/**
 * Get or create a sqlite3 database connection
 */
export function getDbConnection(dbName = 'main_db') {
  const sanitized = (dbName || 'main_db').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dbPath = path.join(DB_DIR, `${sanitized}.sqlite`);

  if (!dbConnections.has(sanitized)) {
    const db = new sqlite3.Database(dbPath);
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

/**
 * Execute SQL Query or multi-statement script on target database
 * Supports MySQL / PostgreSQL DDL extensions:
 * - CREATE DATABASE <name> / CREATE SCHEMA <name>
 * - USE <name>
 * - SHOW DATABASES / SHOW SCHEMAS
 * - SHOW TABLES [FROM <name>]
 * - DESCRIBE <table> / DESC <table>
 * - DROP DATABASE <name>
 */
export async function executeSqlQuery(initialDbName = 'main_db', sqlQuery) {
  const startTime = performance.now();
  let currentDb = initialDbName || 'main_db';

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

  const statements = splitSqlStatements(cleanQuery);
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
  const executionLogs = [];

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    // 1. CREATE DATABASE / CREATE SCHEMA
    const createDbMatch = trimmed.match(/^CREATE\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_-]+)/i);
    if (createDbMatch) {
      const newDb = createDbMatch[1];
      await createDatabase(newDb);
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
      const targetDb = useDbMatch[1];
      // Ensure target database exists
      await createDatabase(targetDb);
      currentDb = targetDb.toLowerCase();
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

    // 3. SHOW DATABASES / SHOW SCHEMAS
    if (/^SHOW\s+(?:DATABASES|SCHEMAS)\b/i.test(trimmed)) {
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

    // 4. SHOW TABLES [FROM <db>]
    const showTablesMatch = trimmed.match(/^SHOW\s+TABLES(?:\s+FROM\s+([a-zA-Z0-9_-]+))?/i);
    if (showTablesMatch) {
      const targetDb = showTablesMatch[1] ? showTablesMatch[1].toLowerCase() : currentDb;
      const { db } = getDbConnection(targetDb);
      const tables = await new Promise((resolve) => {
        db.all(
          "SELECT name AS Tables_in_database FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_codeforge_%';",
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

    // 5. DESCRIBE / DESC <table>
    const descMatch = trimmed.match(/^(?:DESCRIBE|DESC)\s+([a-zA-Z0-9_"-]+)/i);
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

    // 6. DROP DATABASE
    const dropDbMatch = trimmed.match(/^DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_-]+)/i);
    if (dropDbMatch) {
      const targetDb = dropDbMatch[1];
      await deleteDatabase(targetDb);
      executionLogs.push(`🗑️ Database '${targetDb}' dropped.`);
      if (currentDb === targetDb.toLowerCase()) {
        currentDb = 'main_db';
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

    // 7. Regular SQL Execution (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, etc.)
    const { db } = getDbConnection(currentDb);
    const isSelect = /^(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(trimmed);

    const stepResult = await new Promise((resolve) => {
      if (isSelect) {
        db.all(trimmed, [], (err, rows) => {
          if (err) {
            return resolve({
              success: false,
              error: err.message,
              sql: trimmed,
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
        db.run(trimmed, function (err) {
          if (err) {
            return resolve({
              success: false,
              error: err.message,
              sql: trimmed,
              database: currentDb,
            });
          }
          return resolve({
            success: true,
            columns: ['status', 'rows_affected'],
            rows: [
              {
                status: 'SUCCESS',
                rows_affected: this.changes || 0,
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
      };
    }

    // Save as finalResult (if user has multiple SELECTs or mutations, last active result is displayed)
    finalResult = stepResult;
  }

  const elapsed = (performance.now() - startTime).toFixed(2);

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
      "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_codeforge_%';",
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
  const existing = fs.readdirSync(DB_DIR).filter((f) => f.endsWith('.sqlite'));
  if (existing.length > 0) return;

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

  // 3. Default main_db
  const { db: mainDb } = getDbConnection('main_db');
  await new Promise((resolve) => {
    mainDb.exec(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        role TEXT DEFAULT 'developer',
        rating INTEGER DEFAULT 1500
      );

      INSERT INTO users (username, role, rating) VALUES
        ('admin', 'system_admin', 2500),
        ('himanshu', 'lead_architect', 2200),
        ('alex', 'fullstack_dev', 1850);
      `,
      () => resolve()
    );
  });

  console.log('✅ Sample databases seeded successfully.');
}
