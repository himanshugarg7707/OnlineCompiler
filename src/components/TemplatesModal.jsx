import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TEMPLATE_CATEGORIES, CODE_TEMPLATES } from '../services/codeTemplates';
import {
  X,
  Search,
  LayoutTemplate,
  Copy,
  Check,
  FilePlus,
  Code2,
  Sparkles,
  Clock,
  Database,
  ChevronRight,
  Zap,
} from 'lucide-react';
import './TemplatesModal.css';

export default function TemplatesModal({ isOpen, onClose }) {
  const { state, dispatch, handleAddFile, handleCodeChange, showToast } = useApp();
  const { detectedLanguage, code } = state;

  // Language selection for templates: java | python | cpp
  const initialLang = useMemo(() => {
    const langKey = String(
      detectedLanguage?.monacoLanguage || detectedLanguage?.name || detectedLanguage?.id || ''
    ).toLowerCase();
    if (langKey.includes('python') || langKey === 'py') return 'python';
    if (langKey.includes('cpp') || langKey.includes('c++') || langKey === 'c') return 'cpp';
    return 'java';
  }, [detectedLanguage]);

  const [selectedLang, setSelectedLang] = useState(initialLang);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState(() => CODE_TEMPLATES[0]?.id || 'two-pointer');
  const [copied, setCopied] = useState(false);

  // Sync initial language if modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLang(initialLang);
    }
  }, [isOpen, initialLang]);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let list = CODE_TEMPLATES;

    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      list = list.filter((t) => t.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.timeComplexity.toLowerCase().includes(q) ||
          t.spaceComplexity.toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  // Keep active template valid when filter changes
  useEffect(() => {
    if (filteredTemplates.length > 0) {
      const exists = filteredTemplates.some((t) => t.id === activeTemplateId);
      if (!exists) {
        setActiveTemplateId(filteredTemplates[0].id);
      }
    }
  }, [filteredTemplates, activeTemplateId]);

  // Current active template object
  const activeTemplate = useMemo(() => {
    return CODE_TEMPLATES.find((t) => t.id === activeTemplateId) || filteredTemplates[0] || null;
  }, [activeTemplateId, filteredTemplates]);

  // Active code for selected language
  const templateCode = useMemo(() => {
    if (!activeTemplate) return '';
    return activeTemplate.languages[selectedLang] || activeTemplate.languages.java || '';
  }, [activeTemplate, selectedLang]);

  if (!isOpen) return null;

  // Determine file name based on template and language
  const getSuggestedFilename = (template, lang) => {
    if (lang === 'java') {
      const classMatch = template.languages.java?.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      if (classMatch && classMatch[1]) {
        return `${classMatch[1]}.java`;
      }
      const pascal = template.title.replace(/[^a-zA-Z0-9]/g, '');
      return `${pascal || 'Solution'}.java`;
    }
    const slug = template.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (lang === 'python') return `${slug || 'solution'}.py`;
    if (lang === 'cpp') return `${slug || 'solution'}.cpp`;
    return `${slug || 'solution'}.${lang}`;
  };

  const handleCopy = () => {
    if (!templateCode) return;
    navigator.clipboard.writeText(templateCode);
    setCopied(true);
    if (showToast) showToast('Template copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadInNewFile = () => {
    if (!activeTemplate || !templateCode) return;
    const filename = getSuggestedFilename(activeTemplate, selectedLang);
    handleAddFile(filename, templateCode, null, true);
    if (showToast) showToast(`Loaded ${activeTemplate.title} in ${filename} 🚀`);
    onClose();
  };

  const handleInsertInCurrentFile = () => {
    if (!activeTemplate || !templateCode) return;
    const current = code || '';
    const separator = current.length > 0 && !current.endsWith('\n') ? '\n\n' : '\n';
    handleCodeChange(current + separator + templateCode);
    if (showToast) showToast(`Inserted ${activeTemplate.title} into current file ✨`);
    onClose();
  };

  // Category counts
  const categoryCounts = CODE_TEMPLATES.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="templates-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="templates-header">
          <div className="templates-header-title">
            <div className="templates-icon-wrap">
              <LayoutTemplate size={20} className="icon-cyan" />
            </div>
            <div>
              <h3>Code Templates Library</h3>
              <p className="templates-subtitle">
                Curated, ready-to-run DSA algorithms & patterns across Java, Python & C++
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Top Filter Bar */}
        <div className="templates-filter-bar">
          <div className="templates-search-wrap">
            <Search size={15} className="templates-search-icon" />
            <input
              type="text"
              className="templates-search-input"
              placeholder="Search templates (e.g. binary search, two pointer, graph, tree, O(n)...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="templates-difficulty-pills">
            {['all', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                className={`difficulty-pill ${selectedDifficulty === diff ? 'active' : ''} ${
                  diff !== 'all' ? `diff-${diff.toLowerCase()}` : ''
                }`}
                onClick={() => setSelectedDifficulty(diff)}
              >
                {diff === 'all' ? 'All Difficulties' : diff}
              </button>
            ))}
          </div>
        </div>

        {/* Main Body: Sidebar + List + Preview */}
        <div className="templates-body">
          {/* Categories Sidebar */}
          <div className="templates-sidebar">
            <div className="templates-sidebar-title">Categories</div>
            <button
              className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span className="cat-icon">⚡</span>
              <span className="cat-name">All Templates</span>
              <span className="cat-count">{CODE_TEMPLATES.length}</span>
            </button>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-name">{cat.name}</span>
                <span className="cat-count">{categoryCounts[cat.id] || 0}</span>
              </button>
            ))}
          </div>

          {/* Templates List Column */}
          <div className="templates-list-col">
            <div className="templates-list-header">
              <span>{filteredTemplates.length} templates found</span>
            </div>
            <div className="templates-list">
              {filteredTemplates.length === 0 ? (
                <div className="templates-empty">
                  <Sparkles size={28} className="icon-muted" />
                  <p>No matching templates found</p>
                  <span>Try clearing your search or category filters</span>
                </div>
              ) : (
                filteredTemplates.map((t) => {
                  const isSelected = activeTemplate?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`template-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setActiveTemplateId(t.id)}
                    >
                      <div className="template-card-top">
                        <span className="template-card-title">{t.title}</span>
                        <span className={`badge-difficulty diff-${t.difficulty.toLowerCase()}`}>
                          {t.difficulty}
                        </span>
                      </div>
                      <p className="template-card-desc">{t.description}</p>
                      <div className="template-card-meta">
                        <span className="meta-badge time" title="Time Complexity">
                          <Clock size={11} /> {t.timeComplexity}
                        </span>
                        <span className="meta-badge space" title="Space Complexity">
                          <Database size={11} /> {t.spaceComplexity}
                        </span>
                        <ChevronRight size={13} className="meta-arrow" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Template Detail / Preview Column */}
          {activeTemplate ? (
            <div className="templates-preview-col">
              <div className="preview-header">
                <div className="preview-title-row">
                  <div>
                    <h4 className="preview-title">{activeTemplate.title}</h4>
                    <p className="preview-desc">{activeTemplate.description}</p>
                  </div>
                  <div className="preview-badges">
                    <span className={`badge-difficulty diff-${activeTemplate.difficulty.toLowerCase()}`}>
                      {activeTemplate.difficulty}
                    </span>
                    <span className="meta-badge time">
                      <Clock size={12} /> {activeTemplate.timeComplexity}
                    </span>
                    <span className="meta-badge space">
                      <Database size={12} /> {activeTemplate.spaceComplexity}
                    </span>
                  </div>
                </div>

                {/* Language Switcher & Action Buttons */}
                <div className="preview-toolbar">
                  <div className="preview-lang-tabs">
                    {[
                      { id: 'java', label: 'Java' },
                      { id: 'python', label: 'Python' },
                      { id: 'cpp', label: 'C++' },
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        className={`lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
                        onClick={() => setSelectedLang(lang.id)}
                      >
                        <Code2 size={13} />
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="preview-actions">
                    <button
                      className="btn-preview-action btn-copy"
                      onClick={handleCopy}
                      title="Copy template code to clipboard"
                    >
                      {copied ? <Check size={14} className="icon-green" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <button
                      className="btn-preview-action btn-insert"
                      onClick={handleInsertInCurrentFile}
                      title="Insert into currently open file"
                    >
                      <Zap size={14} />
                      <span>Insert</span>
                    </button>

                    <button
                      className="btn-preview-action btn-load-file"
                      onClick={handleLoadInNewFile}
                      title="Create a new file with this template"
                    >
                      <FilePlus size={14} />
                      <span>Open in New File</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Code Display */}
              <div className="preview-code-container">
                <pre className="preview-code">
                  <code>{templateCode}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="templates-preview-col preview-placeholder">
              <p>Select a template to view code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
