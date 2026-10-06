import { createScanner, parseTree } from "jsonc-parser";
import type { Node, ParseError, SyntaxKind } from "jsonc-parser";
import { rootNameProblem, TypeScriptNames } from "./naming";
import { JSON_TS_LIMITS } from "./types";
import type {
  JsonTsDeclaration, JsonTsFormat, JsonTsInspection, JsonTsNotice, JsonTsOptions, JsonTsResult,
} from "./types";

// jsonc-parser 3.3.1 uses ambient const enums. Numeric scanner codes (verified
// against the installed dependency in tests) work with isolatedModules too.
const TOKEN = {
  OpenBrace: 1, CloseBrace: 2, OpenBracket: 3, CloseBracket: 4,
  Number: 11, LineComment: 12, BlockComment: 13, LineBreak: 14,
  Whitespace: 15, Unknown: 16, End: 17,
} as const;
const NUMBER_TOKEN = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
const OPTION_KEYS = [
  "rootName", "declarationStyle", "rootMode", "pointer", "optionalProperties", "readonly",
  "exportDeclarations", "stringLiterals", "sortProperties", "indent",
] as const;
const NOTICE = {
  "bom-ignored": "One leading BOM was ignored for JSON parsing; input byte counts still include it.",
  "sample-based": "Types describe these samples, not runtime validation or a complete API contract.",
  "merged-objects": "Objects at the same structural location are merged. Correlations and discriminants are not preserved; this is not tagged-union inference.",
  "empty-array": "Only empty arrays were observed at a location; unknown[] (or ReadonlyArray<unknown>) is used because no element type is known.",
  "empty-object": "Only empty objects were observed at a location; a string index signature with unknown values is used instead of the misleading {} type.",
  "null-only": "Only null was observed at a location; there is no evidence of a non-null type.",
  "string-literals": "String literal types embed source values in the generated code. Observed literals do not establish API enums.",
  "literal-widened": "String literals were widened to string at locations exceeding 20 distinct values or 120 characters per value.",
  "alias-fallback": "The selected root is not solely an object. A type alias preserves its scalar, array or union shape even in interface mode.",
  "module-guard": "export {} keeps non-exported declarations module-scoped, including in .d.ts files, rather than adding globals.",
  "readonly-types": "Readonly applies recursively at compile time; these declarations do not freeze or validate runtime data.",
} as const;
type NoticeCode = keyof typeof NOTICE;

export class JsonTypeScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonTypeScriptError";
  }
}

// Node.value is deliberately unknown. Only decoded string keys/literals are
// read; numeric (including rounded or infinite) parser values are never read.
interface TreeNode {
  readonly type: Node["type"];
  readonly offset: number;
  readonly length: number;
  readonly value?: unknown;
  readonly children?: readonly TreeNode[];
}
interface Source { text: string; start: number }
interface Ref { node: TreeNode; source: Source }
interface Parsed {
  input: string;
  format: JsonTsFormat;
  inputBytes: number;
  roots: Ref[];
  fields: WeakMap<TreeNode, Map<string, TreeNode>>;
  notices: Notices;
  time: TimeBudget;
}
interface Inferred { text: string; union: boolean }

class Notices {
  private readonly entries = new Map<NoticeCode, JsonTsNotice>();

  add(code: NoticeCode): void {
    const entry = this.entries.get(code);
    if (entry) entry.count++;
    else this.entries.set(code, { code, message: NOTICE[code], count: 1 });
  }

  all(): JsonTsNotice[] { return Array.from(this.entries.values()); }
}

class TimeBudget {
  private readonly start = Date.now();

  check(): void {
    if (Date.now() - this.start > JSON_TS_LIMITS.timeoutMs) {
      throw new JsonTypeScriptError("Processing exceeded the 15-second limit. Reduce the input and try again.");
    }
  }
}

function safely<T>(operation: () => T): T {
  try { return operation(); } catch (error: unknown) {
    if (error instanceof JsonTypeScriptError) throw error;
    throw new JsonTypeScriptError("Unable to process this JSON safely. Check the input and TypeScript settings.");
  }
}

function failAt(input: string, offset: number, message: string): never {
  let line = 1, column = 1;
  for (let index = 0; index < Math.min(offset, input.length); index++) {
    const code = input.charCodeAt(index);
    if (code === 13 || code === 10) {
      if (code === 13 && input.charCodeAt(index + 1) === 10 && index + 1 < offset) index++;
      line++;
      column = 1;
    } else column++;
  }
  throw new JsonTypeScriptError(`${message} (line ${line}, column ${column}).`);
}

// TextEncoder-equivalent size without allocating a second copy of input/output.
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

function isPointer(value: unknown): value is string {
  return typeof value === "string" && value.length <= JSON_TS_LIMITS.pointerChars
    && (value === "" || value.startsWith("/")) && !/~(?:[^01]|$)/.test(value);
}

function checkedOptions(value: JsonTsOptions): JsonTsOptions {
  const error = "Invalid TypeScript options. Use the complete supported settings.";
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new JsonTypeScriptError(error);
  const keys = Object.getOwnPropertyNames(value);
  if (keys.length !== OPTION_KEYS.length || keys.some((key) => !(OPTION_KEYS as readonly string[]).includes(key))
    || Object.getOwnPropertySymbols(value).length) throw new JsonTypeScriptError(error);
  const fields = new Map<string, unknown>();
  for (const key of OPTION_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw new JsonTypeScriptError(error);
    fields.set(key, descriptor.value as unknown);
  }
  const rootName = fields.get("rootName"), declarationStyle = fields.get("declarationStyle");
  const rootMode = fields.get("rootMode"), pointer = fields.get("pointer"), optionalProperties = fields.get("optionalProperties");
  const readonly = fields.get("readonly"), exportDeclarations = fields.get("exportDeclarations");
  const stringLiterals = fields.get("stringLiterals"), sortProperties = fields.get("sortProperties"), indent = fields.get("indent");
  if (typeof rootName !== "string" || (declarationStyle !== "interface" && declarationStyle !== "type")
    || (rootMode !== "value" && rootMode !== "array-items") || (optionalProperties !== "inferred" && optionalProperties !== "all")
    || typeof readonly !== "boolean" || typeof exportDeclarations !== "boolean" || typeof stringLiterals !== "boolean"
    || typeof sortProperties !== "boolean" || (indent !== "2" && indent !== "4" && indent !== "tab")) throw new JsonTypeScriptError(error);
  const nameProblem = rootNameProblem(rootName);
  if (nameProblem) throw new JsonTypeScriptError(nameProblem);
  if (!isPointer(pointer)) throw new JsonTypeScriptError("Invalid JSON Pointer. Use RFC 6901 escapes and at most 4,096 characters.");
  return { rootName, declarationStyle, rootMode, pointer, optionalProperties, readonly,
    exportDeclarations, stringLiterals, sortProperties, indent };
}

function sourcesOf(input: string, format: JsonTsFormat, notices: Notices): Source[] {
  if (format === "json") {
    if (input.charCodeAt(0) === 0xfeff) {
      notices.add("bom-ignored");
      return [{ text: input.slice(1), start: 1 }];
    }
    return [{ text: input, start: 0 }];
  }
  if (!input.length) failAt(input, 0, "Enter at least one JSON Lines sample");
  if (input.charCodeAt(0) === 0xfeff) failAt(input, 0, "A BOM is not allowed in JSON Lines");
  const sources: Source[] = [];
  // One final LF terminates a sample; an interior blank or second LF is invalid.
  for (let start = 0; start < input.length;) {
    const newline = input.indexOf("\n", start);
    const end = newline === -1 ? input.length : newline;
    const text = input.slice(start, end);
    if (/^[ \t\r]*$/.test(text)) failAt(input, start, "Blank JSON Lines samples are not allowed");
    if (sources.length >= JSON_TS_LIMITS.samples) failAt(input, start, "JSON Lines exceeds the 10,000-sample limit");
    sources.push({ text, start });
    start = end + 1;
  }
  return sources;
}

function preflight(input: string, sources: readonly Source[], time: TimeBudget): void {
  let tokens = 0;
  // Scan ALL samples before the first recursive parseTree. Punctuation tokens
  // upper-bound AST nodes, including the colon for each property node.
  for (const source of sources) {
    time.check();
    const scanner = createScanner(source.text, false);
    const stack: SyntaxKind[] = [];
    for (let token = scanner.scan(); token !== TOKEN.End; token = scanner.scan()) {
      const offset = source.start + scanner.getTokenOffset();
      if (scanner.getTokenError() !== 0 || token === TOKEN.Unknown) failAt(input, offset, "Invalid JSON token");
      if (token === TOKEN.LineComment || token === TOKEN.BlockComment) failAt(input, offset, "JSON comments are not allowed");
      if (token === TOKEN.Whitespace || token === TOKEN.LineBreak) continue;
      if (++tokens > JSON_TS_LIMITS.tokens) failAt(input, offset, "JSON exceeds the 200,000-token/node limit");
      if ((tokens & 1023) === 0) time.check();
      if (token === TOKEN.Number
        && !NUMBER_TOKEN.test(source.text.slice(scanner.getTokenOffset(), scanner.getTokenOffset() + scanner.getTokenLength()))) {
        failAt(input, offset, "Invalid JSON number");
      }
      if (token === TOKEN.OpenBrace || token === TOKEN.OpenBracket) {
        stack.push(token);
        if (stack.length > JSON_TS_LIMITS.depth) failAt(input, offset, "JSON exceeds the nesting depth limit of 40");
      } else if (token === TOKEN.CloseBrace || token === TOKEN.CloseBracket) {
        if (stack.pop() !== (token === TOKEN.CloseBrace ? TOKEN.OpenBrace : TOKEN.OpenBracket)) failAt(input, offset, "Mismatched JSON brackets");
      }
    }
  }
}

function parseInput(input: string, format: JsonTsFormat): Parsed {
  const time = new TimeBudget();
  if (typeof input !== "string" || (format !== "json" && format !== "jsonl")) throw new JsonTypeScriptError("Provide JSON text and a supported input format.");
  if (input.length > JSON_TS_LIMITS.inputChars) throw new JsonTypeScriptError("Input exceeds 1,000,000 UTF-16 characters.");
  const inputBytes = utf8Bytes(input);
  if (inputBytes > JSON_TS_LIMITS.inputBytes) throw new JsonTypeScriptError("Input exceeds the 2 MiB UTF-8 byte limit.");
  const notices = new Notices();
  const sources = sourcesOf(input, format, notices);
  preflight(input, sources, time);
  const roots: Ref[] = [];
  const fields = new WeakMap<TreeNode, Map<string, TreeNode>>();
  let nodes = 0;
  for (const source of sources) {
    time.check();
    const errors: ParseError[] = [];
    const root: TreeNode | undefined = parseTree(source.text, errors, {
      disallowComments: true, allowTrailingComma: false, allowEmptyContent: false,
    });
    time.check();
    if (errors.length || !root) failAt(input, source.start + (errors[0]?.offset ?? 0), "Invalid strict JSON");
    roots.push({ node: root, source });
    const stack: TreeNode[] = [root];
    while (stack.length) {
      const node = stack.pop()!;
      if (++nodes > JSON_TS_LIMITS.tokens) failAt(input, source.start + node.offset, "JSON exceeds the 200,000-token/node limit");
      if ((nodes & 1023) === 0) time.check();
      if (node.type === "object") {
        const properties = new Map<string, TreeNode>();
        for (const property of node.children ?? []) {
          const keyNode = property.children?.[0], valueNode = property.children?.[1];
          const key = keyNode?.value;
          if (property.type !== "property" || keyNode?.type !== "string" || typeof key !== "string" || !valueNode) throw new Error("Invalid parser tree");
          if (key.length > JSON_TS_LIMITS.keyChars) failAt(input, source.start + keyNode.offset, "An object key exceeds the 1,024-character limit");
          if (properties.has(key)) failAt(input, source.start + keyNode.offset, "Duplicate decoded object keys are not allowed");
          properties.set(key, valueNode);
        }
        fields.set(node, properties);
      }
      if (node.children) for (let index = node.children.length - 1; index >= 0; index--) stack.push(node.children[index]);
    }
  }
  return { input, format, inputBytes, roots, fields, notices, time };
}

function selectValues(parsed: Parsed, options: JsonTsOptions): TreeNode[] {
  const parts = options.pointer === "" ? [] : options.pointer.slice(1).split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  const selected: TreeNode[] = [];
  for (const ref of parsed.roots) {
    let node = ref.node;
    for (const part of parts) {
      let next: TreeNode | undefined;
      if (node.type === "object") next = parsed.fields.get(node)?.get(part);
      else if (node.type === "array" && /^(?:0|[1-9][0-9]*)$/.test(part)) {
        // Exact own canonical indices; no numeric source value or index coercion.
        const descriptor = Object.getOwnPropertyDescriptor(node.children ?? [], part);
        if (descriptor && "value" in descriptor) next = descriptor.value as TreeNode;
      }
      if (!next) failAt(parsed.input, ref.source.start + node.offset, "JSON Pointer does not resolve in every sample");
      node = next;
    }
    if (options.rootMode === "array-items" && node.type !== "array") {
      failAt(parsed.input, ref.source.start + node.offset, "Array-items mode requires an array in every selected sample");
    }
    const values = options.rootMode === "array-items" ? node.children ?? [] : [node];
    if (values.length > JSON_TS_LIMITS.samples - selected.length) failAt(parsed.input, ref.source.start + node.offset, "Selection exceeds the 10,000-value limit");
    for (const value of values) selected.push(value);
    parsed.time.check();
  }
  if (!selected.length) throw new JsonTypeScriptError("No array items were found. Add an item or use Value mode to preserve empty arrays.");
  return selected;
}

function quoted(text: string): string {
  // JSON quoting first. Escape display controls, all surrogate code units (also
  // valid pairs), line separators and HTML-significant characters afterwards.
  const json = JSON.stringify(text);
  let result = "";
  for (let index = 0; index < json.length; index++) {
    const code = json.charCodeAt(index);
    const unsafe = code < 32 || (code >= 127 && code <= 159) || code === 0x061c
      || code === 0x200e || code === 0x200f || (code >= 0x2028 && code <= 0x202e)
      || (code >= 0x2066 && code <= 0x2069) || (code >= 0xd800 && code <= 0xdfff)
      || code === 0xfeff || code === 60 || code === 62 || code === 38;
    result += unsafe ? `\\u${code.toString(16).padStart(4, "0")}` : json[index];
  }
  return result;
}

class Inference {
  readonly declarations: JsonTsDeclaration[] = [];
  readonly stats = { selectedValues: 0, properties: 0, optionalProperties: 0, unions: 0, outputBytes: 0 };
  private readonly names: TypeScriptNames;
  private readonly indent: string;
  private chars: number;

  constructor(private readonly parsed: Parsed, private readonly options: JsonTsOptions) {
    this.names = new TypeScriptNames(options.rootName);
    this.indent = options.indent === "tab" ? "\t" : " ".repeat(options.indent === "4" ? 4 : 2);
    this.chars = 1 + (options.exportDeclarations ? 0 : "export {};\n\n".length);
  }

  private reserve(length: number): void {
    if (length > JSON_TS_LIMITS.outputChars - this.chars) throw new JsonTypeScriptError("Generated code exceeds the 400,000-character limit. Reduce the selected structure or disable string literals.");
    this.chars += length;
  }

  private write(chunks: string[], ...pieces: string[]): void {
    this.reserve(pieces.reduce((sum, piece) => sum + piece.length, 0));
    chunks.push(...pieces);
  }

  private declaration(name: string, kind: "interface" | "type"): JsonTsDeclaration {
    if (this.declarations.length >= JSON_TS_LIMITS.declarations) throw new JsonTypeScriptError("Inference exceeds the 200-declaration limit. Select a smaller subtree.");
    if (this.declarations.length) this.reserve(2);
    const result: JsonTsDeclaration = { name, kind, code: "", properties: [] };
    this.declarations.push(result);
    return result;
  }

  private object(nodes: readonly TreeNode[], name: string): string {
    const declaration = this.declaration(name, this.options.declarationStyle);
    const grouped = new Map<string, TreeNode[]>();
    if (nodes.length > 1) this.parsed.notices.add("merged-objects");
    for (const node of nodes) {
      for (const [key, value] of this.parsed.fields.get(node) ?? []) {
        let observations = grouped.get(key);
        if (!observations) {
          if (++this.stats.properties > JSON_TS_LIMITS.properties) throw new JsonTypeScriptError("Inference exceeds the 2,000-property limit. Select a smaller subtree.");
          observations = [];
          grouped.set(key, observations);
        }
        observations.push(value);
      }
    }
    const chunks: string[] = [];
    this.write(chunks, this.options.exportDeclarations ? "export " : "", declaration.kind, " ", name,
      declaration.kind === "type" ? " = {\n" : " {\n");
    const keys = Array.from(grouped.keys());
    if (this.options.sortProperties) keys.sort();
    for (const key of keys) {
      const values = grouped.get(key)!;
      const type = this.infer(values, this.names.child(name, key));
      const optional = this.options.optionalProperties === "all" || values.length < nodes.length;
      if (optional) this.stats.optionalProperties++;
      declaration.properties.push({ key, type: type.text, optional, present: values.length, total: nodes.length });
      this.write(chunks, this.indent, this.options.readonly ? "readonly " : "",
        /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quoted(key), optional ? "?" : "", ": ", type.text, ";\n");
    }
    if (!keys.length) {
      this.parsed.notices.add("empty-object");
      this.write(chunks, this.indent, this.options.readonly ? "readonly " : "", "[key: string]: unknown;\n");
    }
    this.write(chunks, declaration.kind === "type" ? "};" : "}");
    declaration.code = chunks.join("");
    return name;
  }

  private infer(nodes: readonly TreeNode[], base: string): Inferred {
    this.parsed.time.check();
    const objects: TreeNode[] = [], arrays: TreeNode[] = [];
    let number = false, boolean = false, nullable = false, string = false, widened = false;
    const literals = new Set<string>();
    for (const node of nodes) {
      switch (node.type) {
        case "object": objects.push(node); break;
        case "array": arrays.push(node); break;
        case "number": number = true; break;
        case "boolean": boolean = true; break;
        case "null": nullable = true; break;
        case "string": {
          string = true;
          if (!this.options.stringLiterals || widened) break;
          if (typeof node.value !== "string") throw new Error("Invalid string node");
          if (node.value.length > JSON_TS_LIMITS.literalChars) widened = true;
          else {
            literals.add(node.value);
            widened = literals.size > JSON_TS_LIMITS.literalValues;
          }
          if (widened) literals.clear();
          break;
        }
        default: throw new Error("Unexpected value node");
      }
    }
    const branches: string[] = [];
    if (number) branches.push("number");
    if (string) {
      if (widened) this.parsed.notices.add("literal-widened");
      if (this.options.stringLiterals && !widened) for (const value of literals) branches.push(quoted(value));
      else branches.push("string");
    }
    if (boolean) branches.push("boolean");
    if (objects.length) {
      const proposed = objects.length === nodes.length ? base : this.names.child(base, "Object");
      branches.push(this.object(objects, this.names.allocate(proposed)));
    }
    if (arrays.length) {
      const elements: TreeNode[] = [];
      for (const array of arrays) for (const element of array.children ?? []) elements.push(element);
      let element: Inferred = { text: "unknown", union: false };
      if (elements.length) element = this.infer(elements, this.names.child(base, "Item"));
      else this.parsed.notices.add("empty-array");
      const text = this.options.readonly ? `ReadonlyArray<${element.text}>`
        : element.union ? `(${element.text})[]` : `${element.text}[]`;
      branches.push(text);
    }
    if (nullable) branches.push("null");
    if (!branches.length) throw new Error("Missing observations");
    if (branches.length === 1 && nullable) this.parsed.notices.add("null-only");
    const length = branches.reduce((sum, branch) => sum + branch.length, (branches.length - 1) * 3);
    if (length > JSON_TS_LIMITS.outputChars) throw new JsonTypeScriptError("An inferred type exceeds the 400,000-character output limit. Reduce the selected structure or disable string literals.");
    if (branches.length > 1) this.stats.unions++;
    return { text: branches.join(" | "), union: branches.length > 1 };
  }

  generate(selected: TreeNode[]): JsonTsResult {
    const { options, parsed } = this;
    this.stats.selectedValues = selected.length;
    parsed.notices.add("sample-based");
    if (options.stringLiterals) parsed.notices.add("string-literals");
    if (options.readonly) parsed.notices.add("readonly-types");
    if (!options.exportDeclarations) parsed.notices.add("module-guard");
    if (selected.every((node) => node.type === "object")) this.object(selected, options.rootName);
    else {
      // Reserve the root alias BEFORE allocating any object branch names.
      const root = this.declaration(options.rootName, "type");
      if (options.declarationStyle === "interface") parsed.notices.add("alias-fallback");
      const type = this.infer(selected, options.rootName);
      const chunks: string[] = [];
      this.write(chunks, options.exportDeclarations ? "export " : "", "type ", options.rootName, " = ", type.text, ";");
      root.code = chunks.join("");
    }
    const code = (options.exportDeclarations ? "" : "export {};\n\n")
      + this.declarations.map((declaration) => declaration.code).join("\n\n") + "\n";
    if (code.length !== this.chars) throw new Error("Output budget mismatch");
    this.stats.outputBytes = utf8Bytes(code);
    parsed.time.check();
    return { format: parsed.format, inputBytes: parsed.inputBytes, sampleCount: parsed.roots.length,
      notices: parsed.notices.all(), options, code, rootType: options.rootName, declarations: this.declarations, stats: this.stats };
  }
}

export function inspectTypeScriptJson(input: string, format: JsonTsFormat): JsonTsInspection {
  return safely(() => {
    const parsed = parseInput(input, format);
    return { format: parsed.format, inputBytes: parsed.inputBytes, sampleCount: parsed.roots.length, notices: parsed.notices.all() };
  });
}

export function generateTypeScript(input: string, format: JsonTsFormat, options: JsonTsOptions): JsonTsResult {
  return safely(() => {
    const checked = checkedOptions(options);
    const parsed = parseInput(input, format);
    return new Inference(parsed, checked).generate(selectValues(parsed, checked));
  });
}