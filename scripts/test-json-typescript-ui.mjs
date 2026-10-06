import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { parseDocument } from "htmlparser2";
import * as jsonc from "jsonc-parser";
import * as icons from "lucide-react";
import postcss from "postcss";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server.node";
import ts from "typescript";

// Offline source/SSR contracts, not a hostile-code sandbox. Installed packages
// are trusted; application reads and VM imports are explicitly allowlisted.
// No application env execution, DB, network, writes, build or server startup.
// Page SSR uses an explicit client placeholder; separate REAL React client SSR
// covers initial state only. No effects/events/Worker transport are exercised.
// Built-preview browser checks (port 3044), Next head resolution, accessibility
// audits, actual downloads/clipboard and OG PNG rasterization remain separate.
const root = fileURLToPath(new URL("../", import.meta.url));
const files = Object.freeze({
  types: "src/lib/json-typescript/types.ts", naming: "src/lib/json-typescript/naming.ts",
  input: "src/lib/json-typescript/input.ts", engine: "src/lib/json-typescript/engine.ts",
  samples: "src/lib/json-typescript/samples.ts", worker: "src/lib/json-typescript/worker.ts",
  client: "src/app/tools/json-to-typescript/json-to-typescript-tool.tsx",
  page: "src/app/tools/json-to-typescript/page.tsx",
  og: "src/app/tools/json-to-typescript/opengraph-image.tsx",
  css: "src/app/tools/json-to-typescript/json-typescript.css",
  seo: "src/lib/tool-seo.tsx", config: "src/lib/config.ts", catalog: "src/lib/tool-catalog.ts",
  chat: "src/app/api/chat/route.ts", llms: "src/app/llms.txt/route.ts",
});
const executable = new Set(["types", "naming", "input", "engine", "samples", "client", "page", "og", "seo"]);
const sources = new Map(), trees = new Map(), compiled = new Map(), runtimes = [];
const plain = (value) => JSON.parse(JSON.stringify(value)); // Host-side schema/VM data only.
const collapse = (value) => value.replace(/\s+/g, " ").trim();
const only = (items, label) => { assert.equal(items.length, 1, label); return items[0]; };

function source(name) {
  assert.ok(Object.hasOwn(files, name), "Unapproved source read");
  if (!sources.has(name)) sources.set(name, readFileSync(path.join(root, files[name]), "utf8"));
  return sources.get(name);
}
function tree(name) {
  if (!trees.has(name)) {
    const parsed = ts.createSourceFile(files[name], source(name), ts.ScriptTarget.Latest, true);
    assert.equal(parsed.parseDiagnostics.length, 0, `${name}: syntax diagnostics`);
    trees.set(name, parsed);
  }
  return trees.get(name);
}
function nodes(node, predicate) {
  const found = [];
  function visit(current) { if (predicate(current)) found.push(current); ts.forEachChild(current, visit); }
  visit(node);
  return found;
}
const initializer = (file, symbol) => only(nodes(tree(file), (node) => ts.isVariableDeclaration(node)
  && ts.isIdentifier(node.name) && node.name.text === symbol), `${file}: ${symbol}`).initializer;
const declaration = (file, symbol) => only(nodes(tree(file), (node) => ts.isFunctionDeclaration(node)
  && node.name?.text === symbol), `${file}: ${symbol}`);
function property(object, key) {
  assert.ok(ts.isObjectLiteralExpression(object), "Expected an object literal");
  return only(object.properties.filter((entry) => ts.isPropertyAssignment(entry)
    && (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) && entry.name.text === key), `Property ${key}`).initializer;
}
function literal(node) {
  assert.ok(node, "Missing literal");
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const entries = node.properties.map((entry) => {
      assert.ok(ts.isPropertyAssignment(entry) && (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)), "Static properties only");
      return [entry.name.text, literal(entry.initializer)];
    });
    assert.equal(new Set(entries.map(([key]) => key)).size, entries.length, "Duplicate literal keys");
    return Object.fromEntries(entries);
  }
  assert.fail(`Nonliteral AST value: ${ts.SyntaxKind[node.kind]}`);
}
function access(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return `${access(node.expression)}.${node.name.text}`;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) return `${access(node.expression)}.${node.argumentExpression.text}`;
  return "";
}
const calls = (node, name) => nodes(node, (entry) => ts.isCallExpression(entry) && access(entry.expression) === name);
const isImportMetaUrl = (node) => ts.isPropertyAccessExpression(node) && node.name.text === "url"
  && ts.isMetaProperty(node.expression) && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword
  && node.expression.name.text === "meta";

// Read only the literal production fallback; never evaluate process.env/config.
const urlDefault = property(initializer("config", "siteConfig"), "url");
assert.ok(ts.isBinaryExpression(urlDefault) && urlDefault.operatorToken.kind === ts.SyntaxKind.BarBarToken);
assert.equal(access(urlDefault.left), "process.env.NEXT_PUBLIC_SITE_URL");
const productionOrigin = literal(urlDefault.right);
assert.equal(productionOrigin, "https://www.byteverse.fyi");
const canonical = `${productionOrigin}/tools/json-to-typescript`;
const title = "Free JSON to TypeScript Converter - Interfaces & Types";
const toolConfig = literal(initializer("page", "toolConfig"));

function compile(name) {
  assert.ok(executable.has(name), "Unapproved executable module");
  if (!compiled.has(name)) {
    let substitutions = 0;
    const output = ts.transpileModule(source(name), {
      fileName: files[name], reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, strict: true, isolatedModules: true },
      transformers: { before: [(context) => {
        function visit(node) {
          if (name === "client" && isImportMetaUrl(node)) {
            substitutions++;
            return context.factory.createStringLiteral("file:///__json_ts_ui__/client.tsx");
          }
          return ts.visitEachChild(node, visit, context);
        }
        return (node) => ts.visitNode(node, visit);
      }] },
    });
    assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
    assert.equal(substitutions, name === "client" ? 1 : 0, "Only the client worker-base URL is substituted");
    compiled.set(name, output.outputText);
  }
  return compiled.get(name);
}
function createRuntime(tracked = true) {
  const violations = [], images = [], cache = new Map();
  const deny = (name) => { violations.push(name); throw new Error(`Blocked capability: ${name}`); };
  const sandbox = { TextEncoder, TextDecoder };
  for (const name of ["process", "fetch", "window", "document", "navigator", "location", "URL", "Blob",
    "Worker", "SharedWorker", "XMLHttpRequest", "WebSocket", "EventSource", "localStorage", "sessionStorage",
    "indexedDB", "caches", "FileReader", "Image", "console", "postMessage", "setTimeout", "clearTimeout",
    "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"]) {
    Object.defineProperty(sandbox, name, { get: () => deny(name) });
  }
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  class ImageResponseStub {
    constructor(element, options) { this.element = element; this.options = options; images.push(this); }
  }
  const imports = {
    types: {}, naming: { "./types": "types" }, input: { "./types": "types", "./naming": "naming" }, samples: {},
    engine: { "./types": "types", "./naming": "naming", "jsonc-parser": jsonc },
    client: { react: React, "react/jsx-runtime": jsxRuntime, "lucide-react": icons,
      "@/lib/json-typescript/input": "input", "@/lib/json-typescript/naming": "naming",
      "@/lib/json-typescript/types": "types", "@/lib/json-typescript/samples": "samples", "./json-typescript.css": {} },
    seo: { "react/jsx-runtime": jsxRuntime, "@/lib/config": { siteConfig: Object.freeze({ url: productionOrigin }) } },
    page: { "react/jsx-runtime": jsxRuntime, "lucide-react": icons, "@/lib/tool-seo": "seo",
      "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
      "./json-to-typescript-tool": { JsonToTypeScriptTool: () => React.createElement("section", {
        id: "json-ts-workspace", "data-ssr-placeholder": "JsonToTypeScriptTool",
      }) } },
    og: { "react/jsx-runtime": jsxRuntime, "next/og": { ImageResponse: ImageResponseStub } },
  };
  function resolveImport(parent, specifier) {
    if (!Object.hasOwn(imports, parent) || !Object.hasOwn(imports[parent], specifier)) return deny(`import:${parent}:${specifier}`);
    const dependency = imports[parent][specifier];
    return typeof dependency === "string" ? load(dependency) : dependency;
  }
  function load(name) {
    if (!Object.hasOwn(imports, name)) return deny(`module:${name}`);
    if (!cache.has(name)) {
      const record = { exports: {} };
      cache.set(name, record);
      const wrapper = new vm.Script(`(function(exports, require, module) {\n${compile(name)}\n})`, { filename: files[name] }).runInContext(context);
      wrapper(record.exports, (specifier) => resolveImport(name, specifier), record);
    }
    return cache.get(name).exports;
  }
  const runtime = { load, resolveImport, violations, images, cache, context };
  if (tracked) runtimes.push(runtime);
  return runtime;
}
afterEach(() => {
  for (const runtime of runtimes) assert.deepEqual(runtime.violations, [], "Forbidden app capability, even if caught");
});

function elements(node, predicate = () => true) {
  const found = [];
  function visit(current) { if (current.name && predicate(current)) found.push(current); for (const child of current.children ?? []) visit(child); }
  visit(node);
  return found;
}
function text(node, visible = false) {
  if (visible && ["script", "style"].includes(node.name)) return "";
  return node.type === "text" ? node.data : (node.children ?? []).map((child) => text(child, visible)).join("");
}
const byId = (dom, id) => only(elements(dom, (node) => node.attribs.id === id), `Expected #${id}`);
const visible = (dom) => collapse(text(dom, true));
const pageRuntime = createRuntime(), clientRuntime = createRuntime();
const page = pageRuntime.load("page"), og = pageRuntime.load("og");
const pageHtml = renderToStaticMarkup(React.createElement(page.default));
const pageDom = parseDocument(pageHtml), pageText = visible(pageDom);
const client = clientRuntime.load("client");
const clientDom = parseDocument(renderToStaticMarkup(React.createElement(client.JsonToTypeScriptTool)));
const { DEFAULT_JSON_TS_OPTIONS: defaults, JSON_TS_LIMITS: limits } = clientRuntime.load("types");
const schemas = elements(pageDom, (node) => node.name === "script" && node.attribs.type === "application/ld+json")
  .map((node) => JSON.parse(text(node)));
const schema = (type) => only(schemas.filter((value) => value["@type"] === type), `Schema ${type}`);
// Disable previous-map discovery so CSS parsing cannot read a companion map.
const css = postcss.parse(source("css"), { from: files.css, map: { prev: false } });

function descriptor(file, slug) {
  const array = initializer(file, { catalog: "toolCatalog", chat: "TOOLS", llms: "tools" }[file]);
  assert.ok(ts.isArrayLiteralExpression(array));
  const key = file === "llms" ? "href" : "slug", expected = file === "llms" ? `/tools/${slug}` : slug;
  const entry = only(array.elements.filter((node) => literal(property(node, key)) === expected), `${file}: ${slug}`);
  const pairs = entry.properties.map((member) => {
    assert.ok(ts.isPropertyAssignment(member) && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)));
    if (file === "catalog" && member.name.text === "icon") {
      assert.ok(ts.isIdentifier(member.initializer));
      return ["icon", member.initializer.text];
    }
    return [member.name.text, literal(member.initializer)];
  });
  assert.equal(new Set(pairs.map(([name]) => name)).size, pairs.length);
  return Object.fromEntries(pairs);
}

test("offline allowlists reject app env, backend execution, unknown reads/imports and dynamic code", () => {
  const probe = createRuntime(false);
  for (const name of ["config", "catalog", "chat", "llms", "worker", "css"]) assert.throws(() => probe.load(name), /Blocked capability/);
  for (const specifier of ["node:fs", "node:http", "@/lib/db", "dotenv", "https://example.invalid/module.js"]) {
    assert.throws(() => probe.resolveImport("engine", specifier), /Blocked capability/);
  }
  for (const expression of ["process.env", "fetch", "Worker", "document", "localStorage", "indexedDB", "setTimeout"]) {
    const before = probe.violations.length;
    // V8 can replace a throwing global getter's error with ReferenceError.
    // Verify the deny trap actually ran, not merely that the lookup threw.
    assert.throws(() => vm.runInContext(expression, probe.context), /Blocked capability|is not defined/);
    assert.equal(probe.violations.length, before + 1);
    assert.equal(probe.violations.at(-1), expression.split(".")[0]);
  }
  assert.throws(() => vm.runInContext("new Function('return 1')()", probe.context), /Code generation from strings disallowed/);
  assert.throws(() => source("../.env.local"), /Unapproved source read/);
  assert.throws(() => literal(urlDefault.left), /Nonliteral AST value/);
  assert.strictEqual(pageRuntime.resolveImport("engine", "jsonc-parser"), jsonc);
});

test("real page metadata keeps the absolute title and established production canonical", () => {
  assert.equal(toolConfig.slug, "json-to-typescript");
  assert.equal(toolConfig.title, title);
  assert.deepEqual(plain(page.metadata.title), { absolute: title });
  assert.equal(page.metadata.alternates.canonical, "https://www.byteverse.fyi/tools/json-to-typescript");
  assert.equal(page.metadata.openGraph.url, canonical);
  assert.equal(page.metadata.description, toolConfig.description);
  assert.deepEqual(plain(page.metadata.keywords), toolConfig.keywords);
});

test("custom OG and Twitter metadata match the actual image exports, dimensions and alt", () => {
  assert.deepEqual(plain(og.size), { width: 1200, height: 630 });
  assert.equal(og.alt, "ByteVerse JSON to TypeScript: fictional account samples produce a mixed ID type and an optional nullable email field.");
  const image = { url: "/tools/json-to-typescript/opengraph-image", width: 1200, height: 630, alt: og.alt };
  for (const key of ["openGraph", "twitter"]) {
    assert.equal(page.metadata[key].title, title);
    assert.deepEqual(plain(page.metadata[key].images), [image]);
  }
  assert.equal(page.metadata.twitter.card, "summary_large_image");
});

test("actual page SSR has one H1, no nested main and working local anchor targets", () => {
  assert.match(text(only(elements(pageDom, (node) => node.name === "h1"), "One H1")), /^JSON to TypeScript\./);
  assert.equal(elements(pageDom, (node) => node.name === "main").length, 0, "Layout owns main");
  assert.equal(elements(clientDom, (node) => ["h1", "main"].includes(node.name)).length, 0, "Real client adds no duplicate page landmarks");
  assert.equal(byId(pageDom, "json-ts-workspace").attribs["data-ssr-placeholder"], "JsonToTypeScriptTool");
  assert.ok(!pageRuntime.cache.has("client"), "Page SSR must not silently render the real client");
  const links = elements(pageDom, (node) => node.name === "a");
  for (const link of links.filter((node) => node.attribs.href?.startsWith("#"))) byId(pageDom, link.attribs.href.slice(1));
  for (const href of ["/tools/json-formatter", "/tools/json-to-csv", "/tools/diff-checker",
    "/blog/typescript-for-beginners-2026-complete-guide", "/blog/best-free-apis-for-developers-2026"]) {
    assert.ok(links.some((node) => node.attribs.href === href), href); // No claim of HTTP verification.
  }
});

test("real ToolJsonLd emits a free WebApplication, exact breadcrumbs and no invented ratings", () => {
  assert.equal(schemas.length, 3);
  const app = schema("WebApplication");
  assert.equal(app.name, toolConfig.name);
  assert.equal(app.url, canonical);
  assert.equal(app.description, toolConfig.description);
  assert.equal(app.applicationCategory, "DeveloperApplication");
  assert.equal(app.isAccessibleForFree, true);
  assert.deepEqual(app.offers, { "@type": "Offer", price: "0", priceCurrency: "USD" });
  assert.deepEqual(app.featureList, toolConfig.featureList);
  assert.deepEqual(schema("BreadcrumbList").itemListElement, [
    { "@type": "ListItem", position: 1, name: "Home", item: productionOrigin },
    { "@type": "ListItem", position: 2, name: "Tools", item: `${productionOrigin}/tools` },
    { "@type": "ListItem", position: 3, name: toolConfig.name, item: canonical },
  ]);
  assert.doesNotMatch(JSON.stringify(schemas), /"(?:aggregateRating|review|ratingValue|ratingCount|reviewCount)"\s*:/);
});

test("exactly five schema FAQs equal the native details/summary questions and answers", () => {
  const details = elements(pageDom, (node) => node.name === "details");
  assert.equal(toolConfig.faqs.length, 5);
  assert.equal(details.length, 5);
  const faqs = details.map((detail) => {
    assert.deepEqual(detail.children.filter((node) => node.name).map((node) => node.name), ["summary", "p"]);
    for (const node of elements(detail)) {
      assert.ok(!Object.hasOwn(node.attribs, "hidden"));
      assert.notEqual(node.attribs["aria-hidden"], "true");
      assert.doesNotMatch(node.attribs.style ?? "", /display\s*:\s*none|visibility\s*:\s*hidden/i);
    }
    for (let parent = detail; parent?.attribs; parent = parent.parent) {
      assert.ok(!Object.hasOwn(parent.attribs, "hidden"));
      assert.notEqual(parent.attribs["aria-hidden"], "true");
    }
    return { question: text(only(elements(detail, (node) => node.name === "summary"), "FAQ summary")),
      answer: text(only(elements(detail, (node) => node.name === "p"), "FAQ answer")) };
  });
  assert.deepEqual(faqs, toolConfig.faqs);
  assert.equal(new Set(faqs.map((faq) => faq.question)).size, 5);
  assert.deepEqual(schema("FAQPage").mainEntity, faqs.map(({ question, answer }) => ({
    "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer },
  })));
});

test("fictional worked-example DOM is byte-for-byte the real Account array-item generation", () => {
  const input = text(byId(pageDom, "jts-example-json"));
  assert.deepEqual(JSON.parse(input), [
    { id: 101, name: "Demo Finch", email: "finch@example.invalid" },
    { id: "demo-102", name: "Demo Wren" }, { id: 103, name: "Demo Lark", email: null },
  ]);
  const result = pageRuntime.load("engine").generateTypeScript(input, "json", { ...defaults, rootName: "Account", rootMode: "array-items" });
  assert.equal(text(byId(pageDom, "jts-example-types")), result.code);
  assert.equal(result.stats.selectedValues, 3);
  assert.deepEqual(plain(result.declarations[0].properties.find((field) => field.key === "email")),
    { key: "email", type: "string | null", optional: true, present: 2, total: 3 });
  assert.ok(pageText.includes("three fictional records"));
  assert.ok(pageText.includes("email appears in 2 of 3 objects."));
});

test("visible numeric limits agree with the real types module, including literal and worker bounds", () => {
  const n = (value) => value.toLocaleString("en-US");
  for (const phrase of [
    `${n(limits.inputChars)} UTF-16 characters`, `${limits.inputBytes / 1024 / 1024} MiB of UTF-8`,
    `depth ${limits.depth}`, `${n(limits.tokens)} tokens/nodes`, `${n(limits.samples)} JSONL samples or selected values`,
    `${limits.declarations} declarations`, `${n(limits.properties)} generated properties`,
    `${n(limits.keyChars)}-character keys`, `${n(limits.pointerChars)}-character pointer`,
    `${n(limits.outputChars)} characters`, `${limits.timeoutMs / 1000}-second deadline`,
    `${limits.literalValues} distinct values or ${limits.literalChars} characters per value`,
  ]) assert.ok(pageText.includes(phrase), phrase);
  assert.ok(text(byId(clientDom, "jts-root-name-help")).includes(`Up to ${limits.rootNameChars} characters.`));
  assert.ok(pageText.includes("Limits reject an operation; they never offer a silently shortened file."));
});

test("guidance distinguishes inference, optionality and readonly from runtime guarantees", () => {
  for (const phrase of ["Neither validates runtime JSON.", "does not run a TypeScript compiler",
    "One sample cannot prove a field will always exist.", "relationships between discriminator and payload fields are not preserved",
    "There is no tagged-union, tuple, class, Date, bigint, JSON Schema or runtime-validator generation.",
    "it does not freeze data", "not proof of missing data", "Observed literals are not a complete enum."]) {
    assert.ok(pageText.includes(phrase), phrase);
  }
  assert.doesNotMatch(pageText, /100%\s+(?:accurate|correct|secure|private)|guaranteed\s+(?:correct|accurate|type.safe|production.ready)/i);
});

test("privacy copy acknowledges site scripts, persistent exports and literal/key disclosure", () => {
  for (const phrase of ["no conversion uploads, AI calls or automatic workspace saving",
    "clipboard contents and downloads persist outside the workspace",
    "not a claim that the entire page is isolated from third-party scripts",
    "String literal mode embeds source string values in exported code.", "Keys appear in output in every mode",
    "use sanitized samples", "there is no arbitrary URL import"]) assert.ok(pageText.includes(phrase), phrase);
  assert.ok(visible(clientDom).includes("No conversion uploads. Site analytics/ads are separate."));
});

test("real client initial SSR is empty, uses real defaults and never starts effects or a Worker", () => {
  const workspace = byId(clientDom, "json-ts-workspace");
  assert.equal(workspace.name, "section");
  assert.equal(workspace.attribs.dir, "ltr");
  assert.equal(workspace.attribs.translate, "no");
  assert.equal(text(byId(clientDom, "jts-input")), "");
  assert.equal(byId(clientDom, "jts-pointer").attribs.value, "");
  assert.equal(byId(clientDom, "jts-root-name").attribs.value, defaults.rootName);
  assert.equal(elements(clientDom, (node) => ["jts-output", "jts-error", "jts-imported-file", "jts-sample-hint"].includes(node.attribs.id)).length, 0);
  byId(clientDom, "jts-empty-result");
  for (const [id, key] of [["jts-declaration-style", "declarationStyle"], ["jts-root-mode", "rootMode"],
    ["jts-optionality", "optionalProperties"], ["jts-indent", "indent"]]) {
    assert.equal(only(elements(byId(clientDom, id), (node) => node.name === "option" && Object.hasOwn(node.attribs, "selected")), id).attribs.value, defaults[key]);
  }
  for (const [id, key] of [["jts-readonly", "readonly"], ["jts-export-declarations", "exportDeclarations"],
    ["jts-string-literals", "stringLiterals"], ["jts-sort-properties", "sortProperties"]]) {
    assert.equal(Object.hasOwn(byId(clientDom, id).attribs, "checked"), defaults[key]);
  }
  assert.deepEqual([...clientRuntime.cache.keys()].sort(), ["client", "input", "naming", "samples", "types"]);
  assert.deepEqual(clientRuntime.violations, []);
});

test("initial controls have unique IDs, accessible names, resolvable help and polite status regions", () => {
  const combined = [...elements(pageDom, (node) => !node.attribs["data-ssr-placeholder"]), ...elements(clientDom)];
  const ids = combined.map((node) => node.attribs.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, "Page and real client IDs must compose without collisions");
  const names = new Map();
  for (const control of elements(clientDom, (node) => ["input", "select", "textarea", "button"].includes(node.name))) {
    const id = control.attribs.id;
    assert.ok(id, "Initial control ID");
    const name = control.attribs["aria-label"] || (control.name === "button" ? text(control)
      : elements(clientDom, (node) => node.name === "label" && node.attribs.for === id).map((node) => text(node)).join(" "));
    assert.ok(collapse(name), `Accessible name: ${id}`);
    names.set(id, collapse(name));
  }
  for (const [id, name] of [["jts-input", "Your JSON"], ["jts-root-name", "Root name"],
    ["jts-pointer", "JSON Pointer Optional"], ["jts-file", "Import JSON or JSON Lines file"], ["jts-download-extension", "Download format"]]) {
    assert.equal(names.get(id), name);
  }
  for (const dom of [pageDom, clientDom]) for (const node of elements(dom)) {
    for (const key of ["for", "aria-labelledby", "aria-describedby"]) {
      for (const id of (node.attribs[key] ?? "").split(/\s+/).filter(Boolean)) byId(dom, id);
    }
  }
  for (const id of ["jts-status", "jts-copy-status"]) {
    const node = byId(clientDom, id);
    assert.equal(node.attribs.role, "status");
    assert.equal(node.attribs["aria-live"], "polite");
    assert.equal(node.attribs["aria-atomic"], "true");
    assert.equal(text(node), "");
  }
  assert.equal(byId(clientDom, "jts-input").attribs["aria-keyshortcuts"], "Control+Enter Meta+Enter");
});

test("generation, clear, result views and every export start disabled; local import remains available", () => {
  for (const id of ["jts-generate", "jts-clear", "jts-code-view", "jts-fields-view", "jts-copy", "jts-download", "jts-download-extension"]) {
    assert.ok(Object.hasOwn(byId(clientDom, id).attribs, "disabled"), id);
  }
  for (const id of ["jts-input", "jts-import", "jts-load-example"]) assert.ok(!Object.hasOwn(byId(clientDom, id).attribs, "disabled"), id);
  assert.equal(byId(clientDom, "jts-file").attribs.accept, ".json,.jsonl,.ndjson,.txt");
  assert.deepEqual(elements(byId(clientDom, "jts-download-extension"), (node) => node.name === "option").map((node) => node.attribs.value), ["ts", "d.ts"]);
});

test("AST preserves the bundler-visible module Worker URL and binds its timeout to the real limit", () => {
  const worker = only(nodes(tree("client"), (node) => ts.isNewExpression(node) && access(node.expression) === "Worker"), "One Worker constructor");
  const [url, settings] = worker.arguments;
  assert.ok(ts.isNewExpression(url) && access(url.expression) === "URL");
  assert.equal(literal(url.arguments[0]), "../../../lib/json-typescript/worker.ts");
  assert.ok(isImportMetaUrl(url.arguments[1]), "Original AST, not the SSR substitution");
  assert.deepEqual(literal(settings), { type: "module" });
  const run = declaration("client", "runWorker");
  assert.ok(nodes(run, (node) => node === worker).length === 1, "Worker is created only inside runWorker");
  assert.equal(access(only(calls(run, "setTimeout"), "Worker deadline").arguments[1]), "JSON_TS_LIMITS.timeoutMs");
  assert.ok(!clientRuntime.cache.has("engine") && !clientRuntime.cache.has("worker"), "No main-thread generation during SSR");
});

test("AST cleanup terminates the correct Worker, clears handlers/timers and revokes local blob URLs", () => {
  const stop = initializer("client", "stopWorker").arguments[0];
  for (const [left, right] of [["active.instance", "instance"], ["active.id", "id"]]) {
    assert.equal(nodes(stop, (node) => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
      && access(node.left) === left && access(node.right) === right).length, 1, "Worker identity guard");
  }
  for (const handler of ["instance.onmessage", "instance.onerror", "instance.onmessageerror"]) {
    assert.equal(nodes(stop, (node) => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && access(node.left) === handler && node.right.kind === ts.SyntaxKind.NullKeyword).length, 1, handler);
  }
  for (const call of ["instance.terminate", "clearTimeout"]) assert.equal(calls(stop, call).length, 1, call);
  const effect = only(calls(tree("client"), "useEffect"), "Lifecycle effect").arguments[0];
  const cleanup = only(nodes(effect, (node) => ts.isReturnStatement(node) && node.expression && ts.isArrowFunction(node.expression)), "Unmount cleanup").expression;
  for (const call of ["stopWorker", "invalidateLifecycle", "cancelFocus", "clearTimeout", "URL.revokeObjectURL", "urls.clear"]) {
    assert.equal(calls(cleanup, call).length, 1, call);
  }
  assert.equal(calls(declaration("client", "cancelPending"), "stopWorker").length, 1);
});

test("converter-only AST has no network/storage/JSON.parse paths; local blob DOM and stringify are allowed", () => {
  const forbidden = new Set(["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "sendBeacon",
    "localStorage", "sessionStorage", "indexedDB", "caches", "cookie", "serviceWorker", "importScripts", "process", "console", "eval"]);
  const allowedImports = new Set(["react", "lucide-react", "jsonc-parser", "./types", "./naming", "./engine",
    "@/lib/json-typescript/input", "@/lib/json-typescript/naming", "@/lib/json-typescript/samples",
    "@/lib/json-typescript/types", "./json-typescript.css"]);
  for (const file of ["types", "naming", "input", "engine", "samples", "worker", "client"]) {
    for (const node of nodes(tree(file), () => true)) {
      if (ts.isImportDeclaration(node)) assert.ok(allowedImports.has(literal(node.moduleSpecifier)), `${file}: unapproved static import`);
      if (ts.isExportDeclaration(node)) assert.ok(!node.moduleSpecifier, `${file}: no module re-exports`);
      if (ts.isIdentifier(node)) assert.ok(!forbidden.has(node.text), `${file}: ${node.text}`);
      if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
        assert.ok(!forbidden.has(node.argumentExpression.text), `${file}: computed capability`);
      }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        assert.doesNotMatch(access(node), /^(?:globalThis\.)?JSON\.parse$/, file);
      }
      if (ts.isCallExpression(node)) assert.ok(node.expression.kind !== ts.SyntaxKind.ImportKeyword && access(node.expression) !== "require", `${file}: dynamic import`);
    }
  }
  assert.ok(calls(tree("client"), "JSON.stringify").length > 0);
  assert.equal(literal(only(calls(tree("client"), "document.createElement"), "Local download anchor").arguments[0]), "a");
  const blob = only(calls(tree("client"), "URL.createObjectURL"), "Local blob URL").arguments[0];
  assert.ok(ts.isNewExpression(blob) && access(blob.expression) === "Blob");
  // Deliberately NOT scanning sitewide chat, SEO JSON-LD, analytics or links.
});

test("installed PostCSS parses all CSS and every rule/animation stays in the jts namespace", () => {
  let scopedRules = 0;
  css.walkAtRules((rule) => {
    assert.ok(["media", "keyframes"].includes(rule.name), `Unexpected global at-rule: ${rule.name}`);
    if (rule.name === "keyframes") assert.match(rule.params, /^jts-[a-z0-9-]+$/);
  });
  css.walkRules((rule) => {
    if (rule.parent.type === "atrule" && rule.parent.name === "keyframes") {
      assert.match(rule.selector, /^(?:from|to|\d+(?:\.\d+)?%)$/);
      return;
    }
    for (const selector of rule.selectors) {
      assert.match(selector, /^(?:\.dark\s+)?\.jts-[a-z0-9-]+(?:$|[\s.:\[>#])/i, selector);
      assert.doesNotMatch(selector, /[+~]|:global\b|:root\b|:has\(/, "No selector escape to unrelated elements");
      scopedRules++;
    }
  });
  assert.ok(scopedRules > 0);
  css.walkDecls((node) => {
    if (node.prop.startsWith("--")) assert.match(node.prop, /^--jts-/);
    assert.doesNotMatch(node.value, /url\s*\(|expression\s*\(/i, "No external CSS resources or executable expressions");
  });
});

test("CSS retains scoped dark, narrow-layout, focus-visible and reduced-motion contracts", () => {
  const rules = [];
  css.walkRules((rule) => rules.push(rule));
  const has = (selector, prop, value, media) => rules.some((rule) => rule.selectors.includes(selector)
    && (!media || (rule.parent.type === "atrule" && rule.parent.name === "media" && rule.parent.params === media))
    && rule.nodes.some((node) => node.type === "decl" && node.prop === prop && node.value === value));
  assert.ok(has(".dark .jts-page", "--jts-page-ink", "#edf3ff"));
  assert.ok(has(".dark .jts-workspace", "color-scheme", "dark"));
  for (const selector of [".jts-hero", ".jts-editors"]) assert.ok(has(selector, "grid-template-columns", "minmax(0, 1fr)", "(max-width: 800px)"));
  assert.ok(has(".jts-settings-grid", "grid-template-columns", "minmax(0, 1fr)", "(max-width: 520px)"));
  assert.ok(has(".jts-spin", "animation", "none", "(prefers-reduced-motion: reduce)"));
  assert.ok(rules.some((rule) => rule.selector.includes(":focus-visible") && rule.nodes.some((node) => node.prop === "outline" && /3px solid/.test(node.value))));
});

test("catalog JSON-to-TypeScript entry has the exact updated descriptor", () => {
  assert.deepEqual(descriptor("catalog", "json-to-typescript"), {
    slug: "json-to-typescript", name: "JSON to TypeScript Converter",
    description: "Infer interfaces or types from JSON and JSON Lines locally. Review optional fields, nulls and mixed arrays; download complete declarations.",
    category: "Formatters & Dev", icon: "FileType", color: "text-sky-500", bg: "bg-sky-500/10",
  });
});

test("chat JSON-to-TypeScript descriptor is extracted only from AST, never backend imports", () => {
  assert.deepEqual(descriptor("chat", "json-to-typescript"), {
    slug: "json-to-typescript", name: "JSON to TypeScript Converter",
    desc: "Infer interfaces or types from JSON and JSON Lines locally, with missing-field optionality, null unions, nested selection and field review. No runtime validation or AI; paste JSON in the converter, not this chat.",
    keywords: ["json", "typescript", "interface", "types", "type", "ts", "jsonl", "ndjson", "optional", "nested"],
  });
  assert.ok(!compiled.has("chat"));
});

test("llms JSON-to-TypeScript descriptor is extracted only from AST, never its DB-backed handler", () => {
  assert.deepEqual(descriptor("llms", "json-to-typescript"), {
    name: "JSON to TypeScript Converter", href: "/tools/json-to-typescript",
    desc: "Infer interfaces or types from JSON and JSON Lines locally; review optional fields, null unions and nested selections, then download complete .ts or .d.ts declarations. No runtime validation or AI",
  });
  assert.ok(!compiled.has("llms") && !compiled.has("config"));
});

test("dedicated JSON-to-CSV catalog/chat/llms entry expectations are preserved", () => {
  assert.deepEqual(descriptor("catalog", "json-to-csv"), {
    slug: "json-to-csv", name: "JSON to CSV Converter",
    description: "Convert JSON or JSON Lines to CSV locally: choose rows, flatten nested fields, expand one array and preview columns with formula-risk protection.",
    category: "Encoders & Converters", icon: "Table2", color: "text-green-500", bg: "bg-green-500/10",
  });
  assert.deepEqual(descriptor("chat", "json-to-csv"), {
    slug: "json-to-csv", name: "JSON to CSV Converter",
    desc: "Convert strict JSON or JSON Lines to CSV locally with row selection, nested-field flattening, one array expansion and formula-risk protection. No AI or URL import; paste data in the converter, not this chat.",
    keywords: ["json", "csv", "convert", "data", "export", "table", "excel", "jsonl", "ndjson", "nested", "flatten", "tsv"],
  });
  assert.deepEqual(descriptor("llms", "json-to-csv"), {
    name: "JSON to CSV Converter", href: "/tools/json-to-csv",
    desc: "Convert strict JSON or JSON Lines to CSV locally; choose rows, flatten nested fields, expand one array, edit columns and preview formula-risk protection. No AI or URL import",
  });
});

test("dedicated similarity catalog/chat/llms entry expectations are preserved", () => {
  assert.deepEqual(descriptor("catalog", "plagiarism-checker"), {
    slug: "plagiarism-checker", name: "Text Similarity Checker",
    description: "Compare a draft with up to five supplied sources, review matching phrases or repeated sentences locally. No web scan or originality verdict.",
    category: "Content Analysis", icon: "FileSearch", color: "text-rose-500", bg: "bg-rose-500/10",
  });
  assert.deepEqual(descriptor("chat", "plagiarism-checker"), {
    slug: "plagiarism-checker", name: "Text Similarity Checker",
    desc: "Compare a draft with 1–5 supplied sources or find repeated sentences locally; review phrase evidence and save TXT reports. No web scan, AI or plagiarism verdict. Paste text in the tool, not this chat.",
    keywords: ["plagiarism", "copy", "duplicate", "similarity", "check", "naqal", "cheating", "original"],
  });
  assert.deepEqual(descriptor("llms", "plagiarism-checker"), {
    name: "Text Similarity Checker", href: "/tools/plagiarism-checker",
    desc: "Compare one draft with 1–5 supplied sources locally, or find repeated sentences in a draft; review phrase evidence and save TXT reports. No web scan, AI or originality verdict",
  });
});

test("real OG function supplies valid JSX and 1200x630 options to ImageResponse, not a tested PNG", async () => {
  const image = await og.default();
  assert.strictEqual(only(pageRuntime.images, "One ImageResponse invocation"), image);
  assert.deepEqual(plain(image.options), { width: 1200, height: 630 });
  assert.equal(og.contentType, "image/png"); // Exported contract, NOT rasterization evidence.
  assert.ok(React.isValidElement(image.element));
  const markup = renderToStaticMarkup(image.element), content = visible(parseDocument(markup));
  for (const phrase of ["JSON to TypeScript", "3 FICTIONAL ACCOUNT SAMPLES", "export interface Account {",
    "id: number | string;", "email?: string | null;", "not runtime validation"]) assert.ok(content.includes(phrase), phrase);
  assert.doesNotMatch(markup, /\b(?:undefined|NaN|Infinity)\b|\[object Object\]/);
  assert.equal(elements(parseDocument(markup), (node) => ["img", "script", "iframe"].includes(node.name)).length, 0);
});