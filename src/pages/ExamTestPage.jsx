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
  generateExamShareUrl,
  decodeExamShareUrl,
  generateRandomTestCode,
  getLockedLineRange,
  saveCreatedExam,
  getSavedCreatedExams,
  deleteCreatedExam,
  getSampleFullExam,
  compressImageFile,
} from '../services/examService';
import { evaluateTestCases } from '../services/testEvaluator';
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
  Lock,
  Unlock,
  Share2,
  Copy,
  Check,
  Image as ImageIcon,
  ZoomIn,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  User,
  Key,
  Layers,
  Wand2,
} from 'lucide-react';
import './ExamTestPage.css';

const SUPPORTED_LANGS = [
  { id: 71, label: 'Python 3', key: 'python', monaco: 'python' },
  { id: 63, label: 'JavaScript (Node)', key: 'javascript', monaco: 'javascript' },
  { id: 54, label: 'C++ (GCC)', key: 'cpp', monaco: 'cpp' },
  { id: 62, label: 'Java 26 (OpenJDK 26.0.2.1)', key: 'java', monaco: 'java' },
];

export default function ExamTestPage() {
  const { dispatch } = useApp();

  // Mode in Setup: 'creator' | 'pdf' | 'library'
  const [setupMode, setSetupMode] = useState('creator');

  // Candidate identity state
  const [candidateName, setCandidateName] = useState(() => {
    try {
      return localStorage.getItem('fullcode_candidate_name') || '';
    } catch {
      return '';
    }
  });
  const [unlockCodeInput, setUnlockCodeInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockedWithCode, setUnlockedWithCode] = useState('');

  // Primary Exam Data
  const [examData, setExamData] = useState(() => {
    // Check if shared URL in hash
    if (typeof window !== 'undefined' && window.location.hash.includes('exam-share=')) {
      const decoded = decodeExamShareUrl(window.location.hash);
      if (decoded) return decoded;
    }
    const saved = loadActiveExam();
    if (saved?.examData) return saved.examData;
    // Default to rich sample exam with MCQs, Java 26 locked lines & diagrams
    return getSampleFullExam();
  });

  // Phases: 'setup' | 'unlock-gate' | 'active' | 'results'
  const [phase, setPhase] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('exam-share=')) {
      return 'unlock-gate';
    }
    const saved = loadActiveExam();
    if (saved && !saved.submitted) return 'active';
    return 'setup';
  });

  // Setup / Creator state
  const [selectedDuration, setSelectedDuration] = useState(() => examData?.durationMinutes || 45);
  const [strictnessLimit, setStrictnessLimit] = useState(() => examData?.strictnessLimit ?? 3);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Creator Studio edit state
  const [creatorExam, setCreatorExam] = useState(() => {
    return examData ? JSON.parse(JSON.stringify(examData)) : getSampleFullExam();
  });
  const [savedExamsList, setSavedExamsList] = useState(() => getSavedCreatedExams());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrlGenerated, setShareUrlGenerated] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
    return (examData?.durationMinutes || 45) * 60;
  });

  // Test Runner state
  const [testResults, setTestResults] = useState({});
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcases');
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState('');

  // AI Mentor Chat
  const [mentorMessages, setMentorMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Exam Mentor. If you need clarification on problem specifications, edge cases, or test debugging without revealing direct solutions, feel free to ask!',
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

  // Monaco locked lines enforcement refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const isRevertingRef = useRef(false);
  const lockedRangeRef = useRef(null);
  const [lockWarningToast, setLockWarningToast] = useState('');
  const lockToastTimeoutRef = useRef(null);

  // Image zoom lightbox
  const [zoomedImage, setZoomedImage] = useState(null);

  const activeQuestion = examData?.questions?.[currentQIndex] || null;
  const activeLangKey = selectedLangs[activeQuestion?.id] || activeQuestion?.language || 'java';
  const activeLangObj = SUPPORTED_LANGS.find((l) => l.key === activeLangKey) || SUPPORTED_LANGS[3];

  // Active Code for coding questions
  const activeCode =
    answers[activeQuestion?.id] !== undefined
      ? answers[activeQuestion?.id]
      : typeof activeQuestion?.starterCode === 'string'
      ? activeQuestion.starterCode
      : activeQuestion?.starterCode?.[activeLangKey] || '';

  // Synchronize current locked line range
  const currentLockedRange =
    activeQuestion?.type === 'coding'
      ? getLockedLineRange(activeCode, activeQuestion?.lockedLines)
      : null;

  useEffect(() => {
    lockedRangeRef.current = currentLockedRange;
  }, [currentLockedRange]);

  // ─── Listen for URL hash changes (#exam-share=...) ─────────────────────────
  useEffect(() => {
    const handleHashCheck = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash || '';
      if (hash.includes('exam-share=')) {
        const decoded = decodeExamShareUrl(hash);
        if (decoded) {
          setExamData(decoded);
          setSelectedDuration(decoded.durationMinutes || 45);
          setStrictnessLimit(decoded.strictnessLimit ?? 3);
          setPhase('unlock-gate');
          setUnlockError('');
        }
      }
    };

    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // ─── Save active session periodically ─────────────────────────────────────
  useEffect(() => {
    if (phase === 'active' && examData) {
      saveActiveExam({
        examData,
        candidateName,
        unlockedWithCode,
        answers,
        selectedLangs,
        revealedHints,
        tabSwitchCount,
        violationsList,
        secondsRemaining,
        submitted: false,
      });
    }
  }, [
    phase,
    examData,
    candidateName,
    unlockedWithCode,
    answers,
    selectedLangs,
    revealedHints,
    tabSwitchCount,
    violationsList,
    secondsRemaining,
  ]);

  // ─── Proctored Tab-Switch Anti-Cheat Detection ────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    const handleViolationDetected = (reason) => {
      const timestamp = new Date().toLocaleTimeString();
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setViolationsList((vl) => [...vl, { count: next, reason, timestamp }]);
        setShowTabAlertModal(true);
        if (strictnessLimit > 0 && next >= strictnessLimit) {
          setTimeout(() => {
            submitTestRef.current?.();
          }, 1500);
        }
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolationDetected('Tab switched or hidden');
      }
    };

    const handleWindowBlur = () => {
      handleViolationDetected('Window lost focus or application changed');
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
    if (phase !== 'active') return;
    if (selectedDuration <= 0) return; // Untimed practice

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
      setBlockedShortcutToast(`⚠️ "${shortcutName}" blocked during proctored exam`);
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
        if (key === 'l' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+L');
          return;
        }
        if (key === 'i' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+I');
          return;
        }
        if (key === 'k' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+K');
          return;
        }
        if (key === 'u' && !shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+U / View Source');
          return;
        }
        if (key === 'i' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+I / DevTools');
          return;
        }
        if (key === 'j' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+J / Console');
          return;
        }
        if (key === 'p' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+P / Command Palette');
          return;
        }
        if (key === 'c' && shift) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Ctrl+Shift+C / Inspector');
          return;
        }
        if (key === 'i' && alt) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedToast('Cmd+Option+I / DevTools');
          return;
        }
      }
    };

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

  // ─── Monaco Locked Lines Highlighting & Event Hook ───────────────────────
  const triggerLockWarning = (start, end) => {
    setLockWarningToast(`🔒 Lines ${start}–${end} are locked by the examiner. You cannot modify imports or boilerplate.`);
    if (lockToastTimeoutRef.current) clearTimeout(lockToastTimeoutRef.current);
    lockToastTimeoutRef.current = setTimeout(() => setLockWarningToast(''), 3000);
  };

  const updateMonacoDecorations = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (currentLockedRange) {
      const { startLine, endLine } = currentLockedRange;
      const newDecorations = [
        {
          range: new monaco.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-locked-line-bg',
            glyphMarginClassName: 'monaco-locked-glyph-icon',
            linesDecorationsClassName: 'monaco-locked-line-gutter',
            hoverMessage: {
              value: `🔒 **Locked by Examiner (Lines ${startLine}–${endLine})**\n\nImports and boilerplate declarations in this section are protected and cannot be edited.`,
            },
          },
        },
      ];
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current || [], newDecorations);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current || [], []);
    }
  };

  useEffect(() => {
    updateMonacoDecorations();
  }, [currentQIndex, activeQuestion, currentLockedRange?.startLine, currentLockedRange?.endLine]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Block keystrokes on locked lines
    editor.onKeyDown((e) => {
      const locked = lockedRangeRef.current;
      if (!locked) return;
      const selection = editor.getSelection();
      if (!selection) return;

      const touchesLocked =
        selection.startLineNumber <= locked.endLine && selection.endLineNumber >= locked.startLine;

      if (touchesLocked) {
        // Allow pure arrow keys, navigation, page up/down, copy Cmd+C
        const allowedKeys = [
          monaco.KeyCode.UpArrow,
          monaco.KeyCode.DownArrow,
          monaco.KeyCode.LeftArrow,
          monaco.KeyCode.RightArrow,
          monaco.KeyCode.PageUp,
          monaco.KeyCode.PageDown,
          monaco.KeyCode.Home,
          monaco.KeyCode.End,
          monaco.KeyCode.Escape,
        ];
        const isCopy = (e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyC;

        if (!allowedKeys.includes(e.keyCode) && !isCopy) {
          e.preventDefault();
          e.stopPropagation();
          triggerLockWarning(locked.startLine, locked.endLine);
        }
      }
    });

    // Block pasting into locked lines
    editor.onDidPaste((e) => {
      const locked = lockedRangeRef.current;
      if (!locked) return;
      if (e.range.startLineNumber <= locked.endLine && e.range.endLineNumber >= locked.startLine) {
        editor.trigger('lock', 'undo', null);
        triggerLockWarning(locked.startLine, locked.endLine);
      }
    });

    // Content change safeguard
    editor.onDidChangeModelContent((event) => {
      if (isRevertingRef.current) return;
      const locked = lockedRangeRef.current;
      if (!locked) return;

      const touchesLocked = event.changes.some(
        (ch) => ch.range.startLineNumber <= locked.endLine && ch.range.endLineNumber >= locked.startLine
      );
      if (touchesLocked) {
        isRevertingRef.current = true;
        editor.trigger('lock', 'undo', null);
        triggerLockWarning(locked.startLine, locked.endLine);
        setTimeout(() => {
          isRevertingRef.current = false;
        }, 50);
      }
    });

    updateMonacoDecorations();
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── Candidate Unlock Gate Logic ──────────────────────────────────────────
  const handleUnlockExam = (e) => {
    e?.preventDefault();
    if (!candidateName.trim() || candidateName.trim().length < 2) {
      setUnlockError('Please enter your full name or candidate username.');
      return;
    }

    const expectedCode = (examData?.unlockCode || '').trim();
    const enteredCode = unlockCodeInput.trim();

    if (expectedCode && enteredCode.toUpperCase() !== expectedCode.toUpperCase()) {
      setUnlockError(`Invalid test unlock code. Please request the code from your instructor or examiner.`);
      return;
    }

    try {
      localStorage.setItem('fullcode_candidate_name', candidateName.trim());
    } catch {
      // ignore
    }

    setUnlockedWithCode(enteredCode || expectedCode || 'OPEN-ACCESS');
    setUnlockError('');
    setTabSwitchCount(0);
    setViolationsList([]);
    setSecondsRemaining((examData?.durationMinutes || 45) * 60);
    setPhase('active');
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
      setCreatorExam(parsed);
      setSelectedDuration(parsed.durationMinutes || 45);
      setSecondsRemaining((parsed.durationMinutes || 45) * 60);

      // Initialize answers
      const initAnswers = {};
      const initLangs = {};
      parsed.questions.forEach((q) => {
        initLangs[q.id] = q.language || 'python';
        initAnswers[q.id] = typeof q.starterCode === 'string' ? q.starterCode : q.starterCode?.python || '';
      });
      setAnswers(initAnswers);
      setSelectedLangs(initLangs);
      setSetupMode('creator');
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
      setCreatorExam(parsed);
      setSelectedDuration(sample.durationMinutes || 45);
      setSecondsRemaining((sample.durationMinutes || 45) * 60);

      const initAnswers = {};
      const initLangs = {};
      parsed.questions.forEach((q) => {
        initLangs[q.id] = q.language || 'python';
        initAnswers[q.id] = typeof q.starterCode === 'string' ? q.starterCode : q.starterCode?.python || '';
      });
      setAnswers(initAnswers);
      setSelectedLangs(initLangs);
      setSetupMode('creator');
    } catch {
      alert('Failed to parse sample exam');
    } finally {
      setIsProcessingPdf(false);
      setProcessingStatus('');
    }
  };

  // ─── Creator Studio Helpers ───────────────────────────────────────────────
  const handleUpdateCreatorField = (field, val) => {
    setCreatorExam((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddQuestion = (type) => {
    const newId = 'q_' + Date.now();
    const newNum = String((creatorExam.questions?.length || 0) + 1);

    if (type === 'mcq') {
      const newMcq = {
        id: newId,
        num: newNum,
        type: 'mcq',
        title: 'New MCQ Question',
        description: 'Which of the following is correct?',
        imageUrl: '',
        options: [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' },
        ],
        correctAnswer: 'A',
        explanation: 'Option A is correct based on language standards.',
      };
      setCreatorExam((prev) => ({
        ...prev,
        questions: [...(prev.questions || []), newMcq],
      }));
    } else {
      const newCoding = {
        id: newId,
        num: newNum,
        type: 'coding',
        title: 'New Coding Problem',
        description: 'Write a solution that solves the given task.',
        imageUrl: '',
        language: 'java',
        lockedLines: { start: 1, end: 4 },
        starterCode: `// === LOCKED REGION START (Imports protected) ===
import java.util.*;
public class Solution {
// === LOCKED REGION END ===
    void main() {
        IO.print("hello");
    }
}`,
        testCases: [{ id: 1, input: '', expectedOutput: 'hello', isHidden: false }],
      };
      setCreatorExam((prev) => ({
        ...prev,
        questions: [...(prev.questions || []), newCoding],
      }));
    }
  };

  const handleRemoveQuestion = (idx) => {
    if (creatorExam.questions.length <= 1) {
      alert('An exam must contain at least 1 question.');
      return;
    }
    const updated = creatorExam.questions.filter((_, i) => i !== idx);
    setCreatorExam((prev) => ({ ...prev, questions: updated }));
  };

  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= creatorExam.questions.length) return;
    const items = [...creatorExam.questions];
    const [moved] = items.splice(idx, 1);
    items.splice(targetIdx, 0, moved);
    setCreatorExam((prev) => ({ ...prev, questions: items }));
  };

  const handleUpdateQuestion = (idx, key, val) => {
    const updated = [...creatorExam.questions];
    updated[idx] = { ...updated[idx], [key]: val };
    setCreatorExam((prev) => ({ ...prev, questions: updated }));
  };

  const handleImageUpload = async (idx, file) => {
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 800, 0.72);
      handleUpdateQuestion(idx, 'imageUrl', compressedDataUrl);
    } catch (e) {
      alert('Failed to process image: ' + e.message);
    }
  };

  const handleGenerateShareableLink = () => {
    // Sync creatorExam into examData
    setExamData(creatorExam);
    saveCreatedExam(creatorExam);
    setSavedExamsList(getSavedCreatedExams());

    const url = generateExamShareUrl(creatorExam);
    setShareUrlGenerated(url);
    setShowShareModal(true);
    setCopiedLink(false);
    setCopiedCode(false);

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  const handleTestAsCandidate = () => {
    setExamData(creatorExam);
    setSelectedDuration(creatorExam.durationMinutes || 45);
    setStrictnessLimit(creatorExam.strictnessLimit ?? 3);

    // Initialize answer buffers
    const initAnswers = {};
    const initLangs = {};
    creatorExam.questions.forEach((q) => {
      initLangs[q.id] = q.language || 'java';
      if (q.type === 'mcq') {
        initAnswers[q.id] = '';
      } else {
        initAnswers[q.id] =
          typeof q.starterCode === 'string'
            ? q.starterCode
            : q.starterCode?.[q.language || 'java'] || '';
      }
    });
    setAnswers(initAnswers);
    setSelectedLangs(initLangs);
    setPhase('unlock-gate');
    setUnlockError('');
  };

  // ─── Code & MCQ Answers ───────────────────────────────────────────────────
  const handleCodeChange = (newVal) => {
    if (!activeQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: newVal,
    }));
  };

  const handleSelectMcqOption = (qId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));
  };

  const handleLanguageChange = (langKey) => {
    if (!activeQuestion) return;
    setSelectedLangs((prev) => ({
      ...prev,
      [activeQuestion.id]: langKey,
    }));
  };

  const handleResetCode = () => {
    if (!activeQuestion) return;
    if (confirm('Reset your code to the examiner template? Current edits will be cleared.')) {
      const starter =
        typeof activeQuestion.starterCode === 'string'
          ? activeQuestion.starterCode
          : activeQuestion.starterCode?.[activeLangKey] || '';
      setAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: starter,
      }));
    }
  };

  // ─── Test Cases Evaluation ────────────────────────────────────────────────
  const handleRunAllTestCases = async () => {
    if (!activeQuestion || activeQuestion.type !== 'coding') return;
    setIsRunningTests(true);

    try {
      const evalData = await evaluateTestCases(
        activeCode,
        activeLangObj,
        activeQuestion.testCases || []
      );
      setTestResults((prev) => ({
        ...prev,
        [activeQuestion.id]: evalData,
      }));
      setConsoleTab('testcases');
    } catch (err) {
      console.error('Test run error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleRunCustomInput = async () => {
    if (!activeQuestion || activeQuestion.type !== 'coding') return;
    setIsRunningTests(true);
    setCustomOutput('');

    try {
      const evalData = await evaluateTestCases(activeCode, activeLangObj, [
        { id: 'custom', input: customInput, expectedOutput: '', isHidden: false },
      ]);
      const result = evalData.results?.[0];
      setCustomOutput(result?.actualOutput || result?.error || '(No output produced)');
    } catch (err) {
      setCustomOutput(`Error running code: ${err.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // ─── Hints & AI Mentor ────────────────────────────────────────────────────
  const handleRevealNextHint = () => {
    if (!activeQuestion) return;
    const currentHints = revealedHints[activeQuestion.id] || [];
    const allHints = activeQuestion.hints || [];
    if (currentHints.length < allHints.length) {
      const nextIdx = currentHints.length;
      setRevealedHints((prev) => ({
        ...prev,
        [activeQuestion.id]: [...currentHints, nextIdx],
      }));
    }
  };

  const handleSendMentorMessage = async () => {
    if (!mentorInput.trim() || isMentorThinking) return;
    const query = mentorInput.trim();
    setMentorInput('');
    setMentorMessages((prev) => [...prev, { role: 'user', text: query }]);
    setIsMentorThinking(true);

    try {
      const aiReply = await askExamAiAssistant({
        question: activeQuestion,
        code: activeCode,
        language: activeLangObj.label,
        userQuery: query,
        chatHistory: mentorMessages,
      });

      setMentorMessages((prev) => [...prev, { role: 'assistant', text: aiReply }]);
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

    const qEvaluations = [];
    let totalScore = 0;
    const totalPossible = examData.questions.length * 25;
    let questionsPassedCount = 0;
    let totalTestCasesPassed = 0;
    let totalTestCasesCount = 0;
    let mcqPassedCount = 0;
    let mcqTotalCount = 0;

    for (const q of examData.questions) {
      if (q.type === 'mcq') {
        mcqTotalCount++;
        const candidateChoice = answers[q.id] || '';
        const isCorrect = candidateChoice === q.correctAnswer;
        const qPoints = isCorrect ? 25 : 0;
        totalScore += qPoints;
        if (isCorrect) {
          questionsPassedCount++;
          mcqPassedCount++;
        }

        qEvaluations.push({
          questionId: q.id,
          type: 'mcq',
          title: q.title,
          candidateChoice,
          correctAnswer: q.correctAnswer,
          isCorrect,
          pointsAwarded: qPoints,
          maxPoints: 25,
          explanation: q.explanation || '',
        });
      } else {
        // Coding problem
        const code = answers[q.id] || '';
        const langKey = selectedLangs[q.id] || q.language || 'java';
        const langObj = SUPPORTED_LANGS.find((l) => l.key === langKey) || SUPPORTED_LANGS[3];

        let evalData = testResults[q.id];
        if (!evalData) {
          try {
            evalData = await evaluateTestCases(code, langObj, q.testCases || []);
          } catch {
            evalData = {
              success: false,
              allPassed: false,
              passedCount: 0,
              totalCount: q.testCases?.length || 0,
              results: [],
            };
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
          type: 'coding',
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
    }

    const percentage = Math.round((totalScore / Math.max(1, totalPossible)) * 100);
    const report = {
      examTitle: examData.title,
      candidateName: candidateName || 'Anonymous Candidate',
      unlockedWithCode: unlockedWithCode || examData.unlockCode || 'OPEN',
      submittedAt: new Date().toLocaleTimeString(),
      score: totalScore,
      maxScore: totalPossible,
      percentage,
      questionsPassed: questionsPassedCount,
      totalQuestions: examData.questions.length,
      testCasesPassed: totalTestCasesPassed,
      totalTestCases: totalTestCasesCount,
      mcqPassed: mcqPassedCount,
      mcqTotal: mcqTotalCount,
      tabSwitches: tabSwitchCount,
      violations: violationsList,
      timeTakenSecs: (selectedDuration > 0 ? selectedDuration * 60 - secondsRemaining : 0),
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

  // ─── Render: Candidate Unlock Gate View ───────────────────────────────────
  if (phase === 'unlock-gate') {
    const mcqCount = examData?.questions?.filter((q) => q.type === 'mcq').length || 0;
    const codingCount = examData?.questions?.filter((q) => q.type === 'coding' || !q.type).length || 0;

    return (
      <div className="exam-page">
        <div className="exam-topbar">
          <div className="exam-topbar-left">
            <div className="exam-brand">
              <Code2 size={22} color="var(--accent-cyan)" />
              <span>Full Code Proctored Examination</span>
            </div>
            <span className="exam-badge-tag">Candidate Entrance Gate</span>
          </div>
          <div className="exam-topbar-right">
            <button className="btn-exit-exam" onClick={() => setPhase('setup')} title="Switch to Creator Studio">
              <Wand2 size={14} />
              <span>Creator Studio</span>
            </button>
            <button className="btn-exit-exam" onClick={handleCleanExitToCompiler} title="Return to compiler">
              <LogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
        </div>

        <div className="exam-unlock-container">
          <div className="exam-unlock-card animate-slide-up">
            <div className="unlock-hero-icon">
              <Lock size={36} color="var(--accent-cyan)" />
            </div>

            <div className="unlock-header-text">
              <span className="unlock-kicker">Secured Candidate Portal</span>
              <h2>{examData?.title || 'Examination Test'}</h2>
              <p>
                This examination is monitored with anti-cheat proctoring. You will need your Candidate Name and
                the designated Test Unlock Code to begin.
              </p>
            </div>

            <div className="unlock-meta-bar">
              <div className="unlock-meta-item">
                <Clock size={16} color="var(--accent-cyan)" />
                <span>{examData?.durationMinutes || 45} Minutes</span>
              </div>
              <div className="unlock-meta-item">
                <Layers size={16} color="var(--accent-green)" />
                <span>
                  {examData?.questions?.length || 0} Questions ({mcqCount} MCQ • {codingCount} Coding)
                </span>
              </div>
              <div className="unlock-meta-item">
                <ShieldCheck size={16} color="var(--accent-purple)" />
                <span>
                  {strictnessLimit > 0 ? `${strictnessLimit} Tab switches limit` : 'Anti-cheat Active'}
                </span>
              </div>
            </div>

            <form onSubmit={handleUnlockExam} className="unlock-form">
              <div className="unlock-input-group">
                <label>
                  <User size={15} />
                  <span>Candidate Full Name / Username <strong style={{ color: 'var(--accent-red)' }}>*</strong></span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Himanshu Garg or roll number"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    setUnlockError('');
                  }}
                  autoFocus
                  required
                />
              </div>

              <div className="unlock-input-group">
                <div className="unlock-label-row">
                  <label>
                    <Key size={15} />
                    <span>Test Unlock Code <strong style={{ color: 'var(--accent-red)' }}>*</strong></span>
                  </label>
                  {examData?.unlockCode && (
                    <button
                      type="button"
                      className="btn-quick-fill-code"
                      onClick={() => setUnlockCodeInput(examData.unlockCode)}
                      title="Fill the test code"
                    >
                      Use Provided Code: {examData.unlockCode}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={examData?.unlockCode ? `Enter code (e.g. ${examData.unlockCode})` : 'Enter or generate test code'}
                  value={unlockCodeInput}
                  onChange={(e) => {
                    setUnlockCodeInput(e.target.value);
                    setUnlockError('');
                  }}
                  required
                />
                {!examData?.unlockCode && (
                  <button
                    type="button"
                    className="btn-generate-test-token"
                    onClick={() => setUnlockCodeInput(generateRandomTestCode())}
                  >
                    🎲 Generate Random Practice Code
                  </button>
                )}
              </div>

              {unlockError && (
                <div className="unlock-error-banner animate-fade-in">
                  <AlertTriangle size={16} />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="unlock-rules-box">
                <h6>⚠️ Proctored Examination Rules:</h6>
                <ul>
                  <li>Do not switch tabs, minimize the window, or launch external applications.</li>
                  <li>Certain code lines (imports & scaffolding) are locked by the examiner and cannot be modified.</li>
                  <li>Questions may include diagrams; click on any diagram to zoom in.</li>
                </ul>
              </div>

              <button type="submit" className="btn-unlock-start">
                <Unlock size={18} />
                <span>Unlock & Start Proctored Exam →</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Creator Studio & Setup View ──────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="exam-page">
        {/* Topbar */}
        <div className="exam-topbar">
          <div className="exam-topbar-left">
            <div className="exam-brand">
              <Code2 size={22} color="var(--accent-cyan)" />
              <span>Full Code Proctored Exam Studio</span>
            </div>
            <span className="exam-badge-tag">Exam Creator & Link Sharer</span>
          </div>
          <div className="exam-topbar-right">
            <button className="btn-exam-action-header primary" onClick={handleGenerateShareableLink}>
              <Share2 size={15} />
              <span>Shareable Exam Link</span>
            </button>
            <button className="btn-exam-action-header" onClick={handleTestAsCandidate}>
              <Play size={15} fill="currentColor" />
              <span>Take as Candidate</span>
            </button>
            <button className="btn-exit-exam" onClick={handleCleanExitToCompiler} title="Return to compiler">
              <LogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Setup Navigation Tabs */}
        <div className="exam-setup-subnav">
          <button
            className={`setup-nav-tab ${setupMode === 'creator' ? 'active' : ''}`}
            onClick={() => setSetupMode('creator')}
          >
            <Wand2 size={15} />
            <span>Exam Creator Studio ({creatorExam.questions?.length || 0} Questions)</span>
          </button>
          <button
            className={`setup-nav-tab ${setupMode === 'pdf' ? 'active' : ''}`}
            onClick={() => setSetupMode('pdf')}
          >
            <FileText size={15} />
            <span>AI PDF Question Paper Extractor</span>
          </button>
          <button
            className={`setup-nav-tab ${setupMode === 'library' ? 'active' : ''}`}
            onClick={() => setSetupMode('library')}
          >
            <Layers size={15} />
            <span>Exam Library & Presets</span>
          </button>
        </div>

        <div className="exam-setup-scroll-area">
          {/* 1. Exam Creator Studio */}
          {setupMode === 'creator' && (
            <div className="creator-studio-container">
              {/* Exam Metadata Card */}
              <div className="creator-meta-card">
                <div className="creator-meta-header">
                  <h3>Exam Configuration</h3>
                  <div className="creator-meta-actions">
                    <button
                      className="btn-meta-action"
                      onClick={() => setCreatorExam(getSampleFullExam())}
                      title="Load sample with modern Java 26, locked lines & MCQs"
                    >
                      ✨ Load Full Sample Exam
                    </button>
                    <button
                      className="btn-meta-action"
                      onClick={() => {
                        const saved = saveCreatedExam(creatorExam);
                        if (saved) {
                          setSavedExamsList(getSavedCreatedExams());
                          alert('Exam saved to local library!');
                        }
                      }}
                    >
                      💾 Save to Library
                    </button>
                  </div>
                </div>

                <div className="creator-fields-grid">
                  <div className="creator-field-item col-span-2">
                    <label>Exam Title</label>
                    <input
                      type="text"
                      value={creatorExam.title || ''}
                      onChange={(e) => handleUpdateCreatorField('title', e.target.value)}
                      placeholder="e.g. Java 26 & Algorithms Midterm Exam"
                    />
                  </div>

                  <div className="creator-field-item">
                    <label>Exam Duration (Minutes)</label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={creatorExam.durationMinutes ?? 45}
                      onChange={(e) =>
                        handleUpdateCreatorField('durationMinutes', parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </div>

                  <div className="creator-field-item">
                    <label>Anti-Cheat Tab Switch Limit</label>
                    <select
                      value={creatorExam.strictnessLimit ?? 3}
                      onChange={(e) =>
                        handleUpdateCreatorField('strictnessLimit', parseInt(e.target.value, 10))
                      }
                    >
                      <option value={3}>3 Tab Switches (Strict)</option>
                      <option value={5}>5 Tab Switches (Moderate)</option>
                      <option value={10}>10 Tab Switches (Relaxed)</option>
                      <option value={0}>Warning Only (No Auto-Submit)</option>
                    </select>
                  </div>

                  <div className="creator-field-item col-span-2">
                    <div className="label-with-addon">
                      <label>Test Unlock Code (Required for candidate to open exam)</label>
                      <button
                        type="button"
                        className="btn-addon-generate"
                        onClick={() => handleUpdateCreatorField('unlockCode', generateRandomTestCode())}
                      >
                        🎲 Generate Random Code
                      </button>
                    </div>
                    <input
                      type="text"
                      value={creatorExam.unlockCode || ''}
                      onChange={(e) => handleUpdateCreatorField('unlockCode', e.target.value.toUpperCase())}
                      placeholder="e.g. TEST-2026 or TEST-8X4P"
                    />
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="creator-questions-header">
                <h3>
                  Exam Questions ({creatorExam.questions?.length || 0})
                </h3>
                <div className="creator-add-buttons">
                  <button className="btn-add-q mcq" onClick={() => handleAddQuestion('mcq')}>
                    <Plus size={15} />
                    <span>Add MCQ Question</span>
                  </button>
                  <button className="btn-add-q coding" onClick={() => handleAddQuestion('coding')}>
                    <Plus size={15} />
                    <span>Add Coding Question</span>
                  </button>
                </div>
              </div>

              <div className="creator-questions-list">
                {creatorExam.questions?.map((q, idx) => (
                  <div key={q.id || idx} className="creator-q-card animate-slide-up">
                    <div className="creator-q-card-header">
                      <div className="q-card-title-group">
                        <span className={`q-type-badge ${q.type || 'coding'}`}>
                          {q.type === 'mcq' ? '🔘 MCQ' : '💻 CODING'}
                        </span>
                        <span className="q-index-pill">Q{idx + 1}</span>
                        <input
                          type="text"
                          className="q-title-inline-input"
                          value={q.title || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'title', e.target.value)}
                          placeholder="Question Title"
                        />
                      </div>

                      <div className="q-card-controls">
                        <button
                          className="btn-q-ctrl"
                          onClick={() => handleMoveQuestion(idx, -1)}
                          disabled={idx === 0}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="btn-q-ctrl"
                          onClick={() => handleMoveQuestion(idx, 1)}
                          disabled={idx === creatorExam.questions.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          className="btn-q-ctrl danger"
                          onClick={() => handleRemoveQuestion(idx)}
                          title="Delete Question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="creator-q-body">
                      {/* Description */}
                      <div className="creator-field-item">
                        <label>Question Description / Instructions</label>
                        <textarea
                          rows={3}
                          value={q.description || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'description', e.target.value)}
                          placeholder="Provide detailed instructions, edge cases, or problem statement..."
                        />
                      </div>

                      {/* Picture Import / Diagram section */}
                      <div className="creator-field-item">
                        <label>
                          <ImageIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          Question Diagram / Attached Image
                        </label>
                        <div className="image-uploader-row">
                          <label className="btn-upload-pic">
                            <UploadCloud size={14} />
                            <span>Upload Local Picture</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleImageUpload(idx, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>or Image URL:</span>
                          <input
                            type="text"
                            value={q.imageUrl || ''}
                            onChange={(e) => handleUpdateQuestion(idx, 'imageUrl', e.target.value)}
                            placeholder="https://... or uploaded image"
                            className="input-image-url"
                          />
                          {q.imageUrl && (
                            <button
                              type="button"
                              className="btn-remove-pic"
                              onClick={() => handleUpdateQuestion(idx, 'imageUrl', '')}
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>

                        {q.imageUrl && (
                          <div className="creator-image-preview">
                            <img src={q.imageUrl} alt="Attached diagram" />
                            <span className="preview-label">Live Preview (Candidates can click to zoom in test)</span>
                          </div>
                        )}
                      </div>

                      {/* MCQ Specific Fields */}
                      {q.type === 'mcq' && (
                        <div className="mcq-options-builder">
                          <label>Options & Correct Answer (Select the radio of correct option):</label>
                          <div className="mcq-options-grid-builder">
                            {(q.options || [
                              { id: 'A', text: '' },
                              { id: 'B', text: '' },
                              { id: 'C', text: '' },
                              { id: 'D', text: '' },
                            ]).map((opt, optIdx) => (
                              <div key={opt.id} className="mcq-option-builder-row">
                                <label className="mcq-radio-label">
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={q.correctAnswer === opt.id}
                                    onChange={() => handleUpdateQuestion(idx, 'correctAnswer', opt.id)}
                                  />
                                  <span className="opt-letter">{opt.id}</span>
                                </label>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const nextOpts = [...q.options];
                                    nextOpts[optIdx] = { ...nextOpts[optIdx], text: e.target.value };
                                    handleUpdateQuestion(idx, 'options', nextOpts);
                                  }}
                                  placeholder={`Option ${opt.id} text`}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="creator-field-item" style={{ marginTop: '0.75rem' }}>
                            <label>Answer Explanation (Displayed on results review)</label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleUpdateQuestion(idx, 'explanation', e.target.value)}
                              placeholder="Explanation for why this option is correct..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Coding Specific Fields */}
                      {(!q.type || q.type === 'coding') && (
                        <div className="coding-fields-builder">
                          <div className="coding-config-row">
                            <div className="creator-field-item">
                              <label>Programming Language</label>
                              <select
                                value={q.language || 'java'}
                                onChange={(e) => handleUpdateQuestion(idx, 'language', e.target.value)}
                              >
                                {SUPPORTED_LANGS.map((lang) => (
                                  <option key={lang.key} value={lang.key}>
                                    {lang.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Code Lock Range Config */}
                            <div className="creator-field-item lock-config-box">
                              <div className="lock-config-title">
                                <Lock size={14} color="var(--accent-red)" />
                                <strong>Lock Specific Lines (Prevent Modifying Imports/Classes)</strong>
                              </div>
                              <div className="lock-inputs-row">
                                <span>Lock from Line</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={q.lockedLines?.start ?? 1}
                                  onChange={(e) => {
                                    const start = parseInt(e.target.value, 10) || 1;
                                    const end = q.lockedLines?.end || 4;
                                    handleUpdateQuestion(idx, 'lockedLines', { start, end });
                                  }}
                                  className="input-line-num"
                                />
                                <span>to Line</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={q.lockedLines?.end ?? 4}
                                  onChange={(e) => {
                                    const end = parseInt(e.target.value, 10) || 1;
                                    const start = q.lockedLines?.start || 1;
                                    handleUpdateQuestion(idx, 'lockedLines', { start, end });
                                  }}
                                  className="input-line-num"
                                />
                                <button
                                  type="button"
                                  className="btn-toggle-lock"
                                  onClick={() => {
                                    if (q.lockedLines) {
                                      handleUpdateQuestion(idx, 'lockedLines', null);
                                    } else {
                                      handleUpdateQuestion(idx, 'lockedLines', { start: 1, end: 4 });
                                    }
                                  }}
                                >
                                  {q.lockedLines ? 'Remove Lock' : 'Enable Lock'}
                                </button>
                              </div>
                              <span className="lock-help-note">
                                When enabled, Monaco Editor physically forbids modifying, deleting, or pasting into lines{' '}
                                {q.lockedLines?.start || 1}–{q.lockedLines?.end || 4}.
                              </span>
                            </div>
                          </div>

                          {/* Starter Code Editor */}
                          <div className="creator-field-item">
                            <label>Starter Code Template</label>
                            <textarea
                              rows={8}
                              className="code-textarea font-mono"
                              value={
                                typeof q.starterCode === 'string'
                                  ? q.starterCode
                                  : q.starterCode?.[q.language || 'java'] || ''
                              }
                              onChange={(e) => handleUpdateQuestion(idx, 'starterCode', e.target.value)}
                              placeholder="Write starter code with imports or class declarations..."
                            />
                          </div>

                          {/* Test Cases */}
                          <div className="creator-field-item">
                            <div className="label-with-addon">
                              <label>Evaluation Test Cases ({q.testCases?.length || 0})</label>
                              <button
                                type="button"
                                className="btn-add-tc"
                                onClick={() => {
                                  const curTcs = q.testCases || [];
                                  const nextTc = {
                                    id: curTcs.length + 1,
                                    input: '',
                                    expectedOutput: '',
                                    isHidden: false,
                                  };
                                  handleUpdateQuestion(idx, 'testCases', [...curTcs, nextTc]);
                                }}
                              >
                                + Add Test Case
                              </button>
                            </div>
                            <div className="tc-builder-list">
                              {(q.testCases || []).map((tc, tcIdx) => (
                                <div key={tc.id || tcIdx} className="tc-builder-row">
                                  <span className="tc-builder-badge">TC #{tcIdx + 1}</span>
                                  <input
                                    type="text"
                                    placeholder="Standard Input (stdin)"
                                    value={tc.input || ''}
                                    onChange={(e) => {
                                      const next = [...q.testCases];
                                      next[tcIdx] = { ...next[tcIdx], input: e.target.value };
                                      handleUpdateQuestion(idx, 'testCases', next);
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Expected Output (stdout)"
                                    value={tc.expectedOutput || ''}
                                    onChange={(e) => {
                                      const next = [...q.testCases];
                                      next[tcIdx] = { ...next[tcIdx], expectedOutput: e.target.value };
                                      handleUpdateQuestion(idx, 'testCases', next);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn-del-tc"
                                    onClick={() => {
                                      const next = q.testCases.filter((_, i) => i !== tcIdx);
                                      handleUpdateQuestion(idx, 'testCases', next);
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="creator-bottom-bar">
                <button className="btn-exam-action-header primary" onClick={handleGenerateShareableLink}>
                  <Share2 size={16} />
                  <span>Generate Shareable Exam Link</span>
                </button>
                <button className="btn-exam-action-header" onClick={handleTestAsCandidate}>
                  <Play size={16} fill="currentColor" />
                  <span>Take as Candidate</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. PDF Upload Mode */}
          {setupMode === 'pdf' && (
            <div className="exam-setup-container">
              <div className="exam-setup-card">
                <div className="exam-setup-header">
                  <div className="exam-hero-icon">
                    <FileCheck2 size={30} />
                  </div>
                  <h1>Upload Question Paper (PDF)</h1>
                  <p>
                    The in-built AI will read your PDF, extract coding and theory questions, and immediately generate
                    test cases, progressive hints, and starter templates.
                  </p>
                </div>

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

                {isProcessingPdf && (
                  <div className="exam-processing-box animate-fade-in">
                    <div className="exam-spinner-large" />
                    <h4 style={{ color: 'var(--accent-cyan)' }}>{processingStatus}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Synthesizing sample test cases, hidden evaluation tests, and progressive hint trees...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Library & Samples Mode */}
          {setupMode === 'library' && (
            <div className="exam-library-container">
              <h3>Saved Exams in Browser</h3>
              {savedExamsList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  No custom exams saved yet. Create an exam in the Studio or load a sample below.
                </p>
              ) : (
                <div className="saved-exams-grid">
                  {savedExamsList.map((item) => (
                    <div key={item.id} className="saved-exam-card">
                      <div className="saved-exam-info">
                        <h4>{item.title}</h4>
                        <p>
                          {item.questions?.length || 0} Questions • Code: {item.unlockCode || 'None'} • {item.durationMinutes}m
                        </p>
                      </div>
                      <div className="saved-exam-actions">
                        <button
                          className="btn-use-saved"
                          onClick={() => {
                            setCreatorExam(item);
                            setExamData(item);
                            setSetupMode('creator');
                          }}
                        >
                          Open in Studio
                        </button>
                        <button
                          className="btn-del-saved"
                          onClick={() => {
                            deleteCreatedExam(item.id);
                            setSavedExamsList(getSavedCreatedExams());
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: '2rem' }}>Built-in Sample Question Papers</h3>
              <div className="exam-sample-grid">
                <div
                  className="exam-sample-card featured"
                  onClick={() => {
                    const sample = getSampleFullExam();
                    setCreatorExam(sample);
                    setExamData(sample);
                    setSetupMode('creator');
                  }}
                >
                  <div className="sample-badge">Recommended</div>
                  <h5>Modern Java 26 & MCQ Practical Examination</h5>
                  <p>Includes OpenJDK 26 instance main entry points, locked imports, MCQs with diagram slots, and test codes.</p>
                </div>
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

        {/* Share Link Modal */}
        {showShareModal && (
          <div className="exam-share-modal-backdrop" onClick={() => setShowShareModal(false)}>
            <div className="exam-share-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="share-modal-hero-icon">
                <Share2 size={28} color="var(--accent-cyan)" />
              </div>
              <h3>Shareable Exam Link Generated!</h3>
              <p>
                This single link contains your entire proctored exam (MCQs, coding challenges, locked lines, and
                diagrams). Send it to candidates along with the unlock test code.
              </p>

              <div className="share-link-box">
                <label>Direct Exam URL:</label>
                <div className="copy-input-row">
                  <input type="text" readOnly value={shareUrlGenerated} />
                  <button
                    className="btn-copy-link"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrlGenerated);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {creatorExam.unlockCode && (
                <div className="share-code-highlight-box">
                  <div className="code-highlight-text">
                    <span className="code-lbl">Candidate Test Unlock Code:</span>
                    <strong className="code-val">{creatorExam.unlockCode}</strong>
                  </div>
                  <button
                    className="btn-copy-code"
                    onClick={() => {
                      navigator.clipboard.writeText(creatorExam.unlockCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
              )}

              <div className="share-modal-actions">
                <button
                  className="btn-open-preview"
                  onClick={() => {
                    setShowShareModal(false);
                    handleTestAsCandidate();
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Preview as Candidate</span>
                </button>
                <button className="btn-close-modal" onClick={() => setShowShareModal(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
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
              <span className="score-pct">
                {submissionReport.score} / {submissionReport.maxScore} Pts
              </span>
            </div>

            <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Examination Completed!</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Candidate: <strong style={{ color: '#fff' }}>{submissionReport.candidateName}</strong> • Test Code: <span style={{ color: 'var(--accent-yellow)' }}>{submissionReport.unlockedWithCode}</span> • Submitted at {submissionReport.submittedAt}
            </p>

            <div className="exam-stat-grid">
              <div className="exam-stat-box">
                <div className="stat-box-val" style={{ color: 'var(--accent-green)' }}>
                  {submissionReport.questionsPassed} / {submissionReport.totalQuestions}
                </div>
                <div className="stat-box-lbl">Questions Passed</div>
              </div>
              {submissionReport.mcqTotal > 0 && (
                <div className="exam-stat-box">
                  <div className="stat-box-val" style={{ color: 'var(--accent-cyan)' }}>
                    {submissionReport.mcqPassed} / {submissionReport.mcqTotal}
                  </div>
                  <div className="stat-box-lbl">MCQs Correct</div>
                </div>
              )}
              {submissionReport.totalTestCases > 0 && (
                <div className="exam-stat-box">
                  <div className="stat-box-val" style={{ color: 'var(--accent-cyan)' }}>
                    {submissionReport.testCasesPassed} / {submissionReport.totalTestCases}
                  </div>
                  <div className="stat-box-lbl">Coding Tests Passed</div>
                </div>
              )}
              <div className="exam-stat-box">
                <div
                  className="stat-box-val"
                  style={{ color: isIntegrityGood ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  {submissionReport.tabSwitches}
                </div>
                <div className="stat-box-lbl">Tab Violations</div>
              </div>
            </div>

            {/* Question Breakdown */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>Question-by-Question Review</h4>
              {submissionReport.qEvaluations.map((q, idx) => (
                <div key={q.questionId} className="parsed-question-pill result-pill">
                  <div className="parsed-question-info">
                    <span className="question-chip">Q{idx + 1}</span>
                    <span className={`q-type-mini ${q.type}`}>{q.type === 'mcq' ? 'MCQ' : 'CODE'}</span>
                    <strong style={{ fontSize: '0.9rem' }}>{q.title}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                    {q.type === 'mcq' ? (
                      <span style={{ color: q.isCorrect ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        Selected: {q.candidateChoice || 'None'} {q.isCorrect ? '✓ Correct' : `✗ (Correct: ${q.correctAnswer})`}
                      </span>
                    ) : (
                      <span style={{ color: q.allPassed ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                        {q.passedCount} / {q.totalCount} Tests Passed
                      </span>
                    )}
                    <strong style={{ color: q.pointsAwarded > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {q.pointsAwarded} / {q.maxPoints} pts
                    </strong>
                  </div>
                  {q.type === 'mcq' && q.explanation && (
                    <div className="result-explanation">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="results-action-row">
              <button className="btn-return-compiler" onClick={handleCleanExitToCompiler}>
                Return to Full Code Compiler
              </button>
              <button className="btn-new-exam" onClick={() => setPhase('setup')}>
                Open Exam Creator Studio
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
            Q{currentQIndex + 1} of {examData?.questions?.length} ({activeQuestion?.type === 'mcq' ? 'MCQ' : 'Coding'})
          </span>
          {candidateName && (
            <span className="candidate-name-badge">
              <User size={13} />
              <span>{candidateName}</span>
            </span>
          )}
          {unlockedWithCode && (
            <span className="candidate-code-badge">
              <Key size={13} />
              <span>{unlockedWithCode}</span>
            </span>
          )}
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

      {/* Floating Warnings */}
      {blockedShortcutToast && (
        <div className="anti-cheat-toast animate-slide-down">
          <AlertTriangle size={15} />
          <span>{blockedShortcutToast}</span>
        </div>
      )}

      {lockWarningToast && (
        <div className="anti-cheat-toast lock-toast animate-slide-down">
          <Lock size={15} />
          <span>{lockWarningToast}</span>
        </div>
      )}

      {/* Workspace Split */}
      <div className="exam-workspace">
        {/* If Active Question is MCQ */}
        {activeQuestion?.type === 'mcq' ? (
          <div className="exam-mcq-workspace animate-fade-in">
            {/* Question Navigator */}
            <div className="question-nav-strip">
              {examData?.questions?.map((q, idx) => {
                const isAttempted = Boolean(answers[q.id]);
                return (
                  <button
                    key={q.id}
                    className={`q-nav-tab ${idx === currentQIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentQIndex(idx);
                      setSelectedTestCaseIdx(0);
                    }}
                  >
                    <span className={`q-status-dot ${isAttempted ? 'attempted' : ''}`} />
                    <span className="q-nav-type-tag">{q.type === 'mcq' ? 'MCQ' : 'CODE'}</span>
                    <span>Q{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            <div className="mcq-question-container">
              <div className="mcq-card">
                <div className="mcq-card-header">
                  <div className="mcq-qnum-tag">Question {currentQIndex + 1} of {examData.questions.length}</div>
                  <h2>{activeQuestion.title}</h2>
                  <p className="mcq-description">{activeQuestion.description}</p>
                </div>

                {/* Attached Diagram / Image if present */}
                {activeQuestion.imageUrl && (
                  <div
                    className="exam-question-image-box"
                    onClick={() => setZoomedImage(activeQuestion.imageUrl)}
                    title="Click to zoom in"
                  >
                    <img src={activeQuestion.imageUrl} alt="Question diagram" className="exam-question-img" />
                    <div className="image-zoom-overlay">
                      <ZoomIn size={16} />
                      <span>Click to enlarge diagram</span>
                    </div>
                  </div>
                )}

                {/* MCQ Options Cards */}
                <div className="mcq-options-container">
                  {activeQuestion.options?.map((opt) => {
                    const isSelected = answers[activeQuestion.id] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`mcq-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectMcqOption(activeQuestion.id, opt.id)}
                      >
                        <div className="mcq-option-indicator">
                          <span className="opt-letter">{opt.id}</span>
                        </div>
                        <div className="mcq-option-text">{opt.text}</div>
                        {isSelected && (
                          <div className="mcq-option-checked">
                            <Check size={18} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mcq-card-footer">
                  <button
                    className="btn-mcq-nav"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  >
                    ← Previous Question
                  </button>
                  <div className="mcq-selected-indicator">
                    {answers[activeQuestion.id] ? (
                      <span className="answered-text">
                        <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Recorded Choice: Option {answers[activeQuestion.id]}
                      </span>
                    ) : (
                      <span className="unanswered-text">Not answered yet</span>
                    )}
                  </div>
                  <button
                    className="btn-mcq-nav primary"
                    disabled={currentQIndex === examData.questions.length - 1}
                    onClick={() =>
                      setCurrentQIndex((prev) => Math.min(examData.questions.length - 1, prev + 1))
                    }
                  >
                    Next Question →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Question is Coding */
          <>
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
                      <span className="q-nav-type-tag">{q.type === 'mcq' ? 'MCQ' : 'CODE'}</span>
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
                    <span className="points-tag">{activeQuestion.points || 25} Points</span>
                    {activeQuestion.language && (
                      <span className="lang-tag">{activeQuestion.language.toUpperCase()}</span>
                    )}
                  </div>

                  {/* Locked Lines Alert Banner */}
                  {currentLockedRange && (
                    <div className="locked-lines-notice-banner">
                      <Lock size={15} color="var(--accent-red)" />
                      <div>
                        <strong>Lines {currentLockedRange.startLine}–{currentLockedRange.endLine} are Locked</strong>
                        <p>The examiner has protected the package/imports and harness. You cannot modify them.</p>
                      </div>
                    </div>
                  )}

                  {/* Diagram / Image if present */}
                  {activeQuestion.imageUrl && (
                    <div
                      className="exam-question-image-box"
                      onClick={() => setZoomedImage(activeQuestion.imageUrl)}
                      title="Click to zoom in"
                    >
                      <img src={activeQuestion.imageUrl} alt="Question diagram" className="exam-question-img" />
                      <div className="image-zoom-overlay">
                        <ZoomIn size={16} />
                        <span>Click to enlarge diagram</span>
                      </div>
                    </div>
                  )}

                  {activeQuestion.description && (
                    <div className="exam-desc-block">{activeQuestion.description}</div>
                  )}

                  {/* Sample Test Cases Preview */}
                  {activeQuestion.testCases && activeQuestion.testCases.length > 0 && (
                    <div className="exam-examples-section">
                      <h5>Sample Test Cases</h5>
                      {activeQuestion.testCases.slice(0, 2).map((tc, idx) => (
                        <div key={tc.id || idx} className="exam-example-card">
                          <div className="exam-example-label">Case {idx + 1}:</div>
                          <div className="exam-example-io">
                            <div className="exam-io-row">
                              <span className="exam-io-key">Input:</span>
                              <pre className="exam-io-value">{tc.input || '(empty)'}</pre>
                            </div>
                            <div className="exam-io-row">
                              <span className="exam-io-key">Expected:</span>
                              <pre className="exam-io-value">{tc.expectedOutput}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Left Subtab Content: Hints */}
              {leftSubTab === 'hints' && activeQuestion && (
                <div className="exam-hints-body">
                  <h4>Progressive Hints</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Reveal hints sequentially if you are stuck.
                  </p>
                  {(activeQuestion.hints || []).map((hint, idx) => {
                    const isRevealed = (revealedHints[activeQuestion.id] || []).includes(idx);
                    return (
                      <div key={idx} className={`hint-card ${isRevealed ? 'revealed' : 'locked'}`}>
                        <div className="hint-card-header">
                          <span className="hint-num">Hint #{idx + 1}</span>
                          {isRevealed ? (
                            <span className="hint-badge revealed">Revealed</span>
                          ) : (
                            <span className="hint-badge locked">Locked</span>
                          )}
                        </div>
                        {isRevealed ? (
                          <div className="hint-text">{hint}</div>
                        ) : (
                          <div className="hint-locked-placeholder">
                            <p>This hint is hidden to preserve exam score.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(revealedHints[activeQuestion.id] || []).length < (activeQuestion.hints || []).length && (
                    <button className="btn-reveal-hint" onClick={handleRevealNextHint}>
                      <Unlock size={14} />
                      <span>Unlock Next Hint</span>
                    </button>
                  )}
                </div>
              )}

              {/* Left Subtab Content: AI Mentor */}
              {leftSubTab === 'ai-mentor' && (
                <div className="exam-mentor-body">
                  <div className="mentor-messages-scroll">
                    {mentorMessages.map((msg, i) => (
                      <div key={i} className={`mentor-msg ${msg.role}`}>
                        <div className="mentor-msg-header">
                          {msg.role === 'assistant' ? (
                            <>
                              <Sparkles size={12} color="var(--accent-cyan)" />
                              <span>AI Mentor</span>
                            </>
                          ) : (
                            <>
                              <User size={12} />
                              <span>Candidate</span>
                            </>
                          )}
                        </div>
                        <div className="mentor-msg-text">{msg.text}</div>
                      </div>
                    ))}
                    {isMentorThinking && (
                      <div className="mentor-msg assistant">
                        <div className="mentor-thinking-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mentor-input-row">
                    <input
                      type="text"
                      placeholder="Ask the mentor a question..."
                      value={mentorInput}
                      onChange={(e) => setMentorInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMentorMessage()}
                    />
                    <button
                      className="btn-mentor-send"
                      onClick={handleSendMentorMessage}
                      disabled={isMentorThinking || !mentorInput.trim()}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Editor & Console Pane */}
            <div className="exam-right-panel">
              {/* Top Editor Bar */}
              <div className="exam-editor-topbar">
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

                  {currentLockedRange && (
                    <span className="editor-lock-indicator-badge">
                      <Lock size={12} />
                      <span>Lines {currentLockedRange.startLine}–{currentLockedRange.endLine} Locked</span>
                    </span>
                  )}
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
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: 15,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    glyphMargin: true,
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
                              key={tc.id || idx}
                              className={`tc-chip ${selectedTestCaseIdx === idx ? 'active' : ''} ${
                                hasRun ? (isPassed ? 'passed' : 'failed') : ''
                              }`}
                              onClick={() => setSelectedTestCaseIdx(idx)}
                            >
                              <span>Case {idx + 1}</span>
                              {hasRun && (
                                <span className="tc-chip-icon">
                                  {isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {selectedTestCase && (
                        <div className="tc-detail-box">
                          <div className="tc-detail-field">
                            <span className="tc-field-lbl">Input:</span>
                            <pre className="tc-field-val">{selectedTestCase.input || '(empty)'}</pre>
                          </div>
                          <div className="tc-detail-field">
                            <span className="tc-field-lbl">Expected Output:</span>
                            <pre className="tc-field-val">{selectedTestCase.expectedOutput}</pre>
                          </div>
                          {curTcResult && (
                            <div className="tc-detail-field">
                              <span className="tc-field-lbl">Actual Output:</span>
                              <pre
                                className={`tc-field-val ${
                                  curTcResult.passed ? 'output-passed' : 'output-failed'
                                }`}
                              >
                                {curTcResult.actualOutput || curTcResult.error || '(no output)'}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {consoleTab === 'custom' && (
                    <div className="tc-custom-box">
                      <div className="tc-custom-input-col">
                        <label>Custom Standard Input:</label>
                        <textarea
                          rows={3}
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="Type input here..."
                        />
                      </div>
                      <div className="tc-custom-output-col">
                        <label>Custom Output:</label>
                        <pre className="custom-output-pre">{customOutput || '(Run code to see custom output)'}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox Image Zoom Modal */}
      {zoomedImage && (
        <div className="image-zoom-lightbox" onClick={() => setZoomedImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-lightbox-close" onClick={() => setZoomedImage(null)}>
              ✕ Close
            </button>
            <img src={zoomedImage} alt="Enlarged diagram" className="lightbox-img" />
          </div>
        </div>
      )}

      {/* Anti-cheat tab switch modal */}
      {showTabAlertModal && (
        <div className="exam-modal-backdrop">
          <div className="exam-modal-box warning animate-slide-up">
            <div className="modal-icon-header">
              <ShieldAlert size={36} color="var(--accent-red)" />
            </div>
            <h3>Proctoring Violation Detected</h3>
            <p>
              You switched tabs or minimized the examination window ({tabSwitchCount} / {strictnessLimit || '∞'} warnings).
            </p>
            {strictnessLimit > 0 && tabSwitchCount >= strictnessLimit ? (
              <div className="auto-submit-warning">
                <strong>Maximum allowed tab switches reached!</strong>
                <p>Your examination is being automatically finalized and submitted.</p>
              </div>
            ) : (
              <button className="btn-modal-ack" onClick={() => setShowTabAlertModal(false)}>
                I Understand, Return to Test
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm Exit Modal */}
      {showExitConfirm && (
        <div className="exam-modal-backdrop">
          <div className="exam-modal-box animate-slide-up">
            <h3>Exit Proctored Examination?</h3>
            <p>
              Exiting will cancel your active proctored session and return you to the standard code editor.
            </p>
            <div className="modal-btn-row">
              <button className="btn-modal-cancel" onClick={() => setShowExitConfirm(false)}>
                Stay in Exam
              </button>
              <button className="btn-modal-danger" onClick={handleCleanExitToCompiler}>
                Yes, Exit Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showSubmitConfirm && (
        <div className="exam-modal-backdrop">
          <div className="exam-modal-box animate-slide-up">
            <h3>Submit Examination?</h3>
            <p>
              Are you sure you want to finish? Your code and MCQ choices will be evaluated against all test cases.
            </p>
            <div className="modal-btn-row">
              <button className="btn-modal-cancel" onClick={() => setShowSubmitConfirm(false)}>
                Keep Working
              </button>
              <button className="btn-modal-primary" onClick={handleFinalSubmitTest}>
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
