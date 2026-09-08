import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import {
  Activity,
  Clock,
  Database,
  Lightbulb,
  Zap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import './ComplexityTab.css';

const ASYMPTOTIC_SCALE = [
  { label: 'O(1)', name: 'Constant', color: '#10b981', tier: 'Excellent' },
  { label: 'O(log n)', name: 'Logarithmic', color: '#10b981', tier: 'Great' },
  { label: 'O(n)', name: 'Linear', color: '#38bdf8', tier: 'Good' },
  { label: 'O(n log n)', name: 'Linearithmic', color: '#f59e0b', tier: 'Fair' },
  { label: 'O(n²)', name: 'Quadratic', color: '#f97316', tier: 'Poor' },
  { label: 'O(2ⁿ)', name: 'Exponential', color: '#ef4444', tier: 'Critical' },
];

export default function ComplexityTab() {
  const { state, dispatch, handleExplainCode } = useApp();
  const { code, detectedLanguage, activeFileId, files } = state;
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  const analysis = useMemo(() => {
    return analyzeComplexity(code, detectedLanguage);
  }, [code, detectedLanguage]);

  const activeScaleIndex = useMemo(() => {
    const time = (analysis.time || '').toLowerCase();
    if (time.includes('2^n') || time.includes('2ⁿ') || time.includes('n!')) return 5;
    if (time.includes('n³') || time.includes('n^3') || time.includes('n²') || time.includes('n^2')) return 4;
    if (time.includes('n log n') || time.includes('n*log')) return 3;
    if (time.includes('n') && !time.includes('log')) return 2;
    if (time.includes('log')) return 1;
    return 0; // O(1) default
  }, [analysis.time]);

  const activeScale = ASYMPTOTIC_SCALE[activeScaleIndex] || ASYMPTOTIC_SCALE[0];

  const handleJumpToLine = (lineNumber) => {
    if (!lineNumber) return;
    window.dispatchEvent(
      new CustomEvent('editor-jump-to-line', { detail: { line: lineNumber } })
    );
  };

  const handleAskAIOptimize = () => {
    dispatch({ type: 'SET_TERMINAL_TAB', payload: 'explanation' });
    handleExplainCode('optimize');
  };

  return (
    <div className="complexity-tab-container">
      {/* Header Bar */}
      <div className="complexity-tab-header">
        <div className="complexity-header-title-group">
          <div className="complexity-icon-badge">
            <Activity size={18} />
          </div>
          <div>
            <div className="complexity-title-row">
              <h3>Time & Space Complexity Analyzer</h3>
              <span className="complexity-file-pill">{activeFile?.name || 'Current File'}</span>
            </div>
            <p className="complexity-header-sub">
              Static Big-O asymptotic analysis of loops, recursion, data structures & memory allocation
            </p>
          </div>
        </div>

        <div className="complexity-header-actions">
          <button
            className="btn-ai-optimize"
            onClick={handleAskAIOptimize}
            title="Ask AI to analyze and optimize algorithmic complexity"
          >
            <Sparkles size={14} />
            <span>Optimize with AI</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="complexity-kpi-grid">
        {/* Time Complexity Card */}
        <div className="complexity-kpi-card time-card">
          <div className="kpi-card-header">
            <span className="kpi-badge time">
              <Clock size={12} /> Time Complexity
            </span>
            <span
              className="kpi-tier-tag"
              style={{ color: activeScale.color, borderColor: `${activeScale.color}40`, background: `${activeScale.color}15` }}
            >
              {activeScale.tier}
            </span>
          </div>

          <div className="kpi-card-main">
            <span className="kpi-big-value" style={{ color: activeScale.color }}>
              {analysis.time}
            </span>
            <span className="kpi-sub-name">{activeScale.name} Runtime</span>
          </div>

          <p className="kpi-card-desc">
            {analysis.time === 'O(1)'
              ? 'Executes in constant number of steps regardless of input size.'
              : analysis.time === 'O(log n)'
              ? 'Input space is repeatedly divided (e.g. binary search).'
              : analysis.time === 'O(n)'
              ? 'Execution time grows linearly proportional to the size of the input.'
              : analysis.time === 'O(n log n)'
              ? 'Typical for efficient divide-and-conquer algorithms like Merge or Quick Sort.'
              : analysis.time === 'O(n²)'
              ? 'Quadratic growth — common in nested loops over the collection.'
              : 'Exponential growth — consider dynamic programming or memoization.'}
          </p>
        </div>

        {/* Space Complexity Card */}
        <div className="complexity-kpi-card space-card">
          <div className="kpi-card-header">
            <span className="kpi-badge space">
              <Database size={12} /> Auxiliary Space
            </span>
            <span className="kpi-tier-tag space-tier">
              {analysis.space === 'O(1)' ? 'In-Place' : 'Allocated RAM'}
            </span>
          </div>

          <div className="kpi-card-main">
            <span className="kpi-big-value space-color">
              {analysis.space}
            </span>
            <span className="kpi-sub-name">
              {analysis.space === 'O(1)' ? 'Constant Memory' : 'Linear Memory'}
            </span>
          </div>

          <p className="kpi-card-desc">
            {analysis.space === 'O(1)'
              ? 'Algorithm operates in-place without scaling additional auxiliary data structures.'
              : 'Auxiliary memory scales with input size (arrays, hash maps, or recursion stack depth).'}
          </p>
        </div>
      </div>

      {/* Asymptotic Spectrum Bar */}
      <div className="asymptotic-scale-section">
        <div className="scale-title-row">
          <span className="scale-title">Big-O Complexity Spectrum</span>
          <span className="scale-current-indicator">
            Current: <strong style={{ color: activeScale.color }}>{analysis.time} ({activeScale.name})</strong>
          </span>
        </div>

        <div className="asymptotic-track">
          {ASYMPTOTIC_SCALE.map((step, idx) => {
            const isCurrent = idx === activeScaleIndex;
            return (
              <div
                key={step.label}
                className={`scale-step ${isCurrent ? 'active' : ''}`}
                style={{
                  '--step-color': step.color,
                  borderColor: isCurrent ? step.color : undefined,
                }}
              >
                <span className="step-label">{step.label}</span>
                <span className="step-name">{step.name}</span>
                {isCurrent && <div className="step-active-dot" style={{ background: step.color }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown and Optimization Section */}
      <div className="complexity-details-grid">
        {/* Contributing Factors Breakdown */}
        <div className="details-card">
          <div className="details-card-header">
            <span className="details-header-title">
              <TrendingUp size={14} className="icon-cyan" /> Detected Patterns & Loops
            </span>
            <span className="details-count">{analysis.breakdown.length} items</span>
          </div>

          <div className="breakdown-list">
            {analysis.breakdown.length === 0 ? (
              <div className="breakdown-empty">
                <CheckCircle2 size={24} className="icon-green" />
                <p>No loops or heavy allocations found</p>
                <span>Code runs in constant time O(1)</span>
              </div>
            ) : (
              analysis.breakdown.map((item, i) => (
                <div key={i} className="breakdown-row">
                  <span className="factor-icon">{item.icon}</span>
                  <span className="factor-text">{item.text}</span>
                  {item.line && (
                    <button
                      className="factor-line-btn"
                      onClick={() => handleJumpToLine(item.line)}
                      title={`Jump to line ${item.line} in code`}
                    >
                      Line {item.line} <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Optimization Tips */}
        <div className="details-card">
          <div className="details-card-header">
            <span className="details-header-title">
              <Lightbulb size={14} className="icon-amber" /> Optimization Recommendations
            </span>
            <span className="details-count">{analysis.tips.length} suggestions</span>
          </div>

          <div className="tips-list">
            {analysis.tips.length === 0 ? (
              <div className="breakdown-empty">
                <Zap size={24} className="icon-cyan" />
                <p>Algorithm is already optimal!</p>
                <span>No redundant nested loops or excessive memory overhead detected.</span>
              </div>
            ) : (
              analysis.tips.map((tip, i) => (
                <div key={i} className="tip-row">
                  <div className="tip-bullet">
                    <Lightbulb size={12} />
                  </div>
                  <p className="tip-text">{tip}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
