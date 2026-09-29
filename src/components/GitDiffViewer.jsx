import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { computeLineDiff } from '../services/gitService';
import LanguageIcon from './LanguageIcon';
import './GitDiffViewer.css';

export default function GitDiffViewer({ file, baselineContent, onClose, onOpenInEditor }) {
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'inline'
  const { handleSelectFile } = useApp();

  const currentContent = file?.content ?? '';
  const originalContent = baselineContent ?? '';

  const diffData = useMemo(() => {
    return computeLineDiff(originalContent, currentContent);
  }, [originalContent, currentContent]);

  const filePath = useMemo(() => {
    if (!file?.name) return '';
    const parts = file.name.split('/');
    if (parts.length > 1) {
      return parts.slice(0, -1).join('/');
    }
    return 'root';
  }, [file]);

  const fileName = useMemo(() => {
    if (!file?.name) return 'Untitled';
    return file.name.split('/').pop() || file.name;
  }, [file]);

  return (
    <div className="git-diff-viewer flex flex-col flex-1 h-full w-full bg-surface min-w-0 overflow-hidden font-body-md">
      {/* Diff Header Tab */}
      <div className="diff-header-bar flex items-center justify-between bg-surface-container-low border-b border-outline-variant px-space-md py-1.5 shrink-0">
        <div className="flex items-center space-x-space-sm truncate">
          <LanguageIcon filename={fileName} className="text-[16px]" />
          <span className="font-headline-sm text-body-sm text-on-surface font-semibold truncate">{fileName}</span>
          <span className="text-label-sm text-on-surface-variant truncate">{filePath} — Git Diff</span>
        </div>

        <div className="flex items-center space-x-space-sm text-on-surface-variant text-label-sm shrink-0">
          <span className="text-tertiary font-bold">+{diffData.additions}</span>
          <span className="text-error font-bold">-{diffData.deletions}</span>

          <div className="flex items-center space-x-1 ml-space-md border-l border-outline-variant pl-space-sm">
            <button
              type="button"
              className={`p-1 rounded transition-colors ${viewMode === 'inline' ? 'bg-surface-container-high text-primary' : 'hover:text-on-surface'}`}
              onClick={() => setViewMode('inline')}
              title="Inline Unified View"
            >
              <span className="material-symbols-outlined text-[16px]">view_agenda</span>
            </button>
            <button
              type="button"
              className={`p-1 rounded transition-colors ${viewMode === 'split' ? 'bg-surface-container-high text-primary' : 'hover:text-on-surface'}`}
              onClick={() => setViewMode('split')}
              title="Split Side-by-Side View"
            >
              <span className="material-symbols-outlined text-[16px]">vertical_split</span>
            </button>
            {onOpenInEditor && (
              <button
                type="button"
                className="p-1 hover:text-on-surface rounded text-on-surface-variant ml-1 transition-colors"
                onClick={() => onOpenInEditor(file)}
                title="Edit this file"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="p-1 hover:text-error rounded text-on-surface-variant transition-colors"
                onClick={onClose}
                title="Close Diff"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Diff Content View */}
      {viewMode === 'split' ? (
        <div className="diff-split-container flex-1 flex overflow-hidden font-body-sm text-body-sm">
          {/* Left Panel: Original / Working Tree Baseline */}
          <div className="diff-panel original-panel flex-1 border-r border-outline-variant overflow-x-auto overflow-y-auto bg-surface-dim/40 flex">
            {/* Line numbers column */}
            <div className="diff-gutter w-12 py-space-sm bg-surface-dim text-right pr-space-sm select-none text-on-surface-variant/40 space-y-1 font-mono text-[12px] shrink-0 border-r border-outline-variant/30">
              {diffData.leftRows.map((row, idx) => (
                <div
                  key={`left-num-${idx}`}
                  className={row.type === 'deleted' ? 'bg-error/15 text-error font-bold' : ''}
                >
                  {row.type === 'deleted' ? '-' : (row.num ?? ' ')}
                </div>
              ))}
            </div>

            {/* Code lines */}
            <div className="diff-code-column flex-1 py-space-sm pl-space-sm space-y-1 font-mono whitespace-pre text-on-surface-variant text-[12.5px]">
              {diffData.leftRows.map((row, idx) => (
                <div
                  key={`left-code-${idx}`}
                  className={`diff-code-line ${row.type === 'deleted' ? 'diff-line-deleted bg-error/20 text-error' : ''} ${row.type === 'empty' ? 'diff-line-empty' : ''}`}
                >
                  {row.text || '\u00A0'}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Modified / Current Working Tree */}
          <div className="diff-panel modified-panel flex-1 overflow-x-auto overflow-y-auto bg-surface flex">
            {/* Line numbers column */}
            <div className="diff-gutter w-12 py-space-sm bg-surface-dim text-right pr-space-sm select-none text-on-surface-variant/40 space-y-1 font-mono text-[12px] shrink-0 border-r border-outline-variant/30">
              {diffData.rightRows.map((row, idx) => (
                <div
                  key={`right-num-${idx}`}
                  className={row.type === 'added' ? 'bg-tertiary/15 text-tertiary font-bold' : ''}
                >
                  {row.type === 'added' ? '+' : (row.num ?? ' ')}
                </div>
              ))}
            </div>

            {/* Code lines */}
            <div className="diff-code-column flex-1 py-space-sm pl-space-sm space-y-1 font-mono whitespace-pre text-on-surface text-[12.5px]">
              {diffData.rightRows.map((row, idx) => (
                <div
                  key={`right-code-${idx}`}
                  className={`diff-code-line ${row.type === 'added' ? 'diff-line-added bg-tertiary/20 text-tertiary' : ''} ${row.type === 'empty' ? 'diff-line-empty' : ''}`}
                >
                  {row.text || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Inline Diff View */
        <div className="diff-inline-container flex-1 overflow-x-auto overflow-y-auto bg-surface font-body-sm text-body-sm flex">
          <div className="diff-gutter py-space-sm bg-surface-dim text-right px-2 select-none text-on-surface-variant/40 space-y-1 font-mono text-[11.5px] shrink-0 border-r border-outline-variant/30 flex space-x-2">
            <div className="w-6 text-right">
              {diffData.inlineRows.map((row, idx) => (
                <div key={`inline-old-${idx}`} className={row.type === 'deleted' ? 'text-error font-semibold' : ''}>
                  {row.oldNum ?? ' '}
                </div>
              ))}
            </div>
            <div className="w-6 text-right">
              {diffData.inlineRows.map((row, idx) => (
                <div key={`inline-new-${idx}`} className={row.type === 'added' ? 'text-tertiary font-semibold' : ''}>
                  {row.newNum ?? ' '}
                </div>
              ))}
            </div>
          </div>

          <div className="diff-code-column flex-1 py-space-sm pl-space-sm space-y-1 font-mono whitespace-pre text-on-surface text-[12.5px]">
            {diffData.inlineRows.map((row, idx) => (
              <div
                key={`inline-code-${idx}`}
                className={`diff-code-line ${
                  row.type === 'deleted'
                    ? 'diff-line-deleted bg-error/20 text-error'
                    : row.type === 'added'
                    ? 'diff-line-added bg-tertiary/20 text-tertiary'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="diff-marker select-none inline-block w-4 font-bold text-center">
                  {row.type === 'deleted' ? '-' : row.type === 'added' ? '+' : ' '}
                </span>
                {row.text || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
