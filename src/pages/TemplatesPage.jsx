import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TEMPLATE_CATEGORIES, CODE_TEMPLATES } from '../services/codeTemplates';
import {
  ArrowLeft,
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
  X,
  BookOpen,
} from 'lucide-react';
import './TemplatesPage.css';

export default function TemplatesPage() {
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
    if (showToast) showToast(`Created ${filename} with ${activeTemplate.title} 🚀`);
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  const handleInsertInCurrentFile = () => {
    if (!activeTemplate || !templateCode) return;
    const current = code || '';
    const separator = current.length > 0 && !current.endsWith('\n') ? '\n\n' : '\n';
    handleCodeChange(current + separator + templateCode);
    if (showToast) showToast(`Inserted ${activeTemplate.title} into current file ✨`);
    dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' });
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    return CODE_TEMPLATES.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});
  }, []);

  return (
    <div className="templates-page-root">
      {/* Top Navigation Bar */}
      <header className="templates-nav-bar">
        <div className="templates-nav-left">
          <button
            className="btn-back-to-ide"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
            title="Return to Online Compiler"
          >
            <ArrowLeft size={16} />
            <span>Back to IDE</span>
          </button>
          <div className="templates-breadcrumb">
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">DSA Code Templates & Algorithms</span>
          </div>
        </div>

        <div className="templates-nav-right">
          <div className="templates-stats-pill">
            <BookOpen size={14} />
            <span>{CODE_TEMPLATES.length} DSA Templates</span>
            <span className="stats-dot">•</span>
            <span>Java, Python, C++</span>
          </div>
          <button
            className="btn-done-primary"
            onClick={() => dispatch({ type: 'NAVIGATE_PAGE', payload: 'editor' })}
          >
            Done
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="templates-toolbar">
        <div className="templates-search-wrap">
          <Search size={16} className="templates-search-icon" />
          <input
            type="text"
            className="templates-search-input"
            placeholder="Search templates (e.g. binary search, two pointer, graph, dynamic programming, O(n)...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
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

      {/* Main Content Area */}
      <div className="templates-main-layout">
        {/* Left Categories Sidebar */}
        <aside className="templates-category-sidebar">
          <div className="sidebar-section-heading">Categories</div>
          <button
            className={`cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span className="cat-btn-left">
              <Zap size={14} />
              <span>All Templates</span>
            </span>
            <span className="cat-count-badge">{CODE_TEMPLATES.length}</span>
          </button>

          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="cat-btn-left">
                <span className="cat-emoji">{cat.icon}</span>
                <span>{cat.name}</span>
              </span>
              <span className="cat-count-badge">{categoryCounts[cat.id] || 0}</span>
            </button>
          ))}
        </aside>

        {/* Middle Templates List */}
        <section className="templates-list-pane">
          <div className="pane-header">
            <span className="pane-header-title">
              {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Template' : 'Templates'} Found
            </span>
          </div>

          <div className="templates-scroll-list">
            {filteredTemplates.map((template) => {
              const isActive = template.id === activeTemplateId;
              return (
                <div
                  key={template.id}
                  className={`template-summary-card ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTemplateId(template.id)}
                >
                  <div className="summary-card-header">
                    <h4 className="summary-title">{template.title}</h4>
                    <span className={`diff-tag diff-${template.difficulty.toLowerCase()}`}>
                      {template.difficulty}
                    </span>
                  </div>
                  <p className="summary-desc">{template.description}</p>
                  <div className="summary-footer">
                    <div className="complexity-chips">
                      <span className="chip-complexity">
                        <Clock size={11} />
                        {template.timeComplexity}
                      </span>
                      <span className="chip-complexity">
                        <Database size={11} />
                        {template.spaceComplexity}
                      </span>
                    </div>
                    <ChevronRight size={15} className="summary-chevron" />
                  </div>
                </div>
              );
            })}

            {filteredTemplates.length === 0 && (
              <div className="templates-empty-state">
                <LayoutTemplate size={40} className="empty-icon" />
                <h4>No matching templates</h4>
                <p>Try refining your search keyword or clearing the filters.</p>
                <button
                  className="btn-cyber-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedDifficulty('all');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Code Preview & Detail Pane */}
        <section className="templates-preview-pane">
          {activeTemplate ? (
            <div className="preview-container">
              {/* Preview Header */}
              <div className="preview-top-bar">
                <div className="preview-heading-wrap">
                  <div className="preview-title-row">
                    <h2>{activeTemplate.title}</h2>
                    <span className={`diff-tag diff-${activeTemplate.difficulty.toLowerCase()}`}>
                      {activeTemplate.difficulty}
                    </span>
                    <span className="chip-complexity-large">
                      <Clock size={13} />
                      Time: {activeTemplate.timeComplexity}
                    </span>
                    <span className="chip-complexity-large">
                      <Database size={13} />
                      Space: {activeTemplate.spaceComplexity}
                    </span>
                  </div>
                  <p className="preview-desc-text">{activeTemplate.description}</p>
                </div>

                {/* Language Switcher Tabs */}
                <div className="preview-lang-tabs">
                  {['java', 'python', 'cpp'].map((langKey) => (
                    <button
                      key={langKey}
                      className={`lang-tab-btn ${selectedLang === langKey ? 'active' : ''}`}
                      onClick={() => setSelectedLang(langKey)}
                    >
                      <Code2 size={14} />
                      <span>{langKey === 'java' ? 'Java' : langKey === 'python' ? 'Python' : 'C++'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="preview-actions-bar">
                <div className="preview-actions-left">
                  <button className="btn-action-copy" onClick={handleCopy} title="Copy code to clipboard">
                    {copied ? <Check size={14} className="icon-green" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button className="btn-action-insert" onClick={handleInsertInCurrentFile} title="Append to active editor tab">
                    <Sparkles size={14} />
                    <span>Insert into Active Tab</span>
                  </button>
                </div>

                <button
                  className="btn-action-open-file"
                  onClick={handleLoadInNewFile}
                  title="Create a new workspace tab with this template"
                >
                  <FilePlus size={15} />
                  <span>Open in New File ({getSuggestedFilename(activeTemplate, selectedLang)})</span>
                </button>
              </div>

              {/* Code Display */}
              <div className="code-display-wrapper">
                <pre className="code-display-pre">
                  <code>{templateCode}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="no-preview-selected">
              <LayoutTemplate size={48} />
              <p>Select a template from the list to view code</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
