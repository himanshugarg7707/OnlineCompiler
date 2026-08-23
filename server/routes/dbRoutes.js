import { Router } from 'express';
import {
  listDatabases,
  createDatabase,
  deleteDatabase,
  executeSqlQuery,
  getDatabaseSchema,
  getTableData,
} from '../dbManager.js';

const router = Router();

// GET /api/db/list - List all databases
router.get('/list', async (req, res) => {
  try {
    const databases = await listDatabases();
    res.json({ success: true, databases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/db/create - Create a new database
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Database name is required' });
    }
    const result = await createDatabase(name.trim());
    res.json({ success: true, database: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/db/:name - Delete a database
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    if (!name || name === 'main_db') {
      return res.status(400).json({ success: false, error: 'Cannot delete default database' });
    }
    const result = await deleteDatabase(name);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/db/query - Execute SQL query
router.post('/query', async (req, res) => {
  try {
    const { database = 'main_db', query = '' } = req.body;
    const result = await executeSqlQuery(database, query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/db/schema/:database - Get schema for database
router.get('/schema/:database', async (req, res) => {
  try {
    const { database } = req.params;
    const schema = await getDatabaseSchema(database);
    res.json({ success: true, schema });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/db/table-data/:database/:table - Get paginated table rows
router.get('/table-data/:database/:table', async (req, res) => {
  try {
    const { database, table } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const data = await getTableData(database, table, limit, offset);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
