"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, Check, CheckCheck, Code2, Copy, Globe2, Info,
  ListChecks, Monitor, Plus, Ruler, Search, ShieldCheck,
  Smartphone, Trash2, TriangleAlert, Type,
} from "lucide-react";
import {
  analyzeTitle, BRAND_INPUT_LIMIT, buildFullTitle, DESCRIPTION_INPUT_LIMIT,
  graphemes, KEYWORD_INPUT_LIMIT, layoutTitle, PREVIEW_FONT, PREVIEW_MODELS,
  previewAddress, TITLE_INPUT_LIMIT, titleExamples, titleTag,
  type MeasureText, type PreviewDevice, type TitleDraft, type TitleSeparator,
} from "@/lib/seo-title";

const inputClass = "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-base sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-45";

type SavedDraft = TitleDraft & { id: number; description: string; url: string };

function useFontMeasurement() {
  const [state, setState] = useState<{ measure: MeasureText | null; failed: boolean }>({ measure: null, failed: false });
  useEffect(() => {
    let active = true;
    Promise.resolve(document.fonts?.ready).then(() => {
      if (!active) return;
      try {
        const context = document.createElement("canvas").getContext("2d");
        if (!context) { setState({ measure: null, failed: true }); return; }
        context.font = PREVIEW_FONT;
        setState({ measure: (text) => context.measureText(text).width, failed: false });
      } catch { setState({ measure: null, failed: true }); }
    }).catch(() => { if (active) setState({ measure: null, failed: true }); });
    return () => { active = false; };
  }, []);
  return state;
}

export function SeoTitleAnalyzerTool() {
  const [draft, setDraft] = useState<TitleDraft>({ ...titleExamples[0] });
  const [description, setDescription] = useState<string>(titleExamples[0].description);
  const [url, setUrl] = useState("https://example.com/guides/image-compression");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewWidth, setPreviewWidth] = useState(0);
  const [saved, setSaved] = useState<SavedDraft[]>([]);
  const [message, setMessage] = useState("");
  const [copyError, setCopyError] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);
  const { measure, failed } = useFontMeasurement();
  const analysis = useMemo(() => analyzeTitle(draft), [draft]);
  const model = PREVIEW_MODELS[device];
  const address = previewAddress(url);
  const layout = useMemo(() => measure && previewWidth > 0
    ? layoutTitle(analysis.fullTitle, previewWidth, model.lines, measure)
    : null, [analysis.fullTitle, measure, previewWidth, model.lines]);
  const fullWidth = measure ? measure(analysis.fullTitle) : null;
  const alreadySaved = saved.some(item => buildFullTitle(item) === analysis.fullTitle && item.keyword === draft.keyword);
  const fitLabel = !analysis.fullTitle ? "Add a title" : !layout ? "Not measured" : layout.truncated ? "Clipped here" : "Fits this preview";

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const update = () => setPreviewWidth(Math.floor(element.getBoundingClientRect().width));
    const frame = requestAnimationFrame(update);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", update); };
  }, [device]);

  function updateDraft(key: keyof TitleDraft, value: string) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setMessage("");
    setCopyError(false);
  }

  async function copy(asHtml = false) {
    if (!analysis.fullTitle) return;
    try {
      await navigator.clipboard.writeText(asHtml ? titleTag(draft) : analysis.fullTitle);
      setCopyError(false);
      setMessage(asHtml ? "Escaped title tag copied. Paste it into your page's head or use your CMS title field." : "Full title copied, including the brand suffix.");
    } catch {
      setCopyError(true);
      setMessage("Clipboard access was blocked. Select and copy the full title or HTML below manually.");
    }
  }

  function saveDraft() {
    if (!analysis.fullTitle || alreadySaved || saved.length >= 3) return;
    const snapshot = { ...draft, description, url, id: nextId.current++ };
    setSaved(previous => [...previous, snapshot]);
    setCopyError(false);
    setMessage("Draft added to comparison. Saved only in this tab until you reload.");
  }

  return (
    <section id="title-workspace" aria-label="SEO title workspace" className="scroll-mt-24 space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Type size={18} aria-hidden="true" /></span>
              <h2 className="font-bold">Your title workspace</h2>
            </div>
            <button type="button" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary" onClick={() => {
              setDraft({ title: "", brand: "", keyword: "", separator: " | " });
              setDescription(""); setUrl(""); setMessage(""); setCopyError(false); inputRef.current?.focus();
            }}>Clear inputs</button>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="seo-title-input" className="mb-2 block text-sm font-semibold">Page title <span className="font-normal text-muted-foreground">without the brand suffix</span></label>
              <textarea ref={inputRef} id="seo-title-input" dir="auto" value={draft.title} onChange={event => updateDraft("title", event.target.value)} rows={3} maxLength={TITLE_INPUT_LIMIT} aria-describedby="title-input-help" placeholder="e.g. Free JSON Formatter & Validator" className={`${inputClass} resize-y leading-relaxed`} />
              <p id="title-input-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">Paste title text, not HTML. Extra whitespace is collapsed. Input capped at {TITLE_INPUT_LIMIT} code units to keep editing responsive—not an SEO limit.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
              <div>
                <label htmlFor="seo-title-brand" className="mb-2 block text-sm font-semibold">Brand suffix <span className="font-normal text-muted-foreground">optional</span></label>
                <input id="seo-title-brand" dir="auto" value={draft.brand} onChange={event => updateDraft("brand", event.target.value)} maxLength={BRAND_INPUT_LIMIT} placeholder="Your brand" className={inputClass} />
              </div>
              <div>
                <label htmlFor="seo-title-separator" className="mb-2 block text-sm font-semibold">Separator</label>
                <select id="seo-title-separator" value={draft.separator} onChange={event => updateDraft("separator", event.target.value as TitleSeparator)} className={inputClass}>
                  <option value=" | ">Pipe |</option><option value=" - ">Dash -</option><option value=" · ">Dot ·</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="seo-title-keyword" className="mb-2 block text-sm font-semibold">Target phrase <span className="font-normal text-muted-foreground">optional</span></label>
              <input id="seo-title-keyword" dir="auto" value={draft.keyword} onChange={event => updateDraft("keyword", event.target.value)} maxLength={KEYWORD_INPUT_LIMIT} placeholder="e.g. json formatter" className={inputClass} aria-describedby="keyword-help" />
              <p id="keyword-help" className="mt-2 text-xs text-muted-foreground">Checks literal wording in the main title, not search volume or semantic relevance.</p>
            </div>
            <details className="rounded-xl border border-border bg-muted/30 p-4">
              <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Preview URL &amp; description <span className="font-normal text-muted-foreground">optional</span></summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="seo-preview-url" className="mb-2 block text-sm font-medium">Display URL</label>
                  <input id="seo-preview-url" value={url} onChange={event => setUrl(event.target.value)} maxLength={500} className={inputClass} placeholder="https://example.com/your-page" aria-describedby="preview-url-help" aria-invalid={!address.valid} />
                  <p id="preview-url-help" className={`mt-2 text-xs ${address.valid ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}`}>{address.valid ? "Display only: no page is fetched. Query strings and fragments are not displayed." : "Use an http(s) URL without credentials. The placeholder is shown until it is valid."}</p>
                </div>
                <div>
                  <label htmlFor="seo-preview-description" className="mb-2 block text-sm font-medium">Meta description</label>
                  <textarea id="seo-preview-description" dir="auto" value={description} onChange={event => setDescription(event.target.value)} maxLength={DESCRIPTION_INPUT_LIMIT} rows={3} className={`${inputClass} resize-y`} placeholder="A short, accurate summary of this page." />
                  <p className="mt-2 text-xs text-muted-foreground">{graphemes(description).length} characters. The preview clips to three lines; Google may use different page text.</p>
                </div>
              </div>
            </details>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Try an example:</span>
              {titleExamples.map(example => (
                <button key={example.label} type="button" className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { setDraft({ ...example }); setDescription(example.description); setMessage(""); setCopyError(false); }}>
                  {example.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-5">
              <button type="button" disabled={!analysis.fullTitle} onClick={() => copy()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"><Copy size={15} aria-hidden="true" />Copy full title</button>
              <button type="button" disabled={!analysis.fullTitle || saved.length >= 3 || alreadySaved} onClick={saveDraft} className={buttonClass}><Plus size={16} aria-hidden="true" />{alreadySaved ? "Draft saved" : "Add to compare"}</button>
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Title analysis stays in this tab. No AI calls, URL fetches or account needed. Reloading clears comparison drafts.</p>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-card to-violet-500/5 p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[11px] font-semibold uppercase tracking-widest text-primary">See what takes up space</p><h2 className="mt-1 text-lg font-bold">Search result preview</h2></div>
              <div role="group" aria-label="Preview device" className="inline-flex rounded-xl border border-border bg-card p-1">
                {(["desktop", "mobile"] as const).map(value => {
                  const Icon = value === "desktop" ? Monitor : Smartphone;
                  return <button key={value} type="button" aria-pressed={device === value} onClick={() => setDevice(value)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${device === value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}><Icon size={14} aria-hidden="true" />{PREVIEW_MODELS[value].label}</button>;
                })}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-xs text-slate-500"><Search size={14} aria-hidden="true" />Illustrative organic result · not a live SERP</div>
              <div className="mx-auto w-full" style={{ maxWidth: model.width }}>
                <div className="mb-3 flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Globe2 size={18} aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{draft.brand.trim() || address.host}</p><p className="truncate text-xs text-slate-500">{address.host} › {address.path.replace(/^\//, "").replace(/\//g, " › ")}</p></div>
                </div>
                <div ref={textRef} className="w-full">
                  <p data-testid="title-serp-preview" dir="auto" className="m-0 whitespace-pre-wrap wrap-anywhere text-[#1a0dab]" style={{ font: PREVIEW_FONT, lineHeight: "1.4", minHeight: model.lines * 28 }}>
                    {analysis.fullTitle ? (layout ? layout.lines.join("\n") : analysis.fullTitle) : "Your page title will appear here"}
                  </p>
                  <p className="mt-2 line-clamp-3 wrap-anywhere text-sm leading-relaxed text-slate-600" dir="auto">{description.trim() || "Add an optional description to see how it sits below the title. This is not a prediction of Google's snippet."}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span data-testid="preview-fit" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-semibold ${layout?.truncated ? "bg-amber-500/10 text-amber-800 dark:text-amber-300" : "bg-primary/10 text-primary"}`}>{layout?.truncated ? <TriangleAlert size={13} aria-hidden="true" /> : <Ruler size={13} aria-hidden="true" />}{fitLabel}</span>
              <span className="text-muted-foreground">{previewWidth || "—"}px visible width · {model.lines} {model.lines === 1 ? "line" : "lines"} · 20px Arial</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Desktop model: up to 580px, one line. Mobile model: up to 360px, two lines. Smaller windows reduce the visible width. These are our preview settings, not Google limits; Google can rewrite titles.</p>
          </div>

          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4"><dt className="text-xs text-muted-foreground">Full characters</dt><dd data-testid="title-character-count" className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{analysis.characters}</dd><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{analysis.coreCharacters} main + brand/separator</p></div>
            <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4"><dt className="text-xs text-muted-foreground">Approx. width</dt><dd data-testid="title-pixel-width" className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{fullWidth === null ? "—" : Math.round(fullWidth)}<span className="ml-1 text-xs font-normal text-muted-foreground">px</span></dd><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Full title, before wrapping</p></div>
            <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4"><dt className="text-xs text-muted-foreground">Main-title words</dt><dd data-testid="title-word-count" className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{analysis.words}</dd><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">No ideal word-count score</p></div>
          </dl>
          {failed && <p role="status" className="rounded-xl border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-300">Pixel measurement is unavailable in this browser. Character counts and editing still work; preview text is shown without measured clipping.</p>}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full title · ready to copy</h3><button type="button" onClick={() => copy(true)} disabled={!analysis.fullTitle} className={`${buttonClass} text-xs`}><Code2 size={14} aria-hidden="true" />Copy title HTML</button></div>
            <p data-testid="full-title" className="select-text wrap-anywhere text-sm leading-relaxed" dir="auto">{analysis.fullTitle || "Enter a main title to get started."}</p>
            <details className="mt-3 border-t border-border pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">View escaped HTML</summary><pre className="mt-2 whitespace-pre-wrap wrap-anywhere rounded-lg bg-muted p-3 text-xs">{titleTag(draft) || "No title yet."}</pre></details>
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" aria-atomic="true" className={`min-h-6 text-sm ${copyError ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{message}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="title-checklist-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="title-checklist-heading" className="flex items-center gap-2 text-lg font-bold"><ListChecks size={19} className="text-primary" aria-hidden="true" />Editorial checks</h2><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Guidance, not an SEO score</span></div>
          <ul className="space-y-4">
            {analysis.checks.map(check => {
              const Icon = check.status === "ok" ? Check : check.status === "review" ? TriangleAlert : Info;
              return <li key={check.id} className="flex items-start gap-3"><span className={`mt-0.5 rounded-lg p-1.5 ${check.status === "review" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : check.status === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}><Icon size={15} aria-hidden="true" /></span><div><h3 className="text-sm font-semibold">{check.label}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.note}</p></div></li>;
            })}
          </ul>
        </section>
        <section aria-labelledby="title-compare-heading" className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between gap-3"><h2 id="title-compare-heading" className="flex items-center gap-2 text-lg font-bold"><CheckCheck size={19} className="text-primary" aria-hidden="true" />Compare drafts</h2><span className="text-xs tabular-nums text-muted-foreground">{saved.length}/3 saved</span></div>
          <p className="mb-5 text-xs leading-relaxed text-muted-foreground">Save a title, change its angle and compare. Each draft keeps its brand, target phrase and preview details. This is a writing comparison, not an A/B traffic test.</p>
          {saved.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center"><span className="rounded-full bg-primary/10 p-3 text-primary"><Plus size={20} aria-hidden="true" /></span><p className="text-sm font-medium">A clearer version starts with a comparison.</p><p className="text-xs text-muted-foreground">Choose “Add to compare” above. Up to three drafts, in this tab only.</p></div> : <ol className="space-y-3">{saved.map((item, index) => {
            const result = analyzeTitle(item);
            const itemWidth = measure ? Math.round(measure(result.fullTitle)) : null;
            return <li key={item.id} className="rounded-xl border border-border p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Draft {index + 1}</span><button type="button" aria-label={`Remove draft ${index + 1}`} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { setSaved(previous => previous.filter(other => other.id !== item.id)); setCopyError(false); setMessage("Draft removed from this tab."); }}><Trash2 size={14} aria-hidden="true" /></button></div><p className="wrap-anywhere text-sm font-medium" dir="auto">{result.fullTitle}</p><p className="mt-2 text-xs text-muted-foreground">{result.characters} chars · {itemWidth ?? "—"}px · {result.keywordMatch === null ? "No target phrase" : result.keywordMatch ? "Target phrase found" : "Target phrase not found"}</p><button type="button" className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { setDraft({ title: item.title, brand: item.brand, keyword: item.keyword, separator: item.separator }); setDescription(item.description); setUrl(item.url); setCopyError(false); setMessage(`Draft ${index + 1} loaded into the editor.`); inputRef.current?.focus(); }}><ArrowDown size={13} aria-hidden="true" />Use draft {index + 1}</button></li>;
          })}</ol>}
        </section>
      </div>
    </section>
  );
}