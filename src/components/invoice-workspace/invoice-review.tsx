import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, ArrowRight, BadgeCheck, Check, ChevronLeft, ChevronRight,
  FileSearch, FileText, Info, ScanLine,
} from "lucide-react";
import { pdfErrorMessage, previewInvoicePage } from "../../lib/invoice/pdf-client";
import { reviewKey } from "../../lib/invoice/review-state";
import { FIELD_LABELS, INVOICE_FIELDS } from "../../lib/invoice/types";
import type { ExtractionOptions, InvoiceField, InvoiceIssue, InvoiceRecord, SourceLine } from "../../lib/invoice/types";
import { canReview, CURRENCIES, validateInvoice } from "../../lib/invoice/validation";

const REQUIRED = new Set<InvoiceField>(["vendor", "invoiceNumber", "invoiceDate", "currency", "total"]);
const AMOUNTS = new Set<InvoiceField>(["subtotal", "tax", "discount", "shipping", "total"]);
const EDITOR_ORDER: readonly InvoiceField[] = ["vendor", "invoiceNumber", "invoiceDate", "currency", "total", "subtotal", "tax", "discount", "shipping"];

interface InvoiceReviewProps {
  record: InvoiceRecord;
  file?: File;
  records: readonly InvoiceRecord[];
  options: ExtractionOptions;
  reviewRevision: number;
  disabled: boolean;
  previewPaused: boolean;
  hasNext: boolean;
  onFieldChange: (id: string, field: InvoiceField, value: string) => void;
  onFieldCommit: (id: string, field: InvoiceField, value: string, source?: SourceLine, format?: "dot" | "comma") => void;
  onIncludeChange: (id: string, included: boolean) => void;
  onMarkReviewed: (id: string, key: string, revision: number) => void;
  onNext: () => void;
}

function PdfPreview({ file, page }: { file: File; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const controller = new AbortController();
    void previewInvoicePage(file, page, element, controller.signal).then(() => {
      if (!controller.signal.aborted) setState("ready");
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) {
        setError(pdfErrorMessage(failure));
        setState("error");
      }
    });
    return () => {
      controller.abort();
      element.width = 0;
      element.height = 0;
    };
  }, [file, page]);

  return (
    <div className="iw-preview" aria-busy={state === "loading"}>
      {state === "loading" && <p className="iw-preview-message" role="status"><ScanLine aria-hidden="true" size={20} /> Rendering page {page} locally…</p>}
      {state === "error" && <p className="iw-preview-message iw-inline-error" role="alert"><AlertCircle aria-hidden="true" size={20} /> {error} The extracted text is still available in Source text.</p>}
      <canvas ref={canvas} className={state === "ready" ? "iw-canvas" : "iw-canvas iw-canvas-hidden"}
        role="img" aria-label={`Original invoice, page ${page}`} />
    </div>
  );
}

function IssueList({ title, issues, tone }: { title: string; issues: InvoiceIssue[]; tone: "error" | "warning" | "info" }) {
  if (!issues.length) return null;
  const Icon = tone === "error" ? AlertCircle : tone === "warning" ? AlertTriangle : Info;
  return (
    <section className={`iw-issue-group iw-issue-${tone}`}>
      <h5><Icon aria-hidden="true" size={17} /> {title} <span>({issues.length})</span></h5>
      <ul>{issues.map((issue, index) => <li key={`${issue.code}-${issue.field ?? "document"}-${index}`}>{issue.message}</li>)}</ul>
    </section>
  );
}

export function InvoiceReview({
  record, file, records, options, reviewRevision, disabled, previewPaused, hasNext,
  onFieldChange, onFieldCommit, onIncludeChange, onMarkReviewed, onNext,
}: InvoiceReviewProps) {
  const id = useId();
  const [tab, setTab] = useState<"original" | "text">("original");
  const [page, setPage] = useState(1);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [sourceValue, setSourceValue] = useState("");
  const [targetField, setTargetField] = useState<InvoiceField>("total");
  const [sourceFormat, setSourceFormat] = useState<"dot" | "comma">("dot");
  const [sourceMessage, setSourceMessage] = useState("");
  const [ackKey, setAckKey] = useState<string | null>(null);
  const [ackRevision, setAckRevision] = useState(-1);
  const originalTab = useRef<HTMLButtonElement>(null);
  const textTab = useRef<HTMLButtonElement>(null);
  const issues = useMemo(() => validateInvoice(record, records), [record, records]);
  const errors = issues.filter(issue => issue.severity === "error");
  const warnings = issues.filter(issue => issue.severity === "warning");
  const infos = issues.filter(issue => issue.severity === "info");
  const key = reviewKey(record, records);
  const acknowledged = ackKey === key && ackRevision === reviewRevision;
  const reviewAllowed = canReview(record, records);
  const changedSinceAcknowledgement = ackKey !== null && !acknowledged;
  const currentPage = Math.min(Math.max(1, page), Math.max(1, record.pageCount));
  const lines = record.lines.filter(line => line.page === currentPage);
  const selectedLine = record.lines.find(line => line.id === selectedLineId);

  function selectLine(line: SourceLine) {
    setSelectedLineId(line.id);
    setSourceValue(line.text);
    setSourceMessage("");
  }

  return (
    <section id="iw-review-panel" tabIndex={-1} className="iw-card iw-review" aria-labelledby={`${id}-heading`}>
      <header className="iw-review-header">
        <div className="iw-review-title">
          <p className="iw-eyebrow">02 / CHECK THE ORIGINAL</p>
          <h3 id={`${id}-heading`}>{record.fileName}</h3>
          <div className="iw-meta-row">
            <span>{record.pageCount} {record.pageCount === 1 ? "page" : "pages"}</span>
            {record.sample && <span className="iw-pill iw-pill-sample">Fictional sample</span>}
            <span className={`iw-pill ${record.reviewed ? "iw-pill-success" : "iw-pill-warning"}`}>
              {record.reviewed ? "Reviewed" : "Needs review"}
            </span>
          </div>
        </div>
        <label className="iw-check-label iw-include-label">
          <input type="checkbox" checked={record.included} disabled={disabled}
            onChange={event => onIncludeChange(record.id, event.target.checked)} />
          Include in export
        </label>
      </header>

      {!record.included && <p className="iw-notice iw-notice-neutral"><Info aria-hidden="true" size={18} /> This invoice is excluded. Including it again will require a new review.</p>}
      {record.sample && <p className="iw-sample-note">Fictional data for practice, not a real transaction. Sample exports are labelled in the review notes.</p>}

      <div className="iw-review-content">
      <div className="iw-review-source">
      <div className="iw-source-toolbar">
        <div className="iw-tabs" role="tablist" aria-label="Invoice source"
          onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "original" : event.key === "End" ? "text" : tab === "original" ? "text" : "original";
            setTab(next);
            (next === "original" ? originalTab : textTab).current?.focus();
          }}>
          <button ref={originalTab} type="button" id={`${id}-original`} role="tab" aria-selected={tab === "original"}
            aria-controls={`${id}-source`} tabIndex={tab === "original" ? 0 : -1} onClick={() => setTab("original")}>
            <ScanLine aria-hidden="true" size={16} /> Original PDF
          </button>
          <button ref={textTab} type="button" id={`${id}-text`} role="tab" aria-selected={tab === "text"}
            aria-controls={`${id}-source`} tabIndex={tab === "text" ? 0 : -1} onClick={() => setTab("text")}>
            <FileText aria-hidden="true" size={16} /> Source text
          </button>
        </div>
        <div className="iw-page-controls" aria-label="Source page navigation">
          <button type="button" className="iw-icon-button" aria-label="Previous source page" disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden="true" size={18} /></button>
          <span aria-live="polite">{currentPage} / {record.pageCount}</span>
          <button type="button" className="iw-icon-button" aria-label="Next source page" disabled={currentPage >= record.pageCount}
            onClick={() => setPage(currentPage + 1)}><ChevronRight aria-hidden="true" size={18} /></button>
        </div>
      </div>

      <div id={`${id}-source`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="iw-source-panel">
        {tab === "original" ? (
          previewPaused ? <p className="iw-preview-message"><ScanLine aria-hidden="true" size={22} /> Preview is paused while the batch is busy. Source text remains available.</p> :
            file ? <PdfPreview key={`${record.id}-${currentPage}`} file={file} page={currentPage} /> :
              <p className="iw-preview-message iw-inline-error">The original file is no longer available. Remove this record and select the PDF again.</p>
        ) : (
          <div className="iw-text-source">
            <p className="iw-source-hint">Digital text from page {currentPage}. Select or copy a line; nothing is assigned automatically.</p>
            {lines.length ? (
              <ol className="iw-source-lines" aria-label={`Extracted text on page ${currentPage}`}>
                {lines.map(line => (
                  <li key={line.id} className={line.id === selectedLineId ? "iw-source-line iw-source-line-selected" : "iw-source-line"}>
                    <label>
                      <input type="radio" name={`${id}-source-line`} checked={line.id === selectedLineId} disabled={disabled}
                        onChange={() => selectLine(line)} />
                      <span className="iw-line-page">p{line.page}</span>
                      <span className="iw-line-text">{line.text}</span>
                    </label>
                  </li>
                ))}
              </ol>
            ) : <p className="iw-empty-text">No digital text was extracted from this page.</p>}
            <fieldset className="iw-source-assignment iw-fieldset" disabled={disabled}>
              <legend>Use a source line</legend>
              <p>Edit the text below to keep only the value, removing its label. Then choose the field to update.</p>
              <div className="iw-field">
                <label htmlFor={`${id}-source-value`}>Selected value{selectedLine ? ` · page ${selectedLine.page}` : ""}</label>
                <input id={`${id}-source-value`} type="text" value={sourceValue} autoComplete="off" spellCheck={false}
                  maxLength={4096} disabled={!selectedLine || disabled} placeholder="Select a line above first"
                  onChange={event => { setSourceValue(event.target.value); setSourceMessage(""); }} />
              </div>
              <div className="iw-field-grid">
                <div className="iw-field">
                  <label htmlFor={`${id}-target-field`}>Assign to field</label>
                  <select id={`${id}-target-field`} value={targetField} onChange={event => setTargetField(event.target.value as InvoiceField)}>
                    {INVOICE_FIELDS.map(field => <option key={field} value={field}>{FIELD_LABELS[field]}</option>)}
                  </select>
                </div>
                {AMOUNTS.has(targetField) && <div className="iw-field">
                  <label htmlFor={`${id}-source-format`}>Selected amount format</label>
                  <select id={`${id}-source-format`} value={sourceFormat} onChange={event => setSourceFormat(event.target.value as "dot" | "comma")}>
                    <option value="dot">1,234.56 · decimal point</option>
                    <option value="comma">1.234,56 · decimal comma</option>
                  </select>
                </div>}
              </div>
              {targetField === "invoiceDate" && <p className="iw-note">Source dates use {options.dateOrder === "auto" ? "Auto: ambiguous day/month dates need correction" : options.dateOrder === "dmy" ? "DD/MM/YYYY" : "MM/DD/YYYY"}. The editor below uses a calendar date.</p>}
              <button type="button" className="iw-button" disabled={!selectedLine || disabled}
                onClick={() => {
                  if (!selectedLine || disabled) return;
                  onFieldCommit(record.id, targetField, sourceValue, selectedLine, sourceFormat);
                  setSourceMessage(`Selected text assigned to ${FIELD_LABELS[targetField].toLowerCase()}. Check the field and its validation below.`);
                }}>
                <ArrowRight aria-hidden="true" size={16} /> Use selected line
              </button>
              <p className="iw-feedback" role="status">{sourceMessage}</p>
            </fieldset>
          </div>
        )}
      </div>
      <p className="iw-note iw-preview-note">Original pages are rendered locally, without interactive PDF links or annotations. Extraction is a starting point, not a guarantee of accuracy.</p>
      </div>

      <div className="iw-review-fields-column">
      <fieldset className="iw-fieldset iw-invoice-fields" disabled={disabled}>
        <legend>Invoice fields</legend>
        <p id={`${id}-field-help`} className="iw-note">* Required. Amounts use a decimal point, without grouping. Values normalize when you leave a field (0.10 → 0.1); invalid input is kept for correction. No rounding.</p>
        <div className="iw-field-grid">
          {EDITOR_ORDER.map(field => {
            const fieldIssues = issues.filter(issue => issue.field === field && issue.severity === "error");
            const evidence = record.evidence[field];
            const value = record.fields[field];
            const validDate = field !== "invoiceDate" || /^\d{4}-\d{2}-\d{2}$/.test(value) && !fieldIssues.length;
            const fieldId = `${id}-field-${field}`;
            return (
              <div key={field} className={`iw-field ${field === "vendor" ? "iw-field-wide" : ""} ${field === "total" ? "iw-field-total" : ""}`}>
                <label htmlFor={fieldId}>{FIELD_LABELS[field]} {REQUIRED.has(field) && <span className="iw-required" aria-hidden="true">*</span>}</label>
                {field === "currency" ? (
                  <select id={fieldId} value={value} required aria-invalid={Boolean(fieldIssues.length)}
                    aria-describedby={`${id}-field-help ${fieldId}-errors ${fieldId}-evidence`}
                    onChange={event => onFieldCommit(record.id, field, event.target.value)}>
                    <option value="">Select currency</option>
                    {value && !CURRENCIES.includes(value) && <option value={value}>Unrecognized: {value}</option>}
                    {CURRENCIES.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                ) : (
                  <input id={fieldId} type={field === "invoiceDate" ? "date" : "text"} autoComplete="off" spellCheck={false}
                    inputMode={AMOUNTS.has(field) ? "decimal" : undefined} required={REQUIRED.has(field)}
                    maxLength={field === "vendor" ? 160 : field === "invoiceNumber" ? 96 : 256}
                    min={field === "invoiceDate" ? "0001-01-01" : undefined} max={field === "invoiceDate" ? "9999-12-31" : undefined}
                    value={field === "invoiceDate" && !validDate ? "" : value}
                    placeholder={AMOUNTS.has(field) ? REQUIRED.has(field) ? "e.g. 1234.56" : "Optional" : undefined}
                    aria-invalid={Boolean(fieldIssues.length)} aria-describedby={`${id}-field-help ${fieldId}-errors ${fieldId}-evidence`}
                    onChange={event => onFieldChange(record.id, field, event.target.value)}
                    onBlur={event => {
                      if (field === "invoiceDate" && !validDate && value && !event.currentTarget.value) return;
                      onFieldCommit(record.id, field, event.currentTarget.value);
                    }} />
                )}
                {field === "invoiceDate" && !validDate && value && <p className="iw-invalid-value">Unrecognized input kept for correction: <span>{value}</span></p>}
                <div id={`${fieldId}-errors`} className="iw-field-errors">
                  {fieldIssues.map((issue, index) => <p key={`${issue.code}-${index}`}>{issue.message}</p>)}
                </div>
                <div id={`${fieldId}-evidence`}>
                  {evidence ? (
                    <details className="iw-evidence">
                      <summary><FileSearch aria-hidden="true" size={13} /> {evidence.page > 0 ? `p${evidence.page} · ${evidence.method}` : "Manual · no source line"}</summary>
                      <p>{evidence.method === "manual" ? "Manual entry. Any excerpt below is the original reference, not verification of the edited value." : "Original source excerpt:"}</p>
                      <blockquote>{evidence.text.slice(0, 420)}{evidence.text.length > 420 ? "…" : ""}</blockquote>
                      {record.lines.some(line => line.id === evidence.lineId) && <button type="button" className="iw-text-button"
                        onClick={() => {
                          const source = record.lines.find(line => line.id === evidence.lineId);
                          if (!source) return;
                          setPage(source.page);
                          setTab("text");
                          selectLine(source);
                          textTab.current?.focus();
                        }}>Locate in source text <ArrowRight aria-hidden="true" size={13} /></button>}
                    </details>
                  ) : <span className="iw-field-hint">No source selected. Check the original.</span>}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <section className="iw-validation" aria-labelledby={`${id}-checks`}>
        <div className="iw-section-heading">
          <h4 id={`${id}-checks`}>Checks &amp; review notes</h4>
          <span className="iw-validation-count" aria-live="polite" aria-atomic="true">{errors.length} errors · {warnings.length} warnings</span>
        </div>
        <IssueList title="Resolve before review" issues={errors} tone="error" />
        <IssueList title="Check against the original" issues={warnings} tone="warning" />
        <IssueList title="Additional notes" issues={infos} tone="info" />
        {!issues.length && <p className="iw-checks-clear"><Check aria-hidden="true" size={18} /> No validation issues. Still compare all fields with the original.</p>}
        {(!record.fields.subtotal || !record.fields.tax) && <p className="iw-arithmetic-note"><Info aria-hidden="true" size={16} /> Arithmetic not checked: both subtotal and tax are needed. Blank amounts are not inferred.</p>}
      </section>

      <div className={`iw-acknowledgement ${record.reviewed ? "iw-acknowledgement-reviewed" : ""}`}>
        {record.reviewed ? (
          <p className="iw-reviewed-message" role="status"><BadgeCheck aria-hidden="true" size={21} /> Reviewed against this exact field and warning snapshot.{!record.included ? " This invoice remains excluded from export." : ""}</p>
        ) : (
          <>
            {changedSinceAcknowledgement && <p className="iw-review-changed" role="status">Fields, extraction settings or duplicate checks changed. Check this invoice again before acknowledging.</p>}
            <label className="iw-check-label iw-ack-label">
              <input type="checkbox" checked={acknowledged} disabled={disabled || !reviewAllowed}
                onChange={event => { setAckKey(event.target.checked ? key : null); setAckRevision(reviewRevision); }} />
              <span>I checked the extracted fields against the original and reviewed the warnings</span>
            </label>
            {!reviewAllowed && <p className="iw-note">Resolve the errors above to enable acknowledgement and review.</p>}
          </>
        )}
        <div className="iw-button-row">
          <button type="button" className="iw-button iw-button-primary" disabled={disabled || record.reviewed || !reviewAllowed || !acknowledged}
            onClick={() => { if (acknowledged && reviewAllowed && !disabled) onMarkReviewed(record.id, key, reviewRevision); }}>
            <BadgeCheck aria-hidden="true" size={17} /> {record.reviewed ? "Reviewed" : "Mark reviewed"}
          </button>
          <button type="button" className="iw-button" disabled={!hasNext || disabled} onClick={onNext}>
            Next invoice to review <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
        <p className="iw-note">Edits, inclusion changes and changed duplicate checks invalidate a review. Nothing is marked reviewed automatically.</p>
      </div>
      </div>
      </div>
    </section>
  );
}