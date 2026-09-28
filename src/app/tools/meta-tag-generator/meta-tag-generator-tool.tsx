"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Code2, Copy, Download, FileCode2, Info, ListChecks, RotateCcw, ShieldCheck, Sparkles, TriangleAlert, Undo2, X } from "lucide-react";
import { buildMetaOutput, EMPTY_META_DRAFT, META_EXAMPLES, META_IMPORT_LIMIT, metaFieldLimit, ROBOTS_MODES, type MetaDraft, type MetaIssue, type MetaTextField } from "@/lib/meta-tags";
import type { MetaImportResult } from "@/lib/meta-tag-import";
import { MetaTagPreviews } from "./meta-tag-previews";

const inputClass = "w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-3 text-base shadow-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-sm";
const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45";
const primaryClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45";
type Snapshot = { draft: MetaDraft; notices: string[] };

function MetaField({ field, label, draft, onChange, errors, hint, placeholder, multiline = false, count }: {
  field: MetaTextField; label: string; draft: MetaDraft; onChange: (field: MetaTextField, value: string) => void;
  errors: MetaIssue[]; hint?: string; placeholder?: string; multiline?: boolean; count?: number;
}) {
  const error = errors.find(issue => issue.field === field);
  const id = `meta-${field}`;
  const props = {
    id, value: draft[field], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(field, event.target.value),
    placeholder, maxLength: metaFieldLimit(field), className: inputClass, dir: "auto", autoComplete: "off",
    "aria-invalid": Boolean(error), "aria-describedby": `${id}-help`,
  };
  return <div className="min-w-0"><div className="mb-2 flex items-center justify-between gap-2"><label htmlFor={id} className="text-sm font-semibold">{label}</label>{count !== undefined && <span data-testid={`${field}-count`} className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{count} characters</span>}</div>{multiline ? <textarea {...props} rows={field === "title" ? 2 : 3} className={`${inputClass} resize-y leading-relaxed`} /> : <input {...props} inputMode={["canonical", "image", "twitterImage"].includes(field) ? "url" : "text"} /> }<p id={`${id}-help`} className={`mt-1.5 text-xs leading-relaxed ${error ? "text-red-700 dark:text-red-300" : "text-muted-foreground"}`}>{error?.message || hint}</p></div>;
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm"><input id={id} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="size-4 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-primary" /><span>{label}</span></label>;
}

export function MetaTagGeneratorTool() {
  const [draft, setDraft] = useState<MetaDraft>({ ...EMPTY_META_DRAFT });
  const [format, setFormat] = useState<"html" | "next">("html");
  const [message, setMessage] = useState("");
  const [copyError, setCopyError] = useState(false);
  const [previous, setPrevious] = useState<Snapshot | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [candidate, setCandidate] = useState<MetaImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const importRequest = useRef(0);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const output = useMemo(() => buildMetaOutput(draft), [draft]);
  const code = format === "html" ? output.html : output.next;
  const currentCode = useRef(code);
  currentCode.current = code;
  const hasInput = (Object.keys(EMPTY_META_DRAFT) as (keyof MetaDraft)[]).some(field => draft[field] !== EMPTY_META_DRAFT[field]);
  const importedRobots = candidate ? buildMetaOutput(candidate.draft).robots || "Default (no extra restrictions)" : "";
  const fieldProps = { draft, errors: output.errors, onChange: (field: MetaTextField, value: string) => update(field, value as never) };

  function update<K extends keyof MetaDraft>(field: K, value: MetaDraft[K]) {
    setDraft(current => ({ ...current, [field]: value }));
    setMessage(""); setCopyError(false);
  }
  function replaceDraft(next: MetaDraft, nextNotices: string[], status: string) {
    setPrevious({ draft: { ...draft }, notices });
    setDraft({ ...next }); setNotices(nextNotices); setResetKey(key => key + 1);
    setMessage(status); setCopyError(false);
  }
  function focusField(field: keyof MetaDraft) {
    const element = document.getElementById(`meta-${field}`);
    let parent = element?.parentElement;
    while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    element?.focus();
  }
  async function copy() {
    if (!output.canExport) return;
    const selected = code;
    try {
      await navigator.clipboard.writeText(selected);
      if (currentCode.current !== selected) return;
      setCopyError(false); setMessage(`${format === "html" ? "HTML tags" : "Next.js Metadata"} copied. Review existing tags before installing.`);
    } catch {
      if (currentCode.current !== selected) return;
      setCopyError(true); setMessage("Clipboard access was blocked. The output is selected below; copy it manually.");
      codeRef.current?.focus(); codeRef.current?.select();
    }
  }
  function download() {
    if (!output.canExport) return;
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = format === "html" ? "meta-tags.html" : "page-metadata.ts";
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCopyError(false); setMessage("Download prepared. Merge the output with your existing page metadata; do not duplicate tags.");
  }
  async function analyzeImport() {
    const request = ++importRequest.current;
    setImportBusy(true); setCandidate(null); setImportError("");
    try {
      const { importMetaHtml } = await import("@/lib/meta-tag-import");
      const result = importMetaHtml(importText);
      if (request === importRequest.current) setCandidate(result);
    } catch (error) {
      if (request === importRequest.current) setImportError(error instanceof Error ? error.message : "Could not read these tags. No fields were changed.");
    } finally { if (request === importRequest.current) setImportBusy(false); }
  }

  return (
    <section id="meta-workspace" aria-label="Meta tag generator workspace" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-medium text-muted-foreground">Start with an example</span>{META_EXAMPLES.map(example => <button key={example.label} type="button" className={buttonClass} onClick={() => replaceDraft(example.draft, [], `${example.label} example loaded. Replace the example.com URLs and copy before publishing; Undo restores your previous inputs.`)}><Sparkles size={12} className="text-primary" aria-hidden="true" />{example.label}</button>)}</div>
        <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} aria-expanded={showImport} aria-controls="meta-import-panel" onClick={() => setShowImport(!showImport)}><FileCode2 size={14} aria-hidden="true" />Import HTML</button><button type="button" className={buttonClass} onClick={() => replaceDraft(EMPTY_META_DRAFT, [], "Inputs cleared. Undo restores the previous metadata; local images are not restored.")}><RotateCcw size={14} aria-hidden="true" />Reset</button>{previous && <button type="button" className={buttonClass} onClick={() => { setDraft(previous.draft); setNotices(previous.notices); setPrevious(null); setResetKey(key => key + 1); setMessage("Previous metadata restored. Local image previews are not restored."); setCopyError(false); }}><Undo2 size={14} aria-hidden="true" />Undo</button>}</div>
      </div>

      {showImport && <section id="meta-import-panel" aria-labelledby="meta-import-heading" className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 id="meta-import-heading" className="font-bold">Bring your existing tags</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Paste your head section, not a URL. Parsing is local: scripts, images and links are never executed or fetched. Up to {META_IMPORT_LIMIT.toLocaleString("en-US")} characters.</p></div><button type="button" aria-label="Close HTML import" className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { importRequest.current++; setImportBusy(false); setShowImport(false); }}><X size={16} aria-hidden="true" /></button></div>
        <label htmlFor="meta-import-source" className="mb-2 mt-4 block text-sm font-semibold">Existing HTML head</label>
        <textarea id="meta-import-source" dir="ltr" spellCheck={false} rows={5} maxLength={META_IMPORT_LIMIT} value={importText} onChange={event => { importRequest.current++; setImportBusy(false); setImportText(event.target.value); setCandidate(null); setImportError(""); }} placeholder={'<title>Your page title</title>\n<meta name="description" content="Your page summary">'} className={`${inputClass} font-mono text-xs!`} />
        <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={analyzeImport} disabled={importBusy || !importText.trim()} className={buttonClass}>{importBusy ? "Reading tags…" : "Read metadata"}</button><span className="text-xs text-muted-foreground">Current fields stay untouched until you choose Replace.</span></div>
        {importError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{importError}</p>}
        {candidate && <div className="mt-4 rounded-xl border border-border bg-card p-4"><p className="text-sm font-semibold">{candidate.fields.length} supported fields found</p><p dir="auto" className="mt-2 wrap-anywhere text-sm text-muted-foreground">Title: {candidate.draft.title || "No title tag found"}</p><p className="mt-1 wrap-anywhere text-xs text-muted-foreground">Canonical: {candidate.draft.canonical || "Not found"} · Robots: {importedRobots}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Import is not lossless: only supported fields and the first social image are retained. Keep other metadata, security settings and crawler-specific rules in the original page.</p>{candidate.notices.length > 0 && <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">{candidate.notices.map(note => <li key={note}>• {note}</li>)}</ul>}<button type="button" className={`${primaryClass} mt-4`} onClick={() => { replaceDraft(candidate.draft, candidate.notices, "Imported fields replaced the editor. Review the notices and validation before copying."); setShowImport(false); setCandidate(null); setImportText(""); }}>Replace fields with imported values</button></div>}
      </section>}

      <p role="status" aria-live="polite" aria-atomic="true" className={`min-h-5 text-sm ${copyError ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"}`}>{message || "Changes update your previews and code automatically. Nothing is saved after a reload."}</p>
      {notices.length > 0 && <details open className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"><summary className="cursor-pointer text-sm font-semibold text-amber-800 dark:text-amber-300">Import review notes ({notices.length})</summary><ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">{notices.map(note => <li key={note}>• {note}</li>)}</ul></details>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="meta-page-heading">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-4"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">01</span><div><h2 id="meta-page-heading" className="font-bold">Page essentials</h2><p className="mt-0.5 text-xs text-muted-foreground">The title, summary and preferred URL.</p></div></div>
            <div className="space-y-5 p-5 sm:p-6">
              <MetaField {...fieldProps} field="title" label="Page title" multiline count={output.characters.title} placeholder="e.g. A Practical Guide to Accessible Websites" hint="Include your brand only if needed. Character counts are editing aids, not Google limits." />
              <MetaField {...fieldProps} field="description" label="Meta description" multiline count={output.characters.description} placeholder="Describe what someone will find on this particular page." hint="Write a useful summary, not a list of keywords. Google may use different page text." />
              <MetaField {...fieldProps} field="canonical" label="Canonical page URL" placeholder="https://example.com/your-page" hint="Used for rel=canonical and og:url. Include https:// and remove fragments; no page is fetched." />
              <MetaField {...fieldProps} field="siteName" label="Site name (optional)" placeholder="Your brand or publication" hint="Used for og:site_name. It is not automatically added to your page title." />
            </div>
          </section>

          <details open className="rounded-2xl border border-border bg-card shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="mr-3 text-xs text-primary">02</span> Social cards <span className="ml-1 font-normal text-muted-foreground">· image &amp; sharing text</span></summary>
            <div className="space-y-5 border-t border-border p-5 sm:p-6">
              <div className="flex flex-wrap gap-x-6 gap-y-1"><Toggle id="meta-includeOpenGraph" label="Include Open Graph" checked={draft.includeOpenGraph} onChange={value => update("includeOpenGraph", value)} /><Toggle id="meta-includeTwitter" label="Include X / Twitter Card" checked={draft.includeTwitter} onChange={value => update("includeTwitter", value)} /></div>
              {(draft.includeOpenGraph || draft.includeTwitter) && <>
                <MetaField {...fieldProps} field="image" label="Social image URL" placeholder="https://example.com/images/share.jpg" hint="A public http(s) image URL, not a file on your computer. It is never fetched here." />
                <MetaField {...fieldProps} field="imageAlt" label="Image alt text" placeholder="Describe what is in the image" hint="Used for Open Graph and, by default, the X card. Blank optional tags are omitted." />
                <details className="rounded-xl border border-border bg-muted/30 p-4"><summary className="cursor-pointer text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary">Customize sharing text &amp; Open Graph details</summary><div className="mt-4 space-y-4">
                  <MetaField {...fieldProps} field="ogTitle" label="Social title (optional override)" placeholder={output.clean.title || "Uses your page title"} hint="Leave blank to use the page title. X also uses this unless overridden below." />
                  <MetaField {...fieldProps} field="ogDescription" label="Social description (optional override)" multiline placeholder={output.clean.description || "Uses your meta description"} />
                  {draft.includeOpenGraph && <>
                    <div className="grid gap-4 sm:grid-cols-2"><MetaField {...fieldProps} field="imageWidth" label="Image width (px)" placeholder="1200" hint="Enter the actual image dimensions, not a target." /><MetaField {...fieldProps} field="imageHeight" label="Image height (px)" placeholder="630" /></div>
                    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="meta-ogType" className="mb-2 block text-sm font-semibold">Page type</label><select id="meta-ogType" value={draft.ogType} onChange={event => update("ogType", event.target.value as MetaDraft["ogType"])} className={inputClass}><option value="website">Website</option><option value="article">Article / blog post</option></select></div><MetaField {...fieldProps} field="locale" label="Content locale (optional)" placeholder="en_US" hint="Language_TERRITORY, not hreflang." /></div>
                    {draft.ogType === "article" && <div className="grid gap-4 sm:grid-cols-2"><MetaField {...fieldProps} field="publishedTime" label="Published date (optional)" placeholder="2026-09-28" hint="ISO date, or a full timestamp with timezone. Never invent a fresh date." /><MetaField {...fieldProps} field="modifiedTime" label="Modified date (optional)" placeholder="2026-09-28T09:00:00Z" /></div>}
                  </>}
                </div></details>
                {draft.includeTwitter && <details className="rounded-xl border border-border bg-muted/30 p-4"><summary className="cursor-pointer text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary">X card settings &amp; overrides</summary><div className="mt-4 space-y-4">
                  <div><label htmlFor="meta-twitterCard" className="mb-2 block text-sm font-semibold">X card type</label><select id="meta-twitterCard" value={draft.twitterCard} onChange={event => update("twitterCard", event.target.value as MetaDraft["twitterCard"])} className={inputClass}><option value="summary_large_image">Large-image summary</option><option value="summary">Summary (compact image)</option></select></div>
                  <div className="grid gap-4 sm:grid-cols-2"><MetaField {...fieldProps} field="twitterSite" label="Site X username (optional)" placeholder="@yourbrand" /><MetaField {...fieldProps} field="twitterCreator" label="Creator X username (optional)" placeholder="@author" /></div>
                  <MetaField {...fieldProps} field="twitterTitle" label="X title (optional override)" placeholder={output.og.title || "Uses the social title"} />
                  <MetaField {...fieldProps} field="twitterDescription" label="X description (optional override)" multiline placeholder={output.og.description || "Uses the social description"} />
                  <MetaField {...fieldProps} field="twitterImage" label="X image URL (optional override)" placeholder={draft.image || "Uses the social image URL"} />
                  <MetaField {...fieldProps} field="twitterImageAlt" label="X image alt (optional override)" placeholder="Describe the X image" hint="A different X image needs its own alt text; it cannot use the local shared-image mockup." />
                </div></details>}
              </>}
            </div>
          </details>

          <details className="rounded-2xl border border-border bg-card shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="mr-3 text-xs text-primary">03</span> Crawling &amp; optional metadata</summary>
            <div className="space-y-5 border-t border-border p-5 sm:p-6">
              <div><label htmlFor="meta-robots" className="mb-2 block text-sm font-semibold">Robots directive</label><select id="meta-robots" value={draft.robots} onChange={event => update("robots", event.target.value as MetaDraft["robots"])} aria-describedby="meta-robots-help" className={inputClass}>{ROBOTS_MODES.map(mode => <option key={mode} value={mode}>{mode === "default" ? "Default — omit index/follow directives" : mode}</option>)}</select><p id="meta-robots-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">Index/follow are defaults, not a command to get indexed. Noindex removes search eligibility; it does not make a page private.</p></div>
              <Toggle id="meta-noSnippet" label="Disable text snippets (nosnippet)" checked={draft.noSnippet} onChange={value => update("noSnippet", value)} />
              {!draft.noSnippet && <MetaField {...fieldProps} field="maxSnippet" label="Maximum snippet length (optional)" placeholder="Leave blank for search-engine default" hint="-1: no limit; 0: no text snippet; positive integer: maximum characters. This does not set your meta description length." />}
              <div><label htmlFor="meta-maxImagePreview" className="mb-2 block text-sm font-semibold">Search image preview permission</label><select id="meta-maxImagePreview" value={draft.maxImagePreview} onChange={event => update("maxImagePreview", event.target.value as MetaDraft["maxImagePreview"])} className={inputClass}><option value="">Default — omit directive</option><option value="none">None</option><option value="standard">Standard</option><option value="large">Allow large previews</option></select></div>
              <MetaField {...fieldProps} field="author" label="Author name (optional)" placeholder="Author or organization" hint="Generates a name=author tag, not an article:author profile URL." />
              <MetaField {...fieldProps} field="keywords" label="Legacy meta keywords (optional)" placeholder="Only if another system needs this field" hint="Google ignores meta keywords for web ranking. This field does not perform keyword research." />
            </div>
          </details>
          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />Form text, pasted HTML and local preview images are processed in this tab, with no AI call or URL crawl. Reloading clears them. Site-wide services are covered by our <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.</p>
        </div>

        <div className="min-w-0 space-y-4">
          <MetaTagPreviews key={resetKey} draft={draft} output={output} />
          <section aria-labelledby="meta-output-heading" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 id="meta-output-heading" className="flex items-center gap-2 font-bold"><Code2 size={18} className="text-primary" aria-hidden="true" />Your generated code</h2><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{output.tagCount} HTML tags · escaped values</span></div>
            <div className="space-y-4 p-4 sm:p-5">
              <div role="group" aria-label="Output format" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">{(["html", "next"] as const).map(value => <button key={value} type="button" aria-pressed={format === value} onClick={() => { setFormat(value); setMessage(""); setCopyError(false); }} className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary ${format === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{value === "html" ? "HTML tags" : "Next.js Metadata"}</button>)}</div>
              {format === "html" ? <Toggle id="meta-includeDefaults" label="Include charset & viewport defaults" checked={draft.includeDefaults} onChange={value => update("includeDefaults", value)} /> : <p className="text-xs leading-relaxed text-muted-foreground">For a server page or layout in the App Router. Next.js adds charset and viewport. The absolute title avoids a parent brand suffix; null fields clear values. Keep existing language alternates and review file-based image metadata and framework fallbacks.</p>}
              {format === "next" && draft.includeOpenGraph && !draft.includeTwitter && <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">Next.js can derive X tags from Open Graph even with twitter: null. The X switch omits explicit configuration here; inspect the served HTML for framework-generated fallbacks.</p>}
              <label htmlFor="meta-code" className="sr-only">{format === "html" ? "Generated HTML tags" : "Generated Next.js Metadata"}</label>
              <textarea ref={codeRef} id="meta-code" data-testid="meta-code" readOnly dir="ltr" wrap="off" spellCheck={false} rows={12} value={code} className="block max-h-96 min-h-56 w-full min-w-0 resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              <div className="flex flex-wrap gap-2"><button type="button" onClick={copy} disabled={!output.canExport} className={primaryClass}><Copy size={15} aria-hidden="true" />Copy {format === "html" ? "HTML" : "Metadata"}</button><button type="button" onClick={download} disabled={!output.canExport} className={buttonClass}><Download size={15} aria-hidden="true" />Download</button><button type="button" onClick={() => { codeRef.current?.focus(); codeRef.current?.select(); }} className={buttonClass}>Select code</button></div>
              <p className="text-xs leading-relaxed text-muted-foreground">{!draft.title.trim() ? "Add a page title to enable copy and download." : output.errors.length ? "Fix invalid fields before exporting. Invalid values are omitted from the code preview." : "Review warnings, then merge with existing metadata. Do not add a second title, description or canonical."} {format === "html" && "This is a head fragment, not a whole HTML page."}</p>
            </div>
          </section>
          <section aria-labelledby="meta-checks-heading" className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="meta-checks-heading" className="flex items-center gap-2 text-sm font-bold"><ListChecks size={17} className="text-primary" aria-hidden="true" />Before you publish</h2><span className="text-[11px] text-muted-foreground">Checks, not an SEO score</span></div>
            {!hasInput ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Fill in your page details or choose an example. We will flag invalid URLs, missing social details and restrictive indexing settings.</p> : <>
              <p className="mt-3 flex items-center gap-2 text-xs font-medium">{output.errors.length ? <TriangleAlert size={14} className="text-red-600" aria-hidden="true" /> : <Check size={14} className="text-emerald-600" aria-hidden="true" />}{output.errors.length ? `${output.errors.length} invalid field${output.errors.length === 1 ? "" : "s"} to fix` : "No format errors detected"}<span className="font-normal text-muted-foreground">· {output.warnings.length} review notes</span></p>
              <ul className="mt-4 space-y-3">{[...output.errors.map(issue => ({ ...issue, error: true })), ...output.warnings.map(issue => ({ ...issue, error: false }))].map((issue, i) => <li key={`${issue.field}-${i}`} className="flex items-start gap-2"><Info size={14} className={`mt-0.5 shrink-0 ${issue.error ? "text-red-600 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`} aria-hidden="true" /><button type="button" onClick={() => focusField(issue.field)} className={`text-left text-xs leading-relaxed underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:ring-2 focus-visible:ring-primary ${issue.error ? "text-red-700 dark:text-red-300" : "text-muted-foreground"}`}>{issue.message}</button></li>)}</ul>
              <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">No server response, crawlability, image-host access or ranking check is performed. Verify the published page and its HTTP headers separately.</p>
            </>}
          </section>
        </div>
      </div>
    </section>
  );
}
