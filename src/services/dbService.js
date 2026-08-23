// Database Client Service
// Interacts with the backend Multi-Database SQL engine

/**
 * Fetch all available databases
 */
export async function getDatabasesList() {
  try {
    const res = await fetch('/api/db/list');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.databases || [];
  } catch (err) {
    console.warn('Failed to fetch databases from backend:', err.message);
    return [];
  }
}

/**
 * Create a new database
 */
export async function createNewDatabase(name) {
  const res = await fetch('/api/db/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Delete a database
 */
export async function deleteExistingDatabase(name) {
  const res = await fetch(`/api/db/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Execute SQL Query on a specific database
 */
export async function executeSql(database, query) {
  const res = await fetch('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ database, query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Get schema of all tables in a database
 */
export async function getDatabaseSchema(database) {
  try {
    const res = await fetch(`/api/db/schema/${encodeURIComponent(database)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.schema || { database, tables: [] };
  } catch (err) {
    console.warn('Failed to fetch schema:', err.message);
    return { database, tables: [] };
  }
}

/**
 * Get paginated rows of a table
 */
export async function getTableRows(database, table, limit = 50, offset = 0) {
  try {
    const res = await fetch(
      `/api/db/table-data/${encodeURIComponent(database)}/${encodeURIComponent(table)}?limit=${limit}&offset=${offset}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('Failed to fetch table data:', err.message);
    return { columns: [], rows: [], total: 0 };
  }
}
