import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import './DatabasePanel.css';

export default function DatabasePanel() {
  const { handleCodeChange, handleSelectLanguage, handleAddFile } = useApp();

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
  const [connectorLang, setConnectorLang] = useState('python');

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
    handleAddFile('query.sql', sql);
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

  return (
    <div className="database-panel">
      {/* Sidebar: Databases & Tables */}
      <div className="db-sidebar">
        {/* Database Selector Bar */}
        <div className="db-header-bar">
          <div className="db-select-wrapper">
            <Database size={15} className="db-icon-accent" />
            <select
              className="db-select"
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
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
            <Layers size={13} />
            <span>TABLES ({schema?.tables?.length || 0})</span>
          </div>

          {schema?.tables && schema.tables.length > 0 ? (
            schema.tables.map((table) => {
              const isSelected = selectedTable === table.tableName;
              const isExpanded = expandedTables[table.tableName];

              return (
                <div key={table.tableName} className="table-tree-node">
                  <div
                    className={`table-tree-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedTable(table.tableName)}
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

                    <TableIcon size={14} className="table-icon" />
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

      {/* Main Area: Visual Table Data Viewer & SQL Runner */}
      <div className="db-main-content">
        {selectedTable && tableData ? (
          <div className="table-viewer-wrapper">
            {/* Table Viewer Toolbar */}
            <div className="table-toolbar">
              <div className="toolbar-left">
                <span className="table-title">
                  <strong>{selectedDb}</strong> / {selectedTable}
                </span>
                <span className="table-row-count">
                  Showing {tableData.rows?.length || 0} of {tableData.total || 0} records
                </span>
              </div>

              <div className="toolbar-right">
                <button
                  className="btn-toolbar"
                  onClick={() =>
                    handleOpenQueryInEditor(
                      `SELECT * FROM ${selectedTable} WHERE 1=1 ORDER BY 1 DESC;`
                    )
                  }
                  title="Query this table in editor"
                >
                  <Code size={13} />
                  <span>Query Table</span>
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

            {/* Table Data Grid */}
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
                  <span>Table "{selectedTable}" is empty.</span>
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
                </div>
              )}
            </div>

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
  );
}
