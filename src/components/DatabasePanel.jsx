import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  getDatabasesList,
  createNewDatabase,
  deleteExistingDatabase,
  getDatabaseSchema,
  getTableRows,
} from '../services/dbService';
import {
  Database,
  Plus,
  Trash2,
  Table as TableIcon,
  RefreshCw,
  Columns,
  Code,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  FileCode,
  Copy,
  Terminal,
  X,
  Play,
} from 'lucide-react';
import './DatabasePanel.css';
import { executeCode } from '../services/judge0Service';

export default function DatabasePanel() {
  const { handleCodeChange, handleSelectLanguage } = useApp();

  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState('ecommerce_db');
  const [schema, setSchema] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedTables, setExpandedTables] = useState({});
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [connectorLang, setConnectorLang] = useState('python');
  const [viewMode, setViewMode] = useState('data'); // 'data' | 'schema'
  const [queryFiles, setQueryFiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fullcode_sql_query_files'));
      if (Array.isArray(saved) && saved.length && saved.every((file) => file.id && typeof file.name === 'string' && typeof file.content === 'string')) return saved;
    } catch {}
    return [{ id: 'query-1', name: 'query_1.sql', content: '-- Write SQL here\nSELECT * FROM customers LIMIT 10;' }];
  });
  const [activeQueryId, setActiveQueryId] = useState(() => {
    try { return localStorage.getItem('fullcode_sql_active_query') || 'query-1'; } catch { return 'query-1'; }
  });
  const activeQueryFile = queryFiles.find((file) => file.id === activeQueryId) || queryFiles[0];
  const query = activeQueryFile?.content || '';
  const setQuery = useCallback((content) => {
    setQueryFiles((files) => files.map((file) => file.id === activeQueryFile?.id ? { ...file, content: typeof content === 'function' ? content(file.content) : content } : file));
  }, [activeQueryFile?.id]);
  useEffect(() => {
    try {
      localStorage.setItem('fullcode_sql_query_files', JSON.stringify(queryFiles));
      localStorage.setItem('fullcode_sql_active_query', activeQueryFile?.id || 'query-1');
    } catch {}
  }, [queryFiles, activeQueryFile?.id]);
  const [selectedSql, setSelectedSql] = useState('');
  const queryEditorRef = useRef(null);
  const sqlFileInputRef = useRef(null);
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState([]);
  const [lastExecutedSql, setLastExecutedSql] = useState('');
  const [sqlDialect, setSqlDialect] = useState(() => {
    try { return localStorage.getItem('fullcode_sql_dialect') || 'sqlite'; } catch { return 'sqlite'; }
  });
  const [queryResult, setQueryResult] = useState(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [sqlLowerView, setSqlLowerView] = useState('results');
  const [sqlResultTab, setSqlResultTab] = useState('grid');
  const [copiedSqlResult, setCopiedSqlResult] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('fullcode_sql_sidebar_width'));
      return Number.isFinite(saved) && saved >= 200 ? Math.min(saved, window.innerWidth * 0.45, 700) : 280;
    } catch { return 280; }
  });
  const [queryPaneHeight, setQueryPaneHeight] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('fullcode_sql_query_pane_height'));
      return Number.isFinite(saved) && saved >= 180 ? saved : Math.round(window.innerHeight * 0.36);
    } catch { return Math.round(window.innerHeight * 0.36); }
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  const layoutRef = useRef({ sidebarWidth, queryPaneHeight });
  layoutRef.current = { sidebarWidth, queryPaneHeight };

  useEffect(() => {
    if (!isResizing) return undefined;
    const onPointerMove = (event) => {
      const drag = resizeRef.current;
      if (!drag) return;
      if (drag.axis === 'x') {
        const max = Math.min(700, window.innerWidth * 0.45);
        setSidebarWidth(Math.round(Math.max(200, Math.min(max, drag.startValue + event.clientX - drag.startPoint))));
      } else {
        const max = Math.max(300, window.innerHeight * 0.76);
        setQueryPaneHeight(Math.round(Math.max(180, Math.min(max, drag.startValue + event.clientY - drag.startPoint))));
      }
    };
    const onPointerUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
      try {
        localStorage.setItem('fullcode_sql_sidebar_width', String(layoutRef.current.sidebarWidth));
        localStorage.setItem('fullcode_sql_query_pane_height', String(layoutRef.current.queryPaneHeight));
      } catch {}
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isResizing]);

  const startResize = (event, axis, startValue) => {
    event.preventDefault();
    resizeRef.current = { axis, startPoint: axis === 'x' ? event.clientX : event.clientY, startValue };
    setIsResizing(true);
  };

  // Load databases list
  const refreshDatabases = useCallback(async () => {
    try {
      const list = await getDatabasesList();
      setDatabases(list);
      if (list.length > 0 && !list.some((d) => d.name === selectedDb)) {
        setSelectedDb(list[0].name);
      }
    } catch (e) {
      console.warn('Error fetching databases:', e);
    }
  }, [selectedDb]);

  useEffect(() => {
    refreshDatabases();
  }, [refreshDatabases]);

  // Load schema whenever selectedDb changes
  const loadSchema = useCallback(async (dbName) => {
    if (!dbName) return;
    setLoading(true);
    try {
      const sch = await getDatabaseSchema(dbName);
      setSchema(sch);
      if (sch.tables && sch.tables.length > 0) {
        setSelectedTable(sch.tables[0].tableName);
      } else {
        setSelectedTable(null);
        setTableData(null);
      }
    } catch (err) {
      console.warn('Error fetching schema:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchema(selectedDb);
  }, [selectedDb, loadSchema]);

  // Load table data whenever selectedTable changes
  const loadTableData = useCallback(async (dbName, tableName) => {
    if (!dbName || !tableName) return;
    setLoading(true);
    try {
      const data = await getTableRows(dbName, tableName, 50, 0);
      setTableData(data);
    } catch (err) {
      console.warn('Error fetching table rows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDb && selectedTable) {
      loadTableData(selectedDb, selectedTable);
    }
  }, [selectedDb, selectedTable, loadTableData]);

  // Real-time synchronization when user runs SQL queries in editor
  useEffect(() => {
    const handleDbUpdated = async (e) => {
      const { database, table } = e.detail || {};
      try {
        const list = await getDatabasesList();
        setDatabases(list);
        const targetDb = database || selectedDb;
        if (targetDb) {
          setSelectedDb(targetDb);
          const sch = await getDatabaseSchema(targetDb);
          setSchema(sch);
          const targetTbl = table || (sch.tables && sch.tables.length > 0 ? sch.tables[0].tableName : null);
          if (targetTbl) {
            setSelectedTable(targetTbl);
            const data = await getTableRows(targetDb, targetTbl, 50, 0);
            setTableData(data);
          }
        }
      } catch (err) {
        console.warn('Database auto-sync notice:', err);
      }
    };

    window.addEventListener('database-updated', handleDbUpdated);
    return () => window.removeEventListener('database-updated', handleDbUpdated);
  }, [selectedDb]);

  const handleCreateDb = async () => {
    if (!newDbName.trim()) return;
    try {
      await createNewDatabase(newDbName.trim());
      setIsCreatingDb(false);
      setNewDbName('');
      await refreshDatabases();
      setSelectedDb(newDbName.trim().toLowerCase());
    } catch (err) {
      alert(`Failed to create database: ${err.message}`);
    }
  };

  const handleDeleteDb = async (e, dbName) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete database "${dbName}"?`)) return;
    try {
      await deleteExistingDatabase(dbName);
      await refreshDatabases();
      setSelectedDb('main_db');
    } catch (err) {
      alert(`Failed to delete database: ${err.message}`);
    }
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  const handleOpenQueryInEditor = (sql) => {
    setQuery(sql);
    setSqlLowerView('results');
  };

  const addQueryFile = () => {
    const number = Math.max(0, ...queryFiles.map((file) => Number(file.name.match(/^query_(\d+)\.sql$/)?.[1] || 0))) + 1;
    const id = `query-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setQueryFiles((files) => [...files, { id, name: `query_${number}.sql`, content: '-- New SQL query\n' }]);
    setActiveQueryId(id);
    setSelectedSql('');
    setQueryResult(null);
  };

  const closeQueryFile = (id) => {
    if (queryFiles.length === 1) return;
    const file = queryFiles.find((item) => item.id === id);
    if (file?.content.trim() && !window.confirm(`Close ${file.name}? Its SQL draft will be removed.`)) return;
    const nextFiles = queryFiles.filter((file) => file.id !== id);
    setQueryFiles(nextFiles);
    if (activeQueryId === id) {
      setActiveQueryId(nextFiles[0].id);
      setSelectedSql('');
      setQueryResult(null);
    }
  };

  const renameQueryFile = (id) => {
    const file = queryFiles.find((item) => item.id === id);
    if (!file) return;
    const name = window.prompt('SQL file name', file.name)?.trim();
    if (!name) return;
    const normalized = name.endsWith('.sql') ? name : `${name}.sql`;
    setQueryFiles((files) => files.map((item) => item.id === id ? { ...item, name: normalized } : item));
  };

  const importQueryFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const imported = await Promise.all(files.map(async (file) => ({ id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name.endsWith('.sql') ? file.name : `${file.name}.sql`, content: await file.text() })));
    setQueryFiles((current) => [...current, ...imported]);
    setActiveQueryId(imported[0].id);
    setQueryResult(null);
    event.target.value = '';
  };

  const downloadQueryFile = () => {
    if (!activeQueryFile) return;
    const url = URL.createObjectURL(new Blob([query], { type: 'text/sql;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = activeQueryFile.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const changeSqlDialect = (dialect) => {
    setSqlDialect(dialect);
    try { localStorage.setItem('fullcode_sql_dialect', dialect); } catch {}
    setQueryResult(null);
  };

  const openTemplate = (name, content) => {
    const id = `query-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setQueryFiles((files) => [...files, { id, name: `${name}.sql`, content }]);
    setActiveQueryId(id);
    setSelectedSql('');
    setQueryResult(null);
  };

  const insertDelimiterSnippet = () => {
    openTemplate('mysql_delimiter', `-- MySQL client directive; DELIMITER is handled by the SQL client, not the server\nDELIMITER //\n-- Put a stored procedure or cursor block here and terminate it with //\nDELIMITER ;`);
  };

  const insertProcedureTemplate = () => {
    const template = sqlDialect === 'oracle'
      ? `-- Oracle PL/SQL procedure (requires an Oracle connection to execute)\nCREATE OR REPLACE PROCEDURE show_hr_employees AS\n  CURSOR employee_cursor IS\n    SELECT employee_id, first_name, last_name FROM employees;\nBEGIN\n  FOR employee_row IN employee_cursor LOOP\n    DBMS_OUTPUT.PUT_LINE(employee_row.employee_id || ': ' || employee_row.first_name || ' ' || employee_row.last_name);\n  END LOOP;\nEND;\n/`
      : sqlDialect === 'mysql'
        ? `-- MySQL-style procedure supported by SQL Studio's sandbox\nDELIMITER //\nCREATE PROCEDURE show_hr_employees()\nBEGIN\n  SELECT employee_id, first_name, last_name FROM employees ORDER BY employee_id;\nEND//\nDELIMITER ;\n\nCALL show_hr_employees();`
        : `-- SQLite supports SQL statements, not CREATE PROCEDURE.\n-- Use this query with hr_db selected:\nSELECT employee_id, first_name, last_name FROM employees ORDER BY employee_id;`;
    openTemplate('procedure', template);
  };

  const insertCursorTemplate = () => {
    const template = sqlDialect === 'oracle'
      ? `-- Oracle PL/SQL explicit cursor (requires an Oracle connection)\nDECLARE\n  CURSOR employee_cursor IS\n    SELECT employee_id, first_name, last_name FROM employees;\nBEGIN\n  FOR employee_row IN employee_cursor LOOP\n    DBMS_OUTPUT.PUT_LINE(employee_row.first_name || ' ' || employee_row.last_name);\n  END LOOP;\nEND;\n/`
      : sqlDialect === 'mysql'
        ? `-- MySQL-style cursor procedure supported by SQL Studio's sandbox\nDELIMITER //\nCREATE PROCEDURE list_hr_employees()\nBEGIN\n  DECLARE done BOOLEAN DEFAULT FALSE;\n  DECLARE employee_id_var INT;\n  DECLARE first_name_var VARCHAR(100);\n  DECLARE last_name_var VARCHAR(100);\n  DECLARE employee_cursor CURSOR FOR\n    SELECT employee_id, first_name, last_name FROM employees ORDER BY employee_id;\n  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;\n\n  OPEN employee_cursor;\n  cursor_loop: LOOP\n    FETCH employee_cursor INTO employee_id_var, first_name_var, last_name_var;\n    IF done = 1 THEN LEAVE cursor_loop; END IF;\n    SELECT employee_id_var, first_name_var, last_name_var;\n  END LOOP;\n  CLOSE employee_cursor;\nEND//\nDELIMITER ;\n\nCALL list_hr_employees();`
        : `-- SQLite has no procedural cursor statements. Iterate these rows in host code.\nSELECT employee_id, first_name, last_name FROM employees ORDER BY employee_id;`;
    openTemplate('cursor', template);
  };

  const insertQueryTemplate = (type) => {
    const table = selectedTable || 'customers';
    const limit = sqlDialect === 'oracle' ? 'FETCH FIRST 10 ROWS ONLY' : 'LIMIT 10';
    const templates = {
      select: `SELECT *\nFROM ${table}\n${limit};`,
      filter: `SELECT *\nFROM ${table}\nWHERE 1 = 1\nORDER BY 1 DESC\n${limit};`,
      join: `SELECT a.*, b.*\nFROM ${table} AS a\nJOIN other_table AS b ON b.id = a.id\n${limit};`,
      aggregate: `SELECT country, COUNT(*) AS total\nFROM ${table}\nGROUP BY country\nORDER BY total DESC;`,
      create: `CREATE TABLE new_table (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP\n);`,
      insert: `INSERT INTO ${table} (name)\nVALUES ('Example');`,
      update: `UPDATE ${table}\nSET name = 'Updated'\nWHERE id = 1;`,
      delete: `DELETE FROM ${table}\nWHERE id = 1;`,
      view: `CREATE VIEW recent_${table} AS\nSELECT * FROM ${table}\nORDER BY 1 DESC;`,
      index: `CREATE INDEX idx_${table}_name\nON ${table} (name);`,
      transaction: `BEGIN TRANSACTION;\n-- Add your INSERT, UPDATE, or DELETE statements here\nCOMMIT;`,
      explain: `EXPLAIN QUERY PLAN\nSELECT * FROM ${table} WHERE 1 = 1;`,
      schema: sqlDialect === 'mysql' ? `DESCRIBE ${table};` : sqlDialect === 'oracle' ? `SELECT column_name, data_type, nullable\nFROM user_tab_columns\nWHERE table_name = UPPER('${table}');` : `PRAGMA table_info(${table});`,
    };
    if (type === 'cursor') return insertCursorTemplate();
    if (type === 'procedure') return insertProcedureTemplate();
    if (type === 'delimiter') return insertDelimiterSnippet();
    if (!templates[type]) return;
    openTemplate(type, templates[type]);
  };

  const runQuery = async ({ selectedOnly = false, sql: explicitSql, stayInConsole = false } = {}) => {
    if (queryRunning) return;
    const sql = explicitSql ?? (selectedOnly ? selectedSql : query);
    if (!sql.trim()) return;
    setQueryRunning(true);
    if (!stayInConsole) setSqlLowerView('results');
    setLastExecutedSql(sql);
    const started = Date.now();
    try {
      localStorage.setItem('fullcode_active_db', selectedDb);
      const executableSql = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const mysqlProgramSyntax = /\bCONTINUE\s+HANDLER\b|\bDECLARE\b[\s\S]*\bCURSOR\b|\b(?:OPEN|FETCH|CLOSE)\s+[A-Za-z_][\w$]*/i.test(executableSql);
      const oracleProgramSyntax = /\bCREATE\s+OR\s+REPLACE\s+PROCEDURE\b|\bDBMS_OUTPUT\b|%NOTFOUND|\bCURSOR\s+[A-Za-z_][\w$]*\s+IS\b|\bFETCH\s+FIRST\s+\d+\s+ROWS\s+ONLY\b/i.test(executableSql);
      const hasRoutineCommand = /\bCREATE\s+PROCEDURE\b|\bCALL\s+[a-zA-Z_][\w$]*\s*\(/i.test(executableSql);
      if ((sqlDialect === 'mysql' && mysqlProgramSyntax && !hasRoutineCommand) || (sqlDialect === 'oracle' && oracleProgramSyntax)) {
        const message = sqlDialect === 'mysql'
          ? `This cursor statement must be inside a complete CREATE PROCEDURE or CALL a procedure created earlier. SQL Studio supports the common cursor loop pattern in its SQL sandbox.`
          : `This script uses Oracle PL/SQL syntax, but SQL Studio is connected to SQLite. Connect an Oracle server to execute this script.`;
        setQueryResult({ success: false, error: message, output: message });
        setSqlResultTab('output');
        setConsoleHistory((history) => [...history, { sql, message, success: false, time: new Date().toLocaleTimeString() }]);
        return;
      }
      const result = await executeCode(sql, 82, '', [], activeQueryFile?.name || 'query.sql');
      setQueryResult(result);
      setSqlResultTab(result?.success === false ? 'output' : 'grid');
      setConsoleHistory((history) => [...history, { sql, message: result?.error || result?.output || `${result?.sqlData?.rowCount ?? 0} rows · ${Date.now() - started} ms`, success: result?.success !== false, time: new Date().toLocaleTimeString() }]);
      window.dispatchEvent(new CustomEvent('database-updated', { detail: { database: selectedDb } }));
    } catch (error) {
      setQueryResult({ success: false, error: error.message, output: error.message });
      setSqlResultTab('output');
      setConsoleHistory((history) => [...history, { sql, message: error.message, success: false, time: new Date().toLocaleTimeString() }]);
    } finally {
      setQueryRunning(false);
    }
  };

  const copySqlResult = async () => {
    const data = queryResult?.sqlData || queryResult;
    if (!data?.columns?.length) return;
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [data.columns, ...(data.rows || []).map((row) => data.columns.map((column) => row[column]))]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      setCopiedSqlResult(true);
      window.setTimeout(() => setCopiedSqlResult(false), 1600);
    } catch {
      setCopiedSqlResult(false);
    }
  };

  const getConnectorSnippet = () => {
    if (connectorLang === 'python') {
      return `# Connect to CodeForge SQLite Database (${selectedDb})
import sqlite3

conn = sqlite3.connect("server/data/databases/${selectedDb}.sqlite")
cursor = conn.cursor()

cursor.execute("SELECT * FROM ${selectedTable || 'customers'} LIMIT 5")
for row in cursor.fetchall():
    print(row)

conn.close()`;
    }
    if (connectorLang === 'javascript') {
      return `// Query CodeForge Backend Database via REST API
const res = await fetch("/api/db/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    database: "${selectedDb}",
    query: "SELECT * FROM ${selectedTable || 'customers'} LIMIT 5"
  })
});
const data = await res.json();
console.log(data.rows);`;
    }
    if (connectorLang === 'sql') {
      return `-- Active Database: ${selectedDb}
SELECT * FROM ${selectedTable || 'customers'} LIMIT 10;`;
    }
    return '';
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getConnectorSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentTableSchema = schema?.tables?.find((t) => t.tableName === selectedTable);
  const isCurrentView = currentTableSchema?.type === 'view' || Boolean(currentTableSchema?.isView);
  const currentTableDdl = currentTableSchema?.sql || '';

  const handleCopyDdl = () => {
    if (currentTableDdl) {
      navigator.clipboard.writeText(currentTableDdl);
      setCopiedDdl(true);
      setTimeout(() => setCopiedDdl(false), 2000);
    }
  };

  return (
    <div className={`database-panel ${isResizing ? 'is-resizing' : ''}`} style={{ '--db-sidebar-width': `${sidebarWidth}px`, '--sql-query-pane-height': `${queryPaneHeight}px` }}>
      {/* Sidebar: Databases & Tables */}
      <div className="db-sidebar">
        {/* Database Selector Bar */}
        <div className="db-header-bar">
          <div className="db-select-wrapper">
            <Database size={15} className="db-icon-accent" />
            <select
              className="db-select"
              value={selectedDb}
              onChange={(e) => {
                const newDb = e.target.value;
                setSelectedDb(newDb);
                loadSchema(newDb);
              }}
            >
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name} ({db.tablesCount} tables)
                </option>
              ))}
            </select>
          </div>

          <div className="db-header-actions">
            <button
              className="btn-db-icon"
              onClick={() => setIsCreatingDb(!isCreatingDb)}
              title="Create New Database"
            >
              <Plus size={14} />
            </button>
            <button
              className="btn-db-icon"
              onClick={() => {
                refreshDatabases();
                loadSchema(selectedDb);
              }}
              title="Refresh Schema"
            >
              <RefreshCw size={13} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        {/* Create DB Input */}
        {isCreatingDb && (
          <div className="db-create-box animate-slide-up">
            <input
              type="text"
              placeholder="database_name..."
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDb()}
              className="db-create-input"
              autoFocus
            />
            <button className="btn-create-submit" onClick={handleCreateDb}>
              Create
            </button>
          </div>
        )}

        {/* Tables & Schema Tree */}
        <div className="db-tables-list">
          <div className="db-section-header">
            <div className="db-section-title">
              <Layers size={13} />
              <span>TABLES ({schema?.tables?.length || 0})</span>
            </div>
            <button
              className="btn-schema-quick"
              title="Show entire database schema (.schema)"
              onClick={() => handleOpenQueryInEditor('.schema;')}
            >
              <Terminal size={11} />
              <span>.schema</span>
            </button>
          </div>

          {schema?.tables && schema.tables.length > 0 ? (
            schema.tables.map((table) => {
              const isSelected = selectedTable === table.tableName;
              const isExpanded = expandedTables[table.tableName];
              const isView = table.type === 'view' || Boolean(table.isView);

              return (
                <div key={table.tableName} className="table-tree-node">
                  <div
                    className={`table-tree-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTable(table.tableName);
                      loadTableData(selectedDb, table.tableName);
                    }}
                  >
                    <button
                      className="tree-expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTableExpand(table.tableName);
                      }}
                    >
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>

                    {isView ? (
                      <span className="table-view-badge" title="SQL View">VIEW</span>
                    ) : (
                      <TableIcon size={14} className="table-icon" />
                    )}
                    <span className="table-name">{table.tableName}</span>
                    <span className="table-badge">{table.rowCount} rows</span>
                  </div>

                  {/* Columns Subtree */}
                  {isExpanded && (
                    <div className="table-columns-subtree animate-slide-up">
                      {table.columns.map((col) => (
                        <div key={col.name} className="column-tree-item">
                          <Columns size={11} className="col-icon" />
                          <span className="col-name">{col.name}</span>
                          <span className="col-type">{col.type}</span>
                          {col.isPrimaryKey && <span className="col-pk">PK</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="db-empty-state">
              <span>No tables found in {selectedDb}</span>
              <button
                className="btn-quick-create"
                onClick={() =>
                  handleOpenQueryInEditor(
                    `CREATE TABLE items (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  price REAL\n);\n\nINSERT INTO items (name, price) VALUES ('Item 1', 19.99);`
                  )
                }
              >
                <Sparkles size={13} /> Create First Table
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="db-pane-resize db-sidebar-resize"
        role="separator"
        aria-label="Resize database and tables sidebar"
        aria-orientation="vertical"
        aria-valuemin={200}
        aria-valuemax={700}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        onPointerDown={(event) => startResize(event, 'x', sidebarWidth)}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          setSidebarWidth((width) => {
            const next = Math.max(200, Math.min(700, width + (event.key === 'ArrowRight' ? 16 : -16)));
            try { localStorage.setItem('fullcode_sql_sidebar_width', String(next)); } catch {}
            return next;
          });
        }}
      />

      {/* Main Area: Visual Table Data Viewer & SQL Runner */}
      <div className="db-main-content">
        <section className="sql-query-workbench">
          <div className="sql-query-workbench-head">
            <strong>SQL Query</strong><span>{selectedDb}</span>
            <label className="sql-dialect-picker">Dialect<select aria-label="SQL dialect" value={sqlDialect} onChange={(event) => changeSqlDialect(event.target.value)}><option value="sqlite">SQLite (active engine)</option><option value="oracle">Oracle SQL</option><option value="mysql">MySQL</option></select></label>
            <select className="sql-template-picker" aria-label="SQL templates" value="" onChange={(event) => { insertQueryTemplate(event.target.value); event.target.value = ''; }}>
              <option value="">Templates…</option>
              <optgroup label="Queries"><option value="select">Select rows</option><option value="filter">Filter and sort</option><option value="join">Join tables</option><option value="aggregate">Group and count</option><option value="explain">Explain query plan</option></optgroup>
              <optgroup label="Tables and data"><option value="create">Create table</option><option value="insert">Insert row</option><option value="update">Update row</option><option value="delete">Delete row</option><option value="view">Create view</option><option value="index">Create index</option><option value="transaction">Transaction</option><option value="schema">Table schema</option></optgroup>
              <optgroup label="Procedural reference"><option value="cursor">Cursor</option><option value="procedure">Procedure</option>{sqlDialect === 'mysql' && <option value="delimiter">MySQL DELIMITER</option>}</optgroup>
            </select>
            <button type="button" className="sql-run-selection" onClick={() => runQuery({ selectedOnly: true })} disabled={queryRunning || !selectedSql.trim()} title="Run highlighted SQL">Run selection</button>
            <button type="button" onClick={() => runQuery()} disabled={queryRunning}>{queryRunning ? 'Running…' : '▶ Run query'}</button>
          </div>
          <div className="sql-file-tabs" role="tablist" aria-label="SQL query files">
            {queryFiles.map((file) => <div key={file.id} className={`sql-file-tab ${activeQueryFile?.id === file.id ? 'active' : ''}`}><button type="button" role="tab" aria-selected={activeQueryFile?.id === file.id} onClick={() => { setActiveQueryId(file.id); setSelectedSql(''); setQueryResult(null); }} onDoubleClick={() => renameQueryFile(file.id)} title="Double click to rename"><FileCode size={13} />{file.name}</button>{queryFiles.length > 1 && <button type="button" className="sql-file-close" aria-label={`Close ${file.name}`} onClick={() => closeQueryFile(file.id)}><X size={12} /></button>}</div>)}
            <button type="button" className="sql-file-add" onClick={addQueryFile} title="New SQL file" aria-label="New SQL file"><Plus size={14} /></button>
            <div className="sql-file-actions"><input ref={sqlFileInputRef} type="file" accept=".sql,.txt,text/sql,text/plain" multiple hidden onChange={importQueryFiles} /><button type="button" onClick={() => sqlFileInputRef.current?.click()}>Open .sql</button><button type="button" onClick={downloadQueryFile}>Download</button></div>
          </div>
          {sqlDialect !== 'sqlite' && <div className="sql-dialect-notice">{sqlDialect === 'oracle' ? 'Oracle templates are for reference. Run Query currently uses this workspace’s SQLite engine; Oracle PL/SQL cannot execute here.' : 'Common MySQL stored procedures and cursor loops run in SQL Studio’s sandbox. Advanced MySQL server-specific features may behave differently from a live MySQL server.'}</div>}
          <textarea ref={queryEditorRef} aria-label="SQL query editor" spellCheck="false" value={query} onChange={(event) => setQuery(event.target.value)} onSelect={(event) => setSelectedSql(event.currentTarget.value.slice(event.currentTarget.selectionStart, event.currentTarget.selectionEnd))} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); const selection = event.currentTarget.value.slice(event.currentTarget.selectionStart, event.currentTarget.selectionEnd); runQuery(selection.trim() ? { sql: selection } : {}); } }} />
        </section>
        <div
          className="db-pane-resize db-query-resize"
          role="separator"
          aria-label="Resize SQL query and results panes"
          aria-orientation="horizontal"
          aria-valuemin={180}
          aria-valuemax={Math.round(typeof window === 'undefined' ? 900 : window.innerHeight * 0.76)}
          aria-valuenow={queryPaneHeight}
          tabIndex={0}
          onPointerDown={(event) => startResize(event, 'y', queryPaneHeight)}
          onKeyDown={(event) => {
            if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            setQueryPaneHeight((height) => {
              const next = Math.max(180, Math.min(window.innerHeight * 0.76, height + (event.key === 'ArrowDown' ? 16 : -16)));
              try { localStorage.setItem('fullcode_sql_query_pane_height', String(next)); } catch {}
              return next;
            });
          }}
        />
        <div className="sql-lower-workspace">
          <div className="sql-lower-tabs" role="tablist" aria-label="SQL workspace panels">
            <button type="button" role="tab" aria-selected={sqlLowerView === 'results'} className={sqlLowerView === 'results' ? 'active' : ''} onClick={() => setSqlLowerView('results')}>
              Query Results {queryResult?.sqlData?.rowCount != null && <span>{queryResult.sqlData.rowCount}</span>}
            </button>
            <button type="button" role="tab" aria-selected={sqlLowerView === 'table'} className={sqlLowerView === 'table' ? 'active' : ''} onClick={() => setSqlLowerView('table')}>Table View</button>
            <button type="button" role="tab" aria-selected={sqlLowerView === 'console'} className={sqlLowerView === 'console' ? 'active' : ''} onClick={() => setSqlLowerView('console')}><Terminal size={13} /> SQL Console</button>
          </div>
          {sqlLowerView === 'results' ? (
            <section className="sql-results-workspace" aria-label="Query output and result grid">
              <div className="sql-results-toolbar">
                <div className="sql-results-tabs" role="tablist" aria-label="Query result views">
                  <button type="button" role="tab" aria-selected={sqlResultTab === 'grid'} className={sqlResultTab === 'grid' ? 'active' : ''} onClick={() => setSqlResultTab('grid')}><TableIcon size={13} /> Result Grid</button>
                  <button type="button" role="tab" aria-selected={sqlResultTab === 'output'} className={sqlResultTab === 'output' ? 'active' : ''} onClick={() => setSqlResultTab('output')}><Terminal size={13} /> Output</button>
                </div>
                <div className="sql-results-meta">
                  {queryRunning ? <span className="sql-running-indicator">Running query…</span> : queryResult ? <span className={queryResult.success === false ? 'sql-result-failed' : 'sql-result-success'}>{queryResult.success === false ? 'Failed' : 'Completed'}</span> : <span>Ready</span>}
                  {queryResult?.sqlData?.executionTimeMs != null && <span>{queryResult.sqlData.executionTimeMs} ms</span>}
                  {queryResult?.sqlData?.rowCount != null && <span>{queryResult.sqlData.rowCount} rows</span>}
                  {sqlResultTab === 'grid' && <button type="button" className="sql-copy-result" onClick={copySqlResult} disabled={!((queryResult?.sqlData || queryResult)?.columns?.length)}>{copiedSqlResult ? 'Copied CSV' : 'Copy CSV'}</button>}
                </div>
              </div>
              {sqlResultTab === 'grid' ? (() => {
                const resultData = queryResult?.sqlData || queryResult;
                return resultData?.columns?.length ? (
                  <div className="sql-result-grid-wrap">
                    <table className="db-data-table sql-result-grid">
                      <thead><tr><th className="sql-row-number">#</th>{resultData.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                      <tbody>{(resultData.rows || []).map((row, rowIndex) => <tr key={rowIndex}><td className="sql-row-number">{rowIndex + 1}</td>{resultData.columns.map((column) => <td key={column}>{row[column] == null ? <span className="cell-null">NULL</span> : String(row[column])}</td>)}</tr>)}</tbody>
                    </table>
                    {resultData.rows?.length === 0 && <div className="sql-empty-result">Query completed with no rows returned. Open Output for execution details.</div>}
                  </div>
                ) : <div className="sql-empty-result">{queryResult ? 'This statement did not return a result grid. Open Output for details.' : 'Run a query to see its result grid here.'}</div>;
              })() : (
                <div className={`sql-output-content ${queryResult?.success === false ? 'error' : ''}`}>
                  {queryResult ? <><div className="sql-output-statement"><span>Statement</span><code>{lastExecutedSql.trim() || '(empty query)'}</code></div><pre>{queryResult.error || queryResult.output || queryResult.logs?.join('\n') || (queryResult.success === false ? 'Query failed.' : 'Query completed successfully.')}</pre></> : <div className="sql-empty-result">Execution messages, affected row counts, and errors will appear here.</div>}
                </div>
              )}
            </section>
          ) : sqlLowerView === 'console' ? (
            <section className="sql-console" aria-label="SQL console">
              <div className="sql-console-head"><Terminal size={14} /> SQLite console · {selectedDb}<button type="button" onClick={() => setConsoleHistory([])} disabled={!consoleHistory.length}>Clear</button></div>
              <div className="sql-console-history" role="log" aria-live="polite">
                {!consoleHistory.length && <div className="sql-console-empty">Run a query or enter SQL below. Commands and execution messages appear here.</div>}
                {consoleHistory.map((entry, index) => <div className="sql-console-entry" key={`${entry.time}-${index}`}><div className="sql-console-command"><span>{entry.time} {selectedDb}&gt;</span><pre>{entry.sql}</pre></div><pre className={entry.success ? 'success' : 'error'}>{entry.message}</pre></div>)}
              </div>
              <form className="sql-console-input" onSubmit={(event) => { event.preventDefault(); if (consoleInput.trim()) { runQuery({ sql: consoleInput, stayInConsole: true }); setConsoleInput(''); } }}><span>{selectedDb}&gt;</span><input aria-label="SQL console command" value={consoleInput} onChange={(event) => setConsoleInput(event.target.value)} placeholder="Enter a SQL statement and press Enter" disabled={queryRunning} /><button type="submit" disabled={queryRunning || !consoleInput.trim()}>Run</button></form>
            </section>
          ) : selectedTable && tableData ? (
          <div className="table-viewer-wrapper">
            {/* Table Viewer Toolbar */}
            <div className="table-toolbar">
              <div className="toolbar-left">
                <span className="table-title">
                  <strong>{selectedDb}</strong> / {selectedTable}
                  {isCurrentView && <span className="view-pill-indicator">SQL VIEW</span>}
                </span>
                <div className="view-mode-toggle">
                  <button
                    className={`btn-toggle-tab ${viewMode === 'data' ? 'active' : ''}`}
                    onClick={() => setViewMode('data')}
                  >
                    <TableIcon size={12} />
                    <span>Data ({tableData?.total || tableData?.rows?.length || 0})</span>
                  </button>
                  <button
                    className={`btn-toggle-tab ${viewMode === 'schema' ? 'active' : ''}`}
                    onClick={() => setViewMode('schema')}
                  >
                    <FileCode size={12} />
                    <span>Schema & DDL</span>
                  </button>
                </div>
              </div>

              <div className="toolbar-right">
                <div className="schema-query-shortcuts">
                  <button
                    className="btn-schema-shortcut"
                    onClick={() => handleOpenQueryInEditor(`.schema ${selectedTable};`)}
                    title="Run .schema query in editor"
                  >
                    .schema
                  </button>
                  <button
                    className="btn-schema-shortcut"
                    onClick={() => handleOpenQueryInEditor(`PRAGMA table_info(${selectedTable});`)}
                    title="Run PRAGMA table_info in editor"
                  >
                    PRAGMA
                  </button>
                  <button
                    className="btn-schema-shortcut"
                    onClick={() =>
                      handleOpenQueryInEditor(
                        `SELECT type, name, sql FROM sqlite_master WHERE tbl_name = '${selectedTable}';`
                      )
                    }
                    title="Query sqlite_master in editor"
                  >
                    sqlite_master
                  </button>
                </div>

                <button
                  className="btn-toolbar"
                  onClick={() =>
                    handleOpenQueryInEditor(
                      `SELECT * FROM "${selectedTable}" ORDER BY 1 DESC LIMIT 100;`
                    )
                  }
                  title="Load a SELECT query into SQL Studio"
                >
                  <Code size={13} />
                  <span>Load query</span>
                </button>
                <button
                  className="btn-toolbar"
                  onClick={() => {
                    const sql = `SELECT * FROM "${selectedTable}" ORDER BY 1 DESC LIMIT 100;`;
                    setQuery(sql);
                    runQuery({ sql });
                  }}
                  title={isCurrentView ? 'Run a SELECT against this SQL view in SQL Studio' : 'Run a SELECT against this table in SQL Studio'}
                  disabled={queryRunning}
                >
                  <Play size={13} />
                  <span>Run here</span>
                </button>
                <button
                  className="btn-toolbar"
                  onClick={() => loadTableData(selectedDb, selectedTable)}
                  title="Refresh Table Data"
                >
                  <RefreshCw size={12} className={loading ? 'spinning' : ''} />
                </button>
              </div>
            </div>

            {/* View Mode: Data Grid */}
            {viewMode === 'data' ? (
              <div className="table-grid-scroll">
                {tableData.rows && tableData.rows.length > 0 ? (
                  <table className="db-data-table">
                    <thead>
                      <tr>
                        {tableData.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx}>
                          {tableData.columns.map((col) => (
                            <td key={col}>
                              {row[col] === null ? (
                                <span className="cell-null">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="table-empty-notice">
                    <span>
                      {isCurrentView
                        ? `View "${selectedTable}" has 0 rows matching its query.`
                        : `Table "${selectedTable}" is empty.`}
                    </span>
                    {isCurrentView ? (
                      <button
                        className="btn-insert-sample"
                        onClick={() =>
                          handleOpenQueryInEditor(
                            currentTableDdl || `SELECT * FROM ${selectedTable};`
                          )
                        }
                      >
                        Inspect View DDL
                      </button>
                    ) : (
                      <button
                        className="btn-insert-sample"
                        onClick={() =>
                          handleOpenQueryInEditor(
                            `INSERT INTO ${selectedTable} DEFAULT VALUES;`
                          )
                        }
                      >
                        Insert Row
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* View Mode: Schema & DDL View */
              <div className="schema-viewer-container animate-slide-up">
                {/* DDL SQL Card */}
                <div className="schema-ddl-card">
                  <div className="schema-card-header">
                    <div className="schema-card-title">
                      <FileCode size={14} className="accent-icon" />
                      <span>{isCurrentView ? 'SQLite View DDL (CREATE VIEW)' : 'SQLite Table DDL (CREATE TABLE)'}</span>
                    </div>
                    <div className="schema-card-actions">
                      <button className="btn-ddl-action" onClick={handleCopyDdl}>
                        {copiedDdl ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedDdl ? 'Copied DDL' : 'Copy DDL'}</span>
                      </button>
                      <button
                        className="btn-ddl-action primary"
                        onClick={() =>
                          handleOpenQueryInEditor(
                            currentTableDdl || `-- Schema for ${selectedTable}\n.schema ${selectedTable};`
                          )
                        }
                      >
                        <Code size={12} />
                        <span>Load Query</span>
                      </button>
                    </div>
                  </div>
                  <div className="schema-code-block">
                    <pre>{currentTableDdl || `-- No DDL available for ${selectedTable}`}</pre>
                  </div>
                </div>

                {/* Column Specifications Table */}
                <div className="schema-columns-card">
                  <div className="schema-card-header">
                    <div className="schema-card-title">
                      <Columns size={14} className="accent-icon" />
                      <span>Column Specifications ({currentTableSchema?.columns?.length || 0} fields)</span>
                    </div>
                  </div>
                  <div className="schema-columns-table-scroll">
                    <table className="db-data-table schema-table">
                      <thead>
                        <tr>
                          <th>Field Name</th>
                          <th>Data Type</th>
                          <th>Primary Key</th>
                          <th>Nullable</th>
                          <th>Default Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTableSchema?.columns?.map((col) => (
                          <tr key={col.name}>
                            <td className="col-name-cell">
                              <code>{col.name}</code>
                            </td>
                            <td>
                              <span className="col-type-tag">{col.type}</span>
                            </td>
                            <td>
                              {col.isPrimaryKey ? (
                                <span className="badge-pk">PRIMARY KEY</span>
                              ) : (
                                <span className="cell-muted">-</span>
                              )}
                            </td>
                            <td>
                              {col.notNull ? (
                                <span className="badge-notnull">NOT NULL</span>
                              ) : (
                                <span className="cell-muted">NULL</span>
                              )}
                            </td>
                            <td>
                              {col.defaultValue !== null && col.defaultValue !== undefined ? (
                                <code>{String(col.defaultValue)}</code>
                              ) : (
                                <span className="cell-muted">NULL</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Interactive Quick Schema Query Runner Chips */}
                <div className="schema-queries-bar">
                  <span className="queries-bar-label">Run SQLite Queries:</span>
                  <button
                    className="btn-query-chip"
                    onClick={() =>
                      handleOpenQueryInEditor(`SELECT * FROM ${selectedTable};`)
                    }
                  >
                    <Terminal size={12} />
                    <span>SELECT *</span>
                  </button>
                  <button
                    className="btn-query-chip"
                    onClick={() =>
                      handleOpenQueryInEditor(`.schema ${selectedTable};\nPRAGMA table_info(${selectedTable});`)
                    }
                  >
                    <Terminal size={12} />
                    <span>.schema & PRAGMA</span>
                  </button>
                  <button
                    className="btn-query-chip"
                    onClick={() =>
                      handleOpenQueryInEditor(
                        `SELECT sql FROM sqlite_master WHERE tbl_name = '${selectedTable}';`
                      )
                    }
                  >
                    <Code size={12} />
                    <span>sqlite_master DDL</span>
                  </button>
                  <button
                    className="btn-query-chip"
                    onClick={() =>
                      handleOpenQueryInEditor(
                        isCurrentView
                          ? `SHOW CREATE VIEW ${selectedTable};`
                          : `SHOW CREATE TABLE ${selectedTable};`
                      )
                    }
                  >
                    <FileCode size={12} />
                    <span>{isCurrentView ? 'SHOW CREATE VIEW' : 'SHOW CREATE TABLE'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cross-Language Connector Footer */}
            <div className="connector-snippet-bar">
              <div className="connector-lang-tabs">
                <span className="connector-label">Connect via:</span>
                <button
                  className={`btn-lang-tab ${connectorLang === 'python' ? 'active' : ''}`}
                  onClick={() => setConnectorLang('python')}
                >
                  Python (sqlite3)
                </button>
                <button
                  className={`btn-lang-tab ${connectorLang === 'javascript' ? 'active' : ''}`}
                  onClick={() => setConnectorLang('javascript')}
                >
                  JavaScript (Fetch)
                </button>
                <button
                  className={`btn-lang-tab ${connectorLang === 'sql' ? 'active' : ''}`}
                  onClick={() => setConnectorLang('sql')}
                >
                  Pure SQL
                </button>
              </div>

              <div className="connector-actions">
                <button className="btn-copy-connector" onClick={handleCopySnippet}>
                  {copiedCode ? <Check size={13} /> : <Code size={13} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code Snippet'}</span>
                </button>
                <button
                  className="btn-insert-editor"
                  onClick={() => handleOpenQueryInEditor(getConnectorSnippet())}
                >
                  <span>Open in Editor</span>
                </button>
              </div>
            </div>
          </div>
          ) : (
          <div className="db-no-table-selected">
            <Database size={48} className="db-placeholder-icon" />
            <h3>Multi-Database SQL Engine Active</h3>
            <p>
              Select a database from the sidebar or create a new table to view and edit records.
            </p>
            <div className="db-sample-buttons">
              {databases.map((db) => (
                <button
                  key={db.name}
                  className="btn-sample-db"
                  onClick={() => setSelectedDb(db.name)}
                >
                  <Database size={13} />
                  <span>{db.name}</span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
