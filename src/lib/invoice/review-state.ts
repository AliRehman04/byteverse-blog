import { INVOICE_FIELDS } from "./types";
import type { InvoiceRecord } from "./types";
import { canReview, validateInvoice } from "./validation";

// Deliberately excludes reviewed: acknowledging this exact snapshot must not change its key.
export function reviewKey(record: InvoiceRecord, records: readonly InvoiceRecord[]): string {
  const issues = [...new Set(validateInvoice(record, records).map(issue =>
    JSON.stringify([issue.code, issue.field ?? null, issue.severity, issue.message])))].sort();
  return JSON.stringify({
    id: record.id,
    fields: INVOICE_FIELDS.map(field => [field, record.fields[field]]),
    evidence: INVOICE_FIELDS.map(field => {
      const evidence = record.evidence[field];
      return [field, evidence ? [evidence.lineId, evidence.page, evidence.text, evidence.method] : null];
    }),
    fileName: record.fileName,
    fileSize: record.fileSize,
    fileHash: record.fileHash,
    pageCount: record.pageCount,
    sample: record.sample ?? false,
    status: record.status,
    kind: record.kind,
    included: record.included,
    issues,
  });
}

function uniqueRecords(records: readonly InvoiceRecord[]): Map<string, InvoiceRecord | null> {
  const byId = new Map<string, InvoiceRecord | null>();
  for (const record of records) byId.set(record.id, byId.has(record.id) ? null : record);
  return byId;
}

// Use immutable before/after snapshots on every mutation except the explicit, checked review action.
export function reconcileReviews(previous: readonly InvoiceRecord[], next: InvoiceRecord[]): InvoiceRecord[] {
  const beforeById = uniqueRecords(previous);
  const nextById = uniqueRecords(next);
  return next.map(record => {
    const before = beforeById.get(record.id);
    const reviewed = Boolean(before && record.id && nextById.get(record.id) === record &&
      before.reviewed === true && record.reviewed === true && before.status === "ready" &&
      canReview(record, next) && reviewKey(before, previous) === reviewKey(record, next));
    return { ...record, reviewed };
  });
}