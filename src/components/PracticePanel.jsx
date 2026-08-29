import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  BookOpen,
  Lightbulb,
  EyeOff,
  Play,
  ChevronRight,
  ChevronLeft,
  Search,
  Star,
  Target,
  Code2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  FlaskConical,
} from 'lucide-react';
import {
  PRACTICE_LANGUAGES,
  PRACTICE_QUESTIONS,
} from '../services/practiceQuestions';
import { getLanguageById } from '../services/languageDetector';
import { evaluateTestCases } from '../services/testEvaluator';
import './PracticePanel.css';

const DIFFICULTY_COLORS = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444',
};

const SOLVED_STORAGE_KEY = 'fullcode_solved_questions_v1';

function getStoredSolved() {
  try {
    const raw = localStorage.getItem(SOLVED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStoredSolved(list) {
  try {
    localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export default function PracticePanel() {
  const { state, dispatch, handleAddFile, handleSelectLanguage, showToast } = useApp();
  const { practiceOpen, code, detectedLanguage } = state;

  const [selectedLang, setSelectedLang] = useState('python');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  // Test evaluator state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [selectedTestTab, setSelectedTestTab] = useState(0);
  const [solvedList, setSolvedList] = useState(getStoredSolved);

  const questions = useMemo(
    () => PRACTICE_QUESTIONS[selectedLang] || [],
    [selectedLang]
  );

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !searchQuery ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty =
        filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [questions, searchQuery, filterDifficulty]);

  const langInfo = PRACTICE_LANGUAGES.find((l) => l.id === selectedLang);

  // Active question object when in detail view
  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return null;
    return questions.find((q) => q.id === activeQuestionId) || null;
  }, [questions, activeQuestionId]);

  // Derive test cases for the active question
  const questionTestCases = useMemo(() => {
    if (!activeQuestion) return [];
    if (activeQuestion.testCases && activeQuestion.testCases.length > 0) {
      return activeQuestion.testCases;
    }

    // Smart fallback test cases
    const title = activeQuestion.title.toLowerCase();
    if (title.includes('prime')) {
      return [
        { input: '7', expectedOutput: 'Prime' },
        { input: '10', expectedOutput: 'Not Prime' },
        { input: '13', expectedOutput: 'Prime' },
      ];
    }
    if (title.includes('factorial')) {
      return [
        { input: '5', expectedOutput: '120' },
        { input: '3', expectedOutput: '6' },
        { input: '0', expectedOutput: '1' },
      ];
    }
    if (title.includes('reverse') || title.includes('palindrome')) {
      return [
        { input: 'hello', expectedOutput: 'olleh' },
        { input: 'racecar', expectedOutput: 'racecar' },
      ];
    }
    if (title.includes('largest') || title.includes('smallest')) {
      return [
        { input: '3 7 2 9 5', expectedOutput: '9' },
        { input: '12 45 2 8', expectedOutput: '45' },
      ];
    }
    if (title.includes('vowel')) {
      return [
        { input: 'hello world', expectedOutput: '3' },
        { input: 'python', expectedOutput: '1' },
      ];
    }

    return [
      { input: '5', expectedOutput: '' },
      { input: '10', expectedOutput: '' },
    ];
  }, [activeQuestion]);

  // Reset hint state, test results and copied state on question change
  useEffect(() => {
    setShowHint(false);
    setCopiedCode(false);
    setTestResults(null);
    setSelectedTestTab(0);
  }, [activeQuestionId, selectedLang]);

  const getExtension = (lang) => {
    const map = {
      python: '.py',
      java: '.java',
      c: '.c',
      cpp: '.cpp',
      sql: '.sql',
      javascript: '.js',
    };
    return map[lang] || '.txt';
  };

  const handleLoadQuestion = (question) => {
    const lang = getLanguageById(langInfo.langId);
    if (lang) {
      handleSelectLanguage(lang, false);
    }
    const fileName = `practice_${selectedLang}_q${question.id}${getExtension(selectedLang)}`;
    handleAddFile(fileName, question.starterCode);
    showToast(`Loaded Q${question.id} into editor 🚀`);
  };

  const handleCopyCode = (codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrevQuestion = () => {
    if (!activeQuestion) return;
    const currentIndex = questions.findIndex((q) => q.id === activeQuestion.id);
    if (currentIndex > 0) {
      setActiveQuestionId(questions[currentIndex - 1].id);
    }
  };

  const handleNextQuestion = () => {
    if (!activeQuestion) return;
    const currentIndex = questions.findIndex((q) => q.id === activeQuestion.id);
    if (currentIndex < questions.length - 1) {
      setActiveQuestionId(questions[currentIndex + 1].id);
    }
  };

  // Run test case evaluator against user code
  const handleRunTests = async () => {
    if (!activeQuestion) return;
    setIsRunningTests(true);
    setTestResults(null);

    const lang = getLanguageById(langInfo.langId) || detectedLanguage;
    const res = await evaluateTestCases(code, lang, questionTestCases);

    setTestResults(res);
    setIsRunningTests(false);

    if (res.allPassed) {
      const qKey = `${selectedLang}_q${activeQuestion.id}`;
      if (!solvedList.includes(qKey)) {
        const updated = [...solvedList, qKey];
        setSolvedList(updated);
        saveStoredSolved(updated);
      }
      showToast(`🎉 All Test Cases Passed! Question Solved!`);
    } else {
      showToast(`Passed ${res.passedCount}/${res.totalCount} Test Cases`);
    }
  };

  const isQuestionSolved = useCallback(
    (qId) => {
      return solvedList.includes(`${selectedLang}_q${qId}`);
    },
    [solvedList, selectedLang]
  );

  if (!practiceOpen) return null;

  return (
    <aside className="practice-sidebar">
      {/* ─── Top Header ─── */}
      <div className="practice-header">
        {activeQuestion ? (
          <div className="practice-header-nav">
            <button
              className="btn-back-questions"
              onClick={() => setActiveQuestionId(null)}
              title="Back to all questions"
            >
              <ArrowLeft size={15} />
              <span>All Questions</span>
            </button>
            <div className="question-nav-arrows">
              <button
                className="btn-nav-arrow"
                onClick={handlePrevQuestion}
                disabled={questions.findIndex((q) => q.id === activeQuestion.id) === 0}
                title="Previous question"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="question-counter">
                {questions.findIndex((q) => q.id === activeQuestion.id) + 1} / {questions.length}
              </span>
              <button
                className="btn-nav-arrow"
                onClick={handleNextQuestion}
                disabled={
                  questions.findIndex((q) => q.id === activeQuestion.id) === questions.length - 1
                }
                title="Next question"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="practice-title-group">
            <BookOpen size={18} className="practice-icon" />
            <div>
              <h2>Practice Lab</h2>
              <span className="practice-subtitle">
                {langInfo?.icon} {langInfo?.name} • {filteredQuestions.length} Problems
              </span>
            </div>
          </div>
        )}

        <button
          className="btn-icon"
          onClick={() => dispatch({ type: 'TOGGLE_PRACTICE' })}
          title="Close Practice Panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* ─── Language Selector Tabs (Only on List View) ─── */}
      {!activeQuestion && (
        <div className="practice-lang-tabs">
          {PRACTICE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`practice-lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedLang(lang.id);
                setActiveQuestionId(null);
                setSearchQuery('');
                setFilterDifficulty('all');
              }}
            >
              <span className="lang-tab-icon">{lang.icon}</span>
              <span className="lang-tab-name">{lang.name}</span>
              <span className="lang-tab-count">
                {(PRACTICE_QUESTIONS[lang.id] || []).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Search & Filters Toolbar (Only on List View) ─── */}
      {!activeQuestion && (
        <div className="practice-toolbar">
          <div className="practice-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder={`Search ${langInfo?.name} problems...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="practice-search-input"
            />
            {searchQuery && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="practice-filters">
            {['all', 'Easy', 'Medium', 'Hard'].map((d) => (
              <button
                key={d}
                className={`filter-pill ${filterDifficulty === d ? 'active' : ''}`}
                onClick={() => setFilterDifficulty(d)}
                style={
                  d !== 'all' && filterDifficulty === d
                    ? { borderColor: DIFFICULTY_COLORS[d], color: DIFFICULTY_COLORS[d] }
                    : {}
                }
              >
                {d === 'all' ? 'All' : d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Content Area: List View OR Single Question View ─── */}
      {activeQuestion ? (
        /* ══════════════════════════════════════════════════════════════════
           VIEW 2: SINGLE PROBLEM DETAIL VIEW (One at a time)
           ══════════════════════════════════════════════════════════════════ */
        <div className="single-problem-view">
          {/* Problem Meta Header */}
          <div className="single-problem-header">
            <div className="single-problem-tags">
              <span className="problem-badge-id">Problem {activeQuestion.id}</span>
              <span
                className="difficulty-badge"
                style={{
                  color: DIFFICULTY_COLORS[activeQuestion.difficulty],
                  borderColor: DIFFICULTY_COLORS[activeQuestion.difficulty],
                  backgroundColor: `${DIFFICULTY_COLORS[activeQuestion.difficulty]}15`,
                }}
              >
                {activeQuestion.difficulty === 'Easy' && <Star size={10} />}
                {activeQuestion.difficulty === 'Medium' && <Sparkles size={10} />}
                {activeQuestion.difficulty === 'Hard' && <Target size={10} />}
                {activeQuestion.difficulty}
              </span>
              <span className="lang-tag">
                {langInfo?.icon} {langInfo?.name}
              </span>
              {isQuestionSolved(activeQuestion.id) && (
                <span className="solved-badge">
                  <CheckCircle2 size={11} />
                  <span>Solved</span>
                </span>
              )}
            </div>

            <h1 className="single-problem-title">{activeQuestion.title}</h1>
          </div>

          {/* Description Section */}
          <div className="single-problem-section">
            <h3 className="section-heading">Description</h3>
            <p className="single-problem-desc">{activeQuestion.description}</p>
          </div>

          {/* Action: Open In Editor */}
          <div className="single-problem-actions-top">
            <button
              className="btn-solve-now"
              onClick={() => handleLoadQuestion(activeQuestion)}
            >
              <Play size={14} fill="currentColor" />
              <span>Load Starter Code in Editor</span>
            </button>
          </div>

          {/* ─── LEETCODE STYLE TESTCASE EVALUATOR SECTION ─── */}
          <div className="single-problem-section testcases-evaluator-section">
            <div className="testcase-header-row">
              <div className="testcase-header-title">
                <FlaskConical size={14} className="testcase-flask-icon" />
                <span>Test Cases ({questionTestCases.length})</span>
              </div>

              <button
                className={`btn-run-tests ${isRunningTests ? 'running' : ''}`}
                onClick={handleRunTests}
                disabled={isRunningTests}
              >
                {isRunningTests ? (
                  <>
                    <div className="spinner-small" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck size={13} />
                    <span>Run Test Cases</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Case Selection Tabs */}
            <div className="testcase-tab-bar">
              {questionTestCases.map((tc, idx) => {
                const res = testResults?.results?.[idx];
                const isPassed = res?.passed;
                const isFailed = res && !res.passed;

                return (
                  <button
                    key={idx}
                    className={`testcase-tab-btn ${selectedTestTab === idx ? 'active' : ''} ${
                      isPassed ? 'passed' : ''
                    } ${isFailed ? 'failed' : ''}`}
                    onClick={() => setSelectedTestTab(idx)}
                  >
                    <span className="tab-status-dot" />
                    <span>Case {idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Test Case Inputs & Results */}
            <div className="testcase-card-body">
              {testResults && (
                <div
                  className={`test-result-banner ${
                    testResults.allPassed ? 'all-passed' : 'has-failure'
                  }`}
                >
                  {testResults.allPassed ? (
                    <>
                      <CheckCircle2 size={16} color="#22c55e" />
                      <span>
                        <strong>Accepted!</strong> Passed {testResults.passedCount}/
                        {testResults.totalCount} test cases
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} color="#ef4444" />
                      <span>
                        <strong>Wrong Answer:</strong> Passed {testResults.passedCount}/
                        {testResults.totalCount} test cases
                      </span>
                    </>
                  )}
                </div>
              )}

              {questionTestCases[selectedTestTab] && (
                <div className="testcase-detail-fields">
                  <div className="testcase-field">
                    <span className="field-label">Input</span>
                    <pre className="field-content-code">
                      {questionTestCases[selectedTestTab].input || '(no input)'}
                    </pre>
                  </div>

                  <div className="testcase-field">
                    <span className="field-label">Expected Output</span>
                    <pre className="field-content-code expected">
                      {questionTestCases[selectedTestTab].expectedOutput || '(any output)'}
                    </pre>
                  </div>

                  {testResults?.results?.[selectedTestTab] && (
                    <div className="testcase-field">
                      <div className="field-label-with-time">
                        <span className="field-label">Your Output</span>
                        {testResults.results[selectedTestTab].executionTime > 0 && (
                          <span className="field-time">
                            <Clock size={10} />
                            {testResults.results[selectedTestTab].executionTime}ms
                          </span>
                        )}
                      </div>
                      <pre
                        className={`field-content-code ${
                          testResults.results[selectedTestTab].passed
                            ? 'actual-passed'
                            : 'actual-failed'
                        }`}
                      >
                        {testResults.results[selectedTestTab].actual || '(no output)'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hint Accordion */}
          <div className="single-problem-section hint-container">
            <div className="hint-header-bar" onClick={() => setShowHint(!showHint)}>
              <div className="hint-header-left">
                <Lightbulb size={15} className="hint-bulb-icon" />
                <span className="hint-title-text">Need a Hint?</span>
              </div>
              <button className="btn-hint-reveal">
                {showHint ? <EyeOff size={13} /> : <Lightbulb size={13} />}
                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              </button>
            </div>

            {showHint && (
              <div className="hint-body animate-slide-up">
                <p>{activeQuestion.hint}</p>
              </div>
            )}
          </div>

          {/* Starter Code Preview */}
          <div className="single-problem-section">
            <div className="starter-code-header">
              <div className="code-header-left">
                <Code2 size={14} />
                <span>Starter Code Template</span>
              </div>
              <button
                className="btn-copy-code"
                onClick={() => handleCopyCode(activeQuestion.starterCode)}
                title="Copy starter code"
              >
                {copiedCode ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="single-problem-code-block">
              <code>{activeQuestion.starterCode}</code>
            </pre>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           VIEW 1: ALL PROBLEMS LIST VIEW (Clean & Scrollable)
           ══════════════════════════════════════════════════════════════════ */
        <div className="practice-questions-list">
          {filteredQuestions.length === 0 ? (
            <div className="practice-empty">
              <Target size={30} />
              <p>No matching problems</p>
              <span>Try a different search query or difficulty filter</span>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const solved = isQuestionSolved(q.id);

              return (
                <div
                  key={q.id}
                  className={`practice-item-card ${solved ? 'is-solved' : ''}`}
                  onClick={() => setActiveQuestionId(q.id)}
                  title={`Click to view Problem ${q.id}: ${q.title}`}
                >
                  <div className="item-card-left">
                    <span className="item-card-id">Q{q.id}</span>
                    <div className="item-card-info">
                      <div className="item-card-title-row">
                        <span className="item-card-title">{q.title}</span>
                        {solved && (
                          <CheckCircle2 size={12} color="#22c55e" className="solved-icon-inline" />
                        )}
                      </div>
                      <span className="item-card-preview">{q.description}</span>
                    </div>
                  </div>

                  <div className="item-card-right">
                    <span
                      className="difficulty-badge"
                      style={{
                        color: DIFFICULTY_COLORS[q.difficulty],
                        borderColor: DIFFICULTY_COLORS[q.difficulty],
                        backgroundColor: `${DIFFICULTY_COLORS[q.difficulty]}15`,
                      }}
                    >
                      {q.difficulty}
                    </span>
                    <ChevronRight size={15} className="item-card-arrow" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Footer ─── */}
      <div className="practice-footer">
        <span className="practice-footer-hint">
          {activeQuestion
            ? '💡 Write solution on the left & click "Run Test Cases" to evaluate'
            : `🏆 ${solvedList.filter((s) => s.startsWith(`${selectedLang}_`)).length} of ${questions.length} solved`}
        </span>
      </div>
    </aside>
  );
}
