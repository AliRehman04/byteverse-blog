"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUp, Braces, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clipboard, Columns3, Download, FileJson, Info, Layers,
  Loader2, RotateCcw, Search, Settings2, ShieldCheck, Table2, Upload, X,
} from "lucide-react";
import { csvDownloadDetails, formatBytes, inputSizeProblem, readJsonFile, shortText } from "@/lib/json-csv/input";
import { JSON_CSV_SAMPLES } from "@/lib/json-csv/samples";
import {
  DEFAULT_CSV_OPTIONS, JSON_CSV_LIMITS,
  type CsvColumn, type CsvConversion, type CsvDelimiter, type CsvOptions,
  type JsonCsvRequest, type JsonCsvResponse, type JsonInputFormat, type JsonInspection,
} from "@/lib/json-csv/types";
import "./json-csv.css";

interface CandidateInput { text: string; format: JsonInputFormat; label: string; inspection: JsonInspection }
type ConfirmAction = { kind: "clear" } | { kind: "sample"; index: number } | { kind: "file"; candidate: CandidateInput };
type WorkerTask = "inspect" | "convert" | "import";
const number = (value: number) => value.toLocaleString("en-US");
const NONE_EXPANSION = "__no_expansion__";

export function JsonToCsvTool() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<JsonInputFormat>("json");
  const [options, setOptions] = useState<CsvOptions>({ ...DEFAULT_CSV_OPTIONS });
  const [inspection, setInspection] = useState<JsonInspection | null>(null);
  const [columns, setColumns] = useState<CsvColumn[] | undefined>();
  const [defaults, setDefaults] = useState<CsvColumn[]>([]);
  const [result, setResult] = useState<CsvConversion | null>(null);
  const [busy, setBusy] = useState<WorkerTask | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [outputView, setOutputView] = useState<"table" | "csv">("table");
  const [columnSearch, setColumnSearch] = useState("");
  const [columnsVisible, setColumnsVisible] = useState(30);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [fileName, setFileName] = useState("converted-data");
  const [copyPending, setCopyPending] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [cell, setCell] = useState<{ title: string; value: string } | null>(null);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const outputRevision = useRef(0);
  const mounted = useRef(true);
  const copyInFlight = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const rawPreview = useRef<HTMLTextAreaElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const stop = useCallback(() => {
    worker.current?.terminate(); worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, [stop]);

  function cancelPending() {
    revision.current++; stop(); setBusy(null); setReading(false);
  }

  function invalidate(resetShape = false) {
    cancelPending(); outputRevision.current++;
    setResult(null); setError(""); setNotice(""); setCopyNotice(""); setConfirmation(null); setCell(null); setPage(0);
    if (resetShape) { setColumns(undefined); setDefaults([]); setColumnSearch(""); setColumnsVisible(30); }
  }

  function updateInput(text: string) {
    const problem = inputSizeProblem(text);
    if (problem) { setError(problem); return; }
    invalidate(true); setInput(text); setInspection(null); setOptions((current) => ({ ...current, rowPath: "", expandPath: null }));
  }

  function updateOption<K extends keyof CsvOptions>(key: K, value: CsvOptions[K], resetShape = false) {
    invalidate(resetShape);
    setOptions((current) => ({ ...current, [key]: value, ...(key === "rowPath" ? { expandPath: null } : {}) }));
    setNotice("Settings changed. Build CSV again to review and export the new result.");
  }

  function acceptCandidate(candidate: CandidateInput) {
    invalidate(true); setInput(candidate.text); setFormat(candidate.format); setInspection(candidate.inspection);
    setOptions((current) => ({ ...current, rowPath: "", expandPath: null }));
    setNotice(`Imported locally and validated as ${candidate.format === "jsonl" ? "JSON Lines" : "JSON"}. Choose your row source, then build CSV.`);
  }

  function runWorker(request: JsonCsvRequest, task: WorkerTask, candidate?: { label: string; text: string; format: JsonInputFormat }) {
    const id = request.id;
    if (typeof Worker === "undefined") { setError("A current browser with background worker support is required. No data was uploaded."); return; }
    try {
      const instance = new Worker(new URL("../../../lib/json-csv/worker.ts", import.meta.url), { type: "module" });
      worker.current = instance; setBusy(task);
      instance.onmessage = (event: MessageEvent<JsonCsvResponse>) => {
        if (!mounted.current || revision.current !== id || event.data.id !== id) return;
        stop(); setBusy(null);
        const response = event.data;
        if (response.kind === "error") { setError(response.error); return; }
        if (response.kind === "inspect") {
          if (candidate) {
            const accepted = { ...candidate, inspection: response.inspection };
            if (input.trim()) setConfirmation({ kind: "file", candidate: accepted });
            else acceptCandidate(accepted);
          } else {
            setInspection(response.inspection);
            setNotice("Valid input. Root is selected by default; choose a detected array for wrapped API records.");
          }
        } else {
          setResult(response.conversion); setColumns(response.conversion.columns.map((column) => ({ ...column })));
          if (!columns) setDefaults(response.conversion.columns.map((column) => ({ ...column })));
          setPage(0); setNotice("CSV built. Review the table, export settings and warnings before downloading.");
          requestAnimationFrame(() => { if (mounted.current && revision.current === id) resultHeading.current?.focus({ preventScroll: true }); });
        }
      };
      instance.onerror = (event) => {
        event.preventDefault();
        if (!mounted.current || revision.current !== id) return;
        stop(); setBusy(null); setError("The local worker could not complete this operation. Inputs were kept; retry with a smaller JSON section.");
      };
      timer.current = setTimeout(() => {
        if (revision.current !== id) return;
        revision.current++; stop(); setBusy(null);
        setError("The 15-second processing limit was reached. Use a smaller section; no partial export was produced.");
      }, JSON_CSV_LIMITS.timeoutMs);
      instance.postMessage(request);
    } catch {
      stop(); setBusy(null); setError("Unable to start a local worker. Your input was kept; try a current browser.");
    }
  }

  function inspect() {
    invalidate(true); setInspection(null);
    if (!input.trim()) { setError("Paste some JSON or import a file first."); return; }
    setOptions((current) => ({ ...current, rowPath: "", expandPath: null }));
    runWorker({ id: revision.current, kind: "inspect", input, format }, "inspect");
  }

  function convert() {
    if (copyInFlight.current) { setError("Wait for the pending clipboard copy to finish before building a new export."); return; }
    invalidate();
    if (!inspection) { setError("Inspect the input before building CSV."); return; }
    runWorker({ id: revision.current, kind: "convert", input, format, options: { ...options }, ...(columns ? { columns: columns.map((column) => ({ ...column })) } : {}) }, "convert");
  }

  async function importFile(file: File) {
    cancelPending(); setReading(true); setError(""); setNotice(""); setConfirmation(null);
    const id = revision.current;
    try {
      const candidate = await readJsonFile(file, format);
      if (!mounted.current || revision.current !== id) return;
      setReading(false);
      runWorker({ id, kind: "inspect", input: candidate.text, format: candidate.format }, "import", { ...candidate, label: file.name });
    } catch (caught) {
      if (mounted.current && revision.current === id) { setReading(false); setError(caught instanceof Error ? caught.message : "Unable to read this file."); }
    }
  }

  function loadSample(index: number) {
    const sample = JSON_CSV_SAMPLES[index];
    invalidate(true); setInput(sample.text); setFormat(sample.format); setInspection(null);
    setOptions((current) => ({ ...current, rowPath: "", expandPath: null })); setNotice(sample.hint);
  }

  function confirm() {
    if (!confirmation) return;
    if (confirmation.kind === "file") acceptCandidate(confirmation.candidate);
    else if (confirmation.kind === "sample") loadSample(confirmation.index);
    else {
      invalidate(true); setInput(""); setInspection(null); setFileName("converted-data");
      setOptions({ ...DEFAULT_CSV_OPTIONS }); setFormat("json"); setNotice("Workspace cleared. Copied text and downloaded files are not removed.");
    }
  }

  function editColumn(id: string, update: Partial<CsvColumn>) {
    invalidate(); setColumns((current) => current?.map((column) => column.id === id ? { ...column, ...update } : column));
    setNotice("Column settings changed. Build CSV again to refresh the export.");
  }

  function moveColumn(id: string, direction: number) {
    if (!columns) return;
    const index = columns.findIndex((column) => column.id === id);
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns]; [next[index], next[target]] = [next[target], next[index]];
    invalidate(); setColumns(next); setNotice("Column order changed. Build CSV again to apply it.");
  }

  async function copy() {
    if (!result || copyInFlight.current) return;
    const current = result;
    const id = outputRevision.current;
    copyInFlight.current = true; setCopyPending(true);
    try {
      await navigator.clipboard.writeText(current.csv);
      if (mounted.current) setCopyNotice(outputRevision.current === id ? "Full CSV copied without a BOM. Check spreadsheet import types before using it." : "An earlier CSV was copied, not your changed settings. Build and copy the current export again.");
    } catch {
      if (!mounted.current || outputRevision.current !== id) return;
      setOutputView("csv");
      if (current.rows.some((row) => row.some((value) => value.includes("\r"))) || current.headers.some((header) => header.includes("\r"))) {
        setCopyNotice("Clipboard access was blocked. Some fields contain carriage returns; the text preview can normalize them. Download the file to preserve the exact values.");
      } else if (current.csv.length <= JSON_CSV_LIMITS.previewChars) {
        requestAnimationFrame(() => { rawPreview.current?.focus(); rawPreview.current?.select(); });
        setCopyNotice("Clipboard access was blocked. Select the CSV text and copy it manually, or download the file.");
      } else setCopyNotice("Clipboard access was blocked. The text preview is shortened; download the file to keep the full result.");
    } finally {
      copyInFlight.current = false; if (mounted.current) setCopyPending(false);
    }
  }

  function download() {
    if (!result) return;
    const output = csvDownloadDetails(result, fileName);
    const url = URL.createObjectURL(new Blob([output.contents], { type: output.mime }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = output.fileName; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setCopyNotice(`Download requested: ${output.fileName}. ${result.options.bom ? "Includes" : "Does not include"} a UTF-8 BOM.`);
  }

  const rowSource = inspection?.rowPaths.find((entry) => entry.pointer === options.rowPath);
  const columnsFiltered = useMemo(() => columns?.filter((column) => `${column.header} ${column.path}`.toLowerCase().includes(columnSearch.toLowerCase())) ?? [], [columns, columnSearch]);
  const pages = result ? Math.max(1, Math.ceil(result.stats.outputRows / pageSize)) : 1;
  const shownPage = Math.min(page, pages - 1);
  const start = shownPage * pageSize;
  const csvPreview = result?.csv.slice(0, JSON_CSV_LIMITS.previewChars) ?? "";
  const pending = busy !== null || reading;
  const outputType = options.delimiter === "\t" ? "TSV" : "CSV";

  return (
    <section id="json-csv-workspace" className="jcsv-workspace notranslate" translate="no" aria-label="JSON to CSV workspace">
      <div className="jcsv-toolbar"><div className="jcsv-workspace-brand"><Braces size={18} aria-hidden="true" /><span>DATA WORKSPACE</span></div><div className="jcsv-examples"><label htmlFor="jcsv-example">Try an example</label><select id="jcsv-example" value={sampleIndex} onChange={(event) => setSampleIndex(Number(event.target.value))}>{JSON_CSV_SAMPLES.map((sample, index) => <option key={sample.id} value={index}>{sample.label}</option>)}</select><button type="button" className="jcsv-button-quiet" onClick={() => input.trim() ? setConfirmation({ kind: "sample", index: sampleIndex }) : loadSample(sampleIndex)}>Load example</button><button type="button" className="jcsv-icon-button" aria-label="Clear workspace" disabled={!input} onClick={() => setConfirmation({ kind: "clear" })}><RotateCcw size={15} aria-hidden="true" /></button></div></div>

      {confirmation && <div className="jcsv-confirm" role="group" aria-label="Confirm input replacement"><div><strong>{confirmation.kind === "clear" ? "Clear your JSON and column settings?" : confirmation.kind === "file" ? `Replace input with ${shortText(confirmation.candidate.label, 100)}?` : "Replace your input with a fictional example?"}</strong><p>Current output and custom columns will be cleared only if you continue.</p></div><div><button type="button" className="jcsv-button" onClick={confirm}>{confirmation.kind === "clear" ? "Yes, clear" : "Replace input"}</button><button type="button" className="jcsv-button-secondary" onClick={() => setConfirmation(null)}>Keep current input</button></div></div>}

      <div className="jcsv-input-layout">
        <div className="jcsv-input-panel"><div className="jcsv-panel-heading"><div><span className="jcsv-step">01</span><label htmlFor="jcsv-input">Your JSON</label></div><button type="button" className="jcsv-button-quiet" onClick={() => fileInput.current?.click()}><Upload size={14} aria-hidden="true" />Import file</button><input ref={fileInput} type="file" hidden accept=".json,.jsonl,.ndjson,.txt" aria-label="Import JSON file" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importFile(file); }} /></div>
          <div className="jcsv-format-line"><label htmlFor="jcsv-format">Input format</label><select id="jcsv-format" value={format} onChange={(event) => { invalidate(true); setFormat(event.target.value as JsonInputFormat); setInspection(null); setOptions((current) => ({ ...current, rowPath: "", expandPath: null })); }}><option value="json">JSON</option><option value="jsonl">JSON Lines / NDJSON</option></select><span>No comments or trailing commas</span></div>
          <textarea id="jcsv-input" value={input} rows={14} spellCheck={false} autoComplete="off" aria-describedby="jcsv-input-count" placeholder={'[\n  { "name": "Maya", "city": "Bristol" },\n  { "name": "Leo", "city": "Oslo" }\n]'} onChange={(event) => updateInput(event.target.value)} />
          <div id="jcsv-input-count" className="jcsv-input-meta"><span>{number(input.length)} / 1,000,000 chars</span><span>UTF-8 · 2 MiB max</span></div>
          <div className="jcsv-inspect-bar"><div><ShieldCheck size={14} aria-hidden="true" /><span>Processed locally. Not uploaded.</span></div><button type="button" className="jcsv-button" disabled={!input.trim() || pending} onClick={inspect}>{busy === "inspect" ? <Loader2 className="jcsv-spin" size={15} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}{busy === "inspect" ? "Inspecting…" : "Inspect JSON"}</button></div>
        </div>

        <aside className="jcsv-shape-panel" aria-label="Row and array settings"><div className="jcsv-panel-heading"><div><span className="jcsv-step">02</span><h2>Shape your table</h2></div><Layers size={16} aria-hidden="true" /></div>
          {!inspection ? <div className="jcsv-inspection-empty"><div className="jcsv-empty-symbol"><FileJson size={25} aria-hidden="true" /></div><h3>Choose the data that matters.</h3><p>Inspect your JSON to discover row arrays, keep large numbers intact and decide how nested data becomes columns.</p><ul><li><Check size={13} aria-hidden="true" />Wrapped API responses</li><li><Check size={13} aria-hidden="true" />One array expansion, no surprise multiplication</li><li><Check size={13} aria-hidden="true" />Numeric text without JavaScript rounding</li></ul></div>
            : <div className="jcsv-shape-settings"><div className="jcsv-valid-badge"><Check size={14} aria-hidden="true" />Valid {format === "jsonl" ? "JSON Lines" : "JSON"}<span>{formatBytes(inspection.inputBytes)}</span></div>
              <div className="jcsv-field"><label htmlFor="jcsv-row-path">Row source <span>JSON Pointer</span></label><select id="jcsv-row-path" value={options.rowPath} onChange={(event) => updateOption("rowPath", event.target.value, true)}>{inspection.rowPaths.map((path) => <option key={path.pointer} value={path.pointer}>{shortText(path.label, 95)} · {number(path.rowCount)} {path.rowCount === 1 ? "row" : "rows"}</option>)}</select><p>{options.rowPath ? "Only records at this path are exported; wrapper metadata is excluded." : inspection.rowPaths.length > 1 ? "Root is selected, not an inner array. Choose a detected array for API records." : "The root supplies the table rows."}</p></div>
              <label className="jcsv-checkbox"><input type="checkbox" checked={options.flatten} onChange={(event) => updateOption("flatten", event.target.checked, true)} />Flatten nested object fields</label>
              <div className="jcsv-field"><label htmlFor="jcsv-array-mode">Arrays in cells</label><select id="jcsv-array-mode" value={options.arrayMode} onChange={(event) => updateOption("arrayMode", event.target.value as CsvOptions["arrayMode"])}><option value="json">Keep as JSON (recommended)</option><option value="join">Join scalar values as text</option></select></div>
              {options.arrayMode === "join" && <div className="jcsv-field"><label htmlFor="jcsv-join">Join separator</label><input id="jcsv-join" value={options.joinSeparator} maxLength={32} onChange={(event) => updateOption("joinSeparator", event.target.value)} /><p>Joining is not lossless. Arrays containing objects or arrays stay JSON.</p></div>}
              <div className="jcsv-field"><label htmlFor="jcsv-expand">Expand one array into rows</label><select id="jcsv-expand" value={options.expandPath ?? NONE_EXPANSION} onChange={(event) => updateOption("expandPath", event.target.value === NONE_EXPANSION ? null : event.target.value, true)}><option value={NONE_EXPANSION}>No expansion</option>{rowSource?.arrayPaths.map((path) => <option key={path.pointer} value={path.pointer}>{shortText(path.label, 100)}</option>)}</select><p>{options.expandPath !== null ? "Parent fields repeat for each item. Empty, null or missing arrays keep one parent row." : "Optional: turn line items into rows without multiplying unrelated arrays."}</p></div>
            </div>}
        </aside>
      </div>

      {inspection && <div className="jcsv-export-settings"><div className="jcsv-settings-title"><Settings2 size={16} aria-hidden="true" /><h2>Export preferences</h2><a href="#json-csv-excel">Opening in Excel?</a></div><div className="jcsv-setting-grid">
        <div className="jcsv-field"><label htmlFor="jcsv-delimiter">Delimiter</label><select id="jcsv-delimiter" value={options.delimiter} onChange={(event) => updateOption("delimiter", event.target.value as CsvDelimiter)}><option value=",">Comma (,)</option><option value=";">Semicolon (;)</option><option value={"\t"}>Tab (TSV)</option><option value="|">Pipe (|)</option></select></div>
        <div className="jcsv-field"><label htmlFor="jcsv-newline">Line endings</label><select id="jcsv-newline" value={options.newline} onChange={(event) => updateOption("newline", event.target.value as CsvOptions["newline"])}><option value={"\r\n"}>CRLF (Windows / CSV)</option><option value={"\n"}>LF (Unix)</option></select></div>
        <div className="jcsv-field"><label htmlFor="jcsv-null">Null values</label><input id="jcsv-null" maxLength={100} value={options.nullValue} placeholder="Empty cell" onChange={(event) => updateOption("nullValue", event.target.value)} /></div>
        <div className="jcsv-field"><label htmlFor="jcsv-missing">Missing fields</label><input id="jcsv-missing" maxLength={100} value={options.missingValue} placeholder="Empty cell" onChange={(event) => updateOption("missingValue", event.target.value)} /></div>
      </div><div className="jcsv-check-settings"><label className="jcsv-checkbox"><input type="checkbox" checked={options.includeHeader} onChange={(event) => updateOption("includeHeader", event.target.checked)} />Header row</label><label className="jcsv-checkbox"><input type="checkbox" checked={options.quoteAll} onChange={(event) => updateOption("quoteAll", event.target.checked)} />Quote all fields</label><label className="jcsv-checkbox"><input type="checkbox" checked={options.bom} onChange={(event) => updateOption("bom", event.target.checked)} />UTF-8 BOM for downloads</label><label className="jcsv-checkbox jcsv-protect"><input type="checkbox" checked={options.protectFormulas} onChange={(event) => updateOption("protectFormulas", event.target.checked)} /><ShieldCheck size={14} aria-hidden="true" />Protect formula-like text</label></div>{!options.protectFormulas && <p className="jcsv-risk" role="status">Formula-risk protection is off. Untrusted cells may run as formulas in a spreadsheet. CSV quoting alone does not prevent this.</p>}</div>}

      {!!columns?.length && <details className="jcsv-columns"><summary><Columns3 size={16} aria-hidden="true" /><span>Choose &amp; arrange columns</span><small>{columns.filter((column) => column.enabled).length} of {columns.length} selected</small><ChevronDown size={15} aria-hidden="true" /></summary><div className="jcsv-column-toolbar"><label className="jcsv-sr-only" htmlFor="jcsv-column-search">Find a column</label><input id="jcsv-column-search" value={columnSearch} placeholder="Find a field or header…" onChange={(event) => { setColumnSearch(event.target.value); setColumnsVisible(30); }} /><button type="button" className="jcsv-button-quiet" onClick={() => { invalidate(); setColumns(columns.map((column) => ({ ...column, enabled: true }))); }}>Select all</button><button type="button" className="jcsv-button-quiet" onClick={() => { invalidate(); setColumns(columns.map((column) => ({ ...column, enabled: false }))); }}>Select none</button><button type="button" className="jcsv-button-quiet" onClick={() => { invalidate(); setColumns(defaults.map((column) => ({ ...column }))); }}>Reset columns</button></div>
        <div className="jcsv-column-list">{columnsFiltered.slice(0, columnsVisible).map((column) => {
          const index = columns.findIndex((entry) => entry.id === column.id);
          return <div key={column.id} className="jcsv-column-row"><input type="checkbox" checked={column.enabled} aria-label={`Include column ${index + 1}`} onChange={(event) => editColumn(column.id, { enabled: event.target.checked })} /><span className="jcsv-column-number">{index + 1}</span><div className="jcsv-column-path" title={shortText(column.path || "(root value)", 1_024)}>{shortText(column.path || "(root value)", 120)}</div><label className="jcsv-sr-only" htmlFor={`jcsv-header-${index}`}>Header for column {index + 1}</label><input id={`jcsv-header-${index}`} value={column.header} maxLength={1_024} onChange={(event) => editColumn(column.id, { header: event.target.value })} /><div><button type="button" className="jcsv-icon-button" aria-label={`Move column ${index + 1} up`} disabled={index === 0} onClick={() => moveColumn(column.id, -1)}><ArrowUp size={13} aria-hidden="true" /></button><button type="button" className="jcsv-icon-button" aria-label={`Move column ${index + 1} down`} disabled={index === columns.length - 1} onClick={() => moveColumn(column.id, 1)}><ArrowDown size={13} aria-hidden="true" /></button></div></div>;
        })}</div>{columnsFiltered.length > columnsVisible && <button type="button" className="jcsv-button-quiet jcsv-more" onClick={() => setColumnsVisible((value) => value + 30)}>Show 30 more columns</button>}<p className="jcsv-small">Selection and ordering affect the exported table, not your JSON. Headers must be nonblank and unique. Build CSV after changes.</p></details>}

      <div className="jcsv-build-bar"><p><ShieldCheck size={17} aria-hidden="true" /><span>Precision-aware parsing.<br /><small>No conversion server, no automatic storage.</small></span></p><div>{pending && <button type="button" className="jcsv-button-secondary" onClick={() => { cancelPending(); setNotice("Operation cancelled. The previous input and accepted settings were kept."); }}>Cancel</button>}<button type="button" className="jcsv-button jcsv-build-button" disabled={!inspection || pending} onClick={convert}>{pending ? <Loader2 size={16} className="jcsv-spin" aria-hidden="true" /> : <Table2 size={16} aria-hidden="true" />}{reading ? "Reading file…" : busy === "import" ? "Validating file…" : busy === "convert" ? "Building CSV…" : busy === "inspect" ? "Inspecting…" : `Build ${outputType}`}<ArrowRight size={16} aria-hidden="true" /></button></div></div>
      {error && <p className="jcsv-error" role="alert"><Info size={16} aria-hidden="true" />{error}</p>}<p className="jcsv-status" role="status" aria-live="polite">{notice}</p><p className="jcsv-copy-notice jcsv-copy-global" role="status">{copyNotice}</p>
      {!!inspection?.warnings.length && <ul className="jcsv-inspection-warnings">{inspection.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}

      {!result && <div className="jcsv-output-empty"><Table2 size={22} aria-hidden="true" /><div><h3>{columns ? "Your settings changed. Rebuild to export." : "A table you can actually work with."}</h3><p>{columns ? "The old CSV is hidden so it cannot be confused with the current settings." : "Inspect → choose rows → build. Preview values and columns before anything is copied or saved."}</p></div></div>}
      {result && <section className="jcsv-result" data-testid="json-csv-result" aria-label="CSV conversion result"><div className="jcsv-result-heading"><div><p className="jcsv-eyebrow">03 / REVIEW & EXPORT</p><h2 ref={resultHeading} tabIndex={-1}>Your data, ready to review.</h2></div><span className="jcsv-result-type">{result.options.delimiter === "\t" ? "TSV" : "CSV"} · UTF-8</span></div>
        <div className="jcsv-stats"><div><span>Rows to export</span><strong data-testid="json-csv-row-count">{number(result.stats.outputRows)}</strong><small>{number(result.stats.inputRows)} input {result.stats.inputRows === 1 ? "record" : "records"}</small></div><div><span>Columns selected</span><strong data-testid="json-csv-column-count">{result.stats.exportedColumns}</strong><small>{result.stats.availableColumns} available fields</small></div><div><span>Formula-risk fields</span><strong>{result.stats.formulaRiskFields}</strong><small>{result.stats.protectedFields} prefixed for protection</small></div><div><span>Download size</span><strong>{formatBytes(result.stats.downloadBytes)}</strong><small>{result.options.bom ? "Includes UTF-8 BOM" : "Without UTF-8 BOM"}</small></div></div>
        <div className="jcsv-export-bar"><div><label htmlFor="jcsv-file-name">Filename</label><input id="jcsv-file-name" value={fileName} maxLength={90} onChange={(event) => setFileName(event.target.value)} /><span>.{result.options.delimiter === "\t" ? "tsv" : "csv"}</span></div><div><button type="button" className="jcsv-button-secondary" disabled={copyPending} onClick={() => void copy()}><Clipboard size={15} aria-hidden="true" />{copyPending ? "Copying…" : "Copy full CSV"}</button><button type="button" className="jcsv-button" onClick={download}><Download size={15} aria-hidden="true" />Download {result.options.delimiter === "\t" ? "TSV" : "CSV"}</button></div></div>
        <div className="jcsv-preview-toolbar"><div className="jcsv-view-switch" aria-label="Output preview"><button type="button" aria-pressed={outputView === "table"} onClick={() => setOutputView("table")}><Table2 size={14} aria-hidden="true" />Table preview</button><button type="button" aria-pressed={outputView === "csv"} onClick={() => setOutputView("csv")}><Braces size={14} aria-hidden="true" />CSV text</button></div><span>Preview shows the actual export values</span></div>
        {outputView === "table" ? <><div className="jcsv-table-wrap" tabIndex={0} aria-label="Converted table preview"><table style={{ width: `${Math.max(100, result.headers.length * 155 + 55)}px`, minWidth: "100%" }}><thead><tr><th scope="col" className="jcsv-row-number">Row</th>{result.headers.map((header, index) => <th key={index} scope="col"><span title={shortText(header, 600)}>{shortText(header, 110)}</span></th>)}</tr></thead><tbody>{result.rows.slice(start, start + pageSize).map((row, rowIndex) => <tr key={start + rowIndex}><th scope="row" className="jcsv-row-number">{start + rowIndex + 1}</th>{row.map((value, columnIndex) => <td key={columnIndex}><button type="button" aria-label={`View row ${start + rowIndex + 1}, column ${columnIndex + 1}`} onClick={() => setCell({ title: `Row ${start + rowIndex + 1} · ${shortText(result.headers[columnIndex], 100)}`, value })}>{value === "" ? <span className="jcsv-empty-cell">empty</span> : shortText(value, 160)}</button></td>)}</tr>)}</tbody></table></div><div className="jcsv-pagination"><span>Rows {number(start + 1)}–{number(Math.min(start + pageSize, result.stats.outputRows))} of {number(result.stats.outputRows)}. Click a cell to inspect its full value.</span><div><label htmlFor="jcsv-page-size">Rows per page</label><select id="jcsv-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}>{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select><button type="button" className="jcsv-icon-button" aria-label="Previous page" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)}><ChevronLeft size={15} aria-hidden="true" /></button><button type="button" className="jcsv-icon-button" aria-label="Next page" disabled={shownPage === pages - 1} onClick={() => setPage(shownPage + 1)}><ChevronRight size={15} aria-hidden="true" /></button></div></div></>
          : <div className="jcsv-csv-preview"><label htmlFor="jcsv-output">{result.csv.length > JSON_CSV_LIMITS.previewChars ? "CSV text preview · first 50,000 characters only" : "Full CSV text · no BOM in copied text"}</label><textarea ref={rawPreview} id="jcsv-output" value={csvPreview} readOnly rows={13} spellCheck={false} /><p>Textareas normalize displayed line endings. Use Copy full CSV or Download to preserve the export&apos;s original carriage returns.</p>{result.csv.length > JSON_CSV_LIMITS.previewChars && <p>The preview is shortened. Copy full CSV and Download include all {number(result.stats.outputRows)} rows.</p>}</div>}
        {!result.options.includeHeader && <p className="jcsv-small">The table labels are for review only. Header row is off in the exported file.</p>}
        {cell && <div className="jcsv-cell-detail" role="group" aria-label="Full cell value"><div><label htmlFor="jcsv-cell">{cell.title}</label><button type="button" className="jcsv-icon-button" aria-label="Close cell value" onClick={() => setCell(null)}><X size={15} aria-hidden="true" /></button></div><textarea id="jcsv-cell" readOnly value={cell.value} rows={4} spellCheck={false} /><p>{number(cell.value.length)} characters · actual exported value</p></div>}
        <details className="jcsv-warnings" open={result.stats.formulaRiskFields > 0}><summary><Info size={16} aria-hidden="true" />Conversion notes &amp; spreadsheet safety <span>{result.warnings.length}</span><ChevronDown size={15} aria-hidden="true" /></summary><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p>{result.stats.nullCells} null cells · {result.stats.missingCells} missing cells · {result.stats.numericCells} numeric-token cells. Counts refer to selected output columns.</p></details>
      </section>}
    </section>
  );
}
