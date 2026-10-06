import { createScanner, parseTree } from "jsonc-parser";
import type { Node, ParseError, SyntaxKind } from "jsonc-parser";
import Papa from "papaparse";
import { JSON_CSV_LIMITS } from "./types";
import type {
  ArrayPathOption, CsvColumn, CsvConversion, CsvOptions, JsonInputFormat,
  JsonInspection, RowPathOption,
} from "./types";

// One limit for generated and edited headers: submitting unchanged UI columns
// must not invalidate an otherwise valid generated header.
const HEADER_CHARS = 1_024;
const POINTER_CHARS = 4_096;
const SELECTOR_CHARS = 65_536;
const OPTION_KEYS = [
  "rowPath", "flatten", "arrayMode", "joinSeparator", "expandPath",
  "nullValue", "missingValue", "delimiter", "newline", "includeHeader",
  "bom", "quoteAll", "protectFormulas",
] as const;
const NUMBER_TOKEN = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
// Constructed rather than a property-escape literal to retain the ES2017 target.
const LEADING_IGNORABLE = new RegExp("^[\\p{White_Space}\\p{Cc}\\p{Cf}]$", "u");
// jsonc-parser 3.3.1 declares ambient const enums, which isolatedModules cannot
// access as values. These stable public scanner codes are covered by the tests.
const TOKEN = {
  OpenBrace: 1, CloseBrace: 2, OpenBracket: 3, CloseBracket: 4,
  Number: 11, LineComment: 12, BlockComment: 13, LineBreak: 14,
  Whitespace: 15, Unknown: 16, End: 17,
} as const;

export class JsonCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonCsvError";
  }
}

// jsonc-parser's public Node.value is loosely typed. Narrow it to unknown here;
// only decoded string values are ever read. Numeric node.value is NEVER used.
interface TreeNode {
  readonly type: Node["type"];
  readonly offset: number;
  readonly length: number;
  readonly value?: unknown;
  readonly children?: readonly TreeNode[];
}
interface Source { text: string; start: number }
interface Ref { node: TreeNode; source: Source }
interface ParsedInput {
  format: JsonInputFormat;
  input: string;
  inputBytes: number;
  roots: Ref[];
  fields: WeakMap<TreeNode, Map<string, TreeNode>>;
  warnings: Set<string>;
}
interface Candidate {
  option: RowPathOption;
  root?: Ref;
  lines?: readonly Ref[];
}
interface Overlay {
  target: Ref;
  replacement?: Ref;
  removeStart: number;
  removeEnd: number;
}
interface RowView { original: Ref; overlay?: Overlay }
interface RowPlan { original: Ref; target?: Ref; removeStart: number; removeEnd: number }
interface Cell { ref?: Ref; overlay?: Overlay }
interface PreparedCell {
  text: string;
  kind: "number" | "null" | "missing" | "other";
  joined: boolean;
  complexArray: boolean;
  omittedMember: boolean;
}

function safely<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error: unknown) {
    if (error instanceof JsonCsvError) throw error;
    throw new JsonCsvError("Unable to process this JSON safely. Check the input and CSV settings.");
  }
}

function failAt(input: string, offset: number, message: string): never {
  let line = 1;
  let column = 1;
  for (let index = 0; index < Math.min(offset, input.length); index++) {
    const code = input.charCodeAt(index);
    if (code === 13 || code === 10) {
      if (code === 13 && input.charCodeAt(index + 1) === 10 && index + 1 < offset) index++;
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  throw new JsonCsvError(`${message} (line ${line}, column ${column}).`);
}

// Matches TextEncoder, including replacement of unpaired UTF-16 surrogates,
// without allocating an encoded copy just to enforce an input/output budget.
function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff
      && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index++;
    } else bytes += 3;
  }
  return bytes;
}

function requireWellFormed(text: string): void {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0xd800 || code > 0xdfff) continue;
    if (code <= 0xdbff) {
      const next = text.charCodeAt(++index);
      if (next >= 0xdc00 && next <= 0xdfff) continue;
    }
    throw new JsonCsvError("Unpaired Unicode surrogate in an exported field; replace it or export valid Unicode.");
  }
}

function boundedPointer(parts: readonly string[], reserve?: (length: number) => void): string {
  // Preflight raw parts before replace/join: one huge key must not allocate an
  // escaped copy. Stop scanning as soon as the escaped length exceeds the cap.
  let length = 0;
  for (const part of parts) {
    if (++length > POINTER_CHARS) throw new JsonCsvError("A JSON Pointer exceeds the 4,096-character limit.");
    for (let index = 0; index < part.length; index++) {
      const code = part.charCodeAt(index);
      length += code === 47 || code === 126 ? 2 : 1;
      if (length > POINTER_CHARS) throw new JsonCsvError("A JSON Pointer exceeds the 4,096-character limit.");
    }
  }
  reserve?.(length);
  return parts.length ? `/${parts.map((part) => part.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}` : "";
}

function pointerParts(path: string): string[] {
  if (!isPointer(path)) throw new JsonCsvError("Invalid JSON Pointer. Use valid escapes and at most 4,096 characters.");
  return path === "" ? [] : path.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function isPointer(value: unknown): value is string {
  return typeof value === "string" && value.length <= POINTER_CHARS
    && (value === "" || value.startsWith("/")) && !/~(?:[^01]|$)/.test(value);
}

// Only own data properties are accepted, including on direct engine calls.
// No getter, inherited option, or input-key object assignment is necessary.
function dataFields(value: unknown, keys: readonly string[], error: string): Map<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new JsonCsvError(error);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== keys.length || names.some((name) => !keys.includes(name))
    || Object.getOwnPropertySymbols(value).length) throw new JsonCsvError(error);
  const result = new Map<string, unknown>();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw new JsonCsvError(error);
    const field: unknown = descriptor.value;
    result.set(key, field);
  }
  return result;
}

function checkedOptions(value: CsvOptions): CsvOptions {
  const error = "Invalid CSV options. Use the supported settings and text limits.";
  const fields = dataFields(value, OPTION_KEYS, error);
  const rowPath = fields.get("rowPath"), flatten = fields.get("flatten"), arrayMode = fields.get("arrayMode");
  const joinSeparator = fields.get("joinSeparator"), expandPath = fields.get("expandPath");
  const nullValue = fields.get("nullValue"), missingValue = fields.get("missingValue");
  const delimiter = fields.get("delimiter"), newline = fields.get("newline");
  const includeHeader = fields.get("includeHeader"), bom = fields.get("bom");
  const quoteAll = fields.get("quoteAll"), protectFormulas = fields.get("protectFormulas");
  if (!isPointer(rowPath) || typeof flatten !== "boolean" || (arrayMode !== "json" && arrayMode !== "join")
    || typeof joinSeparator !== "string" || joinSeparator.length > 32
    || (expandPath !== null && !isPointer(expandPath))
    || typeof nullValue !== "string" || nullValue.length > 100
    || typeof missingValue !== "string" || missingValue.length > 100
    || (delimiter !== "," && delimiter !== ";" && delimiter !== "\t" && delimiter !== "|")
    || (newline !== "\r\n" && newline !== "\n")
    || typeof includeHeader !== "boolean" || typeof bom !== "boolean"
    || typeof quoteAll !== "boolean" || typeof protectFormulas !== "boolean") throw new JsonCsvError(error);
  return { rowPath, flatten, arrayMode, joinSeparator, expandPath, nullValue, missingValue,
    delimiter, newline, includeHeader, bom, quoteAll, protectFormulas };
}

function checkedColumnShapes(value: CsvColumn[] | undefined): CsvColumn[] | undefined {
  if (value === undefined) return undefined;
  const error = "Invalid column settings. Supply the complete, unique column list with headers up to 1,024 characters.";
  if (!Array.isArray(value) || value.length > JSON_CSV_LIMITS.columns) throw new JsonCsvError(error);
  const columns: CsvColumn[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) throw new JsonCsvError(error);
    const entry: unknown = descriptor.value;
    const fields = dataFields(entry, ["id", "path", "header", "enabled"], error);
    const id = fields.get("id"), path = fields.get("path"), header = fields.get("header"), enabled = fields.get("enabled");
    if (typeof id !== "string" || id.length > POINTER_CHARS + 6 || !isPointer(path)
      || typeof header !== "string" || header.length > HEADER_CHARS || typeof enabled !== "boolean") {
      throw new JsonCsvError(error);
    }
    columns.push({ id, path, header, enabled });
  }
  return columns;
}

function sourcesOf(input: string, format: JsonInputFormat, warnings: Set<string>): Source[] {
  if (format === "json") {
    if (input.charCodeAt(0) === 0xfeff) {
      warnings.add("One leading UTF-8 BOM was ignored for JSON parsing; input size counts still include it.");
      return [{ text: input.slice(1), start: 1 }];
    }
    return [{ text: input, start: 0 }];
  }
  if (!input.length) failAt(input, 0, "Enter at least one JSON Lines record");
  const sources: Source[] = [];
  // A final LF terminates the last record, not an additional empty record.
  // Every other empty/whitespace-only line is an error, including a second LF.
  for (let start = 0; start < input.length;) {
    const newline = input.indexOf("\n", start);
    const end = newline === -1 ? input.length : newline;
    const text = input.slice(start, end);
    if (/^[ \t\r]*$/.test(text)) failAt(input, start, "Blank JSON Lines records are not allowed");
    sources.push({ text, start });
    start = end + 1;
  }
  return sources;
}

function preflight(input: string, sources: readonly Source[], initialTokens: number): void {
  let tokens = initialTokens;
  // All lines are scanned BEFORE the first recursive parse. Punctuation tokens
  // upper-bound actual AST nodes (a colon accounts for a property node).
  for (const source of sources) {
    const scanner = createScanner(source.text, false);
    const stack: SyntaxKind[] = [];
    for (let token = scanner.scan(); token !== TOKEN.End; token = scanner.scan()) {
      const offset = source.start + scanner.getTokenOffset();
      if (scanner.getTokenError() !== 0) failAt(input, offset, "Invalid JSON token");
      if (token === TOKEN.LineComment || token === TOKEN.BlockComment) {
        failAt(input, offset, "JSON comments are not allowed");
      }
      if (token === TOKEN.Unknown) failAt(input, offset, "Invalid JSON token");
      if (token === TOKEN.Whitespace || token === TOKEN.LineBreak) continue;
      if (++tokens > JSON_CSV_LIMITS.nodes) failAt(input, offset, "JSON exceeds the 200,000-token/node limit");
      if (token === TOKEN.Number
        && !NUMBER_TOKEN.test(source.text.slice(scanner.getTokenOffset(), scanner.getTokenOffset() + scanner.getTokenLength()))) {
        failAt(input, offset, "Invalid JSON number");
      }
      if (token === TOKEN.OpenBrace || token === TOKEN.OpenBracket) {
        stack.push(token);
        if (stack.length > JSON_CSV_LIMITS.depth) failAt(input, offset, "JSON exceeds the nesting depth limit of 40");
      } else if (token === TOKEN.CloseBrace || token === TOKEN.CloseBracket) {
        const expected = token === TOKEN.CloseBrace ? TOKEN.OpenBrace : TOKEN.OpenBracket;
        if (stack.pop() !== expected) failAt(input, offset, "Mismatched JSON brackets");
      }
    }
  }
}

function parseInput(input: string, format: JsonInputFormat): ParsedInput {
  if (typeof input !== "string" || (format !== "json" && format !== "jsonl")) {
    throw new JsonCsvError("Provide JSON text and a supported input format.");
  }
  if (input.length > JSON_CSV_LIMITS.inputChars) throw new JsonCsvError("Input exceeds 1,000,000 UTF-16 characters.");
  const inputBytes = utf8Bytes(input);
  if (inputBytes > JSON_CSV_LIMITS.inputBytes) throw new JsonCsvError("Input exceeds the 2 MiB UTF-8 byte limit.");
  const warnings = new Set<string>();
  const sources = sourcesOf(input, format, warnings);
  preflight(input, sources, format === "jsonl" ? 1 : 0);
  const roots: Ref[] = [];
  const fields = new WeakMap<TreeNode, Map<string, TreeNode>>();
  let nodes = format === "jsonl" ? 1 : 0;
  for (const source of sources) {
    const errors: ParseError[] = [];
    const root: TreeNode | undefined = parseTree(source.text, errors, {
      disallowComments: true, allowTrailingComma: false, allowEmptyContent: false,
    });
    if (errors.length || !root) failAt(input, source.start + (errors[0]?.offset ?? 0), "Invalid strict JSON");
    roots.push({ node: root, source });
    const stack: TreeNode[] = [root];
    while (stack.length) {
      const node = stack.pop()!;
      if (++nodes > JSON_CSV_LIMITS.nodes) failAt(input, source.start + node.offset, "JSON exceeds the 200,000-token/node limit");
      if (node.type === "object") {
        const properties = new Map<string, TreeNode>();
        for (const property of node.children ?? []) {
          const keyNode = property.children?.[0];
          const value = property.children?.[1];
          if (!keyNode || typeof keyNode.value !== "string" || !value) throw new Error("Invalid parser tree");
          if (properties.has(keyNode.value)) failAt(input, source.start + keyNode.offset, "Duplicate object keys are not allowed");
          properties.set(keyNode.value, value);
        }
        fields.set(node, properties);
      }
      if (node.children) for (let index = node.children.length - 1; index >= 0; index--) stack.push(node.children[index]);
    }
  }
  return { format, input, inputBytes, roots, fields, warnings };
}

function* records(candidate: Candidate, limit = Number.MAX_SAFE_INTEGER): Generator<Ref> {
  if (candidate.lines) {
    for (let index = 0; index < Math.min(candidate.lines.length, limit); index++) yield candidate.lines[index];
  } else if (candidate.root) {
    if (candidate.root.node.type === "array") {
      const children = candidate.root.node.children ?? [];
      for (let index = 0; index < Math.min(children.length, limit); index++) yield { node: children[index], source: candidate.root.source };
    } else if (limit > 0) yield candidate.root;
  }
}

function candidateFor(root: Ref, path: string): Candidate {
  const kind = root.node.type === "array" ? "array" : root.node.type === "object" ? "object" : "scalar";
  return { root, option: { pointer: path, label: path || `Root (${kind})`, kind,
    rowCount: kind === "array" ? (root.node.children?.length ?? 0) : 1, arrayPaths: [] } };
}

function candidatesOf(parsed: ParsedInput): Candidate[] {
  const candidates: Candidate[] = parsed.format === "jsonl"
    ? [{ lines: parsed.roots, option: { pointer: "", label: "Root (JSON Lines records)", kind: "array",
      rowCount: parsed.roots.length, arrayPaths: [] } }]
    : [candidateFor(parsed.roots[0], "")];
  let selectorChars = candidates[0].option.label.length;
  function selectorPointer(parts: readonly string[], emptyLabel = ""): string {
    return boundedPointer(parts, (length) => {
      // Count every returned pointer AND label, even when strings are equal or
      // the same array path appears in several row sources. Reserve before allocation.
      const chars = length + (length || emptyLabel.length);
      if (chars > SELECTOR_CHARS - selectorChars) throw new JsonCsvError("JSON selector text exceeds the 65,536-character budget.");
      selectorChars += chars;
    });
  }
  function findRows(ref: Ref, parts: string[]): void {
    // Deliberately never walk array elements to invent row-selection paths.
    if (ref.node.type !== "object") return;
    for (const [key, node] of parsed.fields.get(ref.node) ?? []) {
      if (candidates.length >= JSON_CSV_LIMITS.rowPaths) return;
      if (node.type !== "array" && node.type !== "object") continue;
      parts.push(key);
      const child = { node, source: ref.source };
      if (node.type === "array") candidates.push(candidateFor(child, selectorPointer(parts)));
      else findRows(child, parts);
      parts.pop();
    }
  }
  if (parsed.format === "json") findRows(parsed.roots[0], []);
  if (candidates.length >= JSON_CSV_LIMITS.rowPaths) parsed.warnings.add("Row-source discovery stopped at the 60-choice limit; additional sources may exist. Input records were not truncated.");
  let limitedCandidates = 0;
  let limitedArrayPaths = false;
  for (const candidate of candidates) {
    if (candidate.option.rowCount > JSON_CSV_LIMITS.rows) limitedCandidates++;
    const paths: ArrayPathOption[] = [];
    const seenParts: string[][] = [];
    function findArrays(ref: Ref, parts: string[]): void {
      if (paths.length >= JSON_CSV_LIMITS.arrayPaths) return;
      if (ref.node.type === "array") {
        // At most 50 raw paths: compare parts before escaping so repeated paths
        // in records neither allocate new selector text nor consume its budget.
        if (!seenParts.some((seen) => seen.length === parts.length && seen.every((key, index) => key === parts[index]))) {
          const path = selectorPointer(parts, "(value)");
          paths.push({ pointer: path, label: path || "(value)" });
          seenParts.push(parts.slice());
        }
      } else if (ref.node.type === "object") {
        for (const [key, node] of parsed.fields.get(ref.node) ?? []) {
          if (paths.length >= JSON_CSV_LIMITS.arrayPaths) return;
          if (node.type !== "array" && node.type !== "object") continue;
          parts.push(key);
          findArrays({ node, source: ref.source }, parts);
          parts.pop();
        }
      }
    }
    for (const record of records(candidate, JSON_CSV_LIMITS.rows)) {
      if (paths.length >= JSON_CSV_LIMITS.arrayPaths) break;
      findArrays(record, []);
    }
    if (paths.length >= JSON_CSV_LIMITS.arrayPaths) limitedArrayPaths = true;
    candidate.option.arrayPaths = paths;
  }
  if (limitedCandidates) parsed.warnings.add(`Array-path controls scan only the first 10,000 rows per source; ${limitedCandidates} source(s) exceed that limit. Conversion rejects oversized row sources rather than truncating them.`);
  if (limitedArrayPaths) parsed.warnings.add("Array-path discovery stopped at the 50 array-path choice limit for a row source; additional paths may exist. Input arrays were not truncated.");
  return candidates;
}

export function inspectJson(input: string, format: JsonInputFormat): JsonInspection {
  return safely(() => {
    const parsed = parseInput(input, format);
    const candidates = candidatesOf(parsed);
    return { format, inputChars: input.length, inputBytes: parsed.inputBytes,
      rowPaths: candidates.map((candidate) => candidate.option), warnings: Array.from(parsed.warnings) };
  });
}

function findOwn(ref: Ref, parts: readonly string[], parsed: ParsedInput): Ref | undefined {
  let node: TreeNode | undefined = ref.node;
  for (const key of parts) {
    if (node.type !== "object") return undefined;
    node = parsed.fields.get(node)?.get(key);
    if (!node) return undefined;
  }
  return { node, source: ref.source };
}

function planRows(candidate: Candidate, options: CsvOptions, parsed: ParsedInput): { plans: RowPlan[]; count: number; nonArrays: number } {
  if (!candidate.option.rowCount) throw new JsonCsvError("The selected row source is empty; there are no rows to convert.");
  if (candidate.option.rowCount > JSON_CSV_LIMITS.rows) throw new JsonCsvError("The selected row source exceeds the 10,000-row limit.");
  const parts = options.expandPath === null ? null : pointerParts(options.expandPath);
  const plans: RowPlan[] = [];
  let count = 0;
  let nonArrays = 0;
  for (const original of records(candidate)) {
    let target = parts ? findOwn(original, parts, parsed) : undefined;
    if (target && target.node.type !== "array" && target.node.type !== "null") {
      nonArrays++;
      target = undefined;
    }
    count += target?.node.type === "array" ? Math.max(1, target.node.children?.length ?? 0) : 1;
    if (count > JSON_CSV_LIMITS.rows) throw new JsonCsvError("Array expansion exceeds the 10,000-output-row limit.");
    let removeStart = target?.node.offset ?? 0;
    let removeEnd = removeStart + (target?.node.length ?? 0);
    // When an outer expansion is missing inside an unflattened object cell,
    // omit that member using lexical spans, retaining all its sibling metadata.
    // This avoids inventing JSON undefined or changing the missing value to null.
    if (target && parts?.length && (target.node.type === "null" || !target.node.children?.length)) {
      const parent = findOwn(original, parts.slice(0, -1), parsed);
      const properties = parent?.node.children ?? [];
      const index = properties.findIndex((property) => property.children?.[1] === target?.node);
      if (index >= 0) {
        const property = properties[index];
        removeStart = property.offset;
        removeEnd = property.offset + property.length;
        if (index + 1 < properties.length) removeEnd = properties[index + 1].offset;
        else if (index > 0) removeStart = properties[index - 1].offset + properties[index - 1].length;
      }
    }
    plans.push({ original, target, removeStart, removeEnd });
  }
  return { plans, count, nonArrays };
}

function* expandedRows(plans: readonly RowPlan[]): Generator<RowView> {
  for (const plan of plans) {
    if (!plan.target) {
      yield { original: plan.original };
      continue;
    }
    const children = plan.target.node.type === "array" ? plan.target.node.children ?? [] : [];
    if (!children.length) yield { original: plan.original, overlay: { target: plan.target,
      removeStart: plan.removeStart, removeEnd: plan.removeEnd } };
    else for (const node of children) yield { original: plan.original, overlay: {
      target: plan.target, replacement: { node, source: plan.target.source },
      removeStart: plan.removeStart, removeEnd: plan.removeEnd,
    } };
  }
}

function containsOverlay(ref: Ref, overlay: Overlay | undefined): overlay is Overlay {
  return !!overlay && ref.source === overlay.target.source && ref.node !== overlay.target.node
    && ref.node.offset <= overlay.target.node.offset
    && ref.node.offset + ref.node.length >= overlay.target.node.offset + overlay.target.node.length;
}

function rowFields(row: RowView, parsed: ParsedInput, flatten: boolean, emit: (id: string, parts: readonly string[], cell: Cell) => void): void {
  const parts: string[] = [];
  function walk(original: Ref | undefined): void {
    const ref = original && original.node === row.overlay?.target.node ? row.overlay.replacement : original;
    const properties = ref ? parsed.fields.get(ref.node) : undefined;
    if (ref?.node.type === "object" && properties?.size && (!parts.length || flatten)) {
      for (const [key, node] of properties) {
        parts.push(key);
        walk({ node, source: ref.source });
        parts.pop();
      }
    } else {
      const id = parts.length ? `field:${boundedPointer(parts)}` : "root:";
      emit(id, parts, { ref, overlay: ref && containsOverlay(ref, row.overlay) ? row.overlay : undefined });
    }
  }
  walk(row.original);
}

function defaultHeader(parts: readonly string[]): string {
  if (!parts.length) return "(value)";
  let header = "";
  for (const key of parts) {
    if (key.length > HEADER_CHARS) throw new JsonCsvError("A generated column header exceeds 1,024 characters.");
    const piece = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `${header ? "." : ""}${key}` : `[${JSON.stringify(key)}]`;
    if (header.length + piece.length > HEADER_CHARS) throw new JsonCsvError("A generated column header exceeds 1,024 characters.");
    header += piece;
  }
  return header;
}

function selectColumns(available: Map<string, CsvColumn>, supplied: CsvColumn[] | undefined): CsvColumn[] {
  const columns = supplied ?? Array.from(available.values());
  const ids = new Set<string>();
  const headers = new Set<string>();
  if (columns.length !== available.size) throw new JsonCsvError("Column settings must contain every available column exactly once.");
  for (const column of columns) {
    if (ids.has(column.id) || !available.has(column.id) || available.get(column.id)?.path !== column.path) {
      throw new JsonCsvError("Column settings contain an unknown, duplicate, or mismatched column.");
    }
    ids.add(column.id);
    if (column.enabled) {
      const header = column.header.trim();
      if (!header || headers.has(header)) throw new JsonCsvError("Enabled column headers must be nonblank and unique after trimming.");
      headers.add(header);
    }
  }
  if (!headers.size) throw new JsonCsvError("Enable at least one column to export.");
  return columns;
}

function requireChars(length: number, remaining: number): void {
  if (length > remaining) throw new JsonCsvError("Converted field text exceeds the 4,000,000-character budget.");
}

function raw(ref: Ref, remaining: number, overlay?: Overlay): string {
  const start = ref.node.offset;
  const end = start + ref.node.length;
  if (!overlay) {
    requireChars(ref.node.length, remaining);
    return ref.source.text.slice(start, end);
  }
  if (!overlay.replacement) {
    requireChars(ref.node.length - (overlay.removeEnd - overlay.removeStart), remaining);
    return ref.source.text.slice(start, overlay.removeStart) + ref.source.text.slice(overlay.removeEnd, end);
  }
  const targetStart = overlay.target.node.offset;
  const targetEnd = targetStart + overlay.target.node.length;
  requireChars(ref.node.length - overlay.target.node.length + overlay.replacement.node.length, remaining);
  return ref.source.text.slice(start, targetStart)
    + raw(overlay.replacement, remaining) + ref.source.text.slice(targetEnd, end);
}

function scalarText(ref: Ref, nullValue: string, remaining: number): string {
  if (ref.node.type === "null") {
    requireChars(nullValue.length, remaining);
    return nullValue;
  }
  if (ref.node.type === "string") {
    const text = ref.node.value;
    if (typeof text !== "string") throw new Error("Invalid string node");
    requireChars(text.length, remaining);
    return text;
  }
  return raw(ref, remaining);
}

function prepareCell(cell: Cell, options: CsvOptions, remaining: number): PreparedCell {
  const { ref, overlay } = cell;
  const kind = !ref ? "missing" : ref.node.type === "null" ? "null" : ref.node.type === "number" ? "number" : "other";
  const result: PreparedCell = { text: "", kind, joined: false, complexArray: false, omittedMember: false };
  if (!ref) {
    requireChars(options.missingValue.length, remaining);
    result.text = options.missingValue;
  } else if (ref.node.type === "array" && options.arrayMode === "join") {
    const children = ref.node.children ?? [];
    if (children.every((node) => node.type !== "object" && node.type !== "array")) {
      let length = Math.max(0, children.length - 1) * options.joinSeparator.length;
      requireChars(length, remaining);
      const parts: string[] = [];
      for (const node of children) {
        const text = scalarText({ node, source: ref.source }, options.nullValue, remaining - length);
        length += text.length;
        parts.push(text);
      }
      result.text = parts.join(options.joinSeparator);
      result.joined = true;
    } else {
      result.text = raw(ref, remaining);
      result.complexArray = true;
    }
  } else if (ref.node.type === "object" || ref.node.type === "array") {
    result.text = raw(ref, remaining, overlay);
    result.omittedMember = !!overlay && !overlay.replacement;
  } else result.text = scalarText(ref, options.nullValue, remaining);
  return result;
}

function riskyText(text: string): boolean {
  // Normalize only the leading code points needed for risk detection. The
  // exported string is never normalized/trimmed, and long safe text is cheap.
  for (const point of text) {
    for (const normalized of point.normalize("NFKC")) {
      if (LEADING_IGNORABLE.test(normalized)) continue;
      return normalized === "=" || normalized === "+" || normalized === "-" || normalized === "@";
    }
  }
  return false;
}

function csvFieldBytes(text: string, options: CsvOptions, oneColumn: boolean): number {
  let quotes = 0;
  for (let index = 0; index < text.length; index++) if (text.charCodeAt(index) === 34) quotes++;
  const quoted = options.quoteAll || (oneColumn && text === "") || quotes > 0
    || text.includes(options.delimiter) || /[\r\n\ufeff]/.test(text) || text.startsWith(" ") || text.endsWith(" ");
  return utf8Bytes(text) + quotes + (quoted ? 2 : 0);
}

export function convertJson(input: string, format: JsonInputFormat, options: CsvOptions, columns?: CsvColumn[]): CsvConversion {
  return safely(() => {
    const settings = checkedOptions(options);
    const supplied = checkedColumnShapes(columns);
    const parsed = parseInput(input, format);
    const candidates = candidatesOf(parsed);
    const selected = candidates.find((candidate) => candidate.option.pointer === settings.rowPath);
    if (!selected) throw new JsonCsvError("Choose an available row-source JSON Pointer.");
    if (settings.expandPath !== null && !selected.option.arrayPaths.some((path) => path.pointer === settings.expandPath)) {
      throw new JsonCsvError("Choose one available array-expansion JSON Pointer for this row source.");
    }
    const planned = planRows(selected, settings, parsed);
    const available = new Map<string, CsvColumn>();
    if (supplied && supplied.filter((column) => column.enabled).length * planned.count > JSON_CSV_LIMITS.cells) {
      throw new JsonCsvError("Export exceeds the 250,000-data-cell limit.");
    }
    // Discovery carries references, never serialized values or an expanded CSV.
    for (const row of expandedRows(planned.plans)) rowFields(row, parsed, settings.flatten, (id, parts) => {
      if (available.has(id)) return;
      if (available.size >= JSON_CSV_LIMITS.columns) throw new JsonCsvError("The union of row fields exceeds the 200-column limit.");
      available.set(id, { id, path: boundedPointer(parts), header: defaultHeader(parts), enabled: true });
      if (!supplied && planned.count * available.size > JSON_CSV_LIMITS.cells) {
        throw new JsonCsvError("Export exceeds the 250,000-data-cell limit.");
      }
    });
    const selectedColumns = selectColumns(available, supplied);
    const enabled = selectedColumns.filter((column) => column.enabled);
    if (planned.count * enabled.length > JSON_CSV_LIMITS.cells) throw new JsonCsvError("Export exceeds the 250,000-data-cell limit.");
    const stats: CsvConversion["stats"] = {
      inputRows: selected.option.rowCount, outputRows: planned.count, availableColumns: available.size,
      exportedColumns: enabled.length, nullCells: 0, missingCells: 0,
      protectedFields: 0, formulaRiskFields: 0, numericCells: 0, downloadBytes: 0,
    };
    let dataChars = 0;
    const matrixRows = planned.count + (settings.includeHeader ? 1 : 0);
    let outputBytes = (settings.bom ? 3 : 0)
      + matrixRows * (enabled.length - 1) + Math.max(0, matrixRows - 1) * settings.newline.length;
    let joinedCells = 0, complexArrays = 0, omittedMembers = 0;
    const oneColumn = enabled.length === 1;
    function transform(text: string, numeric: boolean): string {
      if (!numeric && riskyText(text)) {
        stats.formulaRiskFields++;
        if (settings.protectFormulas) {
          stats.protectedFields++;
          return `'${text}`;
        }
      }
      return text;
    }
    function reserve(text: string): void {
      requireChars(text.length, JSON_CSV_LIMITS.dataChars - dataChars);
      // Validate only final exported fields, not decoded input or unused settings.
      // Literal JSON escape sequences in raw compound cells remain lossless text.
      requireWellFormed(text);
      dataChars += text.length;
      outputBytes += csvFieldBytes(text, settings, oneColumn);
      if (outputBytes > JSON_CSV_LIMITS.outputBytes) throw new JsonCsvError("CSV download exceeds the 8 MiB UTF-8 output limit.");
    }
    const headers = enabled.map((column) => {
      if (!settings.includeHeader) return column.header;
      const header = transform(column.header, false);
      reserve(header);
      return header;
    });
    if (new Set(headers.map((header) => header.trim())).size !== headers.length) {
      throw new JsonCsvError("Formula protection creates duplicate export headers. Rename the enabled columns.");
    }
    const cache = new WeakMap<TreeNode, PreparedCell>();
    const rows: string[][] = [];
    for (const row of expandedRows(planned.plans)) {
      const fields = new Map<string, Cell>();
      rowFields(row, parsed, settings.flatten, (id, _parts, cell) => fields.set(id, cell));
      const output: string[] = [];
      for (const column of enabled) {
        const cell = fields.get(column.id) ?? {};
        let prepared = cell.ref && !cell.overlay ? cache.get(cell.ref.node) : undefined;
        if (!prepared) {
          prepared = prepareCell(cell, settings, JSON_CSV_LIMITS.dataChars - dataChars);
          if (cell.ref && !cell.overlay) cache.set(cell.ref.node, prepared);
        }
        // Cached/repeated parent fields still consume the budget on EVERY row.
        requireChars(prepared.text.length, JSON_CSV_LIMITS.dataChars - dataChars);
        const text = transform(prepared.text, prepared.kind === "number");
        reserve(text);
        if (prepared.kind === "null") stats.nullCells++;
        if (prepared.kind === "missing") stats.missingCells++;
        if (prepared.kind === "number") stats.numericCells++;
        if (prepared.joined) joinedCells++;
        if (prepared.complexArray) complexArrays++;
        if (prepared.omittedMember) omittedMembers++;
        output.push(text);
      }
      rows.push(output);
    }
    // Headers are an explicit matrix row so the same quoting/protection policy
    // covers them. All CSV size checks happen before invoking the serializer.
    const matrix = settings.includeHeader ? [headers, ...rows] : rows;
    const csv = Papa.unparse(matrix, {
      delimiter: settings.delimiter, newline: settings.newline, header: false,
      quotes: (value: unknown) => settings.quoteAll || (oneColumn && value === ""),
      skipEmptyLines: false, escapeFormulae: false,
    });
    const downloadBytes = utf8Bytes(csv) + (settings.bom ? 3 : 0);
    if (downloadBytes !== outputBytes) throw new Error("CSV byte preflight mismatch");
    stats.downloadBytes = downloadBytes;
    if (settings.rowPath !== "") parsed.warnings.add("Parent/wrapper metadata outside the selected row array is not included in the export.");
    if (planned.nonArrays) parsed.warnings.add(`${planned.nonArrays} input row(s) had a non-array value at the expansion path and were retained unchanged.`);
    if (joinedCells) parsed.warnings.add(`${joinedCells} array cell(s) were joined as text. Joining is not lossless; separators and null replacements can be ambiguous.`);
    if (complexArrays) parsed.warnings.add(`${complexArrays} array cell(s) contained objects or nested arrays and were retained as JSON instead of joined.`);
    if (omittedMembers) parsed.warnings.add(`${omittedMembers} serialized parent-object cell(s) omit the missing expanded member while retaining sibling fields.`);
    if (settings.nullValue === "" && settings.missingValue === "") parsed.warnings.add("Null and missing values both export as blank cells and cannot be distinguished in CSV.");
    else if (settings.nullValue === settings.missingValue) parsed.warnings.add("Null and missing values use the same replacement and cannot be distinguished in CSV.");
    if (settings.protectFormulas) parsed.warnings.add("Formula protection is a heuristic, not a universal safety guarantee. Spreadsheet apps can strip apostrophes when saving and reopening CSV.");
    else parsed.warnings.add(`Formula protection is off; ${stats.formulaRiskFields} formula-risk field(s) are exported unchanged. Do not open untrusted CSV directly in a spreadsheet.`);
    parsed.warnings.add("CSV quotes and a BOM do not force text typing. Import identifiers and long numbers as text: Excel may retain only 15 significant digits or remove leading zeros.");
    return { options: settings, format, columns: selectedColumns, headers, rows, csv, stats, warnings: Array.from(parsed.warnings) };
  });
}