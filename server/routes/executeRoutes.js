import { Router } from 'express';
import { executeSqlQuery } from '../dbManager.js';

const router = Router();

// In-memory cache for ultra-fast repeated responses
const executionCache = new Map();

// POST /api/execute - Fast backend execution endpoint
router.post('/', async (req, res) => {
  const startTime = performance.now();
  const { code, languageId, stdin = '', database = 'main_db' } = req.body;

  if (!code) {
    return res.json({
      success: true,
      output: '',
      error: null,
      time: '0.000',
    });
  }

  // Check cache for identical execution
  const cacheKey = `${languageId}:${stdin}:${code.trim()}`;
  if (executionCache.has(cacheKey)) {
    const cached = executionCache.get(cacheKey);
    return res.json({
      ...cached,
      cached: true,
      time: '0.001',
    });
  }

  // 1. SQL Execution via native fast SQLite backend
  if (languageId === 82) {
    try {
      const sqlResult = await executeSqlQuery(database, code);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);

      if (!sqlResult.success) {
        return res.json({
          success: false,
          output: '',
          error: `SQL Error: ${sqlResult.error}`,
          time: elapsed,
          memory: 1024,
          statusCode: 1,
        });
      }

      // Format table as visual ascii table for output terminal
      let asciiOutput = '';
      if (sqlResult.rows && sqlResult.rows.length > 0) {
        const cols = sqlResult.columns;
        const colWidths = {};
        cols.forEach((col) => {
          colWidths[col] = Math.max(
            col.length,
            ...sqlResult.rows.map((r) => String(r[col] ?? '').length)
          );
        });

        const headerLine = cols.map((c) => c.padEnd(colWidths[c])).join(' | ');
        const sepLine = cols.map((c) => '-'.repeat(colWidths[c])).join('-+-');

        const rowLines = sqlResult.rows
          .map((r) => cols.map((c) => String(r[c] ?? 'NULL').padEnd(colWidths[c])).join(' | '))
          .join('\n');

        asciiOutput = `${headerLine}\n${sepLine}\n${rowLines}\n\n(${sqlResult.rowCount} rows returned in ${sqlResult.executionTimeMs}ms)\n`;
      } else {
        asciiOutput = `✅ Query executed successfully. (0 rows returned in ${sqlResult.executionTimeMs}ms)\n`;
      }

      const responsePayload = {
        success: true,
        output: asciiOutput,
        sqlData: sqlResult,
        error: null,
        time: elapsed,
        memory: 1024,
        statusCode: 0,
      };

      // Cache small results
      if (asciiOutput.length < 50000) {
        executionCache.set(cacheKey, responsePayload);
      }

      return res.json(responsePayload);
    } catch (err) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
      return res.json({
        success: false,
        output: '',
        error: `SQL Server Error: ${err.message}`,
        time: elapsed,
        memory: 0,
        statusCode: 1,
      });
    }
  }

  // For other languages, let client know to use optimal runner (Pyodide / Wandbox)
  return res.json({
    useClientRunner: true,
  });
});

export default router;
