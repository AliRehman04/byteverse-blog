"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, ArrowDownToLine, ArrowLeftRight, ArrowRight, Check, ChevronLeft, ChevronRight, FileDiff, FileText, FolderOpen, KeyRound, LoaderCircle, LockKeyhole, Search, ShieldCheck, X } from "lucide-react";
import { startCsvDiffJob, type CsvDiffJob, type CsvDiffOperation } from "@/lib/csv-diff/client";
import { CSV_DIFF_SAMPLES } from "@/lib/csv-diff/samples";
import { CSV_DIFF_LIMITS, CsvDiffError, type Comparison, type CsvDiffSample, type CsvInput, type CsvIssue, type CsvTable, type Delimiter, type DiffOptions, type DiffRow, type Encoding, type ExportFilter } from "@/lib/csv-diff/types";
import styles from "./csv-diff-workspace.module.css";

interface SourceState { mode: "file" | "paste"; text: string; file: File | null; delimiter: Delimiter; encoding: Encoding }
interface Notice { message: string; issues?: CsvIssue[] }
interface Report { url: string; filename: string; rows: number; protectedCells: number; format: "csv" | "json" }
const emptySource = (): SourceState => ({ mode: "file", text: "", file: null, delimiter: "auto", encoding: "utf-8" });
const emptyOptions = (): DiffOptions => ({ keys: [], columns: [], trimValues: false, ignoreCase: false });
const delimiters: { value: Delimiter; label: string }[] = [{ value: "auto", label: "Auto-detect" }, { value: ",", label: "Comma ," }, { value: ";", label: "Semicolon ;" }, { value: "\t", label: "Tab (TSV)" }, { value: "|", label: "Pipe |" }];
const encodings: { value: Encoding; label: string }[] = [{ value: "utf-8", label: "UTF-8" }, { value: "utf-16le", label: "UTF-16 LE" }, { value: "utf-16be", label: "UTF-16 BE" }, { value: "windows-1252", label: "Windows-1252" }];
const filters: { value: ExportFilter; label: string }[] = [{ value: "differences", label: "Differences" }, { value: "all", label: "All rows" }, { value: "changed", label: "Changed" }, { value: "added", label: "Added" }, { value: "removed", label: "Removed" }, { value: "unchanged", label: "Unchanged" }];
const pageSize = 25;
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const compact = (value: string, limit = 100) => value.length > limit ? `${value.slice(0, limit)}…` : value;
const hasSource = (source: SourceState) => source.mode === "file" ? Boolean(source.file) : source.text.length > 0;
const hasWork = (sources: [SourceState, SourceState]) => sources.some(source => source.text.length > 0 || source.file !== null);
const toInput = (source: SourceState): CsvInput => ({ source: source.mode === "file" && source.file ? { file: source.file } : { text: source.text }, delimiter: source.delimiter, encoding: source.encoding });

function TablePreview({ table, name }: { table: CsvTable; name: string }) {
  return <details className={styles.preview}>
    <summary>Preview {name.toLowerCase()} data</summary>
    <p>First {Math.min(3, table.rows.length)} records, {Math.min(6, table.headers.length)} columns. Long preview values are shortened.</p>
    <div className={styles.scroll} role="region" aria-label={`${name} input preview`} tabIndex={0}>
      <table><caption className={styles.srOnly}>{name} input preview</caption><thead><tr>{table.headers.slice(0, 6).map(header => <th key={header} scope="col"><bdi>{header}</bdi></th>)}</tr></thead><tbody>{table.rows.slice(0, 3).map(row => <tr key={row.record}>{row.values.slice(0, 6).map((value, index) => <td key={index}><bdi>{compact(value, 60) || "(empty)"}</bdi></td>)}</tr>)}</tbody></table>
    </div>
  </details>;
}

function SourceCard({ name, source, table, change, chooseFile }: { name: "Original" | "Updated"; source: SourceState; table?: CsvTable; change(patch: Partial<SourceState>): void; chooseFile(file: File): void }) {
  const [dragging, setDragging] = useState(false);
  const prefix = `csv-${name.toLowerCase()}`;
  return <section className={styles.sourceCard} aria-labelledby={`${prefix}-heading`}>
    <div className={styles.sourceTop}><h3 id={`${prefix}-heading`}><span className={styles.sourceLetter}>{name === "Original" ? "A" : "B"}</span>{name} export</h3><div className={styles.segments} aria-label={`${name} input method`}>
      <button type="button" aria-pressed={source.mode === "file"} onClick={() => change({ mode: "file" })}>File</button>
      <button type="button" aria-pressed={source.mode === "paste"} onClick={() => change({ mode: "paste" })}>Paste</button>
    </div></div>
    {source.mode === "file" ? <div className={styles.dropzone} data-dragging={dragging || undefined}
      onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length === 1) chooseFile(event.dataTransfer.files[0]); }}>
      <FolderOpen size={26} strokeWidth={1.5} aria-hidden="true" />
      <label htmlFor={`${prefix}-file`}>{source.file ? compact(source.file.name, 100) : `Choose ${name.toLowerCase()} CSV file`}</label>
      <p>{source.file ? `${(source.file.size / 1024).toFixed(1)} KiB · read on this device` : "or drop one CSV / TSV / TXT here · up to 5 MiB"}</p>
      <input type="file" id={`${prefix}-file`} aria-label={`Choose ${name.toLowerCase()} CSV file`} accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={event => { const file = event.target.files?.[0]; if (file) chooseFile(file); event.target.value = ""; }} />
      {source.file && <button type="button" className={styles.quiet} onClick={() => change({ file: null })}><X size={13} aria-hidden="true" /> Remove file</button>}
    </div> : <div className={styles.paste}>
      <label htmlFor={`${prefix}-text`}>{name} CSV text</label>
      <textarea id={`${prefix}-text`} value={source.text} spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" wrap="off" placeholder={"sku,name,stock\n001,Notebook,12\n002,Pen,30"} onChange={event => change({ text: event.target.value })} aria-describedby={`${prefix}-text-help`} />
      <p id={`${prefix}-text-help`}>{source.text.length.toLocaleString("en")} / 2,000,000 characters · include a header row</p>
    </div>}
    <div className={styles.sourceOptions}>
      <label htmlFor={`${prefix}-delimiter`}>Delimiter<select id={`${prefix}-delimiter`} value={source.delimiter} onChange={event => change({ delimiter: event.target.value as Delimiter })}>{delimiters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {source.mode === "file" && <label htmlFor={`${prefix}-encoding`}>File encoding<select id={`${prefix}-encoding`} value={source.encoding} onChange={event => change({ encoding: event.target.value as Encoding })}>{encodings.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
    </div>
    {table && <div className={styles.inspected}>
      <p><Check size={14} aria-hidden="true" /> {table.rows.length.toLocaleString("en")} records · {table.headers.length} columns · {delimiters.find(option => option.value === table.delimiter)?.label}</p>
      {table.skippedBlankRecords > 0 && <p>{table.skippedBlankRecords} blank physical records skipped.</p>}
      <TablePreview table={table} name={name} />
    </div>}
  </section>;
}

function Value({ value }: { value: string | undefined }) {
  if (value === undefined) return <span className={styles.absent}>Not present</span>;
  if (value === "") return <span className={styles.absent}>Empty string</span>;
  if (value.length <= 240) return <pre className={styles.cellValue} dir="auto">{value}</pre>;
  return <details className={styles.longValue}><summary>{compact(value, 80)} · Show all {value.length.toLocaleString("en")} characters</summary><pre className={styles.cellValue} dir="auto" tabIndex={0}>{value}</pre></details>;
}

function RowReview({ row, result, close }: { row: DiffRow; result: Comparison; close(): void }) {
  const columns = [...new Set([...result.options.keys, ...result.options.columns])];
  return <section className={styles.review} aria-labelledby="csv-review-title">
    <div className={styles.sectionTop}><div><p className={styles.kicker}>BEFORE / AFTER</p><h3 id="csv-review-title">Record review <span className={styles.statusBadge} data-status={row.status}>{row.status}</span></h3></div><button type="button" className={styles.secondary} onClick={close}><X size={15} aria-hidden="true" /> Close review</button></div>
    <p className={styles.help}>Original record {row.before?.record ?? "not present"} · Updated record {row.after?.record ?? "not present"}. Values shown exactly as parsed; excluded columns do not appear here.</p>
    <dl className={styles.keyDetails}>{result.options.keys.map((key, index) => <div key={key}><dt><KeyRound size={12} aria-hidden="true" />{key}</dt><dd><Value value={row.key[index]} /></dd></div>)}</dl>
    <div className={styles.scroll} role="region" aria-label="Before and after field values" tabIndex={0}>
      <table className={styles.detailTable}><caption className={styles.srOnly}>Exact before and after values for the selected record</caption><thead><tr><th scope="col">Field</th><th scope="col">Original</th><th scope="col">Updated</th></tr></thead><tbody>{columns.map(column => <tr key={column} data-changed={row.changedColumns.includes(column) || undefined}><th scope="row"><bdi>{column}</bdi>{row.changedColumns.includes(column) && <span className={styles.fieldChanged}>Changed</span>}</th><td><Value value={row.before?.values[result.originalHeaders.indexOf(column)]} /></td><td><Value value={row.after?.values[result.updatedHeaders.indexOf(column)]} /></td></tr>)}</tbody></table>
    </div>
  </section>;
}

export function CsvDiffTool() {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [sources, setSources] = useState<[SourceState, SourceState]>([emptySource(), emptySource()]);
  const [tables, setTables] = useState<[CsvTable, CsvTable] | null>(null);
  const [options, setOptions] = useState<DiffOptions>(emptyOptions);
  const [result, setResult] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState<"inspect" | "compare" | "export" | null>(null);
  const [error, setError] = useState<Notice | null>(null);
  const [status, setStatus] = useState("Add two exports or try an example. Nothing is uploaded.");
  const [filter, setFilter] = useState<ExportFilter>("differences");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(0);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const currentJob = useRef<CsvDiffJob | null>(null);
  const revision = useRef(0);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const version = revision, job = currentJob;
    return () => { version.current++; job.current?.cancel(); };
  }, []);
  useEffect(() => () => { if (report) URL.revokeObjectURL(report.url); }, [report]);
  useEffect(() => { if (result) resultRef.current?.focus({ preventScroll: true }); }, [result]);

  function stop() {
    revision.current++;
    currentJob.current?.cancel();
    currentJob.current = null;
    setBusy(null);
  }
  function invalidateInputs() {
    stop(); setTables(null); setResult(null); setReport(null); setError(null); setOptions(emptyOptions()); setReviewId(null); setPage(0);
    setStatus("Input changed. Inspect both exports before comparing.");
  }
  function changeSource(index: number, patch: Partial<SourceState>) {
    if (patch.text !== undefined && patch.text.length > CSV_DIFF_LIMITS.inputChars) {
      setError({ message: "Paste exceeds 2,000,000 characters. Your previous text and results were kept; use a smaller input." }); return;
    }
    invalidateInputs();
    setSources(previous => previous.map((source, i) => i === index ? { ...source, ...patch } : source) as [SourceState, SourceState]);
  }
  function chooseFile(index: number, file: File) {
    if (file.size > CSV_DIFF_LIMITS.inputBytes) { setError({ message: "This file is over 5 MiB. Select a smaller export; your existing input was kept." }); return; }
    if (/\.(xlsx?|pdf|zip)$/i.test(file.name)) { setError({ message: "Choose CSV, TSV or delimited text, not a workbook, PDF or archive. Export the sheet as CSV first." }); return; }
    if (sources[index].file && !window.confirm("Replace this file and clear its comparison results?")) return;
    changeSource(index, { mode: "file", file });
  }
  function loadExample(sample: CsvDiffSample) {
    if (hasWork(sources) && !window.confirm("Replace both inputs with this example and clear the current results?")) return;
    invalidateInputs();
    setSources([{ ...emptySource(), mode: "paste", text: sample.original }, { ...emptySource(), mode: "paste", text: sample.updated }]);
    setStatus(`Example loaded: ${sample.description} Inspect the files, then choose ${sample.keys.join(" + ")} as the match key.`);
  }
  function clearAll() {
    if (hasWork(sources) && !window.confirm("Clear both inputs and all results? Downloaded files are not deleted.")) return;
    invalidateInputs(); setSources([emptySource(), emptySource()]); setQuery(""); setFilter("differences");
    setStatus("Workspace cleared. Downloaded files and clipboard data are not deleted.");
  }
  function changeOptions(next: DiffOptions) {
    stop(); setOptions(next); setResult(null); setReport(null); setError(null); setReviewId(null); setPage(0);
    setStatus("Comparison settings changed. Compare again for current results.");
  }
  async function run(operation: CsvDiffOperation) {
    stop();
    const token = revision.current;
    setBusy(operation.kind); setError(null); setReport(null);
    if (operation.kind === "inspect") { setTables(null); setOptions(emptyOptions()); setResult(null); setReviewId(null); }
    if (operation.kind === "compare") { setResult(null); setReviewId(null); }
    const job = startCsvDiffJob(operation);
    currentJob.current = job;
    try {
      const response = await job.promise;
      if (revision.current !== token) return;
      if (response.kind === "inspect") {
        const shared = response.tables[0].headers.filter(header => response.tables[1].headers.includes(header));
        setTables(response.tables); setOptions({ ...emptyOptions(), columns: shared }); setResult(null);
        if (!shared.length) setError({ message: "No exactly matching headers were found. Align header spelling, case and whitespace in the source files before comparing." });
        setStatus(`${response.tables[0].rows.length} original and ${response.tables[1].rows.length} updated records inspected. Select a match key; no key is chosen automatically.`);
      } else if (response.kind === "compare") {
        setResult(response.result); setFilter("differences"); setQuery(""); setPage(0);
        const counts = response.result.counts;
        setStatus(`Comparison complete: ${counts.changed} changed, ${counts.added} added, ${counts.removed} removed and ${counts.unchanged} unchanged records in the selected columns.`);
      } else {
        const blob = new Blob([response.text], { type: response.mime });
        setReport({ url: URL.createObjectURL(blob), filename: response.filename, rows: response.rows, protectedCells: response.protectedCells, format: operation.kind === "export" ? operation.format : "csv" });
        setStatus(`Report ready: ${response.rows} records. Choose Save report to download it to this device.`);
      }
    } catch (caught) {
      if (revision.current !== token) return;
      if (caught instanceof CsvDiffError) setError({ message: caught.message, issues: caught.issues });
      else setError({ message: "Unable to complete the local operation. Your source files were not changed." });
      setStatus("Operation stopped. Review the error and try again.");
    } finally {
      if (revision.current === token) { setBusy(null); currentJob.current = null; }
    }
  }

  const shared = tables ? tables[0].headers.filter(header => tables[1].headers.includes(header)) : [];
  const ignored = tables ? tables.map(table => table.headers.filter(header => !options.columns.includes(header) && !options.keys.includes(header))) : [[], []];
  const filtered = useMemo(() => result?.rows.filter(row => filter === "all" || (filter === "differences" ? row.status !== "unchanged" : row.status === filter)) ?? [], [result, filter]);
  const visible = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    if (!search) return filtered;
    const matches = (values: string[] | undefined) => values?.some(value => value.toLowerCase().includes(search)) ?? false;
    return filtered.filter(row => matches(row.key) || matches(row.before?.values) || matches(row.after?.values));
  }, [filtered, deferredQuery]);
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const review = result?.rows.find(row => row.id === reviewId);

  return <section id="csv-diff-workspace" className={styles.workspace} aria-labelledby="csv-workspace-title" data-csv-diff-workspace>
    <div className={styles.workspaceTop}><div><p className={styles.kicker}>YOUR COMPARISON WORKSPACE</p><h2 id="csv-workspace-title">What changed between exports?</h2></div><span className={styles.localBadge}><LockKeyhole size={14} aria-hidden="true" /> On-device processing</span></div>
    <noscript><p className={styles.notice}>JavaScript is needed to compare files locally. No file is sent without it. The instructions and examples on this page remain available.</p></noscript>
    <fieldset disabled={!ready} className={styles.fieldset}>
      <legend className={styles.srOnly}>CSV comparison controls</legend>
      <div className={styles.workflow} aria-label="Comparison steps"><span data-active={!tables || undefined}><b>1</b> Add exports</span><ArrowRight size={14} aria-hidden="true" /><span data-active={Boolean(tables && !result) || undefined}><b>2</b> Choose keys</span><ArrowRight size={14} aria-hidden="true" /><span data-active={Boolean(result) || undefined}><b>3</b> Review changes</span></div>
      <div className={styles.examples}><span>Try an example</span>{CSV_DIFF_SAMPLES.map(sample => <button type="button" key={sample.id} onClick={() => loadExample(sample)}>{sample.label}</button>)}<button type="button" className={styles.reset} onClick={clearAll}>Clear all</button></div>
      <div className={styles.inputs}>
        <SourceCard name="Original" source={sources[0]} table={tables?.[0]} change={patch => changeSource(0, patch)} chooseFile={file => chooseFile(0, file)} />
        <SourceCard name="Updated" source={sources[1]} table={tables?.[1]} change={patch => changeSource(1, patch)} chooseFile={file => chooseFile(1, file)} />
      </div>
      <div className={styles.inputActions}><button type="button" className={styles.primary} disabled={!sources.every(hasSource) || Boolean(busy)} onClick={() => void run({ kind: "inspect", inputs: [toInput(sources[0]), toInput(sources[1])] })}>{busy === "inspect" ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />} Inspect files</button><button type="button" className={styles.secondary} disabled={!hasWork(sources)} onClick={() => { invalidateInputs(); setSources(([a, b]) => [b, a]); setStatus("Exports swapped. Inspect them again; added and removed refer to the new direction."); }}><ArrowLeftRight size={15} aria-hidden="true" /> Swap sides</button><span>Original → Updated determines additions and removals.</span></div>

      {tables && shared.length > 0 && <section className={styles.setup} aria-labelledby="csv-setup-title">
        <div className={styles.sectionTop}><div><p className={styles.kicker}>STEP 2 · MATCH INTENTIONALLY</p><h3 id="csv-setup-title">Which fields identify the same record?</h3></div><span className={styles.setupCount}>{options.keys.length} / 5 key fields</span></div>
        <p className={styles.help}>Pick a shared ID, SKU, or combination of fields. Keys must be unique and nonblank on each side. Choose the other columns you want to compare.</p>
        <div className={styles.scroll} role="region" aria-label="Choose match keys and compared columns" tabIndex={0}>
          <table className={styles.columnTable}><caption className={styles.srOnly}>Shared exact headers with key and value comparison controls</caption><thead><tr><th scope="col">Shared header</th><th scope="col">Match key</th><th scope="col">Compare value</th></tr></thead><tbody>{shared.map(header => <tr key={header}><th scope="row"><bdi>{header}</bdi></th><td><input type="checkbox" aria-label={`Use ${header} as a match key`} checked={options.keys.includes(header)} disabled={!options.keys.includes(header) && options.keys.length >= CSV_DIFF_LIMITS.keys} onChange={event => changeOptions({ ...options, keys: event.target.checked ? [...options.keys, header] : options.keys.filter(key => key !== header) })} /></td><td><input type="checkbox" aria-label={`Compare ${header} values`} checked={options.columns.includes(header)} onChange={event => changeOptions({ ...options, columns: event.target.checked ? [...options.columns, header] : options.columns.filter(column => column !== header) })} /></td></tr>)}</tbody></table>
        </div>
        {(ignored[0].length > 0 || ignored[1].length > 0) && <div className={styles.notice}><strong>Outside this comparison</strong><p>Original: {ignored[0].join(", ") || "none"}. Updated: {ignored[1].join(", ") || "none"}. These fields do not affect status. Header matching is exact; no automatic mapping is applied.</p></div>}
        <div className={styles.normalization}><label><input type="checkbox" checked={options.trimValues} onChange={event => changeOptions({ ...options, trimValues: event.target.checked })} /> Ignore outer whitespace in values</label><label><input type="checkbox" checked={options.ignoreCase} onChange={event => changeOptions({ ...options, ignoreCase: event.target.checked })} /> Ignore letter case in values</label><p>Defaults are exact text comparison. Key identity is always exact, even with these options enabled.</p></div>
        <button type="button" className={styles.primary} disabled={!options.keys.length || !options.columns.length || Boolean(busy)} onClick={() => void run({ kind: "compare", tables, options })}>{busy === "compare" ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : <FileDiff size={16} aria-hidden="true" />} Compare CSV files</button>
        {!options.keys.length && <p className={styles.help}>Select at least one match key to continue.</p>}
        {!options.columns.length && <p className={styles.help}>Select at least one compared value column.</p>}
      </section>}

      {busy && <div className={styles.progress} role="status"><LoaderCircle size={16} className={styles.spin} aria-hidden="true" /><span>{busy === "inspect" ? "Reading and validating locally…" : busy === "compare" ? "Matching records locally…" : "Preparing the complete report…"}</span><button type="button" className={styles.secondary} onClick={() => { stop(); setStatus("Operation cancelled. Your inputs were kept; no partial result is shown."); }}>Cancel operation</button></div>}
      {error && <div className={styles.error} role="alert"><div><AlertCircle size={18} aria-hidden="true" /><strong>{error.message}</strong></div>{error.issues && <ul>{error.issues.map((issue, index) => <li key={index}><strong>{issue.side === "original" ? "Original" : "Updated"} · {issue.kind === "duplicate-key" ? "Duplicate key" : "Blank key"}</strong> — records {issue.records.join(", ")}. {issue.message}</li>)}</ul>}</div>}
      <p className={styles.statusLine} role="status" aria-live="polite">{status}</p>

      {result && <section className={styles.results} aria-labelledby="csv-results-title" ref={resultRef} tabIndex={-1}>
        <div className={styles.sectionTop}><div><p className={styles.kicker}>STEP 3 · THE CHANGE REPORT</p><h3 id="csv-results-title">{result.counts.changed + result.counts.added + result.counts.removed === 0 ? "No differences in the selected columns." : "Here is what changed."}</h3></div><span className={styles.scopeTag}>{result.options.keys.length === 1 ? "Single" : "Composite"} key · {result.options.columns.length} compared columns</span></div>
        <div className={styles.counts}>{(["changed", "added", "removed", "unchanged"] as const).map(status => <div key={status} data-status={status}><span>{status}</span><strong>{result.counts[status].toLocaleString("en")}</strong></div>)}</div>
        {result.normalizedCells > 0 && <p className={styles.notice}>{result.normalizedCells} raw-different cell pairs were treated as equal by your value options. Review shows their original text.</p>}
        {(result.ignoredColumns.original.length > 0 || result.ignoredColumns.updated.length > 0) && <p className={styles.notice}>Unchanged means equal in your selected columns only. {result.ignoredColumns.original.length} original and {result.ignoredColumns.updated.length} updated fields were excluded.</p>}
        <div className={styles.resultControls}><div className={styles.filters} aria-label="Filter result rows">{filters.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => { stop(); setFilter(item.value); setPage(0); setReport(null); }}>{item.label}</button>)}</div><label className={styles.search}><Search size={15} aria-hidden="true" /><span className={styles.srOnly}>Search result values</span><input type="search" placeholder="Find a key or value" value={query} maxLength={200} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label></div>
        <p className={styles.help}>{visible.length.toLocaleString("en")} matching records · {pageSize} per page. Search filters the preview, not the report. Keys are shortened here; Review shows complete values.</p>
        <div className={styles.scroll} role="region" aria-label="CSV comparison results" tabIndex={0}>
          <table className={styles.resultTable}><caption className={styles.srOnly}>CSV comparison records with key, original and updated source record numbers and review controls</caption><thead><tr><th scope="col">Result</th><th scope="col">Key</th><th scope="col">Source records</th><th scope="col">Change</th><th scope="col"><span className={styles.srOnly}>Actions</span></th></tr></thead><tbody>{visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(row => <tr key={row.id}><td><span className={styles.statusBadge} data-status={row.status}>{row.status}</span></td><th scope="row">{row.key.map((key, index) => <span className={styles.keyPart} key={index}><span>{result.options.keys[index]}</span><bdi>{compact(key, 80)}</bdi></span>)}</th><td>A: {row.before?.record ?? "—"}<br />B: {row.after?.record ?? "—"}</td><td>{row.status === "changed" ? `${row.changedColumns.length} field${row.changedColumns.length === 1 ? "" : "s"} changed` : row.status === "added" ? "Updated only" : row.status === "removed" ? "Original only" : "Selected fields equal"}</td><td><button type="button" className={styles.reviewButton} aria-label={`Review result ${row.id}`} aria-expanded={reviewId === row.id} onClick={() => setReviewId(reviewId === row.id ? null : row.id)}>Review <ArrowRight size={13} aria-hidden="true" /></button></td></tr>)}</tbody></table>
          {!visible.length && <p className={styles.empty}>No records match this filter. Try All rows or clear your search.</p>}
        </div>
        <nav className={styles.pagination} aria-label="Result pagination"><span>Page {currentPage + 1} of {pages}</span><button type="button" className={styles.secondary} aria-label="Previous result page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} aria-hidden="true" /> Previous</button><button type="button" className={styles.secondary} aria-label="Next result page" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next <ChevronRight size={16} aria-hidden="true" /></button></nav>
        {review && <RowReview row={review} result={result} close={() => setReviewId(null)} />}
        <div className={styles.exportBox}><div><h4><ArrowDownToLine size={18} aria-hidden="true" /> Take the complete report</h4><p>{filtered.length.toLocaleString("en")} {filter === "differences" ? "different" : filter === "all" ? "total" : filter} records, across all pages. Search does not limit exports.</p></div><div className={styles.exportButtons}><button type="button" className={styles.primary} disabled={Boolean(busy)} onClick={() => void run({ kind: "export", result, format: "csv", filter })}>Prepare CSV report</button><button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={() => void run({ kind: "export", result, format: "json", filter })}>Prepare JSON report</button></div><p className={styles.exportNote}>CSV adds a tab to suspected formula-like cells; spreadsheets can still change values. JSON preserves exact strings and includes ignored source columns. Both reports contain your data—share deliberately.</p></div>
        {report && <div className={styles.reportReady}><ShieldCheck size={21} aria-hidden="true" /><div><strong>{report.rows.toLocaleString("en")} records ready · {report.format.toUpperCase()}</strong><p>{report.format === "csv" ? `${report.protectedCells} cells prefixed for spreadsheet-oriented protection. This is not a universal safety guarantee.` : "Exact strings and all source columns for the exported records, including excluded fields."}</p></div><a className={styles.primary} href={report.url} download={report.filename}>Save {report.format.toUpperCase()} report <ArrowDownToLine size={15} aria-hidden="true" /></a></div>}
      </section>}
    </fieldset>
    <div className={styles.privacyNote}><LockKeyhole size={15} aria-hidden="true" /><p>CSV contents stay in this page&apos;s memory and its local worker. No uploads, AI calls, automatic saves or third-party scripts on this tool page. Reload clears the workspace, not saved downloads or clipboard copies.</p></div>
  </section>;
}