import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ALGORITHM_PRESETS,
  generateExecutionTrace,
} from '../services/dsaTracerService';
import { analyzeComplexity } from '../services/complexityAnalyzer';
import {
  Brain,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Layers,
  HardDrive,
  GitBranch,
  Activity,
  Flame,
  Binary,
  ArrowRight,
  ChevronRight,
  Maximize2,
  Minimize2,
  BookOpen,
} from 'lucide-react';
import './DsaVisualizerModal.css';

export default function DsaVisualizerModal({ isOpen, onClose }) {
  const { state } = useApp();
  const { code: currentEditorCode, detectedLanguage } = state;

  const [activeCodeSource, setActiveCodeSource] = useState('editor'); // 'editor' | 'preset'
  const [selectedPresetId, setSelectedPresetId] = useState('fibonacci-recursion');
  const [activeSubTab, setActiveSubTab] = useState('tracer'); // 'tracer' | 'tree' | 'heatmap'

  const activeCode = useMemo(() => {
    if (activeCodeSource === 'preset') {
      const p = ALGORITHM_PRESETS.find((x) => x.id === selectedPresetId);
      return p?.code || currentEditorCode;
    }
    return currentEditorCode || ALGORITHM_PRESETS[0].code;
  }, [activeCodeSource, selectedPresetId, currentEditorCode]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);

  // Generate execution trace
  const trace = useMemo(() => {
    return generateExecutionTrace(activeCode, detectedLanguage?.name || 'javascript');
  }, [activeCode, detectedLanguage]);

  // Static Big-O Complexity
  const complexityAnalysis = useMemo(() => {
    return analyzeComplexity(activeCode, detectedLanguage);
  }, [activeCode, detectedLanguage]);

  const steps = trace.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0] || {};
  const totalSteps = steps.length;

  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [activeCode]);

  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playSpeed, totalSteps]);

  if (!isOpen) return null;

  const codeLines = activeCode.split('\n');

  // Heatmap helper: calculate hotness intensity (0 - 1)
  const maxHitCount = Math.max(1, ...Object.values(trace.heatmap || {}));

  // Recursive tree renderer node component
  const renderTreeNode = (node) => {
    if (!node) return null;
    const isCompleted = node.status === 'completed';
    return (
      <div key={node.id || node.name} className="tree-node-wrapper">
        <div className={`tree-node-circle ${isCompleted ? 'completed' : 'active'}`}>
          <span className="tree-node-title">{node.name}</span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="tree-children-container">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dsa-modal-backdrop" onClick={onClose}>
      <div className="dsa-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="dsa-modal-header">
          <div className="dsa-header-title-group">
            <div className="dsa-header-icon">
              <Brain size={20} />
            </div>
            <div>
              <div className="dsa-title-row">
                <h3>Interactive DSA & Execution Visualizer</h3>
                <span className="dsa-complexity-badge">
                  {complexityAnalysis.time !== '—' ? complexityAnalysis.time : 'O(N)'} Time •{' '}
                  {complexityAnalysis.space !== '—' ? complexityAnalysis.space : 'O(1)'} Space
                </span>
              </div>
              <p className="dsa-header-sub">
                Step-by-step memory tracer, call stack frames, dynamic heap references & complexity heatmap
              </p>
            </div>
          </div>

          <div className="dsa-header-controls">
            {/* Source switch: Editor Code vs Preset */}
            <div className="dsa-source-toggle">
              <button
                className={`btn-source ${activeCodeSource === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveCodeSource('editor')}
              >
                Current Editor Code
              </button>
              <button
                className={`btn-source ${activeCodeSource === 'preset' ? 'active' : ''}`}
                onClick={() => setActiveCodeSource('preset')}
              >
                DSA Presets
              </button>
            </div>

            {activeCodeSource === 'preset' && (
              <select
                className="dsa-preset-select"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
              >
                {ALGORITHM_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button className="dsa-modal-close" onClick={onClose} title="Close visualizer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar: Tracer vs Recursion Tree vs Complexity Heatmap */}
        <div className="dsa-subnav-bar">
          <div className="subnav-tabs">
            <button
              className={`subnav-tab ${activeSubTab === 'tracer' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('tracer')}
            >
              <Layers size={14} />
              <span>Execution & Memory Tracer</span>
            </button>
            <button
              className={`subnav-tab ${activeSubTab === 'tree' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('tree')}
            >
              <GitBranch size={14} />
              <span>Recursion & Data Structures</span>
            </button>
            <button
              className={`subnav-tab ${activeSubTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('heatmap')}
            >
              <Flame size={14} />
              <span>Complexity & Line Heatmap</span>
            </button>
          </div>

          {/* Stepper Controls */}
          <div className="dsa-stepper-panel">
            <button
              className="btn-stepper"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              disabled={currentStepIndex === 0}
              title="First step"
            >
              <SkipBack size={13} />
            </button>
            <button
              className="btn-stepper"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex((p) => Math.max(0, p - 1));
              }}
              disabled={currentStepIndex === 0}
              title="Previous step"
            >
              ◀
            </button>
            <button
              className="btn-stepper btn-play"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              className="btn-stepper"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex((p) => Math.min(totalSteps - 1, p + 1));
              }}
              disabled={currentStepIndex >= totalSteps - 1}
              title="Next step"
            >
              ▶
            </button>
            <button
              className="btn-stepper"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(Math.max(0, totalSteps - 1));
              }}
              disabled={currentStepIndex >= totalSteps - 1}
              title="Last step"
            >
              <SkipForward size={13} />
            </button>

            <span className="step-count-label">
              Step {currentStepIndex + 1} / {Math.max(1, totalSteps)}
            </span>
          </div>
        </div>

        {/* Step Human Explanation Pill */}
        <div className="dsa-step-banner">
          <span className="step-tag-pill">{currentStep.action || 'Executing'}</span>
          <span className="step-text">{currentStep.explanation || 'Stepping through code execution.'}</span>
        </div>

        {/* Tab 1: Execution & Memory Tracer */}
        {activeSubTab === 'tracer' && (
          <div className="dsa-tracer-grid">
            {/* Left: Code with Step Pointer */}
            <div className="dsa-code-pane">
              <div className="pane-header">
                <span>Code Execution Pointer</span>
                <span className="current-line-badge">Line {currentStep.line || 1}</span>
              </div>
              <div className="code-scroll-area">
                <table className="dsa-code-table">
                  <tbody>
                    {codeLines.map((line, idx) => {
                      const lineNum = idx + 1;
                      const isCurrent = lineNum === currentStep.line;
                      return (
                        <tr key={lineNum} className={isCurrent ? 'active-code-row' : ''}>
                          <td className="code-gutter-cell">
                            {isCurrent ? <span className="active-arrow">▶</span> : lineNum}
                          </td>
                          <td className="code-text-cell">{line}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Call Stack & Heap Memory */}
            <div className="dsa-memory-pane">
              {/* Call Stack */}
              <div className="tracer-box">
                <div className="tracer-box-header">
                  <div className="box-title">
                    <Layers size={13} className="text-cyan" />
                    <span>Call Stack Frames</span>
                  </div>
                  <span className="box-sub">{(currentStep.stack || []).length} Frame(s)</span>
                </div>
                <div className="tracer-box-content stack-content">
                  {(currentStep.stack || []).length === 0 ? (
                    <div className="empty-box">Call stack empty</div>
                  ) : (
                    (currentStep.stack || []).map((frame, i) => (
                      <div key={i} className="stack-card">
                        <div className="stack-card-title">
                          <span>{frame.name}</span>
                          <span className="stack-line">line {frame.line}</span>
                        </div>
                        <div className="stack-vars">
                          {Object.entries(frame.vars || {}).map(([k, v]) => (
                            <div key={k} className="var-chip">
                              <span className="var-key">{k}</span>
                              <span className="var-val">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Heap Allocations */}
              <div className="tracer-box">
                <div className="tracer-box-header">
                  <div className="box-title">
                    <HardDrive size={13} className="text-emerald" />
                    <span>Heap Objects & Memory References</span>
                  </div>
                  <span className="box-sub">{Object.keys(currentStep.heap || {}).length} Allocated</span>
                </div>
                <div className="tracer-box-content heap-content">
                  {Object.keys(currentStep.heap || {}).length === 0 ? (
                    <div className="empty-box">No dynamically allocated heap items</div>
                  ) : (
                    Object.entries(currentStep.heap || {}).map(([addr, item]) => (
                      <div key={addr} className="heap-card">
                        <div className="heap-card-header">
                          <span className="addr-tag">{addr}</span>
                          <span className="type-tag">{item.type || 'Object'}</span>
                        </div>
                        <div className="heap-card-body">
                          {Array.isArray(item.items) ? (
                            <div className="heap-array-row">
                              {item.items.map((val, idx) => (
                                <div key={idx} className="heap-cell">
                                  <span className="cell-idx">[{idx}]</span>
                                  <span className="cell-val">{String(val)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <pre className="heap-json">{JSON.stringify(item, null, 2)}</pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Recursion Tree & Data Structure Renderer */}
        {activeSubTab === 'tree' && (
          <div className="dsa-tree-view-container">
            <div className="tree-view-header">
              <div className="tree-legend">
                <span className="legend-item active">● In Execution</span>
                <span className="legend-item completed">● Completed / Returned</span>
              </div>
            </div>

            <div className="tree-canvas-area">
              {currentStep.recursionTree ? (
                renderTreeNode(currentStep.recursionTree)
              ) : currentStep.treeState ? (
                <div className="tree-node-wrapper">
                  <div className="tree-node-circle completed">
                    <span>Val: {currentStep.treeState.val}</span>
                  </div>
                  <div className="tree-children-container">
                    <div className="tree-node-circle completed">
                      <span>Left: {currentStep.treeState.left?.val}</span>
                    </div>
                    <div className="tree-node-circle completed">
                      <span>Right: {currentStep.treeState.right?.val}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tree-placeholder">
                  <GitBranch size={32} />
                  <p>Recursion tree active during recursive functions (e.g. Fibonacci, Tree Traversals, Merge Sort).</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Algorithm Complexity & Line Heatmap */}
        {activeSubTab === 'heatmap' && (
          <div className="dsa-heatmap-container">
            <div className="heatmap-header">
              <div className="heatmap-kpi">
                <span className="kpi-label">Asymptotic Time</span>
                <span className="kpi-value text-emerald">{complexityAnalysis.time}</span>
              </div>
              <div className="heatmap-kpi">
                <span className="kpi-label">Space Complexity</span>
                <span className="kpi-value text-cyan">{complexityAnalysis.space}</span>
              </div>
              <div className="heatmap-kpi">
                <span className="kpi-label">Max Call Stack Depth</span>
                <span className="kpi-value text-amber">{trace.summary?.maxStackDepth || 1}</span>
              </div>
              <div className="heatmap-legend">
                <span>Execution Frequency:</span>
                <span className="legend-bar" />
                <span>Cold (1x) → Hot (N²x)</span>
              </div>
            </div>

            <div className="heatmap-code-wrapper">
              <table className="heatmap-table">
                <tbody>
                  {codeLines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const hitCount = trace.heatmap?.[lineNum] || 0;
                    const ratio = hitCount / maxHitCount;
                    const isHot = ratio > 0.6;
                    const isMedium = ratio > 0.2;

                    return (
                      <tr
                        key={lineNum}
                        className={`heatmap-row ${isHot ? 'hot' : isMedium ? 'medium' : ''}`}
                      >
                        <td className="heatmap-num">{lineNum}</td>
                        <td className="heatmap-badge-cell">
                          {hitCount > 0 ? (
                            <span className={`hit-badge ${isHot ? 'hot' : isMedium ? 'medium' : 'cold'}`}>
                              {hitCount}×
                            </span>
                          ) : (
                            <span className="hit-zero">—</span>
                          )}
                        </td>
                        <td className="heatmap-text">{line}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
