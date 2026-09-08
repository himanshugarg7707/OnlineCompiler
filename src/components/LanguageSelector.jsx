import { useApp } from '../context/AppContext';
import LanguageIcon from './LanguageIcon';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { state } = useApp();
  const { detectedLanguage, files, activeFileId } = state;
  const activeFile = files?.find((f) => f.id === activeFileId);

  return (
    <div className="active-language-badge" title={`Current Language: ${detectedLanguage?.name || 'Code'}`}>
      <span className="lang-icon">
        <LanguageIcon language={detectedLanguage} filename={activeFile?.name} size={16} />
      </span>
      <span className="lang-name">{detectedLanguage?.name || 'Code'}</span>
    </div>
  );
}
