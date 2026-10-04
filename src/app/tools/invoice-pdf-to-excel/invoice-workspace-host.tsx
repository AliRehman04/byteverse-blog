"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, RotateCcw } from "lucide-react";

export function InvoiceWorkspaceHost() {
  const [opened, setOpened] = useState(false);
  const [height, setHeight] = useState(940);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [slow, setSlow] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!opened) return;
    const sendTheme = () => frame.current?.contentWindow?.postMessage({ type: "byteverse-invoice-theme", dark: document.documentElement.classList.contains("dark") }, "*");
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== "null" || !event.data || typeof event.data !== "object") return;
      const message = event.data as Record<string, unknown>;
      if (Object.keys(message).length !== 2 || message.type !== "byteverse-invoice-resize" || !Number.isInteger(message.height)) return;
      setHeight(Math.min(2400, Math.max(500, message.height as number)));
      setReady(true);
      sendTheme();
    };
    const observer = new MutationObserver(sendTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("message", receive);
    const timer = window.setTimeout(() => setSlow(true), 15000);
    return () => { observer.disconnect(); window.removeEventListener("message", receive); window.clearTimeout(timer); };
  }, [opened, revision]);

  return (
    <section id="invoice-converter" aria-label="Invoice converter" className="scroll-mt-24">
      {!opened ? (
        <div className="rounded-3xl border border-teal-500/20 bg-card p-7 text-center shadow-xl shadow-slate-950/5 sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-300"><LockKeyhole size={25} aria-hidden="true" /></span>
          <h2 className="mt-5 text-2xl font-bold tracking-tight">Your files. Your browser. Your control.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Open a separate, sandboxed workspace to choose your invoices or try three fictional samples. Files are selected inside it, not on this page. No upload, AI service or automatic saving.</p>
          <button type="button" onClick={() => { setOpened(true); setSlow(false); }} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600">Open private converter <ArrowRight size={17} aria-hidden="true" /></button>
          <p className="mt-4 text-xs text-muted-foreground">Free XLSX &amp; CSV export · No account · Current desktop browsers recommended</p>
        </div>
      ) : (
        <>
          {!ready && <p role="status" className="mb-3 text-center text-sm text-muted-foreground">{slow ? "Still loading? Check your connection or reload the workspace. No files have been selected." : "Loading the self-contained workspace. PDF libraries load once; invoice processing stays local."}</p>}
          {!ready && slow && <button type="button" onClick={() => { setRevision(value => value + 1); setSlow(false); }} className="mx-auto mb-4 flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm"><RotateCcw size={15} aria-hidden="true" />Reload workspace</button>}
          <iframe key={revision} ref={frame} src="/invoice-workspace/frame.html" title="Private invoice PDF to Excel workspace" sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" translate="no" className="notranslate block w-full rounded-3xl border-0 bg-transparent" style={{ height }} />
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">This page receives only the workspace height; it does not receive invoice content. Leaving or reloading clears unsaved work. Browser extensions and your device security are outside this boundary.</p>
        </>
      )}
      <noscript><p className="mt-4 text-sm">Enable JavaScript to open the local converter. The instructions and supported-file details below remain available without it.</p></noscript>
    </section>
  );
}