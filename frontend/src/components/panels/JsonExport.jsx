import { useState, useCallback } from 'react';
import { Copy, Download, CheckCheck, Code2 } from 'lucide-react';

/**
 * @param {{ data: object | null, filename?: string }} props
 */
export default function JsonExport({ data, filename = 'oceanwatch-report.json' }) {
  const [copied, setCopied] = useState(false);

  const json = data ? JSON.stringify(data, null, 2) : null;

  const copy = useCallback(async () => {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [json]);

  const download = useCallback(() => {
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [json, filename]);

  return (
    <div className="panel flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ocean-700">
        <div className="flex items-center gap-1.5">
          <Code2 size={13} className="text-cyan-dim" aria-hidden="true" />
          <span className="section-label">JSON Export</span>
        </div>
        {json && (
          <div className="flex items-center gap-1">
            <button
              onClick={copy}
              className="btn-ghost py-1 px-2 text-[11px]"
              aria-label="Copy JSON to clipboard"
            >
              {copied
                ? <><CheckCheck size={12} className="text-green-400" /> Copied</>
                : <><Copy size={12} /> Copy</>
              }
            </button>
            <button
              onClick={download}
              className="btn-ghost py-1 px-2 text-[11px]"
              aria-label={`Download ${filename}`}
            >
              <Download size={12} /> Save
            </button>
          </div>
        )}
      </div>

      {/* Code area */}
      <div className="flex-1 min-h-0 overflow-auto scrollable p-0">
        {json ? (
          <pre
            className="code-block h-full min-h-full border-0 rounded-none leading-relaxed text-[11px]"
            aria-label="JSON export preview"
          >
            <JsonHighlight json={json} />
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600 py-8">
            <Code2 size={24} aria-hidden="true" />
            <p className="text-xs">No data to export yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JsonHighlight({ json }) {
  const parts = [];
  let pos = 0;

  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let match;

  while ((match = re.exec(json)) !== null) {
    if (match.index > pos) {
      parts.push(<span key={pos}>{json.slice(pos, match.index)}</span>);
    }
    if (match[1] && match[2]) {
      parts.push(<span key={match.index} className="text-cyan-bright">{match[1]}</span>);
      parts.push(<span key={match.index + 'c'} className="text-slate-400">{match[2]}</span>);
    } else if (match[1]) {
      parts.push(<span key={match.index} className="text-green-400">{match[1]}</span>);
    } else if (match[3]) {
      parts.push(<span key={match.index} className="text-amber-400">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={match.index} className="text-sky-400">{match[4]}</span>);
    }
    pos = match.index + match[0].length;
  }

  if (pos < json.length) {
    parts.push(<span key={pos}>{json.slice(pos)}</span>);
  }

  return <>{parts}</>;
}
