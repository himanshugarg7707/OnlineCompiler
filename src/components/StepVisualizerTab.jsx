import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  generateExecutionTrace,
  ALGORITHM_PRESETS,
} from '../services/dsaTracerService';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Maximize2,
  Layers,
  HardDrive,
  Cpu,
  Sparkles,
  ArrowRight,
  Code2,
} from 'lucide-react';
import './StepVisualizerTab.css';

export default function StepVisualizerTab() {
  const { state, dispatch } = useApp();
  const { code, detectedLanguage } = state;

  const [activePreset, setActivePreset] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000); // ms per step

  const activeCode = useMemo(() => {
    if (activePreset) {
      const preset = ALGORITHM_PRESETS.find((p) => p.id === activePreset);
      if (preset) return preset.code;
    }
    return code || ALGORITHM_PRESETS[0].code;
  }, [activePreset, code]);

  // Generate trace for active code
  const trace = useMemo(() => {
    return generateExecutionTrace(activeCode, detectedLanguage?.name || 'javascript');
  }, [activeCode, detectedLanguage]);

  const steps = trace?.steps || [];
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] || steps[0] || null;

  // Emit visualizer step to highlight Monaco line
  useEffect(() => {
    if (currentStep && currentStep.line) {
      window.dispatchEvent(
        new CustomEvent('fullcode-visualizer-step', {
          detail: { line: currentStep.line },
        })
      );
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent('fullcode-visualizer-step', { detail: { line: null } })
      );
    };
  }, [currentStep]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, totalSteps, playSpeed]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const handleEnd = () => {
    setIsPlaying(false);
    setCurrentStepIndex(Math.max(0, totalSteps - 1));
  };

  const handleTogglePlay = () => {
    if (currentStepIndex >= totalSteps - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleOpenFullModal = () => {
    window.dispatchEvent(new CustomEvent('open-dsa-visualizer'));
  };

  // Stack frames
  const stackFrames = currentStep?.stack || [];
  // Active frame variables
  const activeFrame = stackFrames[stackFrames.length - 1];
  const activeVars = activeFrame?.vars || {};
  // Heap objects
  const heapObjects = currentStep?.heap || {};
  const heapKeys = Object.keys(heapObjects);

  return (
    <div className="step-visualizer-tab animate-fade-in">
      {/* Visualizer Controls Bar */}
      <div className="vis-controls-bar">
        <div className="vis-playback-controls">
          <button
            type="button"
            className="vis-ctrl-btn"
            onClick={handleReset}
            title="Reset to beginning (Step 1)"
            disabled={currentStepIndex === 0}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="vis-ctrl-btn"
            onClick={handlePrev}
            title="Step Back (Previous line)"
            disabled={currentStepIndex === 0}
          >
            <SkipBack size={13} />
            <span>Back</span>
          </button>
          <button
            type="button"
            className={`vis-ctrl-btn primary ${isPlaying ? 'is-playing' : ''}`}
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause Auto-step' : 'Play Auto-step'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            className="vis-ctrl-btn"
            onClick={handleNext}
            title="Step Next (Next line)"
            disabled={currentStepIndex >= totalSteps - 1}
          >
            <SkipForward size={13} />
            <span>Step</span>
          </button>
          <button
            type="button"
            className="vis-ctrl-btn"
            onClick={handleEnd}
            title="Jump to final step"
            disabled={currentStepIndex >= totalSteps - 1}
          >
            <span>End</span>
          </button>
        </div>

        {/* Step Progress Counter */}
        <div className="vis-progress-meta">
          <span className="vis-step-badge">
            Step {totalSteps > 0 ? currentStepIndex + 1 : 0} of {totalSteps}
          </span>
          <div className="vis-progress-track">
            <div
              className="vis-progress-fill"
              style={{
                width: `${totalSteps > 1 ? ((currentStepIndex + 1) / totalSteps) * 100 : 100}%`,
              }}
            />
          </div>
        </div>

        {/* Speed Selector & Popout */}
        <div className="vis-options-group">
          <select
            className="vis-speed-select"
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            title="Playback Speed"
          >
            <option value={1500}>0.6x (Slow)</option>
            <option value={1000}>1.0x (Normal)</option>
            <option value={500}>2.0x (Fast)</option>
          </select>

          <button
            type="button"
            className="vis-popout-btn"
            onClick={handleOpenFullModal}
            title="Open Full Screen Visualizer with Recursion Trees & Heatmap"
          >
            <Maximize2 size={13} />
            <span>Tree & Heatmap</span>
          </button>
        </div>
      </div>

      {/* Preset Algorithm Switcher Pills */}
      <div className="vis-presets-row">
        <span className="vis-presets-label">Algorithms:</span>
        <button
          type="button"
          className={`vis-preset-pill ${activePreset === null ? 'active' : ''}`}
          onClick={() => {
            setActivePreset(null);
            setCurrentStepIndex(0);
          }}
        >
          <Code2 size={12} />
          <span>Current Editor Code</span>
        </button>
        {ALGORITHM_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`vis-preset-pill ${activePreset === p.id ? 'active' : ''}`}
            onClick={() => {
              setActivePreset(p.id);
              setCurrentStepIndex(0);
            }}
          >
            <span>{p.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Active Line & Action Explanation Banner */}
      {currentStep && (
        <div className="vis-step-banner">
          <div className="vis-banner-line">
            <span className="vis-line-dot" />
            <span className="vis-line-tag">Line {currentStep.line}</span>
            <span className="vis-action-title">{currentStep.action || 'Executing statement'}</span>
          </div>
          <div className="vis-banner-explanation">
            {currentStep.explanation || 'State updated in execution context.'}
          </div>
        </div>
      )}

      {/* 3-Card Inspection Grid */}
      <div className="vis-cards-grid">
        {/* Card 1: Call Stack */}
        <div className="vis-card">
          <div className="vis-card-header">
            <Layers size={14} className="icon-cyan" />
            <span className="vis-card-title">Call Stack ({stackFrames.length})</span>
          </div>
          <div className="vis-card-body stack-frames-list">
            {stackFrames.length === 0 ? (
              <div className="vis-empty-state">Stack empty</div>
            ) : (
              stackFrames.map((frame, idx) => {
                const isTop = idx === stackFrames.length - 1;
                return (
                  <div key={frame.id || idx} className={`stack-frame-item ${isTop ? 'active-frame' : ''}`}>
                    <div className="frame-meta">
                      <span className="frame-name">{frame.name || '<function>'}</span>
                      <span className="frame-line">L:{frame.line}</span>
                    </div>
                    {isTop && <span className="active-frame-indicator">Active</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 2: Stack Variables & Primitives */}
        <div className="vis-card">
          <div className="vis-card-header">
            <Cpu size={14} className="icon-purple" />
            <span className="vis-card-title">Variables ({Object.keys(activeVars).length})</span>
          </div>
          <div className="vis-card-body variables-list">
            {Object.keys(activeVars).length === 0 ? (
              <div className="vis-empty-state">No local variables initialized</div>
            ) : (
              Object.entries(activeVars).map(([key, val]) => (
                <div key={key} className="variable-row">
                  <span className="var-key">{key}:</span>
                  <span className="var-val">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Heap Objects & Dynamic Memory */}
        <div className="vis-card">
          <div className="vis-card-header">
            <HardDrive size={14} className="icon-green" />
            <span className="vis-card-title">Heap Memory & Objects ({heapKeys.length})</span>
          </div>
          <div className="vis-card-body heap-list">
            {heapKeys.length === 0 ? (
              <div className="vis-empty-state">No heap allocations on this step</div>
            ) : (
              heapKeys.map((addr) => {
                const obj = heapObjects[addr];
                return (
                  <div key={addr} className="heap-item">
                    <div className="heap-addr-row">
                      <span className="heap-addr">{addr}</span>
                      <span className="heap-type">{obj.type || 'Object'}</span>
                    </div>
                    <div className="heap-val-preview">
                      {obj.raw || JSON.stringify(obj.value || obj)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
