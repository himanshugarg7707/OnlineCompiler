import { useApp } from '../context/AppContext';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { state } = useApp();
  const { detectedLanguage } = state;

  return (
    <div className="active-language-badge" title={`Current Language: ${detectedLanguage.name}`}>
      <span className="lang-icon">{detectedLanguage.icon}</span>
      <span className="lang-name">{detectedLanguage.name}</span>
    </div>
  );
}
