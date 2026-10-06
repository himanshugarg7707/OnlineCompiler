import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { executeCode } from '../services/judge0Service';
import {
  generateAndEvaluateTestCases,
  detectInputPattern,
  getPatternLabel,
  generateRandomInputForPattern,
} from '../services/testCaseGeneratorService';
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
  Keyboard,
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
 * Normalizes output string for competitive comparison (ignoring trailing whitespace & newlines)
 */
export function normalizeOutput(str) {
  if (str == null) return '';
  return String(str)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Checks if expected and actual output match using competitive programming rules
 */
export function checkOutputMatch(expected, actual) {
  const normExp = normalizeOutput(expected);
  const normAct = normalizeOutput(actual);

  // Exact normalized match
  if (normExp === normAct) return true;

  // Wildcard match
  if (normExp === '*' || normExp.toLowerCase() === 'any' || normExp.toLowerCase() === 'any output') {
    return normAct.length > 0;
  }

  // Token-by-token comparison (e.g. whitespace variations between numbers or array items)
  const expTokens = normExp.split(/\s+/).filter(Boolean);
  const actTokens = normAct.split(/\s+/).filter(Boolean);
  if (expTokens.length > 0 && expTokens.length === actTokens.length) {
    const allMatch = expTokens.every((t, i) => t === actTokens[i]);
    if (allMatch) return true;
  }

  return false;
}

/**
 * Character-level visual diff generator for Expected vs Actual output
 */
function computeVisualDiff(expected, actual) {
  const isMatch = checkOutputMatch(expected, actual);

  // Normalize and trim trailing newlines/carriage returns to prevent phantom blank rows
  const expClean = (expected ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  const actClean = (actual ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();

  // Display whitespace markers for spaces and tabs
  const formatVisibleWs = (str) =>
    str.replace(/ /g, '·').replace(/\t/g, '⇥\t');

  const expLines = expClean ? expClean.split('\n') : [];
  const actLines = actClean ? actClean.split('\n') : [];

  const diffLines = [];
  const maxLines = Math.max(expLines.length, actLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expL = expLines[i] !== undefined ? expLines[i] : null;
    const actL = actLines[i] !== undefined ? actLines[i] : null;

    // If the overall test passes or the lines match, mark as match
    const lineMatches = isMatch || (expL !== null && actL !== null && expL.trimEnd() === actL.trimEnd());

    diffLines.push({
      lineNum: i + 1,
      type: lineMatches ? 'match' : 'diff',
      expected: expL !== null ? (expL ? formatVisibleWs(expL) : '') : null,
      actual: actL !== null ? (actL ? formatVisibleWs(actL) : '') : null,
    });
  }

  // Fallback for completely empty output
  if (diffLines.length === 0) {
    diffLines.push({
      lineNum: 1,
      type: 'match',
      expected: '',
      actual: '',
    });
  }

  return { isMatch, diffLines };
}

export default function TestCaseSuitePanel() {
  const { state, showToast, dispatch } = useApp();
  const { code, detectedLanguage, files, activeFileId } = state;

  const currentFile = files.find((f) => f.id === activeFileId) || files[0];
  const fileKey = currentFile?.name || activeFileId || 'default';
  const storageKey = `fullcode_test_cases_${fileKey}`;
  const activeCode = currentFile?.content || code || '';
  const detectedPattern = useMemo(() => detectInputPattern(activeCode), [activeCode]);
  const patternLabel = useMemo(() => getPatternLabel(detectedPattern.type), [detectedPattern]);

  const [testCases, setTestCases] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_TEST_CASES;
    } catch {
      return DEFAULT_TEST_CASES;
    }
  });

  const [activeCaseId, setActiveCaseId] = useState(testCases[0]?.id || 'tc-1');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [stressModalOpen, setStressModalOpen] = useState(false);
  const [stressCount, setStressCount] = useState(10);
  const [stressType, setStressType] = useState('auto'); // 'auto' | 'string_collection' | 'number_array' | ...
  const [stressMin, setStressMin] = useState(1);
  const [stressMax, setStressMax] = useState(100);
  const [stressLength, setStressLength] = useState(5);
  const [stressResults, setStressResults] = useState([]);
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [isGeneratingCases, setIsGeneratingCases] = useState(false);

  const autoGeneratedFilesRef = useRef(new Set());

  const activeTestCase = useMemo(
    () => testCases.find((tc) => tc.id === activeCaseId) || testCases[0],
    [testCases, activeCaseId]
  );

  const saveCasesToStorage = useCallback((updated) => {
    setTestCases(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Automatically detect code input patterns and synthesize tailored test cases with real baseline outputs
  const handleAutoGenerateTestCases = useCallback(async (isUserTriggered = true) => {
    setIsGeneratingCases(true);
    if (isUserTriggered && showToast) {
      showToast('Analyzing code & synthesizing test cases... 🧠');
    }

    const codeToRun = currentFile?.content || code || '';
    const languageId = currentFile?.language?.id || detectedLanguage?.id || 71;
    const filename = currentFile?.name || 'Main';

    try {
      const synthesized = await generateAndEvaluateTestCases(
        codeToRun,
        languageId,
        files,
        filename,
        executeCode
      );

      if (synthesized && synthesized.length > 0) {
        saveCasesToStorage(synthesized);
        setActiveCaseId(synthesized[0].id);
        if (showToast) {
          showToast(`✨ Automatically generated ${synthesized.length} smart test cases tailored for ${filename}!`);
        }
      }
    } catch (err) {
      if (isUserTriggered && showToast) {
        showToast(`Failed to generate test cases: ${err.message}`);
      }
    } finally {
      setIsGeneratingCases(false);
    }
  }, [currentFile, code, detectedLanguage, files, saveCasesToStorage, showToast]);

  // When active file changes, load its stored test cases or auto-generate if none exist
  useEffect(() => {
    let loaded = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
    } catch {}

    if (loaded) {
      setTestCases(loaded);
      setActiveCaseId(loaded[0]?.id || '');
    } else {
      // No custom cases saved for this file yet: auto-generate automatically!
      if (!autoGeneratedFilesRef.current.has(fileKey) && activeCode && activeCode.trim()) {
        autoGeneratedFilesRef.current.add(fileKey);
        handleAutoGenerateTestCases(false);
      }
    }
  }, [fileKey, storageKey]);

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

  // Import from main Custom Input tab (stdin)
  const handleImportFromCustomInput = () => {
    const customStdin = state.stdin || '';
    const newCase = {
      id: `tc-${Date.now()}`,
      name: `Custom Input Case ${testCases.length + 1}`,
      input: customStdin,
      expectedOutput: '',
      actualOutput: '',
      status: 'idle',
      executionTime: null,
    };
    const updated = [...testCases, newCase];
    saveCasesToStorage(updated);
    setActiveCaseId(newCase.id);
    if (showToast) showToast('Imported stdin from Custom Input tab! 📥');
  };

  // Copy active test case input to Custom Input tab
  const handleCopyToCustomInput = (tc) => {
    const targetTc = tc || activeTestCase;
    if (!targetTc) return;
    if (dispatch) {
      dispatch({ type: 'SET_STDIN', payload: targetTc.input || '' });
    }
    if (showToast) showToast(`Copied "${targetTc.name}" input to Custom Input tab! 📋`);
  };

  // Clear previous execution outputs from test suite
  const handleClearResults = () => {
    const updated = testCases.map((tc) => ({
      ...tc,
      actualOutput: '',
      status: 'idle',
      executionTime: null,
    }));
    saveCasesToStorage(updated);
    if (showToast) showToast('Cleared test suite execution results! 🧹');
  };

  // Reset to default test cases
  const handleResetDefaults = () => {
    saveCasesToStorage(DEFAULT_TEST_CASES);
    setActiveCaseId(DEFAULT_TEST_CASES[0]?.id || '');
    if (showToast) showToast('Reset test cases to defaults 🔄');
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
    const currentFile = files.find((f) => f.id === activeFileId) || files[0];
    const codeToRun = currentFile?.content || code || '';
    const languageId = currentFile?.language?.id || detectedLanguage?.id || 71;
    const filename = currentFile?.name || 'Main';

    // Mark running
    setTestCases((prev) =>
      prev.map((c) => (c.id === tc.id ? { ...c, status: 'running' } : c))
    );

    const startTime = performance.now();
    try {
      const result = await executeCode(codeToRun, languageId, tc.input || '', files, filename);
      const elapsed = Math.round(performance.now() - startTime);

      // Extract output and error safely from all possible runner return structures
      const rawOut = result?.output ?? result?.stdout ?? '';
      const rawErr = result?.error ?? result?.stderr ?? '';
      const cleanOutput = rawOut === '(Program finished with no output)' ? '' : rawOut;
      const isFailedRun = result?.success === false || Boolean(rawErr && !cleanOutput);

      const actualOut = cleanOutput;
      const expectedOut = tc.expectedOutput ?? '';

      let status = 'passed';
      if (isFailedRun && !cleanOutput) {
        status = 'error';
      } else if (expectedOut !== '') {
        const isMatched = checkOutputMatch(expectedOut, actualOut);
        status = isMatched ? 'passed' : 'failed';
      } else {
        // No expected output provided: passed if execution succeeded
        status = isFailedRun ? 'error' : 'passed';
      }

      // Store actual program output or error message
      const outputToStore = cleanOutput !== '' ? cleanOutput : (rawErr || '(No output)');

      setTestCases((prev) => {
        const next = prev.map((c) =>
          c.id === tc.id
            ? {
                ...c,
                actualOutput: outputToStore,
                status,
                executionTime: elapsed,
              }
            : c
        );
        saveCasesToStorage(next);
        return next;
      });

      return { ok: status === 'passed', time: elapsed };
    } catch (err) {
      setTestCases((prev) => {
        const next = prev.map((c) =>
          c.id === tc.id
            ? {
                ...c,
                actualOutput: err.message || 'Execution error',
                status: 'error',
                executionTime: null,
              }
            : c
        );
        saveCasesToStorage(next);
        return next;
      });
      return { ok: false, error: err.message };
    }
  };

  // Run all test cases sequentially
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

  const handleRunStressTest = async () => {
    setIsStressRunning(true);
    const results = [];
    const codeToRun = currentFile?.content || code || '';
    const languageId = currentFile?.language?.id || detectedLanguage?.id || 71;
    const filename = currentFile?.name || 'Main';

    const typeToUse = stressType === 'auto' ? detectedPattern.type : stressType;

    for (let i = 1; i <= stressCount; i++) {
      const input = generateRandomInputForPattern(typeToUse, {
        min: stressMin,
        max: stressMax,
        length: stressLength,
      });
      const start = performance.now();
      try {
        const res = await executeCode(codeToRun, languageId, input, files, filename);
        const elapsed = Math.round(performance.now() - start);

        const rawOut = res?.output ?? res?.stdout ?? '';
        const rawErr = res?.error ?? res?.stderr ?? '';
        const cleanOut = rawOut === '(Program finished with no output)' ? '' : rawOut;
        const hasErr = res?.success === false || Boolean(rawErr && !cleanOut);

        results.push({
          iteration: i,
          input,
          output: cleanOut || rawErr || '(No output)',
          time: elapsed,
          ok: !hasErr,
        });
      } catch (err) {
        results.push({
          iteration: i,
          input,
          output: err.message || 'Execution error',
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
              <span className="test-suite-pattern-pill" title={`Auto-detected pattern from code: ${patternLabel}`}>
                <Sparkles size={11} />
                <span>{patternLabel}</span>
              </span>
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
            className="btn-suite-action btn-clear"
            onClick={handleClearResults}
            title="Reset execution outputs and statuses back to idle"
          >
            <RotateCcw size={13} />
            <span>Clear Results</span>
          </button>

          <button
            className="btn-suite-action btn-stress"
            onClick={() => setStressModalOpen(true)}
            title="Generate randomized test inputs to discover failing edge cases"
          >
            <Dices size={14} />
            <span>Stress Tester</span>
          </button>

          <button
            className="btn-suite-action btn-auto-gen"
            onClick={handleAutoGenerateTestCases}
            disabled={isGeneratingCases || isRunningAll}
            title="Automatically detect code structure and generate tailored sample, edge, and scale test cases"
          >
            <Sparkles size={14} className={isGeneratingCases ? 'icon-sparkle-spin' : ''} />
            <span>{isGeneratingCases ? 'Generating...' : 'Auto-Generate Cases'}</span>
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
                    <option value="auto">✨ Auto-Detected ({patternLabel})</option>
                    <option value="string_collection">Collection of N Strings</option>
                    <option value="number_array">Random Array (size N, min..max)</option>
                    <option value="string">Random String (characters a-z)</option>
                    <option value="pairs">Two Integers (N, K)</option>
                    <option value="matrix">2D Matrix / Grid</option>
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

                {(stressType === 'auto' || stressType === 'number_array' || stressType === 'string_collection' || stressType === 'matrix') && (
                  <>
                    <div className="stress-field">
                      <label>Count / Length (N)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={stressLength}
                        onChange={(e) => setStressLength(Number(e.target.value))}
                      />
                    </div>
                    {((stressType === 'auto' && detectedPattern.type !== 'string_collection' && detectedPattern.type !== 'string') || (stressType === 'number_array' || stressType === 'matrix')) && (
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
                    )}
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
