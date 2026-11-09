/**
 * Offline tests for the n8n AI agent memory guide. No network, database, model or n8n instance.
 * The article's behaviour claims are checked against JavaScript ports of getSessionId (resolution,
 * errors, version 1.4 scoping), the Simple Memory singleton (one hour expiry), LangChain's window
 * buffer slice, the agent's tool turn storage and the Chat Memory Manager's simplified output;
 * the Code node example runs with emulated globals.
 *   node --test scripts/test-n8n-ai-agent-memory-post.mjs
 *   node scripts/test-n8n-ai-agent-memory-post.mjs --metrics
 *   node scripts/test-n8n-ai-agent-memory-post.mjs --live   (after publication)
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

const content = readFileSync(new URL("content/n8n-ai-agent-memory-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: words,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(words / 220)} min read`,
  codeBlocks: (content.match(/^```[^\n]+$/gm) ?? []).length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--live"].includes(mode)));
if (mode === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-ai-agent-memory-keywords-2026-11-09.json", import.meta.url), "utf8"));

// ---------------------------------------------------------------- port of utils/helpers.ts getSessionId + scoping
const SCOPING_MIN_VERSION = { memoryBufferWindow: 1.4, memoryPostgresChat: 1.4, memoryRedisChat: 1.6, memoryMongoDbChat: 1.1 };
class NodeOperationError extends Error { constructor(message, description) { super(message); this.description = description; } }
function coerceSessionIdToString(sessionId) {
  if (typeof sessionId === "string") return sessionId;
  if (typeof sessionId === "number" || typeof sessionId === "boolean") return String(sessionId);
  throw new NodeOperationError("Invalid session ID", "The session ID must be a text value");
}
function getSessionId({ node, sessionIdType, sessionKey, input, chatTriggerSessionId }) {
  let sessionId;
  if (sessionIdType === "fromInput") {
    let raw = input?.sessionId;
    if (raw === "" || raw === undefined || raw === null) raw = chatTriggerSessionId;
    if (raw === "" || raw === undefined || raw === null) {
      throw new NodeOperationError("No session ID found", "Expected to find the session ID in an input field called 'sessionId' (this is what the chat trigger node outputs). To use something else, change the 'Session ID' parameter");
    }
    sessionId = coerceSessionIdToString(raw);
  } else {
    if (sessionKey === "" || sessionKey === undefined || sessionKey === null) throw new NodeOperationError("Key parameter is empty");
    sessionId = coerceSessionIdToString(sessionKey);
  }
  const minVersion = SCOPING_MIN_VERSION[node.type];
  const scoped = minVersion === undefined ? true : (node.typeVersion ?? 0) >= minVersion;
  if (sessionIdType === "fromInput" && scoped) sessionId = `${sessionId}__${node.name.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  return sessionId;
}

test("session ID resolution follows the input field, then the Chat Trigger, then fails with the documented message", () => {
  const node = { type: "memoryBufferWindow", typeVersion: 1.3, name: "Simple Memory" };
  assert.equal(getSessionId({ node, sessionIdType: "fromInput", input: { sessionId: "abc" } }), "abc");
  assert.equal(getSessionId({ node, sessionIdType: "fromInput", input: {}, chatTriggerSessionId: "from-trigger" }), "from-trigger");
  assert.throws(() => getSessionId({ node, sessionIdType: "fromInput", input: { chatInput: "hi" } }), { message: "No session ID found", description: /input field called 'sessionId'/ });
  assert.throws(() => getSessionId({ node, sessionIdType: "customKey", sessionKey: "" }), { message: "Key parameter is empty" });
  assert.equal(getSessionId({ node, sessionIdType: "customKey", sessionKey: 123456789 }), "123456789", "a numeric Telegram chat ID is coerced to text");
  assert.throws(() => getSessionId({ node, sessionIdType: "customKey", sessionKey: { id: 1 } }), { message: "Invalid session ID", description: "The session ID must be a text value" });
});

test("version 1.4 scopes the default mode key to the sanitised node name; Define below is never scoped", () => {
  const current = { type: "memoryBufferWindow", typeVersion: 1.4, name: "Simple Memory" };
  assert.equal(getSessionId({ node: current, sessionIdType: "fromInput", input: { sessionId: "abc" } }), "abc__Simple_Memory");
  const renamed = { ...current, name: "Agent memory (prod)!" };
  assert.equal(getSessionId({ node: renamed, sessionIdType: "fromInput", input: { sessionId: "abc" } }), "abc__Agent_memory__prod__", "renaming the node changes the stored key");
  assert.equal(getSessionId({ node: current, sessionIdType: "customKey", sessionKey: "abc" }), "abc", "Define below stores the key as written");
  assert.equal(getSessionId({ node: { type: "memoryPostgresChat", typeVersion: 1.3, name: "Postgres Chat Memory" }, sessionIdType: "fromInput", input: { sessionId: "abc" } }), "abc", "older Postgres nodes are not scoped");
  assert.equal(getSessionId({ node: { type: "memoryRedisChat", typeVersion: 1.5, name: "Redis Chat Memory" }, sessionIdType: "fromInput", input: { sessionId: "abc" } }), "abc", "Redis scopes only from 1.6");
  assert.equal(getSessionId({ node: { type: "memoryRedisChat", typeVersion: 1.6, name: "Redis Chat Memory" }, sessionIdType: "fromInput", input: { sessionId: "abc" } }), "abc__Redis_Chat_Memory");
});

// ---------------------------------------------------------------- port of the Simple Memory singleton
function createSimpleMemoryStore(now) {
  const buffer = new Map();
  return {
    getMemory(key) {
      const oneHourAgo = now() - 60 * 60 * 1000;
      for (const [existing, entry] of buffer.entries()) if (entry.lastAccessed < oneHourAgo) buffer.delete(existing);
      let entry = buffer.get(key);
      if (entry) entry.lastAccessed = now();
      else { entry = { messages: [], created: now(), lastAccessed: now() }; buffer.set(key, entry); }
      return entry.messages;
    },
    size: () => buffer.size,
  };
}

test("Simple Memory keeps sessions per workflow and session and drops sessions idle for more than 60 minutes", () => {
  let clock = Date.parse("2026-11-09T09:00:00Z");
  const store = createSimpleMemoryStore(() => clock);
  store.getMemory("wf1__user-a").push("hello");
  store.getMemory("wf2__user-a");
  assert.equal(store.size(), 2, "the same session ID in another workflow is a different bucket");
  clock += 59 * 60 * 1000;
  assert.deepEqual(store.getMemory("wf1__user-a"), ["hello"], "59 minutes idle is still remembered");
  clock += 61 * 60 * 1000;
  store.getMemory("wf3__other");
  assert.equal(store.size(), 1, "sessions idle for over an hour are removed when any session is accessed");
  assert.deepEqual(store.getMemory("wf1__user-a"), [], "the user starts a fresh conversation");
});

// ---------------------------------------------------------------- port of BufferWindowMemory slice + agent tool turn storage
const windowed = (messages, k) => messages.slice(-k * 2);
function saveTurn(history, input, output, toolCalls = 0) {
  history.push({ type: "human", content: input });
  if (toolCalls > 0) {
    history.push({ type: "ai", content: "", toolCalls });
    for (let i = 0; i < toolCalls; i++) history.push({ type: "tool", content: `result ${i}` });
  }
  history.push({ type: "ai", content: output });
}

test("Context Window Length returns the last k × 2 messages, so tool calls shrink the number of remembered turns", () => {
  const plain = [];
  for (let turn = 1; turn <= 8; turn++) saveTurn(plain, `q${turn}`, `a${turn}`);
  const plainWindow = windowed(plain, 5);
  assert.equal(plainWindow.length, 10);
  assert.equal(plainWindow[0].content, "q4", "five plain turns are remembered");
  const toolHeavy = [];
  for (let turn = 1; turn <= 8; turn++) saveTurn(toolHeavy, `q${turn}`, `a${turn}`, 2);
  const toolWindow = windowed(toolHeavy, 5);
  assert.equal(toolWindow.length, 10);
  const humanTurns = toolWindow.filter((message) => message.type === "human").length;
  assert.equal(humanTurns, 2, "two tool calls per turn store five messages per turn, so only two turns fit in a window of 5");
  assert.equal(toolWindow[0].type, "human", "the cut in this fixture starts cleanly on a human message");
});

// ---------------------------------------------------------------- port of Chat Memory Manager simplifyMessages
function simplifyMessages(messages) {
  const result = [];
  let index = 0;
  while (index < messages.length) {
    const group = {};
    do {
      const message = messages[index];
      if (message.type in group) break;
      group[message.type] = message.content;
      index++;
    } while (index < messages.length);
    result.push(group);
  }
  return result;
}

test("Chat Memory Manager Get Many groups human and ai messages into one object per turn", () => {
  const history = [];
  saveTurn(history, "hi", "hello");
  saveTurn(history, "how are you", "fine");
  const simplified = simplifyMessages(history);
  assert.deepEqual(simplified, [{ human: "hi", ai: "hello" }, { human: "how are you", ai: "fine" }]);
});

// ---------------------------------------------------------------- article code examples
const blocks = [...content.matchAll(/```(mjs|txt|sql)\n([\s\S]*?)\n```/g)].map((match) => ({ lang: match[1], code: match[2] }));
test("the memory size Code node example compiles and decides whether to trim", async () => {
  const code = blocks.find((block) => block.lang === "mjs")?.code;
  assert(code);
  const compiled = ts.transpileModule(`async function example() {\n${code}\n}`, { fileName: "example.js", reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = async (messages) => await new AsyncFunction("$input", code)({ first: () => ({ json: { messages, messagesCount: messages.length } }) });
  const small = await run([{ human: "hi", ai: "hello" }]);
  assert.deepEqual(small, [{ json: { messagesCount: 1, approxTokens: 2, shouldTrim: false } }], "'hi hello' is 8 characters, about 2 tokens");
  const large = await run(Array.from({ length: 30 }, (_, index) => ({ human: "x".repeat(300) + index, ai: "y".repeat(300) })));
  assert.equal(large[0].json.messagesCount, 30);
  assert.equal(large[0].json.shouldTrim, true);
  for (const block of blocks.filter((item) => item.lang === "txt")) assert.match(block.code, /^\{\{ .+ \}\}$/m, "expression blocks are n8n expressions");
  const sql = blocks.find((block) => block.lang === "sql").code;
  assert.match(sql, /CREATE INDEX IF NOT EXISTS .* ON n8n_chat_histories \(session_id\);/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now\(\);/);
  assert.match(sql, /DELETE FROM n8n_chat_histories WHERE created_at < now\(\) - interval '30 days';/);
});

// ---------------------------------------------------------------- renderer parity
const appRequire = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { fileName: path, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return appRequire(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("Workflow examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and ledger figures match the article without invented SEO metrics", () => {
  assert.equal(ledger.slug, "n8n-ai-agent-memory-guide");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  assert.equal(ledger.validation.contentSha256, metrics.contentSha256);
  assert.equal(ledger.validation.proseWords, metrics.proseWords);
  assert.equal(ledger.validation.codeBlocks, metrics.codeBlocks);
  assert.equal(ledger.validation.tables, metrics.tables);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.equal(ledger.research.observations.length, 30);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/^# |\ufffd|\0|\bTODO\b|\bTBD\b/m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
});

test("real MarkdownRenderer preserves code blocks, tables and links", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.equal(actual.length, metrics.codeBlocks);
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const internal = [...new Set(all(document, (node) => node.name === "a" && node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = all(document, (node) => node.name === "a" && node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), [...ledger.sources.map((source) => source.url), ledger.images.coverCredit, ledger.images.inlineCredit].sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
});

test("five visible FAQs exactly match the existing blog schema extractor", () => {
  const source = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const faqRegex =");
  const end = source.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (value) => value.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("real photographs have valid files, accurate captions and an explicit testing boundary", async () => {
  const image = one(document, (node) => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert.equal(image.attribs.loading, "eager");
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*cottonbro studio \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not a substitute for running the workflows in your own instance"));
});

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record the actual publication receipt before live verification");
  const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
  test("the live article serves the exact metadata, schema, links and FAQs", async () => {
    const response = await fetch(articleUrl, { headers: { "user-agent": "Mozilla/5.0 ByteVerse live check" }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0, `Missing live internal link: ${href}`);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => { const parsed = JSON.parse(DomUtils.textContent(node)); return parsed["@graph"] ?? [parsed]; });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq);
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(all(live, (node) => node.name === "details").length, 5);
    assert.equal(all(live, (node) => node.name === "pre").length, metrics.codeBlocks);
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
  });
}

console.log(`Runtime: Node ${process.version}; session ID, scoping, expiry, window and memory manager logic ported from n8n 2.46.6 and LangChain sources; no n8n instance, model, network or database.`);
console.log(JSON.stringify(metrics));
