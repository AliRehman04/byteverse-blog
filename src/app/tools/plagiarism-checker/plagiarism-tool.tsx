"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowRightLeft, BookOpen,
  Check, ChevronDown, Clipboard, Copy, FileSearch, FileText, Info,
  Layers, Loader2, Plus, RotateCcw, Search, Settings2, ShieldCheck,
  Sparkles, Upload, X,
} from "lucide-react";
import { getInputStats } from "@/lib/similarity/engine";
import { inputProblem, manualSearchUrl, readTextFile } from "@/lib/similarity/input";
import { buildComparisonReport, formatCoverage, needsCompactReport, REVIEW_LABELS } from "@/lib/similarity/report";
import { COMPARISON_SAMPLE, REPETITION_SAMPLE } from "@/lib/similarity/samples";
import {
  DEFAULT_MATCH_OPTIONS, SIMILARITY_LIMITS,
  type CheckMode, type CheckResponse, type MatchLength, type MatchingPassage,
  type MatchOptions, type ReportSnapshot, type ReviewNote, type SimilarityResult,
  type SourceInput,
} from "@/lib/similarity/types";
import { TextHighlights } from "./text-highlights";
import "./similarity.css";

type Snapshot = Omit<ReportSnapshot, "reviews">;
type Confirmation =
  | { kind: "clear" }
  | { kind: "sample" }
  | { kind: "import"; target: string; text: string; fileName: string };
type EvidenceFilter = "all" | "unreviewed";
const initialSource = (): SourceInput => ({ id: "source-1", label: "Source 1", text: "" });
const count = (value: number) => value.toLocaleString("en-US");
const EMPTY_REVIEW: ReviewNote = { status: "unreviewed", note: "" };

function PassageText({ text }: { text: string }) {
  let end = Math.min(text.length, 1_200);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
  return <><p className="sim-passage-text" dir="auto">{text.slice(0, end)}{end < text.length ? "…" : ""}</p>{end < text.length && <p className="sim-explain-line">Excerpt shortened for readability. The highlighted document and source panes retain the full passage.</p>}</>;
}

function TextInput({ id, label, value, onChange, onImport, disabled = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  onImport: (file: File) => void;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const stats = useMemo(() => getInputStats(value), [value]);
  const overLimit = stats.words > SIMILARITY_LIMITS.maxWords || stats.characters > SIMILARITY_LIMITS.maxChars;
  return (
    <div className="sim-editor">
      <div className="sim-editor-actions">
        <label htmlFor={id} className="sim-editor-label"><FileText size={15} aria-hidden="true" />{label}</label>
        <button type="button" className="sim-text-button" disabled={disabled} onClick={() => fileInput.current?.click()}><Upload size={14} aria-hidden="true" />Import text</button>
        <input ref={fileInput} type="file" accept=".txt,.md,text/plain,text/markdown" hidden aria-label={`Import ${label}`} onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onImport(file);
        }} />
      </div>
      <textarea id={id} dir="auto" value={value} disabled={disabled} spellCheck={false} autoComplete="off" aria-describedby={`${id}-count`} aria-invalid={overLimit} placeholder={id === "similarity-draft" ? "Paste the writing you want to review…" : "Paste a source passage here. A URL alone is not source text."} onChange={(event) => onChange(event.target.value)} />
      <div id={`${id}-count`} className={`sim-input-count${overLimit ? " sim-error-text" : ""}`}>
        <span><strong>{count(stats.words)}</strong> / 10,000 words</span><span>{count(stats.characters)} / 60,000 chars</span>
      </div>
    </div>
  );
}

function ReviewFields({ value, onChange, id }: { value: ReviewNote; onChange: (value: ReviewNote) => void; id: string }) {
  return (
    <div className="sim-review-fields">
      <div><label htmlFor={`${id}-status`}>Your review</label><select id={`${id}-status`} value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value as ReviewNote["status"] })}>{Object.entries(REVIEW_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div><label htmlFor={`${id}-note`}>Note <span>(optional)</span></label><textarea id={`${id}-note`} rows={2} value={value.note} maxLength={600} placeholder="e.g. Check the citation and page number" onChange={(event) => onChange({ ...value, note: event.target.value })} /></div>
    </div>
  );
}

export function PlagiarismTool() {
  const [mode, setMode] = useState<CheckMode>("compare");
  const [draft, setDraft] = useState("");
  const [sources, setSources] = useState<SourceInput[]>([initialSource()]);
  const [activeSource, setActiveSource] = useState("source-1");
  const [options, setOptions] = useState<MatchOptions>({ ...DEFAULT_MATCH_OPTIONS });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reviews, setReviews] = useState<Record<string, ReviewNote>>({});
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [includePassages, setIncludePassages] = useState(true);
  const [copyNotice, setCopyNotice] = useState("");
  const [copyPending, setCopyPending] = useState(false);
  const [searchText, setSearchText] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState("all");
  const [filter, setFilter] = useState<EvidenceFilter>("all");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [visibleEvidence, setVisibleEvidence] = useState(15);
  const [repeatFocus, setRepeatFocus] = useState<{ id: string; occurrence: number } | null>(null);
  const worker = useRef<Worker | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const reportRevision = useRef(0);
  const copyInFlight = useRef(false);
  const nextSourceId = useRef(2);
  const mounted = useRef(true);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const reportText = useRef<HTMLTextAreaElement>(null);
  const evidencePanel = useRef<HTMLDivElement>(null);

  const stopWorker = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    if (deadline.current) clearTimeout(deadline.current);
    deadline.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stopWorker(); };
  }, [stopWorker]);

  const invalidate = useCallback(() => {
    revision.current++;
    reportRevision.current++;
    stopWorker();
    setChecking(false);
    setImporting(false);
    setSnapshot(null);
    setReviews({});
    setError("");
    setNotice("");
    setReportOpen(false);
    setSearchText(null);
    setCopyNotice("");
    setConfirmation(null);
    setSelectedMatch(null);
    setRepeatFocus(null);
    setSelectedSource("all");
    setFilter("all");
    setVisibleEvidence(15);
  }, [stopWorker]);

  function editText(target: string, value: string) {
    if (value.length > SIMILARITY_LIMITS.maxChars) {
      setError("That text exceeds 60,000 characters. The previous text was kept; paste a smaller section.");
      return;
    }
    invalidate();
    if (target === "draft") setDraft(value);
    else setSources((current) => current.map((source) => source.id === target ? { ...source, text: value } : source));
  }

  async function importText(target: string, file: File) {
    revision.current++;
    stopWorker();
    setChecking(false);
    setError("");
    setNotice("");
    setConfirmation(null);
    setImporting(true);
    const importRevision = revision.current;
    try {
      const text = await readTextFile(file);
      if (!mounted.current || importRevision !== revision.current) return;
      const oldText = target === "draft" ? draft : sources.find((source) => source.id === target)?.text;
      if (oldText?.trim()) {
        setConfirmation({ kind: "import", target, text, fileName: file.name });
      } else {
        editText(target, text);
        setNotice("Text imported locally. No file was uploaded.");
      }
    } catch (caught) {
      if (mounted.current && importRevision === revision.current) setError(caught instanceof Error ? caught.message : "Unable to read this text file.");
    } finally {
      if (mounted.current && importRevision === revision.current) setImporting(false);
    }
  }

  function loadExample() {
    invalidate();
    if (mode === "compare") {
      setDraft(COMPARISON_SAMPLE.draft);
      setSources(COMPARISON_SAMPLE.sources.map((source) => ({ ...source })));
      setActiveSource("source-1");
      nextSourceId.current = 3;
    } else setDraft(REPETITION_SAMPLE);
    setNotice("Fictional example loaded. Run the check to explore the results.");
  }

  function confirmAction() {
    const action = confirmation;
    if (!action) return;
    if (action.kind === "sample") loadExample();
    else if (action.kind === "import") { editText(action.target, action.text); setNotice("Text replaced with your local file. Run a new check."); }
    else {
      invalidate(); setDraft(""); setSources([initialSource()]); setActiveSource("source-1"); nextSourceId.current = 2;
      setNotice("All text and review notes cleared from this workspace.");
    }
  }

  function changeMode(next: CheckMode) {
    if (mode === next) return;
    invalidate(); setMode(next);
    setNotice(next === "repeat" ? "Single-text mode selected. Sources are kept but are not checked in this mode." : "Source comparison selected. Add at least one source text.");
  }

  function runCheck() {
    if (copyInFlight.current) { setError("Wait for the pending clipboard copy to finish before running another check."); return; }
    invalidate();
    const draftProblem = inputProblem(draft);
    if (draftProblem) { setError(`Your document: ${draftProblem}`); return; }
    if (mode === "compare") {
      for (const [index, source] of sources.entries()) {
        const problem = inputProblem(source.text);
        if (!source.label.trim() || problem) { setError(`Source ${index + 1}: ${problem || "Add a source label."}`); setActiveSource(source.id); return; }
      }
    }
    if (typeof Worker === "undefined") { setError("This browser does not support background workers. Use a current browser; your text has not been sent anywhere by this tool."); return; }
    const id = revision.current;
    const request = { id, mode, draft, sources: mode === "compare" ? sources.map((source) => ({ ...source, label: source.label.trim() })) : [], options: { ...options } };
    try {
      const instance = new Worker(new URL("../../../lib/similarity/worker.ts", import.meta.url), { type: "module" });
      worker.current = instance;
      setChecking(true);
      instance.onmessage = (event: MessageEvent<CheckResponse>) => {
        if (!mounted.current || revision.current !== id || event.data.id !== id) return;
        stopWorker(); setChecking(false);
        if ("error" in event.data) { setError(event.data.error); return; }
        const result: SimilarityResult = event.data.result;
        setSnapshot({ draft: request.draft, sources: request.sources, result });
        setNotice("Check complete. Review the evidence; matching text is not a plagiarism verdict.");
        requestAnimationFrame(() => { if (mounted.current && revision.current === id) resultsHeading.current?.focus({ preventScroll: true }); });
      };
      instance.onerror = (event) => {
        event.preventDefault();
        if (!mounted.current || revision.current !== id) return;
        stopWorker(); setChecking(false); setError("The local comparison worker could not run. Retry in a current browser or with a smaller section.");
      };
      deadline.current = setTimeout(() => {
        if (revision.current !== id) return;
        revision.current++; stopWorker(); setChecking(false); setError("This check reached the 15-second limit. Compare a smaller section; no partial score is shown.");
      }, SIMILARITY_LIMITS.timeoutMs);
      instance.postMessage(request);
    } catch {
      stopWorker(); setChecking(false); setError("The local worker could not start. Your inputs were kept; try again in a current browser.");
    }
  }

  function cancelCheck() { invalidate(); setNotice("Check cancelled. Your text was kept and no partial result was used."); }

  const result = snapshot?.result;
  const compare = result?.mode === "compare" ? result : null;
  const repeat = result?.mode === "repeat" ? result : null;
  const allPassages = compare?.sources.flatMap((source) => source.passages) ?? [];
  const passages = allPassages.filter((passage) => (selectedSource === "all" || passage.sourceId === selectedSource) && (filter === "all" || (reviews[passage.id]?.status ?? "unreviewed") === "unreviewed"));
  const activePassage = passages.find((passage) => passage.id === selectedMatch) ?? passages[0];
  const activeMatchSource = compare?.sources.find((source) => source.id === activePassage?.sourceId) ?? compare?.sources.find((source) => source.id === selectedSource) ?? compare?.sources[0];
  const sourceInput = snapshot?.sources.find((source) => source.id === activeMatchSource?.id);
  const evidence = compare ? allPassages : repeat?.groups ?? [];
  const reviewed = evidence.filter((entry) => reviews[entry.id] && reviews[entry.id].status !== "unreviewed").length;
  const selectedRepeat = repeat?.groups.find((group) => group.id === repeatFocus?.id) ?? repeat?.groups[0];
  const selectedRepeatRange = selectedRepeat?.occurrences[Math.min(repeatFocus?.id === selectedRepeat.id ? repeatFocus.occurrence : 0, selectedRepeat.occurrences.length - 1)];
  const stats = compare?.draft.stats ?? repeat?.stats;
  const formattedReport = useMemo(() => snapshot && reportOpen ? buildComparisonReport({ ...snapshot, reviews }, includePassages) : "", [snapshot, reportOpen, reviews, includePassages]);
  const compactReport = useMemo(() => Boolean(snapshot && reportOpen && includePassages && needsCompactReport({ ...snapshot, reviews })), [snapshot, reportOpen, reviews, includePassages]);
  const visibleDraftRanges = selectedSource === "all" ? compare?.draft.matchRanges : compare?.sources.find((source) => source.id === selectedSource)?.draftRanges;
  const chosenSearch = searchText !== null ? manualSearchUrl(searchText) : null;
  const activeInput = sources.find((source) => source.id === activeSource) ?? sources[0];
  const hasText = Boolean(draft.trim() || sources.some((source) => source.text.trim()));

  function focusPassage(passage: MatchingPassage) {
    setSelectedMatch(passage.id);
    requestAnimationFrame(() => {
      evidencePanel.current?.scrollIntoView({ block: "nearest" });
      document.getElementById("sim-draft-current")?.scrollIntoView({ block: "nearest" });
      document.getElementById("sim-source-current")?.scrollIntoView({ block: "nearest" });
    });
  }

  function navigatePassage(direction: number) {
    if (!activePassage || !passages.length) return;
    const index = passages.findIndex((passage) => passage.id === activePassage.id);
    focusPassage(passages[(index + direction + passages.length) % passages.length]);
  }

  function updateReview(id: string, value: ReviewNote) { reportRevision.current++; setCopyNotice(""); setReviews((current) => ({ ...current, [id]: value })); }

  async function copyReport() {
    if (copyInFlight.current) return;
    copyInFlight.current = true;
    setCopyPending(true);
    const copiedRevision = reportRevision.current;
    const copiedWithText = includePassages && !compactReport;
    try {
      await navigator.clipboard.writeText(formattedReport);
      if (!mounted.current) return;
      setCopyNotice(copiedRevision === reportRevision.current
        ? `${copiedWithText ? "Report with passages and notes" : "Stats-only report"} copied. Review it before sharing.`
        : "An earlier report was copied, not the changed preview. Copy the current report again before sharing.");
    } catch {
      if (!mounted.current || copiedRevision !== reportRevision.current) return;
      reportText.current?.focus(); reportText.current?.select();
      setCopyNotice("Clipboard access was blocked. Select the report below and copy it manually.");
    } finally {
      copyInFlight.current = false;
      if (mounted.current) setCopyPending(false);
    }
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([formattedReport], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "byteverse-text-comparison-report.txt"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setCopyNotice("Report download requested. Text is saved only if you keep the downloaded file.");
  }

  return (
    <section id="similarity-workspace" className="sim-workspace notranslate" translate="no" aria-label="Text similarity workspace">
      <div className="sim-workspace-top">
        <div className="sim-mode-switch" aria-label="Check mode">
          <button type="button" aria-pressed={mode === "compare"} onClick={() => changeMode("compare")}><Layers size={16} aria-hidden="true" />Compare sources</button>
          <button type="button" aria-pressed={mode === "repeat"} onClick={() => changeMode("repeat")}><Copy size={16} aria-hidden="true" />Repeated sentences</button>
        </div>
        <div className="sim-top-actions"><button type="button" className="sim-text-button" onClick={() => hasText ? setConfirmation({ kind: "sample" }) : loadExample()}><Sparkles size={14} aria-hidden="true" />Try an example</button><button type="button" className="sim-icon-button" aria-label="Clear all text and review notes" disabled={!hasText} onClick={() => setConfirmation({ kind: "clear" })}><RotateCcw size={16} aria-hidden="true" /></button></div>
      </div>

      {confirmation && <div className="sim-confirm" role="group" aria-label="Confirm replacement"><div><strong>{confirmation.kind === "clear" ? "Clear this workspace?" : confirmation.kind === "sample" ? "Replace your text with an example?" : `Replace text with ${confirmation.fileName}?`}</strong><p>Current results and review notes will be cleared. This cannot be undone here.</p></div><div><button type="button" className="sim-button sim-button-small" onClick={confirmAction}>{confirmation.kind === "clear" ? "Yes, clear all" : "Replace text"}</button><button type="button" className="sim-button-secondary sim-button-small" onClick={() => setConfirmation(null)}>Keep current text</button></div></div>}

      <div className="sim-workspace-intro"><div><span className="sim-step-pill">01</span><h2>{mode === "compare" ? "Start with the text, not a guess." : "Find repetition within your draft."}</h2></div><p>{mode === "compare" ? "Compare with sources you supply. We do not scan the web or assign an originality score." : "Group matching whole sentences. Repetition alone does not mean plagiarism."}</p></div>

      <div className={`sim-input-grid${mode === "repeat" ? " sim-input-single" : ""}`}>
        <div className="sim-input-card"><div className="sim-card-heading"><span className="sim-letter-badge">D</span><div><h3>Your document</h3><p>The writing you want to review</p></div></div><TextInput id="similarity-draft" label="Document text" value={draft} onChange={(text) => editText("draft", text)} onImport={(file) => void importText("draft", file)} /></div>
        {mode === "compare" && <div className="sim-input-card sim-sources-card"><div className="sim-card-heading"><span className="sim-letter-badge sim-letter-source">S</span><div><h3>Reference sources</h3><p>Paste known sources, not website addresses</p></div><button type="button" className="sim-add-source" disabled={sources.length >= SIMILARITY_LIMITS.maxSources} onClick={() => {
          invalidate(); const number = nextSourceId.current++; const source = { id: `source-${number}`, label: `Source ${number}`, text: "" }; setSources([...sources, source]); setActiveSource(source.id);
        }}><Plus size={14} aria-hidden="true" />Add <span>({sources.length}/5)</span></button></div>
          <div className="sim-source-tabs" aria-label="Choose a source to edit">{sources.map((source, index) => <button type="button" key={source.id} aria-pressed={activeInput.id === source.id} onClick={() => setActiveSource(source.id)}><span className={`sim-source-dot sim-source-color-${index}`} />Source {index + 1}{source.text.trim() && <Check size={11} aria-label="Contains text" />}</button>)}</div>
          <div className="sim-source-label"><label htmlFor="similarity-source-name">Source label</label><input id="similarity-source-name" value={activeInput.label} maxLength={100} placeholder="Article, author or source name" onChange={(event) => { invalidate(); setSources((current) => current.map((source) => source.id === activeInput.id ? { ...source, label: event.target.value } : source)); }} /><button type="button" className="sim-icon-button" disabled={sources.length === 1} aria-label={`Remove ${activeInput.label || "this source"}`} onClick={() => { invalidate(); const remaining = sources.filter((source) => source.id !== activeInput.id); setSources(remaining); setActiveSource(remaining[0].id); }}><X size={15} aria-hidden="true" /></button></div>
          <TextInput id={`similarity-${activeInput.id}`} label="Source text" value={activeInput.text} onChange={(text) => editText(activeInput.id, text)} onImport={(file) => void importText(activeInput.id, file)} />
        </div>}
      </div>

      <div className="sim-settings">
        <div className="sim-match-setting"><label htmlFor="similarity-match-length"><Settings2 size={15} aria-hidden="true" />Minimum match</label><select id="similarity-match-length" value={options.minWords} onChange={(event) => { invalidate(); setOptions({ ...options, minWords: Number(event.target.value) as MatchLength }); }}>{[4, 6, 8, 12].map((value) => <option key={value} value={value}>{value} words{value === 6 ? " · balanced" : ""}</option>)}</select></div>
        <label className="sim-checkbox"><input type="checkbox" checked={options.ignoreCase} onChange={(event) => { invalidate(); setOptions({ ...options, ignoreCase: event.target.checked }); }} />Ignore case</label>
        <label className="sim-checkbox"><input type="checkbox" checked={options.excludeQuotes} onChange={(event) => { invalidate(); setOptions({ ...options, excludeQuotes: event.target.checked }); }} />Exclude quotes</label>
        <label className="sim-checkbox"><input type="checkbox" checked={options.excludeReferences} onChange={(event) => { invalidate(); setOptions({ ...options, excludeReferences: event.target.checked }); }} />Exclude references</label>
        {mode === "compare" && <button type="button" className="sim-text-button sim-swap" onClick={() => { invalidate(); setDraft(activeInput.text); setSources((current) => current.map((source) => source.id === activeInput.id ? { ...source, text: draft } : source)); setNotice("Document and active source swapped. Run again; coverage is directional."); }}><ArrowRightLeft size={14} aria-hidden="true" />Swap texts</button>}
      </div>
      <div className="sim-input-footnote">UTF-8 TXT / Markdown · 256 KB per file · 10,000 words and 60,000 characters per text. <a href="#similarity-method">How matching and exclusions work <Info size={12} aria-hidden="true" /></a></div>
      <div className="sim-run-bar"><div className="sim-local-note"><ShieldCheck size={18} aria-hidden="true" /><div><strong>On-device matching. No AI upload.</strong><span>Inputs and notes clear on reload. <a href="#similarity-privacy">Privacy details</a></span></div></div><div className="sim-run-actions">{checking && <button type="button" className="sim-button-secondary" onClick={cancelCheck}>Cancel</button>}<button type="button" className="sim-button sim-run-button" onClick={runCheck} disabled={!draft.trim() || checking || importing}>{checking || importing ? <Loader2 className="sim-spin" size={17} aria-hidden="true" /> : <FileSearch size={17} aria-hidden="true" />}{importing ? "Reading local file…" : checking ? "Comparing locally…" : mode === "compare" ? "Compare texts" : "Find repeated sentences"}{!checking && !importing && <ArrowRight size={16} aria-hidden="true" />}</button></div></div>
      {error && <p className="sim-alert sim-alert-error" role="alert"><Info size={16} aria-hidden="true" />{error}</p>}
      <p className="sim-status" role="status" aria-live="polite">{notice || (checking ? "The check is running in a local background worker. You can cancel or edit your text." : "")}</p>

      {!snapshot && <div className="sim-empty"><div className="sim-empty-icon"><BookOpen size={21} aria-hidden="true" /></div><div><h3>Your evidence will appear here.</h3><p>{mode === "compare" ? "See matching passages, their sources and the words included in the calculation. No black-box verdict." : "Review repeated sentences and choose excerpts for a manual source search. No suspicious-writing labels."}</p></div><span className="sim-empty-tag">Evidence, not accusations</span></div>}

      {snapshot && stats && <div className="sim-results" data-testid="similarity-results">
        <div className="sim-results-title"><div><p className="sim-eyebrow">02 / READ THE EVIDENCE</p><h2 ref={resultsHeading} tabIndex={-1}>{compare ? "Your comparison, explained." : "Your repetition review."}</h2></div><button type="button" className="sim-button-secondary" onClick={() => { setReportOpen(!reportOpen); setCopyNotice(""); }}><ArrowDownToLine size={16} aria-hidden="true" />Review report</button></div>
        <div className="sim-summary-grid"><div className="sim-summary-primary"><span>{compare ? "Matched-document coverage" : "Repeated sentence groups"}</span><strong data-testid="similarity-coverage">{compare ? formatCoverage(compare.draft.coverage) : repeat?.groupCount}</strong><p>{compare ? `${count(compare.draft.matchedWords)} of ${count(stats.eligibleWords)} eligible document words` : `${count(repeat?.repeatedOccurrences ?? 0)} copies beyond the first occurrences`}</p><div className="sim-coverage-track" aria-hidden="true"><div style={{ width: `${compare?.draft.coverage ?? 0}%` }} /></div><small>{compare ? "An overlap measurement, not a plagiarism percentage." : "No originality or authorship score is assigned."}</small></div><div className="sim-summary-secondary"><dl><div><dt>Words in your document</dt><dd>{count(stats.totalWords)}</dd></div><div><dt>Excluded by your rules</dt><dd>{count(stats.excludedWords)}</dd></div><div><dt>{compare ? "Supplied sources checked" : "Groups shown"}</dt><dd>{compare ? compare.sources.length : repeat?.groups.length}</dd></div><div><dt>Evidence reviewed</dt><dd>{reviewed} / {evidence.length}</dd></div></dl><p>Labels and notes do not change matching coverage. They record your review only.</p></div></div>

        {reportOpen && <section className="sim-report" aria-label="Comparison report"><div className="sim-report-heading"><div><h3>Keep a useful review record.</h3><p>Not an originality certificate. Text and notes may contain sensitive material—check before sharing.</p></div><button type="button" className="sim-icon-button" aria-label="Close report" onClick={() => setReportOpen(false)}><X size={17} aria-hidden="true" /></button></div><label className="sim-checkbox"><input type="checkbox" checked={includePassages} onChange={(event) => { reportRevision.current++; setIncludePassages(event.target.checked); setCopyNotice(""); }} />Include matched passages, source labels and notes</label>{compactReport && <p role="status">Large overlapping passages exceed the report text budget. This export is stats-only; source labels, passages and notes are omitted.</p>}<div className="sim-report-actions"><button type="button" className="sim-button-secondary" disabled={copyPending} onClick={() => void copyReport()}><Clipboard size={15} aria-hidden="true" />{copyPending ? "Copying…" : "Copy report"}</button><button type="button" className="sim-button-secondary" onClick={downloadReport}><ArrowDownToLine size={15} aria-hidden="true" />Download TXT</button></div><label className="sim-sr-only" htmlFor="similarity-report-text">Report text</label><textarea id="similarity-report-text" ref={reportText} readOnly value={formattedReport} rows={9} /><p role="status" className="sim-copy-notice">{copyNotice}</p></section>}

        {compare && <>
          <div className="sim-source-results" aria-label="Coverage by source">{compare.sources.map((source, index) => <button type="button" key={source.id} aria-pressed={selectedSource === source.id} onClick={() => { setSelectedSource(selectedSource === source.id ? "all" : source.id); setSelectedMatch(null); setVisibleEvidence(15); }}><span className={`sim-source-number sim-source-color-${index}`}>{index + 1}</span><div><strong>{source.label}</strong><span>{count(source.draftMatchedWords)} matched document words</span></div><b>{formatCoverage(source.draftCoverage)}</b></button>)}</div><p className="sim-explain-line">Source percentages can overlap; they are not added together.</p>
          <div className="sim-evidence-toolbar"><h3>Matching passages <span>({passages.length})</span></h3><div><label className="sim-sr-only" htmlFor="similarity-source-filter">Filter matching source</label><select id="similarity-source-filter" value={selectedSource} onChange={(event) => { setSelectedSource(event.target.value); setSelectedMatch(null); setVisibleEvidence(15); }}><option value="all">All sources</option>{compare.sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}</select><label className="sim-sr-only" htmlFor="similarity-review-filter">Filter review status</label><select id="similarity-review-filter" value={filter} onChange={(event) => { setFilter(event.target.value as EvidenceFilter); setSelectedMatch(null); setVisibleEvidence(15); }}><option value="all">All evidence</option><option value="unreviewed">Not reviewed</option></select></div></div>
          <div className="sim-legend"><span><i className="sim-legend-match" />Matching wording</span><span><i className="sim-legend-current" />Selected passage</span><span><i className="sim-legend-excluded" />Excluded by your rules</span></div>
          <div ref={evidencePanel} className="sim-evidence-grid"><div className="sim-evidence-pane"><div className="sim-pane-heading"><strong>Your document</strong><span>{selectedSource === "all" ? "All sources" : "Selected source"} · {count(stats.eligibleWords)} eligible words</span></div><div className="sim-highlighted-text" dir="auto" tabIndex={0} aria-label="Document matching highlights"><TextHighlights text={snapshot.draft} matched={visibleDraftRanges ?? []} excluded={compare.draft.excludedRanges} selected={activePassage?.draft} markerId="sim-draft-current" /></div></div><div className="sim-evidence-pane"><div className="sim-pane-heading"><strong>{activeMatchSource?.label}</strong><span>{formatCoverage(activeMatchSource?.coverage ?? null)} of this source matched</span></div><div className="sim-highlighted-text" dir="auto" tabIndex={0} aria-label="Source matching highlights"><TextHighlights text={sourceInput?.text ?? ""} matched={activeMatchSource?.sourceRanges ?? []} excluded={activeMatchSource?.excludedRanges ?? []} selected={activePassage?.source} markerId="sim-source-current" /></div></div></div>
          {activePassage && <div className="sim-match-navigation"><span>Passage {passages.indexOf(activePassage) + 1} of {passages.length} · {activePassage.words} words</span><div><button type="button" className="sim-icon-button" aria-label="Previous matching passage" disabled={passages.length < 2} onClick={() => navigatePassage(-1)}><ArrowLeft size={16} aria-hidden="true" /></button><button type="button" className="sim-icon-button" aria-label="Next matching passage" disabled={passages.length < 2} onClick={() => navigatePassage(1)}><ArrowRight size={16} aria-hidden="true" /></button></div></div>}
          {!passages.length && <p className="sim-no-matches">{filter === "unreviewed" && allPassages.length ? "No unreviewed evidence in this filter. Your review labels did not change the coverage." : "No qualifying passages in this selection. This does not establish originality; add other sources or review the match settings."}</p>}
          <div className="sim-passage-list">{passages.slice(0, visibleEvidence).map((passage, index) => {
            const source = snapshot.sources.find((item) => item.id === passage.sourceId)!;
            return <article key={passage.id} className={`sim-passage-card${activePassage?.id === passage.id ? " sim-passage-active" : ""}`}><div className="sim-passage-heading"><button type="button" className="sim-text-button" onClick={() => focusPassage(passage)}><span>{String(index + 1).padStart(2, "0")}</span>{source.label}</button><span>{passage.words} words · document position {count(passage.draft.start + 1)}</span></div><PassageText text={snapshot.draft.slice(passage.draft.start, passage.draft.end)} /><details><summary>See source wording <ChevronDown size={12} aria-hidden="true" /></summary><PassageText text={source.text.slice(passage.source.start, passage.source.end)} /></details><ReviewFields id={passage.id} value={reviews[passage.id] ?? EMPTY_REVIEW} onChange={(value) => updateReview(passage.id, value)} /></article>;
          })}</div>{passages.length > visibleEvidence && <button type="button" className="sim-button-secondary sim-load-more" onClick={() => setVisibleEvidence((current) => current + 15)}>Show 15 more passages</button>}
        </>}

        {repeat && <><div className="sim-legend"><span><i className="sim-legend-match" />Repeated sentence</span><span><i className="sim-legend-excluded" />Excluded by your rules</span></div><div className="sim-evidence-pane"><div className="sim-pane-heading"><strong>Your document</strong><span>Whole-sentence matches only</span></div><div className="sim-highlighted-text" dir="auto" tabIndex={0} aria-label="Repeated sentence highlights"><TextHighlights text={snapshot.draft} matched={repeat.matchRanges} excluded={repeat.excludedRanges} selected={selectedRepeatRange} markerId="sim-repeat-current" /></div></div>{!repeat.groupCount && <p className="sim-no-matches">No repeated sentences met your settings. This says nothing about whether the wording appears in an external source.</p>}<div className="sim-passage-list">{repeat.groups.slice(0, visibleEvidence).map((group) => <article key={group.id} className="sim-passage-card"><div className="sim-passage-heading"><strong>{group.occurrenceCount} occurrences</strong><span>{group.words} words per sentence</span></div><p className="sim-passage-text" dir="auto">{group.text}</p><div className="sim-occurrences">{group.occurrences.map((range, index) => <button type="button" key={range.start} className="sim-text-button" onClick={() => { setRepeatFocus({ id: group.id, occurrence: index }); requestAnimationFrame(() => document.getElementById("sim-repeat-current")?.scrollIntoView({ block: "nearest" })); }}>Go to {index + 1}</button>)}</div><ReviewFields id={group.id} value={reviews[group.id] ?? EMPTY_REVIEW} onChange={(value) => updateReview(group.id, value)} /></article>)}</div>{repeat.groups.length > visibleEvidence && <button type="button" className="sim-button-secondary sim-load-more" onClick={() => setVisibleEvidence((current) => current + 15)}>Show 15 more groups</button>}
          {!!repeat.searchPassages.length && <section className="sim-manual-search"><h3><Search size={17} aria-hidden="true" />Want to check a passage on the web?</h3><p>These are position-sampled excerpts, not suspicious-text flags. Preview the query before opening Google. No results are fetched or scored here.</p>{repeat.searchPassages.map((passage) => <div key={passage.id}><p dir="auto">{passage.text}</p><button type="button" className="sim-text-button" onClick={() => setSearchText(passage.text)}>Preview search <ArrowRight size={13} aria-hidden="true" /></button></div>)}</section>}
        </>}
        {chosenSearch && <section className="sim-search-preview" role="group" aria-label="Manual search preview"><h3>This sends the query to Google.</h3><p>Do not send confidential text. A missing search result does not prove originality.{chosenSearch.shortened && " The excerpt was shortened to fit this manual query."}</p><blockquote dir="auto">&quot;{chosenSearch.phrase}&quot;</blockquote><a href={chosenSearch.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="sim-button-secondary">Open Google search <ArrowRight size={14} aria-hidden="true" /></a><button type="button" className="sim-text-button" onClick={() => setSearchText(null)}>Cancel search</button></section>}
        <details className="sim-method-notes"><summary><Info size={15} aria-hidden="true" />What this check includes—and what it does not<ChevronDown size={15} aria-hidden="true" /></summary><ul>{result?.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>
      </div>}
    </section>
  );
}