import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { COMPLETIONS } from '../services/snippets';
import { X, Search, Code, Copy, Check, PlusCircle, Sparkles } from 'lucide-react';
import './SnippetsModal.css';

export default function SnippetsModal({ isOpen, onClose }) {
  const { state, handleCodeChange } = useApp();
  const { detectedLanguage, code } = useApp().state;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState(() => {
    return detectedLanguage?.monacoLanguage || 'sql';
  });
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [insertedIndex, setInsertedIndex] = useState(null);

  // Flatten and prepare snippets list
  const snippetsList = useMemo(() => {
    const list = [];
    const langs = selectedLang === 'all' ? Object.keys(COMPLETIONS) : [selectedLang];

    langs.forEach((lang) => {
      const items = COMPLETIONS[lang] || [];
      items.forEach((item) => {
        list.push({
          ...item,
          language: lang,
          cleanBody: item.body.replace(/\$\{\d+(?::([^}]+))?\}/g, '$1').replace(/\$\d+/g, ''),
        });
      });
    });

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.prefix.toLowerCase().includes(query) ||
        (s.detail && s.detail.toLowerCase().includes(query)) ||
        (s.doc && s.doc.toLowerCase().includes(query)) ||
        s.cleanBody.toLowerCase().includes(query)
    );
  }, [selectedLang, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = (snippet, index) => {
    navigator.clipboard.writeText(snippet.cleanBody);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsert = (snippet, index) => {
    // Append or insert snippet into current active file code
    const separator = code && !code.endsWith('\n') ? '\n\n' : '\n';
    handleCodeChange((code || '') + separator + snippet.cleanBody);
    setInsertedIndex(index);
    setTimeout(() => {
      setInsertedIndex(null);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="snippets-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="snippets-header">
          <div className="header-title">
            <Code size={18} className="icon-cyan" />
            <h3>IntelliSense & Snippet Library</h3>
            <span className="snippets-count">{snippetsList.length} snippets</span>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="snippets-controls">
          {/* Search Box */}
          <div className="snippets-search-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="snippets-search-input"
              placeholder="Search snippets by name, keyword, or query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Language Filter Pills */}
          <div className="lang-filter-pills">
            {['sql', 'python', 'cpp', 'java', 'javascript', 'go', 'rust', 'html', 'css', 'all'].map(
              (lang) => (
                <button
                  key={lang}
                  className={`pill-btn ${selectedLang === lang ? 'active' : ''}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  {lang.toUpperCase()}
                </button>
              )
            )}
          </div>
        </div>

        {/* Snippets List */}
        <div className="snippets-list-scroll">
          {snippetsList.length > 0 ? (
            snippetsList.map((snippet, idx) => (
              <div key={`${snippet.prefix}-${idx}`} className="snippet-card">
                <div className="snippet-card-top">
                  <div className="snippet-info">
                    <span className="snippet-prefix">{snippet.prefix}</span>
                    <span className="snippet-label">{snippet.label}</span>
                    <span className="snippet-lang-tag">{snippet.language}</span>
                  </div>

                  <div className="snippet-actions">
                    <button
                      className="btn-snippet-action"
                      onClick={() => handleCopy(snippet, idx)}
                      title="Copy snippet code"
                    >
                      {copiedIndex === idx ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                      <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      className="btn-snippet-action btn-primary-action"
                      onClick={() => handleInsert(snippet, idx)}
                      title="Insert code into editor"
                    >
                      {insertedIndex === idx ? (
                        <Check size={13} />
                      ) : (
                        <PlusCircle size={13} />
                      )}
                      <span>{insertedIndex === idx ? 'Inserted!' : 'Insert'}</span>
                    </button>
                  </div>
                </div>

                <p className="snippet-doc">{snippet.doc || snippet.detail}</p>

                {/* Snippet Code Preview */}
                <pre className="snippet-code-preview">
                  <code>{snippet.cleanBody}</code>
                </pre>
              </div>
            ))
          ) : (
            <div className="snippets-empty">
              <Sparkles size={32} className="empty-icon" />
              <p>No snippets found matching "{searchQuery}"</p>
              <button className="btn-reset-filter" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
