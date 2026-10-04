import { FIELD_LABELS, INVOICE_FIELDS } from "./types";
import type { InvoiceField, InvoiceIssue, InvoiceRecord } from "./types";

/** Supported ISO 4217 codes, not a guess based on the user's locale. */
export const CURRENCIES: readonly string[] = Object.freeze([
  "USD", "EUR", "GBP", "PKR", "INR", "AED", "SAR", "CAD", "AUD", "CHF",
  "NZD", "SGD", "JPY", "CNY", "HKD", "KWD", "BHD", "OMR", "QAR", "JOD",
  "TND", "BDT", "LKR", "NPR", "MYR", "IDR", "THB", "PHP", "KRW", "VND",
  "TWD", "ZAR", "SEK", "NOK", "DKK", "ISK", "PLN", "CZK", "HUF", "RON",
  "TRY", "ILS", "BRL", "MXN", "CLP", "COP", "ARS", "EGP", "NGN", "KES",
]);

const REQUIRED: readonly InvoiceField[] = ["vendor", "invoiceNumber", "invoiceDate", "currency", "total"];
const MONEY: readonly InvoiceField[] = ["subtotal", "tax", "discount", "shipping", "total"];
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK"]);
const THREE_DECIMAL = new Set(["KWD", "BHD", "OMR", "JOD", "TND"]);
const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/;
// Canonical money has no grouping, plus sign, leading zeros, or fractional trailing zeros.
const CANONICAL_MONEY = /^-?(?:0|[1-9]\d{0,11})(?:\.\d{0,2}[1-9])?$/;
const SCALE = BigInt(1000);
const ZERO = BigInt(0);

function precision(currency: string): number {
  return ZERO_DECIMAL.has(currency) ? 0 : THREE_DECIMAL.has(currency) ? 3 : 2;
}

function units(value: string): bigint {
  const negative = value.startsWith("-");
  const [integer, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const result = BigInt(integer) * SCALE + BigInt(fraction.padEnd(3, "0"));
  return negative ? -result : result;
}

function formatUnits(value: bigint, decimals: number): string {
  const absolute = value < ZERO ? -value : value;
  const fraction = (absolute % SCALE).toString().padStart(3, "0").slice(0, decimals);
  return `${value < ZERO ? "-" : ""}${absolute / SCALE}${decimals ? `.${fraction}` : ""}`;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function folded(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

function identity(record: InvoiceRecord): string | null {
  const parts = [record.fields.vendor, record.fields.invoiceNumber, record.fields.currency];
  return parts.every(part => typeof part === "string" && part.trim())
    ? JSON.stringify(parts.map(folded))
    : null;
}

function hasDuplicate(record: InvoiceRecord, records: readonly InvoiceRecord[]): boolean {
  if (!record.included || record.status !== "ready") return false;
  const key = identity(record);
  const hash = typeof record.fileHash === "string" ? record.fileHash.trim().toLowerCase() : "";
  return records.some(other => {
    if (other === record || other.id === record.id || !other.included || other.status !== "ready") return false;
    const otherHash = typeof other.fileHash === "string" ? other.fileHash.trim().toLowerCase() : "";
    return Boolean((hash && hash === otherHash) || (key && key === identity(other)));
  });
}

/** Keep document safety flags, not stale missing/ambiguous-field errors after a manual correction. */
function relevantExtractionIssue(issue: InvoiceIssue, record: InvoiceRecord): boolean {
  if (issue.code === "multiple_invoices" || issue.code === "credit_note") return true;
  if (!issue.field) return true;
  const current = record.fields[issue.field];
  if (!current) return true;
  if (issue.code === "supplier_suggested" || issue.code === "supplier_wrapped") {
    const evidence = record.evidence[issue.field];
    return Boolean(evidence && folded(evidence.text).includes(folded(current)));
  }
  // Parser field warnings describe values deliberately left blank. A filled value is
  // revalidated below; review-state invalidation on edits belongs to the UI.
  return false;
}

/** Recompute validity from current fields; neither reviewed nor prior validation is trusted. */
export function validateInvoice(record: InvoiceRecord, allRecords: readonly InvoiceRecord[]): InvoiceIssue[] {
  const issues: InvoiceIssue[] = [];
  const add = (code: string, severity: InvoiceIssue["severity"], message: string, field?: InvoiceField) => {
    issues.push({ code, severity, message, ...(field ? { field } : {}) });
  };

  if (record.status !== "ready") add("not_ready", "error", "Only ready invoices can be reviewed or exported.");
  if (record.kind === "multiple") add("multiple_invoices", "error", "This file contains different invoice numbers. Split it into individual invoices.");
  if (record.kind === "credit-note") add("credit_note", "error", "Credit notes and refunds are not supported by this version.");

  const validMoney = new Map<InvoiceField, bigint>();
  const currencyValid = typeof record.fields.currency === "string" && CURRENCIES.includes(record.fields.currency);

  for (const field of INVOICE_FIELDS) {
    const value = record.fields[field];
    if (typeof value !== "string") {
      add("invalid_field", "error", `${FIELD_LABELS[field]} must be a normalized string.`, field);
      continue;
    }
    if (!value.trim()) {
      if (REQUIRED.includes(field)) add("required_field", "error", `${FIELD_LABELS[field]} is required.`, field);
      else if (value !== "") add("noncanonical_field", "error", `${FIELD_LABELS[field]} must be empty or normalized.`, field);
      continue;
    }
    const limit = field === "vendor" ? 160 : field === "invoiceNumber" ? 96 : field === "currency" ? 3 : field === "invoiceDate" ? 10 : 17;
    if (value.length > limit) {
      add("field_length", "error", `${FIELD_LABELS[field]} exceeds its supported length.`, field);
      continue;
    }
    if (UNSAFE_TEXT.test(value) || value !== value.trim().replace(/\s+/g, " ")) {
      add("noncanonical_field", "error", `${FIELD_LABELS[field]} contains controls or unnormalized whitespace.`, field);
      continue;
    }
    if (field === "currency" && !currencyValid) {
      add("invalid_currency", "error", "Select a supported uppercase ISO currency code; ambiguous symbols are not a currency.", field);
    } else if (field === "invoiceDate" && !validDate(value)) {
      add("invalid_date", "error", "Invoice date must be a real calendar date in YYYY-MM-DD format.", field);
    } else if (MONEY.includes(field)) {
      if (!CANONICAL_MONEY.test(value) || value === "-0") {
        add("invalid_amount", "error", `${FIELD_LABELS[field]} must be a canonical decimal with at most 12 integer and 3 fractional digits.`, field);
        continue;
      }
      const amount = units(value);
      if (amount < ZERO) {
        add(field === "total" ? "negative_total" : "negative_adjustment", "error",
          field === "total" ? "A negative total is a credit/refund and cannot be exported." : `${FIELD_LABELS[field]} must not be negative.`, field);
        continue;
      }
      const decimals = value.split(".")[1]?.length ?? 0;
      if (currencyValid && decimals > precision(record.fields.currency)) {
        add("currency_precision", "error", `${record.fields.currency} supports ${precision(record.fields.currency)} decimal places; no rounding is performed.`, field);
        continue;
      }
      validMoney.set(field, amount);
    }
  }

  // Missing subtotal OR tax means arithmetic is unknown, not "reconciled".
  if (currencyValid && ["subtotal", "tax", "total"].every(field => validMoney.has(field as InvoiceField)) &&
      ["shipping", "discount"].every(field => record.fields[field as InvoiceField] === "" || validMoney.has(field as InvoiceField))) {
    const expected = validMoney.get("subtotal")! + validMoney.get("tax")! +
      (validMoney.get("shipping") ?? ZERO) - (validMoney.get("discount") ?? ZERO);
    const difference = expected - validMoney.get("total")!;
    const absoluteDifference = difference < ZERO ? -difference : difference;
    const minorUnit = BigInt(10) ** BigInt(3 - precision(record.fields.currency));
    if (absoluteDifference > minorUnit) {
      add("arithmetic_mismatch", "warning",
        `Subtotal + tax + shipping - discount is ${formatUnits(expected, precision(record.fields.currency))} ${record.fields.currency}, which differs from the total by more than one minor unit.`, "total");
    }
  }

  if (hasDuplicate(record, allRecords)) {
    add("duplicate_invoice", "warning", "Another included, ready record has the same file content or supplier, invoice number and currency. Check both records; neither is automatically removed.");
  }
  for (const issue of record.extractionIssues) {
    if (relevantExtractionIssue(issue, record)) {
      // Safety flags remain blocking even if an imported issue was incorrectly marked a warning.
      issues.push(issue.code === "multiple_invoices" || issue.code === "credit_note" ? { ...issue, severity: "error" } : { ...issue });
    }
  }
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.code}:${issue.field ?? ""}:${issue.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Warnings require the UI's acknowledgement; this gate only rejects validation errors. */
export function canReview(record: InvoiceRecord, records: readonly InvoiceRecord[]): boolean {
  return record.status === "ready" && record.kind !== "multiple" && record.kind !== "credit-note" &&
    !validateInvoice(record, records).some(issue => issue.severity === "error");
}

/** Exact, separate currency totals, padded to the currency's 0/2/3 decimal display scale. */
export function getCurrencyTotals(records: readonly InvoiceRecord[]): { currency: string; total: string; count: number }[] {
  const totals = new Map<string, { amount: bigint; count: number }>();
  for (const record of records) {
    if (!record.included || !record.reviewed || !canReview(record, records)) continue;
    const currency = record.fields.currency;
    const current = totals.get(currency) ?? { amount: ZERO, count: 0 };
    totals.set(currency, { amount: current.amount + units(record.fields.total), count: current.count + 1 });
  }
  return [...totals.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([currency, value]) => ({ currency, total: formatUnits(value.amount, precision(currency)), count: value.count }));
}