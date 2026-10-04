export const INVOICE_FIELDS = ["vendor", "invoiceNumber", "invoiceDate", "currency", "subtotal", "tax", "discount", "shipping", "total"] as const;
export type InvoiceField = (typeof INVOICE_FIELDS)[number];
export type InvoiceFields = Record<InvoiceField, string>;
export type NumberFormat = "auto" | "dot" | "comma";
export type DateOrder = "auto" | "dmy" | "mdy";

export interface ExtractionOptions {
  numberFormat: NumberFormat;
  dateOrder: DateOrder;
  profile?: MappingProfile;
}

export interface TextToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface SourceLine {
  id: string;
  text: string;
  page: number;
  x: number;
  y: number;
  height: number;
}

export interface Evidence {
  lineId: string;
  page: number;
  text: string;
  method: "label" | "header" | "manual";
}

export interface InvoiceIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  field?: InvoiceField;
}

export interface ExtractionResult {
  fields: InvoiceFields;
  evidence: Partial<Record<InvoiceField, Evidence>>;
  issues: InvoiceIssue[];
  kind: "invoice" | "credit-note" | "multiple" | "unknown";
}

export interface MappingProfile {
  version: 1;
  name: string;
  labels: Partial<Record<InvoiceField, string>>;
}

export interface InvoiceRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  pageCount: number;
  lines: SourceLine[];
  fields: InvoiceFields;
  evidence: Partial<Record<InvoiceField, Evidence>>;
  extractionIssues: InvoiceIssue[];
  kind: ExtractionResult["kind"];
  status: "queued" | "processing" | "ready" | "failed" | "cancelled";
  error?: string;
  reviewed: boolean;
  included: boolean;
  sample?: boolean;
}

export const INVOICE_LIMITS = {
  files: 20,
  fileBytes: 10 * 1024 * 1024,
  batchBytes: 50 * 1024 * 1024,
  pages: 15,
  pageItems: 12000,
  characters: 120000,
  processMs: 30000,
  profileBytes: 16000,
} as const;

export const FIELD_LABELS: Record<InvoiceField, string> = {
  vendor: "Supplier",
  invoiceNumber: "Invoice number",
  invoiceDate: "Invoice date",
  currency: "Currency",
  subtotal: "Subtotal",
  tax: "Tax",
  discount: "Discount",
  shipping: "Shipping",
  total: "Invoice total",
};

export function emptyFields(): InvoiceFields {
  return { vendor: "", invoiceNumber: "", invoiceDate: "", currency: "", subtotal: "", tax: "", discount: "", shipping: "", total: "" };
}