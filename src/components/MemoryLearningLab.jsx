import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ALGORITHM_PRESETS,
  generateExecutionTrace,
} from '../services/dsaTracerService';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Layers,
  HardDrive,
  ListOrdered,
  Workflow,
  ArrowRight,
  GitBranch,
  BookOpen,
  Code2,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import './MemoryLearningLab.css';

export default function MemoryLearningLab({ initialPresetId = 'fibonacci-recursion' }) {
  const [selectedPresetId, setSelectedPresetId] = useState(initialPresetId);
  const activePreset = useMemo(
    () => ALGORITHM_PRESETS.find((p) => p.id === selectedPresetId) || ALGORITHM_PRESETS[0],
    [selectedPresetId]
  );

  const [editableCode, setEditableCode] = useState(activePreset.code);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1200); // ms per step

  // When preset changes, update code and reset step
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setEditableCode(preset.code);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // Trace execution based on current code
  const trace = useMemo(() => {
    return generateExecutionTrace(editableCode, activePreset.language);
  }, [editableCode, activePreset.language]);

  const steps = trace.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0] || {};
  const totalSteps = steps.length;

  // Auto-play timer
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

  const handleFirst = () => {
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

  const handleLast = () => {
    setIsPlaying(false);
    setCurrentStepIndex(Math.max(0, totalSteps - 1));
  };

  const handleResetCode = () => {
    setEditableCode(activePreset.code);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const codeLines = useMemo(() => editableCode.split('\n'), [editableCode]);

  return (
    <div className="learning-lab-container">
      {/* Top Learning Header */}
      <div className="learning-lab-header">
        <div className="lab-title-group">
          <div className="lab-badge-icon">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="lab-title-row">
              <h3>Interactive Memory & Algorithm Lab</h3>
              <span className="lab-badge-pill">Step {currentStepIndex + 1} of {Math.max(1, totalSteps)}</span>
            </div>
            <p className="lab-sub">
              Edit code on the left — watch Stack frames, Heap allocations & Queue buffers animate on the right in real time.
            </p>
          </div>
        </div>

        {/* Preset Selector Dropdown */}
        <div className="lab-preset-picker">
          <label htmlFor="preset-select">Select Concept:</label>
          <select
            id="preset-select"
            value={selectedPresetId}
            onChange={(e) => {
              const p = ALGORITHM_PRESETS.find((x) => x.id === e.target.value);
              if (p) handleSelectPreset(p);
            }}
          >
            {ALGORITHM_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.category} — {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="learning-stepper-bar">
        <div className="stepper-buttons">
          <button className="btn-step" onClick={handleFirst} disabled={currentStepIndex === 0} title="First Step">
            <SkipBack size={13} />
          </button>
          <button className="btn-step" onClick={handlePrev} disabled={currentStepIndex === 0} title="Previous Step">
            ◀
          </button>
          <button
            className="btn-step btn-play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play Simulation'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button className="btn-step" onClick={handleNext} disabled={currentStepIndex >= totalSteps - 1} title="Next Step">
            ▶
          </button>
          <button className="btn-step" onClick={handleLast} disabled={currentStepIndex >= totalSteps - 1} title="Last Step">
            <SkipForward size={13} />
          </button>
        </div>

        {/* Step Scrubber Slider */}
        <div className="stepper-scrubber">
          <input
            type="range"
            min="0"
            max={Math.max(0, totalSteps - 1)}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(Number(e.target.value));
            }}
          />
        </div>

        {/* Speed Selector */}
        <div className="stepper-speed">
          <span>Speed:</span>
          <button
            className={`btn-speed ${playSpeed === 1800 ? 'active' : ''}`}
            onClick={() => setPlaySpeed(1800)}
          >
            0.5x
          </button>
          <button
            className={`btn-speed ${playSpeed === 1200 ? 'active' : ''}`}
            onClick={() => setPlaySpeed(1200)}
          >
            1x
          </button>
          <button
            className={`btn-speed ${playSpeed === 600 ? 'active' : ''}`}
            onClick={() => setPlaySpeed(600)}
          >
            2x
          </button>
        </div>
      </div>

      {/* Step Explanation Banner */}
      <div className="step-explanation-banner">
        <div className="step-action-tag">
          <Zap size={14} />
          <span>{currentStep.action || 'Executing...'}</span>
        </div>
        <p className="step-explanation-text">
          {currentStep.explanation || 'Stepping through memory instructions.'}
        </p>
      </div>

      {/* Main Split Layout: Editable Code on Left | Memory Layout on Right */}
      <div className="learning-lab-split">
        {/* Left Side: Editable Code Editor */}
        <div className="learning-code-side">
          <div className="side-header">
            <div className="side-title">
              <Code2 size={15} />
              <span>Sample Code (Fully Editable)</span>
            </div>
            <button className="btn-reset-code" onClick={handleResetCode} title="Reset to original preset">
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          <div className="code-editor-wrapper">
            {/* Visual execution line pointer */}
            <div className="code-line-numbers">
              {codeLines.map((_, idx) => {
                const lineNum = idx + 1;
                const isCurrent = lineNum === currentStep.line;
                return (
                  <div key={lineNum} className={`line-num-row ${isCurrent ? 'active-line' : ''}`}>
                    {isCurrent ? <span className="line-arrow">▶</span> : lineNum}
                  </div>
                );
              })}
            </div>

            <textarea
              className="learning-code-input"
              value={editableCode}
              onChange={(e) => {
                setEditableCode(e.target.value);
                setCurrentStepIndex(0);
              }}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Right Side: Memory Architecture (Stack, Heap, Queue, Pointers) */}
        <div className="learning-memory-side">
          {/* 1. Call Stack Frames Box */}
          <div className="memory-box stack-box">
            <div className="memory-box-header">
              <div className="box-title">
                <Layers size={14} className="box-icon stack" />
                <span>Call Stack (LIFO Frames & Primitives)</span>
              </div>
              <span className="box-meta">{(currentStep.stack || []).length} Frame(s)</span>
            </div>

            <div className="stack-frames-list">
              {(currentStep.stack || []).length === 0 ? (
                <div className="memory-empty-state">Stack empty — no active execution frames.</div>
              ) : (
                (currentStep.stack || []).map((frame, idx) => (
                  <div key={frame.id || idx} className={`stack-frame-item ${idx === (currentStep.stack || []).length - 1 ? 'top-frame' : ''}`}>
                    <div className="frame-header">
                      <span className="frame-name">{frame.name}</span>
                      <span className="frame-line">line {frame.line}</span>
                    </div>

                    <div className="frame-vars-grid">
                      {Object.entries(frame.vars || {}).map(([varName, val]) => (
                        <div key={varName} className="var-chip">
                          <span className="var-name">{varName}</span>
                          <span className="var-equals">=</span>
                          <span className={`var-value ${typeof val === 'string' && val.startsWith('Ref(') ? 'ref-value' : ''}`}>
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Heap Memory Segment Box */}
          <div className="memory-box heap-box">
            <div className="memory-box-header">
              <div className="box-title">
                <HardDrive size={14} className="box-icon heap" />
                <span>Heap Memory (Dynamic Objects & Arrays)</span>
              </div>
              <span className="box-meta">{Object.keys(currentStep.heap || {}).length} Allocation(s)</span>
            </div>

            <div className="heap-objects-grid">
              {Object.keys(currentStep.heap || {}).length === 0 ? (
                <div className="memory-empty-state">Heap empty — no dynamically allocated objects.</div>
              ) : (
                Object.entries(currentStep.heap || {}).map(([addr, obj]) => (
                  <div key={addr} className="heap-object-card">
                    <div className="heap-addr-pill">
                      <span>{addr}</span>
                      <span className="heap-type-tag">{obj.type || 'Object'}</span>
                    </div>
                    <div className="heap-content-view">
                      {Array.isArray(obj.items) ? (
                        <div className="heap-array-cells">
                          {obj.items.map((item, i) => (
                            <div key={i} className="array-cell">
                              <span className="cell-idx">[{i}]</span>
                              <span className="cell-val">{String(item)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="heap-raw-json">
                          {JSON.stringify(obj, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Queue / Buffer Box (Rendered when Queue state exists) */}
          {(currentStep.queueState || selectedPresetId === 'queue-bfs-simulation') && (
            <div className="memory-box queue-box">
              <div className="memory-box-header">
                <div className="box-title">
                  <ListOrdered size={14} className="box-icon queue" />
                  <span>Queue Buffer (FIFO Processing)</span>
                </div>
                <span className="box-meta">{(currentStep.queueState || []).length} item(s)</span>
              </div>

              <div className="queue-buffer-track">
                <span className="queue-end-label">Front (Dequeue)</span>
                <div className="queue-elements-row">
                  {(currentStep.queueState || []).map((qItem, qi) => (
                    <div key={qi} className="queue-node-box">
                      <span className="q-val">{String(qItem)}</span>
                      {qi < (currentStep.queueState || []).length - 1 && (
                        <ArrowRight size={12} className="q-arrow" />
                      )}
                    </div>
                  ))}
                  {(currentStep.queueState || []).length === 0 && (
                    <span className="q-empty">Empty Queue</span>
                  )}
                </div>
                <span className="queue-end-label">Rear (Enqueue)</span>
              </div>
            </div>
          )}

          {/* 4. Active Pointers & Variable References Box */}
          <div className="memory-box pointers-box">
            <div className="memory-box-header">
              <div className="box-title">
                <Workflow size={14} className="box-icon pointer" />
                <span>Pointers & Memory Addresses</span>
              </div>
            </div>

            <div className="pointers-list">
              {(currentStep.pointers || []).length === 0 ? (
                <div className="memory-empty-state">No dynamic pointer references at this step.</div>
              ) : (
                (currentStep.pointers || []).map((ptr, pi) => (
                  <div key={pi} className="pointer-link-chip">
                    <span className="ptr-from">{ptr.from}</span>
                    <ArrowRight size={12} className="ptr-arrow" />
                    <span className="ptr-to">{String(ptr.to)}</span>
                    <span className="ptr-type-pill">{ptr.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
