import React from 'react';

/**
 * High-fidelity, official brand SVG icons for programming languages
 * Ensures zero missing logos, crisp scaling across UI tabs, explorer, headers, and status bar.
 */

export function JavaIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon java-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Java Logo"
    >
      <path
        fill="#0074BD"
        d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"
      />
      <path
        fill="#EA2D2E"
        d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"
      />
      <path
        fill="#0074BD"
        d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"
      />
      <path
        fill="#EA2D2E"
        d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z"
      />
      <path
        fill="#0074BD"
        d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"
      />
    </svg>
  );
}

export function PythonIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon python-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Python Logo"
    >
      <path
        fill="#3776AB"
        d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z"
        transform="translate(0 10.26)"
      />
      <path
        fill="#FFD43B"
        d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z"
        transform="translate(0 10.26)"
      />
    </svg>
  );
}

export function CppIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon cpp-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="C++ Logo"
    >
      <path
        fill="#00599C"
        d="M117.5 64c0-29.5-24-53.5-53.5-53.5S10.5 34.5 10.5 64s24 53.5 53.5 53.5 53.5-24 53.5-53.5z"
      />
      <path
        fill="#fff"
        d="M62.6 81.3c-9.6 0-17.3-7.8-17.3-17.3s7.8-17.3 17.3-17.3c6 0 11.3 3.1 14.3 7.8l9.6-5.5C72.2 41 67.6 38 62.6 38c-14.4 0-26 11.6-26 26s11.6 26 26 26c5 0 9.6-3 13.9-10.9l-9.6-5.5c-3 4.6-8.3 7.7-14.3 7.7z"
      />
      <path
        fill="#659AD2"
        d="M86 59h-3v-3c0-.6-.4-1-1-1s-1 .4-1 1v3h-3c-.6 0-1 .4-1 1s.4 1 1 1h3v3c0 .6.4 1 1 1s1-.4 1-1v-3h3c.6 0 1-.4 1-1s-.4-1-1-1zm16 0h-3v-3c0-.6-.4-1-1-1s-1 .4-1 1v3h-3c-.6 0-1 .4-1 1s.4 1 1 1h3v3c0 .6.4 1 1 1s1-.4 1-1v-3h3c.6 0 1-.4 1-1s-.4-1-1-1z"
      />
    </svg>
  );
}

export function CIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon c-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="C Logo"
    >
      <path
        fill="#A8B9CC"
        d="M117.5 64c0-29.5-24-53.5-53.5-53.5S10.5 34.5 10.5 64s24 53.5 53.5 53.5 53.5-24 53.5-53.5z"
      />
      <path
        fill="#00599C"
        d="M64 20C39.7 20 20 39.7 20 64s19.7 44 44 44c15.6 0 29.3-8.2 37.1-20.5l-16.5-9.5c-4.6 7.2-12.7 12-20.6 12-14.4 0-26-11.6-26-26s11.6-26 26-26c7.9 0 16 4.8 20.6 12l16.5-9.5C93.3 28.2 79.6 20 64 20z"
      />
    </svg>
  );
}

export function JsIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon js-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="JavaScript Logo"
    >
      <rect width="128" height="128" rx="18" fill="#F7DF1E" />
      <path
        fill="#000"
        d="M67.312 103.938c3.25 5.563 7.625 9.438 15.312 9.438 6.5 0 10.625-3.25 10.625-7.75 0-5.375-4.25-7.25-11.375-10.375l-3.875-1.688c-11.188-4.75-18.625-10.688-18.625-23.25 0-11.562 8.875-20.312 22.812-20.312 9.875 0 17 3.5 22.25 12.688l-9.875 6.312c-2.75-4.875-5.75-6.812-12.375-6.812-5.5 0-9.25 3.5-9.25 7.75 0 4.625 3.625 6.688 10.125 9.5l3.875 1.688c13 5.625 20.125 11.25 20.125 24.125 0 13.875-10.875 21.75-25.125 21.75-14.125 0-23.312-7.125-27.75-16.75l13.125-6.312v-.002zm-38.125 0c1.875 3.375 3.625 6.188 7.75 7.875 3.375 1.438 7.875 1.188 10.625-.188 2.625-1.375 4.312-4.125 4.312-11.875V51.062h15.25V100c0 14.125-8.25 21-20.312 21-11.188 0-18.312-5.75-22.125-13.812l14.5-3.25z"
      />
    </svg>
  );
}

export function TsIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon ts-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="TypeScript Logo"
    >
      <rect width="128" height="128" rx="18" fill="#3178C6" />
      <path
        fill="#fff"
        d="M34 46h38v10H58v46H44V56H34V46zm43 20c4.5-2.5 10-4 16-4 7 0 12 1.6 15.5 4.7 3.5 3 5.5 7.5 5.5 13.3 0 6-2 10.5-5.5 13.6-3.5 3-9 4.6-16 4.6-5.5 0-10.5-1-15.5-3v-11c4.5 2.5 9 3.7 14 3.7 3.5 0 6.2-.7 8-2 1.7-1.3 2.5-3.3 2.5-5.8 0-2.3-.8-4.1-2.5-5.4-1.7-1.3-4.5-2.2-8.3-2.8-5-.8-9-2.1-12-4-3-1.9-4.5-5-4.5-9.3 0-5.2 1.8-9.3 5.4-12.2C58.3 47.7 63.3 46 70 46c5 0 9.5.8 14 2.5l-4 9.5c-3.5-1.5-7-2.3-11-2.3-3.2 0-5.6.7-7.2 2-1.6 1.3-2.4 3-2.4 5.2 0 2.2.8 3.8 2.4 4.9 1.6 1.1 4.1 2 7.6 2.6z"
      />
    </svg>
  );
}

export function HtmlIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon html-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="HTML5 Logo"
    >
      <path fill="#E44D26" d="M19.1 113.8L8.6 1H119.4l-10.5 112.8L64 127z" />
      <path fill="#F16529" d="M64 117.8l37.2-10.3 8.8-97.5H64z" />
      <path
        fill="#EBEBEB"
        d="M64 53.6H46.1l-1.3-14.7H64V24.3H30.4l3.7 44.1H64zm0 39.8l-.2.1-15.6-4.2-1-11.2H32.4l1.9 22.1 29.7 8.2z"
      />
      <path
        fill="#fff"
        d="M63.9 53.6h17.9l-1.7 18.9-16.2 4.4v15.3l29.8-8.2 2.3-25.8.4-4.6.4-4.6.4-4.6H63.9zm0-29.3v14.6h34.6l.3-3.6.7-7.4.3-3.6z"
      />
    </svg>
  );
}

export function CssIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon css-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="CSS3 Logo"
    >
      <path fill="#1572B6" d="M19.1 113.8L8.6 1H119.4l-10.5 112.8L64 127z" />
      <path fill="#33A9DC" d="M64 117.8l37.2-10.3 8.8-97.5H64z" />
      <path
        fill="#fff"
        d="M64 53.6H46.1l-1.3-14.7H64V24.3H30.4l3.7 44.1H64zm0 39.8l-.2.1-15.6-4.2-1-11.2H32.4l1.9 22.1 29.7 8.2z"
      />
      <path
        fill="#EBEBEB"
        d="M63.9 53.6h17.9l-1.7 18.9-16.2 4.4v15.3l29.8-8.2 2.3-25.8.4-4.6.4-4.6.4-4.6H63.9zm0-29.3v14.6h34.6l.3-3.6.7-7.4.3-3.6z"
      />
    </svg>
  );
}

export function SqlIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lang-svg-icon sql-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="SQL / Database Logo"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" fill="#0284c7" fillOpacity="0.25" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function MarkdownIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="#38bdf8"
      className={`lang-svg-icon markdown-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Markdown Logo"
    >
      <path d="M14 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2z" />
      <path d="M2.5 11.5v-7h2.2l1.8 2.5 1.8-2.5h2.2v7h-1.5V7.5L7.5 9.7h-.9L5 7.5v4H2.5zm10.5-3.5h-1.5V5.5h-1.5V8H8.5l2.25 3.5 2.25-3.5z" />
    </svg>
  );
}

export function RustIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="#f97316"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lang-svg-icon rust-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Rust Logo"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8h3a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-3v4" />
      <path d="M13 12l3 4" />
    </svg>
  );
}

export function GoIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="#00add8"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lang-svg-icon go-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Go Logo"
    >
      <circle cx="8" cy="12" r="5" />
      <circle cx="17" cy="12" r="5" />
      <path d="M8 9a5 5 0 0 1 5 3" />
    </svg>
  );
}

export function GenericDocIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="#94a3b8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lang-svg-icon doc-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Document"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export function JupyterIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 44 48"
      width={size}
      height={size}
      className={`lang-svg-icon jupyter-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Jupyter Notebook Logo"
    >
      <path
        fill="#F37626"
        d="M22 0C13.2 0 5.4 4.5 1 11.5c4.1-3 9.4-4.8 15.2-4.8 11.5 0 21.2 7 24.3 16.7C39.6 10.3 31.7 0 22 0z"
      />
      <circle cx="7.5" cy="24" r="3.5" fill="#767677" />
      <circle cx="22" cy="24" r="3.5" fill="#767677" />
      <circle cx="36.5" cy="24" r="3.5" fill="#767677" />
      <path
        fill="#F37626"
        d="M22 48c8.8 0 16.6-4.5 21-11.5-4.1 3-9.4 4.8-15.2 4.8-11.5 0-21.2-7-24.3-16.7.9 13.1 8.8 23.4 18.5 23.4z"
      />
    </svg>
  );
}

export function AnacondaIcon({ size = 16, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`lang-svg-icon anaconda-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Anaconda Logo"
    >
      <circle cx="64" cy="64" r="60" fill="#3EB049" />
      <path
        fill="#fff"
        d="M64 20c-24.3 0-44 19.7-44 44s19.7 44 44 44 44-19.7 44-44-19.7-44-44-44zm0 80c-19.9 0-36-16.1-36-36s16.1-36 36-36 36 16.1 36 36-16.1 36-36 36z"
      />
      <path
        fill="#fff"
        d="M64 38c-14.4 0-26 11.6-26 26s11.6 26 26 26 26-11.6 26-26-11.6-26-26-26zm0 44c-9.9 0-18-8.1-18-18s8.1-18 18-18 18 8.1 18 18-8.1 18-18 18z"
      />
      <circle cx="64" cy="64" r="8" fill="#fff" />
    </svg>
  );
}

/**
 * Resolves canonical language key from file name or language object
 */
export function resolveLanguageKey(language, filename = '') {
  // 1. Check filename extension first (most accurate for workspace files)
  if (filename && typeof filename === 'string') {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'ipynb') {
      const lower = filename.toLowerCase();
      if (lower.includes('java')) return 'jupyter-java';
      if (lower.includes('cpp') || lower.includes('c++')) return 'jupyter-cpp';
      if (lower.includes('js') || lower.includes('javascript')) return 'jupyter-js';
      return 'jupyter';
    }
    if (ext === 'yml' || ext === 'yaml') return 'anaconda';
    if (ext === 'java') return 'java';
    if (ext === 'py' || ext === 'python') return 'python';
    if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'hpp') return 'cpp';
    if (ext === 'c' || ext === 'h') return 'c';
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs' || ext === 'jsx') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'sql') return 'sql';
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    if (ext === 'rs') return 'rust';
    if (ext === 'go') return 'go';
  }

  // 2. Check language object
  if (language && typeof language === 'object') {
    const id = Number(language.id);
    if (id === 62) return 'java';
    if (id === 71) return 'python';
    if (id === 54) return 'cpp';
    if (id === 50) return 'c';
    if (id === 63) return 'javascript';
    if (id === 74) return 'typescript';
    if (id === 0 || id === 98) return 'html';
    if (id === 1 || id === 97) return 'css';
    if (id === 82) return 'sql';
    if (id === 99) return 'markdown';
    if (id === 73) return 'rust';
    if (id === 60) return 'go';
    if (id === 710) return 'jupyter';
    if (id === 711) return 'anaconda';

    const str = `${language.name || ''} ${language.monacoLanguage || ''} ${language.extension || ''}`.toLowerCase();
    if (str.includes('ipynb') || str.includes('jupyter')) return 'jupyter';
    if (str.includes('anaconda') || str.includes('conda') || str.includes('yaml') || str.includes('yml')) return 'anaconda';
    if (str.includes('java') && !str.includes('javascript')) return 'java';
    if (str.includes('python')) return 'python';
    if (str.includes('c++') || str.includes('cpp')) return 'cpp';
    if (str.includes('javascript') || str === 'js') return 'javascript';
    if (str.includes('typescript') || str === 'ts') return 'typescript';
    if (str.includes('html')) return 'html';
    if (str.includes('css')) return 'css';
    if (str.includes('sql')) return 'sql';
    if (str.includes('markdown') || str.includes('md')) return 'markdown';
    if (str.includes('rust')) return 'rust';
    if (str.includes('go')) return 'go';
    if (language.name === 'C') return 'c';
  }

  return 'generic';
}

/**
 * Universal Language Icon Component
 * Renders pixel-perfect official brand SVG logos with seamless fallbacks.
 */
export default function LanguageIcon({ language, filename = '', size = 16, className = '', style = {} }) {
  const key = resolveLanguageKey(language, filename);

  switch (key) {
    case 'jupyter':
      return <JupyterIcon size={size} className={className} style={style} />;
    case 'jupyter-java':
      return (
        <span
          className={`jupyter-lang-composite-icon ${className}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}
          title="Java Interactive Notebook (.ipynb)"
        >
          <span style={{ fontSize: `${Math.max(12, Math.round(size * 0.95))}px`, lineHeight: 1 }}>☕</span>
        </span>
      );
    case 'jupyter-cpp':
      return (
        <span
          className={`jupyter-lang-composite-icon ${className}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}
          title="C++ Interactive Notebook (.ipynb)"
        >
          <span style={{ fontSize: `${Math.max(12, Math.round(size * 0.95))}px`, lineHeight: 1 }}>⚡</span>
        </span>
      );
    case 'jupyter-js':
      return (
        <span
          className={`jupyter-lang-composite-icon ${className}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}
          title="JavaScript Interactive Notebook (.ipynb)"
        >
          <span style={{ fontSize: `${Math.max(12, Math.round(size * 0.95))}px`, lineHeight: 1 }}>🟨</span>
        </span>
      );
    case 'anaconda':
      return <AnacondaIcon size={size} className={className} style={style} />;
    case 'java':
      return <JavaIcon size={size} className={className} style={style} />;
    case 'python':
      return <PythonIcon size={size} className={className} style={style} />;
    case 'cpp':
      return <CppIcon size={size} className={className} style={style} />;
    case 'c':
      return <CIcon size={size} className={className} style={style} />;
    case 'javascript':
      return <JsIcon size={size} className={className} style={style} />;
    case 'typescript':
      return <TsIcon size={size} className={className} style={style} />;
    case 'html':
      return <HtmlIcon size={size} className={className} style={style} />;
    case 'css':
      return <CssIcon size={size} className={className} style={style} />;
    case 'sql':
      return <SqlIcon size={size} className={className} style={style} />;
    case 'markdown':
      return <MarkdownIcon size={size} className={className} style={style} />;
    case 'rust':
      return <RustIcon size={size} className={className} style={style} />;
    case 'go':
      return <GoIcon size={size} className={className} style={style} />;
    default:
      // If language has a custom emoji icon, render it neatly
      if (language?.icon && typeof language.icon === 'string' && language.icon.trim() && language.icon !== '📄') {
        return (
          <span
            className={`lang-custom-icon ${className}`}
            style={{ fontSize: `${size}px`, lineHeight: 1, display: 'inline-flex', alignItems: 'center', ...style }}
          >
            {language.icon}
          </span>
        );
      }
      return <GenericDocIcon size={size} className={className} style={style} />;
  }
}
