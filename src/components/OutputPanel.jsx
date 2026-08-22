import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { Terminal, Keyboard, BrainCircuit, Sparkles } from 'lucide-react';
import './OutputPanel.css';

const TABS = [
  { id: 'output', label: 'Output', icon: Terminal },
  { id: 'input', label: 'Input', icon: Keyboard },
  { id: 'explanation', label: 'AI Explanation', icon: BrainCircuit },
];

export default function OutputPanel() {
  const [activeTab, setActiveTab] = useState('output');
  const { state, dispatch, handleGenerateInput } = useApp();
  const {
    output,
    stderr,
    compileOutput,
    executionStatus,
    executionTime,
    executionMemory,
    stdin,
    inputDescription,
    aiExplanation,
  } = state;

  const hasError = stderr || compileOutput;
  const isRunning = executionStatus === 'compiling' || executionStatus === 'running';

  // Auto-switch to explanation tab when AI explanation is available
  if (aiExplanation && activeTab === 'output') {
    // Don't auto-switch, but show indicator
  }

  return (
    <div className="output-panel">
      {/* Tab Bar */}
      <div className="output-tabs">
        <div className="tab-list">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const hasNotification =
              (tab.id === 'explanation' && aiExplanation) ||
              (tab.id === 'output' && (output || hasError));
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {hasNotification && <span className="tab-dot" />}
              </button>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="execution-status">
          {isRunning && (
            <div className="status-running">
              <div className="spinner" />
              <span>
                {executionStatus === 'compiling' ? 'Compiling...' : 'Running...'}
              </span>
            </div>
          )}
          {executionStatus === 'success' && (
            <div className="status-success">
              <span className="status-dot green" />
              <span>Done</span>
              {executionTime && <span className="status-time">{executionTime}s</span>}
              {executionMemory && (
                <span className="status-memory">
                  {(executionMemory / 1024).toFixed(1)}MB
                </span>
              )}
            </div>
          )}
          {executionStatus === 'error' && (
            <div className="status-error">
              <span className="status-dot red" />
              <span>Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="output-content">
        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="output-view">
            {isRunning ? (
              <div className="output-placeholder running">
                <div className="loading-animation">
                  <div className="loading-bar" />
                  <div className="loading-bar" />
                  <div className="loading-bar" />
                </div>
                <span>
                  {executionStatus === 'compiling'
                    ? '⚙️ Compiling your code...'
                    : '🚀 Executing...'}
                </span>
              </div>
            ) : output || hasError ? (
              <pre className={`output-text ${hasError ? 'error' : 'success'}`}>
                {hasError && (
                  <div className="error-output">
                    {compileOutput || stderr}
                  </div>
                )}
                {output && <div className="success-output">{output}</div>}
              </pre>
            ) : (
              <div className="output-placeholder">
                <Terminal size={40} strokeWidth={1} />
                <span>Click <strong>Run</strong> to see output here</span>
                <span className="placeholder-hint">or press Ctrl+Enter</span>
              </div>
            )}
          </div>
        )}

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="input-view">
            <div className="input-header">
              <span className="input-label">Standard Input (stdin)</span>
              <button
                className="btn-auto-input"
                onClick={handleGenerateInput}
              >
                <Sparkles size={14} />
                <span>Auto-Generate Input</span>
              </button>
            </div>
            <textarea
              className="stdin-textarea"
              value={stdin}
              onChange={(e) =>
                dispatch({ type: 'SET_STDIN', payload: e.target.value })
              }
              placeholder="Enter input values here...&#10;Each line is a separate input."
              spellCheck={false}
            />
            {inputDescription && (
              <div className="input-description md-content animate-slide-up">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {inputDescription}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* AI Explanation Tab */}
        {activeTab === 'explanation' && (
          <div className="explanation-view">
            {aiExplanation ? (
              <div className="md-content animate-slide-up">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {aiExplanation}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="output-placeholder">
                <BrainCircuit size={40} strokeWidth={1} />
                <span>AI will explain errors in plain English</span>
                <span className="placeholder-hint">
                  Run code with an error to see AI analysis
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
