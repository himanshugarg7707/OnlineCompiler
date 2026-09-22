import { useApp } from '../context/AppContext';
import LanguageIcon from './LanguageIcon';
import { getFriendlyLanguageName } from '../services/languageDetector';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { state } = useApp();
  const { detectedLanguage, files, activeFileId } = state;
  const activeFile = files?.find((f) => f.id === activeFileId);
  const displayName = getFriendlyLanguageName(detectedLanguage, activeFile?.name);

  return (
    <div className="active-language-badge" title={`Current Language: ${displayName}`}>
      <span className="lang-icon">
        <LanguageIcon language={detectedLanguage} filename={activeFile?.name} size={16} />
      </span>
      <span className="lang-name">{displayName}</span>
    </div>
  );
}
