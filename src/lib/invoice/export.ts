import type { CellObject, Sheet } from "write-excel-file/universal";
import { FIELD_LABELS, INVOICE_FIELDS } from "./types";
import type { Evidence, InvoiceField, InvoiceIssue, InvoiceRecord } from "./types";
import { canReview, getCurrencyTotals, validateInvoice } from "./validation";

type ExportCell = CellObject & (
  { type: StringConstructor; value: string } | { type: NumberConstructor; value: number }
);
type ExportRow = (ExportCell | null)[];
interface ExportEntry { record: InvoiceRecord; issues: InvoiceIssue[] }

const INVOICE_HEADERS = [
  "Supplier", "Invoice number", "Invoice date", "Currency", "Subtotal", "Tax", "Discount",
  "Shipping", "Invoice total", "Source file", "Source page(s)", "Review notes",
];
const MONEY_FIELDS: readonly InvoiceField[] = ["subtotal", "tax", "discount", "shipping", "total"];
const SYNTHETIC_NOTE = "Synthetic sample invoice; not a real transaction.";
const PRECISION_NOTE = "Exact total stored as text to avoid Excel's 15-significant-digit numeric limit; no rounding was performed.";

// Display these separately in the caller's UI, never as extra CSV rows or a sep= directive.
export const INVOICE_CSV_NOTES = Object.freeze({
  scope: "CSV contains only Invoices; currency totals and the separate Review notes sheet require XLSX.",
  identifiers: "CSV readers may coerce IDs and dates. Choose XLSX to preserve leading zeros and explicit text types.",
  formulaDefense: "Potentially formula-like CSV text is prefixed with a tab. Importers may display or strip it; do not rely on it after re-saving. Original records are unchanged. XLSX uses explicit text cells.",
});

export function exportableInvoices(records: readonly InvoiceRecord[]): InvoiceRecord[] {
  return records.filter(record => record.included === true && record.reviewed === true &&
    record.status === "ready" && canReview(record, records));
}

function exportEntries(records: readonly InvoiceRecord[]): ExportEntry[] {
  const invoices = exportableInvoices(records);
  if (!invoices.length) throw new Error("No exportable invoices. Include and explicitly review at least one valid, ready invoice.");
  return invoices.map(record => ({ record, issues: validateInvoice(record, records) }));
}

function textCell(value: string): ExportCell {
  return { type: String, value, format: "@", wrap: true, alignVertical: "top" };
}

function amountCell(value: string): ExportCell | null {
  if (value === "") return null;
  const scale = value.split(".")[1]?.length ?? 0;
  const digits = value.replace(/^-/, "").replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
  const number = Number(value);
  // Check Excel's decimal limit AND the JS conversion before using a numeric cell.
  if (digits.length > 15 || !Number.isFinite(number) || number.toFixed(scale) !== value) return textCell(value);
  return { type: Number, value: number, format: `0${scale ? `.${"0".repeat(scale)}` : ""}`, alignVertical: "top" };
}

function sourceEvidence(record: InvoiceRecord, field?: InvoiceField): Evidence[] {
  return (field ? [field] : INVOICE_FIELDS).flatMap(key => record.evidence[key] ? [record.evidence[key]!] : []);
}

function sourcePages(evidence: readonly Evidence[]): string {
  return [...new Set(evidence.map(item => item.page).filter(page => Number.isInteger(page) && page > 0))]
    .sort((a, b) => a - b).join(", ");
}

function notesFor({ record, issues }: ExportEntry): InvoiceIssue[] {
  return record.sample ? [...issues, { code: "synthetic_sample", severity: "info", message: SYNTHETIC_NOTE }] : issues;
}

function invoiceRows(entries: readonly ExportEntry[]): ExportRow[] {
  return entries.map(entry => {
    const { record } = entry;
    const fields = record.fields;
    const notes = notesFor(entry).map(issue =>
      `${issue.severity.toUpperCase()} [${issue.code}]${issue.field ? ` ${FIELD_LABELS[issue.field]}` : ""}: ${issue.message}`);
    return [
      ...[fields.vendor, fields.invoiceNumber, fields.invoiceDate, fields.currency].map(textCell),
      ...MONEY_FIELDS.map(field => amountCell(fields[field])),
      textCell(record.fileName), textCell(sourcePages(sourceEvidence(record))), textCell(notes.join("\n")),
    ];
  });
}

function reviewRows(entries: readonly ExportEntry[]): ExportRow[] {
  return entries.flatMap(entry => notesFor(entry).map(issue => {
    const { record } = entry;
    const evidence = sourceEvidence(record, issue.field);
    const references = [...new Set(evidence.map(item => {
      const page = Number.isInteger(item.page) && item.page > 0 ? `p${item.page}` : "page unknown";
      return `${page} / ${item.lineId} (${item.method})`;
    }))].join("\n");
    return [
      record.id, record.fields.vendor, record.fields.invoiceNumber, record.fileName, sourcePages(evidence),
      issue.severity, issue.code, issue.field ? FIELD_LABELS[issue.field] : "", issue.message,
      references, [...new Set(evidence.map(item => item.text))].join("\n"),
    ].map(textCell);
  }));
}

function sheet(name: string, headers: readonly string[], widths: readonly number[], rows: ExportRow[], color: string): Sheet<Blob> {
  return {
    sheet: name,
    data: [headers.map(value => ({ ...textCell(value), fontWeight: "bold", textColor: "#FFFFFF", backgroundColor: color, height: 30 })), ...rows],
    columns: widths.map(width => ({ width })),
    stickyRowsCount: 1,
  };
}

export function buildInvoiceWorkbook(records: readonly InvoiceRecord[]): Sheet<Blob>[] {
  const entries = exportEntries(records);
  const totals = getCurrencyTotals(entries.map(entry => entry.record));
  const summary = totals.map(({ currency, count, total }): ExportRow => {
    const amount = amountCell(total);
    return [textCell(currency), { type: Number, value: count, format: "0" }, amount,
      textCell(amount?.type === String ? PRECISION_NOTE : "")];
  });
  return [
    sheet("Invoices", INVOICE_HEADERS, [30, 24, 16, 12, 18, 18, 18, 18, 20, 36, 18, 72], invoiceRows(entries), "#0F172A"),
    sheet("Currency totals", ["Currency", "Invoice count", "Invoice total", "Review notes"], [14, 18, 26, 88], summary, "#0F766E"),
    sheet("Review notes", ["Record ID", "Supplier", "Invoice number", "Source file", "Source page(s)", "Severity", "Code", "Field", "Message", "Source reference", "Evidence"],
      [24, 30, 24, 36, 18, 12, 28, 18, 82, 42, 80], reviewRows(entries), "#0F172A"),
  ];
}

export async function createInvoiceWorkbook(records: readonly InvoiceRecord[]): Promise<Blob> {
  const sheets = buildInvoiceWorkbook(records);
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  return writeExcelFile(sheets, { fontFamily: "Calibri", fontSize: 11 }).toBlob();
}

function csvText(value: string): string {
  // Normalize only the inspection copy; keep the original Unicode/whitespace in the export.
  const probe = value.normalize("NFKC").replace(/^[\s\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]+/u, "");
  return /^[=+\-@\u2212]/.test(probe) ? `\t${value}` : value;
}

export function buildInvoiceCsv(records: readonly InvoiceRecord[], delimiter: "," | ";" = ","): string {
  if (delimiter !== "," && delimiter !== ";") throw new Error("CSV delimiter must be a comma or semicolon.");
  const rows: ExportRow[] = [INVOICE_HEADERS.map(textCell), ...invoiceRows(exportEntries(records))];
  return "\uFEFF" + rows.map(row => row.map(cell => {
    // Only validated money cells are numeric; numeric-looking IDs/vendors are untrusted text.
    const value = cell === null ? "" : typeof cell.value === "number" ? String(cell.value) : csvText(cell.value);
    return `"${value.replace(/"/g, '""')}"`;
  }).join(delimiter)).join("\r\n") + "\r\n";
}