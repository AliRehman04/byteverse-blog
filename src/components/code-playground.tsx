"use client";

import { useState, useRef, useCallback } from "react";
import { Play, X, Terminal } from "lucide-react";

interface CodePlaygroundProps {
  code: string;
  language: string;
  children: React.ReactNode;
}

export function CodePlayground({ code, language, children }: CodePlaygroundProps) {
  const [output, setOutput] = useState<string[] | null>(null);
  const [running, setRunning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isRunnable = /^(javascript|js|typescript|ts|html)$/.test(language);

  const runCode = useCallback(() => {
    if (!isRunnable) return;
    setRunning(true);
    setOutput([]);

    if (language === "html") {
      // For HTML, render directly in iframe
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(code);
      doc.close();
      setRunning(false);
      setOutput(["▶ HTML rendered below"]);
      return;
    }

    // For JS/TS, execute in sandboxed iframe with console capture
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const wrappedCode = `
      <script>
        const __output = [];
        const __origConsole = { log: console.log, error: console.error, warn: console.warn };
        console.log = (...args) => {
          __output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
          window.parent.postMessage({ type: 'console', lines: [...__output] }, '*');
        };
        console.error = (...args) => {
          __output.push('ERROR: ' + args.map(a => String(a)).join(' '));
          window.parent.postMessage({ type: 'console', lines: [...__output] }, '*');
        };
        console.warn = (...args) => {
          __output.push('WARN: ' + args.map(a => String(a)).join(' '));
          window.parent.postMessage({ type: 'console', lines: [...__output] }, '*');
        };
        try {
          ${code}
        } catch(e) {
          __output.push('ERROR: ' + e.message);
          window.parent.postMessage({ type: 'console', lines: [...__output] }, '*');
        }
        if (__output.length === 0) {
          window.parent.postMessage({ type: 'console', lines: ['(no output)'] }, '*');
        }
        window.parent.postMessage({ type: 'done' }, '*');
      <\/script>
    `;

    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      if (e.data?.type === "console") {
        setOutput(e.data.lines);
      }
      if (e.data?.type === "done") {
        setRunning(false);
        window.removeEventListener("message", handleMessage);
      }
    };
    window.addEventListener("message", handleMessage);

    // Timeout safety
    setTimeout(() => {
      setRunning(false);
      window.removeEventListener("message", handleMessage);
    }, 5000);

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${wrappedCode}</body></html>`);
    doc.close();
  }, [code, language, isRunnable]);

  if (!isRunnable) return <>{children}</>;

  return (
    <div>
      {/* Original code block with Run button overlay */}
      <div className="relative">
        {children}
        <button
          onClick={runCode}
          disabled={running}
          className="absolute top-2.5 right-12 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 z-10"
          title="Run code"
        >
          <Play size={12} />
          {running ? "Running..." : "Run"}
        </button>
      </div>

      {/* Output panel */}
      {output !== null && (
        <div className="relative mt-1 rounded-xl overflow-hidden ring-1 ring-border bg-[#0d1117]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <Terminal size={12} />
              Output
            </span>
            <button onClick={() => setOutput(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="p-4 text-sm font-mono text-slate-300 max-h-60 overflow-auto whitespace-pre-wrap">
            {output.length === 0 ? (
              <span className="text-slate-500">Running...</span>
            ) : (
              output.map((line, i) => (
                <div key={i} className={line.startsWith("ERROR:") ? "text-red-400" : line.startsWith("WARN:") ? "text-yellow-400" : ""}>
                  {line}
                </div>
              ))
            )}
          </div>
          {language === "html" && (
            <div className="border-t border-white/5 p-2">
              <iframe
                ref={iframeRef}
                sandbox="allow-scripts"
                className="w-full h-40 bg-white rounded"
                title="HTML preview"
              />
            </div>
          )}
        </div>
      )}

      {/* Hidden iframe for JS execution */}
      {language !== "html" && (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          className="hidden"
          title="Code sandbox"
        />
      )}
    </div>
  );
}
