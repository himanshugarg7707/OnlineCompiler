import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { executeCode } from '../services/judge0Service';
import {
  FlaskConical,
  Play,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Dices,
  Sliders,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Eye,
  FileCheck,
} from 'lucide-react';
import './TestCaseSuitePanel.css';

const DEFAULT_TEST_CASES = [
  {
    id: 'tc-1',
    name: 'Sample Case 1',
    input: '5\n1 2 3 4 5',
    expectedOutput: '15',
    actualOutput: '',
    status: 'idle', // idle | running | passed | failed | error | tle
    executionTime: null,
  },
  {
    id: 'tc-2',
    name: 'Sample Case 2',
    input: '3\n10 20 30',
    expectedOutput: '60',
    actualOutput: '',
    status: 'idle',
    executionTime: null,
  },
  {
    id: 'tc-3',
    name: 'Edge Case: Empty / Zero',
    input: '0\n',
    expectedOutput: '0',
    actualOutput: '',
    status: 'idle',
    executionTime: null,
  },
];

/**
 * Character-level visual diff generator for Expected vs Actual output
 */
function computeVisualDiff(expected, actual) {
  if (expected === actual) {
    return { isMatch: true, parts: [{ type: 'match', text: actual }] };
  }

  const expClean = expected ?? '';
  const actClean = actual ?? '';

  // Display whitespace markers for spaces and newlines
  const formatVisibleWs = (str) =>
    str.replace(/ /g, '·').replace(/\t/g, '⇥\t').replace(/\n/g, '↵\n');

  const expLines = expClean.split('\n');
  const actLines = actClean.split('\n');

  const diffLines = [];
  const maxLines = Math.max(expLines.length, actLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expL = expLines[i] ?? '';
    const actL = actLines[i] ?? '';

    if (expL === actL) {
      diffLines.push({
        lineNum: i + 1,
        type: 'match',
        expected: formatVisibleWs(expL),
        actual: formatVisibleWs(actL),
      });
    } else {
      diffLines.push({
        lineNum: i + 1,
        type: 'diff',
        expected: formatVisibleWs(expL),
        actual: formatVisibleWs(actL),
      });
    }
  }

  return { isMatch: false, diffLines };
}

export default function TestCaseSuitePanel() {
  const { state, showToast } = useApp();
  const { code, detectedLanguage, files, activeFileId } = state;

  const [testCases, setTestCases] = useState(() => {
    try {
      const saved = localStorage.getItem('fullcode_test_cases');
      return saved ? JSON.parse(saved) : DEFAULT_TEST_CASES;
    } catch {
      return DEFAULT_TEST_CASES;
    }
  });

  const [activeCaseId, setActiveCaseId] = useState(testCases[0]?.id || 'tc-1');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [stressModalOpen, setStressModalOpen] = useState(false);
  const [stressCount, setStressCount] = useState(10);
  const [stressType, setStressType] = useState('array'); // 'array' | 'string' | 'pairs'
  const [stressMin, setStressMin] = useState(1);
  const [stressMax, setStressMax] = useState(100);
  const [stressLength, setStressLength] = useState(5);
  const [stressResults, setStressResults] = useState([]);
  const [isStressRunning, setIsStressRunning] = useState(false);

  const activeTestCase = useMemo(
    () => testCases.find((tc) => tc.id === activeCaseId) || testCases[0],
    [testCases, activeCaseId]
  );

  const saveCasesToStorage = (updated) => {
    setTestCases(updated);
    try {
      localStorage.setItem('fullcode_test_cases', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddTestCase = () => {
    const newCase = {
      id: `tc-${Date.now()}`,
      name: `Test Case ${testCases.length + 1}`,
      input: '',
      expectedOutput: '',
      actualOutput: '',
      status: 'idle',
      executionTime: null,
    };
    const updated = [...testCases, newCase];
    saveCasesToStorage(updated);
    setActiveCaseId(newCase.id);
  };

  const handleDeleteTestCase = (id, e) => {
    e?.stopPropagation();
    if (testCases.length <= 1) {
      showToast('⚠️ Must keep at least one test case.');
      return;
    }
    const updated = testCases.filter((tc) => tc.id !== id);
    saveCasesToStorage(updated);
    if (activeCaseId === id) {
      setActiveCaseId(updated[0]?.id || '');
    }
  };

  const handleUpdateTestCase = (id, field, value) => {
    const updated = testCases.map((tc) =>
      tc.id === id ? { ...tc, [field]: value, status: field === 'actualOutput' ? tc.status : 'idle' } : tc
    );
    saveCasesToStorage(updated);
  };

  const handleDuplicateTestCase = (tc, e) => {
    e?.stopPropagation();
    const cloned = {
      ...tc,
      id: `tc-${Date.now()}`,
      name: `${tc.name} (Copy)`,
      status: 'idle',
      actualOutput: '',
      executionTime: null,
    };
    const updated = [...testCases, cloned];
    saveCasesToStorage(updated);
    setActiveCaseId(cloned.id);
  };

  // Run a single test case
  const runSingleTestCase = async (tc) => {
    const languageId = detectedLanguage?.id || 71;
    const currentFile = files.find((f) => f.id === activeFileId);
    const filename = currentFile?.name || 'Main';

    // Mark running
    setTestCases((prev) =>
      prev.map((c) => (c.id === tc.id ? { ...c, status: 'running' } : c))
    );

    const startTime = performance.now();
    try {
      const result = await executeCode(code, languageId, tc.input, files, filename);
      const elapsed = Math.round(performance.now() - startTime);

      const actualOut = (result?.stdout || '').trim();
      const expectedOut = (tc.expectedOutput || '').trim();
      const hasError = Boolean(result?.stderr && !result?.stdout);

      let status = 'passed';
      if (hasError) {
        status = 'error';
      } else if (expectedOut && actualOut !== expectedOut) {
        status = 'failed';
      } else if (!expectedOut) {
        status = 'passed';
      }

      setTestCases((prev) => {
        const next = prev.map((c) =>
          c.id === tc.id
            ? {
                ...c,
                actualOutput: result?.stdout || result?.stderr || '',
                status,
                executionTime: elapsed,
              }
            : c
        );
        try {
          localStorage.setItem('fullcode_test_cases', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      return { ok: status === 'passed', time: elapsed };
    } catch (err) {
      setTestCases((prev) =>
        prev.map((c) =>
          c.id === tc.id
            ? {
                ...c,
                actualOutput: err.message || 'Execution error',
                status: 'error',
                executionTime: null,
              }
            : c
        )
      );
      return { ok: false, error: err.message };
    }
  };

  // Run all test cases sequentially or in parallel
  const handleRunAllTestCases = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    let passedCount = 0;

    for (const tc of testCases) {
      const res = await runSingleTestCase(tc);
      if (res.ok) passedCount++;
    }

    setIsRunningAll(false);
    showToast(`🧪 Test suite finished: ${passedCount}/${testCases.length} passed.`);
  };

  // Visual diff calculation for active test case
  const diffResult = useMemo(() => {
    if (!activeTestCase) return { isMatch: false, diffLines: [] };
    return computeVisualDiff(activeTestCase.expectedOutput, activeTestCase.actualOutput);
  }, [activeTestCase]);

  // Overall test statistics
  const stats = useMemo(() => {
    const passed = testCases.filter((tc) => tc.status === 'passed').length;
    const failed = testCases.filter((tc) => tc.status === 'failed').length;
    const errors = testCases.filter((tc) => tc.status === 'error').length;
    const percentage = testCases.length ? Math.round((passed / testCases.length) * 100) : 0;
    return { passed, failed, errors, percentage, total: testCases.length };
  }, [testCases]);

  // ─── Stress Tester Generator ───────────────────────────────────────────
  const generateRandomInput = (type, min, max, len) => {
    if (type === 'array') {
      const arr = Array.from({ length: len }, () =>
        Math.floor(Math.random() * (max - min + 1)) + min
      );
      return `${len}\n${arr.join(' ')}`;
    }
    if (type === 'string') {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      let str = '';
      for (let i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${str}`;
    }
    if (type === 'pairs') {
      const a = Math.floor(Math.random() * (max - min + 1)) + min;
      const b = Math.floor(Math.random() * (max - min + 1)) + min;
      return `${a} ${b}`;
    }
    return '10\n1 2 3';
  };

  const handleRunStressTest = async () => {
    setIsStressRunning(true);
    const results = [];
    const languageId = detectedLanguage?.id || 71;
    const currentFile = files.find((f) => f.id === activeFileId);
    const filename = currentFile?.name || 'Main';

    for (let i = 1; i <= stressCount; i++) {
      const input = generateRandomInput(stressType, stressMin, stressMax, stressLength);
      const start = performance.now();
      try {
        const res = await executeCode(code, languageId, input, files, filename);
        const elapsed = Math.round(performance.now() - start);
        const hasErr = Boolean(res?.stderr && !res?.stdout);

        results.push({
          iteration: i,
          input,
          output: res?.stdout || res?.stderr || '',
          time: elapsed,
          ok: !hasErr,
        });
      } catch (err) {
        results.push({
          iteration: i,
          input,
          output: err.message,
          time: null,
          ok: false,
        });
      }
    }

    setStressResults(results);
    setIsStressRunning(false);
    const passed = results.filter((r) => r.ok).length;
    showToast(`⚡ Stress test finished: ${passed}/${results.length} executions passed without crash.`);
  };

  const handleAddFailingToSuite = (result) => {
    const newCase = {
      id: `tc-stress-${Date.now()}`,
      name: `Failing Stress Case #${result.iteration}`,
      input: result.input,
      expectedOutput: '',
      actualOutput: result.output,
      status: result.ok ? 'passed' : 'error',
      executionTime: result.time,
    };
    const updated = [...testCases, newCase];
    saveCasesToStorage(updated);
    setActiveCaseId(newCase.id);
    setStressModalOpen(false);
    showToast('📥 Added failing case to active Test Suite!');
  };

  return (
    <div className="test-suite-container">
      {/* Top Action Bar */}
      <div className="test-suite-header">
        <div className="test-suite-title-group">
          <div className="test-suite-icon-badge">
            <FlaskConical size={18} />
          </div>
          <div>
            <div className="test-suite-title-row">
              <h3>Competitive Test Suite & Stress Tester</h3>
              <span className="test-suite-stat-pill">
                {stats.passed}/{stats.total} Passed ({stats.percentage}%)
              </span>
            </div>
            <p className="test-suite-sub">
              Batch I/O verification, character-level diff highlighting & randomized edge-case generator
            </p>
          </div>
        </div>

        <div className="test-suite-actions">
          <button
            className="btn-suite-action btn-stress"
            onClick={() => setStressModalOpen(true)}
            title="Generate randomized test inputs to discover failing edge cases"
          >
            <Dices size={14} />
            <span>Stress Tester</span>
          </button>

          <button
            className="btn-suite-action btn-add"
            onClick={handleAddTestCase}
            title="Add a new test case"
          >
            <Plus size={14} />
            <span>New Case</span>
          </button>

          <button
            className="btn-suite-action btn-run-all"
            onClick={handleRunAllTestCases}
            disabled={isRunningAll}
            title="Execute all test cases in batch"
          >
            <Play size={14} fill="currentColor" />
            <span>{isRunningAll ? 'Running All...' : 'Run All Cases'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="test-suite-progress-track">
        <div
          className="test-suite-progress-fill"
          style={{
            width: `${stats.percentage}%`,
            background: stats.percentage === 100 ? '#10b981' : stats.percentage > 50 ? '#38bdf8' : '#f59e0b',
          }}
        />
      </div>

      {/* Main Split Body: Cases List on Left, Active Case Editor & Diff on Right */}
      <div className="test-suite-body">
        {/* Left: Test Case Tabs List */}
        <div className="test-suite-sidebar">
          <div className="test-cases-list">
            {testCases.map((tc, index) => {
              const isActive = tc.id === activeCaseId;
              let statusBadge = null;

              if (tc.status === 'running') {
                statusBadge = <span className="status-indicator running">●</span>;
              } else if (tc.status === 'passed') {
                statusBadge = <CheckCircle2 size={13} className="status-indicator passed" />;
              } else if (tc.status === 'failed') {
                statusBadge = <XCircle size={13} className="status-indicator failed" />;
              } else if (tc.status === 'error') {
                statusBadge = <AlertTriangle size={13} className="status-indicator error" />;
              }

              return (
                <div
                  key={tc.id}
                  className={`test-case-card ${isActive ? 'active' : ''} ${tc.status}`}
                  onClick={() => setActiveCaseId(tc.id)}
                >
                  <div className="case-card-left">
                    {statusBadge || <span className="case-index-pill">{index + 1}</span>}
                    <span className="case-card-name">{tc.name}</span>
                  </div>

                  <div className="case-card-right">
                    {tc.executionTime && (
                      <span className="case-time-pill">{tc.executionTime}ms</span>
                    )}
                    <button
                      className="case-btn-copy"
                      onClick={(e) => handleDuplicateTestCase(tc, e)}
                      title="Duplicate test case"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      className="case-btn-del"
                      onClick={(e) => handleDeleteTestCase(tc.id, e)}
                      title="Delete test case"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn-add-sidebar" onClick={handleAddTestCase}>
            <Plus size={13} />
            <span>Add Custom Test Case</span>
          </button>
        </div>

        {/* Right: Active Test Case Details & Visual Diff */}
        {activeTestCase && (
          <div className="test-suite-detail-panel">
            <div className="detail-top-bar">
              <input
                type="text"
                className="case-name-input"
                value={activeTestCase.name}
                onChange={(e) => handleUpdateTestCase(activeTestCase.id, 'name', e.target.value)}
                placeholder="Case Name..."
              />
              <div className="detail-top-actions">
                <button
                  className="btn-single-run"
                  onClick={() => runSingleTestCase(activeTestCase)}
                  disabled={activeTestCase.status === 'running'}
                >
                  <Play size={12} fill="currentColor" />
                  <span>
                    {activeTestCase.status === 'running' ? 'Running...' : 'Run Single Case'}
                  </span>
                </button>
              </div>
            </div>

            {/* Split: Stdin Input & Expected Output */}
            <div className="detail-io-grid">
              <div className="io-card">
                <div className="io-card-header">
                  <span>Standard Input (stdin)</span>
                </div>
                <textarea
                  className="io-textarea"
                  value={activeTestCase.input}
                  onChange={(e) => handleUpdateTestCase(activeTestCase.id, 'input', e.target.value)}
                  placeholder="Paste inputs here (e.g. 5\n1 2 3 4 5)..."
                  spellCheck="false"
                />
              </div>

              <div className="io-card">
                <div className="io-card-header">
                  <span>Expected Output</span>
                </div>
                <textarea
                  className="io-textarea"
                  value={activeTestCase.expectedOutput}
                  onChange={(e) =>
                    handleUpdateTestCase(activeTestCase.id, 'expectedOutput', e.target.value)
                  }
                  placeholder="Expected answer or result to compare against..."
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Actual Output & Character-Level Visual Diff */}
            <div className="detail-diff-card">
              <div className="diff-card-header">
                <div className="diff-header-left">
                  <FileCheck size={14} />
                  <span>Visual Output Diff Viewer</span>
                  <span
                    className={`diff-match-badge ${
                      activeTestCase.status === 'passed'
                        ? 'match'
                        : activeTestCase.status === 'failed'
                        ? 'mismatch'
                        : 'idle'
                    }`}
                  >
                    {activeTestCase.status === 'passed'
                      ? '✓ Matches Expected'
                      : activeTestCase.status === 'failed'
                      ? '✗ Output Mismatch'
                      : activeTestCase.status === 'error'
                      ? '⚠ Execution Error'
                      : 'Not Run Yet'}
                  </span>
                </div>
                {activeTestCase.actualOutput && (
                  <button
                    className="btn-use-actual"
                    onClick={() =>
                      handleUpdateTestCase(
                        activeTestCase.id,
                        'expectedOutput',
                        activeTestCase.actualOutput
                      )
                    }
                    title="Adopt actual output as the expected answer"
                  >
                    <CheckCircle2 size={12} />
                    <span>Adopt Output as Expected</span>
                  </button>
                )}
              </div>

              {/* Side-by-side or Character Diff Display */}
              <div className="diff-display-area">
                {!activeTestCase.actualOutput && activeTestCase.status === 'idle' ? (
                  <div className="diff-empty-placeholder">
                    Click "Run Single Case" or "Run All Cases" to execute and see character-level diffs.
                  </div>
                ) : (
                  <div className="diff-lines-container">
                    <div className="diff-table-header">
                      <span className="diff-col-num">#</span>
                      <span className="diff-col-expected">Expected Output</span>
                      <span className="diff-col-actual">Actual Program Output</span>
                    </div>
                    {diffResult.diffLines?.map((dl) => (
                      <div key={dl.lineNum} className={`diff-line-row ${dl.type}`}>
                        <span className="diff-cell-num">{dl.lineNum}</span>
                        <span className="diff-cell-expected">{dl.expected || <span className="diff-blank">↵ (empty)</span>}</span>
                        <span className="diff-cell-actual">{dl.actual || <span className="diff-blank">↵ (empty)</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Stress Tester Modal ───────────────────────────────────────────── */}
      {stressModalOpen && (
        <div className="stress-modal-backdrop" onClick={() => setStressModalOpen(false)}>
          <div className="stress-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="stress-modal-header">
              <div className="stress-header-title">
                <Dices size={18} className="stress-icon" />
                <h4>Automated Stress Test Generator</h4>
              </div>
              <button className="stress-close-btn" onClick={() => setStressModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="stress-modal-body">
              <p className="stress-description">
                Generate randomized inputs to stress-test your solution against runtime errors, infinite loops, or unexpected edge cases.
              </p>

              <div className="stress-controls-grid">
                <div className="stress-field">
                  <label>Generator Pattern</label>
                  <select value={stressType} onChange={(e) => setStressType(e.target.value)}>
                    <option value="array">Random Array (size N, values min..max)</option>
                    <option value="string">Random String (characters a-z)</option>
                    <option value="pairs">Two Integers (N, K)</option>
                  </select>
                </div>

                <div className="stress-field">
                  <label>Iterations</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={stressCount}
                    onChange={(e) => setStressCount(Number(e.target.value))}
                  />
                </div>

                {stressType === 'array' && (
                  <>
                    <div className="stress-field">
                      <label>Array Length (N)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={stressLength}
                        onChange={(e) => setStressLength(Number(e.target.value))}
                      />
                    </div>
                    <div className="stress-field">
                      <label>Range (Min - Max)</label>
                      <div className="stress-range-inputs">
                        <input
                          type="number"
                          value={stressMin}
                          onChange={(e) => setStressMin(Number(e.target.value))}
                        />
                        <span>to</span>
                        <input
                          type="number"
                          value={stressMax}
                          onChange={(e) => setStressMax(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                className="btn-start-stress"
                onClick={handleRunStressTest}
                disabled={isStressRunning}
              >
                <Zap size={14} />
                <span>{isStressRunning ? 'Running Stress Suite...' : 'Generate & Execute Stress Suite'}</span>
              </button>

              {/* Stress Results Table */}
              {stressResults.length > 0 && (
                <div className="stress-results-section">
                  <h5>Execution Results ({stressResults.length} Runs)</h5>
                  <div className="stress-table-scroll">
                    <table className="stress-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Status</th>
                          <th>Generated Input</th>
                          <th>Output</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stressResults.map((r) => (
                          <tr key={r.iteration} className={r.ok ? 'ok-row' : 'fail-row'}>
                            <td>{r.iteration}</td>
                            <td>
                              <span className={`stress-badge ${r.ok ? 'pass' : 'fail'}`}>
                                {r.ok ? '✓ OK' : '✗ Crash / Error'}
                              </span>
                            </td>
                            <td className="code-cell">{r.input.replace(/\n/g, ' ')}</td>
                            <td className="code-cell">{r.output.slice(0, 30)}</td>
                            <td>
                              <button
                                className="btn-import-fail"
                                onClick={() => handleAddFailingToSuite(r)}
                                title="Import into active Test Suite"
                              >
                                + Import Case
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
