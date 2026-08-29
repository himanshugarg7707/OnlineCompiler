import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { RotateCw, ExternalLink, Globe, Terminal, Trash2 } from 'lucide-react';
import './WebPreviewPanel.css';

export default function WebPreviewPanel() {
  const { state } = useApp();
  const { files, code, activeFileId } = state;

  const [logs, setLogs] = useState([]);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);

  // Find HTML, CSS, and JS content from workspace
  const htmlFile = files.find((f) => f.name.endsWith('.html')) || (activeFileId && files.find((f) => f.id === activeFileId)?.name.endsWith('.html') ? files.find((f) => f.id === activeFileId) : null);
  const cssFiles = files.filter((f) => f.name.endsWith('.css'));
  const jsFiles = files.filter((f) => f.name.endsWith('.js'));

  const rawHtml = htmlFile ? htmlFile.content : `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 90vh;
      color: #333;
      text-align: center;
    }
  </style>
</head>
<body>
  <h2>🌐 Web Sandbox</h2>
  <p>Create an <strong>index.html</strong> file in the File Explorer to preview your live web app!</p>
</body>
</html>`;

  // Combined CSS and JS
  const combinedCss = cssFiles.map((f) => f.content).join('\n');
  const combinedJs = jsFiles.map((f) => f.content).join('\n');

  // Build the complete srcdoc HTML bundle with console interceptor
  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          ${combinedCss}
        </style>
        <script>
          // Console Interceptor to post messages to parent
          (function() {
            function sendLog(type, args) {
              try {
                window.parent.postMessage({
                  type: 'FULLCODE_WEB_LOG',
                  level: type,
                  message: Array.from(args).map(function(arg) {
                    if (typeof arg === 'object') {
                      try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
                    }
                    return String(arg);
                  }).join(' ')
                }, '*');
              } catch(e) {}
            }
            var origLog = console.log;
            var origWarn = console.warn;
            var origError = console.error;
            console.log = function() { sendLog('log', arguments); origLog.apply(console, arguments); };
            console.warn = function() { sendLog('warn', arguments); origWarn.apply(console, arguments); };
            console.error = function() { sendLog('error', arguments); origError.apply(console, arguments); };
            window.onerror = function(msg, url, line) {
              sendLog('error', [msg + ' (line ' + line + ')']);
            };
          })();
        </script>
      </head>
      <body>
        ${rawHtml.includes('<body') ? rawHtml.replace(/<body[^>]*>/, '').replace('</body>', '') : rawHtml}
        <script>
          try {
            ${combinedJs}
          } catch(err) {
            console.error(err.message);
          }
        </script>
      </body>
    </html>
  `;

  // Listen for console logs from iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'FULLCODE_WEB_LOG') {
        setLogs((prev) => [
          ...prev,
          {
            level: e.data.level,
            message: e.data.message,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRefresh = () => {
    setLogs([]);
    setIframeKey((k) => k + 1);
  };

  const handleOpenNewTab = () => {
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="web-preview-container">
      {/* Sandbox Toolbar */}
      <div className="web-preview-toolbar">
        <div className="web-toolbar-left">
          <Globe size={14} className="web-icon" />
          <span className="web-url-bar">http://localhost:3000/sandbox</span>
        </div>
        <div className="web-toolbar-actions">
          <button className="btn-web-action" onClick={handleRefresh} title="Reload Preview">
            <RotateCw size={13} />
            <span>Reload</span>
          </button>
          <button className="btn-web-action" onClick={handleOpenNewTab} title="Open in New Tab">
            <ExternalLink size={13} />
            <span>New Tab</span>
          </button>
        </div>
      </div>

      {/* Live Sandboxed iframe */}
      <div className="web-preview-frame-wrap">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          srcDoc={srcDoc}
          title="Web Sandbox Live Preview"
          sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"
          className="web-preview-iframe"
        />
      </div>

      {/* Embedded Live Console Logs */}
      {logs.length > 0 && (
        <div className="web-preview-console">
          <div className="console-header">
            <div className="console-header-title">
              <Terminal size={12} />
              <span>Console Output ({logs.length})</span>
            </div>
            <button className="btn-clear-console" onClick={() => setLogs([])} title="Clear Console">
              <Trash2 size={11} />
              <span>Clear</span>
            </button>
          </div>
          <div className="console-logs-list">
            {logs.map((log, idx) => (
              <div key={idx} className={`console-log-line ${log.level}`}>
                <span className="log-badge">{log.level}</span>
                <span className="log-text">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
