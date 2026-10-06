import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

// Only these local modules and the installed parser enter the VM. No app entry
// point, environment file, database, browser, network, or disk output is used.
const require = createRequire(import.meta.url);
const parser = require("jsonc-parser");
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "src", "lib", "json-typescript");
const allowlist = new Set(["types", "naming", "input", "engine", "worker", "samples"]);
const compiled = new Map();
const plain = (value) => JSON.parse(JSON.stringify(value));

function compile(name) {
  assert.ok(allowlist.has(name));
  if (!compiled.has(name)) {
    const output = ts.transpileModule(readFileSync(path.join(directory, `${name}.ts`), "utf8"), {
      fileName: `${name}.ts`, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
        strict: true, isolatedModules: true, esModuleInterop: true },
    });
    assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
    compiled.set(name, output.outputText);
  }
  return compiled.get(name);
}

function loadCore({ parseFailures = 0, scannerFailures = 0, encoderFailure = false } = {}) {
  const blocked = () => { throw new Error("Unexpected environment, network, DOM, or logging access"); };
  const messages = [], dependencies = [];
  const counters = { scans: 0, parses: 0, numericNodes: 0, decodes: 0 };
  const sandbox = {
    TextEncoder: class extends TextEncoder {
      encode(...args) {
        if (encoderFailure) throw new Error("PRIVATE_PAYLOAD encoder-secret");
        return super.encode(...args);
      }
    },
    TextDecoder: class extends TextDecoder {
      decode(...args) { counters.decodes++; return super.decode(...args); }
    },
    postMessage: (message) => messages.push(structuredClone(message)),
  };
  for (const name of ["console", "process", "fetch", "window", "document", "navigator", "location", "Buffer",
    "XMLHttpRequest", "WebSocket", "Worker", "localStorage", "sessionStorage", "indexedDB", "caches",
    "setTimeout", "setInterval", "requestAnimationFrame"]) Object.defineProperty(sandbox, name, { get: blocked });
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const parserAdapter = Object.freeze({
    createScanner: (text, ignoreTrivia) => {
      counters.scans++;
      assert.equal(ignoreTrivia, false);
      if (scannerFailures-- > 0) throw new Error("PRIVATE_PAYLOAD <script>scanner-secret</script>");
      return parser.createScanner(text, ignoreTrivia);
    },
    parseTree: (text, errors, settings) => {
      counters.parses++;
      assert.deepEqual(plain(settings), { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
      if (parseFailures-- > 0) throw new Error("PRIVATE_PAYLOAD <script>parser-secret</script>");
      const ast = parser.parseTree(text, errors, settings);
      const stack = ast ? [ast] : [];
      while (stack.length) {
        const node = stack.pop();
        if (node.type === "number") {
          counters.numericNodes++;
          Object.defineProperty(node, "value", { get() { throw new Error("Numeric node.value must NEVER be read"); } });
        }
        if (node.children) {
          for (const child of node.children) stack.push(child);
          Object.freeze(node.children);
        }
        Object.freeze(node);
      }
      return ast;
    },
  });
  const cache = new Map();
  function load(name) {
    assert.ok(allowlist.has(name), "Only allowlisted JSON-to-TypeScript modules may be loaded");
    if (cache.has(name)) return cache.get(name).exports;
    const moduleRecord = { exports: {} };
    cache.set(name, moduleRecord);
    const wrapper = new vm.Script(`(function(exports, require, module) {\n${compile(name)}\n})`, {
      filename: path.join(directory, `${name}.ts`),
    }).runInContext(context);
    wrapper(moduleRecord.exports, (specifier) => {
      dependencies.push(specifier);
      if (specifier === "jsonc-parser") return parserAdapter;
      assert.match(specifier, /^\.\/(types|naming|input|engine|samples)$/);
      return load(specifier.slice(2));
    }, moduleRecord);
    return moduleRecord.exports;
  }
  return { load, context, messages, counters, dependencies, get engine() { return load("engine"); } };
}

const core = loadCore();
const { engine } = core;
const { DEFAULT_JSON_TS_OPTIONS, JSON_TS_LIMITS } = core.load("types");
const options = (changes = {}) => ({ ...DEFAULT_JSON_TS_OPTIONS, ...changes });
const generate = (input, changes = {}, format = "json") => engine.generateTypeScript(input, format, options(changes));
const inspect = (input, format = "json") => engine.inspectTypeScriptJson(input, format);
const notice = (result, code) => result.notices.find((entry) => entry.code === code);
const property = (result, name, key) => result.declarations.find((entry) => entry.name === name)?.properties.find((entry) => entry.key === key);
const pointerOf = (key) => `/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;

function rejects(operation, pattern = /./, api = engine) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof api.JsonTypeScriptError);
    assert.equal(error.name, "JsonTypeScriptError");
    assert.match(error.message, pattern);
    assert.doesNotMatch(error.message, /PRIVATE_PAYLOAD|<script>|parser-secret|scanner-secret|Numeric node/);
    assert.ok(error.message.length < 300, "Errors must not contain source excerpts");
    return true;
  });
}

function assertOutput(result) {
  assert.equal(result.rootType, result.options.rootName);
  assert.equal(result.declarations[0].name, result.rootType);
  assert.ok(result.declarations.length <= JSON_TS_LIMITS.declarations);
  assert.equal(new Set(result.declarations.map((entry) => entry.name.toLowerCase())).size, result.declarations.length);
  assert.ok(result.declarations.every((entry) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(entry.name) && entry.name.length <= 96));
  assert.equal(result.code, (result.options.exportDeclarations ? "" : "export {};\n\n")
    + result.declarations.map((entry) => entry.code).join("\n\n") + "\n");
  assert.ok(result.code.length <= JSON_TS_LIMITS.outputChars);
  assert.equal(result.stats.outputBytes, Buffer.byteLength(result.code, "utf8"));
  assert.equal(Buffer.from(result.code, "utf8").toString("utf8"), result.code, "Downloads must preserve Unicode exactly");
  const properties = result.declarations.flatMap((entry) => entry.properties);
  assert.equal(result.stats.properties, properties.length);
  assert.equal(result.stats.optionalProperties, properties.filter((entry) => entry.optional).length);
  assert.ok(properties.every((entry) => entry.present > 0 && entry.present <= entry.total));
  assert.ok(result.notices.length <= 11);
  assert.equal(new Set(result.notices.map((entry) => entry.code)).size, result.notices.length);
  assert.ok(result.notices.every((entry) => entry.count > 0 && Number.isSafeInteger(entry.count)));
  assert.deepEqual(plain(structuredClone(result)), plain(result));
  const file = ts.createSourceFile("generated.ts", result.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length, 0);
  let unions = 0, members = 0;
  for (const statement of file.statements) {
    assert.ok(ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)
      || (ts.isExportDeclaration(statement) && statement.exportClause?.elements.length === 0), "Only declarations and a module guard may be emitted");
    if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) continue;
    const declaration = result.declarations.find((entry) => entry.name === statement.name.text);
    assert.ok(declaration);
    const body = ts.isInterfaceDeclaration(statement) ? statement : ts.isTypeLiteralNode(statement.type) ? statement.type : null;
    if (!body) continue;
    for (const member of body.members) {
      assert.ok(ts.isPropertySignature(member) || ts.isIndexSignatureDeclaration(member));
      if (!ts.isPropertySignature(member)) continue;
      const key = member.name.text;
      const meta = declaration.properties.find((entry) => entry.key === key);
      assert.ok(meta, "Every emitted named property must have exact decoded-key metadata");
      assert.equal(!!member.questionToken, meta.optional);
      assert.equal(member.type.getText(file), meta.type);
      assert.equal(!!member.modifiers?.some((item) => item.kind === ts.SyntaxKind.ReadonlyKeyword), result.options.readonly);
    }
  }
  function visit(node) {
    assert.notEqual(node.kind, ts.SyntaxKind.AnyKeyword, "No inferred any type is allowed");
    if (ts.isUnionTypeNode(node)) unions++;
    if (ts.isPropertySignature(node)) members++;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(result.stats.unions, unions, "Union statistics count generated union expressions, not observations");
  assert.equal(result.stats.properties, members);
}

// Real semantic checking, entirely in memory. Only allowlisted core sources,
// the parser declaration, and the installed TS standard libraries can be read.
const canonical = (file) => path.resolve(file).replace(/\\/g, "/").toLowerCase();
const libDirectory = path.dirname(require.resolve("typescript"));
const parserTypes = require.resolve("jsonc-parser").replace(/\.js$/, ".d.ts");
const coreFiles = Array.from(allowlist, (name) => path.join(directory, `${name}.ts`));
const diskAllowlist = new Set([...coreFiles, parserTypes].map(canonical));
const libCache = new Map();
const diagnosticHost = { getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => "\n" };

function programFor(files, { libs = ["lib.esnext.d.ts"], coreSources = false } = {}) {
  const memory = new Map(Array.from(files, ([file, text]) => [canonical(file), text]));
  const settings = { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, lib: libs, types: [], strict: true,
    exactOptionalPropertyTypes: true, isolatedModules: true, noEmit: true,
    incremental: false, skipLibCheck: false, esModuleInterop: true };
  const host = ts.createCompilerHost(settings, true);
  const isLib = (file) => canonical(path.dirname(file)) === canonical(libDirectory) && /^lib\..+\.d\.ts$/i.test(path.basename(file));
  host.getCurrentDirectory = () => root;
  host.writeFile = () => { throw new Error("The test compiler must never write files"); };
  host.readFile = (file) => {
    const key = canonical(file);
    if (memory.has(key)) return memory.get(key);
    if (!isLib(file) && !(coreSources && diskAllowlist.has(key))) return undefined;
    try { return readFileSync(file, "utf8"); } catch { return undefined; }
  };
  host.fileExists = (file) => host.readFile(file) !== undefined;
  host.getSourceFile = (file, languageVersion) => {
    const key = canonical(file);
    if (isLib(file) && libCache.has(key)) return libCache.get(key);
    const text = host.readFile(file);
    if (text === undefined) return undefined;
    const source = ts.createSourceFile(file, text, languageVersion, true);
    if (isLib(file)) libCache.set(key, source);
    return source;
  };
  host.resolveModuleNames = (names, containingFile) => names.map((name) => {
    if (name === "jsonc-parser" && coreSources) return { resolvedFileName: parserTypes, extension: ts.Extension.Dts, isExternalLibraryImport: true };
    if (!name.startsWith("./")) return undefined;
    const stem = path.resolve(path.dirname(containingFile), name);
    for (const extension of [ts.Extension.Ts, ts.Extension.Dts]) {
      if (host.fileExists(stem + extension)) return { resolvedFileName: stem + extension, extension };
    }
    return undefined;
  });
  return ts.createProgram(Array.from(files.keys()), settings, host);
}

const fixtures = [];
const typeChecks = `
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
`;
function checkTypes(result, samples = [], checks = "") {
  assertOutput(result);
  fixtures.push({ result, checks: typeChecks + samples.map((sample, index) => `const sample${index}: ${result.rootType} = ${sample};\nvoid sample${index};`).join("\n") + "\n" + checks });
  return result;
}
const expression = (value) => JSON.stringify(value).replace(/[\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

test("exact public contracts and installed scanner codes", () => {
  assert.deepEqual(Object.keys(engine).sort(), ["JsonTypeScriptError", "generateTypeScript", "inspectTypeScriptJson"]);
  assert.deepEqual(Object.keys(core.load("input")).sort(), ["formatBytes", "inputSizeProblem", "readTypeScriptJsonFile", "typeScriptDownloadDetails"]);
  assert.equal(require("jsonc-parser/package.json").version, "3.3.1");
  assert.deepEqual([parser.SyntaxKind.OpenBraceToken, parser.SyntaxKind.CloseBraceToken, parser.SyntaxKind.OpenBracketToken,
    parser.SyntaxKind.CloseBracketToken, parser.SyntaxKind.NumericLiteral, parser.SyntaxKind.LineCommentTrivia,
    parser.SyntaxKind.BlockCommentTrivia, parser.SyntaxKind.LineBreakTrivia, parser.SyntaxKind.Trivia,
    parser.SyntaxKind.Unknown, parser.SyntaxKind.EOF, parser.ScanError.None], [1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 0]);
});

test("UI naming and file helpers load without the parser; the VM blocks ambient capabilities", () => {
  const isolated = loadCore();
  isolated.load("naming"); isolated.load("input"); isolated.load("samples");
  assert.equal(isolated.dependencies.includes("jsonc-parser"), false);
  for (const code of ["process", "fetch", "document", "console", "localStorage", "setTimeout", "eval('1')", "Function('return 1')()"])
    assert.throws(() => vm.runInContext(code, isolated.context));
  assert.throws(() => isolated.load("../ai"));
});

for (const [name, libs] of [["DOM", ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]],
  ["worker", ["lib.esnext.d.ts", "lib.webworker.d.ts"]]]) {
  test(`all new core modules pass strict no-emit with separate ${name} libraries`, () => {
    const program = programFor(new Map(coreFiles.map((file) => [file, readFileSync(file, "utf8")])), { libs, coreSources: true });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, diagnosticHost));
    assert.deepEqual(program.getSourceFiles().filter((file) => !file.isDeclarationFile).map((file) => path.basename(file.fileName)).sort(),
      ["engine.ts", "input.ts", "naming.ts", "samples.ts", "types.ts", "worker.ts"]);
  });
}

test("the in-memory compiler checks semantic errors and exact optional properties", () => {
  const file = path.join(root, "__synthetic_json_ts__", "negative-oracle.ts");
  const program = programFor(new Map([[file, "export {}; const a: string = 42; const b: { x?: number } = { x: undefined }; void a; void b;"]]));
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.ok(diagnostics.some((entry) => entry.code === 2322));
  assert.ok(diagnostics.some((entry) => entry.code === 2375));
  assert.ok(program.getSourceFiles().some((entry) => /lib\.es5\.d\.ts$/.test(entry.fileName)));
  assert.equal(program.getCompilerOptions().skipLibCheck, false);
});

test("single objects retain exact keys, first-seen order and required property metadata", () => {
  const input = '{"10":"ten","2":"two","id":1,"active":true}';
  const result = checkTypes(generate(input), [input], `type Check = Expect<Equal<Root, { "10": string; "2": string; id: number; active: boolean }>>;`);
  assert.deepEqual(Array.from(result.declarations[0].properties, (entry) => entry.key), ["10", "2", "id", "active"]);
  assert.equal(result.stats.selectedValues, 1);
  assert.equal(result.sampleCount, 1);
  assert.equal(result.stats.optionalProperties, 0);
  assert.equal(result.stats.unions, 0);
});

test("root arrays have a named root alias and merge ALL records, missing fields and null", () => {
  const input = '[{"id":1,"email":"demo@example.invalid"},{"id":"two","email":null},{"id":3}]';
  const result = checkTypes(generate(input), [input], `
    type Item = Root[number];
    type Id = Expect<Equal<Item["id"], number | string>>;
    type Email = Expect<Equal<Item["email"], string | null | undefined>>;
    type Missing = Expect<Equal<OptionalKeys<Item>, "email">>;
    // @ts-expect-error Required identifiers cannot be omitted.
    const bad: Root = [{}]; void bad;
  `);
  assert.equal(result.declarations[0].code, "export type Root = RootItem[];");
  assert.deepEqual(plain(property(result, "RootItem", "email")), { key: "email", type: "string | null", optional: true, present: 2, total: 3 });
  assert.equal(result.stats.selectedValues, 1);
  assert.ok(notice(result, "alias-fallback"));
  assert.match(notice(result, "merged-objects").message, /Correlations and discriminants.*not.*tagged-union/);
});

test("JSONL samples merge the same root directly and count only containing objects for optionality", () => {
  const input = '{"id":1,"extra":null}\nnull\n7\n{"id":"two"}\n';
  const result = checkTypes(generate(input, {}, "jsonl"), ['{"id":1,"extra":null}', "null", "7", '{"id":"two"}'], `
    type ObjectBranch = Extract<Root, { id: unknown }>;
    type RequiredId = Expect<Equal<OptionalKeys<ObjectBranch>, "extra">>;
    type Mixed = Expect<Equal<Root, number | RootObject | null>>;
  `);
  assert.equal(result.sampleCount, 4);
  assert.equal(result.stats.selectedValues, 4);
  assert.equal(property(result, "RootObject", "id").total, 2);
  assert.equal(property(result, "RootObject", "id").optional, false);
  assert.equal(property(result, "RootObject", "extra").present, 1);
  assert.doesNotMatch(result.code, /RootItem/);
});

test("nested optionality is local to object observations, not parent records or non-object branches", () => {
  const input = '[{"profile":{"name":"Mira","age":1},"items":[{"a":1}]},{"profile":{"name":"Rowan"},"items":[{"b":true}]},{"profile":null,"items":[]},{}]';
  const result = checkTypes(generate(input, { rootMode: "array-items" }), JSON.parse(input).map(expression), `
    type Profile = NonNullable<Root["profile"]>;
    type Names = Expect<Equal<Profile["name"], string>>;
    type Missing = Expect<Equal<OptionalKeys<Profile>, "age">>;
    type Item = NonNullable<Root["items"]>[number];
    type ItemKeys = Expect<Equal<OptionalKeys<Item>, "a" | "b">>;
  `);
  const profileName = property(result, "Root", "profile").type.split(" | ")[0];
  assert.equal(property(result, profileName, "name").present, 2);
  assert.equal(property(result, profileName, "name").total, 2);
  assert.equal(property(result, "Root", "profile").total, 4);
  assert.equal(notice(result, "empty-array"), undefined, "Empty arrays add no constraint when another array has elements");
});

test("null does not make a present property optional, and null-only roots remain null", () => {
  checkTypes(generate('{"value":null}'), ['{"value":null}'], `
    type NullValue = Expect<Equal<Root["value"], null>>;
    type Required = Expect<Equal<OptionalKeys<Root>, never>>;
    // @ts-expect-error null is not missing.
    const bad: Root = {}; void bad;
  `);
  const result = checkTypes(generate("null"), ["null"], "type NullRoot = Expect<Equal<Root, null>>;");
  assert.equal(notice(result, "null-only").count, 1);
});

test("all scalar root kinds widen correctly without changing the chosen root name", () => {
  for (const [input, expected] of [['"2026-10-05T12:00:00Z"', "string"], ["true", "boolean"], ["false", "boolean"],
    ["0", "number"], ["-0", "number"], ["-2.375e+4", "number"], ["9123372036854000123", "number"], ["1e999", "number"]]) {
    const result = checkTypes(generate(input, { rootName: "SelectedValue" }), [input], `type Scalar = Expect<Equal<SelectedValue, ${expected}>>;`);
    assert.equal(result.code, `export type SelectedValue = ${expected};\n`);
    assert.equal(result.declarations[0].kind, "type");
    assert.ok(notice(result, "alias-fallback"));
  }
});

test("numeric AST values are unreadable and input values never undergo Number/parseFloat/parseInt coercion", () => {
  const isolated = loadCore();
  isolated.context.api = isolated.engine;
  isolated.context.settings = options();
  vm.runInContext(`
    const OriginalNumber = Number;
    Number = new Proxy(OriginalNumber, { apply() { throw new Error("Numeric coercion forbidden"); } });
    parseInt = parseFloat = () => { throw new Error("Numeric parsing forbidden"); };
  `, isolated.context);
  const result = vm.runInContext('api.generateTypeScript("[9123372036854000123,2.370,1e999,1e-999,-1,-0]", "json", settings)', isolated.context);
  assert.equal(isolated.counters.numericNodes, 6);
  assert.equal(result.code, "export type Root = number[];\n");
  assertOutput(result);
});

test("nested arrays merge all corresponding element observations without adding unknown from empties", () => {
  const input = '[[],[1,"two"],[],[true,null],[{"x":1},{}]]';
  checkTypes(generate(input), [input], `
    type Element = Root[number][number];
    type Branches = Expect<Equal<Element, number | string | boolean | RootItemItemObject | null>>;
    type NestedMissing = Expect<Equal<OptionalKeys<RootItemItemObject>, "x">>;
  `);
  const result = generate('[{"list":[]},{"list":[1]},{"list":["x"]}]');
  assert.equal(property(result, "RootItem", "list").type, "(number | string)[]");
  assert.equal(notice(result, "empty-array"), undefined);
});

test("empty-only arrays infer unknown[] without weakening mixed scalar branches", () => {
  const result = checkTypes(generate("[]"), ["[]"], "type Empty = Expect<Equal<Root, unknown[]>>;");
  assert.equal(notice(result, "empty-array").count, 1);
  const mixed = checkTypes(generate('[]\n1\nnull', {}, "jsonl"), ["[]", "1", "null"], "type EmptyMixed = Expect<Equal<Root, unknown[] | number | null>>;");
  assert.equal(notice(mixed, "empty-array").count, 1);
  checkTypes(generate("[[],[]]"), ["[[],[]]"], "type DeepEmpty = Expect<Equal<Root, unknown[][]>>;");
});

test("empty-only objects use an unknown index signature, while {} plus fields makes those fields optional", () => {
  const result = checkTypes(generate("{}"), ["{}"], `
    type EmptyValue = Expect<Equal<Root[string], unknown>>;
    // @ts-expect-error Empty object observations do not imply a primitive type.
    const bad: Root = 1; void bad;
  `);
  assert.equal(result.stats.properties, 0);
  assert.match(result.code, /\[key: string\]: unknown/);
  assert.equal(notice(result, "empty-object").count, 1);
  const merged = checkTypes(generate('[{}, {"x":1}]', { rootMode: "array-items" }), ["{}", '{"x":1}'], "type EmptyPlus = Expect<Equal<Root, { x?: number }>>;");
  assert.equal(notice(merged, "empty-object"), undefined);
  checkTypes(generate('{}\n0\nnull', {}, "jsonl"), ["{}", "0", "null"], "type ObjectMixed = Expect<Equal<Root, RootObject | number | null>>;");
});

test("mixed objects, primitives, arrays, empty arrays and null keep every observed branch", () => {
  const input = '[{"id":1},{"id":"x","extra":true},7,"x",false,null,[],[1,"a"],[{}]]';
  const result = checkTypes(generate(input, { rootMode: "array-items" }), JSON.parse(input).map(expression), `
    type Expected = number | string | boolean | RootObject | (number | string | RootItemObject)[] | null;
    type Mixed = Expect<Equal<Root, Expected>>;
  `);
  assert.equal(result.stats.selectedValues, 9);
  assert.equal(property(result, "RootObject", "id").total, 2);
  assert.equal(notice(result, "empty-array"), undefined);
});

test("default string inference never copies values, numeric spellings, dates or executable text into code", () => {
  const value = '</script><script>globalThis.compromised = true</script>"; export const x = 1;';
  const result = checkTypes(generate(JSON.stringify({ value, date: "2026-10-05", numeric: "001", flag: true })),
    [expression({ value, date: "2026-10-05", numeric: "001", flag: true })], `type Strings = Expect<Equal<Root["value" | "date" | "numeric"], string>>;`);
  assert.doesNotMatch(result.code, /compromised|script|2026|001|Date|BigInt/);
  assert.equal(vm.runInContext("globalThis.compromised", core.context), undefined);
});

test("bounded string literals retain 20 distinct values and 120 UTF-16 characters exactly", () => {
  const values = Array.from({ length: 20 }, (_, index) => `state-${index}`);
  const result = checkTypes(generate(JSON.stringify(values), { rootMode: "array-items", stringLiterals: true }), values.map(expression),
    `type Literals = Expect<Equal<Root, ${values.map(expression).join(" | ")}>>;`);
  assert.equal(result.stats.unions, 1);
  assert.match(notice(result, "string-literals").message, /embed source values.*do not establish API enums/);
  assert.equal(notice(result, "literal-widened"), undefined);
  const long = "x".repeat(120);
  checkTypes(generate(JSON.stringify(long), { stringLiterals: true }), [expression(long)], `type Long = Expect<Equal<Root, ${expression(long)}>>;`);
});

test("literal bounds widen once per location without discarding number, null or later observations", () => {
  for (const values of [Array.from({ length: 21 }, (_, index) => `value-${index}`), ["x", "q".repeat(121), "y"]]) {
    const result = checkTypes(generate(JSON.stringify([...values, 1, null]), { stringLiterals: true, rootMode: "array-items" }),
      [...values, 1, null].map(expression), "type Widened = Expect<Equal<Root, string | number | null>>;");
    assert.equal(notice(result, "literal-widened").count, 1);
    assert.doesNotMatch(result.code, /value-0|qqqq|"x"/);
  }
  const duplicate = generate(JSON.stringify(Array(100).fill("same")), { stringLiterals: true });
  assert.equal(duplicate.code, 'export type Root = "same"[];\n');
  assert.equal(notice(duplicate, "literal-widened"), undefined);
});

test("literal escaping preserves values but cannot create declarations, HTML, controls or evaluation", () => {
  const values = ['</script>"; export const hacked = 1; //', "\u0000\u0001\t\r\n\u007f\u0085", "\u061c\u200e\u200f\u2028\u2029\u202e\u2066\u2069", "\ud800", "\udfff", "😀", "<>&", "\\u202e"];
  const result = checkTypes(generate(JSON.stringify(values), { rootMode: "array-items", stringLiterals: true }), values.map(expression));
  const file = ts.createSourceFile("literals.ts", result.code, ts.ScriptTarget.Latest, true);
  assert.deepEqual(file.statements[0].type.types.map((node) => node.literal.text), values);
  for (const node of file.statements[0].type.types) {
    const text = node.getText(file);
    assert.ok(!/[<>&\u007f\u0085\u061c\u200e\u200f\u2028\u2029\u202e\u2066\u2069\ud800-\udfff]/.test(text));
  }
  assert.equal(vm.runInContext("globalThis.hacked", core.context), undefined);
});

test("readonly is recursive for every property, array level and empty-object index signature", () => {
  const input = '{"rows":[{"flags":[[true]],"meta":{}}]}';
  const result = checkTypes(generate(input, { readonly: true }), [input], `
    declare const root: Root;
    type Flags = Expect<Equal<Root["rows"][number]["flags"], ReadonlyArray<ReadonlyArray<boolean>>>>;
    // @ts-expect-error Root properties are readonly.
    root.rows = [];
    // @ts-expect-error Nested arrays are readonly.
    root.rows[0].flags[0].push(true);
    // @ts-expect-error Empty object index signatures are readonly too.
    root.rows[0].meta["new"] = 1;
  `);
  assert.ok(notice(result, "readonly-types"));
  assert.match(result.code, /readonly \[key: string\]: unknown/);
  checkTypes(generate("[[1]]", { readonly: true }), ["[[1]]"], "type ReadonlyRoot = Expect<Equal<Root, ReadonlyArray<ReadonlyArray<number>>>>;");
});

test("all-optional mode changes flags, not observation counts or explicit undefined types", () => {
  const result = checkTypes(generate('{"id":1,"meta":{"active":true}}', { optionalProperties: "all" }), ["{}", '{"id":1,"meta":{}}'], `
    type Optional = Expect<Equal<OptionalKeys<Root>, "id" | "meta">>;
    // @ts-expect-error exactOptionalPropertyTypes forbids explicit undefined here.
    const bad: Root = { id: undefined }; void bad;
  `);
  assert.deepEqual(plain(property(result, "Root", "id")), { key: "id", type: "number", optional: true, present: 1, total: 1 });
  assert.equal(result.stats.optionalProperties, 3);
  assert.doesNotMatch(result.code, /undefined/);
});

test("type style applies to nested objects; interface fallback is only for non-object roots", () => {
  const input = '{"nested":{"id":1},"list":[{"active":true}]}';
  const result = checkTypes(generate(input, { declarationStyle: "type" }), [input]);
  assert.ok(result.declarations.every((entry) => entry.kind === "type"));
  assert.equal(notice(result, "alias-fallback"), undefined);
  assert.equal(notice(generate("1", { declarationStyle: "type" }), "alias-fallback"), undefined);
  assert.equal(notice(generate(input), "alias-fallback"), undefined);
});

test("disabling exports adds a module guard for both .ts and .d.ts, including scalar and array roots", () => {
  for (const input of ['{"x":{"id":1}}', "3", "[true,null]"]) {
    const result = checkTypes(generate(input, { exportDeclarations: false }), [input]);
    assert.match(result.code, /^export \{\};\n\n/);
    assert.doesNotMatch(result.code, /export (?:type|interface)/);
    assert.ok(notice(result, "module-guard"));
  }
});

test("sorting is opt-in, indentation is exact and generation does not mutate frozen settings", () => {
  const input = '{"z":{"b":true,"a":1},"a":null}';
  for (const indent of ["2", "4", "tab"]) for (const sortProperties of [false, true]) {
    const frozen = Object.freeze(options({ indent, sortProperties }));
    const result = checkTypes(engine.generateTypeScript(input, "json", frozen), [input]);
    assert.deepEqual(Array.from(result.declarations[0].properties, (entry) => entry.key), sortProperties ? ["a", "z"] : ["z", "a"]);
    const padding = indent === "tab" ? "\t" : " ".repeat(Number(indent));
    for (const line of result.code.split("\n").filter((line) => /;\s*$/.test(line))) assert.ok(line.startsWith(padding));
    assert.notEqual(result.options, frozen);
    assert.deepEqual(plain(result.options), frozen);
  }
});

test("RFC 6901 selection is explicit and applied independently to every JSONL sample", () => {
  const input = '{"a/b":{"~key":[{"id":1}]}}\n{"a/b":{"~key":[{"id":"x","more":null}]}}\n';
  const result = checkTypes(generate(input, { pointer: "/a~1b/~0key/0" }, "jsonl"), ['{"id":1}', '{"id":"x","more":null}'],
    "type Selected = Expect<Equal<Root, { id: number | string; more?: null }>>;");
  assert.equal(result.stats.selectedValues, 2);
  assert.equal(result.sampleCount, 2);
  checkTypes(generate('{"~1":true,"":7}', { pointer: "/~01" }), ["true"], "type EscapeOrder = Expect<Equal<Root, boolean>>;");
  checkTypes(generate('{"":7}', { pointer: "/" }), ["7"], "type EmptyKey = Expect<Equal<Root, number>>;");
  assert.equal(generate('{"wrapper":{"items":[1]}}').declarations[0].kind, "interface", "Never guess an API wrapper");
});

test("array pointer indexes must be canonical own indexes, while object keys stay exact", () => {
  for (const index of ["01", "-0", "-1", "+0", "1.0", "1e0", "-", "length", "constructor", "toString", "9007199254740993", "1"]) {
    rejects(() => generate("[7]", { pointer: `/${index}` }), /does not resolve/);
  }
  checkTypes(generate('{"01":"x","__proto__":{"toString":true}}', { pointer: "/01" }), ['"x"']);
  checkTypes(generate('{"__proto__":{"toString":true}}', { pointer: "/__proto__/toString" }), ["true"]);
});

test("invalid or missing pointers fail wholly, including a missing path in a later sample", () => {
  for (const pointer of ["x", "#", "#/x", "/~", "/~2", "/x~1~", "/" + "x".repeat(4096)]) rejects(() => generate("{}", { pointer }), /JSON Pointer/);
  rejects(() => generate('{"x":1}\n{}', { pointer: "/x" }, "jsonl"), /every sample \(line 2, column 1\)/);
  rejects(() => generate('{"x":null}', { pointer: "/x/y" }), /does not resolve/);
  const key = "x".repeat(1023);
  const input = JSON.stringify({ [key]: { [key]: { [key]: { [key]: 1 } } } });
  checkTypes(generate(input, { pointer: pointerOf(key).repeat(4) }), ["1"], "type MaxPointer = Expect<Equal<Root, number>>;");
});

test("array-items mode consumes only direct elements and tolerates individual empty arrays", () => {
  const input = '{"items":[]}\n{"items":[[1],["x"]]}\n{"items":[]}';
  const result = checkTypes(generate(input, { rootMode: "array-items", pointer: "/items" }, "jsonl"), ["[1]", '["x"]'],
    "type ItemArrays = Expect<Equal<Root, (number | string)[]>>;");
  assert.equal(result.stats.selectedValues, 2);
  assert.equal(result.sampleCount, 3);
  rejects(() => generate('[]\n{}', { rootMode: "array-items" }, "jsonl"), /requires an array.*line 2/);
  rejects(() => generate("null", { rootMode: "array-items" }), /requires an array/);
});

test("no array elements is a helpful generation error, not an invented unknown observation", () => {
  for (const [input, format] of [["[]", "json"], ["[]\n[]\n", "jsonl"]]) {
    assert.ok(inspect(input, format).sampleCount > 0);
    rejects(() => generate(input, { rootMode: "array-items" }, format), /No array items.*Value mode/);
  }
});

test("strict JSON Lines accepts independent scalar/object/array values and a single LF or CRLF terminator", () => {
  for (const input of ['{}\n[]\n"x"\ntrue\n1\nnull', '{}\n[]\n"x"\ntrue\n1\nnull\n', '{}\r\n[]\r\n"x"\r\ntrue\r\n1\r\nnull\r\n']) {
    assert.equal(inspect(input, "jsonl").sampleCount, 6);
    assertOutput(generate(input, {}, "jsonl"));
  }
  assert.equal(inspect(' { "x" : 1 } \n', "jsonl").sampleCount, 1);
});

test("interior or repeated final blank JSONL lines and multiline values are rejected", () => {
  for (const input of ["", "\n", " \t\r\n", "\n{}", "{}\n\n{}", "{}\n\n", "{}\n \t\r\n", '{\n"x":1\n}', "{} []\n"]) {
    rejects(() => inspect(input, "jsonl"), /JSON|sample/);
  }
  rejects(() => inspect("{}\r\n\r\n", "jsonl"), /line 2, column 1/);
});

test("one leading JSON BOM is noticed and counted; JSONL and repeated JSON BOMs reject", () => {
  const result = checkTypes(generate('\ufeff{"id":1}'), ['{"id":1}']);
  assert.equal(result.inputBytes, Buffer.byteLength('\ufeff{"id":1}', "utf8"));
  assert.equal(notice(result, "bom-ignored").count, 1);
  assert.equal(notice(inspect("\ufefftrue"), "bom-ignored").count, 1);
  rejects(() => inspect("\ufeff{}", "jsonl"), /BOM.*line 1, column 1/);
  for (const input of ["\ufeff\ufeff{}", " \ufeff{}", "{}\ufeff"]) rejects(() => inspect(input), /JSON/);
});

test("strict syntax rejects comments, trailing commas, malformed strings and non-JSON whitespace", () => {
  for (const input of ["", " \t\r\n", "{", "[", "}", "null true", "{}{}", "[1,,2]", '{"a":}', '{"a" 1}',
    '{"a":1,}', "[1,]", "/* PRIVATE_PAYLOAD */{}", "{}//comment", '{"a":/*x*/1}',
    '"\\x20"', '"\\u12xx"', '"raw\nline"', '"raw\u0000zero"', '\u00a0{}', "\u2003{}", "{]", "[}"]) {
    rejects(() => inspect(input), /JSON/);
    rejects(() => generate(input), /JSON/);
  }
  checkTypes(generate('{"comment":"/* data */","url":"https://example.invalid/"}'), ['{"comment":"/* data */","url":"https://example.invalid/"}']);
  rejects(() => inspect('{\n  "id": 1,\n  "PRIVATE_PAYLOAD": ]\n}'), /line 3, column 22/);
});

test("malformed numeric tokens reject instead of being coerced into JavaScript numbers", () => {
  for (const token of ["01", "-01", "+1", "1.", "1e", "1e+", "1e-", "--1", "NaN", "Infinity", "-Infinity", "0x10", ".1", "1_000", "-.5"]) {
    rejects(() => inspect(token), /JSON/);
    rejects(() => generate(`{"n":${token}}`), /JSON/);
  }
  assertOutput(generate("[-1.20E+003,0.000,1e999]"));
});

test("decoded duplicate keys reject everywhere, before selecting an otherwise valid subtree", () => {
  for (const input of ['{"a":1,"a":1}', '{"a":1,"\\u0061":2}', '{"__proto__":1,"__pro\\u0074o__":2}',
    '{"constructor":0,"constructor":1}', '{"ok":1,"hidden":[{"deep":{"x":true,"x":false}}]}']) {
    rejects(() => inspect(input), /Duplicate decoded/);
    rejects(() => generate(input, { pointer: "/ok" }), /Duplicate decoded/);
  }
  rejects(() => generate('{"ok":1,"hidden":[1,]}', { pointer: "/ok" }), /Invalid strict JSON/);
});

test("root identifiers reject reserved words/types, invalid ASCII and blank names without silently renaming", () => {
  const { rootNameProblem } = core.load("naming");
  for (let kind = ts.SyntaxKind.FirstKeyword; kind <= ts.SyntaxKind.LastKeyword; kind++) {
    const keyword = ts.tokenToString(kind);
    if (keyword) assert.equal(typeof rootNameProblem(keyword), "string", `Reject the installed TypeScript keyword: ${keyword}`);
  }
  for (const name of ["", " ", "1Root", "a-b", "é", "Root\n", "Root.Type", "x".repeat(65), "class", "type", "interface", "string", "number", "null",
    "any", "unknown", "never", "undefined", "readonly", "keyof", "infer", "Array", "ReadonlyArray", "Record", "Partial", "Promise", "Object", "Date"]) {
    assert.equal(typeof rootNameProblem(name), "string");
    rejects(() => generate("1", { rootName: name }));
  }
  for (const name of ["Root", "foo", "FOO", "_", "$", "_Name9", "$Result", "x".repeat(64)]) {
    assert.equal(rootNameProblem(name), null);
    checkTypes(generate("1", { rootName: name }), ["1"]);
  }
  assert.equal(rootNameProblem(null), "Enter a root type name.");
});

test("global naming keeps sanitized, case-folded, Unicode and unrelated paths distinct", () => {
  const input = '{"foo":{"value":1},"Foo":{"value":"x"},"a-b":{"x":1},"a b":{"x":true},"a\\\"b":{"x":null},"漢":{"x":1},"字":{"x":1},"":{"x":1},"billing":{"address":{"zip":1}},"shipping":{"address":{"zip":1}}}';
  const result = checkTypes(generate(input), [input]);
  const children = result.declarations[0].properties.map((entry) => entry.type);
  assert.equal(new Set(children.map((name) => name.toLowerCase())).size, children.length);
  const billing = property(result, property(result, "Root", "billing").type, "address").type;
  const shipping = property(result, property(result, "Root", "shipping").type, "address").type;
  assert.notEqual(billing, shipping, "Unrelated paths are not deduplicated just because keys or shapes match");
});

test("mixed roots reserve aliases before object branches and do not create circular root references", () => {
  for (const rootName of ["Root", "RootObject", "foo", "x".repeat(64)]) {
    const result = checkTypes(generate('{"Object":{"id":1}}\n0\n[{"Item":true}]', { rootName }, "jsonl"), ['{"Object":{"id":1}}', "0", '[{"Item":true}]']);
    assert.equal(result.declarations[0].kind, "type");
    const rootFile = ts.createSourceFile("alias.ts", result.declarations[0].code, ts.ScriptTarget.Latest, true);
    const references = [];
    function walk(node) { if (ts.isTypeReferenceNode(node)) references.push(node.typeName.getText(rootFile)); ts.forEachChild(node, walk); }
    walk(rootFile);
    assert.ok(!references.includes(rootName));
  }
});

test("deep repeated and truncated paths remain valid, bounded and globally unique", () => {
  const key = "a".repeat(1024);
  let value = {};
  for (let depth = 0; depth < 39; depth++) value = { [key]: value };
  const input = JSON.stringify(value);
  const result = checkTypes(generate(input, { rootName: "Root" + "X".repeat(60) }), [input]);
  assert.equal(result.declarations.length, 40);
  assert.ok(result.declarations.slice(1).every((entry) => entry.name.length <= 96));
  assert.equal(result.stats.properties, 39);
});

test("escaped/prototype-sensitive keys preserve decoded text without pollution or unsafe literal bytes", () => {
  const keys = ["__proto__", "constructor", "toString", "prototype", "", "1", "a-b", 'a"b', "a\\b", "line\nkey", "\u0000", "\u007f",
    "\u061c", "\u200e", "\u2028", "\u2029", "\u202e", "\u2066", "\u2069", "\ud800", "\udfff", "😀", "<>&", "漢字", "\ufeff"];
  const value = Object.fromEntries(keys.map((key) => [key, 1]));
  const input = JSON.stringify(value);
  const result = checkTypes(generate(input), [expression(value)]);
  assert.deepEqual(new Set(result.declarations[0].properties.map((entry) => entry.key)), new Set(keys));
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(vm.runInContext("Object.prototype.polluted", core.context), undefined);
  assert.doesNotMatch(result.code, /[<>&\u007f\u061c\u200e\u2028\u2029\u202e\u2066\u2069\ud800-\udfff]/);
  checkTypes(generate('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":1}}}'),
    ['{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":1}}}']);
});

test("settings require exact own data properties, not getters, inherited fields, symbols or coercions", () => {
  let called = 0;
  const getter = options();
  Object.defineProperty(getter, "rootName", { get() { called++; throw new Error("PRIVATE_PAYLOAD"); } });
  const inherited = Object.create(options());
  const missing = options(); delete missing.indent;
  const extra = { ...options(), [Symbol("PRIVATE_PAYLOAD")]: true };
  for (const settings of [null, [], {}, getter, inherited, missing, extra, { ...options(), unknown: true },
    ...[{ rootName: 1 }, { declarationStyle: "class" }, { rootMode: "auto" }, { pointer: null }, { optionalProperties: true },
      { readonly: "true" }, { exportDeclarations: 0 }, { stringLiterals: [] }, { sortProperties: {} }, { indent: 2 }].map(options)]) {
    rejects(() => engine.generateTypeScript("{}", "json", settings));
  }
  const proxy = new Proxy(options(), { ownKeys() { throw new Error("PRIVATE_PAYLOAD"); } });
  rejects(() => engine.generateTypeScript("{}", "json", proxy), /Unable to process/);
  assert.equal(called, 0);
  rejects(() => engine.generateTypeScript({}, "json", options()), /Provide JSON text/);
  rejects(() => inspect("{}", "ndjson"), /supported input format/);
});

test("inspection and generation are stateless and do not keep previous names, input or settings", () => {
  const first = generate('{"a-b":{},"a b":{}}');
  rejects(() => generate('{"x":}'));
  const inspected = inspect('[{"new":true}]');
  assert.deepEqual(Object.keys(inspected).sort(), ["format", "inputBytes", "notices", "sampleCount"]);
  assert.deepEqual(plain(generate('{"a-b":{},"a b":{}}')), plain(first));
  const settings = options({ rootName: "Stable" });
  const result = engine.generateTypeScript("1", "json", settings);
  settings.rootName = "Changed";
  assert.equal(result.options.rootName, "Stable");
});

test("input UTF-16 and UTF-8 limits are enforced before scanning with exact boundaries", () => {
  const isolated = loadCore();
  rejects(() => isolated.engine.inspectTypeScriptJson(`"${"a".repeat(999_999)}"`, "json"), /1,000,000 UTF-16/, isolated.engine);
  rejects(() => isolated.engine.inspectTypeScriptJson(`"${"漢".repeat(699_050)}a"`, "json"), /2 MiB/, isolated.engine);
  assert.equal(isolated.counters.scans, 0);
  assert.equal(isolated.counters.parses, 0);
  assert.equal(inspect(`"${"a".repeat(999_998)}"`).inputBytes, 1_000_000);
  assert.equal(inspect(`"${"漢".repeat(699_050)}"`).inputBytes, 2 * 1024 * 1024);
  for (const value of ["é😀", "\ud800", "\udfff"]) {
    const raw = `"${value}"`;
    assert.equal(inspect(raw).inputBytes, Buffer.byteLength(raw, "utf8"));
  }
});

test("whole-input depth and cumulative token preflight happens before ANY recursive parse", () => {
  assert.equal(inspect("[".repeat(40) + "0" + "]".repeat(40)).sampleCount, 1);
  const isolated = loadCore();
  for (const [input, format, pattern] of [
    ["[".repeat(41) + "0" + "]".repeat(41), "json", /depth limit of 40/],
    [`{}\n${"[".repeat(41)}0${"]".repeat(41)}`, "jsonl", /line 2/],
    [`[${"0,".repeat(99_999)}0]`, "json", /200,000-token\/node/],
    [Array(10).fill(`[${"0,".repeat(9_999)}0]`).join("\n"), "jsonl", /200,000-token\/node/],
  ]) rejects(() => isolated.engine.inspectTypeScriptJson(input, format), pattern, isolated.engine);
  assert.equal(isolated.counters.parses, 0);
  const within = generate(`[${"0,".repeat(99_998)}0]`);
  assert.equal(within.code, "export type Root = number[];\n", "A retained root array is one selected value; internal observations are not truncated");
});

test("10,000 JSONL samples and selected values are allowed; every overflow rejects before generation", () => {
  const input = "0\n".repeat(10_000);
  const result = generate(input, {}, "jsonl");
  assert.equal(result.sampleCount, 10_000);
  assert.equal(result.stats.selectedValues, 10_000);
  const isolated = loadCore();
  rejects(() => isolated.engine.inspectTypeScriptJson(input + "0\n", "jsonl"), /10,000-sample/, isolated.engine);
  assert.equal(isolated.counters.parses, 0);
  const array = `[${"0,".repeat(9_999)}0]`;
  assert.equal(generate(array, { rootMode: "array-items" }).stats.selectedValues, 10_000);
  rejects(() => generate(array.slice(0, -1) + ",0]", { rootMode: "array-items" }), /10,000-value/);
  rejects(() => generate(`${array}\n[0]`, { rootMode: "array-items" }, "jsonl"), /10,000-value/);
});

test("decoded key length is bounded globally, including ignored subtrees and escaped spellings", () => {
  const key = "k".repeat(1024);
  checkTypes(generate(`{"${key}":1}`), [`{"${key}":1}`]);
  assert.equal(inspect('{"' + "\\u006b".repeat(1024) + '":1}').sampleCount, 1);
  for (const input of [`{"${key}x":1}`, `{"keep":1,"hidden":{"${key}x":1}}`]) {
    rejects(() => generate(input, { pointer: "/keep" }), /1,024-character/);
    rejects(() => inspect(input), /1,024-character/);
  }
});

test("declaration limits include the root alias and do not deduplicate unrelated empty objects", () => {
  const value = Object.fromEntries(Array.from({ length: 199 }, (_, index) => [`key${index}`, {}]));
  const result = generate(JSON.stringify(value));
  assert.equal(result.declarations.length, 200);
  assertOutput(result);
  rejects(() => generate(JSON.stringify({ ...value, extra: {} })), /200-declaration/);
  const arrayValue = Object.fromEntries(Array.from({ length: 198 }, (_, index) => [`key${index}`, {}]));
  assert.equal(generate(JSON.stringify([arrayValue])).declarations.length, 200);
  rejects(() => generate(JSON.stringify([{ ...arrayValue, extra: {} }])), /200-declaration/);
  assert.equal(generate("{}").declarations.length, 1, "Failed operations leave no partial state");
});

test("property limits count generated fields across declarations, not raw observations", () => {
  const value = Object.fromEntries(Array.from({ length: 2000 }, (_, index) => [`key${index}`, index]));
  const input = JSON.stringify(value);
  const result = checkTypes(generate(input), [input]);
  assert.equal(result.stats.properties, 2000);
  const tooMany = JSON.stringify({ ...value, extra: 1 });
  assert.equal(inspect(tooMany).sampleCount, 1, "Inspection does not invent a selection/output budget");
  rejects(() => generate(tooMany), /2,000-property/);
  rejects(() => generate(JSON.stringify({ nested: value })), /2,000-property/);
  assert.equal(generate(JSON.stringify(Array(200).fill({ id: 1 }))).stats.properties, 1);
});

test("the entire emitted code has an exact 400,000-character budget including module guards", () => {
  const pairs = Array.from({ length: 400 }, (_, index) => [`k${String(index).padStart(3, "0")}` + "x".repeat(956), 1]);
  let remaining = JSON_TS_LIMITS.outputChars - generate(JSON.stringify(Object.fromEntries(pairs))).code.length;
  for (const pair of pairs) {
    const increase = Math.min(1024 - pair[0].length, remaining);
    pair[0] += "x".repeat(increase);
    remaining -= increase;
  }
  assert.equal(remaining, 0);
  const input = JSON.stringify(Object.fromEntries(pairs));
  const result = generate(input);
  assert.equal(result.code.length, 400_000);
  assertOutput(result);
  const adjustable = pairs.find((pair) => pair[0].length < 1024);
  adjustable[0] += "y";
  rejects(() => generate(JSON.stringify(Object.fromEntries(pairs))), /400,000-character/);
  rejects(() => generate(input, { exportDeclarations: false }), /400,000-character/);
  rejects(() => generate(input, { readonly: true }), /400,000-character/);
});

test("escaped literal expansion is budgeted cumulatively, never truncated or partially returned", () => {
  const records = Array.from({ length: 20 }, (_, index) => Object.fromEntries(Array.from({ length: 40 }, (_, key) =>
    [`key${key}`, String(index).padStart(2, "0") + "<".repeat(118)])));
  const input = records.map((value) => JSON.stringify(value)).join("\n");
  assert.ok(input.length < JSON_TS_LIMITS.inputChars);
  rejects(() => generate(input, { stringLiterals: true }, "jsonl"), /400,000-character/);
  assertOutput(generate(input, {}, "jsonl"));
});

test("notices aggregate by structural location, stay bounded and never disclose sample values", () => {
  const value = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [`key${index}`, index % 2 ? null : []]));
  const result = generate(JSON.stringify(value), { readonly: true, stringLiterals: true });
  assert.equal(notice(result, "null-only").count, 150);
  assert.equal(notice(result, "empty-array").count, 150);
  assert.ok(result.notices.length < 8);
  assert.ok(result.notices.every((entry) => !/key[0-9]/.test(entry.message)));
  assert.match(notice(result, "sample-based").message, /not runtime validation/);
});

test("synchronous deadline checks fail safely without sleeping or using ambient timers", () => {
  const isolated = loadCore();
  vm.runInContext("let ticks = 0; Date.now = () => ticks++ === 0 ? 0 : 15001;", isolated.context);
  rejects(() => isolated.engine.inspectTypeScriptJson("{}", "json"), /15-second limit/, isolated.engine);
  assert.equal(isolated.counters.parses, 0);
});

function fileOf(text, name = "sample.json", changes = {}) {
  const bytes = typeof text === "string" ? new TextEncoder().encode(text) : text;
  return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ...changes };
}
async function rejectsFile(operation, pattern) {
  await assert.rejects(operation, (error) => {
    assert.match(error.message, pattern);
    assert.doesNotMatch(error.message, /PRIVATE_PAYLOAD|<script>|io-secret/);
    assert.ok(error.message.length < 300);
    return true;
  });
}

test("file extensions are authoritative except TXT, and import does not prematurely inspect or replace input", async () => {
  const isolated = loadCore();
  const { readTypeScriptJsonFile } = isolated.load("input");
  for (const [name, chosen, expected] of [["SAMPLE.JSON", "jsonl", "json"], ["sample.jsonl", "json", "jsonl"],
    ["sample.NDJSON", "json", "jsonl"], ["sample.txt", "json", "json"], ["sample.TXT", "jsonl", "jsonl"]]) {
    const result = await readTypeScriptJsonFile(fileOf("{", name), chosen);
    assert.deepEqual(plain(result), { text: "{", format: expected });
  }
  assert.equal(isolated.dependencies.includes("jsonc-parser"), false);
});

test("file metadata size/type checks precede arrayBuffer, and unsafe I/O failures are sanitized", async () => {
  const { readTypeScriptJsonFile } = core.load("input");
  let reads = 0;
  const arrayBuffer = async () => { reads++; throw new Error("PRIVATE_PAYLOAD io-secret"); };
  for (const [file, pattern] of [
    [{ name: "sample.json", size: JSON_TS_LIMITS.inputBytes + 1, arrayBuffer }, /2 MiB/],
    [{ name: "sample.exe", size: 1, arrayBuffer }, /UTF-8 JSON/],
    [{ name: "sample.json.zip", size: 1, arrayBuffer }, /UTF-8 JSON/],
    [{ name: "sample.json", size: -1, arrayBuffer }, /invalid size/],
    [{ name: "sample.json", size: NaN, arrayBuffer }, /invalid size/],
  ]) await rejectsFile(() => readTypeScriptJsonFile(file), pattern);
  assert.equal(reads, 0);
  await rejectsFile(() => readTypeScriptJsonFile({ name: "sample.json", size: 1, arrayBuffer }), /could not be read as UTF-8/);
  assert.equal(reads, 1);
  await rejectsFile(() => readTypeScriptJsonFile({ get name() { throw new Error("PRIVATE_PAYLOAD"); } }), /could not be read/);
  await rejectsFile(() => readTypeScriptJsonFile(fileOf("{}"), "auto"), /Choose JSON/);
});

test("actual file bytes are rechecked before decoding, then decoded characters are independently bounded", async () => {
  const isolated = loadCore();
  const { readTypeScriptJsonFile } = isolated.load("input");
  await rejectsFile(() => readTypeScriptJsonFile(fileOf(new Uint8Array(JSON_TS_LIMITS.inputBytes + 1), "sample.json", { size: 1 })), /2 MiB/);
  assert.equal(isolated.counters.decodes, 0);
  await rejectsFile(() => readTypeScriptJsonFile(fileOf("x".repeat(JSON_TS_LIMITS.inputChars + 1))), /1,000,000 UTF-16/);
  const atLimit = `"${"漢".repeat(699_050)}"`;
  assert.equal((await readTypeScriptJsonFile(fileOf(atLimit))).text, atLimit);
});

test("UTF-8 file decoding is fatal, retains BOM for inspection, and rejects empty files", async () => {
  const { readTypeScriptJsonFile } = core.load("input");
  for (const bytes of [[0xff], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xe2, 0x82], [0xff, 0xfe, 0x7b, 0x00]])
    await rejectsFile(() => readTypeScriptJsonFile(fileOf(new Uint8Array(bytes))), /could not be read as UTF-8/);
  for (const text of ["", " \t\r\n", "\ufeff"]) await rejectsFile(() => readTypeScriptJsonFile(fileOf(text)), /empty/);
  const json = await readTypeScriptJsonFile(fileOf("\ufeff{}"));
  assert.equal(json.text.charCodeAt(0), 0xfeff);
  assert.ok(notice(inspect(json.text, json.format), "bom-ignored"));
  const jsonl = await readTypeScriptJsonFile(fileOf("\ufeff{}", "sample.jsonl"));
  rejects(() => inspect(jsonl.text, jsonl.format), /BOM/);
  const unicode = '"é😀"';
  assert.equal((await readTypeScriptJsonFile(fileOf(unicode))).text, unicode);
});

test("input size helper is bounded and unexpected encoder failures do not expose errors", () => {
  const { inputSizeProblem } = core.load("input");
  assert.equal(inputSizeProblem(""), null);
  assert.equal(inputSizeProblem("a".repeat(1_000_000)), null);
  assert.match(inputSizeProblem("a".repeat(1_000_001)), /1,000,000 UTF-16/);
  assert.match(inputSizeProblem("漢".repeat(699_051)), /2 MiB/);
  assert.match(inputSizeProblem(null), /JSON text/);
  const broken = loadCore({ encoderFailure: true }).load("input");
  assert.equal(broken.inputSizeProblem("{}"), "Unable to check the input size safely.");
});

test("downloads contain exact full UTF-8 code with safe Windows names for .ts and .d.ts", () => {
  const { typeScriptDownloadDetails } = core.load("input");
  for (const name of ["Root", "CON", "prn", "AUX", "nul", "COM", "COM0", "COM1", "COM9", "LPT", "LPT2", "$Result", "Example_"]) {
    const result = generate('{"漢字":"😀"}', { rootName: name, stringLiterals: true });
    for (const extension of ["ts", "d.ts"]) {
      const details = typeScriptDownloadDetails(result, extension);
      const reserved = /^(?:con|prn|aux|nul|com[0-9]*|lpt[0-9]*)$/i.test(name);
      assert.equal(details.fileName, `${name}${reserved ? "-types" : ""}.${extension}`);
      assert.equal(details.contents, result.code);
      assert.equal(details.mime, "text/plain;charset=utf-8");
      assert.equal(Buffer.byteLength(details.contents, "utf8"), result.stats.outputBytes);
    }
  }
  for (const [result, extension] of [[{ options: { rootName: "../PRIVATE_PAYLOAD" }, code: "x" }, "ts"],
    [generate("1"), "js"], [{ ...generate("1"), code: "x".repeat(400_001) }, "ts"], [null, "ts"]]) {
    assert.throws(() => typeScriptDownloadDetails(result, extension), /Generate a valid TypeScript result/);
  }
});

test("byte formatting handles byte/KiB/MiB boundaries without accepting invalid numbers", () => {
  const { formatBytes } = core.load("input");
  for (const [bytes, expected] of [[0, "0 B"], [1023, "1023 B"], [1024, "1 KiB"], [1536, "1.5 KiB"], [1048576, "1 MiB"], [2097152, "2 MiB"],
    [-1, "Unknown size"], [NaN, "Unknown size"], [Infinity, "Unknown size"], ["1", "Unknown size"]]) assert.equal(formatBytes(bytes), expected);
});

test("worker responses use exact correlation IDs and kinds without retaining stale inference state", () => {
  const isolated = loadCore(); isolated.load("worker");
  const send = (data) => isolated.context.onmessage({ data });
  send({ id: 12, kind: "inspect", input: "{}", format: "json" });
  send({ id: 4, kind: "generate", input: '[{"id":1}]', format: "json", options: options() });
  send({ id: 0, kind: "generate", input: "[", format: "json", options: options() });
  send({ id: Number.MAX_SAFE_INTEGER, kind: "inspect", input: "null", format: "json" });
  send({ id: 4, kind: "generate", input: "true", format: "json", options: options() });
  assert.deepEqual(isolated.messages.map((message) => [message.id, message.kind]), [[12, "inspect"], [4, "generate"], [0, "error"], [Number.MAX_SAFE_INTEGER, "inspect"], [4, "generate"]]);
  assert.deepEqual(Object.keys(isolated.messages[0]).sort(), ["id", "inspection", "kind"]);
  assert.deepEqual(Object.keys(isolated.messages[1]).sort(), ["id", "kind", "result"]);
  assert.deepEqual(Object.keys(isolated.messages[2]).sort(), ["error", "id", "kind"]);
  assert.equal(isolated.messages[4].result.code, "export type Root = boolean;\n");
  assertOutput(isolated.messages[1].result);
});

test("worker ignores uncorrelatable events, invalid numbers and accessor/inherited IDs", () => {
  const isolated = loadCore(); isolated.load("worker");
  let called = 0;
  const getter = { get id() { called++; throw new Error("PRIVATE_PAYLOAD"); } };
  for (const data of [null, undefined, [], "PRIVATE_PAYLOAD", {}, { id: -1 }, { id: NaN }, { id: Infinity }, { id: 1.2 },
    { id: "1" }, { id: Number.MAX_SAFE_INTEGER + 1 }, Object.create({ id: 1 }), getter]) isolated.context.onmessage({ data });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  isolated.context.onmessage({ data: revoked.proxy });
  isolated.context.onmessage(null);
  isolated.context.onmessage({ get data() { throw new Error("PRIVATE_PAYLOAD"); } });
  assert.equal(called, 0);
  assert.equal(isolated.messages.length, 0);
});

test("malformed correlated worker requests return fixed errors without invoking getters or reflecting payloads", () => {
  const isolated = loadCore(); isolated.load("worker");
  let called = 0;
  const getter = { id: 30, kind: "inspect", format: "json" };
  Object.defineProperty(getter, "input", { get() { called++; throw new Error("PRIVATE_PAYLOAD"); } });
  const badOptions = options();
  Object.defineProperty(badOptions, "readonly", { get() { called++; throw new Error("PRIVATE_PAYLOAD"); } });
  const requests = [getter, { id: 31, kind: "PRIVATE_PAYLOAD" }, { id: 32, kind: "inspect", input: 1, format: "json" },
    { id: 33, kind: "inspect", input: "{}", format: "json", options: options() },
    { id: 34, kind: "generate", input: "{}", format: "json" },
    { id: 35, kind: "generate", input: "{}", format: "json", options: badOptions },
    { id: 36, kind: "inspect", input: "{}", format: "auto" },
    { id: 37, kind: "inspect", input: "{}", format: "json", [Symbol("PRIVATE_PAYLOAD")]: 1 },
    new Proxy({ id: 38 }, { ownKeys() { throw new Error("PRIVATE_PAYLOAD"); } })];
  for (const data of requests) isolated.context.onmessage({ data });
  assert.equal(called, 0);
  assert.deepEqual(isolated.messages.map((message) => message.id), requests.map((request) => request.id));
  for (const message of isolated.messages) {
    assert.equal(message.kind, "error");
    assert.doesNotMatch(message.error, /PRIVATE_PAYLOAD|<script>/);
    assert.ok(message.error.length < 300);
  }
});

test("unexpected scanner/parser failures are sanitized and the following worker request still succeeds", () => {
  for (const fault of [{ parseFailures: 2 }, { scannerFailures: 2 }]) {
    const isolated = loadCore(fault);
    rejects(() => isolated.engine.generateTypeScript('"PRIVATE_PAYLOAD"', "json", options()), /Unable to process this JSON safely/, isolated.engine);
    isolated.load("worker");
    isolated.context.onmessage({ data: { id: 8, kind: "generate", input: '"PRIVATE_PAYLOAD"', format: "json", options: options() } });
    isolated.context.onmessage({ data: { id: 9, kind: "generate", input: "1", format: "json", options: options() } });
    assert.deepEqual(isolated.messages[0], { id: 8, kind: "error", error: "Unable to process this JSON safely. Check the input and TypeScript settings." });
    assert.equal(isolated.messages[1].result.code, "export type Root = number;\n");
  }
});

test("all four fictional samples inspect, infer, compile and remain deterministic", () => {
  const samples = core.load("samples").JSON_TS_SAMPLES;
  assert.equal(samples.length, 4);
  assert.equal(new Set(samples.map((sample) => sample.id)).size, 4);
  for (const sample of samples) {
    assert.ok(sample.label && sample.hint);
    assert.match(sample.hint, /fictional/i);
    assert.ok(sample.text.length < JSON_TS_LIMITS.inputChars);
    const settings = options(sample.options);
    const values = sample.format === "json" ? [JSON.parse(sample.text)] : sample.text.replace(/\n$/, "").split("\n").map((line) => JSON.parse(line));
    const selected = settings.rootMode === "array-items" ? values.flat() : values;
    const result = checkTypes(generate(sample.text, sample.options, sample.format), selected.map(expression));
    assert.equal(inspect(sample.text, sample.format).sampleCount, values.length);
    assert.deepEqual(plain(generate(sample.text, sample.options, sample.format)), plain(result));
  }
});

test("seeded heterogeneous examples preserve assignability across modes, pointers, literals and readonly", () => {
  let seed = 0x51c0ffee;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const keys = ["id", "ID", "a-b", "a b", "漢", "__proto__", "constructor", "toString", "", 'quote"key', "\u202ekey"];
  const strings = ["alpha", "beta", "2026-10-05", "001", "<>&", "\ud800", "😀", "line\nvalue"];
  function value(depth) {
    const kind = next() % (depth ? 7 : 5);
    if (kind === 0) return null;
    if (kind === 1) return !!(next() & 1);
    if (kind === 2) return (next() % 1000) / 10;
    if (kind === 3 || kind === 4) return strings[next() % strings.length];
    if (kind === 5) return Array.from({ length: next() % 4 }, () => value(depth - 1));
    return Object.fromEntries(Array.from({ length: next() % 4 }, () => [keys[next() % keys.length], value(depth - 1)]));
  }
  for (let trial = 0; trial < 32; trial++) {
    const values = Array.from({ length: 2 + next() % 4 }, () => value(4));
    const changes = { rootName: `Generated${trial}`, stringLiterals: !!(trial % 2), readonly: !!(trial % 3),
      declarationStyle: trial % 2 ? "type" : "interface", sortProperties: !!(trial % 2), indent: ["2", "4", "tab"][trial % 3] };
    let result, selected;
    if (trial % 3 === 0) {
      result = generate(values.map((item) => JSON.stringify(item)).join("\n"), changes, "jsonl"); selected = values;
    } else if (trial % 3 === 1) {
      result = generate(JSON.stringify({ data: values }), { ...changes, pointer: "/data", rootMode: "array-items" }); selected = values;
    } else {
      result = generate(JSON.stringify(values), changes); selected = [values];
    }
    checkTypes(result, selected.map(expression));
  }
});

test("every queued generated .ts and .d.ts passes real strict semantic and sample type checks", (context) => {
  assert.ok(fixtures.length >= 80, "Semantic checks must cover more than just a demonstration output");
  const files = new Map();
  for (const [index, { result, checks }] of fixtures.entries()) {
    const base = path.join(root, "__synthetic_json_ts__", `case-${index}`);
    files.set(`${base}-source.ts`, result.code + "\n" + checks);
    files.set(`${base}-declarations.d.ts`, result.code);
    if (result.options.exportDeclarations) {
      const imports = result.declarations.map((entry) => entry.name).join(", ");
      files.set(`${base}-consumer.ts`, `import type { ${imports} } from "./case-${index}-declarations";\n${checks}`);
    } else {
      files.set(`${base}-consumer.ts`, `export {};\n// @ts-expect-error The declarations must not pollute global scope.\ntype Hidden = ${result.rootType};\n`);
    }
  }
  const program = programFor(files);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, diagnosticHost));
  assert.equal(program.getSourceFiles().filter((file) => file.fileName.includes("__synthetic_json_ts__")).length, files.size);
  context.diagnostic(`${fixtures.length} generated .ts files, ${fixtures.length} generated .d.ts files and ${fixtures.length} consumer fixtures checked; zero semantic diagnostics.`);
});