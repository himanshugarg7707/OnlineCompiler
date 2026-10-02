import { useRef, useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Upload,
  Download,
  X,
  Code2,
  Sparkles,
  Pencil,
  Highlighter,
  Eraser,
  Undo2,
  Trash2,
  MousePointer,
  Hand,
  Check,
  Palette,
  Eye,
  EyeOff,
} from 'lucide-react';
import './SplitPdfViewer.css';

// Generates an authentic sample PDF blob with problem description & DSA challenge
function createSampleChallengePdfBlob() {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 4 0 R >> >>
   /Contents 5 0 R
>>
endobj
4 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica-Bold
>>
endobj
5 0 obj
<< /Length 720 >>
stream
BT
/F1 20 Tf
50 730 Td
(Online Compiler Problem Sheet: DSA Challenge) Tj
/F1 12 Tf
0 -36 Td
(Topic: Two Sum & Efficient Array Hashing) Tj
0 -24 Td
(Difficulty: Medium | Time Limit: 2.0s | Memory Limit: 256MB) Tj
0 -32 Td
(Problem Statement:) Tj
0 -18 Td
(Given an array of integers 'nums' and an integer 'target', return indices of) Tj
0 -16 Td
(the two numbers such that they add up to target.) Tj
0 -16 Td
(You may assume each input has exactly one solution and cannot use same element twice.) Tj
0 -30 Td
(Example 1:) Tj
0 -18 Td
(  Input: nums = [2, 7, 11, 15], target = 9) Tj
0 -16 Td
(  Output: [0, 1]  (Because nums[0] + nums[1] == 9)) Tj
0 -30 Td
(Example 2:) Tj
0 -18 Td
(  Input: nums = [3, 2, 4], target = 6) Tj
0 -16 Td
(  Output: [1, 2]) Tj
0 -32 Td
(Constraints:) Tj
0 -18 Td
(  - 2 <= nums.length <= 10^4) Tj
0 -16 Td
(  - -10^9 <= nums[i] <= 10^9) Tj
0 -16 Td
(  - Only one valid answer exists.) Tj
0 -36 Td
(Tip: Implement your solution in the code editor on the left pane and click Run!) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000325 00000 n 
trailer
<< /Size 6
   /Root 1 0 R
>>
startxref
1100
%%EOF`;

  return new Blob([content], { type: 'application/pdf' });
}

const PRESET_COLORS = [
  { name: 'Amber Glow', hex: '#facc15' },
  { name: 'Crimson Red', hex: '#ef4444' },
  { name: 'Cyan Neon', hex: '#06b6d4' },
  { name: 'Emerald', hex: '#22c55e' },
  { name: 'Purple Ray', hex: '#a855f7' },
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Deep Onyx', hex: '#0f172a' },
];

export default function SplitPdfViewer() {
  const {
    state,
    handleUploadSplitPdf,
    handleCloseSplitPdf,
    handleSetSplitPaneType,
    handleToggleSplitView,
    showToast,
  } = useApp();

  const fileInputRef = useRef(null);
  const viewerWrapRef = useRef(null);
  const canvasRef = useRef(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const pdfData = state.splitPdfData;

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  // 'slide': Hover / slide mouse without dragging creates ink directly
  // 'drag': Classic click and drag to ink
  const [drawTriggerMode, setDrawTriggerMode] = useState('slide');
  const [isPenDown, setIsPenDown] = useState(true); // In slide mode, whether pen is currently trailing
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [inkColor, setInkColor] = useState('#facc15'); // Default highlighter amber
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokes, setStrokes] = useState([]);
  const [isDrawingsVisible, setIsDrawingsVisible] = useState(true);
  const [gestureToast, setGestureToast] = useState(null);

  // References for active drawing loop without React state delay
  const isInteractingRef = useRef(false);
  const currentPointsRef = useRef([]);

  // 4-Finger Gesture Detection (also supports 3 fingers for accessibility): Toggles drawing mode on and off
  const handleTouchGesture = useCallback(
    (e) => {
      if (e.touches && (e.touches.length === 4 || e.touches.length === 3)) {
        e.preventDefault();
        const count = e.touches.length;
        setIsDrawingMode((prev) => {
          const next = !prev;
          setGestureToast(
            next
              ? `✨ Drawing Mode ON (${count} Fingers Detected)`
              : `Drawing Mode OFF (${count} Fingers Detected)`
          );
          setTimeout(() => setGestureToast(null), 2400);
          showToast(
            next
              ? `🎨 PDF Inking Activated via ${count}-Finger Touch!`
              : `PDF Inking Disabled (${count} Fingers)`
          );
          return next;
        });
      }
    },
    [showToast]
  );

  // Register gesture listener with passive: false so preventDefault() stops pinch-zoom
  useEffect(() => {
    const wrap = viewerWrapRef.current;
    if (!wrap) return;

    const onTouch = (e) => handleTouchGesture(e);
    wrap.addEventListener('touchstart', onTouch, { passive: false });
    return () => {
      wrap.removeEventListener('touchstart', onTouch);
    };
  }, [handleTouchGesture]);

  // Keyboard shortcut: Space toggles pen lift / down in slide mode, Escape exits drawing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDrawingMode) return;
      if (e.key === ' ' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setIsPenDown((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsDrawingMode(false);
        showToast('Exited Drawing Mode');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode, showToast]);

  // Redraw all strokes onto canvas with retina resolution
  const renderStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isDrawingsVisible) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const allStrokes = [...strokes];
    if (currentPointsRef.current.length > 0) {
      allStrokes.push({
        tool: activeTool,
        color: inkColor,
        width: strokeWidth,
        points: currentPointsRef.current,
      });
    }

    allStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width * 2.5;
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 0.42;
        ctx.lineWidth = stroke.width * 3.5;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = stroke.width;
      }

      const pts = stroke.points;
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.restore();
  }, [strokes, isDrawingsVisible, activeTool, inkColor, strokeWidth]);

  // Adjust canvas size when viewer wrap is resized
  useEffect(() => {
    const wrap = viewerWrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const updateCanvasSize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      renderStrokes();
    };

    updateCanvasSize();
    const ro = new ResizeObserver(() => updateCanvasSize());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [renderStrokes]);

  // Helper to extract canvas coordinates from mouse or touch event
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Start a new stroke
  const startStroke = (coords) => {
    isInteractingRef.current = true;
    currentPointsRef.current = [coords];
    renderStrokes();
  };

  // Append point to active stroke
  const appendStroke = (coords) => {
    if (!isInteractingRef.current) return;
    const pts = currentPointsRef.current;
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dx = coords.x - last.x;
      const dy = coords.y - last.y;
      // Filter out minuscule jitter for smooth lines
      if (dx * dx + dy * dy < 2) return;
    }
    pts.push(coords);
    renderStrokes();
  };

  // Finish and record stroke
  const finishStroke = () => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    const finishedPts = currentPointsRef.current;
    currentPointsRef.current = [];
    if (finishedPts.length > 0) {
      setStrokes((prev) => [
        ...prev,
        {
          tool: activeTool,
          color: inkColor,
          width: strokeWidth,
          points: finishedPts,
        },
      ]);
    }
  };

  // Mouse / Pointer Event Handlers
  const handlePointerDown = (e) => {
    if (!isDrawingMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // Only left click

    if (drawTriggerMode === 'slide') {
      // In Slide Mode: Clicking toggles pen down / pen lifted so you can reposition without inking
      setIsPenDown((prev) => {
        const next = !prev;
        if (next) {
          const coords = getCanvasCoords(e);
          startStroke(coords);
        } else {
          finishStroke();
        }
        return next;
      });
    } else {
      // Classic drag mode
      const coords = getCanvasCoords(e);
      startStroke(coords);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingMode) return;
    const coords = getCanvasCoords(e);

    if (drawTriggerMode === 'slide') {
      // Slide Mode: moving the mouse freely trails ink if pen is down
      if (!isPenDown) return;
      if (!isInteractingRef.current) {
        startStroke(coords);
      } else {
        appendStroke(coords);
      }
    } else {
      // Drag Mode: only ink while button is held down
      if (isInteractingRef.current) {
        appendStroke(coords);
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingMode) return;
    if (drawTriggerMode === 'drag') {
      finishStroke();
    }
  };

  const handlePointerLeave = () => {
    if (!isDrawingMode) return;
    finishStroke();
  };

  // Undo last drawn stroke
  const handleUndo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, prev.length - 1);
    });
  };

  // Clear all annotations
  const handleClear = () => {
    if (strokes.length === 0) return;
    setStrokes([]);
    currentPointsRef.current = [];
    showToast('Annotations cleared');
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF document (.pdf) ⚠️');
      return;
    }
    handleUploadSplitPdf(file, file.name);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please drop a valid PDF document (.pdf) ⚠️');
      return;
    }
    handleUploadSplitPdf(file, file.name);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleLoadSamplePdf = () => {
    const blob = createSampleChallengePdfBlob();
    handleUploadSplitPdf(blob, 'DSA_Challenge_ProblemSheet.pdf');
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="split-pdf-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={onFileInputChange}
      />

      {/* 3-Finger Gesture Visual Toast */}
      {gestureToast && (
        <div className="pdf-gesture-pill-toast">
          <span>{gestureToast}</span>
        </div>
      )}

      {/* PDF Header Bar */}
      <div className="split-pdf-header">
        <div className="split-pdf-header-left">
          <span className="split-pdf-icon-badge">
            <FileText size={14} />
          </span>
          <span className="split-pdf-title" title={pdfData ? pdfData.name : 'PDF Document Viewer'}>
            {pdfData ? pdfData.name : 'PDF Document Viewer'}
          </span>
          {pdfData?.size ? (
            <span className="split-pdf-size-badge">{formatSize(pdfData.size)}</span>
          ) : null}
        </div>

        <div className="split-pdf-header-right">
          {/* Main Drawing Mode Toggle Button */}
          <button
            type="button"
            className={`split-pdf-action-btn ${isDrawingMode ? 'active-draw-btn' : ''}`}
            onClick={() => {
              setIsDrawingMode((prev) => {
                const next = !prev;
                showToast(next ? '🎨 Drawing Mode ON (Slide to Ink)' : 'Drawing Mode OFF');
                return next;
              });
            }}
            title="Toggle Drawing / Annotation Mode (or tap with 4 fingers on screen)"
          >
            <Pencil size={12} className={isDrawingMode ? 'pulse-anim' : ''} />
            <span>{isDrawingMode ? 'Drawing Active' : 'Drawing Mode'}</span>
            <span
              className="draw-color-pip"
              style={{ backgroundColor: isDrawingMode ? inkColor : '#64748b' }}
            />
          </button>

          <button
            type="button"
            className="split-pdf-action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload or Open a PDF from device"
          >
            <Upload size={12} />
            <span>Upload PDF</span>
          </button>

          {!pdfData && (
            <button
              type="button"
              className="split-pdf-action-btn highlight"
              onClick={handleLoadSamplePdf}
              title="Open Sample DSA Question Paper"
            >
              <Sparkles size={12} />
              <span>Sample Question</span>
            </button>
          )}

          {pdfData?.url && (
            <a
              href={pdfData.url}
              download={pdfData.name || 'document.pdf'}
              className="split-pdf-action-btn"
              title="Download this PDF"
            >
              <Download size={12} />
              <span>Download</span>
            </a>
          )}

          <button
            type="button"
            className="split-pdf-action-btn"
            onClick={() => handleSetSplitPaneType('file')}
            title="Switch back to second code file"
          >
            <Code2 size={12} />
            <span>Code File</span>
          </button>

          <button
            type="button"
            className="split-pdf-action-btn danger"
            onClick={() => handleToggleSplitView(false)}
            title="Close Split View"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main PDF Viewport */}
      <div className="split-pdf-body">
        {pdfData?.url ? (
          <div className="split-pdf-viewer-wrap" ref={viewerWrapRef}>
            {/* Drawing Mode Floating Toolbar */}
            {isDrawingMode && (
              <div className="pdf-drawing-toolbar">
                {/* Mode Selector: Slide (No Drag) vs Drag */}
                <div className="draw-tool-group">
                  <button
                    type="button"
                    className={`draw-mode-chip ${drawTriggerMode === 'slide' ? 'active' : ''}`}
                    onClick={() => {
                      setDrawTriggerMode('slide');
                      setIsPenDown(true);
                    }}
                    title="Slide / Hover Inking: Simply slide finger or move cursor without holding down click"
                  >
                    <MousePointer size={12} />
                    <span>Slide (No Drag)</span>
                  </button>

                  <button
                    type="button"
                    className={`draw-mode-chip ${drawTriggerMode === 'drag' ? 'active' : ''}`}
                    onClick={() => setDrawTriggerMode('drag')}
                    title="Standard Hold & Drag Inking"
                  >
                    <Hand size={12} />
                    <span>Click & Drag</span>
                  </button>
                </div>

                <div className="draw-toolbar-divider" />

                {/* Inking Status in Slide Mode */}
                {drawTriggerMode === 'slide' && (
                  <button
                    type="button"
                    className={`draw-pen-status-pill ${isPenDown ? 'pen-down' : 'pen-lifted'}`}
                    onClick={() => setIsPenDown((p) => !p)}
                    title="Click or press Spacebar to toggle pen up/down"
                  >
                    <span className="status-dot" />
                    <span>{isPenDown ? 'Pen Inking' : 'Pen Lifted'}</span>
                    <span className="kbd-shortcut">Space</span>
                  </button>
                )}

                <div className="draw-toolbar-divider" />

                {/* Tool Selector: Pen / Highlighter / Eraser */}
                <div className="draw-tool-group">
                  <button
                    type="button"
                    className={`draw-tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
                    onClick={() => setActiveTool('pen')}
                    title="Pen (Solid Ink)"
                  >
                    <Pencil size={13} />
                    <span>Pen</span>
                  </button>

                  <button
                    type="button"
                    className={`draw-tool-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
                    onClick={() => setActiveTool('highlighter')}
                    title="Highlighter (Semi-transparent)"
                  >
                    <Highlighter size={13} />
                    <span>Highlight</span>
                  </button>

                  <button
                    type="button"
                    className={`draw-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setActiveTool('eraser')}
                    title="Eraser (Erase Strokes)"
                  >
                    <Eraser size={13} />
                    <span>Eraser</span>
                  </button>
                </div>

                <div className="draw-toolbar-divider" />

                {/* Color Swatches & Custom Picker */}
                {activeTool !== 'eraser' && (
                  <div className="draw-color-group">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        className={`draw-color-swatch ${inkColor === c.hex ? 'selected' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => setInkColor(c.hex)}
                        title={c.name}
                      >
                        {inkColor === c.hex && (
                          <Check
                            size={10}
                            color={c.hex === '#ffffff' || c.hex === '#facc15' ? '#000000' : '#ffffff'}
                          />
                        )}
                      </button>
                    ))}

                    <label className="draw-custom-color-label" title="Pick any custom color">
                      <input
                        type="color"
                        value={inkColor}
                        onChange={(e) => setInkColor(e.target.value)}
                        className="draw-color-native-input"
                      />
                      <Palette size={13} />
                    </label>
                  </div>
                )}

                <div className="draw-toolbar-divider" />

                {/* Stroke Thickness */}
                <div className="draw-size-group">
                  {[2, 4, 8].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`draw-size-btn ${strokeWidth === size ? 'active' : ''}`}
                      onClick={() => setStrokeWidth(size)}
                      title={`Stroke Size: ${size}px`}
                    >
                      <span
                        className="size-dot"
                        style={{
                          width: `${Math.max(4, size * 1.5)}px`,
                          height: `${Math.max(4, size * 1.5)}px`,
                          backgroundColor: inkColor,
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="draw-toolbar-divider" />

                {/* Undo & Clear */}
                <div className="draw-tool-group">
                  <button
                    type="button"
                    className="draw-action-icon-btn"
                    onClick={handleUndo}
                    disabled={strokes.length === 0}
                    title="Undo Last Stroke"
                  >
                    <Undo2 size={13} />
                  </button>

                  <button
                    type="button"
                    className="draw-action-icon-btn danger"
                    onClick={handleClear}
                    disabled={strokes.length === 0}
                    title="Clear All Annotations"
                  >
                    <Trash2 size={13} />
                  </button>

                  <button
                    type="button"
                    className="draw-action-icon-btn"
                    onClick={() => setIsDrawingsVisible((v) => !v)}
                    title={isDrawingsVisible ? 'Hide Annotations' : 'Show Annotations'}
                  >
                    {isDrawingsVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>

                  <button
                    type="button"
                    className="draw-action-icon-btn close"
                    onClick={() => setIsDrawingMode(false)}
                    title="Done Drawing (Close Overlay)"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Gesture Hint Banner in Drawing Mode */}
            {isDrawingMode && (
              <div className="draw-floating-hint">
                <span>
                  {drawTriggerMode === 'slide'
                    ? '✨ Slide / Move mouse across PDF to ink • Space or click to lift pen'
                    : '✍️ Press and drag cursor across PDF to draw'}
                </span>
                <span className="gesture-note">✋ 4 fingers anywhere toggles mode</span>
              </div>
            )}

            {/* High-Performance Canvas Overlay for Inking */}
            <canvas
              ref={canvasRef}
              className={`split-pdf-drawing-canvas ${
                isDrawingMode ? 'active' : 'passive'
              } ${isDrawingMode && drawTriggerMode === 'slide' ? (isPenDown ? 'pen-active' : 'pen-up') : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            />

            {/* Underlying PDF Display */}
            <object
              data={pdfData.url}
              type="application/pdf"
              className="split-pdf-object"
            >
              <iframe
                src={pdfData.url}
                title="PDF Document"
                className="split-pdf-iframe"
              >
                <div className="pdf-fallback-msg">
                  <p>Unable to display PDF directly in your browser.</p>
                  <a href={pdfData.url} download={pdfData.name} className="btn-pdf-download-fallback">
                    Download {pdfData.name}
                  </a>
                </div>
              </iframe>
            </object>
          </div>
        ) : (
          <div
            className={`split-pdf-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-card">
              <div className="dropzone-icon-circle">
                <FileText size={36} />
              </div>
              <h3>Open & View PDF Side-by-Side</h3>
              <p>
                Upload your assignment sheets, lecture notes, question papers, or research
                diagrams to code right beside them.
              </p>

              <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-browse-pdf"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  <span>Choose PDF File</span>
                </button>

                <button
                  type="button"
                  className="btn-sample-pdf"
                  onClick={handleLoadSamplePdf}
                >
                  <Sparkles size={14} />
                  <span>Try Sample Problem PDF</span>
                </button>
              </div>

              <span className="dropzone-hint">Or simply drag and drop any .pdf document anywhere here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

