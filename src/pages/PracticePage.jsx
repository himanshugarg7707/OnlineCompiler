import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Lightbulb,
  Play,
  ChevronRight,
  Code2,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  FlaskConical,
  FileCheck2,
  LayoutTemplate,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  PRACTICE_LANGUAGES,
  PRACTICE_QUESTIONS,
} from '../services/practiceQuestions';
import { getLanguageById } from '../services/languageDetector';
import { evaluateTestCases } from '../services/testEvaluator';
import './PracticePage.css';

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

export default function PracticePage() {
  const { state, dispatch, handleAddFile, handleSelectLanguage, showToast } = useApp();
  const { code } = state;

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

  // Default active question to first item if none selected
  useEffect(() => {
    if (filteredQuestions.length > 0 && !activeQuestionId) {
      setActiveQuestionId(filteredQuestions[0].id);
    }
  }, [filteredQuestions, activeQuestionId]);

  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return filteredQuestions[0] || null;
    return questions.find((q) => q.id === activeQuestionId) || filteredQuestions[0] || null;
  }, [questions, activeQuestionId, filteredQuestions]);

  // Derive test cases for active question
  const questionTestCases = useMemo(() => {
    if (!activeQuestion) return [];
    if (activeQuestion.testCases && activeQuestion.testCases.length > 0) {
      return activeQuestion.testCases;
    }
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
      ];
    }
    if (title.includes('reverse') || title.includes('palindrome')) {
      return [
        { input: 'hello', expectedOutput: 'olleh' },
        { input: 'racecar', expectedOutput: 'racecar' },
      ];
    }
    return [
      { input: '5', expectedOutput: '' },
      { input: '10', expectedOutput: '' },
    ];
  }, [activeQuestion]);

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

  const handleSolveInEditor = (question) => {
    if (!question) return;
    const lang = getLanguageById(langInfo?.langId);
    if (lang) {
      handleSelectLanguage(lang, false);
    }
    const fileName = `practice_${selectedLang}_q${question.id}${getExtension(selectedLang)}`;
    handleAddFile(fileName, question.starterCode || '', null, true);
    if (showToast) showToast(`Loaded Q${question.id}: "${question.title}" in Editor 🚀`);
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  const handleCopyCode = (codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    if (showToast) showToast('Code copied to clipboard! 📋');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunTestCases = async () => {
    if (!activeQuestion || !questionTestCases || questionTestCases.length === 0) return;
    setIsRunningTests(true);
    setTestResults(null);

    try {
      const codeToRun = activeQuestion.starterCode || code || '';
      const lang = getLanguageById(langInfo?.langId);
      const results = await evaluateTestCases(codeToRun, lang, questionTestCases);
      setTestResults(results);

      if (results.allPassed) {
        const questionKey = `${selectedLang}_q${activeQuestion.id}`;
        if (!solvedList.includes(questionKey)) {
          const next = [...solvedList, questionKey];
          setSolvedList(next);
          saveStoredSolved(next);
          if (showToast) showToast('🎉 All test cases passed! Marked as Solved!');
        }
      }
    } catch (err) {
      console.error('Practice test runner error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const isSolved = activeQuestion ? solvedList.includes(`${selectedLang}_q${activeQuestion.id}`) : false;

  return (
    <div className="practice-page-root">
      {/* Top Navigation Bar */}
      <header className="practice-nav-bar">
        <div className="practice-nav-left">
          <button
            className="btn-back-to-ide"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
            title="Return to Online Compiler"
          >
            <ArrowLeft size={16} />
            <span>Back to IDE</span>
          </button>
          <div className="practice-breadcrumb">
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Coding Practice Lab</span>
          </div>
        </div>

        <div className="practice-nav-right">
          <button
            className="btn-exam-switch"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'exam' })}
            title="Switch to Proctored Exam & PDF Test Mode"
          >
            <FileCheck2 size={15} />
            <span>Exam Mode</span>
          </button>

          <button
            className="btn-templates-switch"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'templates' })}
            title="Switch to DSA Templates Library"
          >
            <LayoutTemplate size={15} />
            <span>Templates</span>
          </button>

          <div className="practice-stats-pill">
            <CheckCircle2 size={14} className="icon-green" />
            <span>{solvedList.length} Solved</span>
          </div>

          <button
            className="btn-done-primary"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
          >
            Exit to IDE
          </button>
        </div>
      </header>

      {/* 1. Language Selector Strip */}
      <div className="practice-lang-strip">
        <div className="practice-lang-tabs">
          {PRACTICE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`practice-lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedLang(lang.id);
                setActiveQuestionId(null);
              }}
            >
              <span className="lang-tab-icon">{lang.icon}</span>
              <span className="lang-tab-name">{lang.name}</span>
              <span className="lang-tab-count">{PRACTICE_QUESTIONS[lang.id]?.length || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="practice-filter-bar">
        <div className="practice-search-box">
          <Search size={15} className="practice-search-icon" />
          <input
            type="text"
            className="practice-search-input"
            placeholder="Search problems, topics, algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="practice-filter-right">
          <div className="difficulty-segmented-group">
            {['all', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                className={`difficulty-pill ${filterDifficulty === diff ? 'active' : ''} ${
                  diff !== 'all' ? `diff-${diff.toLowerCase()}` : ''
                }`}
                onClick={() => setFilterDifficulty(diff)}
              >
                {diff === 'all' ? 'All' : diff}
              </button>
            ))}
          </div>

          <div className="questions-counter-tag">
            <span>{filteredQuestions.length}</span> challenges
          </div>
        </div>
      </div>

      {/* Main Two-Pane Split Layout */}
      <div className="practice-main-layout">
        {/* Left Questions List */}
        <aside className="practice-questions-pane">
          <div className="pane-header">
            <span>{filteredQuestions.length} Questions Available</span>
          </div>

          <div className="questions-scroll-list">
            {filteredQuestions.map((q) => {
              const qKey = `${selectedLang}_q${q.id}`;
              const solved = solvedList.includes(qKey);
              const isActive = activeQuestion?.id === q.id;

              return (
                <div
                  key={q.id}
                  className={`practice-q-item ${isActive ? 'active' : ''} ${solved ? 'is-solved' : ''}`}
                  onClick={() => setActiveQuestionId(q.id)}
                >
                  <div className="q-item-header">
                    <div className="q-item-title-wrap">
                      <span className="q-number">#{q.id}</span>
                      <h4 className="q-title">{q.title}</h4>
                    </div>
                    {solved && <CheckCircle2 size={16} className="solved-badge-icon" />}
                  </div>

                  <p className="q-desc-snippet">{q.description}</p>

                  <div className="q-item-footer">
                    <span className={`diff-tag diff-${q.difficulty.toLowerCase()}`}>
                      {q.difficulty}
                    </span>
                    <ChevronRight size={15} className="q-chevron" />
                  </div>
                </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div className="empty-practice-state">
                <BookOpen size={36} />
                <p>No practice questions found matching your filter.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Active Question Detail & Tester */}
        <section className="practice-detail-pane">
          {activeQuestion ? (
            <div className="detail-container">
              {/* Question Header */}
              <div className="detail-header-card">
                <div className="detail-header-top">
                  <div className="detail-title-row">
                    <span className="detail-q-badge">Question {activeQuestion.id}</span>
                    <h2>{activeQuestion.title}</h2>
                    <span className={`diff-tag diff-${activeQuestion.difficulty.toLowerCase()}`}>
                      {activeQuestion.difficulty}
                    </span>
                    {isSolved && (
                      <span className="solved-pill">
                        <CheckCircle2 size={13} /> Solved
                      </span>
                    )}
                  </div>

                  <div className="detail-actions">
                    <button
                      className="btn-solve-now"
                      onClick={() => handleSolveInEditor(activeQuestion)}
                      title="Open in IDE with Starter Code"
                    >
                      <Sparkles size={15} />
                      <span>Open & Solve in IDE</span>
                    </button>
                  </div>
                </div>

                <div className="detail-problem-desc">
                  <p>{activeQuestion.description}</p>
                </div>
              </div>

              {/* Examples & Test Cases Section */}
              <div className="detail-body-scroll">
                {/* Example Cases */}
                {activeQuestion.examples && activeQuestion.examples.length > 0 && (
                  <div className="section-block">
                    <h3 className="section-title">Examples</h3>
                    <div className="examples-grid">
                      {activeQuestion.examples.map((ex, idx) => (
                        <div key={idx} className="example-box">
                          <div className="example-box-row">
                            <span className="ex-label">Input:</span>
                            <code>{ex.input}</code>
                          </div>
                          <div className="example-box-row">
                            <span className="ex-label">Output:</span>
                            <code>{ex.output}</code>
                          </div>
                          {ex.explanation && (
                            <div className="example-box-explanation">
                              <span className="ex-label">Explanation:</span>
                              <span>{ex.explanation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Starter Code Viewer */}
                {activeQuestion.starterCode && (
                  <div className="section-block">
                    <div className="section-title-row">
                      <h3 className="section-title">Starter Template</h3>
                      <button
                        className="btn-copy-sm"
                        onClick={() => handleCopyCode(activeQuestion.starterCode)}
                      >
                        {copiedCode ? <Check size={13} className="icon-green" /> : <Copy size={13} />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="code-pre-box">
                      <code>{activeQuestion.starterCode}</code>
                    </pre>
                  </div>
                )}

                {/* Hints Accordion */}
                {activeQuestion.hint && (
                  <div className="section-block hint-block">
                    <button
                      className="btn-toggle-hint"
                      onClick={() => setShowHint((prev) => !prev)}
                    >
                      <Lightbulb size={16} className="hint-bulb" />
                      <span>{showHint ? 'Hide Algorithmic Hint' : 'Show Algorithmic Hint'}</span>
                    </button>
                    {showHint && (
                      <div className="hint-content animate-fade-in">
                        <p>{activeQuestion.hint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Built-in Test Cases Suite */}
                <div className="section-block testsuite-block">
                  <div className="section-title-row">
                    <div className="testsuite-heading">
                      <FlaskConical size={16} className="icon-cyan" />
                      <h3 className="section-title">Test Suite Evaluation</h3>
                    </div>
                    <button
                      className="btn-run-tests"
                      onClick={handleRunTestCases}
                      disabled={isRunningTests}
                    >
                      <Play size={14} />
                      <span>{isRunningTests ? 'Running Tests...' : 'Run Test Cases'}</span>
                    </button>
                  </div>

                  {/* Test Results Summary */}
                  {testResults && (
                    <div className={`test-summary-banner ${testResults.allPassed ? 'success' : 'failed'}`}>
                      {testResults.allPassed ? (
                        <>
                          <CheckCircle2 size={18} />
                          <span>All {testResults.total} test cases passed successfully!</span>
                        </>
                      ) : (
                        <>
                          <span>Passed {testResults.passed} / {testResults.total} test cases</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Test Cases Tabs */}
                  <div className="test-tabs-row">
                    {questionTestCases.map((tc, idx) => (
                      <button
                        key={idx}
                        className={`test-tab-btn ${selectedTestTab === idx ? 'active' : ''}`}
                        onClick={() => setSelectedTestTab(idx)}
                      >
                        <span>Case {idx + 1}</span>
                      </button>
                    ))}
                  </div>

                  {questionTestCases[selectedTestTab] && (
                    <div className="test-case-card">
                      <div className="tc-field">
                        <span className="tc-label">Input:</span>
                        <pre className="tc-pre">{questionTestCases[selectedTestTab].input}</pre>
                      </div>
                      <div className="tc-field">
                        <span className="tc-label">Expected Output:</span>
                        <pre className="tc-pre">{questionTestCases[selectedTestTab].expectedOutput}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-selection-state">
              <BookOpen size={48} />
              <h3>Select a Problem</h3>
              <p>Choose any challenge from the left pane to view details, test cases, and starter code.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
