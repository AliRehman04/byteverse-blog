"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Download, FileSpreadsheet, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ExportFormat, ExportOptions, ExportResult, StudioSnapshot } from "@/lib/csv-studio/types";
import { formatBytes } from "./setup-panel";
import styles from "./studio.module.css";

const n = (value: number) => value.toLocaleString("en-US");
const EXTENSION: Record<ExportFormat, string> = { xlsx: ".xlsx", csv: ".csv", tsv: ".tsv", json: ".json" };
const PRIMARY: Record<ExportFormat, string> = { xlsx: "Export Excel (.xlsx)", csv: "Export CSV", tsv: "Export TSV", json: "Export JSON" };
const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "json", label: "JSON" },
];

export type ExportState =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; result: ExportResult; url: string }
  | { kind: "failed"; message: string };

interface Props {
  snapshot: StudioSnapshot;
  baseName: string;
  selectedRows: { top: number; bottom: number } | null;
  state: ExportState;
  onExport(options: ExportOptions): void;
  onCancel(): void;
  onDismiss(): void;
}

export function ExportDock({ snapshot, baseName, selectedRows, state, onExport, onCancel, onDismiss }: Props) {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [fileName, setFileName] = useState(`${baseName}-repaired`);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [onlySelected, setOnlySelected] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeChanges, setIncludeChanges] = useState(true);
  const [csvDelimiter, setCsvDelimiter] = useState<ExportOptions["csvDelimiter"]>(",");
  const [csvSafe, setCsvSafe] = useState(true);
  const [csvBom, setCsvBom] = useState(true);
  const [csvLineEnding, setCsvLineEnding] = useState<ExportOptions["csvLineEnding"]>("crlf");
  const [csvQuoteAll, setCsvQuoteAll] = useState(false);
  const useSelection = onlySelected && selectedRows !== null;

  const blocker = format === "xlsx" ? snapshot.blockers.xlsx : format === "json" ? snapshot.blockers.json : null;
  const errors = snapshot.issues.filter((issue) => issue.severity === "error").length;
  const hidden = snapshot.columns.filter((column) => column.hidden).length;
  const running = state.kind === "running";
  const textFormat = format === "csv" || format === "tsv";
  const rows = useSelection && selectedRows ? selectedRows.bottom - selectedRows.top + 1 : snapshot.rowCount;

  const submit = () => onExport({
    format,
    fileName: fileName.trim() || `${baseName}-repaired`,
    includeHidden,
    includeHeader: format === "json" ? true : includeHeader,
    rows: useSelection && selectedRows ? selectedRows : "all",
    includeSummary: format === "xlsx" && includeSummary,
    includeChanges: format === "xlsx" && includeChanges,
    csvDelimiter: format === "tsv" ? "\t" : csvDelimiter,
    csvSafe,
    csvBom,
    csvLineEnding,
    csvQuoteAll,
  });

  return (
    <section className={styles.dock} aria-labelledby="csv-studio-export-title">
      <div className={styles.dockMain}>
        <div className={styles.dockTitle}>
          <h2 id="csv-studio-export-title">Export</h2>
          <p>{n(rows)} row{rows === 1 ? "" : "s"} · {n(snapshot.columns.filter((column) => includeHidden || !column.hidden).length)} columns · built in your browser</p>
        </div>
        <div className={styles.dockField}>
          <span id="csv-studio-format-label">Format</span>
          <div className={styles.segmented} role="group" aria-labelledby="csv-studio-format-label">
            {FORMATS.map((item) => <button key={item.value} type="button" aria-pressed={format === item.value} onClick={() => setFormat(item.value)}>{item.label}</button>)}
          </div>
        </div>
        <label className={`${styles.dockField} ${styles.fileNameField}`}>File name
          <span className={styles.inline} style={{ alignItems: "center" }}>
            <input className={styles.input} value={fileName} maxLength={120} spellCheck={false} onChange={(event) => setFileName(event.target.value)} />
            <span className={styles.mono} aria-hidden="true">{EXTENSION[format]}</span>
          </span>
        </label>
        <div className={styles.dockEnd}>
          <button id="csv-studio-export-primary" type="button" className={styles.buttonPrimary} disabled={Boolean(blocker) || running} onClick={submit}>
            {format === "xlsx" ? <FileSpreadsheet size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />} {PRIMARY[format]}
          </button>
        </div>
      </div>

      <div className={styles.dockOptions} role="group" aria-label="Export options">
        {format !== "json" && <label className={styles.check}><input type="checkbox" checked={includeHeader} onChange={(event) => setIncludeHeader(event.target.checked)} /> Header row</label>}
        {hidden > 0 && <label className={styles.check}><input type="checkbox" checked={includeHidden} onChange={(event) => setIncludeHidden(event.target.checked)} /> Include {hidden} hidden column{hidden === 1 ? "" : "s"}</label>}
        {selectedRows && <label className={styles.check}><input type="checkbox" checked={useSelection} onChange={(event) => setOnlySelected(event.target.checked)} /> Only selected rows ({n(selectedRows.top + 1)}–{n(selectedRows.bottom + 1)})</label>}
        {format === "xlsx" && <>
          <label className={styles.check}><input type="checkbox" checked={includeSummary} onChange={(event) => setIncludeSummary(event.target.checked)} /> Validation summary sheet</label>
          <label className={styles.check}><input type="checkbox" checked={includeChanges} onChange={(event) => setIncludeChanges(event.target.checked)} /> Applied changes sheet</label>
        </>}
        {format === "csv" && (
          <label className={styles.check} style={{ alignItems: "center" }}>Delimiter
            <select className={styles.select} style={{ width: 130 }} value={csvDelimiter} onChange={(event) => setCsvDelimiter(event.target.value as ExportOptions["csvDelimiter"])}>
              <option value=",">Comma</option>
              <option value=";">Semicolon</option>
              <option value="|">Pipe</option>
            </select>
          </label>
        )}
        {textFormat && <>
          <label className={styles.check}><input type="checkbox" checked={csvSafe} onChange={(event) => setCsvSafe(event.target.checked)} /><span>Spreadsheet-safe<small>Adds an apostrophe before values that start with = + - @</small></span></label>
          <label className={styles.check}><input type="checkbox" checked={csvBom} onChange={(event) => setCsvBom(event.target.checked)} /><span>UTF-8 BOM<small>Helps Excel read accents correctly</small></span></label>
          <label className={styles.check}><input type="checkbox" checked={csvLineEnding === "crlf"} onChange={(event) => setCsvLineEnding(event.target.checked ? "crlf" : "lf")} /><span>Windows line endings<small>CRLF, as RFC 4180 specifies</small></span></label>
          <label className={styles.check}><input type="checkbox" checked={csvQuoteAll} onChange={(event) => setCsvQuoteAll(event.target.checked)} /> Quote every field</label>
        </>}
        {format === "json" && <p className={styles.hint}>An array of objects keyed by column name. Every value stays a string, so IDs keep their zeros.</p>}
      </div>

      {format === "xlsx" && !blocker && (
        <p className={styles.caveat} style={{ background: "var(--cs-ok-soft)" }}><ShieldCheck size={15} aria-hidden="true" style={{ color: "var(--cs-ok)" }} />Text and identifier columns are written as text cells, so leading zeros and long IDs open in Excel exactly as shown. Nothing is written as a formula.</p>
      )}
      {textFormat && (
        <p className={styles.caveat}><TriangleAlert size={15} aria-hidden="true" />{format.toUpperCase()} files can’t store column types. If someone double-clicks this file to open it in Excel, leading zeros and long IDs can still be lost. Use Excel (.xlsx) to keep them.</p>
      )}
      {blocker && <p className={styles.caveat} role="alert" style={{ background: "var(--cs-danger-soft)" }}><CircleAlert size={15} aria-hidden="true" style={{ color: "var(--cs-danger)" }} />{blocker}</p>}
      {!blocker && errors > 0 && <p className={styles.caveat}><TriangleAlert size={15} aria-hidden="true" />{n(errors)} error{errors === 1 ? " is" : "s are"} still open. {errors === 1 ? "It" : "They"} will be exported exactly as the grid shows.</p>}

      {state.kind === "running" && (
        <div className={styles.exportProgress} role="status">
          <span>Building {format.toUpperCase()}… {state.total ? `${Math.round((state.done / state.total) * 100)}%` : ""}</span>
          <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${state.total ? (state.done / state.total) * 100 : 0}%` }} data-indeterminate={!state.total || undefined} /></div>
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={onCancel}>Cancel</button>
        </div>
      )}
      {state.kind === "done" && (
        <div className={styles.result} role="status">
          <h3><CircleCheck size={16} aria-hidden="true" /> {state.result.fileName} · {formatBytes(state.result.size)}</h3>
          <ul className={styles.verification} aria-label="Checks run on the exported file">
            {state.result.verification.map((line, index) => <li key={index}><CircleCheck size={13} aria-hidden="true" />{line}</li>)}
          </ul>
          {state.result.notes.length > 0 && <div className={styles.notes}>{state.result.notes.map((note, index) => <p key={index}>{note}</p>)}</div>}
          <div className={styles.actions}>
            <a className={`${styles.button} ${styles.small}`} href={state.url} download={state.result.fileName}><Download size={13} aria-hidden="true" /> Download again</a>
            <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={onDismiss}>Done</button>
          </div>
        </div>
      )}
      {state.kind === "failed" && (
        <div className={styles.result} data-failed role="alert">
          <h3><CircleAlert size={16} aria-hidden="true" /> Export didn’t finish</h3>
          <p className={styles.hint}>{state.message}</p>
          <div className={styles.actions}><button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={onDismiss}>Dismiss</button></div>
        </div>
      )}
    </section>
  );
}
