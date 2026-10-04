import { emptyFields, FIELD_LABELS, INVOICE_FIELDS, INVOICE_LIMITS } from "./types";
import type {
  DateOrder, Evidence, ExtractionOptions, ExtractionResult, InvoiceField,
  InvoiceIssue, MappingProfile, NumberFormat, SourceLine, TextToken,
} from "./types";
import { CURRENCIES } from "./validation";

const REQUIRED: readonly InvoiceField[] = ["vendor", "invoiceNumber", "invoiceDate", "currency", "total"];
const MONEY: readonly InvoiceField[] = ["subtotal", "tax", "discount", "shipping", "total"];
const MAX_LINE = 4096;
const BAD_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/;
const PROFILE_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/;
const whitespace = (value: string) => value.replace(/\s+/g, " ").trim();
const fold = (value: string) => whitespace(value).normalize("NFKC").toUpperCase();

interface CurrencyMark { text: string; codes: readonly string[] }
const CURRENCY_MARKS: readonly CurrencyMark[] = [
  ...CURRENCIES.map(code => ({ text: code, codes: [code] })),
  { text: "US$", codes: ["USD"] }, { text: "CA$", codes: ["CAD"] },
  { text: "C$", codes: ["CAD"] }, { text: "AU$", codes: ["AUD"] },
  { text: "A$", codes: ["AUD"] }, { text: "NZ$", codes: ["NZD"] },
  { text: "HK$", codes: ["HKD"] }, { text: "SG$", codes: ["SGD"] },
  { text: "S$", codes: ["SGD"] }, { text: "R$", codes: ["BRL"] },
  { text: "£", codes: ["GBP"] }, { text: "€", codes: ["EUR"] },
  { text: "₹", codes: ["INR"] },
  { text: "Rs.", codes: ["PKR", "INR", "LKR", "NPR"] },
  { text: "Rs", codes: ["PKR", "INR", "LKR", "NPR"] },
  { text: "₨", codes: ["PKR", "INR", "LKR", "NPR"] },
  { text: "¥", codes: ["JPY", "CNY"] }, { text: "￥", codes: ["JPY", "CNY"] },
  { text: "$", codes: ["USD", "CAD", "AUD", "NZD", "HKD", "SGD", "MXN", "CLP", "COP", "ARS", "TWD"] },
].sort((a, b) => b.text.length - a.text.length);

function compatibleMarks(marks: readonly CurrencyMark[]): boolean {
  return marks.length < 2 || marks[0].codes.some(code => marks.every(mark => mark.codes.includes(code)));
}

function currencyAtEdge(value: string, end: boolean): CurrencyMark | undefined {
  const upper = value.toUpperCase();
  return CURRENCY_MARKS.find(mark => {
    const label = mark.text.toUpperCase();
    if (!(end ? upper.endsWith(label) : upper.startsWith(label))) return false;
    const adjacent = end ? value[value.length - label.length - 1] : value[label.length];
    return !adjacent || /[\s\d(+\-)]/.test(adjacent) || /[$£€¥₹₨￥]/.test(adjacent);
  });
}

/** Read only money affixes, never delete arbitrary letters from inside a value. */
function moneyBody(input: string): { body: string; negative: boolean } | null {
  if (typeof input !== "string" || input.length > 256 || BAD_TEXT.test(input) || input.includes("%") ||
      /[\t\r\n\u2028\u2029]/.test(input.trim())) return null;
  let body = whitespace(input);
  let negative = false;
  let signed = false;
  const marks: CurrencyMark[] = [];
  for (let step = 0; step < 6; step++) {
    if (body.startsWith("(") && body.endsWith(")")) {
      if (signed) return null;
      signed = true;
      negative = true;
      body = body.slice(1, -1).trim();
    } else if (/^[+-]/.test(body)) {
      if (signed) return null;
      signed = true;
      negative = body[0] === "-";
      body = body.slice(1).trim();
    } else {
      const prefix = currencyAtEdge(body, false);
      const suffix = prefix ? undefined : currencyAtEdge(body, true);
      const mark = prefix ?? suffix;
      if (!mark) break;
      if (marks.length === 2 || marks.some(existing => existing.text === mark.text)) return null;
      marks.push(mark);
      body = (prefix ? body.slice(mark.text.length) : body.slice(0, -mark.text.length)).trim();
    }
  }
  return body && /^[\d., ]+$/.test(body) && compatibleMarks(marks) ? { body, negative } : null;
}

/** Exact minimal decimal string: leading/trailing zeros and negative zero are normalized, never rounded. */
export function parseAmount(input: string, format: NumberFormat = "auto"): string | null {
  if (!["auto", "dot", "comma"].includes(format)) return null;
  const parsed = moneyBody(input);
  if (!parsed) return null;
  const { body } = parsed;
  let decimal: "." | "," | null = format === "dot" ? "." : format === "comma" ? "," : null;
  if (format === "auto") {
    const dots = body.split(".").length - 1;
    const commas = body.split(",").length - 1;
    if (dots && commas) decimal = body.lastIndexOf(".") > body.lastIndexOf(",") ? "." : ",";
    else if (dots + commas === 1) {
      const separator = dots ? "." : ",";
      const fraction = body.slice(body.indexOf(separator) + 1);
      // 1,234 and 1.234 are ambiguous even if one interpretation looks more likely.
      if (fraction.length === 3) return null;
      decimal = separator;
    }
  }
  const parts = decimal ? body.split(decimal) : [body];
  if (parts.length > 2 || (parts.length === 2 && !/^\d{1,3}$/.test(parts[1]))) return null;
  let integer = parts[0];
  let fraction = parts[1] ?? "";
  const grouping = decimal === "." ? "," : decimal === "," ? "." : body.includes(",") ? "," : ".";
  if (integer.includes(" ")) {
    if (!/^\d{1,3}(?: \d{3})+$/.test(integer)) return null;
    integer = integer.replace(/ /g, "");
  } else if (integer.includes(grouping)) {
    const groups = integer.split(grouping);
    if (!/^\d{1,3}$/.test(groups[0]) || !groups.slice(1).every(group => /^\d{3}$/.test(group))) return null;
    integer = groups.join("");
  }
  if (!/^\d+$/.test(integer)) return null;
  integer = integer.replace(/^0+(?=\d)/, "");
  if (integer.length > 12) return null;
  fraction = fraction.replace(/0+$/, "");
  const value = integer + (fraction ? `.${fraction}` : "");
  return parsed.negative && value !== "0" ? `-${value}` : value;
}

function calendarDate(year: number, month: number, day: number): string | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (day > [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function monthNumber(value: string): number {
  const lower = value.toLowerCase().replace(/\.$/, "");
  return MONTHS.findIndex(month => lower === month || lower === month.slice(0, 3) || (month === "september" && lower === "sept")) + 1;
}

/** Four-digit years only; ambiguous day/month order is not inferred from locale or other dates. */
export function parseInvoiceDate(input: string, order: DateOrder = "auto"): string | null {
  if (typeof input !== "string" || input.length > 64 || BAD_TEXT.test(input) || !["auto", "dmy", "mdy"].includes(order)) return null;
  const value = whitespace(input);
  const yearFirst = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/.exec(value);
  if (yearFirst) return calendarDate(Number(yearFirst[1]), Number(yearFirst[3]), Number(yearFirst[4]));
  const numeric = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/.exec(value);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[3]);
    const year = Number(numeric[4]);
    if (order === "dmy") return calendarDate(year, second, first);
    if (order === "mdy") return calendarDate(year, first, second);
    if (first <= 12 && second <= 12 && first !== second) return null;
    return first > 12 || first === second ? calendarDate(year, second, first) : calendarDate(year, first, second);
  }
  const dayFirst = /^(\d{1,2})[ -]([a-z]+\.?)[ ,\-]+(\d{4})$/i.exec(value);
  if (dayFirst) return calendarDate(Number(dayFirst[3]), monthNumber(dayFirst[2]), Number(dayFirst[1]));
  const monthFirst = /^([a-z]+\.?) (\d{1,2})(?:,\s*|\s+)(\d{4})$/i.exec(value);
  return monthFirst ? calendarDate(Number(monthFirst[3]), monthNumber(monthFirst[1]), Number(monthFirst[2])) : null;
}

export function normalizeField(field: InvoiceField, input: string, options: ExtractionOptions): string | null {
  if (!INVOICE_FIELDS.includes(field) || typeof input !== "string" || input.length > MAX_LINE || BAD_TEXT.test(input)) return null;
  const value = whitespace(input);
  if (!value) return REQUIRED.includes(field) ? null : "";
  if (field === "vendor" || field === "invoiceNumber") return value.length <= (field === "vendor" ? 160 : 96) ? value : null;
  if (field === "invoiceDate") return parseInvoiceDate(value, options.dateOrder);
  if (field === "currency") {
    const mark = CURRENCY_MARKS.find(item => item.text.toUpperCase() === value.toUpperCase());
    return mark?.codes.length === 1 ? mark.codes[0] : null;
  }
  // Preserve row breaks so two pasted amounts cannot become a plausible thousands group.
  return parseAmount(input, options.numberFormat);
}

function plainData(value: unknown): Record<string, PropertyDescriptor> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (Object.getOwnPropertySymbols(value).length) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (["__proto__", "prototype", "constructor"].includes(key) || !descriptor.enumerable || !("value" in descriptor)) return null;
  }
  return descriptors;
}

/** JSON-data-only literal labels. Accessors, unknown keys and prototype-bearing payloads are rejected. */
export function parseMappingProfile(input: unknown): MappingProfile | null {
  try {
    const root = plainData(input);
    if (!root || Object.keys(root).length !== 3 || !["version", "name", "labels"].every(key => Object.hasOwn(root, key))) return null;
    if (root.version.value !== 1 || typeof root.name.value !== "string") return null;
    const name = root.name.value as string;
    if (!name.trim() || name.length > 60 || PROFILE_CONTROLS.test(name)) return null;
    const entries = plainData(root.labels.value);
    if (!entries) return null;
    const labels: MappingProfile["labels"] = {};
    for (const [key, descriptor] of Object.entries(entries)) {
      if (!INVOICE_FIELDS.includes(key as InvoiceField) || typeof descriptor.value !== "string") return null;
      const label = descriptor.value as string;
      if (!label.trim() || label.length > 60 || PROFILE_CONTROLS.test(label)) return null;
      labels[key as InvoiceField] = whitespace(label);
    }
    return { version: 1, name: whitespace(name), labels };
  } catch {
    return null;
  }
}

function baselineTolerance(a: number, b: number): number {
  return Math.max(1, Math.min(3, Math.min(a, b) * 0.25));
}

// Viewport coordinates are top-down; invalid geometry rejects the entire invoice, never a partial result.
export function groupTextTokens(tokens: TextToken[]): SourceLine[] {
  if (!Array.isArray(tokens) || tokens.length > INVOICE_LIMITS.pages * INVOICE_LIMITS.pageItems) return [];
  const pageCounts = new Map<number, number>();
  let characters = 0;
  const ordered: (TextToken & { position: number })[] = [];
  const seen = new Set<string>();
  for (const [position, token] of tokens.entries()) {
    if (!token || typeof token.text !== "string") return [];
    characters += token.text.length;
    const count = (pageCounts.get(token.page) ?? 0) + 1;
    pageCounts.set(token.page, count);
    if (characters > INVOICE_LIMITS.characters || count > INVOICE_LIMITS.pageItems || BAD_TEXT.test(token.text) ||
        !Number.isInteger(token.page) || token.page < 1 || token.page > INVOICE_LIMITS.pages ||
        ![token.x, token.y, token.width, token.height].every(Number.isFinite) || token.width < 0 || token.height <= 0) return [];
    if (!token.text) continue;
    const text = token.text.replace(/\s+/g, " ");
    const key = JSON.stringify([token.page, token.x, token.y, token.width, token.height, text]);
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push({ ...token, text, position });
  }
  ordered.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x || a.position - b.position);
  const rows: { page: number; y: number; height: number; tokens: typeof ordered }[] = [];
  for (const token of ordered) {
    const row = rows[rows.length - 1];
    if (row && row.page === token.page && token.y - row.y <= baselineTolerance(row.height, token.height)) row.tokens.push(token);
    else rows.push({ page: token.page, y: token.y, height: token.height, tokens: [token] });
  }
  const result: SourceLine[] = [];
  const indexes = new Map<number, number>();
  for (const row of rows) {
    row.tokens.sort((a, b) => a.x - b.x || a.position - b.position);
    let text = "";
    let x = 0;
    let height = row.height;
    let previous: (typeof ordered)[number] | undefined;
    const flush = () => {
      const value = whitespace(text);
      if (value) {
        const index = (indexes.get(row.page) ?? 0) + 1;
        indexes.set(row.page, index);
        result.push({ id: `p${row.page}-l${index}`, text: value, page: row.page, x, y: row.y, height });
      }
      text = "";
      previous = undefined;
    };
    for (const token of row.tokens) {
      const gap = previous ? token.x - (previous.x + previous.width) : 0;
      if (previous && gap > Math.max(24, Math.max(previous.height, token.height) * 2.5)) flush();
      if (!previous) { x = token.x; height = token.height; }
      else {
        const characterWidth = Math.min(previous.width / Math.max(1, previous.text.length), token.width / Math.max(1, token.text.length));
        if (gap > Math.max(0.75, characterWidth * 0.22) && !/\s$/.test(text) && !/^\s/.test(token.text)) text += " ";
        height = Math.max(height, token.height);
      }
      text += token.text;
      if (text.length > MAX_LINE) return [];
      previous = token;
    }
    flush();
  }
  return result;
}

interface Label { field: InvoiceField; text: string; rank: number }
const ALIASES: Record<InvoiceField, readonly string[]> = {
  vendor: ["supplier name", "vendor name", "seller name", "issued by", "supplier", "vendor", "seller", "from"],
  invoiceNumber: ["invoice number", "invoice no.", "invoice no", "invoice #", "invoice id", "inv. no.", "inv no.", "inv no", "inv #"],
  invoiceDate: ["invoice date", "date of invoice", "date issued", "issue date", "issued on", "date"],
  currency: ["invoice currency", "currency code", "currency"],
  subtotal: ["subtotal", "sub total", "sub-total", "net subtotal", "total before tax", "total excluding tax", "total excl. tax", "total excl tax", "net amount"],
  tax: ["total tax", "tax total", "tax amount", "sales tax amount", "vat amount", "gst amount", "hst amount", "sales tax", "vat total", "gst total", "cgst", "sgst", "igst", "pst", "hst", "vat", "gst", "tax"],
  discount: ["total discount", "discount amount", "discount"],
  shipping: ["shipping and handling", "shipping & handling", "shipping charge", "delivery charge", "freight charge", "shipping", "freight"],
  total: ["invoice total", "grand total", "total including tax", "total inclusive of tax", "total incl. tax", "total incl tax", "total (incl. tax)", "total with tax", "total amount", "total"],
};

function labelsFor(profile?: MappingProfile): Label[] {
  return INVOICE_FIELDS.flatMap(field => (profile?.labels[field] !== undefined ? [profile.labels[field]!] : ALIASES[field])
    .map(text => ({ field, text: whitespace(text), rank: field === "total" && text.toLowerCase() !== "total" ? 2 : 1 })))
    .sort((a, b) => b.text.length - a.text.length);
}
const DEFAULT_LABELS = labelsFor();
const STOP_LABELS = [
  "payment due date", "due date", "from date", "to date", "service date", "delivery date", "shipping date", "payment date",
  "amount due", "balance due", "total due", "total amount due", "amount paid", "total paid", "total amount paid",
  "tax rate", "vat rate", "gst rate", "tax id", "vat id", "gst id", "tax number", "vat number",
  "bill to", "billed to", "ship to", "shipped to", "customer", "buyer", "client", "billing address", "shipping address",
];
const CUSTOMER = /^(?:bill(?:ed)?\s+to|ship(?:ped)?\s+to|shipping address|billing address|customer|buyer|client|sold to|deliver to|consignee|recipient|invoice to)\b/i;
const HEADING = /^(?:(?:tax|commercial|sales|pro[- ]?forma|digital|original|billing|copy of)\s+)*(?:invoice|receipt|quotation|estimate|statement)\b/i;
const CREDIT = /^(?:document\s+type\s*:\s*)?(?:(?:(?:tax|commercial|sales)\s+)?credit[ -]+(?:note|memo|invoice)\b|refund(?:\s+(?:invoice|receipt|note)\b|\s*$|\s*[:#]))/i;
const ADDRESS = /(?:\b(?:street|st|road|rd|avenue|ave|lane|suite|floor|postcode|postal|zip|address|tel|telephone|phone|fax|email|website)\b|\bp\.?\s*o\.?\s+box\b|^\d+\s|@|https?:|www\.)/i;
const LOCATION = /^(?:[\p{L} .'-]+,\s*[A-Z]{2,3}(?:\s+\d[\d -]*)?|[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2})$/u;
const COMPANY_END = /\b(?:ltd\.?|limited|llc|llp|inc\.?|incorporated|corp\.?|corporation|company|co\.?|gmbh|plc|pvt\.?|private|services|solutions|technologies|trading)$/i;

function excluded(field: InvoiceField, text: string): boolean {
  if (field === "vendor") return CUSTOMER.test(text) || /^from\s+date\b/i.test(text);
  if (field === "invoiceDate") return /\bdue\s+date\b|^(?:due|from|to|payment|delivery|shipping|service)\s+(?:date|due)\b/i.test(text);
  if (field === "total") return /^(?:(?:invoice\s+)?total\s+(?:(?:amount|balance)\s+)?(?:due|paid|outstanding|balance|tax|vat|gst|discount|savings|items|qty|quantity)|amount\s+(?:due|paid)|balance\b|sub[ -]?total\b|paid\b|payments?\b|deposit\b)/i.test(text);
  if (field === "tax") return HEADING.test(text) || /^(?:tax|vat|gst|hst)\s+(?:rate|id|no\.?|number|registration)\b/i.test(text);
  return field === "shipping" && /^shipping\s+address\b/i.test(text);
}

// ASCII case folding preserves string offsets; non-English template text stays literal.
function labelKey(text: string): string {
  return text.replace(/[A-Z]/g, character => character.toLowerCase());
}

function literalPrefix(text: string, literal: string): boolean {
  return labelKey(text).startsWith(labelKey(literal)) &&
    (!text[literal.length] || !/[\p{L}\p{N}_]/u.test(text[literal.length]) || /[:#=]$/.test(literal));
}

function prefixLabel(text: string, labels: readonly Label[]): Label | undefined {
  return labels.find(label => literalPrefix(text, label.text) && !excluded(label.field, text));
}

function isBoundary(text: string, labels: readonly Label[]): boolean {
  return Boolean(prefixLabel(text, labels) || STOP_LABELS.some(label => literalPrefix(text, label)) || CUSTOMER.test(text) || HEADING.test(text) || CREDIT.test(text));
}

function remainder(text: string, label: Label): string {
  return text.slice(label.text.length).replace(/^\s*[:=#]\s*/, "").trim();
}

interface Segment { line: SourceLine; text: string; index: number }
interface Candidate { value: string | null; raw: string; evidence: Evidence; label: Label }

function segmentsFor(lines: readonly SourceLine[], labels: readonly Label[]): Segment[] {
  const segments: Segment[] = [];
  const boundaries = [...new Set([...labels.map(label => label.text), ...STOP_LABELS])].sort((a, b) => b.length - a.length);
  for (const line of lines) {
    const parts = line.text.split(/\s*\|\s*|\t+| {3,}/).map(whitespace).filter(Boolean);
    const expanded: string[] = [];
    for (const part of parts) {
      // Skip an entire longest label before looking for another: "Date" must not
      // be split out of "Invoice Date" or "Due Date", including template labels.
      const cuts = [0];
      if (boundaries.some(label => literalPrefix(part, label))) {
        for (let index = 0; index < part.length; index++) {
          if (index && !/\s/.test(part[index - 1])) continue;
          const label = boundaries.find(literal => literalPrefix(part.slice(index), literal));
          if (!label || (index && !/^\s*:/.test(part.slice(index + label.length)))) continue;
          if (index) cuts.push(index);
          index += label.length - 1;
        }
      }
      cuts.forEach((cut, index) => expanded.push(part.slice(cut, cuts[index + 1]).trim()));
    }
    expanded.forEach(text => segments.push({ line, text, index: segments.length }));
  }
  return segments;
}

function plausibleSupplier(value: string): boolean {
  return value.length >= 2 && value.length <= 160 && /\p{L}/u.test(value) && !HEADING.test(value) &&
    !CUSTOMER.test(value) && !CREDIT.test(value) && !ADDRESS.test(value) && (!LOCATION.test(value) || COMPANY_END.test(value)) &&
    !/^(?:original|copy|duplicate)$|^page\s+\d|^\d[\d\s()+-]+$|^thank\s+you\b/i.test(value);
}

function evidenceFor(segment: Segment, method: Evidence["method"] = "label", following?: Segment): Evidence {
  return { lineId: segment.line.id, page: segment.line.page,
    text: following && following.line.id !== segment.line.id ? `${segment.line.text}\n${following.line.text}` : segment.line.text, method };
}

function nextValues(segment: Segment, segments: readonly Segment[], labels: readonly Label[]): Segment[] {
  const index = segment.index;
  const limit = Math.min(segments.length, index + 13);
  const sameRow: Segment[] = [];
  for (let i = index + 1; i < limit; i++) {
    const next = segments[i];
    if (next.line.page !== segment.line.page || next.line.y - segment.line.y > baselineTolerance(segment.line.height, next.line.height)) break;
    if (next.line.id !== segment.line.id && (next.line.x <= segment.line.x || next.line.x - segment.line.x > 320)) continue;
    // An intervening label owns the following region; do not jump past it to
    // consume that label's wrapped amount/date as the current field's value.
    if (isBoundary(next.text, labels)) return sameRow;
    sameRow.push(next);
  }
  if (sameRow.length) return sameRow;
  for (let i = index + 1; i < limit; i++) {
    const next = segments[i];
    const gap = next.line.y - segment.line.y;
    if (next.line.page !== segment.line.page || gap > Math.max(22, segment.line.height * 1.8)) break;
    if (gap <= baselineTolerance(segment.line.height, next.line.height)) continue;
    if (Math.abs(next.line.x - segment.line.x) > Math.max(20, segment.line.height * 2)) continue;
    return isBoundary(next.text, labels) ? [] : [next];
  }
  return [];
}

function rateRemainder(value: string): string | null {
  const rate = /^(?:\(\s*(?:@\s*|at\s+)?\d+(?:[.,]\d{1,3})?\s*%\s*\)|(?:@\s*|at\s+)?\d+(?:[.,]\d{1,3})?\s*%)(?:\s*[:=]\s*|\s+|$)/i.exec(value);
  return rate ? value.slice(rate[0].length).trim() : null;
}

function scanCurrency(text: string): CurrencyMark[] {
  const marks: CurrencyMark[] = [];
  const upper = text.toUpperCase();
  for (let i = 0; i < text.length; i++) {
    const mark = CURRENCY_MARKS.find(item => {
      if (!upper.startsWith(item.text.toUpperCase(), i)) return false;
      const before = text[i - 1];
      const after = text[i + item.text.length];
      if ((before && /[\p{L}_]/u.test(before)) || (after && /[\p{L}_]/u.test(after))) return false;
      // A lowercase English word such as "try" is not a global ISO-code declaration.
      return !CURRENCIES.includes(item.text) || text.slice(i, i + item.text.length) === item.text ||
        /^\s*\(?[+-]?\s*\d/.test(text.slice(i + item.text.length)) || /\d[\s).,]*$/.test(text.slice(0, i));
    });
    if (mark) { marks.push(mark); i += mark.text.length - 1; }
  }
  return marks;
}

// Templates replace aliases, never document-safety checks or currency ambiguity rules.
export function extractInvoice(lines: SourceLine[], options: ExtractionOptions): ExtractionResult {
  const result: ExtractionResult = { fields: emptyFields(), evidence: {}, issues: [], kind: "unknown" };
  const issue = (code: string, severity: InvoiceIssue["severity"], message: string, field?: InvoiceField) =>
    result.issues.push({ code, severity, message, ...(field ? { field } : {}) });
  if (!options || !["auto", "dot", "comma"].includes(options.numberFormat) || !["auto", "dmy", "mdy"].includes(options.dateOrder)) {
    issue("invalid_options", "error", "Choose a supported number format and date order.");
    return result;
  }
  const profile = options.profile === undefined ? undefined : parseMappingProfile(options.profile);
  if (profile === null) {
    issue("invalid_profile", "error", "The mapping profile is not a valid version-1 literal-label profile.");
    return result;
  }
  let characters = 0;
  const ids = new Set<string>();
  if (!Array.isArray(lines) || lines.length > INVOICE_LIMITS.pages * INVOICE_LIMITS.pageItems || lines.some(line => {
    if (!line || typeof line.text !== "string" || typeof line.id !== "string") return true;
    characters += line.text.length;
    const duplicate = ids.has(line.id);
    ids.add(line.id);
    return duplicate || !line.id || line.id.length > 96 || PROFILE_CONTROLS.test(line.id) || BAD_TEXT.test(line.text) || line.text.length > MAX_LINE ||
      characters > INVOICE_LIMITS.characters || !Number.isInteger(line.page) || line.page < 1 || line.page > INVOICE_LIMITS.pages ||
      ![line.x, line.y, line.height].every(Number.isFinite) || line.height <= 0;
  })) {
    issue("unsupported_text", "error", "Text exceeds supported limits or has invalid source geometry/identifiers; partial extraction is not used.");
    return result;
  }
  const ordered = lines.filter(line => line.text.trim()).slice().sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  if (!ordered.length) {
    issue("unsupported_text", "error", "No usable digital text was found. Scans and image-only PDFs need OCR, which this version does not provide.");
    return result;
  }
  const labels = labelsFor(profile);
  const labelFields = new Map<string, InvoiceField>();
  for (const label of labels) {
    const key = labelKey(label.text);
    if (labelFields.has(key) && labelFields.get(key) !== label.field) {
      issue("ambiguous_profile", "error", "The template gives the same literal label to different fields (including default aliases). Use distinct labels.");
      return result;
    }
    labelFields.set(key, label.field);
  }
  const recognitionLabels = [...labels, ...DEFAULT_LABELS].sort((a, b) => b.text.length - a.text.length);
  const segments = segmentsFor(ordered, recognitionLabels);
  const candidates: Record<InvoiceField, Candidate[]> = {
    vendor: [], invoiceNumber: [], invoiceDate: [], currency: [], subtotal: [], tax: [], discount: [], shipping: [], total: [],
  };
  const defaultNumbers = new Set<string>();
  let credit = segments.some(segment => CREDIT.test(segment.text));
  const vendorSegments = new Set<Segment>();

  for (const segment of segments) {
    const safetyLabel = prefixLabel(segment.text, DEFAULT_LABELS);
    if (safetyLabel?.field === "invoiceNumber" || safetyLabel?.field === "total") {
      const raw = remainder(segment.text, safetyLabel);
      const values = raw ? [raw] : nextValues(segment, segments, recognitionLabels).map(next => next.text);
      for (const value of values) {
        const normalized = normalizeField(safetyLabel.field, value, options);
        if (safetyLabel.field === "invoiceNumber" && normalized) defaultNumbers.add(fold(normalized));
        if (safetyLabel.field === "total" && normalized?.startsWith("-")) credit = true;
      }
    }
    const label = prefixLabel(segment.text, labels);
    if (!label) continue;
    const field = label.field;
    if (field === "vendor") vendorSegments.add(segment);
    const raw = remainder(segment.text, label);
    const next = raw ? [] : nextValues(segment, segments, recognitionLabels);
    if (next.length > 1) {
      issue("multi_column_layout", "warning", "More than one adjacent value could belong to a label. Check the original column layout.");
      candidates[field].push({ value: null, raw: next.map(value => value.text).join(" | "), label, evidence: evidenceFor(segment) });
      continue;
    }
    const valueSegment = next[0] ?? segment;
    let value = raw || next[0]?.text || "";
    let evidence = evidenceFor(segment, "label", next[0]);
    if (field === "tax" || field === "discount") {
      const withoutRate = rateRemainder(value);
      if (withoutRate !== null) {
        if (!withoutRate) {
          const amountLines = nextValues(segment, segments, recognitionLabels);
          if (amountLines.length === 1 && parseAmount(amountLines[0].text, options.numberFormat) !== null) {
            value = amountLines[0].text;
            evidence = evidenceFor(segment, "label", amountLines[0]);
          } else {
            issue("rate_without_amount", "warning", `${FIELD_LABELS[field]} shows a percentage without an unambiguous money amount. No amount was calculated.`, field);
            continue;
          }
        } else value = withoutRate;
      }
    }
    if (field === "vendor" && plausibleSupplier(value)) {
      const continuation = nextValues(valueSegment, segments, recognitionLabels);
      const wrapped = continuation.length === 1 ? continuation[0] : undefined;
      if (wrapped && wrapped.line.y > valueSegment.line.y + baselineTolerance(wrapped.line.height, valueSegment.line.height) &&
          plausibleSupplier(wrapped.text) && COMPANY_END.test(wrapped.text) && !COMPANY_END.test(value)) {
        value = `${value} ${wrapped.text}`;
        evidence = { ...evidence, text: `${evidence.text}\n${wrapped.line.text}` };
        vendorSegments.add(wrapped);
        issue("supplier_wrapped", "warning", "Supplier name was joined across nearby lines; verify the complete name.", "vendor");
      }
      vendorSegments.add(valueSegment);
    }
    let normalized = field === "vendor" && !plausibleSupplier(value) ? null : normalizeField(field, value, options);
    if (raw && MONEY.includes(field) && nextValues(segment, segments, recognitionLabels).some(adjacent =>
      Math.abs(adjacent.line.y - segment.line.y) <= baselineTolerance(adjacent.line.height, segment.line.height) &&
      parseAmount(adjacent.text, options.numberFormat) !== null)) {
      normalized = null;
      issue("multi_column_layout", "warning", "An extra amount shares a labeled value's row. No column was chosen automatically.");
    }
    candidates[field].push({ value: normalized, raw: value, evidence, label });
  }

  for (const field of INVOICE_FIELDS.filter(field => field !== "currency")) {
    let values = candidates[field];
    if (field === "tax" && !profile?.labels.tax) {
      const aggregate = values.filter(candidate => /^(?:total tax|tax total)$/i.test(candidate.label.text));
      const components = values.filter(candidate => /^(?:cgst|sgst|igst|pst)$/i.test(candidate.label.text));
      const families = new Set(values.map(candidate => /^(vat|gst|hst|cgst|sgst|igst|pst)\b/i.exec(candidate.label.text)?.[1].toLowerCase()).filter(Boolean));
      if (components.length || families.size > 1) {
        if (aggregate.length) values = aggregate;
        else {
          issue("tax_components", "warning", "Separate tax components cannot establish total tax. Enter an explicit total tax amount; components are not added automatically.", "tax");
          if (values[0]) result.evidence.tax = values[0].evidence;
          continue;
        }
      }
    }
    const valid = values.filter(candidate => candidate.value !== null && candidate.value !== "");
    const unique = new Set(valid.map(candidate => fold(candidate.value!)));
    if (values[0]) result.evidence[field] = values[0].evidence;
    if (unique.size > 1) {
      issue("conflicting_candidates", "warning", `Conflicting ${FIELD_LABELS[field].toLowerCase()} values were found (${[...new Set(valid.map(candidate => candidate.evidence.lineId))].slice(0, 4).join(", ")}). The field was left blank.`, field);
    } else if (values.some(candidate => candidate.value === null && candidate.raw)) {
      issue("unparsed_field", "warning", `${FIELD_LABELS[field]} has an ambiguous, malformed or unsupported labeled value. The field was left blank.`, field);
    } else if (valid.length) {
      const selected = valid.slice().sort((a, b) => b.label.rank - a.label.rank)[0];
      result.fields[field] = selected.value!;
      result.evidence[field] = selected.evidence;
    }
    if (field === "total") {
      const pages = new Map<number, number>();
      for (const candidate of values) pages.set(candidate.evidence.page, (pages.get(candidate.evidence.page) ?? 0) + 1);
      if ([...pages.values()].some(count => count > 1)) issue("duplicate_totals", "warning", "Multiple total labels occur on the same page. Verify that they describe one invoice, not separate columns/documents.");
    }
  }

  // Do not replace an invalid explicit/template supplier with an unrelated header.
  if (!candidates.vendor.length && !profile?.labels.vendor) {
    const firstPage = ordered[0].page;
    for (const segment of segments.filter(item => item.line.page === firstPage).slice(0, 12)) {
      if (CUSTOMER.test(segment.text) || segment.line.y > ordered[0].y + 160) break;
      if (isBoundary(segment.text, recognitionLabels)) continue;
      // Once an address starts, a later city/country is not another supplier candidate.
      if (ADDRESS.test(segment.text) || (LOCATION.test(segment.text) && !COMPANY_END.test(segment.text))) break;
      if (!plausibleSupplier(segment.text) || scanCurrency(segment.text).length) continue;
      result.fields.vendor = segment.text;
      result.evidence.vendor = evidenceFor(segment, "header");
      vendorSegments.add(segment);
      issue("supplier_suggested", "warning", "Supplier is suggested from an unlabelled first-page header, not verified. Check that it is not the customer.", "vendor");
      break;
    }
  }

  const mentions: { mark: CurrencyMark; segment: Segment }[] = [];
  for (const segment of segments) {
    const label = prefixLabel(segment.text, recognitionLabels);
    if (vendorSegments.has(segment) || label?.field === "invoiceNumber" || label?.field === "invoiceDate" || /@|https?:\/\//i.test(segment.text)) continue;
    for (const mark of scanCurrency(segment.text)) mentions.push({ mark, segment });
  }
  const currencyCandidates = candidates.currency.filter(candidate => candidate.value);
  const explicitCodes = new Set([
    ...mentions.filter(mention => mention.mark.codes.length === 1).map(mention => mention.mark.codes[0]),
    ...currencyCandidates.map(candidate => candidate.value!),
  ]);
  const code = [...explicitCodes][0];
  const currencyConflict = explicitCodes.size > 1 || Boolean(code && mentions.some(mention => !mention.mark.codes.includes(code)));
  const malformedCurrency = candidates.currency.some(candidate => candidate.raw && candidate.value === null &&
    !CURRENCY_MARKS.some(mark => mark.text.toUpperCase() === candidate.raw.toUpperCase()));
  const firstMention = mentions.find(mention => mention.mark.codes.length === 1) ?? mentions[0];
  if (candidates.currency[0]) result.evidence.currency = candidates.currency[0].evidence;
  else if (firstMention) result.evidence.currency = evidenceFor(firstMention.segment);
  if (currencyConflict) issue("conflicting_currency", "warning", "Different or incompatible currencies appear in the document. Select the invoice currency after checking the source.", "currency");
  else if (malformedCurrency) issue("unparsed_field", "warning", "The labeled currency is unsupported or malformed.", "currency");
  else if (code && (!profile?.labels.currency || candidates.currency.some(candidate => candidate.raw))) result.fields.currency = code;
  else if (code && profile?.labels.currency) issue("profile_label_missing", "warning", "The selected template's currency label has no value. Global hints were not substituted for that label.", "currency");
  else if (mentions.length || candidates.currency.length) issue("ambiguous_currency", "warning", "A symbol such as $, Rs or ¥ does not identify a unique currency. Enter a supported ISO code.", "currency");

  const numbers = new Set(candidates.invoiceNumber.filter(candidate => candidate.value).map(candidate => fold(candidate.value!)));
  // Conservatively treat distinct built-in/template IDs as a document conflict.
  const multiple = new Set([...defaultNumbers, ...numbers]).size > 1;
  if (candidates.total.some(candidate => candidate.value?.startsWith("-"))) credit = true;
  result.kind = credit ? "credit-note" : multiple ? "multiple" :
    numbers.size || defaultNumbers.size || segments.some(segment => /\binvoice\b/i.test(segment.text)) ? "invoice" : "unknown";
  if (multiple) {
    result.fields.invoiceNumber = "";
    issue("multiple_invoices", "error", "Distinct invoice numbers were found in this file. Split the file before extracting/exporting it.");
  }
  if (credit) issue("credit_note", "error", "Credit notes and refund documents are not supported by this version.");

  const labeled = segments.filter(segment => prefixLabel(segment.text, recognitionLabels));
  for (let i = 1; i < labeled.length; i++) {
    const a = labeled[i - 1];
    const b = labeled[i];
    if (a.line.page === b.line.page && Math.abs(a.line.y - b.line.y) <= baselineTolerance(a.line.height, b.line.height) &&
        (a.line.id === b.line.id || Math.abs(a.line.x - b.line.x) > 80)) {
      issue("multi_column_layout", "warning", "Multiple labels share a row/column boundary. Verify the source layout and every extracted summary field.");
      break;
    }
  }
  for (const field of REQUIRED) {
    if (!result.fields[field]) issue("missing_field", "warning", `${FIELD_LABELS[field]} is missing or unresolved.`, field);
  }
  const seenIssues = new Set<string>();
  result.issues = result.issues.filter(item => {
    const key = `${item.code}:${item.field ?? ""}`;
    if (seenIssues.has(key)) return false;
    seenIssues.add(key);
    return true;
  });
  return result;
}