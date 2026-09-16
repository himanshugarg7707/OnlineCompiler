// In-Browser Multi-Database SQL Engine for CodeForge AI
// Provides zero-latency, offline, and serverless SQL execution for Vercel and local environments.
// Supports MySQL / Postgres DDL: CREATE DATABASE, USE, USE DATABASE, SHOW DATABASES, SHOW TABLES, DESCRIBE, etc.

const STORAGE_PREFIX = 'codeforge_sql_db_';
const DB_LIST_KEY = 'codeforge_sql_dbs_list';

// In-memory relational database state
class InMemoryDatabase {
  constructor(name) {
    this.name = name;
    this.tables = {};
    this.createdAt = new Date().toISOString();
  }

  createTable(tableName, columnDefs) {
    const cleanName = tableName.toLowerCase();
    this.tables[cleanName] = {
      name: tableName,
      columns: columnDefs, // array of { name, type, isPk, notNull, default }
      rows: [],
      autoIncrementSeq: 1,
    };
    return this.tables[cleanName];
  }

  getTable(tableName) {
    return this.tables[tableName.toLowerCase()];
  }

  dropTable(tableName) {
    delete this.tables[tableName.toLowerCase()];
  }
}

// Global active in-browser database storage
const inMemoryDatabases = new Map();
let currentActiveDbName = 'main_db';

/**
 * Initialize and seed initial databases
 */
function initDatabases() {
  if (inMemoryDatabases.size > 0) return;

  try {
    // Try loading saved databases from localStorage
    const savedList = localStorage.getItem(DB_LIST_KEY);
    if (savedList) {
      const dbNames = JSON.parse(savedList);
      dbNames.forEach((name) => {
        const raw = localStorage.getItem(STORAGE_PREFIX + name);
        if (raw) {
          const parsed = JSON.parse(raw);
          const db = new InMemoryDatabase(name);
          db.tables = parsed.tables || {};
          db.createdAt = parsed.createdAt || new Date().toISOString();
          inMemoryDatabases.set(name, db);
        }
      });
    }
  } catch (e) {
    console.warn('Failed to load SQL databases from storage:', e);
  }

  // If empty, seed realistic databases
  if (inMemoryDatabases.size === 0) {
    seedDefaultDatabases();
  }
}

function persistDatabases() {
  try {
    const list = Array.from(inMemoryDatabases.keys());
    localStorage.setItem(DB_LIST_KEY, JSON.stringify(list));
    for (const [name, db] of inMemoryDatabases.entries()) {
      localStorage.setItem(
        STORAGE_PREFIX + name,
        JSON.stringify({
          name: db.name,
          tables: db.tables,
          createdAt: db.createdAt,
        })
      );
    }
  } catch (e) {
    console.warn('Failed to persist databases to localStorage:', e);
  }
}

function seedDefaultDatabases() {
  // 1. ecommerce_db
  const ecommerce = new InMemoryDatabase('ecommerce_db');
  ecommerce.createTable('customers', [
    { name: 'customer_id', type: 'INTEGER', isPk: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'email', type: 'TEXT', notNull: true },
    { name: 'country', type: 'TEXT' },
  ]);
  ecommerce.tables.customers.rows = [
    { customer_id: 1, name: 'Alice Johnson', email: 'alice@example.com', country: 'USA' },
    { customer_id: 2, name: 'Bob Smith', email: 'bob@example.com', country: 'Canada' },
    { customer_id: 3, name: 'Charlie Brown', email: 'charlie@example.com', country: 'UK' },
    { customer_id: 4, name: 'Diana Prince', email: 'diana@example.com', country: 'Germany' },
  ];
  ecommerce.tables.customers.autoIncrementSeq = 5;

  ecommerce.createTable('products', [
    { name: 'product_id', type: 'INTEGER', isPk: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'category', type: 'TEXT' },
    { name: 'price', type: 'REAL' },
    { name: 'stock', type: 'INTEGER' },
  ]);
  ecommerce.tables.products.rows = [
    { product_id: 1, name: 'Quantum Laptop Pro', category: 'Electronics', price: 1299.99, stock: 45 },
    { product_id: 2, name: 'Wireless Headphones', category: 'Electronics', price: 249.5, stock: 120 },
    { product_id: 3, name: 'Mechanical Keyboard', category: 'Accessories', price: 119.0, stock: 85 },
    { product_id: 4, name: '4K Ultra HD Monitor', category: 'Electronics', price: 499.0, stock: 30 },
  ];
  ecommerce.tables.products.autoIncrementSeq = 5;

  inMemoryDatabases.set('ecommerce_db', ecommerce);

  // 2. main_db
  const mainDb = new InMemoryDatabase('main_db');
  mainDb.createTable('users', [
    { name: 'id', type: 'INTEGER', isPk: true },
    { name: 'username', type: 'TEXT', notNull: true },
    { name: 'role', type: 'TEXT' },
    { name: 'rating', type: 'INTEGER' },
  ]);
  mainDb.tables.users.rows = [
    { id: 1, username: 'admin', role: 'system_admin', rating: 2500 },
    { id: 2, username: 'himanshu', role: 'lead_architect', rating: 2200 },
    { id: 3, username: 'alex', role: 'developer', rating: 1850 },
  ];
  mainDb.tables.users.autoIncrementSeq = 4;

  mainDb.createTable('employees', [
    { name: 'id', type: 'INTEGER', isPk: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'department', type: 'TEXT' },
    { name: 'salary', type: 'INTEGER' },
  ]);
  mainDb.tables.employees.rows = [
    { id: 1, name: 'Alex Mercer', department: 'Engineering', salary: 95000 },
    { id: 2, name: 'Sarah Connor', department: 'Management', salary: 120000 },
    { id: 3, name: 'Bruce Wayne', department: 'Executive', salary: 250000 },
    { id: 4, name: 'Peter Parker', department: 'Engineering', salary: 85000 },
    { id: 5, name: 'Clark Kent', department: 'Editorial', salary: 75000 },
    { id: 6, name: 'Diana Prince', department: 'Operations', salary: 110000 },
    { id: 7, name: 'Tony Stark', department: 'Engineering', salary: 300000 },
    { id: 8, name: 'Barry Allen', department: 'Research', salary: 90000 },
  ];
  mainDb.tables.employees.autoIncrementSeq = 9;

  inMemoryDatabases.set('main_db', mainDb);

  persistDatabases();
}

/**
 * Split multi-statement SQL script
 */
function splitStatements(sql) {
  const stmts = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

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
    if (inLineComment) continue;

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
    if (inBlockComment) continue;

    if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    else if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed) stmts.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) stmts.push(current.trim());
  return stmts;
}

/**
 * Parse value literals from SQL
 */
function parseLiteral(valStr) {
  const trimmed = valStr.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  if (/^'(.*)'$/s.test(trimmed)) return trimmed.slice(1, -1).replace(/''/g, "'");
  if (/^"(.*)"$/s.test(trimmed)) return trimmed.slice(1, -1).replace(/""/g, '"');
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^true$/i.test(trimmed)) return 1;
  if (/^false$/i.test(trimmed)) return 0;
  return trimmed;
}

/**
 * Main in-browser SQL Execution Engine
 */
export async function executeSqlInBrowser(sqlQuery) {
  initDatabases();
  const startTime = performance.now();

  const clean = (sqlQuery || '').trim();
  if (!clean) {
    return {
      success: true,
      output: '✅ Empty query.\n',
      sqlData: { columns: [], rows: [], rowCount: 0, executionTimeMs: '0.00' },
      time: '0.000',
      memory: 1024,
      statusCode: 0,
    };
  }

  const statements = splitStatements(clean);
  let finalResult = null;
  const executionLogs = [];

  for (const rawStmt of statements) {
    const stmt = rawStmt.trim();
    if (!stmt) continue;

    // 1. CREATE DATABASE / CREATE SCHEMA
    const createDbMatch = stmt.match(/^CREATE\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_-]+)/i);
    if (createDbMatch) {
      const dbName = createDbMatch[1].toLowerCase();
      if (!inMemoryDatabases.has(dbName)) {
        inMemoryDatabases.set(dbName, new InMemoryDatabase(dbName));
        persistDatabases();
      }
      executionLogs.push(`✅ Database '${dbName}' created.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Database '${dbName}' created successfully.` }],
        rowCount: 1,
        type: 'DDL',
      };
      continue;
    }

    // 2. USE <db> or USE DATABASE <db>
    const useDbMatch = stmt.match(/^USE(?:\s+(?:DATABASE|SCHEMA))?\s+([a-zA-Z0-9_-]+)/i);
    if (useDbMatch) {
      const dbName = useDbMatch[1].toLowerCase();
      if (!inMemoryDatabases.has(dbName)) {
        inMemoryDatabases.set(dbName, new InMemoryDatabase(dbName));
        persistDatabases();
      }
      currentActiveDbName = dbName;
      executionLogs.push(`🔄 Database changed to '${dbName}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Database changed to '${dbName}'.` }],
        rowCount: 1,
        type: 'USE',
      };
      continue;
    }

    // 3. SHOW DATABASES / SHOW SCHEMAS
    if (/^SHOW\s+(?:DATABASES|SCHEMAS)\b/i.test(stmt)) {
      const list = Array.from(inMemoryDatabases.values());
      finalResult = {
        success: true,
        columns: ['Database', 'Tables_Count'],
        rows: list.map((d) => ({
          Database: d.name,
          Tables_Count: Object.keys(d.tables).length,
        })),
        rowCount: list.length,
        type: 'SELECT',
      };
      continue;
    }

    // 4. SHOW TABLES
    if (/^SHOW\s+TABLES\b/i.test(stmt)) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName) || inMemoryDatabases.get('main_db');
      const tableNames = Object.keys(activeDb.tables);
      finalResult = {
        success: true,
        columns: [`Tables_in_${activeDb.name}`],
        rows: tableNames.map((t) => ({ [`Tables_in_${activeDb.name}`]: t })),
        rowCount: tableNames.length,
        type: 'SELECT',
      };
      continue;
    }

    // 5. DESCRIBE / DESC <table>
    const descMatch = stmt.match(/^(?:DESCRIBE|DESC)\s+([a-zA-Z0-9_"-]+)/i);
    if (descMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const tableName = descMatch[1].replace(/["']/g, '').toLowerCase();
      const table = activeDb?.getTable(tableName);
      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table '${tableName}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }
      finalResult = {
        success: true,
        columns: ['Field', 'Type', 'Null', 'Key', 'Default'],
        rows: table.columns.map((c) => ({
          Field: c.name,
          Type: c.type || 'TEXT',
          Null: c.notNull ? 'NO' : 'YES',
          Key: c.isPk ? 'PRI' : '',
          Default: c.default === undefined ? 'NULL' : String(c.default),
        })),
        rowCount: table.columns.length,
        type: 'SELECT',
      };
      continue;
    }

    // 6. DROP TABLE
    const dropTableMatch = stmt.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_"-]+)/i);
    if (dropTableMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const tbl = dropTableMatch[1].replace(/["']/g, '');
      activeDb?.dropTable(tbl);
      persistDatabases();
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Table '${tbl}' dropped.` }],
        rowCount: 1,
        type: 'DDL',
      };
      continue;
    }

    // 7. CREATE TABLE
    const createTableMatch = stmt.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"-]+)\s*\(([\s\S]+)\)/i);
    if (createTableMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName) || inMemoryDatabases.get('main_db');
      const tableName = createTableMatch[1].replace(/["']/g, '');
      const body = createTableMatch[2];

      const columnDefs = [];
      const lines = body.split(/,(?![^(]*\))/);

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || /^PRIMARY\s+KEY/i.test(trimmedLine) || /^FOREIGN\s+KEY/i.test(trimmedLine)) {
          continue;
        }
        const parts = trimmedLine.split(/\s+/);
        const colName = parts[0].replace(/["'`]/g, '');
        const colType = (parts[1] || 'TEXT').toUpperCase();
        const isPk = /PRIMARY\s+KEY/i.test(trimmedLine);
        const notNull = /NOT\s+NULL/i.test(trimmedLine);

        columnDefs.push({
          name: colName,
          type: colType,
          isPk,
          notNull,
        });
      }

      activeDb.createTable(tableName, columnDefs);
      persistDatabases();
      executionLogs.push(`✅ Table '${tableName}' created in '${activeDb.name}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Table '${tableName}' created successfully.` }],
        rowCount: 1,
        type: 'DDL',
      };
      continue;
    }

    // 8. INSERT INTO
    const insertMatch = stmt.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_"-]+)(?:\s*\(([^)]+)\))?\s*VALUES\s*([\s\S]+)/i);
    if (insertMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const tableName = insertMatch[1].replace(/["']/g, '').toLowerCase();
      const table = activeDb?.getTable(tableName);

      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table '${tableName}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }

      const explicitCols = insertMatch[2]
        ? insertMatch[2].split(',').map((c) => c.trim().replace(/["'`]/g, ''))
        : table.columns.map((c) => c.name);

      const rawValuesBlock = insertMatch[3].trim();
      const tuples = rawValuesBlock.match(/\(([^)]+)\)/g) || [];

      let rowsInserted = 0;
      for (const tuple of tuples) {
        const inner = tuple.slice(1, -1);
        const valTokens = inner.split(/,(?![^(]*\))/).map((v) => parseLiteral(v));

        const rowObj = {};
        // Set defaults / auto increment for primary keys
        for (const col of table.columns) {
          if (col.isPk && col.type.includes('INT')) {
            rowObj[col.name] = table.autoIncrementSeq++;
          } else {
            rowObj[col.name] = null;
          }
        }

        // Apply provided values
        explicitCols.forEach((colName, idx) => {
          if (idx < valTokens.length) {
            rowObj[colName] = valTokens[idx];
          }
        });

        table.rows.push(rowObj);
        rowsInserted++;
      }

      persistDatabases();
      finalResult = {
        success: true,
        columns: ['status', 'rows_affected'],
        rows: [{ status: 'SUCCESS', rows_affected: rowsInserted }],
        rowCount: rowsInserted,
        type: 'MUTATION',
      };
      continue;
    }

    // 9. DELETE FROM
    const deleteMatch = stmt.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_"-]+)([\s\S]*)/i);
    if (deleteMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const tableName = deleteMatch[1].replace(/["'`]/g, '').toLowerCase();
      const restClause = deleteMatch[2].trim();
      const table = activeDb?.getTable(tableName);

      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table '${tableName}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }

      let deletedCount = 0;
      const whereMatch = restClause.match(/WHERE\s+([\s\S]+?)(?=(?:\s+(?:ORDER|GROUP|LIMIT)\b)|$)/i);
      if (whereMatch) {
        const condStr = whereMatch[1].trim();
        const condMatch = condStr.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=)\s*(.+)/);
        if (condMatch) {
          const field = condMatch[1].trim();
          const op = condMatch[2].trim();
          const targetVal = parseLiteral(condMatch[3].trim());

          const initialLen = table.rows.length;
          table.rows = table.rows.filter((r) => {
            const actual = r[field];
            if (op === '=') return String(actual) !== String(targetVal);
            if (op === '!=') return String(actual) === String(targetVal);
            if (op === '>') return !(Number(actual) > Number(targetVal));
            if (op === '<') return !(Number(actual) < Number(targetVal));
            if (op === '>=') return !(Number(actual) >= Number(targetVal));
            if (op === '<=') return !(Number(actual) <= Number(targetVal));
            return false;
          });
          deletedCount = initialLen - table.rows.length;
        }
      } else {
        deletedCount = table.rows.length;
        table.rows = [];
      }

      persistDatabases();
      executionLogs.push(`🗑️ ${deletedCount} row(s) deleted from '${tableName}'.`);
      finalResult = {
        success: true,
        columns: table.columns.map((c) => c.name),
        rows: [...table.rows],
        rowCount: table.rows.length,
        type: 'MUTATION_PREVIEW',
        previewTable: tableName,
      };
      continue;
    }

    // 10. UPDATE
    const updateMatch = stmt.match(/^UPDATE\s+([a-zA-Z0-9_"-]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (updateMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const tableName = updateMatch[1].replace(/["'`]/g, '').toLowerCase();
      const setClause = updateMatch[2].trim();
      const whereClause = updateMatch[3] ? updateMatch[3].trim() : '';
      const table = activeDb?.getTable(tableName);

      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table '${tableName}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }

      const updates = setClause.split(',').map((p) => {
        const [k, v] = p.split('=');
        return { field: k.trim().replace(/["'`]/g, ''), val: parseLiteral(v.trim()) };
      });

      let updatedCount = 0;
      table.rows.forEach((r) => {
        let matches = true;
        if (whereClause) {
          const condMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=)\s*(.+)/);
          if (condMatch) {
            const field = condMatch[1].trim();
            const op = condMatch[2].trim();
            const targetVal = parseLiteral(condMatch[3].trim());
            const actual = r[field];
            if (op === '=') matches = String(actual) === String(targetVal);
            else if (op === '!=') matches = String(actual) !== String(targetVal);
            else if (op === '>') matches = Number(actual) > Number(targetVal);
            else if (op === '<') matches = Number(actual) < Number(targetVal);
            else if (op === '>=') matches = Number(actual) >= Number(targetVal);
            else if (op === '<=') matches = Number(actual) <= Number(targetVal);
          }
        }
        if (matches) {
          updates.forEach((u) => {
            r[u.field] = u.val;
          });
          updatedCount++;
        }
      });

      persistDatabases();
      executionLogs.push(`✏️ ${updatedCount} row(s) updated in '${tableName}'.`);
      finalResult = {
        success: true,
        columns: table.columns.map((c) => c.name),
        rows: [...table.rows],
        rowCount: table.rows.length,
        type: 'MUTATION_PREVIEW',
        previewTable: tableName,
      };
      continue;
    }

    // 11. SELECT
    const selectMatch = stmt.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_"-]+)([\s\S]*)/i);
    if (selectMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const columnsClause = selectMatch[1].trim();
      const tableName = selectMatch[2].replace(/["']/g, '').toLowerCase();
      const restClause = selectMatch[3].trim();

      const table = activeDb?.getTable(tableName);
      if (!table) {
        return {
          success: false,
          output: '',
          error: `Table '${tableName}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }

      let resultRows = [...table.rows];

      // Handle simple WHERE clause
      const whereMatch = restClause.match(/WHERE\s+([\s\S]+?)(?=(?:\s+(?:ORDER|GROUP|LIMIT)\b)|$)/i);
      if (whereMatch) {
        const condition = whereMatch[1].trim();
        const eqMatch = condition.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=)\s*(.+)/);
        if (eqMatch) {
          const field = eqMatch[1].trim();
          const op = eqMatch[2].trim();
          const targetVal = parseLiteral(eqMatch[3].trim());

          resultRows = resultRows.filter((r) => {
            const actual = r[field];
            if (op === '=') return String(actual) === String(targetVal);
            if (op === '!=') return String(actual) !== String(targetVal);
            if (op === '>') return Number(actual) > Number(targetVal);
            if (op === '<') return Number(actual) < Number(targetVal);
            if (op === '>=') return Number(actual) >= Number(targetVal);
            if (op === '<=') return Number(actual) <= Number(targetVal);
            return true;
          });
        }
      }

      // Check for aggregates like sum(col), count(*), count(col), avg(col), min(col), max(col)
      const aggMatch = columnsClause.match(/^(SUM|COUNT|AVG|MIN|MAX)\s*\(([^)]+)\)$/i);
      if (aggMatch) {
        const func = aggMatch[1].toUpperCase();
        const arg = aggMatch[2].trim().replace(/["'`]/g, '');

        let aggVal = 0;
        if (func === 'COUNT') {
          aggVal = resultRows.length;
        } else if (func === 'SUM') {
          aggVal = resultRows.reduce((acc, r) => acc + (Number(r[arg]) || 0), 0);
        } else if (func === 'AVG') {
          const total = resultRows.reduce((acc, r) => acc + (Number(r[arg]) || 0), 0);
          aggVal = resultRows.length ? Number((total / resultRows.length).toFixed(2)) : 0;
        } else if (func === 'MIN') {
          const nums = resultRows.map((r) => Number(r[arg])).filter((n) => !isNaN(n));
          aggVal = nums.length ? Math.min(...nums) : 0;
        } else if (func === 'MAX') {
          const nums = resultRows.map((r) => Number(r[arg])).filter((n) => !isNaN(n));
          aggVal = nums.length ? Math.max(...nums) : 0;
        }

        finalResult = {
          success: true,
          columns: [columnsClause],
          rows: [{ [columnsClause]: aggVal }],
          rowCount: 1,
          type: 'SELECT',
        };
        continue;
      }

      // Handle LIMIT
      const limitMatch = restClause.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        const offset = parseInt(limitMatch[2] || '0', 10);
        resultRows = resultRows.slice(offset, offset + limit);
      }

      // Determine output columns
      let outColumns = [];
      if (columnsClause === '*') {
        outColumns = table.columns.map((c) => c.name);
      } else {
        outColumns = columnsClause.split(',').map((c) => c.trim().replace(/["'`]/g, ''));
      }

      finalResult = {
        success: true,
        columns: outColumns,
        rows: resultRows,
        rowCount: resultRows.length,
        type: 'SELECT',
      };
      continue;
    }

    // Default generic execution
    finalResult = {
      success: true,
      columns: ['status'],
      rows: [{ status: 'Query executed successfully.' }],
      rowCount: 1,
      type: 'MUTATION',
    };
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

  // Format ascii table
  let asciiOutput = '';
  if (finalResult && finalResult.rows && finalResult.rows.length > 0) {
    const cols = finalResult.columns || Object.keys(finalResult.rows[0]);
    const colWidths = {};
    cols.forEach((col) => {
      colWidths[col] = Math.max(
        col.length,
        ...finalResult.rows.map((r) => String(r[col] ?? '').length)
      );
    });

    const headerLine = cols.map((c) => c.padEnd(colWidths[c])).join(' | ');
    const sepLine = cols.map((c) => '-'.repeat(colWidths[c])).join('-+-');
    const rowLines = finalResult.rows
      .map((r) => cols.map((c) => String(r[c] ?? 'NULL').padEnd(colWidths[c])).join(' | '))
      .join('\n');

    asciiOutput = `${headerLine}\n${sepLine}\n${rowLines}\n\n(${finalResult.rowCount} rows returned in ${((performance.now() - startTime)).toFixed(2)}ms)\n`;
  } else {
    asciiOutput = `✅ Query executed successfully. (0 rows returned)\n`;
  }

  if (executionLogs.length > 0) {
    asciiOutput = executionLogs.join('\n') + '\n\n' + asciiOutput;
  }

  return {
    success: true,
    output: asciiOutput,
    sqlData: {
      ...finalResult,
      database: currentActiveDbName,
      executionTimeMs: ((performance.now() - startTime)).toFixed(2),
    },
    error: null,
    time: elapsed,
    memory: 1024,
    statusCode: 0,
  };
}
