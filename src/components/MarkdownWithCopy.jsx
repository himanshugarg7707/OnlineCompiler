import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function readText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(readText).join('');
  return readText(node?.props?.children);
}

function CodeBlock({ children, ...props }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const code = readText(children);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const area = document.createElement('textarea');
      area.value = code;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="markdown-code-block">
      <button type="button" className="markdown-code-copy" onClick={copy} aria-label={copied ? 'Code copied' : 'Copy code'}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}

export default function MarkdownWithCopy({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>{children}</ReactMarkdown>;
}
