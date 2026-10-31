"use client";

import { ChevronDown, ChevronUp, ClipboardPaste, FileSpreadsheet, FlaskConical, RefreshCw, Upload, X } from "lucide-react";
import { DEFAULT_IMPORT_OPTIONS, encodingLabel, type DelimiterChoice, type EncodingChoice, type ImportOptions, type QuoteChoice, type StudioSnapshot } from "@/lib/csv-studio/types";
import styles from "./studio.module.css";

const n = (value: number) => value.toLocaleString("en-US");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function sameOptions(a: ImportOptions, b: ImportOptions): boolean {
  return a.encoding === b.encoding && a.delimiter === b.delimiter && (a.delimiter !== "custom" || a.customDelimiter === b.customDelimiter)
    && a.quote === b.quote && a.header === b.header && a.skipRows === b.skipRows && a.comment === b.comment && a.mergeDelimiters === b.mergeDelimiters;
}

const DELIMITERS: { value: DelimiterChoice; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: ",", label: "Comma ( , )" },
  { value: ";", label: "Semicolon ( ; )" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe ( | )" },
  { value: "custom", label: "Custom…" },
  { value: "none", label: "None (one column)" },
];
const ENCODINGS: { value: EncodingChoice; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "utf-8", label: "UTF-8" },
  { value: "windows-1252", label: "Windows-1252 (Western)" },
  { value: "iso-8859-1", label: "ISO-8859-1 (Latin-1)" },
  { value: "utf-16le", label: "UTF-16 LE" },
  { value: "utf-16be", label: "UTF-16 BE" },
];

interface Props {
  snapshot: StudioSnapshot;
  draft: ImportOptions;
  busy: boolean;
  collapsed: boolean;
  editCount: number;
  onDraft(next: ImportOptions): void;
  onApply(): void;
  onLab(): void;
  onReplace(): void;
  onPaste(): void;
  onClose(): void;
  onToggle(): void;
}

export function SetupPanel({ snapshot, draft, busy, collapsed, editCount, onDraft, onApply, onLab, onReplace, onPaste, onClose, onToggle }: Props) {
  const { report, source } = snapshot;
  const dirty = !sameOptions(draft, snapshot.options);
  const set = (patch: Partial<ImportOptions>) => onDraft({ ...draft, ...patch });
  const encodingText = `${encodingLabel(report.encoding.used)}${report.encoding.bom ? " with BOM" : ""}`;
  const customInvalid = draft.delimiter === "custom" && (draft.customDelimiter.length !== 1 || /["'\r\n]/.test(draft.customDelimiter));
  return (
    <aside className={styles.left} aria-label="Source and import settings" data-collapsed={collapsed || undefined}>
      <div className={styles.panelHeader}>
        <h2>Source</h2>
        <button type="button" className={`${styles.buttonQuiet} ${styles.small} ${styles.panelToggle}`} aria-expanded={!collapsed} aria-controls="csv-studio-setup" onClick={onToggle}>
          {collapsed ? <>Import settings <ChevronDown size={14} aria-hidden="true" /></> : <>Hide settings <ChevronUp size={14} aria-hidden="true" /></>}
        </button>
      </div>
      <div className={styles.panelBody} id="csv-studio-setup">
        <div className={styles.fileCard}>
          <div className={styles.fileName}>
            <span className={styles.fileIcon}><FileSpreadsheet size={18} aria-hidden="true" /></span>
            <div>
              <strong>{source.name}</strong>
              <span>
                {source.kind === "paste" ? "Pasted text" : source.kind === "sample" ? "Sample file" : formatBytes(source.size)}
                {source.container !== "plain" ? ` · from ${source.container === "gzip" ? ".gz" : ".zip"}${source.innerName ? ` (${source.innerName})` : ""}` : ""}
              </span>
            </div>
          </div>
          <div className={styles.fileActions}>
            <button type="button" className={`${styles.button} ${styles.small}`} onClick={onReplace} disabled={busy}><Upload size={13} aria-hidden="true" /> Replace</button>
            <button type="button" className={`${styles.button} ${styles.small}`} onClick={onPaste} disabled={busy}><ClipboardPaste size={13} aria-hidden="true" /> Paste</button>
            <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={onClose} disabled={busy}><X size={13} aria-hidden="true" /> Close</button>
          </div>
        </div>

        <section className={styles.section} aria-labelledby="csv-studio-detected">
          <h3 id="csv-studio-detected" className={styles.sectionTitle}>Detected</h3>
          <dl className={styles.meta}>
            <dt>Encoding</dt><dd>{encodingText}{report.encoding.choice === "auto" ? "" : " (chosen)"}</dd>
            <dt>Delimiter</dt><dd>{report.delimiter.label}{report.delimiter.choice === "auto" ? "" : " (chosen)"}</dd>
            <dt>Line endings</dt><dd>{report.lineEndings.style}</dd>
            <dt>Data rows</dt><dd>{n(snapshot.rowCount)}{snapshot.rowCount !== snapshot.importedRowCount ? ` of ${n(snapshot.importedRowCount)}` : ""}</dd>
            <dt>Columns</dt><dd>{n(snapshot.columns.filter((column) => !column.hidden).length)}</dd>
            <dt>Header</dt><dd>{snapshot.options.header ? `Row ${n(snapshot.options.skipRows + 1)}` : "None, names generated"}</dd>
            {report.skippedRecords > 0 && <><dt>Skipped</dt><dd>{n(report.skippedRecords)} row{report.skippedRecords === 1 ? "" : "s"}</dd></>}
            {report.commentLines > 0 && <><dt>Comments</dt><dd>{n(report.commentLines)} ignored</dd></>}
          </dl>
          <p className={styles.reason}><strong>Encoding.</strong> {report.encoding.reason}</p>
          <p className={styles.reason}><strong>Delimiter.</strong> {report.delimiter.reason}</p>
        </section>

        <section className={styles.section} aria-labelledby="csv-studio-settings">
          <h3 id="csv-studio-settings" className={styles.sectionTitle}>Import settings</h3>
          <label className={styles.field}>Delimiter
            <select className={styles.select} value={draft.delimiter} onChange={(event) => set({ delimiter: event.target.value as DelimiterChoice })}>
              {DELIMITERS.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {draft.delimiter === "custom" && (
            <label className={styles.field}>Custom delimiter (one character)
              <input className={styles.input} value={draft.customDelimiter} maxLength={1} aria-invalid={customInvalid} onChange={(event) => set({ customDelimiter: event.target.value })} />
            </label>
          )}
          <div className={styles.inline}>
            <label className={styles.field}>Encoding
              <select className={styles.select} value={draft.encoding} onChange={(event) => set({ encoding: event.target.value as EncodingChoice })}>
                {ENCODINGS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button type="button" className={styles.button} onClick={onLab} disabled={busy} title="Compare encodings side by side"><FlaskConical size={14} aria-hidden="true" /> Compare</button>
          </div>
          <div className={styles.fieldRow}>
            <label className={styles.field}>Quote character
              <select className={styles.select} value={draft.quote} onChange={(event) => set({ quote: event.target.value as QuoteChoice })}>
                <option value={"\""}>Double (&quot;)</option>
                <option value="'">Single (&apos;)</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className={styles.field}>Skip rows at top
              <input className={styles.input} type="number" min={0} max={100} value={draft.skipRows} onChange={(event) => set({ skipRows: Math.max(0, Math.min(100, Math.floor(Number(event.target.value) || 0))) })} />
            </label>
          </div>
          <label className={styles.check}><input type="checkbox" checked={draft.header} onChange={(event) => set({ header: event.target.checked })} /> First row contains column names</label>
          <label className={styles.field}>Ignore lines starting with
            <input className={styles.input} value={draft.comment} maxLength={3} placeholder="Off" onChange={(event) => set({ comment: event.target.value.replace(/[\r\n]/g, "") })} />
          </label>
          <label className={styles.check}><input type="checkbox" checked={draft.mergeDelimiters} onChange={(event) => set({ mergeDelimiters: event.target.checked })} /><span>Merge consecutive delimiters<small>Off keeps empty fields, which is correct for CSV. Turn on only for space-aligned exports.</small></span></label>
          {dirty ? (
            <div className={styles.applyBar} role="region" aria-label="Unapplied import settings">
              <button type="button" className={`${styles.buttonPrimary} ${styles.block}`} onClick={onApply} disabled={busy || customInvalid}><RefreshCw size={14} aria-hidden="true" /> Apply &amp; re-read file</button>
              <p className={styles.hint}>{editCount > 0 ? `Re-reading starts a new working copy, so your ${n(editCount)} applied change${editCount === 1 ? "" : "s"} will be cleared.` : "Re-reads the original file with these settings."}</p>
              <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={() => onDraft(snapshot.options)}>Discard changes</button>
            </div>
          ) : (
            sameOptions(draft, DEFAULT_IMPORT_OPTIONS) ? null : <button type="button" className={`${styles.buttonQuiet} ${styles.small}`} onClick={() => onDraft({ ...DEFAULT_IMPORT_OPTIONS })}>Back to automatic settings</button>
          )}
        </section>
        <p className={styles.hint}>Read in {n(Math.round(report.decodeMs + report.parseMs))} ms · checked in {n(Math.round(report.validateMs))} ms · {n(report.chars)} characters</p>
      </div>
    </aside>
  );
}
