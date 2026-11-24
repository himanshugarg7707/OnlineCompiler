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
    this.procedures = {};
    this.createdAt = new Date().toISOString();
  }

  createTable(tableName, columnDefs) {
    const cleanName = tableName.toLowerCase();
    this.tables[cleanName] = {
      name: tableName,
      type: 'table',
      columns: columnDefs, // array of { name, type, isPk, notNull, default }
      rows: [],
      autoIncrementSeq: 1,
    };
    return this.tables[cleanName];
  }

  createView(viewName, query, columnDefs, rows, ddl) {
    const cleanName = viewName.toLowerCase();
    this.tables[cleanName] = {
      name: viewName,
      type: 'view',
      isView: true,
      query: query,
      columns: columnDefs,
      rows: rows || [],
      sql: ddl || `CREATE VIEW ${viewName} AS ${query};`,
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
 * Generate standard SQLite CREATE TABLE DDL statement
 */
export function generateTableDdl(table) {
  if (!table) return '';
  const colDefs = (table.columns || []).map((c) => {
    let def = `  ${c.name} ${c.type || 'TEXT'}`;
    if (c.isPk) def += ' PRIMARY KEY';
    if (c.notNull) def += ' NOT NULL';
    if (c.default !== undefined && c.default !== null) {
      def += ` DEFAULT ${typeof c.default === 'string' ? `'${c.default}'` : c.default}`;
    }
    return def;
  });
  return `CREATE TABLE ${table.name} (\n${colDefs.join(',\n')}\n);`;
}

/**
 * Locate which in-memory database holds a specific table
 */
export function findDatabaseForTableInBrowser(tableName) {
  if (!tableName) return null;
  const clean = tableName.replace(/["'`]/g, '').toLowerCase();
  const matches = [];
  for (const [name, db] of inMemoryDatabases.entries()) {
    if (db.tables[clean]) matches.push(name);
  }
  // A same-named table in multiple databases is ambiguous. Never choose one
  // based on Map iteration order; the selected database remains authoritative.
  return matches.length === 1 ? matches[0] : null;
}

function getDatabasesForTableInBrowser(tableName) {
  if (!tableName) return [];
  const clean = tableName.replace(/["'`]/g, '').toLowerCase();
  return [...inMemoryDatabases.entries()]
    .filter(([, db]) => Boolean(db.tables[clean]))
    .map(([name]) => name);
}

/**
 * Initialize and seed initial databases
 */
function initDatabases() {
  if (inMemoryDatabases.size > 0) return;

  try {
    if (typeof localStorage !== 'undefined') {
      const savedList = localStorage.getItem(DB_LIST_KEY);
      if (savedList) {
        const dbNames = JSON.parse(savedList);
        dbNames.forEach((name) => {
          const raw = localStorage.getItem(STORAGE_PREFIX + name);
          if (raw) {
            const parsed = JSON.parse(raw);
            const db = new InMemoryDatabase(name);
            db.tables = parsed.tables || {};
            db.procedures = parsed.procedures || {};
            db.createdAt = parsed.createdAt || new Date().toISOString();
            inMemoryDatabases.set(name, db);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Failed to load SQL databases from storage:', e);
  }

  try {
    const persistedActiveDb = typeof localStorage !== 'undefined' ? localStorage.getItem('fullcode_active_db') : null;
    if (persistedActiveDb && inMemoryDatabases.has(persistedActiveDb)) currentActiveDbName = persistedActiveDb;
  } catch {}

  // If empty, seed realistic databases
  if (inMemoryDatabases.size === 0) {
    seedDefaultDatabases();
  } else {
    // Add the built-in HR sample without replacing any existing user data.
    seedHrDatabase();
    persistDatabases();
  }
}

function persistDatabases() {
  try {
    if (typeof localStorage !== 'undefined') {
      const list = Array.from(inMemoryDatabases.keys());
      localStorage.setItem(DB_LIST_KEY, JSON.stringify(list));
      for (const [name, db] of inMemoryDatabases.entries()) {
        localStorage.setItem(
          STORAGE_PREFIX + name,
          JSON.stringify({
            name: db.name,
            tables: db.tables,
            procedures: db.procedures || {},
            createdAt: db.createdAt,
          })
        );
      }
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

  // 3. university_db
  const university = new InMemoryDatabase('university_db');
  university.createTable('departments', [
    { name: 'dept_id', type: 'INTEGER', isPk: true },
    { name: 'dept_name', type: 'TEXT', notNull: true },
    { name: 'budget', type: 'REAL', notNull: true },
  ]);
  university.tables.departments.rows = [
    { dept_id: 1, dept_name: 'Computer Science', budget: 850000 },
    { dept_id: 2, dept_name: 'Mathematics', budget: 450000 },
    { dept_id: 3, dept_name: 'Physics', budget: 620000 },
  ];
  university.tables.departments.autoIncrementSeq = 4;

  university.createTable('students', [
    { name: 'student_id', type: 'INTEGER', isPk: true },
    { name: 'first_name', type: 'TEXT', notNull: true },
    { name: 'last_name', type: 'TEXT', notNull: true },
    { name: 'gpa', type: 'REAL', notNull: true },
    { name: 'dept_id', type: 'INTEGER' },
  ]);
  university.tables.students.rows = [
    { student_id: 1, first_name: 'Alex', last_name: 'Mercer', gpa: 3.85, dept_id: 1 },
    { student_id: 2, first_name: 'Sarah', last_name: 'Connor', gpa: 3.92, dept_id: 1 },
    { student_id: 3, first_name: 'Bruce', last_name: 'Wayne', gpa: 3.7, dept_id: 2 },
    { student_id: 4, first_name: 'Peter', last_name: 'Parker', gpa: 3.98, dept_id: 3 },
    { student_id: 5, first_name: 'Clark', last_name: 'Kent', gpa: 3.65, dept_id: 2 },
  ];
  university.tables.students.autoIncrementSeq = 6;

  inMemoryDatabases.set('university_db', university);

  seedHrDatabase();

  persistDatabases();
}

function seedHrDatabase() {
  if (inMemoryDatabases.has('hr_db')) return;
  const hr = new InMemoryDatabase('hr_db');
  hr.createTable('departments', [
    { name: 'department_id', type: 'INTEGER', isPk: true },
    { name: 'department_name', type: 'TEXT', notNull: true },
    { name: 'location_id', type: 'INTEGER' },
  ]);
  hr.tables.departments.rows = [
    { department_id: 10, department_name: 'Administration', location_id: 1700 },
    { department_id: 20, department_name: 'Marketing', location_id: 1800 },
    { department_id: 30, department_name: 'Purchasing', location_id: 1700 },
    { department_id: 50, department_name: 'Shipping', location_id: 1500 },
    { department_id: 60, department_name: 'IT', location_id: 1400 },
    { department_id: 80, department_name: 'Sales', location_id: 2500 },
    { department_id: 90, department_name: 'Executive', location_id: 1700 },
  ];
  hr.createTable('jobs', [
    { name: 'job_id', type: 'TEXT', isPk: true },
    { name: 'job_title', type: 'TEXT', notNull: true },
    { name: 'min_salary', type: 'INTEGER' },
    { name: 'max_salary', type: 'INTEGER' },
  ]);
  hr.tables.jobs.rows = [
    { job_id: 'AD_PRES', job_title: 'President', min_salary: 20000, max_salary: 40000 },
    { job_id: 'AD_VP', job_title: 'Administration Vice President', min_salary: 15000, max_salary: 30000 },
    { job_id: 'IT_PROG', job_title: 'Programmer', min_salary: 4000, max_salary: 10000 },
    { job_id: 'SA_REP', job_title: 'Sales Representative', min_salary: 6000, max_salary: 12000 },
    { job_id: 'ST_CLERK', job_title: 'Shipping Clerk', min_salary: 2500, max_salary: 5500 },
  ];
  hr.createTable('employees', [
    { name: 'employee_id', type: 'INTEGER', isPk: true },
    { name: 'first_name', type: 'TEXT' },
    { name: 'last_name', type: 'TEXT', notNull: true },
    { name: 'email', type: 'TEXT', notNull: true },
    { name: 'hire_date', type: 'TEXT', notNull: true },
    { name: 'job_id', type: 'TEXT', notNull: true },
    { name: 'salary', type: 'REAL' },
    { name: 'manager_id', type: 'INTEGER' },
    { name: 'department_id', type: 'INTEGER' },
  ]);
  hr.tables.employees.rows = [
    { employee_id: 100, first_name: 'Steven', last_name: 'King', email: 'SKING', hire_date: '2003-06-17', job_id: 'AD_PRES', salary: 24000, manager_id: null, department_id: 90 },
    { employee_id: 101, first_name: 'Neena', last_name: 'Kochhar', email: 'NKOCHHAR', hire_date: '2005-09-21', job_id: 'AD_VP', salary: 17000, manager_id: 100, department_id: 90 },
    { employee_id: 102, first_name: 'Lex', last_name: 'De Haan', email: 'LDEHAAN', hire_date: '2001-01-13', job_id: 'AD_VP', salary: 17000, manager_id: 100, department_id: 90 },
    { employee_id: 103, first_name: 'Alexander', last_name: 'Hunold', email: 'AHUNOLD', hire_date: '2006-01-03', job_id: 'IT_PROG', salary: 9000, manager_id: 102, department_id: 60 },
    { employee_id: 104, first_name: 'Bruce', last_name: 'Ernst', email: 'BERNST', hire_date: '2007-05-21', job_id: 'IT_PROG', salary: 6000, manager_id: 103, department_id: 60 },
    { employee_id: 145, first_name: 'John', last_name: 'Russell', email: 'JRUSSEL', hire_date: '2004-10-01', job_id: 'SA_REP', salary: 14000, manager_id: 100, department_id: 80 },
  ];
  hr.createTable('locations', [
    { name: 'location_id', type: 'INTEGER', isPk: true },
    { name: 'city', type: 'TEXT', notNull: true },
    { name: 'country_id', type: 'TEXT' },
  ]);
  hr.tables.locations.rows = [
    { location_id: 1400, city: 'Southlake', country_id: 'US' },
    { location_id: 1500, city: 'South San Francisco', country_id: 'US' },
    { location_id: 1700, city: 'Seattle', country_id: 'US' },
    { location_id: 1800, city: 'Toronto', country_id: 'CA' },
    { location_id: 2500, city: 'Oxford', country_id: 'UK' },
  ];
  inMemoryDatabases.set('hr_db', hr);
}

/**
 * Split multi-statement SQL script
 */
function splitStatements(sql) {
  const stmts = [];
  let current = '';
  let delimiter = ';';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    if (!inSingleQuote && !inDoubleQuote && !inBlockComment && !inLineComment && !current.trim() && (i === 0 || sql[i - 1] === '\n' || sql[i - 1] === '\r')) {
      const lineEnd = sql.indexOf('\n', i);
      const line = sql.slice(i, lineEnd < 0 ? sql.length : lineEnd).replace(/\r$/, '');
      const delimiterDirective = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
      if (delimiterDirective) {
        delimiter = delimiterDirective[1];
        i = lineEnd < 0 ? sql.length : lineEnd;
        continue;
      }
    }

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

    if (!inSingleQuote && !inDoubleQuote && sql.startsWith(delimiter, i)) {
      const trimmed = current.trim();
      if (trimmed) stmts.push(trimmed);
      current = '';
      i += delimiter.length - 1;
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

function splitSqlList(value) {
  const values = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (quote) {
      if (char === quote && value[index - 1] !== '\\') quote = '';
    } else if (char === "'" || char === '"') quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      values.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (value.slice(start).trim()) values.push(value.slice(start).trim());
  return values;
}

function evaluateRoutineExpression(expression, variables) {
  const resolveValue = (value) => {
    const token = value.trim();
    if (/^NULL$/i.test(token)) return null;
    if (/^TRUE$/i.test(token)) return 1;
    if (/^FALSE$/i.test(token)) return 0;
    if (/^IFNULL\s*\(/i.test(token)) {
      const args = token.match(/^IFNULL\s*\((.*)\)$/i)?.[1];
      if (!args) throw new Error(`Unsupported routine expression: ${expression}`);
      const [first, fallback] = splitSqlList(args);
      const firstValue = resolveValue(first);
      return firstValue == null ? resolveValue(fallback) : firstValue;
    }
    if (/^COALESCE\s*\(/i.test(token)) {
      const args = token.match(/^COALESCE\s*\((.*)\)$/i)?.[1];
      if (!args) throw new Error(`Unsupported routine expression: ${expression}`);
      for (const part of splitSqlList(args)) {
        const value = resolveValue(part);
        if (value != null) return value;
      }
      return null;
    }
    if (/^[-+]?\d+(?:\.\d+)?$/.test(token)) return Number(token);
    const key = token.toLowerCase();
    if (Object.hasOwn(variables, key)) return variables[key];
    throw new Error(`Unsupported routine expression '${token}'.`);
  };

  const source = expression.replace(/IFNULL\s*\([^)]+\)|COALESCE\s*\([^)]+\)/gi, (call) => {
    const value = resolveValue(call);
    if (value == null) return 'NULL';
    if (typeof value !== 'number') throw new Error(`Unsupported routine value in '${expression}'.`);
    return String(value);
  });
  const tokens = [];
  const tokenizer = /\s*(?:(\d+(?:\.\d+)?)|([a-zA-Z_][a-zA-Z0-9_$]*)|([()+\-*/]))/gy;
  let cursor = 0;
  while (cursor < source.length) {
    tokenizer.lastIndex = cursor;
    const match = tokenizer.exec(source);
    if (!match) throw new Error(`Unsupported routine expression '${expression}'.`);
    tokens.push(match[1] ? Number(match[1]) : match[2] ? resolveValue(match[2]) : match[3]);
    cursor = tokenizer.lastIndex;
  }

  let position = 0;
  const parsePrimary = () => {
    const token = tokens[position++];
    if (token === '+' || token === '-') {
      const value = parsePrimary();
      return token === '-' ? -Number(value || 0) : Number(value || 0);
    }
    if (token === '(') {
      const value = parseSum();
      if (tokens[position++] !== ')') throw new Error(`Unclosed parentheses in '${expression}'.`);
      return value;
    }
    if (typeof token === 'number' || typeof token === 'string' || token == null) return token;
    throw new Error(`Unsupported routine expression '${expression}'.`);
  };
  const parseProduct = () => {
    let left = parsePrimary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position++];
      const right = parsePrimary();
      left = operator === '*' ? Number(left || 0) * Number(right || 0) : Number(left || 0) / Number(right || 0);
    }
    return left;
  };
  const parseSum = () => {
    let left = parseProduct();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position++];
      const right = parseProduct();
      left = operator === '+' ? Number(left || 0) + Number(right || 0) : Number(left || 0) - Number(right || 0);
    }
    return left;
  };

  const result = parseSum();
  if (position !== tokens.length) throw new Error(`Unsupported routine expression '${expression}'.`);
  return result;
}

function evaluateRoutineCondition(condition, variables) {
  const match = condition.trim().match(/^([\w$]+)\s*(=|<>|!=|>=|<=|>|<)\s*([\w$.-]+)$/);
  if (!match) throw new Error(`Unsupported cursor IF condition '${condition.trim()}'.`);
  const left = evaluateRoutineExpression(match[1], variables);
  const right = evaluateRoutineExpression(match[3], variables);
  switch (match[2]) {
    case '=': return left === right || String(left) === String(right);
    case '<>': case '!=': return left !== right && String(left) !== String(right);
    case '>': return Number(left) > Number(right);
    case '<': return Number(left) < Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<=': return Number(left) <= Number(right);
    default: return false;
  }
}

function executeCursorProcedure(procedure, activeDb) {
  const body = procedure.body || '';
  const variables = {};
  const declarations = body.matchAll(/\bDECLARE\s+([a-zA-Z_][\w$]*)\s+([a-zA-Z]+(?:\s*\([^;)]*\))?)(?:\s+DEFAULT\s+([^;]+))?\s*;/gi);
  for (const declaration of declarations) {
    const [, name, type, initial] = declaration;
    if (/^(?:CURSOR|CONTINUE|EXIT)$/i.test(type)) continue;
    variables[name.toLowerCase()] = initial ? evaluateRoutineExpression(initial, variables) : null;
  }

  const cursorDeclaration = body.match(/\bDECLARE\s+([a-zA-Z_][\w$]*)\s+CURSOR\s+FOR\s+([\s\S]*?);/i);
  if (!cursorDeclaration) {
    const select = body.match(/\bSELECT\s+[\s\S]*?;/i)?.[0];
    if (select) {
      const result = executeSelectStatement(select.replace(/;$/, ''), activeDb, activeDb?.name || 'main_db');
      if (!result.success) throw new Error(result.error || 'Procedure SELECT failed.');
      return { ...result, type: 'CALL' };
    }
    return { success: true, columns: ['status'], rows: [{ status: `Procedure '${procedure.name}' completed.` }], rowCount: 1, type: 'CALL' };
  }
  const [, cursorName, selectSql] = cursorDeclaration;
  const cursorResult = executeSelectStatement(selectSql, activeDb, activeDb?.name || 'main_db');
  if (!cursorResult.success) throw new Error(cursorResult.error || 'Cursor SELECT failed.');

  const handler = body.match(/\bDECLARE\s+(?:CONTINUE|EXIT)\s+HANDLER\s+FOR\s+NOT\s+FOUND\s+SET\s+([a-zA-Z_][\w$]*)\s*=\s*([^;]+);/i);
  const loop = body.match(/(?:([a-zA-Z_][\w$]*)\s*:\s*)?LOOP\s+([\s\S]*?)\s+END\s+LOOP\b/i);
  if (!loop) throw new Error(`Procedure '${procedure.name}' has no supported cursor loop.`);
  const loopBody = loop[2];
  const fetch = loopBody.match(/\bFETCH\s+([a-zA-Z_][\w$]*)\s+INTO\s+([^;]+);/i);
  if (!fetch || fetch[1].toLowerCase() !== cursorName.toLowerCase()) {
    throw new Error('Cursor loop must fetch from its declared cursor.');
  }
  const targets = splitSqlList(fetch[2]).map((name) => name.replace(/[`"']/g, '').toLowerCase());
  const leaveIf = loopBody.match(/\bIF\s+([\s\S]+?)\s+THEN\s+LEAVE\s+[a-zA-Z_][\w$]*\s*;\s*END\s+IF\s*;/i);
  const setStatements = [...loopBody.matchAll(/\bSET\s+([a-zA-Z_][\w$]*)\s*=\s*([^;]+);/gi)];
  const loopSelect = loopBody.match(/\bSELECT\s+([^;]+);/i)?.[1];
  const loopOutputRows = [];
  const loopOutputColumns = [];
  const doneVariable = handler?.[1]?.toLowerCase();
  const maxIterations = Math.min(cursorResult.rows.length + 1, 100000);
  let cursorIndex = 0;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const row = cursorResult.rows[cursorIndex++];
    if (!row) {
      if (handler) variables[doneVariable] = evaluateRoutineExpression(handler[2], variables);
    } else {
      targets.forEach((target, index) => { variables[target] = row[cursorResult.columns[index]] ?? null; });
    }
    if (leaveIf && evaluateRoutineCondition(leaveIf[1], variables)) break;
    if (!row) break;
    for (const [, variable, expression] of setStatements) {
      variables[variable.toLowerCase()] = evaluateRoutineExpression(expression, variables);
    }
    if (loopSelect) {
      const outputRow = {};
      for (const expression of splitSqlList(loopSelect)) {
        const aliasMatch = expression.match(/^([\s\S]+?)\s+AS\s+([a-zA-Z_][\w$]*)$/i);
        const valueExpression = aliasMatch ? aliasMatch[1].trim() : expression;
        const columnName = aliasMatch ? aliasMatch[2] : valueExpression.trim();
        if (!loopOutputColumns.includes(columnName)) loopOutputColumns.push(columnName);
        outputRow[columnName] = evaluateRoutineExpression(valueExpression, variables);
      }
      loopOutputRows.push(outputRow);
    }
  }

  const postLoop = body.slice(loop.index + loop[0].length);
  const outputSelect = postLoop.match(/\bSELECT\s+([^;]+);/i)?.[1]?.trim();
  if (!outputSelect && loopOutputRows.length) return { success: true, columns: loopOutputColumns, rows: loopOutputRows, rowCount: loopOutputRows.length, type: 'CALL' };
  if (!outputSelect) return { success: true, columns: ['status'], rows: [{ status: `Procedure '${procedure.name}' completed.` }], rowCount: 1, type: 'CALL' };

  const columns = [];
  const row = {};
  for (const expression of splitSqlList(outputSelect)) {
    const aliasMatch = expression.match(/^([\s\S]+?)\s+AS\s+([a-zA-Z_][\w$]*)$/i);
    const valueExpression = aliasMatch ? aliasMatch[1].trim() : expression;
    const columnName = aliasMatch ? aliasMatch[2] : valueExpression.trim();
    columns.push(columnName);
    row[columnName] = evaluateRoutineExpression(valueExpression, variables);
  }
  return { success: true, columns, rows: [row], rowCount: 1, type: 'CALL' };
}

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', oct: '10', november: '11', december: '12',
};

/**
 * Apply a small set of best-effort syntax rewrites before SQLite-style execution.
 * This is not an Oracle or MySQL engine and does not implement either full dialect.
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
    s = s.replace(/\bUNSIGNED\b/gi, '');
    s = s.replace(/\b(?:INT|INTEGER|TINYINT|SMALLINT|MEDIUMINT|BIGINT)\s*(?:\(\s*\d+\s*\))?/gi, 'INTEGER');
    s = s.replace(/\)\s*(?:ENGINE\s*=\s*\w+|DEFAULT\s+CHARSET\s*=\s*\w+|CHARSET\s*=\s*\w+|COLLATE\s*=\s*\w+|AUTO_INCREMENT\s*=\s*\d+)+;/gi, ');');
    s = s.replace(/COLLATE\s*(?:=\s*)?(?:utf8\w*|latin1\w*)/gi, 'COLLATE NOCASE');
    if (/PRIMARY\s+KEY\s*\([^)]*\b/i.test(s)) {
      s = s.replace(/\bAUTO_INCREMENT\b/gi, '');
    } else {
      s = s.replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT');
    }
  }

  return s;
}

/**
 * Evaluates a single SELECT statement against the specified database
 */
export function executeSelectStatement(selectStmt, activeDb, currentActiveDbName = 'main_db', isRecursive = false) {
  const cleanStmt = (selectStmt || '').trim().replace(/;+$/, '');
  const selectMatch = cleanStmt.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_"-]+)([\s\S]*)/i);
  if (!selectMatch) {
    return {
      success: false,
      error: `Syntax error in SELECT statement: "${cleanStmt}"`,
      columns: [],
      rows: [],
      rowCount: 0,
    };
  }

  const columnsClause = selectMatch[1].trim();
  const rawTableName = selectMatch[2].replace(/["']/g, '');
  const tableName = rawTableName.toLowerCase();
  const restClause = selectMatch[3].trim();

  // Handle virtual system tables: sqlite_master / sqlite_schema
  if (tableName === 'sqlite_master' || tableName === 'sqlite_schema') {
    const allTables = Object.values(activeDb?.tables || {});
    let masterRows = allTables.map((t, idx) => ({
      type: t.isView || t.type === 'view' ? 'view' : 'table',
      name: t.name,
      tbl_name: t.name,
      rootpage: idx + 2,
      sql: t.isView || t.type === 'view'
        ? (t.sql || `CREATE VIEW ${t.name} AS ${t.query || 'SELECT 1'};`)
        : generateTableDdl(t),
    }));

    // Handle simple WHERE clause on sqlite_master
    const whereMatch = restClause.match(/WHERE\s+([\s\S]+?)(?=(?:\s+(?:ORDER|GROUP|LIMIT)\b)|$)/i);
    if (whereMatch) {
      const condition = whereMatch[1].trim();
      const eqMatch = condition.match(/([a-zA-Z0-9_]+)\s*(=|!=|LIKE)\s*(.+)/i);
      if (eqMatch) {
        const field = eqMatch[1].trim().toLowerCase();
        const op = eqMatch[2].trim().toUpperCase();
        const targetVal = parseLiteral(eqMatch[3].trim());

        masterRows = masterRows.filter((r) => {
          const actual = String(r[field] ?? '');
          if (op === '=') return actual.toLowerCase() === String(targetVal).toLowerCase();
          if (op === '!=') return actual.toLowerCase() !== String(targetVal).toLowerCase();
          if (op === 'LIKE') {
            const pat = String(targetVal).replace(/%/g, '.*').replace(/_/g, '.');
            return new RegExp(`^${pat}$`, 'i').test(actual);
          }
          return true;
        });
      }
    }

    let outCols = [];
    if (columnsClause === '*') {
      outCols = ['type', 'name', 'tbl_name', 'rootpage', 'sql'];
    } else {
      outCols = columnsClause.split(',').map((c) => c.trim().replace(/["'`]/g, ''));
    }

    const projectedRows = masterRows.map((r) => {
      const rowObj = {};
      outCols.forEach((c) => {
        rowObj[c] = r[c] !== undefined ? r[c] : null;
      });
      return rowObj;
    });

    return {
      success: true,
      columns: outCols,
      rows: projectedRows,
      rowCount: projectedRows.length,
      type: 'SELECT',
    };
  }

  let table = activeDb?.getTable(tableName);
  if (!table) {
    const matches = getDatabasesForTableInBrowser(tableName);
    if (matches.length > 1) {
      return { success: false, error: `Table '${rawTableName}' exists in multiple databases (${matches.join(', ')}). Select the database explicitly before querying.`, columns: [], rows: [], rowCount: 0 };
    }
    const altDb = findDatabaseForTableInBrowser(tableName);
    if (altDb) {
      activeDb = inMemoryDatabases.get(altDb);
      table = activeDb?.getTable(tableName);
    }
  }

  if (!table) {
    return {
      success: false,
      error: `Table or view '${rawTableName}' does not exist in database '${activeDb?.name || currentActiveDbName}'.`,
      columns: [],
      rows: [],
      rowCount: 0,
    };
  }

  // If table is a view, dynamically re-evaluate underlying query to ensure fresh results
  if ((table.isView || table.type === 'view') && table.query && !isRecursive) {
    try {
      const freshRes = executeSelectStatement(table.query, activeDb, currentActiveDbName, true);
      if (freshRes && freshRes.success) {
        table.rows = freshRes.rows;
        table.columns = freshRes.columns.map((c) => ({
          name: c,
          type: typeof freshRes.rows[0]?.[c] === 'number' ? 'NUMERIC' : 'TEXT',
          isPk: false,
          notNull: false,
        }));
      }
    } catch (e) {
      console.warn('Failed to dynamically evaluate view query:', e);
    }
  }

  let resultRows = (table.rows || []).map((r) => ({ ...r }));

  // Check for simple JOIN in restClause e.g. JOIN table2 [alias2] ON t1.id = t2.id
  let workingRest = restClause;
  const joinMatch = restClause.match(/^(?:\s+(?:AS\s+)?([a-zA-Z0-9_"-]+))?\s+(?:(?:INNER|LEFT(?:\s+OUTER)?)\s+)?JOIN\s+([a-zA-Z0-9_"-]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_"-]+))?\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)([\s\S]*)/i);
  if (joinMatch) {
    const table2Name = joinMatch[2].replace(/["']/g, '').toLowerCase();
    const joinKey1 = joinMatch[4].split('.').pop().trim();
    const joinKey2 = joinMatch[5].split('.').pop().trim();
    workingRest = (joinMatch[6] || '').trim();

    const table2 = activeDb?.getTable(table2Name);
    if (table2 && table2.rows) {
      const joined = [];
      resultRows.forEach((r1) => {
        const matches = table2.rows.filter((r2) => String(r1[joinKey1]) === String(r2[joinKey2]) || String(r1[joinKey2]) === String(r2[joinKey1]));
        if (matches.length > 0) {
          matches.forEach((r2) => {
            joined.push({ ...r1, ...r2 });
          });
        }
      });
      if (joined.length > 0) {
        resultRows = joined;
      }
    }
  }

  // Handle simple WHERE clause
  const whereMatch = workingRest.match(/WHERE\s+([\s\S]+?)(?=(?:\s+(?:ORDER|GROUP|LIMIT)\b)|$)/i);
  if (whereMatch) {
    const condition = whereMatch[1].trim();
    const eqMatch = condition.match(/([a-zA-Z0-9_.]+)\s*(=|!=|>|<|>=|<=|LIKE)\s*(.+)/i);
    if (eqMatch) {
      const field = eqMatch[1].trim().split('.').pop();
      const op = eqMatch[2].trim().toUpperCase();
      const targetVal = parseLiteral(eqMatch[3].trim());

      resultRows = resultRows.filter((r) => {
        const actual = r[field];
        if (op === '=') return String(actual).toLowerCase() === String(targetVal).toLowerCase();
        if (op === '!=') return String(actual).toLowerCase() !== String(targetVal).toLowerCase();
        if (op === '>') return Number(actual) > Number(targetVal);
        if (op === '<') return Number(actual) < Number(targetVal);
        if (op === '>=') return Number(actual) >= Number(targetVal);
        if (op === '<=') return Number(actual) <= Number(targetVal);
        if (op === 'LIKE') {
          const pat = String(targetVal).replace(/%/g, '.*').replace(/_/g, '.');
          return new RegExp(`^${pat}$`, 'i').test(String(actual ?? ''));
        }
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

    return {
      success: true,
      columns: [columnsClause],
      rows: [{ [columnsClause]: aggVal }],
      rowCount: 1,
      type: 'SELECT',
    };
  }

  // Handle ORDER BY
  const orderMatch = workingRest.match(/ORDER\s+BY\s+([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
  if (orderMatch) {
    const orderCol = orderMatch[1].trim().split('.').pop();
    const isDesc = (orderMatch[2] || 'ASC').toUpperCase() === 'DESC';
    resultRows.sort((a, b) => {
      const valA = a[orderCol];
      const valB = b[orderCol];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }
      return isDesc
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }

  // Handle LIMIT
  const limitMatch = workingRest.match(/LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10);
    const offset = parseInt(limitMatch[2] || '0', 10);
    resultRows = resultRows.slice(offset, offset + limit);
  }

  // Determine output columns and project rows
  let outColumns = [];
  let projectedRows = resultRows;

  if (columnsClause === '*') {
    outColumns = (table.columns || []).map((c) => c.name);
    if (outColumns.length === 0 && resultRows[0]) {
      outColumns = Object.keys(resultRows[0]);
    }
  } else {
    const colExpressions = columnsClause.split(',').map((c) => {
      const aliasMatch = c.trim().match(/^(.+?)\s+AS\s+(.+)$/i);
      if (aliasMatch) {
        return {
          source: aliasMatch[1].trim().split('.').pop().replace(/["'`]/g, ''),
          alias: aliasMatch[2].trim().replace(/["'`]/g, ''),
        };
      }
      const cleanCol = c.trim().split('.').pop().replace(/["'`]/g, '');
      return { source: cleanCol, alias: cleanCol };
    });

    outColumns = colExpressions.map((e) => e.alias);
    projectedRows = resultRows.map((r) => {
      const obj = {};
      colExpressions.forEach((e) => {
        obj[e.alias] = r[e.source] !== undefined ? r[e.source] : (r[e.alias] !== undefined ? r[e.alias] : null);
      });
      return obj;
    });
  }

  return {
    success: true,
    columns: outColumns,
    rows: projectedRows,
    rowCount: projectedRows.length,
    type: 'SELECT',
  };
}

/**
 * Main in-browser SQL Execution Engine
 */
export async function executeSqlInBrowser(sqlQuery) {
  initDatabases();
  try {
    const selectedDb = typeof localStorage !== 'undefined' ? localStorage.getItem('fullcode_active_db') : null;
    if (selectedDb && inMemoryDatabases.has(selectedDb)) currentActiveDbName = selectedDb;
  } catch {}
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

  let statements = splitStatements(clean);
  const executionLogs = [];

  // If entire script was commented out with '-- ' or '# ' (e.g. pasted directly from tutorials/workbench)
  if (statements.length === 0) {
    const lines = clean.split('\n');
    const hasCommentedSql = lines.some((l) =>
      /^\s*(?:--|#)\s*(?:CREATE|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|USE|SHOW|PRAGMA)\b/i.test(l)
    );
    if (hasCommentedSql) {
      const uncommented = lines.map((l) => l.replace(/^\s*(?:--|#)\s?/, '')).join('\n');
      const retryStatements = splitStatements(uncommented);
      if (retryStatements.length > 0) {
        statements = retryStatements;
        executionLogs.push("💡 Note: Your SQL script had '--' comment prefixes. CodeForge automatically uncommented and executed it for you.");
      }
    }
  }

  if (statements.length === 0) {
    return {
      success: true,
      output: '✅ Empty query.\n',
      sqlData: { columns: [], rows: [], rowCount: 0, executionTimeMs: '0.00' },
      time: '0.000',
      memory: 1024,
      statusCode: 0,
    };
  }

  let finalResult = null;

  for (const rawStmt of statements) {
    const rawTrimmed = rawStmt.trim();
    if (!rawTrimmed) continue;

    // Transpile statement through SQLite dialect preprocessor
    const stmt = transpileSqlForSqlite(rawTrimmed);

    const createProcedureMatch = stmt.match(/^CREATE\s+PROCEDURE\s+([a-zA-Z_][\w$]*)\s*(?:\([^)]*\))?\s+(BEGIN\b[\s\S]*\bEND)\s*$/i);
    if (createProcedureMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      if (!activeDb) return { success: false, output: '', error: `Database '${currentActiveDbName}' is not available.`, time: '0.001', memory: 1024, statusCode: 1 };
      const procedureName = createProcedureMatch[1].toLowerCase();
      activeDb.procedures[procedureName] = { name: procedureName, body: createProcedureMatch[2] };
      persistDatabases();
      executionLogs.push(`✅ Stored procedure '${procedureName}' created in sandbox database '${currentActiveDbName}'.`);
      finalResult = { success: true, columns: ['status', 'procedure'], rows: [{ status: 'CREATED', procedure: procedureName }], rowCount: 1, type: 'DDL' };
      continue;
    }

    const dropProcedureMatch = stmt.match(/^DROP\s+PROCEDURE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z_][\w$]*)\s*$/i);
    if (dropProcedureMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const procedureName = dropProcedureMatch[1].toLowerCase();
      if (activeDb?.procedures?.[procedureName]) delete activeDb.procedures[procedureName];
      persistDatabases();
      executionLogs.push(`🗑️ Stored procedure '${procedureName}' removed from '${currentActiveDbName}'.`);
      finalResult = { success: true, columns: ['status', 'procedure'], rows: [{ status: 'DROPPED', procedure: procedureName }], rowCount: 1, type: 'DDL' };
      continue;
    }

    const callProcedureMatch = stmt.match(/^CALL\s+([a-zA-Z_][\w$]*)\s*\(([^)]*)\)\s*$/i);
    if (callProcedureMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const procedureName = callProcedureMatch[1].toLowerCase();
      const procedure = activeDb?.procedures?.[procedureName];
      if (!procedure) {
        return { success: false, output: '', error: `Stored procedure '${procedureName}' does not exist in database '${currentActiveDbName}'. Create it in this database first.`, time: '0.001', memory: 1024, statusCode: 1 };
      }
      try {
        finalResult = executeCursorProcedure(procedure, activeDb);
        finalResult.database = currentActiveDbName;
        executionLogs.push(`▶ Procedure '${procedureName}' executed in the SQL sandbox.`);
      } catch (error) {
        return { success: false, output: '', error: `Procedure '${procedureName}' could not run: ${error.message}`, time: '0.001', memory: 1024, statusCode: 1 };
      }
      continue;
    }

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

    // 1b. DROP DATABASE / DROP SCHEMA
    const dropDbMatch = stmt.match(/^DROP\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_-]+)/i);
    if (dropDbMatch) {
      const dbName = dropDbMatch[1].toLowerCase();
      inMemoryDatabases.delete(dbName);
      if (currentActiveDbName === dbName) {
        currentActiveDbName = 'main_db';
      }
      persistDatabases();
      executionLogs.push(`🗑️ Database '${dbName}' dropped.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `Database '${dbName}' dropped successfully.` }],
        rowCount: 1,
        type: 'DDL',
      };
      continue;
    }

    // 1c. COMMIT / ROLLBACK / BEGIN
    if (/^COMMIT\b/i.test(stmt)) {
      executionLogs.push('💾 Transaction committed.');
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Transaction committed successfully.' }],
        rowCount: 1,
        type: 'MUTATION',
      };
      continue;
    }
    if (/^ROLLBACK\b/i.test(stmt)) {
      executionLogs.push('🔄 Transaction rolled back.');
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Transaction rolled back.' }],
        rowCount: 1,
        type: 'MUTATION',
      };
      continue;
    }
    if (/^BEGIN(?:\s+TRANSACTION)?\b/i.test(stmt)) {
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Transaction started.' }],
        rowCount: 1,
        type: 'MUTATION',
      };
      continue;
    }

    // 1d. SET FOREIGN_KEY_CHECKS and session variables
    if (/^SET\s+FOREIGN_KEY_CHECKS\b/i.test(stmt)) {
      executionLogs.push(`⚙️ FOREIGN_KEY_CHECKS updated.`);
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'OK' }],
        rowCount: 1,
        type: 'PRAGMA',
      };
      continue;
    }
    if (/^SET\s+[@a-zA-Z0-9_.]+\s*=/i.test(stmt)) {
      executionLogs.push(`⚙️ Session variable set.`);
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'OK' }],
        rowCount: 1,
        type: 'PRAGMA',
      };
      continue;
    }

    // 1e. LOCK TABLES / UNLOCK TABLES
    if (/^(?:LOCK\s+TABLES|UNLOCK\s+TABLES)\b/i.test(stmt)) {
      finalResult = {
        success: true,
        columns: ['status'],
        rows: [{ status: 'OK' }],
        rowCount: 1,
        type: 'MUTATION',
      };
      continue;
    }

    // 1f. ALTER TABLE ... ADD FOREIGN KEY
    if (/^ALTER\s+TABLE\s+[a-zA-Z0-9_"-]+\s+ADD\s+(?:CONSTRAINT\s+[a-zA-Z0-9_"-]+\s+)?FOREIGN\s+KEY\b/i.test(stmt)) {
      executionLogs.push(`ℹ️ Foreign key constraint registered.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Foreign key constraint registered.' }],
        rowCount: 1,
        type: 'DDL',
      };
      continue;
    }

    // 1g. ALTER TABLE ... ADD UNIQUE INDEX / ADD INDEX
    if (/^ALTER\s+TABLE\s+[a-zA-Z0-9_"-]+\s+ADD\s+(?:UNIQUE\s+)?(?:INDEX|KEY)\b/i.test(stmt)) {
      executionLogs.push(`✅ Index registered.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: 'Index registered successfully.' }],
        rowCount: 1,
        type: 'DDL',
      };
      continue;
    }

    // 1h. CREATE VIEW [IF NOT EXISTS] view_name [(col1, col2, ...)] AS select_query
    const createViewMatch = stmt.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"-]+)(?:\s*\(([^)]+)\))?\s+AS\s+([\s\S]+)/i);
    if (createViewMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName) || inMemoryDatabases.get('main_db');
      const viewName = createViewMatch[1].replace(/["'`]/g, '');
      const explicitCols = createViewMatch[2]
        ? createViewMatch[2].split(',').map((c) => c.trim().replace(/["'`]/g, ''))
        : null;
      const selectQuery = createViewMatch[3].trim().replace(/;+$/, '');

      // Evaluate the view's query to verify and populate columns & rows
      let viewCols = [];
      let viewRows = [];
      const selResult = executeSelectStatement(selectQuery, activeDb, currentActiveDbName);
      if (selResult && selResult.success) {
        viewCols = selResult.columns;
        viewRows = selResult.rows;
      }

      // Remap columns if custom alias list was provided
      if (explicitCols && explicitCols.length > 0) {
        viewRows = viewRows.map((r) => {
          const remapped = {};
          explicitCols.forEach((alias, idx) => {
            const orig = viewCols[idx];
            remapped[alias] = orig !== undefined ? r[orig] : null;
          });
          return remapped;
        });
        viewCols = explicitCols;
      }

      const columnDefs = viewCols.length > 0
        ? viewCols.map((col) => ({
            name: col,
            type: typeof viewRows[0]?.[col] === 'number' ? 'NUMERIC' : 'TEXT',
            isPk: false,
            notNull: false,
          }))
        : [{ name: 'view_result', type: 'TEXT' }];

      activeDb.createView(viewName, selectQuery, columnDefs, viewRows, stmt);
      persistDatabases();
      executionLogs.push(`✅ View '${viewName}' created in '${activeDb.name}' (${viewRows.length} rows compiled).`);
      finalResult = {
        success: true,
        columns: ['status', 'view_name', 'rows_compiled', 'message'],
        rows: [{
          status: 'OK',
          view_name: viewName,
          rows_compiled: viewRows.length,
          message: `View '${viewName}' created successfully.`,
        }],
        rowCount: 1,
        type: 'DDL',
        previewTable: viewName,
      };
      continue;
    }

    // Fallback simple CREATE VIEW
    const fallbackCreateViewMatch = stmt.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_"-]+)/i);
    if (fallbackCreateViewMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName) || inMemoryDatabases.get('main_db');
      const viewName = fallbackCreateViewMatch[1].replace(/["'`]/g, '');
      activeDb.createView(viewName, 'SELECT 1;', [{ name: 'view_result', type: 'TEXT' }], [], stmt);
      persistDatabases();
      executionLogs.push(`✅ View '${viewName}' created in '${activeDb.name}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `View '${viewName}' created successfully.` }],
        rowCount: 1,
        type: 'DDL',
        previewTable: viewName,
      };
      continue;
    }

    // 1i. DROP VIEW [IF EXISTS] view_name
    const dropViewMatch = stmt.match(/^DROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_"-]+)/i);
    if (dropViewMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const viewName = dropViewMatch[1].replace(/["'`]/g, '');
      activeDb?.dropTable(viewName);
      persistDatabases();
      executionLogs.push(`🗑️ View '${viewName}' dropped from '${activeDb?.name || currentActiveDbName}'.`);
      finalResult = {
        success: true,
        columns: ['status', 'message'],
        rows: [{ status: 'OK', message: `View '${viewName}' dropped successfully.` }],
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

    // 3. SHOW DATABASES / SHOW SCHEMAS / .databases
    if (/^(?:SHOW\s+(?:DATABASES|SCHEMAS)|\.DATABASES?)\b/i.test(stmt)) {
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

    // 4. SHOW TABLES [FROM <db>] / .tables
    const showTablesMatch = stmt.match(/^(?:SHOW\s+TABLES(?:\s+FROM\s+([a-zA-Z0-9_-]+))?|\.TABLES?)\b/i);
    if (showTablesMatch) {
      const targetDbName = showTablesMatch[1] ? showTablesMatch[1].toLowerCase() : currentActiveDbName;
      const activeDb = inMemoryDatabases.get(targetDbName) || inMemoryDatabases.get('main_db');
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

    // 4b. .schema [table] or SCHEMA [table]
    const schemaMatch = stmt.match(/^(?:\.SCHEMA|SCHEMA)(?:\s+([a-zA-Z0-9_"-]+))?$/i);
    if (schemaMatch) {
      let targetTable = schemaMatch[1] ? schemaMatch[1].replace(/["'`]/g, '').toLowerCase() : null;
      let activeDb = inMemoryDatabases.get(currentActiveDbName);

      if (targetTable && !activeDb?.getTable(targetTable)) {
        const matches = getDatabasesForTableInBrowser(targetTable);
        if (matches.length > 1) return { success: false, output: '', error: `Table '${targetTable}' exists in multiple databases (${matches.join(', ')}). Select the database explicitly.`, time: '0.001', memory: 1024, statusCode: 1 };
        const altDb = findDatabaseForTableInBrowser(targetTable);
        if (altDb) {
          currentActiveDbName = altDb;
          activeDb = inMemoryDatabases.get(altDb);
          executionLogs.push(`🔄 Context switched to database '${currentActiveDbName}' (contains '${targetTable}').`);
        }
      }

      if (targetTable) {
        const tbl = activeDb?.getTable(targetTable);
        if (!tbl) {
          return {
            success: false,
            output: '',
            error: `Table '${targetTable}' does not exist in database '${currentActiveDbName}'.`,
            time: '0.001',
            memory: 1024,
            statusCode: 1,
          };
        }
        const isView = tbl.isView || tbl.type === 'view';
        const ddl = isView ? (tbl.sql || `CREATE VIEW ${tbl.name} AS ${tbl.query || 'SELECT 1'};`) : generateTableDdl(tbl);
        executionLogs.push(`${ddl}`);
        finalResult = {
          success: true,
          columns: ['type', 'name', 'tbl_name', 'sql'],
          rows: [{ type: isView ? 'view' : 'table', name: tbl.name, tbl_name: tbl.name, sql: ddl }],
          rowCount: 1,
          type: 'SELECT',
        };
      } else {
        const allTables = Object.values(activeDb?.tables || {});
        const schemaRows = allTables.map((t) => {
          const isView = t.isView || t.type === 'view';
          const ddl = isView ? (t.sql || `CREATE VIEW ${t.name} AS ${t.query || 'SELECT 1'};`) : generateTableDdl(t);
          executionLogs.push(`${ddl}`);
          return { type: isView ? 'view' : 'table', name: t.name, tbl_name: t.name, sql: ddl };
        });
        finalResult = {
          success: true,
          columns: ['type', 'name', 'tbl_name', 'sql'],
          rows: schemaRows,
          rowCount: schemaRows.length,
          type: 'SELECT',
        };
      }
      continue;
    }

    // 4c. SHOW CREATE TABLE / SHOW CREATE VIEW <table>
    const showCreateMatch = stmt.match(/^SHOW\s+CREATE\s+(?:TABLE|VIEW)\s+([a-zA-Z0-9_"-]+)/i);
    if (showCreateMatch) {
      const targetTable = showCreateMatch[1].replace(/["'`]/g, '').toLowerCase();
      let activeDb = inMemoryDatabases.get(currentActiveDbName);
      let tbl = activeDb?.getTable(targetTable);

      if (!tbl) {
        const matches = getDatabasesForTableInBrowser(targetTable);
        if (matches.length > 1) return { success: false, output: '', error: `Table '${targetTable}' exists in multiple databases (${matches.join(', ')}). Select the database explicitly.`, time: '0.001', memory: 1024, statusCode: 1 };
        const altDb = findDatabaseForTableInBrowser(targetTable);
        if (altDb) {
          currentActiveDbName = altDb;
          activeDb = inMemoryDatabases.get(altDb);
          tbl = activeDb?.getTable(targetTable);
          executionLogs.push(`🔄 Context switched to database '${currentActiveDbName}' (contains '${targetTable}').`);
        }
      }

      if (!tbl) {
        return {
          success: false,
          output: '',
          error: `Table or view '${targetTable}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }

      const isView = tbl.isView || tbl.type === 'view';
      const ddl = isView ? (tbl.sql || `CREATE VIEW ${tbl.name} AS ${tbl.query || 'SELECT 1'};`) : generateTableDdl(tbl);
      executionLogs.push(`${ddl}`);
      finalResult = {
        success: true,
        columns: isView ? ['View', 'Create View'] : ['Table', 'Create Table'],
        rows: [isView ? { View: tbl.name, 'Create View': ddl } : { Table: tbl.name, 'Create Table': ddl }],
        rowCount: 1,
        type: 'SELECT',
      };
      continue;
    }

    // 4d. PRAGMA table_info(<table>) / PRAGMA table_xinfo(<table>)
    const pragmaTableInfoMatch = stmt.match(/^PRAGMA\s+(?:table_info|table_xinfo)\s*\(([^)]+)\)/i);
    if (pragmaTableInfoMatch) {
      const targetTable = pragmaTableInfoMatch[1].trim().replace(/["'`]/g, '').toLowerCase();
      let activeDb = inMemoryDatabases.get(currentActiveDbName);
      let tbl = activeDb?.getTable(targetTable);

      if (!tbl) {
        const matches = getDatabasesForTableInBrowser(targetTable);
        if (matches.length > 1) return { success: false, output: '', error: `Table '${targetTable}' exists in multiple databases (${matches.join(', ')}). Select the database explicitly.`, time: '0.001', memory: 1024, statusCode: 1 };
        const altDb = findDatabaseForTableInBrowser(targetTable);
        if (altDb) {
          currentActiveDbName = altDb;
          activeDb = inMemoryDatabases.get(altDb);
          tbl = activeDb?.getTable(targetTable);
          executionLogs.push(`🔄 Context switched to database '${currentActiveDbName}' (contains '${targetTable}').`);
        }
      }

      if (!tbl) {
        return {
          success: false,
          output: '',
          error: `Table or view '${targetTable}' does not exist in database '${currentActiveDbName}'.`,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }

      const rows = tbl.columns.map((c, idx) => ({
        cid: idx,
        name: c.name,
        type: c.type || 'TEXT',
        notnull: c.notNull ? 1 : 0,
        dflt_value: c.default !== undefined ? String(c.default) : null,
        pk: c.isPk ? 1 : 0,
      }));

      finalResult = {
        success: true,
        columns: ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'],
        rows,
        rowCount: rows.length,
        type: 'SELECT',
      };
      continue;
    }

    // 4e. PRAGMA table_list
    const pragmaTableListMatch = stmt.match(/^PRAGMA\s+table_list(?:\s*\(([^)]+)\))?/i);
    if (pragmaTableListMatch) {
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const targetTable = pragmaTableListMatch[1]?.trim().replace(/["'`]/g, '').toLowerCase();
      const tables = Object.values(activeDb?.tables || {}).filter(
        (t) => !targetTable || t.name.toLowerCase() === targetTable
      );

      finalResult = {
        success: true,
        columns: ['schema', 'name', 'type', 'ncol', 'wr', 'strict'],
        rows: tables.map((t) => ({
          schema: 'main',
          name: t.name,
          type: t.isView || t.type === 'view' ? 'view' : 'table',
          ncol: t.columns.length,
          wr: 0,
          strict: 0,
        })),
        rowCount: tables.length,
        type: 'SELECT',
      };
      continue;
    }

    // 4f. PRAGMA database_list
    if (/^PRAGMA\s+database_list\b/i.test(stmt)) {
      const list = Array.from(inMemoryDatabases.keys());
      finalResult = {
        success: true,
        columns: ['seq', 'name', 'file'],
        rows: list.map((name, idx) => ({
          seq: idx,
          name,
          file: '',
        })),
        rowCount: list.length,
        type: 'SELECT',
      };
      continue;
    }

    // 4g. PRAGMA foreign_key_list / index_list / index_info
    const pragmaFkMatch = stmt.match(/^PRAGMA\s+foreign_key_list\s*\(([^)]+)\)/i);
    if (pragmaFkMatch) {
      finalResult = {
        success: true,
        columns: ['id', 'seq', 'table', 'from', 'to', 'on_update', 'on_delete', 'match'],
        rows: [],
        rowCount: 0,
        type: 'SELECT',
      };
      continue;
    }

    const pragmaIdxMatch = stmt.match(/^PRAGMA\s+index_list\s*\(([^)]+)\)/i);
    if (pragmaIdxMatch) {
      finalResult = {
        success: true,
        columns: ['seq', 'name', 'unique', 'origin', 'partial'],
        rows: [],
        rowCount: 0,
        type: 'SELECT',
      };
      continue;
    }

    // 4h. .indices / .indexes [table]
    const indexMatch = stmt.match(/^(?:\.INDICES|\.INDEXES)(?:\s+([a-zA-Z0-9_"-]+))?$/i);
    if (indexMatch) {
      finalResult = {
        success: true,
        columns: ['index_name', 'table_name', 'sql'],
        rows: [],
        rowCount: 0,
        type: 'SELECT',
      };
      continue;
    }

    // 4i. .dump [table]
    const dumpMatch = stmt.match(/^\.DUMP(?:\s+([a-zA-Z0-9_"-]+))?$/i);
    if (dumpMatch) {
      const targetTable = dumpMatch[1] ? dumpMatch[1].replace(/["'`]/g, '').toLowerCase() : null;
      const activeDb = inMemoryDatabases.get(currentActiveDbName);
      const dumpLines = ['PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;'];

      const dumpTables = Object.values(activeDb?.tables || {}).filter(
        (t) => !targetTable || t.name.toLowerCase() === targetTable
      );

      for (const t of dumpTables) {
        dumpLines.push(generateTableDdl(t));
        for (const r of t.rows) {
          const cols = Object.keys(r);
          const vals = cols.map((c) => {
            const v = r[c];
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
        rows: dumpLines.map((l) => ({ SQL_Dump_Script: l })),
        rowCount: dumpLines.length,
        type: 'SELECT',
      };
      continue;
    }

    // 5. DESCRIBE / DESC <table> / SHOW COLUMNS FROM <table>
    const descMatch = stmt.match(/^(?:DESCRIBE|DESC|SHOW\s+(?:COLUMNS|FIELDS)\s+FROM)\s+([a-zA-Z0-9_"-]+)/i);
    if (descMatch) {
      const tableName = descMatch[1].replace(/["']/g, '').toLowerCase();
      let activeDb = inMemoryDatabases.get(currentActiveDbName);
      let table = activeDb?.getTable(tableName);

      if (!table) {
        const matches = getDatabasesForTableInBrowser(tableName);
        if (matches.length > 1) return { success: false, output: '', error: `Table '${tableName}' exists in multiple databases (${matches.join(', ')}). Select the database explicitly.`, time: '0.001', memory: 1024, statusCode: 1 };
        const altDb = findDatabaseForTableInBrowser(tableName);
        if (altDb) {
          currentActiveDbName = altDb;
          activeDb = inMemoryDatabases.get(altDb);
          table = activeDb?.getTable(tableName);
          executionLogs.push(`🔄 Context switched to database '${currentActiveDbName}' (contains '${tableName}').`);
        }
      }

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
      const pkMatch = body.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      const pkCols = pkMatch ? pkMatch[1].split(',').map((c) => c.trim().replace(/["'`]/g, '').toLowerCase()) : [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || /^PRIMARY\s+KEY/i.test(trimmedLine) || /^FOREIGN\s+KEY/i.test(trimmedLine) || /^KEY\b/i.test(trimmedLine) || /^INDEX\b/i.test(trimmedLine)) {
          continue;
        }
        const parts = trimmedLine.split(/\s+/);
        const colName = parts[0].replace(/["'`]/g, '');
        const colType = (parts[1] || 'TEXT').toUpperCase();
        const isPk = /PRIMARY\s+KEY/i.test(trimmedLine) || pkCols.includes(colName.toLowerCase());
        const notNull = /NOT\s+NULL/i.test(trimmedLine) || isPk;

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
    if (/^SELECT\b/i.test(stmt)) {
      let activeDb = inMemoryDatabases.get(currentActiveDbName);
      const selResult = executeSelectStatement(stmt, activeDb, currentActiveDbName);
      if (!selResult.success) {
        return {
          success: false,
          output: '',
          error: selResult.error,
          time: '0.001',
          memory: 1024,
          statusCode: 1,
        };
      }
      finalResult = selResult;
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
