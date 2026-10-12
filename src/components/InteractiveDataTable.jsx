import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  Database,
  Maximize2,
  Minimize2,
  Table as TableIcon,
} from 'lucide-react';
import './InteractiveDataTable.css';

/**
 * Google Colab-style Interactive Data Table Component
 * Features real-time multi-column search, column sorting, pagination, type badges,
 * and one-click export to CSV / JSON.
 */
export default function InteractiveDataTable({ table, title = 'Interactive DataFrame' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const columns = useMemo(() => table?.columns || [], [table]);
  const dtypes = useMemo(() => table?.dtypes || {}, [table]);
  const rawData = useMemo(() => table?.data || [], [table]);
  const shape = useMemo(() => table?.shape || [rawData.length, columns.length], [table, rawData, columns]);

  // Filter rows based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return rawData;
    const term = searchTerm.toLowerCase();
    return rawData.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [rawData, columns, searchTerm]);

  // Sort rows based on sortColumn and sortDirection
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Numeric comparison if both are numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // String comparison
      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, undefined, { numeric: true })
        : strB.localeCompare(strA, undefined, { numeric: true });
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination calculation
  const totalRows = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const paginatedRows = useMemo(
    () => sortedData.slice(startIndex, endIndex),
    [sortedData, startIndex, endIndex]
  );

  // Toggle sort on column click
  const handleSort = (col) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Copy table as CSV
  const handleCopyCSV = () => {
    try {
      const header = columns.join(',');
      const rows = sortedData.map((row) =>
        columns.map((c) => {
          const val = row[c] ?? '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      );
      const csv = [header, ...rows].join('\n');
      navigator.clipboard.writeText(csv);
      setCopiedFormat('csv');
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (_) {}
  };

  // Copy table as JSON
  const handleCopyJSON = () => {
    try {
      const json = JSON.stringify(sortedData, null, 2);
      navigator.clipboard.writeText(json);
      setCopiedFormat('json');
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (_) {}
  };

  // Download CSV file
  const handleDownloadCSV = () => {
    try {
      const header = columns.join(',');
      const rows = sortedData.map((row) =>
        columns.map((c) => {
          const val = row[c] ?? '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dataframe_export_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  if (!columns.length) return null;

  return (
    <div className={`colab-datatable-container ${isExpanded ? 'is-fullscreen' : ''}`}>
      {/* Table Toolbar Header */}
      <div className="colab-table-toolbar">
        <div className="table-toolbar-left">
          <div className="table-title-badge">
            <TableIcon size={14} className="badge-icon" />
            <span className="table-name">{title}</span>
            <span className="table-shape-badge">
              {shape[0]} rows × {shape[1]} cols
            </span>
          </div>

          <div className="table-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="table-search-input"
            />
            {searchTerm && (
              <button
                className="table-search-clear"
                onClick={() => setSearchTerm('')}
                title="Clear search filter"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="table-toolbar-right">
          <button
            className="colab-tool-btn"
            onClick={handleCopyCSV}
            title="Copy as CSV"
          >
            {copiedFormat === 'csv' ? <Check size={12} className="text-green" /> : <Copy size={12} />}
            <span>{copiedFormat === 'csv' ? 'Copied CSV' : 'Copy CSV'}</span>
          </button>

          <button
            className="colab-tool-btn"
            onClick={handleCopyJSON}
            title="Copy as JSON"
          >
            {copiedFormat === 'json' ? <Check size={12} className="text-green" /> : <Copy size={12} />}
            <span>{copiedFormat === 'json' ? 'Copied JSON' : 'JSON'}</span>
          </button>

          <button
            className="colab-tool-btn"
            onClick={handleDownloadCSV}
            title="Download CSV file"
          >
            <Download size={12} />
            <span>Export</span>
          </button>

          <button
            className="colab-tool-btn btn-icon-only"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Collapse Table' : 'Expand Table View'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Interactive Scrollable Table Grid */}
      <div className="colab-table-scroll-wrapper">
        <table className="colab-table-grid">
          <thead>
            <tr>
              <th className="colab-th-index">#</th>
              {columns.map((col) => {
                const dtype = dtypes[col] || '';
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`colab-th-col ${isSorted ? 'is-sorted' : ''}`}
                    title={`Click to sort by ${col}`}
                  >
                    <div className="th-content-wrapper">
                      <div className="th-titles">
                        <span className="th-name">{col}</span>
                        {dtype && <span className="th-dtype">{dtype}</span>}
                      </div>
                      <div className="th-sort-icon">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp size={12} className="sort-active" />
                          ) : (
                            <ArrowDown size={12} className="sort-active" />
                          )
                        ) : (
                          <ArrowUpDown size={11} className="sort-muted" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rowIdx) => {
                const globalRowIdx = startIndex + rowIdx;
                return (
                  <tr key={globalRowIdx} className="colab-tr-row">
                    <td className="colab-td-index">{globalRowIdx}</td>
                    {columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined;
                      const isNumber = typeof val === 'number';
                      return (
                        <td
                          key={col}
                          className={`colab-td-cell ${isNull ? 'is-null' : isNumber ? 'is-number' : ''}`}
                        >
                          {isNull ? (
                            <span className="val-null">NaN</span>
                          ) : typeof val === 'boolean' ? (
                            <span className="val-bool">{val ? 'True' : 'False'}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="colab-empty-state">
                  No records match your search filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="colab-table-footer">
        <div className="footer-stats">
          Showing <strong>{totalRows > 0 ? startIndex + 1 : 0}</strong>–
          <strong>{endIndex}</strong> of <strong>{totalRows}</strong> records
          {searchTerm && <span className="filtered-note"> (filtered from {rawData.length} total)</span>}
        </div>

        <div className="footer-controls">
          <div className="page-size-selector">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="page-size-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="pagination-nav">
            <button
              className="page-nav-btn"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="page-indicator">
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              className="page-nav-btn"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
