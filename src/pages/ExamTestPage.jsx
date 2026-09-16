import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../context/AppContext';
import {
  extractTextFromPdf,
  parseExamFromText,
  askExamAiAssistant,
  saveActiveExam,
  loadActiveExam,
  clearActiveExam,
  recordExamResult,
  getSampleQuestionPapers,
} from '../services/examService';
import { evaluateTestCases } from '../services/testEvaluator';
import { executeCode } from '../services/judge0Service';
import {
  FileText,
  UploadCloud,
  ShieldAlert,
  ShieldCheck,
  Clock,
  LogOut,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Send,
  Code2,
  FileCheck2,
} from 'lucide-react';
import './ExamTestPage.css';

const SUPPORTED_LANGS = [
  { id: 71, label: 'Python 3', key: 'python', monaco: 'python' },
  { id: 63, label: 'JavaScript (Node)', key: 'javascript', monaco: 'javascript' },
  { id: 54, label: 'C++ (GCC)', key: 'cpp', monaco: 'cpp' },
  { id: 62, label: 'Java (JDK 25)', key: 'java', monaco: 'java' },
];

export default function ExamTestPage() {
  const { dispatch } = useApp();

  // Screen phases: 'setup' | 'active' | 'results'
  const [phase, setPhase] = useState(() => {
    const saved = loadActiveExam();
    return saved && !saved.submitted ? 'active' : 'setup';
  });

  // Setup state
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [examData, setExamData] = useState(() => {
    const saved = loadActiveExam();
    return saved?.examData || null;
  });
  const [selectedDuration, setSelectedDuration] = useState(45);
  const [strictnessLimit, setStrictnessLimit] = useState(3);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Active Exam state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [leftSubTab, setLeftSubTab] = useState('problem'); // 'problem' | 'hints' | 'ai-mentor'
  const [answers, setAnswers] = useState(() => {
    const saved = loadActiveExam();
    return saved?.answers || {};
  });
  const [selectedLangs, setSelectedLangs] = useState(() => {
    const saved = loadActiveExam();
    return saved?.selectedLangs || {};
  });
  const [revealedHints, setRevealedHints] = useState(() => {
    const saved = loadActiveExam();
    return saved?.revealedHints || {};
  });
  const [tabSwitchCount, setTabSwitchCount] = useState(() => {
    const saved = loadActiveExam();
    return saved?.tabSwitchCount || 0;
  });
  const [violationsList, setViolationsList] = useState(() => {
    const saved = loadActiveExam();
    return saved?.violationsList || [];
  });
  const [showTabAlertModal, setShowTabAlertModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const saved = loadActiveExam();
    if (saved && saved.secondsRemaining !== undefined) return saved.secondsRemaining;
    return 45 * 60;
  });

  // Test Runner state
  const [testResults, setTestResults] = useState({});
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' | 'custom' | 'output'
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState('');

  // AI Mentor Chat
  const [mentorMessages, setMentorMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Exam Mentor. If you need clarification on problem specifications, edge cases, or test case debugging without revealing the full solution, feel free to ask!',
    },
  ]);
  const [mentorInput, setMentorInput] = useState('');
  const [isMentorThinking, setIsMentorThinking] = useState(false);

  // Final Results
  const [submissionReport, setSubmissionReport] = useState(null);
  const submitTestRef = useRef(null);

  // Anti-cheat shortcut toast
  const [blockedShortcutToast, setBlockedShortcutToast] = useState('');
  const toastTimeoutRef = useRef(null);

  const activeQuestion = examData?.questions?.[currentQIndex] || null;
  const activeLangKey = selectedLangs[activeQuestion?.id] || 'python';
  const activeLangObj = SUPPORTED_LANGS.find((l) => l.key === activeLangKey) || SUPPORTED_LANGS[0];

  // Current Code
  const activeCode =
    answers[activeQuestion?.id] !== undefined
      ? answers[activeQuestion?.id]
      : activeQuestion?.starterCode?.[activeLangKey] || '';

  // ─── Save active session periodically ─────────────────────────────────────
  useEffect(() => {
    if (phase === 'active' && examData) {
      saveActiveExam({
        examData,
        answers,
        selectedLangs,
        revealedHints,
        tabSwitchCount,
        violationsList,
        secondsRemaining,
        submitted: false,
      });
    }
  }, [phase, examData, answers, selectedLangs, revealedHints, tabSwitchCount, violationsList, secondsRemaining]);

  // ─── Proctored Tab-Switch Anti-Cheat Detection ────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolationDetected('Tab switched or hidden');
      }
    };

    const handleWindowBlur = () => {
      handleViolationDetected('Window lost focus or application changed');
    };

    const handleViolationDetected = (reason) => {
      const timestamp = new Date().toLocaleTimeString();
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setViolationsList((vl) => [...vl, { count: next, reason, timestamp }]);
        setShowTabAlertModal(true);
        if (strictnessLimit > 0 && next >= strictnessLimit) {
          // Auto submit if max violations reached
          setTimeout(() => {
            submitTestRef.current?.();
          }, 1500);
        }
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [phase, strictnessLimit]);

  // ─── Countdown Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active' || selectedDuration <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitTestRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, selectedDuration]);

  // ─── Anti-Cheat Keyboard Shortcut Blocker ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    const showBlockedToast = (shortcutName) => {
      setBlockedShortcutToast(`⚠️ "${shortcutName}" blocked during exam`);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setBlockedShortcutToast(''), 2500);
    };

    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key?.toLowerCase();

      // F12 — DevTools
      if (e.keyCode === 123 || key === 'f12') {
        e.preventDefault();
        e.stopPropagation();
        showBlockedToast('F12 / DevTools');
        return;
      }

      if (ctrl) {
        // Ctrl+L — AI Chat / Address bar
        if (key === 'l' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+L');
          return;
        }
        // Ctrl+I — Inline AI / Italic
        if (key === 'i' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+I');
          return;
        }
        // Ctrl+K — AI commands (Copilot)
        if (key === 'k' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+K');
          return;
        }
        // Ctrl+U — View source
        if (key === 'u' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+U / View Source');
          return;
        }
        // Ctrl+Shift+I — DevTools
        if (key === 'i' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+I / DevTools');
          return;
        }
        // Ctrl+Shift+J — Console
        if (key === 'j' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+J / Console');
          return;
        }
        // Ctrl+Shift+P — Command palette
        if (key === 'p' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+P / Command Palette');
          return;
        }
        // Ctrl+Shift+C — DevTools element selector
        if (key === 'c' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+C / Inspector');
          return;
        }
        // Cmd+Option+I on Mac (DevTools)
        if (key === 'i' && alt) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Cmd+Option+I / DevTools');
          return;
        }
        // Cmd+Option+J on Mac (Console)
        if (key === 'j' && alt) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Cmd+Option+J / Console');
          return;
        }
      }
    };

    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      showBlockedToast('Right-click / Context Menu');
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [phase]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── PDF Upload & Processing ──────────────────────────────────────────────
  const handlePdfFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    setIsProcessingPdf(true);
    setProcessingStatus('Extracting text content from PDF question paper...');

    try {
      const extracted = await extractTextFromPdf(file);
      setProcessingStatus(`Extracted ${extracted.pageCount} pages. AI synthesizing questions & test cases...`);

      const parsed = await parseExamFromText(extracted.text, {
        title: file.name.replace(/\.[^/.]+$/, ''),
      });

      setExamData(parsed);
      setSelectedDuration(parsed.durationMinutes || 45);
      setSecondsRemaining((parsed.durationMinutes || 45) * 60);

      // Initialize answers with starter codes
      const initAnswers = {};
      const initLangs = {};
      parsed.questions.forEach((q) => {
        initLangs[q.id] = 'python';
        initAnswers[q.id] = q.starterCode?.python || '';
      });
      setAnswers(initAnswers);
      setSelectedLangs(initLangs);
    } catch (err) {
      console.error('PDF parsing error:', err);
      alert(`Could not process PDF: ${err.message}`);
    } finally {
      setIsProcessingPdf(false);
      setProcessingStatus('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSampleExam = async (sample) => {
    setIsProcessingPdf(true);
    setProcessingStatus(`Loading sample paper: "${sample.title}"...`);
    try {
      const parsed = await parseExamFromText(sample.rawText, {
        title: sample.title,
      });
      setExamData(parsed);
      setSelectedDuration(sample.durationMinutes || 45);
      setSecondsRemaining((sample.durationMinutes || 45) * 60);

      const initAnswers = {};
      const initLangs = {};
      parsed.questions.forEach((q) => {
        initLangs[q.id] = 'python';
        initAnswers[q.id] = q.starterCode?.python || '';
      });
      setAnswers(initAnswers);
      setSelectedLangs(initLangs);
    } catch {
      alert('Failed to parse sample exam');
    } finally {
      setIsProcessingPdf(false);
      setProcessingStatus('');
    }
  };

  const handleStartExam = () => {
    if (!examData || !examData.questions || examData.questions.length === 0) {
      alert('Please upload a question paper PDF or select a sample exam first.');
      return;
    }
    setTabSwitchCount(0);
    setViolationsList([]);
    setPhase('active');
    setSecondsRemaining(selectedDuration * 60);
  };

  // ─── Code & Language Changes ──────────────────────────────────────────────
  const handleCodeChange = (newVal) => {
    if (!activeQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: newVal,
    }));
  };

  const handleLanguageChange = (langKey) => {
    if (!activeQuestion) return;
    setSelectedLangs((prev) => ({
      ...prev,
      [activeQuestion.id]: langKey,
    }));
    // If empty or unmodified, switch to new starter template
    const currentCode = answers[activeQuestion.id];
    if (!currentCode || currentCode.trim() === activeQuestion.starterCode?.[activeLangKey]?.trim()) {
      setAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: activeQuestion.starterCode?.[langKey] || '',
      }));
    }
  };

  const handleResetCode = () => {
    if (!activeQuestion) return;
    if (confirm('Reset your code to the starter template? Current edits will be cleared.')) {
      setAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: activeQuestion.starterCode?.[activeLangKey] || '',
      }));
    }
  };

  // ─── Test Cases Evaluation ────────────────────────────────────────────────
  const handleRunAllTestCases = async () => {
    if (!activeQuestion) return;
    setIsRunningTests(true);
    setConsoleTab('testcases');

    try {
      const code = activeCode;
      const lang = activeLangObj;
      const tcs = activeQuestion.testCases || [];

      const evalResult = await evaluateTestCases(code, lang, tcs);
      setTestResults((prev) => ({
        ...prev,
        [activeQuestion.id]: evalResult,
      }));
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleRunCustomInput = async () => {
    if (!activeQuestion) return;
    setIsRunningTests(true);
    setConsoleTab('custom');
    try {
      const res = await executeCode(activeCode, activeLangObj.id, customInput);
      setCustomOutput(res.output || res.stderr || res.compile_output || '(No output)');
    } catch (err) {
      setCustomOutput(`Execution error: ${err.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // ─── Hints Handling ───────────────────────────────────────────────────────
  const handleRevealHint = (qId, tier) => {
    setRevealedHints((prev) => {
      const current = prev[qId] || [];
      if (!current.includes(tier)) {
        return { ...prev, [qId]: [...current, tier] };
      }
      return prev;
    });
  };

  // ─── AI Mentor Interaction ────────────────────────────────────────────────
  const handleSendMentorMessage = async () => {
    if (!mentorInput.trim() || !activeQuestion || isMentorThinking) return;
    const query = mentorInput.trim();
    setMentorInput('');
    setMentorMessages((prev) => [...prev, { role: 'user', text: query }]);
    setIsMentorThinking(true);

    try {
      const reply = await askExamAiAssistant(activeQuestion, activeCode, query, activeLangObj.label);
      setMentorMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMentorMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, I encountered an issue. Please try rephrasing.' },
      ]);
    } finally {
      setIsMentorThinking(false);
    }
  };

  // ─── Submit & Exit Flows ──────────────────────────────────────────────────
  const handleFinalSubmitTest = async () => {
    if (!examData) return;
    setShowSubmitConfirm(false);

    // Compute final evaluation across all questions
    const qEvaluations = [];
    let totalScore = 0;
    let totalPossible = examData.questions.length * 25;
    let questionsPassedCount = 0;
    let totalTestCasesPassed = 0;
    let totalTestCasesCount = 0;

    for (const q of examData.questions) {
      const code = answers[q.id] || '';
      const langKey = selectedLangs[q.id] || 'python';
      const langObj = SUPPORTED_LANGS.find((l) => l.key === langKey) || SUPPORTED_LANGS[0];

      let evalData = testResults[q.id];
      if (!evalData) {
        // Run evaluation if not run yet
        try {
          evalData = await evaluateTestCases(code, langObj, q.testCases || []);
        } catch {
          evalData = { success: false, allPassed: false, passedCount: 0, totalCount: q.testCases?.length || 0, results: [] };
        }
      }

      const qTotalTcs = q.testCases?.length || 1;
      const qPassedTcs = evalData.passedCount || 0;
      const qPoints = Math.round((qPassedTcs / qTotalTcs) * 25);
      totalScore += qPoints;
      totalTestCasesPassed += qPassedTcs;
      totalTestCasesCount += qTotalTcs;

      if (evalData.allPassed) questionsPassedCount++;

      qEvaluations.push({
        questionId: q.id,
        title: q.title,
        pointsAwarded: qPoints,
        maxPoints: 25,
        allPassed: evalData.allPassed,
        passedCount: qPassedTcs,
        totalCount: qTotalTcs,
        language: langObj.label,
        hintsUsed: (revealedHints[q.id] || []).length,
      });
    }

    const percentage = Math.round((totalScore / Math.max(1, totalPossible)) * 100);
    const report = {
      examTitle: examData.title,
      submittedAt: new Date().toLocaleTimeString(),
      score: totalScore,
      maxScore: totalPossible,
      percentage,
      questionsPassed: questionsPassedCount,
      totalQuestions: examData.questions.length,
      testCasesPassed: totalTestCasesPassed,
      totalTestCases: totalTestCasesCount,
      tabSwitches: tabSwitchCount,
      violations: violationsList,
      timeTakenSecs: selectedDuration * 60 - secondsRemaining,
      qEvaluations,
    };

    recordExamResult(report);
    clearActiveExam();
    setSubmissionReport(report);
    setPhase('results');
  };

  useEffect(() => {
    submitTestRef.current = handleFinalSubmitTest;
  });

  const handleCleanExitToCompiler = () => {
    clearActiveExam();
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  // ─── Render: Setup View ───────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="exam-page">
        {/* Minimal Setup Topbar */}
        <div className="exam-topbar">
          <div className="exam-topbar-left">
            <div className="exam-brand">
              <Code2 size={22} color="var(--accent-cyan)" />
              <span>Full Code Proctored Exam</span>
            </div>
            <span className="exam-badge-tag">AI Paper to Tests Engine</span>
          </div>
          <div className="exam-topbar-right">
            <button className="btn-exit-exam" onClick={handleCleanExitToCompiler} title="Return to regular code editor">
              <LogOut size={14} />
              <span>Exit to Compiler</span>
            </button>
          </div>
        </div>

        <div className="exam-setup-container">
          <div className="exam-setup-card">
            <div className="exam-setup-header">
              <div className="exam-hero-icon">
                <FileCheck2 size={30} />
              </div>
              <h1>Upload Question Paper (PDF)</h1>
              <p>
                The in-built AI will read your PDF, extract coding questions, and immediately generate comprehensive test cases,
                progressive hints, and starter templates.
              </p>
            </div>

            {/* Dropzone */}
            <div
              className={`exam-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handlePdfFile(e.target.files[0])}
              />
              <UploadCloud size={40} className="exam-dropzone-icon" />
              <h3>Choose a PDF question paper or drag & drop here</h3>
              <p>Supports assignments, university exam papers, DSA problem sets, and lab tests</p>
              <span className="btn-file-select">Browse PDF File</span>
            </div>

            {/* Processing Spinner */}
            {isProcessingPdf && (
              <div className="exam-processing-box animate-fade-in">
                <div className="exam-spinner-large" />
                <h4 style={{ color: 'var(--accent-cyan)' }}>{processingStatus}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Synthesizing sample test cases, hidden evaluation tests, and progressive hint trees...
                </p>
              </div>
            )}

            {/* Exam Config & Questions Preview */}
            {examData && !isProcessingPdf && (
              <div className="animate-slide-up">
                <div className="exam-options-panel">
                  <div className="option-group">
                    <label>Exam Duration (Minutes)</label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value, 10);
                        setSelectedDuration(mins);
                        setSecondsRemaining(mins * 60);
                      }}
                    >
                      <option value={15}>15 Minutes (Quick Test)</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes (Standard)</option>
                      <option value={60}>60 Minutes (Full Exam)</option>
                      <option value={90}>90 Minutes</option>
                      <option value={0}>Untimed (Practice Mode)</option>
                    </select>
                  </div>

                  <div className="option-group">
                    <label>Anti-Cheat Proctoring Strictness</label>
                    <select
                      value={strictnessLimit}
                      onChange={(e) => setStrictnessLimit(parseInt(e.target.value, 10))}
                    >
                      <option value={3}>Strict (3 Tab Switches = Auto Submit)</option>
                      <option value={5}>Moderate (5 Tab Switches)</option>
                      <option value={10}>Relaxed (10 Tab Switches)</option>
                      <option value={0}>Warning Only (No Auto-Submit)</option>
                    </select>
                  </div>
                </div>

                <div className="parsed-questions-summary">
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Generated Test Cases & Questions ({examData.questions?.length || 0})
                  </h4>
                  {examData.questions?.map((q, idx) => (
                    <div key={q.id} className="parsed-question-pill">
                      <div className="parsed-question-info">
                        <span className="question-chip">Q{idx + 1}</span>
                        <strong style={{ fontSize: '0.9rem' }}>{q.title}</strong>
                      </div>
                      <span className="tc-badge-count">
                        {q.testCases?.length || 0} Test Cases • {q.hints?.length || 0} Hints • {q.difficulty}
                      </span>
                    </div>
                  ))}
                </div>

                <button className="btn-start-exam" onClick={handleStartExam}>
                  Start Proctored Examination →
                </button>
              </div>
            )}

            {/* Built-in Sample Question Papers for instant testing */}
            {!examData && !isProcessingPdf && (
              <div className="exam-sample-section">
                <h4>Or Start With A Built-in Sample Question Paper:</h4>
                <div className="exam-sample-grid">
                  {getSampleQuestionPapers().map((sample) => (
                    <div
                      key={sample.id}
                      className="exam-sample-card"
                      onClick={() => handleSelectSampleExam(sample)}
                    >
                      <h5>{sample.title}</h5>
                      <p>{sample.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Submission Results View ──────────────────────────────────────
  if (phase === 'results' && submissionReport) {
    const isIntegrityGood = submissionReport.tabSwitches === 0;

    return (
      <div className="exam-page">
        <div className="exam-topbar">
          <div className="exam-topbar-left">
            <div className="exam-brand">
              <Code2 size={22} color="var(--accent-cyan)" />
              <span>Full Code Proctored Exam</span>
            </div>
            <span className="exam-badge-tag">Evaluation Report</span>
          </div>
          <div className="exam-topbar-right">
            <button className="btn-exit-exam" onClick={handleCleanExitToCompiler}>
              <LogOut size={14} />
              <span>Return to Compiler</span>
            </button>
          </div>
        </div>

        <div className="exam-results-container">
          <div className="exam-results-card animate-slide-up">
            <div className="score-hero-circle">
              <span className="score-num">{submissionReport.percentage}%</span>
              <span className="score-pct">{submissionReport.score} / {submissionReport.maxScore} Pts</span>
            </div>

            <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Examination Completed!</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Paper: {submissionReport.examTitle} • Submitted at {submissionReport.submittedAt}
            </p>

            <div className="exam-stat-grid">
              <div className="exam-stat-box">
                <div className="stat-box-val" style={{ color: 'var(--accent-green)' }}>
                  {submissionReport.questionsPassed} / {submissionReport.totalQuestions}
                </div>
                <div className="stat-box-lbl">Questions Solved</div>
              </div>
              <div className="exam-stat-box">
                <div className="stat-box-val" style={{ color: 'var(--accent-cyan)' }}>
                  {submissionReport.testCasesPassed} / {submissionReport.totalTestCases}
                </div>
                <div className="stat-box-lbl">Test Cases Passed</div>
              </div>
              <div className="exam-stat-box">
                <div className="stat-box-val">
                  {Math.round(submissionReport.timeTakenSecs / 60)} min
                </div>
                <div className="stat-box-lbl">Time Taken</div>
              </div>
              <div className="exam-stat-box">
                <div
                  className="stat-box-val"
                  style={{ color: submissionReport.tabSwitches > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}
                >
                  {submissionReport.tabSwitches}
                </div>
                <div className="stat-box-lbl">Tab Switches</div>
              </div>
            </div>

            {/* Anti-Cheat Integrity Report */}
            <div className={`integrity-report-box ${!isIntegrityGood ? 'flagged' : ''}`}>
              <div className="integrity-header">
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isIntegrityGood ? (
                    <ShieldCheck size={18} color="var(--accent-green)" />
                  ) : (
                    <ShieldAlert size={18} color="var(--accent-red)" />
                  )}
                  Proctoring Integrity Report
                </span>
                <span style={{ fontSize: '0.8rem', color: isIntegrityGood ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {isIntegrityGood ? 'Clean Session (No Tab Switches)' : `${submissionReport.tabSwitches} Violations Recorded`}
                </span>
              </div>
              {submissionReport.violations && submissionReport.violations.length > 0 ? (
                <ul style={{ margin: '0.5rem 0 0 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {submissionReport.violations.map((v, i) => (
                    <li key={i}>
                      Switch #{v.count} at {v.timestamp} — {v.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Full integrity compliance: Student stayed on the exam tab throughout the entire session.
                </p>
              )}
            </div>

            {/* Question Breakdown */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>Question Breakdown</h4>
              {submissionReport.qEvaluations.map((q, idx) => (
                <div key={q.questionId} className="parsed-question-pill">
                  <div className="parsed-question-info">
                    <span className="question-chip">Q{idx + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hints: {q.hintsUsed}</span>
                    <span style={{ color: q.allPassed ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                      {q.passedCount} / {q.totalCount} Tests
                    </span>
                    <strong style={{ color: q.allPassed ? 'var(--accent-green)' : 'inherit' }}>
                      {q.pointsAwarded} / {q.maxPoints} pts
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="results-action-row">
              <button className="btn-return-compiler" onClick={handleCleanExitToCompiler}>
                Return to Full Code Compiler
              </button>
              <button className="btn-new-exam" onClick={() => setPhase('setup')}>
                Start Another Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Active Live Exam ─────────────────────────────────────────────
  const curQResults = testResults[activeQuestion?.id];
  const selectedTestCase = activeQuestion?.testCases?.[selectedTestCaseIdx] || activeQuestion?.testCases?.[0];
  const curTcResult = curQResults?.results?.[selectedTestCaseIdx];
  const isTimeUrgent = selectedDuration > 0 && secondsRemaining < 300;

  return (
    <div className="exam-page">
      {/* Proctored Topbar */}
      <div className="exam-topbar">
        <div className="exam-topbar-left">
          <div className="exam-brand">
            <Code2 size={20} color="var(--accent-cyan)" />
            <span className="exam-title-display">{examData?.title}</span>
          </div>
          <span className="exam-badge-tag">
            Q{currentQIndex + 1} of {examData?.questions?.length}
          </span>
        </div>

        <div className="exam-topbar-center">
          {/* Anti-Cheat Proctoring Badge */}
          <div className={`proctor-shield-badge ${tabSwitchCount > 0 ? 'warning' : ''}`}>
            <span className="live-dot" />
            <ShieldCheck size={14} />
            <span>
              {tabSwitchCount === 0
                ? 'Anti-Cheat Shield Active'
                : `Warning: ${tabSwitchCount}${strictnessLimit ? `/${strictnessLimit}` : ''} Tab Switches`}
            </span>
          </div>

          {/* Countdown Timer */}
          {selectedDuration > 0 && (
            <div className={`exam-timer-chip ${isTimeUrgent ? 'urgent' : ''}`} title="Time Remaining">
              <Clock size={15} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}
        </div>

        <div className="exam-topbar-right">
          <button className="btn-exit-exam" onClick={() => setShowExitConfirm(true)} title="Leave exam session">
            <LogOut size={14} />
            <span>Exit Exam</span>
          </button>

          <button className="btn-submit-exam" onClick={() => setShowSubmitConfirm(true)} title="Finalize and submit exam">
            <FileCheck2 size={15} />
            <span>Submit Test</span>
          </button>
        </div>
      </div>

      {/* Workspace Split */}
      <div className="exam-workspace">
        {/* Left Problem & Hints Pane */}
        <div className="exam-left-panel">
          {/* Question Navigator */}
          <div className="question-nav-strip">
            {examData?.questions?.map((q, idx) => {
              const qEval = testResults[q.id];
              const isPassed = qEval?.allPassed;
              const isAttempted = Boolean(answers[q.id] && answers[q.id].trim());

              return (
                <button
                  key={q.id}
                  className={`q-nav-tab ${idx === currentQIndex ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentQIndex(idx);
                    setSelectedTestCaseIdx(0);
                  }}
                >
                  <span
                    className={`q-status-dot ${isPassed ? 'passed' : isAttempted ? 'attempted' : ''}`}
                  />
                  <span>Q{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Subtabs: Problem, Hints, AI Help */}
          <div className="exam-left-subtabs">
            <button
              className={`exam-subtab-btn ${leftSubTab === 'problem' ? 'active' : ''}`}
              onClick={() => setLeftSubTab('problem')}
            >
              <FileText size={14} />
              <span>Problem Statement</span>
            </button>
            <button
              className={`exam-subtab-btn ${leftSubTab === 'hints' ? 'active' : ''}`}
              onClick={() => setLeftSubTab('hints')}
            >
              <HelpCircle size={14} />
              <span>
                Hints ({(revealedHints[activeQuestion?.id] || []).length}/{activeQuestion?.hints?.length || 3})
              </span>
            </button>
            <button
              className={`exam-subtab-btn ${leftSubTab === 'ai-mentor' ? 'active' : ''}`}
              onClick={() => setLeftSubTab('ai-mentor')}
            >
              <Sparkles size={14} />
              <span>AI Exam Mentor</span>
            </button>
          </div>

          {/* Left Subtab Content: Problem */}
          {leftSubTab === 'problem' && activeQuestion && (
            <div className="exam-problem-body">
              <h2 className="exam-problem-title">{activeQuestion.title}</h2>
              <div className="exam-problem-meta">
                <span className={`difficulty-tag ${activeQuestion.difficulty}`}>{activeQuestion.difficulty}</span>
                <span className="points-tag">{activeQuestion.points || 25} Points</span>
              </div>

              {/* 🎯 What to Calculate — the #1 thing the user needs to see */}
              {activeQuestion.whatToCalculate && (
                <div className="exam-what-to-calculate">
                  <h5>🎯 What to Calculate</h5>
                  <p>{activeQuestion.whatToCalculate}</p>
                </div>
              )}

              {/* 📋 Problem Statement — clean, no theory */}
              {activeQuestion.problemStatement && (
                <div className="exam-desc-block">
                  {activeQuestion.problemStatement}
                </div>
              )}

              {/* If no structured fields, fall back to description */}
              {!activeQuestion.problemStatement && activeQuestion.description && (
                <div className="exam-desc-block">{activeQuestion.description}</div>
              )}

              {/* 📝 Examples — LeetCode-style I/O cards */}
              {activeQuestion.examples && activeQuestion.examples.length > 0 && (
                <div className="exam-examples-section">
                  <h5>Examples</h5>
                  {activeQuestion.examples.map((ex) => (
                    <div key={ex.id} className="exam-example-card">
                      <div className="exam-example-label">Example {ex.id}:</div>
                      <div className="exam-example-io">
                        <div className="exam-io-row">
                          <span className="exam-io-key">Input:</span>
                          <pre className="exam-io-value">{ex.input}</pre>
                        </div>
                        <div className="exam-io-row">
                          <span className="exam-io-key">Output:</span>
                          <pre className="exam-io-value">{ex.output}</pre>
                        </div>
                      </div>
                      {ex.explanation && (
                        <div className="exam-example-explanation">
                          <strong>Explanation:</strong> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeQuestion.inputFormat && (
                <div className="exam-spec-card">
                  <h5>Input Format</h5>
                  <pre>{activeQuestion.inputFormat}</pre>
                </div>
              )}

              {activeQuestion.outputFormat && (
                <div className="exam-spec-card">
                  <h5>Output Format</h5>
                  <pre>{activeQuestion.outputFormat}</pre>
                </div>
              )}

              {activeQuestion.constraints && (
                <div className="exam-spec-card">
                  <h5>Constraints</h5>
                  <pre>{activeQuestion.constraints}</pre>
                </div>
              )}
            </div>
          )}

          {/* Left Subtab Content: Progressive Hints */}
          {leftSubTab === 'hints' && activeQuestion && (
            <div className="exam-problem-body hints-container">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Reveal progressive hints one tier at a time if you are stuck.
              </p>
              {activeQuestion.hints?.map((h) => {
                const isRevealed = (revealedHints[activeQuestion.id] || []).includes(h.tier);
                return (
                  <div key={h.tier} className={`hint-tier-card ${isRevealed ? 'revealed' : ''}`}>
                    <div className="hint-header-btn">
                      <span>{h.title}</span>
                      {!isRevealed ? (
                        <button
                          className="btn-reveal-hint"
                          onClick={() => handleRevealHint(activeQuestion.id, h.tier)}
                        >
                          Reveal Hint {h.tier}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Unlocked</span>
                      )}
                    </div>
                    {isRevealed && <div className="hint-content-body">{h.content}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Left Subtab Content: AI Mentor Chat */}
          {leftSubTab === 'ai-mentor' && (
            <div className="ai-mentor-container">
              <div className="ai-mentor-messages">
                {mentorMessages.map((m, i) => (
                  <div key={i} className={`mentor-msg ${m.role}`}>
                    {m.text}
                  </div>
                ))}
                {isMentorThinking && (
                  <div className="mentor-msg assistant">
                    <span style={{ color: 'var(--accent-cyan)' }}>AI Mentor is thinking...</span>
                  </div>
                )}
              </div>
              <div className="mentor-input-row">
                <input
                  type="text"
                  placeholder="Ask a conceptual question, error fix, or logic doubt..."
                  value={mentorInput}
                  onChange={(e) => setMentorInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMentorMessage()}
                />
                <button className="btn-send-mentor" onClick={handleSendMentorMessage}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Editor & Test Runner Pane */}
        <div className="exam-right-panel">
          {/* Editor Header Toolbar */}
          <div className="exam-editor-toolbar">
            <div className="exam-editor-left">
              <select
                className="exam-lang-select"
                value={activeLangKey}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {SUPPORTED_LANGS.map((lang) => (
                  <option key={lang.key} value={lang.key}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="exam-editor-right">
              <button className="btn-editor-action" onClick={handleResetCode} title="Reset to template">
                <RotateCcw size={13} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
                <span>Reset Code</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="exam-editor-box">
            <Editor
              height="100%"
              language={activeLangObj.monaco}
              theme="vs-dark"
              value={activeCode}
              onChange={handleCodeChange}
              options={{
                fontSize: 15,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </div>

          {/* Bottom Test Cases Console */}
          <div className="exam-test-console">
            <div className="console-tab-header">
              <div className="console-tabs-left">
                <button
                  className={`console-tab-btn ${consoleTab === 'testcases' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('testcases')}
                >
                  Test Cases ({curQResults?.passedCount ?? 0}/{activeQuestion?.testCases?.length || 0} Passed)
                </button>
                <button
                  className={`console-tab-btn ${consoleTab === 'custom' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('custom')}
                >
                  Custom Test Input
                </button>
              </div>

              <button
                className="btn-run-tests"
                onClick={consoleTab === 'custom' ? handleRunCustomInput : handleRunAllTestCases}
                disabled={isRunningTests}
              >
                <Play size={13} fill="currentColor" />
                <span>
                  {isRunningTests
                    ? 'Evaluating...'
                    : consoleTab === 'custom'
                    ? 'Run Custom'
                    : 'Run All Test Cases'}
                </span>
              </button>
            </div>

            <div className="console-content-box">
              {consoleTab === 'testcases' && (
                <>
                  {/* Test Case Chips */}
                  <div className="tc-selector-row">
                    {activeQuestion?.testCases?.map((tc, idx) => {
                      const res = curQResults?.results?.[idx];
                      const isPassed = res?.passed;
                      const hasRun = res !== undefined;

                      return (
                        <button
                          key={tc.id}
                          className={`tc-chip ${selectedTestCaseIdx === idx ? 'active' : ''} ${
                            hasRun ? (isPassed ? 'passed' : 'failed') : ''
                          }`}
                          onClick={() => setSelectedTestCaseIdx(idx)}
                        >
                          {hasRun ? (
                            isPassed ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <XCircle size={13} />
                            )
                          ) : null}
                          <span>
                            Test Case {idx + 1}
                            {tc.isHidden ? ' (Hidden)' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Test Case Details */}
                  {selectedTestCase && (
                    <div className="tc-details-grid">
                      <div className="tc-field">
                        <div className="tc-field-label">Standard Input</div>
                        <pre className="tc-field-val">
                          {selectedTestCase.isHidden && !curTcResult
                            ? '(Hidden Evaluation Input)'
                            : selectedTestCase.input || '(empty)'}
                        </pre>
                      </div>

                      <div className="tc-field">
                        <div className="tc-field-label">Expected Output</div>
                        <pre className="tc-field-val">
                          {selectedTestCase.isHidden && !curTcResult
                            ? '(Hidden Evaluation Output)'
                            : selectedTestCase.expectedOutput}
                        </pre>
                      </div>

                      {curTcResult && (
                        <div className="tc-field" style={{ gridColumn: '1 / -1' }}>
                          <div className="tc-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Actual Program Output</span>
                            <span style={{ color: curTcResult.passed ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {curTcResult.passed ? '✓ PASSED' : '✗ FAILED'} ({curTcResult.executionTime}ms)
                            </span>
                          </div>
                          <pre className={`tc-field-val ${curTcResult.passed ? 'pass' : 'fail'}`}>
                            {curTcResult.actual || '(No output)'}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {consoleTab === 'custom' && (
                <div className="custom-run-area">
                  <textarea
                    placeholder="Enter custom stdin test input here..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                  />
                  {customOutput && (
                    <div className="tc-field">
                      <div className="tc-field-label">Custom Execution Result</div>
                      <pre className="tc-field-val">{customOutput}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab Switch Warning Modal ─────────────────────────────────────── */}
      {showTabAlertModal && (
        <div className="exam-alert-backdrop">
          <div className="exam-alert-modal">
            <AlertTriangle size={48} className="alert-warning-icon" />
            <h2>Tab Switch Detected!</h2>
            <p>
              You have navigated away from the examination window. All tab switches and window blur events are recorded in
              your proctoring integrity report.
            </p>
            <div className="warning-counter-pill">
              Violation Warning: {tabSwitchCount} {strictnessLimit ? `of ${strictnessLimit}` : ''}
            </div>
            <button className="btn-resume-exam" onClick={() => setShowTabAlertModal(false)}>
              I Understand & Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* ─── Exit Confirmation Modal ──────────────────────────────────────── */}
      {showExitConfirm && (
        <div className="exam-alert-backdrop">
          <div className="exam-confirm-modal">
            <LogOut size={36} color="var(--accent-red)" style={{ margin: '0 auto 1rem' }} />
            <h3>Exit Examination?</h3>
            <p>
              Are you sure you want to exit the exam? Your current progress and test results will be discarded, and you will
              return to the standard editor.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel-modal" onClick={() => setShowExitConfirm(false)}>
                Cancel & Continue Exam
              </button>
              <button className="btn-danger-confirm" onClick={handleCleanExitToCompiler}>
                Yes, Exit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Submit Confirmation Modal ────────────────────────────────────── */}
      {showSubmitConfirm && (
        <div className="exam-alert-backdrop">
          <div className="exam-confirm-modal">
            <FileCheck2 size={36} color="var(--accent-green)" style={{ margin: '0 auto 1rem' }} />
            <h3>Submit Final Examination?</h3>
            <p>
              Are you ready to submit your exam paper? All questions will be evaluated against their full test suites, and your
              final score and integrity report will be generated.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel-modal" onClick={() => setShowSubmitConfirm(false)}>
                Review Questions
              </button>
              <button className="btn-success-confirm" onClick={handleFinalSubmitTest}>
                Confirm & Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Blocked Shortcut Toast Notification ──────────────────────────── */}
      {blockedShortcutToast && (
        <div className="exam-blocked-toast">
          {blockedShortcutToast}
        </div>
      )}
    </div>
  );
}
