import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import { Activity, ArrowUpRight } from 'lucide-react';
import './ComplexityPanel.css';

export default function ComplexityPanel() {
  const { state, dispatch } = useApp();
  const { code, detectedLanguage } = state;

  const analysis = useMemo(() => {
    return analyzeComplexity(code, detectedLanguage);
  }, [code, detectedLanguage]);

  if (analysis.confidence === 'none') return null;

  const getTimeLevel = (time) => {
    if (['O(1)', 'O(log n)'].includes(time)) return 'fast';
    if (['O(n)', 'O(n log n)', 'O(n log log n)'].includes(time)) return 'moderate';
    return 'slow';
  };

  const timeLevel = getTimeLevel(analysis.time);

  const handleClick = () => {
    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'complexity' });
  };

  return (
    <button
      className={`editor-complexity-pill level-${timeLevel} animate-slide-up`}
      onClick={handleClick}
      title="Click to view full Big-O Complexity analysis & optimization in Terminal"
    >
      <Activity size={12} className="complexity-pill-icon" />
      <span className="complexity-pill-time">⏱ {analysis.time}</span>
      <span className="complexity-pill-divider">·</span>
      <span className="complexity-pill-space">💾 {analysis.space}</span>
      <ArrowUpRight size={10} className="complexity-pill-arrow" />
    </button>
  );
}
