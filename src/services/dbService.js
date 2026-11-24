// Database Client Service
// Seamlessly communicates with the backend SQL engine when available,
// with 100% offline & client-side in-browser fallback for Vercel/serverless environments.

import { executeSqlInBrowser, generateTableDdl } from './sqlRunner';
import { apiFetch } from './apiClient';

const STORAGE_PREFIX = 'codeforge_sql_db_';
const DB_LIST_KEY = 'codeforge_sql_dbs_list';

function getLocalDbs() {
  try {
    const list = localStorage.getItem(DB_LIST_KEY);
    if (list) return JSON.parse(list);
  } catch {}
  return ['ecommerce_db', 'university_db', 'main_db'];
}

function getLocalDbData(dbName) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dbName);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveLocalDbData(dbName, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + dbName, JSON.stringify(data));
    const list = getLocalDbs();
    if (!list.includes(dbName)) {
      list.push(dbName);
      localStorage.setItem(DB_LIST_KEY, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Fetch all available databases
 */
export async function getDatabasesList() {
  try {
    const res = await apiFetch('/api/db/list');
    if (res.ok) {
      const data = await res.json();
      if (data.databases && data.databases.length > 0) return data.databases;
    }
  } catch {}

  // Fallback to local in-browser databases
  const list = getLocalDbs();
  return list.map((name) => {
    const data = getLocalDbData(name);
    const tablesCount = data?.tables ? Object.keys(data.tables).length : (name === 'ecommerce_db' ? 2 : 1);
    return {
      name,
      sizeBytes: 4096,
      tablesCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Create a new database
 */
export async function createNewDatabase(name) {
  const cleanName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  try {
    const res = await apiFetch('/api/db/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName }),
    });
    if (res.ok) {
      return res.json();
    }
  } catch {}

  // Fallback to in-browser creation
  const list = getLocalDbs();
  if (!list.includes(cleanName)) {
    list.push(cleanName);
    localStorage.setItem(DB_LIST_KEY, JSON.stringify(list));
    saveLocalDbData(cleanName, { name: cleanName, tables: {}, createdAt: new Date().toISOString() });
  }

  return { success: true, database: { name: cleanName, success: true } };
}

/**
 * Delete a database
 */
export async function deleteExistingDatabase(name) {
  const cleanName = name.trim().toLowerCase();

  try {
    const res = await apiFetch(`/api/db/${encodeURIComponent(cleanName)}`, {
      method: 'DELETE',
    });
    if (res.ok) return res.json();
  } catch {}

  // Fallback to in-browser deletion
  const list = getLocalDbs().filter((d) => d !== cleanName);
  localStorage.setItem(DB_LIST_KEY, JSON.stringify(list));
  localStorage.removeItem(STORAGE_PREFIX + cleanName);

  return { success: true, name: cleanName };
}

/**
 * Execute SQL Query on a specific database
 */
export async function executeSql(database, query) {
  try {
    const res = await apiFetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ database, query }),
    });
    if (res.ok) return res.json();
  } catch {}

  // Fallback to in-browser execution
  try {
    const browserRes = await executeSqlInBrowser(query);
    if (browserRes && browserRes.sqlData) {
      return browserRes.sqlData;
    }
  } catch {}

  return { success: false, error: 'Database query execution failed' };
}

/**
 * Get schema of all tables in a database
 */
export async function getDatabaseSchema(database) {
  try {
    const res = await apiFetch(`/api/db/schema/${encodeURIComponent(database)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.schema && data.schema.tables) {
        // Ensure sql DDL is present on every table
        data.schema.tables = data.schema.tables.map((t) => ({
          ...t,
          sql: t.sql || generateTableDdl(t),
        }));
        return data.schema;
      }
    }
  } catch {}

  // Fallback to in-browser schema introspection
  const dbData = getLocalDbData(database);
  if (dbData && dbData.tables) {
    const tables = Object.entries(dbData.tables).map(([tblName, tbl]) => {
      const isView = tbl.type === 'view' || Boolean(tbl.isView) || Boolean(tbl.query);
      const tableObj = {
        name: tbl.name || tblName,
        columns: (tbl.columns || []).map((c) => ({
          name: c.name,
          type: c.type || 'TEXT',
          isPk: Boolean(c.isPk),
          notNull: Boolean(c.notNull),
          default: c.default !== undefined ? c.default : null,
        })),
      };
      return {
        tableName: tbl.name || tblName,
        type: isView ? 'view' : 'table',
        isView,
        query: tbl.query || null,
        rowCount: tbl.rows ? tbl.rows.length : 0,
        sql: tbl.sql || (isView ? `CREATE VIEW ${tbl.name || tblName} AS ${tbl.query || 'SELECT 1'};` : generateTableDdl(tableObj)),
        columns: (tbl.columns || []).map((c) => ({
          name: c.name,
          type: c.type || 'TEXT',
          isPrimaryKey: Boolean(c.isPk),
          notNull: Boolean(c.notNull),
          defaultValue: c.default || null,
        })),
      };
    });
    return { database, tables };
  }

  return { database, tables: [] };
}

/**
 * Get paginated rows of a table
 */
export async function getTableRows(database, table, limit = 50, offset = 0) {
  try {
    const res = await apiFetch(
      `/api/db/table-data/${encodeURIComponent(database)}/${encodeURIComponent(table)}?limit=${limit}&offset=${offset}`
    );
    if (res.ok) return res.json();
  } catch {}

  // Fallback to in-browser table rows
  const dbData = getLocalDbData(database);
  const tbl = dbData?.tables?.[table.toLowerCase()];
  if (tbl) {
    let sourceRows = tbl.rows || [];
    let columns = tbl.columns ? tbl.columns.map((c) => c.name) : (sourceRows[0] ? Object.keys(sourceRows[0]) : []);
    if (tbl.type === 'view' || tbl.isView || tbl.query) {
      // Views are virtual queries. Re-run the saved SELECT so the explorer
      // reflects current base-table data instead of the creation-time cache.
      const quotedName = table.replace(/"/g, '""');
      const viewResult = await executeSqlInBrowser(`USE ${database}; SELECT * FROM "${quotedName}";`);
      if (viewResult?.success !== false && viewResult?.sqlData) {
        sourceRows = viewResult.sqlData.rows || [];
        columns = viewResult.sqlData.columns || columns;
      }
    }
    const rows = sourceRows.slice(offset, offset + limit);
    return {
      database,
      tableName: table,
      columns,
      rows,
      total: sourceRows.length,
      limit,
      offset,
    };
  }

  return { columns: [], rows: [], total: 0 };
}
