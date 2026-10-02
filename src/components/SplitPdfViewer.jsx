import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Upload,
  Download,
  X,
  Code2,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
  const [isDragOver, setIsDragOver] = useState(false);
  const pdfData = state.splitPdfData;

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
          <div className="split-pdf-viewer-wrap">
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
