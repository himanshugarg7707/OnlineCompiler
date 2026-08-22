import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getSupportedLanguages, getLanguageById } from '../services/languageDetector';
import { ChevronDown, Search, Check } from 'lucide-react';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { state, handleSelectLanguage } = useApp();
  const { detectedLanguage } = state;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const supportedLanguages = getSupportedLanguages();

  const filteredLanguages = supportedLanguages.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.monacoLanguage.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const onSelectLanguage = (lang) => {
    handleSelectLanguage(lang, false);
    setIsOpen(false);
    setSearch('');
  };

  const onSelectWithTemplate = (e, lang) => {
    e.stopPropagation();
    handleSelectLanguage(lang, true);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="language-selector-container" ref={dropdownRef}>
      <button
        className={`language-selector-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Select programming language"
      >
        <span className="lang-icon">{detectedLanguage.icon}</span>
        <span className="lang-name">{detectedLanguage.name}</span>
        <ChevronDown size={14} className="lang-chevron" />
      </button>

      {isOpen && (
        <div className="language-dropdown-menu animate-fade-in">
          <div className="language-search-box">
            <Search size={14} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="language-search-input"
            />
          </div>

          <div className="language-options-list">
            {filteredLanguages.map((lang) => {
              const isSelected = detectedLanguage.id === lang.id;
              return (
                <div
                  key={lang.id}
                  className={`language-option ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectLanguage(getLanguageById(lang.id))}
                >
                  <div className="option-left">
                    <span className="option-emoji">{lang.icon}</span>
                    <span className="option-title">{lang.name}</span>
                  </div>

                  <div className="option-actions">
                    <button
                      className="btn-template"
                      onClick={(e) => onSelectWithTemplate(e, getLanguageById(lang.id))}
                      title="Load starter template for this language"
                    >
                      + Template
                    </button>
                    {isSelected && <Check size={16} className="option-check" />}
                  </div>
                </div>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="language-no-results">
                No languages found matching "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
