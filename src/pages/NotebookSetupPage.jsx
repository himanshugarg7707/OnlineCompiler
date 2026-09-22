import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  PRESET_SUBJECTS,
  getSavedNotebooks,
  launchSubjectWorkspace,
  deleteNotebookMeta,
} from '../services/notebooksService';
import { getSavedWorkspaces } from '../services/workspaceService';
import {
  BookOpen,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FolderKanban,
  FileCode,
  Tag,
  Trash2,
  ExternalLink,
  Layers,
  GraduationCap,
  Terminal,
  Code2,
  X,
  Compass,
  ArrowLeft,
} from 'lucide-react';
import LanguageIcon from '../components/LanguageIcon';
import './NotebookSetupPage.css';

const EMOJI_LIST = ['📚', '☕', '🐍', '⚡', '🌐', '🗄️', '🧮', '🦀', '💻', '🧠', '🔬', '⚙️', '🚀', '🎯'];

const LANGUAGE_OPTIONS = [
  { id: 62, name: 'Java', monaco: 'java', ext: 'java', sample: '// Java Class Starter\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Subject Workspace!");\n    }\n}' },
  { id: 71, name: 'Python 3', monaco: 'python', ext: 'py', sample: '# Python Script Starter\ndef main():\n    print("Hello Subject Workspace!")\n\nif __name__ == "__main__":\n    main()' },
  { id: 54, name: 'C++', monaco: 'cpp', ext: 'cpp', sample: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello Subject Workspace!" << endl;\n    return 0;\n}' },
  { id: 50, name: 'C', monaco: 'c', ext: 'c', sample: '#include <stdio.h>\n\nint main() {\n    printf("Hello Subject Workspace!\\n");\n    return 0;\n}' },
  { id: 63, name: 'JavaScript', monaco: 'javascript', ext: 'js', sample: '// JavaScript Workspace Starter\nconsole.log("Hello Subject Workspace!");' },
  { id: 82, name: 'SQL', monaco: 'sql', ext: 'sql', sample: '-- SQL Table Schema & Queries\nCREATE TABLE courses (id INT, name TEXT);\nINSERT INTO courses VALUES (1, \'Core CS\');\nSELECT * FROM courses;' },
  { id: 73, name: 'Rust', monaco: 'rust', ext: 'rs', sample: 'fn main() {\n    println!("Hello Subject Workspace!");\n}' },
  { id: 60, name: 'Go', monaco: 'go', ext: 'go', sample: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello Subject Workspace!")\n}' },
];

export default function NotebookSetupPage() {
  const { state, dispatch, handleLoadWorkspaceState, showToast } = useApp();
  const { activeUser } = state;

  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'saved'
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customIcon, setCustomIcon] = useState('📚');
  const [customLangIndex, setCustomLangIndex] = useState(0);
  const [customDescription, setCustomDescription] = useState('');

  const [savedNotebooks, setSavedNotebooks] = useState(() => getSavedNotebooks());

  const refreshSaved = () => {
    setSavedNotebooks(getSavedNotebooks());
  };

  const handleLaunchPreset = (subject) => {
    const ws = launchSubjectWorkspace(subject);
    if (handleLoadWorkspaceState) {
      handleLoadWorkspaceState(ws);
    }
    showToast(`Loaded ${subject.name} Workspace! 🚀`);
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  const handleOpenSaved = (nb) => {
    const allWorkspaces = getSavedWorkspaces();
    const targetWs = allWorkspaces.find((w) => w.id === nb.workspaceId || w.name.toLowerCase() === nb.name.toLowerCase());
    if (targetWs) {
      if (handleLoadWorkspaceState) {
        handleLoadWorkspaceState(targetWs);
      }
      showToast(`Opened ${nb.name} Notebook 📖`);
      dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
    } else {
      // If workspace was deleted from raw storage, re-launch preset if applicable
      const preset = PRESET_SUBJECTS.find((p) => p.id === nb.id);
      if (preset) {
        handleLaunchPreset(preset);
      } else {
        showToast('Workspace data not found, creating fresh session...');
        dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
      }
    }
  };

  const handleDeleteSaved = (e, id) => {
    e.stopPropagation();
    const updated = deleteNotebookMeta(id);
    setSavedNotebooks(updated);
    showToast('Notebook removed from quick list');
  };

  const handleCreateCustomSubject = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      showToast('Please enter a subject name');
      return;
    }

    const selectedLang = LANGUAGE_OPTIONS[customLangIndex];
    const customSubject = {
      id: `custom_${Date.now()}`,
      name: customTitle.trim(),
      shortCode: customCode.trim() || 'SUB',
      icon: customIcon,
      badgeColor: '#00d4ff',
      languageName: selectedLang.name,
      files: [
        {
          name: `Main.${selectedLang.ext}`,
          language: {
            id: selectedLang.id,
            name: selectedLang.name,
            monacoLanguage: selectedLang.monaco,
            extension: selectedLang.ext,
          },
          content: selectedLang.sample,
        },
        {
          name: 'Notes.md',
          language: { id: 99, name: 'Markdown', monacoLanguage: 'markdown', extension: 'md' },
          content: `# ${customIcon} ${customTitle.trim()} — Subject Notebook\n\n**Course Code**: ${customCode || 'N/A'}\n**Semester / Term**: ${customDescription || 'Current Term'}\n\n## 📌 Syllabus & Learning Goals\n- [ ] Week 1: Introduction & Fundamentals\n- [ ] Week 2: Core Concepts & Practice Problems\n- [ ] Week 3: Assignment & Lab Work\n- [ ] Week 4: Review & Exam Preparation\n\n---\n\n## 📝 Formulas, Definitions & Notes\n- Document key lecture points, interview questions, and code snippets here.\n`,
        },
      ],
    };

    const ws = launchSubjectWorkspace(customSubject, customTitle.trim());
    refreshSaved();
    setShowCustomModal(false);
    setCustomTitle('');
    setCustomCode('');
    setCustomDescription('');

    if (handleLoadWorkspaceState) {
      handleLoadWorkspaceState(ws);
    }
    showToast(`Created & opened "${customTitle.trim()}" workspace! ✨`);
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  const handleSkipToEditor = () => {
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkipToEditor();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="notebook-setup-page">
      {/* Background ambient lighting */}
      <div className="setup-ambient-glow" />

      {/* Top Navigation matching main IDE Header */}
      <header className="setup-navbar">
        <div className="setup-nav-left">
          <div className="setup-brand-link" onClick={handleSkipToEditor} title="Return to Editor">
            <div className="setup-brand-icon">
              <Terminal size={18} />
            </div>
            <span className="setup-brand-title">Full Code</span>
            <div className="setup-brand-pill">
              <span className="setup-brand-dot"></span>
              <span className="setup-brand-tag">Subject Notebooks</span>
            </div>
          </div>
        </div>

        <div className="setup-nav-right">
          {activeUser && (
            <div className="setup-user-pill">
              <div
                className="setup-user-avatar"
                style={{ background: activeUser.avatarColor || 'var(--accent-cyan)' }}
              >
                {activeUser.avatarInitials}
              </div>
              <span className="setup-user-name">{activeUser.username}</span>
              <span className="setup-user-status">Online</span>
            </div>
          )}

          <button
            type="button"
            className="btn-back-editor"
            onClick={handleSkipToEditor}
            title="Return directly to the code editor (Esc)"
          >
            <ArrowLeft size={15} />
            <span className="btn-skip-full">Back to Editor</span>
            <span className="btn-skip-short">Editor</span>
            <kbd className="esc-key-badge">Esc</kbd>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="setup-container animate-fade-in">
        {/* Hero Section */}
        <section className="setup-hero">
          <div className="hero-pill-badge">
            <BookOpen size={14} />
            <span>Curated Academic & Course Workspaces</span>
          </div>
          <h1 className="hero-title">
            Subject <span className="text-gradient">Notebooks Hub</span>
          </h1>
          <p className="hero-subtitle">
            Configure isolated course workspaces with syllabus notes, lecture labs, starter code, and interactive cheat-sheets. Everything stays organized per subject.
          </p>
        </section>

        {/* Tab & Action Bar */}
        <div className="setup-actions-bar">
          <div className="setup-segmented-tabs">
            <button
              type="button"
              className={`setup-segmented-tab ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Compass size={15} />
              <span className="tab-label-full">Curated Presets</span>
              <span className="tab-label-short">Presets</span>
              <span className="tab-counter-badge">{PRESET_SUBJECTS.length}</span>
            </button>

            <button
              type="button"
              className={`setup-segmented-tab ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => {
                refreshSaved();
                setActiveTab('saved');
              }}
            >
              <FolderKanban size={15} />
              <span className="tab-label-full">My Active Notebooks</span>
              <span className="tab-label-short">Active</span>
              <span className="tab-counter-badge">{savedNotebooks.length}</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-primary-create"
            onClick={() => setShowCustomModal(true)}
          >
            <Plus size={15} />
            <span>Create Custom Subject</span>
          </button>
        </div>

        {/* TAB 1: CURATED SUBJECT PRESETS */}
        {activeTab === 'presets' && (
          <div className="subjects-grid">
            {PRESET_SUBJECTS.map((subject) => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => handleLaunchPreset(subject)}
              >
                <div className="subject-card-top">
                  <div className="subject-icon-box" style={{ borderColor: subject.badgeColor }}>
                    {subject.languageId ? (
                      <LanguageIcon language={{ id: subject.languageId, name: subject.languageName }} size={24} />
                    ) : (
                      <span className="subject-emoji">{subject.icon}</span>
                    )}
                  </div>
                  <div className="subject-code-badge">{subject.shortCode}</div>
                </div>

                <h3 className="subject-name">{subject.name}</h3>
                <p className="subject-desc">{subject.description}</p>

                {/* Included Files */}
                <div className="subject-files-row">
                  <span className="subject-files-label">Starter Files:</span>
                  <div className="subject-files-pills">
                    {subject.files.map((f) => (
                      <span key={f.name} className="subject-file-tag">
                        <LanguageIcon language={f.language} filename={f.name} size={12} />
                        <span>{f.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="subject-tags-row">
                  {subject.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="subject-tag">
                      {tag}
                    </span>
                  ))}
                  {subject.tags.length > 3 && (
                    <span className="subject-tag more">+{subject.tags.length - 3}</span>
                  )}
                </div>

                <div className="subject-card-footer">
                  <span className="subject-lang-badge">
                    <LanguageIcon language={{ id: subject.languageId, name: subject.languageName }} size={13} />
                    <span>{subject.languageName}</span>
                  </span>
                  <button type="button" className="btn-launch-subject">
                    <span className="btn-launch-full">Open Workspace</span>
                    <span className="btn-launch-short">Open</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: MY ACTIVE NOTEBOOKS */}
        {activeTab === 'saved' && (
          <div className="saved-notebooks-section">
            {savedNotebooks.length === 0 ? (
              <div className="empty-notebooks-card">
                <BookOpen size={42} className="empty-icon" />
                <h3>No active notebooks yet</h3>
                <p>
                  Pick one of the curated subject presets above or create a custom course notebook to
                  get started.
                </p>
                <button
                  type="button"
                  className="btn-create-subject"
                  onClick={() => setActiveTab('presets')}
                >
                  <Compass size={15} />
                  <span>Browse Curated Subjects</span>
                </button>
              </div>
            ) : (
              <div className="saved-notebooks-grid">
                {savedNotebooks.map((nb) => (
                  <div
                    key={nb.id}
                    className="saved-notebook-card"
                    onClick={() => handleOpenSaved(nb)}
                  >
                    <div className="saved-card-header">
                      <div className="saved-icon-wrap">
                        <span className="saved-emoji">{nb.icon || '📚'}</span>
                      </div>
                      <div className="saved-meta-group">
                        <span className="saved-code-tag">{nb.shortCode || 'SUB'}</span>
                        <span className="saved-files-count">{nb.filesCount || 2} files</span>
                      </div>
                      <button
                        type="button"
                        className="btn-delete-saved-nb"
                        onClick={(e) => handleDeleteSaved(e, nb.id)}
                        title="Delete this notebook"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h3 className="saved-title">{nb.name}</h3>
                    <span className="saved-lang-label">
                      Language: <strong>{nb.languageName || 'Code'}</strong>
                    </span>

                    <div className="saved-card-footer">
                      <span className="saved-date">
                        Last opened: {new Date(nb.updatedAt || Date.now()).toLocaleDateString()}
                      </span>
                      <button type="button" className="btn-open-workspace-pill">
                        <span>Open</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE CUSTOM SUBJECT MODAL */}
      {showCustomModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowCustomModal(false)}
        >
          <div className="custom-subject-modal modal-content animate-slide-up">
            <div className="custom-modal-header">
              <div className="custom-title-group">
                <div className="custom-icon-badge">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3>Create Subject Notebook</h3>
                  <span className="custom-subtitle">
                    Full isolated workspace with syllabus notes and starter templates
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowCustomModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomSubject} className="custom-modal-form">
              {/* Icon Picker */}
              <div className="form-group">
                <label className="form-label">Subject Icon / Emoji</label>
                <div className="emoji-picker-row">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-btn ${customIcon === emoji ? 'active' : ''}`}
                      onClick={() => setCustomIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Code */}
              <div className="form-row-two">
                <div className="form-group flex-2">
                  <label className="form-label">Subject Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Operating Systems, Computer Networks, Linear Algebra"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    required
                    autoFocus
                    className="custom-input"
                  />
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Course Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CS301"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="custom-input"
                  />
                </div>
              </div>

              {/* Language Selector */}
              <div className="form-group">
                <label className="form-label">Primary Programming Language</label>
                <div className="lang-options-grid">
                  {LANGUAGE_OPTIONS.map((lang, idx) => (
                    <button
                      key={lang.name}
                      type="button"
                      className={`lang-option-pill ${customLangIndex === idx ? 'active' : ''}`}
                      onClick={() => setCustomLangIndex(idx)}
                    >
                      <span className="lang-name">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description / Semester */}
              <div className="form-group">
                <label className="form-label">Semester / Term Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Semester 3 • Section B • Final Project Work"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="custom-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="custom-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCustomModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit-subject">
                  <Sparkles size={15} />
                  <span>Launch Subject Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
