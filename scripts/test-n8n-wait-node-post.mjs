/**
 * Offline tests for the n8n Wait node guide. No network, database or n8n instance.
 * The article's behaviour claims are checked against JavaScript ports of the Wait node's wake up
 * calculation and validation, putExecutionToWait (sleep or suspend), the wait tracker's selection
 * window, the waiting webhook endpoint's responses, the signature and suffix parsing and the
 * runner's timeout on resume; the Code node example runs with emulated globals.
 *   node --test scripts/test-n8n-wait-node-post.mjs
 *   node scripts/test-n8n-wait-node-post.mjs --metrics
 *   node scripts/test-n8n-wait-node-post.mjs --live   (after publication)
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

const content = readFileSync(new URL("content/n8n-wait-node-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-wait-node-keywords-2026-11-11.json", import.meta.url), "utf8"));

// ---------------------------------------------------------------- ports of n8n 2.47.4 logic
const MAX_IN_PROCESS_WAIT_MS = 65_000;
const WAIT_INDEFINITELY = new Date("3000-01-01T00:00:00.000Z");
const WAIT_FOR_SUB_EXECUTION = new Date("2999-12-31T00:00:00.000Z");
const UNIT_SECONDS = { seconds: 1, minutes: 60, hours: 3600, days: 86400 };

// Wait.node.ts execute() and configureAndPutToWait()
function planWait(parameters, now) {
  const { resume } = parameters;
  if (resume === "webhook" || resume === "form") {
    let waitTill = WAIT_INDEFINITELY;
    if (parameters.limitWaitTime === true) {
      waitTill = parameters.limitType === "afterTimeInterval"
        ? new Date(now + parameters.resumeAmount * UNIT_SECONDS[parameters.resumeUnit] * 1000)
        : new Date(parameters.maxDateAndTime);
    }
    return { waitTill, acceptsResumeRequest: true };
  }
  if (resume === "timeInterval") {
    if (!(typeof parameters.unit === "string" && Object.hasOwn(UNIT_SECONDS, parameters.unit))) throw new Error("Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'.");
    if (!(typeof parameters.amount === "number" && parameters.amount >= 0)) throw new Error("Invalid wait amount. Please enter a number that is 0 or greater.");
    return { waitTill: new Date(now + parameters.amount * UNIT_SECONDS[parameters.unit] * 1000), acceptsResumeRequest: false };
  }
  const parsed = new Date(parameters.dateTime);
  if (!parameters.dateTime || Number.isNaN(parsed.getTime())) throw new Error("Cannot put execution to wait because `dateTime` parameter is not a valid date. Please pick a specific date and time to wait until.");
  return { waitTill: parsed, acceptsResumeRequest: false };
}

// base-execute-context.ts putExecutionToWait()
function putExecutionToWait({ waitTill, acceptsResumeRequest }, now) {
  const waitMs = Math.max(waitTill.getTime() - now, 0);
  if (acceptsResumeRequest === false && waitMs < MAX_IN_PROCESS_WAIT_MS) return { mode: "sleep", waitMs, status: "running" };
  return { mode: "suspend", waitTill, status: "waiting" };
}

// execution.repository.ts getWaitingExecutions()
const selectWaiting = (rows, now) => rows.filter((row) => row.status === "waiting" && row.waitTill.getTime() <= now + 70_000).sort((a, b) => a.waitTill - b.waitTill);

// waiting-webhooks.ts parseSignatureParam(), validateToken() and executeWebhook()
function parseSignatureParam(url) {
  let token = new URL(url, "http://localhost").searchParams.get("signature") ?? undefined;
  let webhookPath;
  if (token?.includes("/")) { webhookPath = token.slice(token.indexOf("/") + 1); token = token.slice(0, token.indexOf("/")); }
  return { token, webhookPath };
}
function resumeEndpoint(execution, { method, url }) {
  const [, , executionId, routeSuffix] = new URL(url, "http://localhost").pathname.split("/");
  let suffix = routeSuffix;
  if (execution?.resumeToken) {
    const { token, webhookPath } = parseSignatureParam(url);
    if (!token || token.length !== execution.resumeToken.length || token !== execution.resumeToken) return { status: 401, body: { error: "Invalid token" } };
    if (!suffix && webhookPath) suffix = webhookPath;
  }
  if (!execution) return { status: 404, message: `The execution "${executionId}" does not exist.` };
  if (execution.waitingNode?.resume === "form") return { status: 307 };
  if (execution.status === "running") return { status: 409, message: `The execution "${executionId}" is running already.` };
  if (execution.error) return { status: 409, message: `The execution "${executionId}" has finished with error.` };
  if (execution.finished) return { status: 409, message: `The execution "${executionId} has finished already.` };
  const node = execution.waitingNode;
  if (node.httpMethod !== method || (node.webhookSuffix ?? "") !== (suffix ?? "")) {
    return { status: 404, message: `The workflow for execution "${executionId}" does not contain a waiting webhook with a matching path/method.` };
  }
  return { status: node.responseCode ?? 200, resumed: true };
}

// workflow-runner.ts timeout on resume
const remainingTimeoutMs = ({ workflowTimeout, maxTimeout = 3600, startedAt, now }) => Math.max(Math.min(workflowTimeout, maxTimeout) * 1000 - (now - startedAt), 0);

const T0 = Date.parse("2026-11-11T09:00:00.000Z");

test("timers shorter than 65 seconds sleep in the process; longer timers and every webhook or form wait are suspended", () => {
  const short = putExecutionToWait(planWait({ resume: "timeInterval", amount: 5, unit: "seconds" }, T0), T0);
  assert.deepEqual(short, { mode: "sleep", waitMs: 5000, status: "running" });
  assert.equal(putExecutionToWait(planWait({ resume: "timeInterval", amount: 64.99, unit: "seconds" }, T0), T0).mode, "sleep");
  const boundary = putExecutionToWait(planWait({ resume: "timeInterval", amount: 65, unit: "seconds" }, T0), T0);
  assert.equal(boundary.mode, "suspend");
  assert.equal(boundary.status, "waiting");
  assert.equal(putExecutionToWait(planWait({ resume: "timeInterval", amount: 0.5, unit: "minutes" }, T0), T0).waitMs, 30_000, "decimals are allowed");
  assert.equal(putExecutionToWait(planWait({ resume: "timeInterval", amount: 3, unit: "days" }, T0), T0).waitTill.toISOString(), "2026-11-14T09:00:00.000Z");
  const webhook = putExecutionToWait(planWait({ resume: "webhook", limitWaitTime: false }, T0), T0);
  assert.equal(webhook.mode, "suspend");
  assert.equal(webhook.waitTill.toISOString(), "3000-01-01T00:00:00.000Z", "no limit stores the year 3000");
  const limited = putExecutionToWait(planWait({ resume: "webhook", limitWaitTime: true, limitType: "afterTimeInterval", resumeAmount: 10, resumeUnit: "seconds" }, T0), T0);
  assert.equal(limited.mode, "suspend", "a webhook wait with a 10 second limit is still suspended");
  assert.equal(putExecutionToWait(planWait({ resume: "form", limitWaitTime: true, limitType: "atSpecifiedTime", maxDateAndTime: "2026-11-12T09:00:00.000Z" }, T0), T0).waitTill.toISOString(), "2026-11-12T09:00:00.000Z");
});

test("validation messages and past dates behave as the article says", () => {
  assert.throws(() => planWait({ resume: "timeInterval", amount: "5", unit: "seconds" }, T0), { message: "Invalid wait amount. Please enter a number that is 0 or greater." });
  assert.throws(() => planWait({ resume: "timeInterval", amount: -1, unit: "seconds" }, T0), { message: /Invalid wait amount/ });
  assert.throws(() => planWait({ resume: "timeInterval", amount: 5, unit: "Minutes" }, T0), { message: "Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'." });
  assert.throws(() => planWait({ resume: "specificTime", dateTime: "" }, T0), { message: /`dateTime` parameter is not a valid date/ });
  assert.equal(planWait({ resume: "timeInterval", amount: 0, unit: "hours" }, T0).waitTill.getTime(), T0);
  const past = putExecutionToWait(planWait({ resume: "specificTime", dateTime: "2020-01-01T00:00:00.000Z" }, T0), T0);
  assert.deepEqual(past, { mode: "sleep", waitMs: 0, status: "running" }, "a past date continues at once");
  for (const text of ["Invalid wait amount. Please enter a number that is 0 or greater.", "Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'.", "Cannot put execution to wait because `dateTime` parameter is not a valid date. Please pick a specific date and time to wait until.", "Only saved workflows can be resumed."]) {
    assert(content.includes(text), `article quotes: ${text}`);
  }
});

test("a 60 second poll with a 70 second window sees every suspended timer before it is due, and never an indefinite wait", () => {
  for (let pollOffset = 0; pollOffset < 60_000; pollOffset += 1_000) {
    for (const waitMs of [65_000, 66_000, 119_000, 3_600_000]) {
      const row = { id: "1", status: "waiting", waitTill: new Date(T0 + waitMs) };
      let seenAt = null;
      for (let poll = T0 - 60_000 + pollOffset + 1; poll <= row.waitTill.getTime(); poll += 60_000) {
        if (poll > T0 && selectWaiting([row], poll).length) { seenAt = poll; break; }
      }
      assert(seenAt !== null && seenAt <= row.waitTill.getTime(), `wait of ${waitMs} ms with poll offset ${pollOffset} must get a timer before it is due`);
    }
  }
  const rows = [
    { id: "overdue", status: "waiting", waitTill: new Date(T0 - 3_600_000) },
    { id: "soon", status: "waiting", waitTill: new Date(T0 + 69_000) },
    { id: "later", status: "waiting", waitTill: new Date(T0 + 71_000) },
    { id: "forever", status: "waiting", waitTill: WAIT_INDEFINITELY },
    { id: "parent", status: "waiting", waitTill: WAIT_FOR_SUB_EXECUTION },
    { id: "done", status: "success", waitTill: new Date(T0) },
  ];
  assert.deepEqual(selectWaiting(rows, T0).map((row) => row.id), ["overdue", "soon"], "overdue waits are picked up on the first poll after downtime");
  assert.equal(Math.max(rows[0].waitTill.getTime() - T0, 0), 0, "an overdue timer fires immediately");
});

const execution = (overrides = {}) => ({ status: "waiting", resumeToken: "5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10", waitingNode: { resume: "webhook", httpMethod: "GET" }, ...overrides });
const base = "https://n8n.example.com/webhook-waiting/48213";
const signed = `${base}?signature=5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10`;

test("the resume endpoint answers 401, 404, 409, 307 or resumes, in the order the source checks", () => {
  assert.deepEqual(resumeEndpoint(execution(), { method: "GET", url: signed }), { status: 200, resumed: true });
  assert.deepEqual(resumeEndpoint(execution(), { method: "GET", url: base }), { status: 401, body: { error: "Invalid token" } });
  assert.equal(resumeEndpoint(execution(), { method: "GET", url: `${base}?signature=wrong` }).status, 401);
  assert.equal(resumeEndpoint(execution({ resumeToken: undefined }), { method: "GET", url: base }).resumed, true, "executions created before tokens are not checked");
  assert.deepEqual(resumeEndpoint(undefined, { method: "GET", url: signed }), { status: 404, message: 'The execution "48213" does not exist.' });
  assert.deepEqual(resumeEndpoint(execution({ status: "running" }), { method: "GET", url: signed }), { status: 409, message: 'The execution "48213" is running already.' });
  assert.equal(resumeEndpoint(execution({ status: "error", error: {} }), { method: "GET", url: signed }).message, 'The execution "48213" has finished with error.');
  assert.match(resumeEndpoint(execution({ status: "success", finished: true }), { method: "GET", url: signed }).message, /has finished already\.$/);
  const wrongMethod = resumeEndpoint(execution(), { method: "POST", url: signed });
  assert.equal(wrongMethod.status, 404);
  assert.match(wrongMethod.message, /does not contain a waiting webhook with a matching path\/method\.$/);
  assert.equal(resumeEndpoint(execution({ waitingNode: { resume: "webhook", httpMethod: "POST", responseCode: 202 } }), { method: "POST", url: signed }).status, 202);
  assert.equal(resumeEndpoint(execution({ waitingNode: { resume: "form" } }), { method: "GET", url: signed }).status, 307, "a form wait called through the webhook URL is redirected");
  for (const text of ["Invalid token", "is running already", "has finished already", "has finished with error", "does not contain a waiting webhook with a matching path/method", "does not exist"]) assert(content.includes(text));
});

// ---------------------------------------------------------------- article code examples
const blocks = [...content.matchAll(/```(mjs|txt|json)\n([\s\S]*?)\n```/g)].map((match) => ({ lang: match[1], code: match[2] }));
const expressions = blocks.filter((block) => block.lang === "txt" && /^\{\{ .+ \}\}$/.test(block.code)).map((block) => block.code.slice(3, -3));

test("the suffix expression puts the suffix before the signature, and only the matching Wait node resumes", () => {
  const resumeUrl = new URL(base);
  resumeUrl.searchParams.set("signature", "5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10");
  assert.equal(resumeUrl.toString(), signed);
  assert(content.includes(signed), "the article's example URL has the real shape");
  const source = expressions.find((code) => code.includes("resumeUrl.replace"));
  const withSuffix = new Function("$execution", `return ${source}`)({ resumeUrl: signed });
  assert.equal(withSuffix, `${base}/approve?signature=5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10`);
  const approveNode = { resume: "webhook", httpMethod: "GET", webhookSuffix: "approve" };
  assert.equal(resumeEndpoint(execution({ waitingNode: approveNode }), { method: "GET", url: withSuffix }).resumed, true);
  assert.equal(resumeEndpoint(execution({ waitingNode: approveNode }), { method: "GET", url: `${signed}/approve` }).resumed, true, "the old style, suffix after the signature value, is still understood");
  assert.deepEqual(parseSignatureParam(`${signed}/approve`), { token: "5f1c0b7e9a2d4c6e8f0a1b3c5d7e9f10", webhookPath: "approve" });
  assert.equal(resumeEndpoint(execution({ waitingNode: approveNode }), { method: "GET", url: signed }).status, 404, "a call without the suffix does not end this node");
  assert.equal(resumeEndpoint(execution({ waitingNode: { resume: "webhook", httpMethod: "GET", webhookSuffix: "ship" } }), { method: "GET", url: withSuffix }).status, 404, "a stray retry cannot end the next Wait node");
});

test("a workflow timeout is measured from the original start, so a long wait uses it up", () => {
  const startedAt = T0;
  assert.equal(remainingTimeoutMs({ workflowTimeout: 600, startedAt, now: T0 + 3_600_000 }), 0, "10 minute timeout, 1 hour wait: stopped on resume");
  assert.equal(remainingTimeoutMs({ workflowTimeout: 600, startedAt, now: T0 + 120_000 }), 480_000);
  assert.equal(remainingTimeoutMs({ workflowTimeout: 86_400, startedAt, now: T0 + 1_800_000 }), 1_800_000, "the timeout is capped at the one hour default maximum");
});

test("expressions, JSON bodies, the curl call and the Code node example are valid", async () => {
  const random = expressions.find((code) => code.includes("Math.random"));
  for (let run = 0; run < 2000; run++) {
    const value = new Function(`return ${random}`)();
    assert(Number.isInteger(value) && value >= 5 && value <= 24);
  }
  assert(expressions.some((code) => code === "$now.plus({ days: 3 }).set({ hour: 9, minute: 0, second: 0 }).toISO()"));
  const json = blocks.filter((block) => block.lang === "json").map((block) => JSON.parse(block.code));
  assert.equal(json[0].callbackUrl, "{{ $execution.resumeUrl }}");
  assert.deepEqual(Object.keys(json[1]), ["headers", "params", "query", "body"]);
  const curl = blocks.find((block) => block.code.startsWith("curl "));
  assert.match(curl.code, /^curl -X POST "https:\/\/n8n\.example\.com\/webhook-waiting\/48213\?signature=[0-9a-f]{32}" /);
  assert.deepEqual(JSON.parse(curl.code.match(/-d "(.+)"$/)[1].replace(/\\"/g, '"')), json[1].body);

  const code = blocks.find((block) => block.lang === "mjs")?.code;
  assert(code);
  const compiled = ts.transpileModule(`async function example() {\n${code}\n}`, { fileName: "example.js", reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const order = { orderId: 91, total: 250 };
  const run = async (item) => await new AsyncFunction("$input", "$", code)({ first: () => ({ json: item }) }, (name) => { assert.equal(name, "Create order"); return { first: () => ({ json: order }) }; });
  assert.deepEqual(await run({ headers: {}, params: {}, query: { approved: "true" }, body: {} }), [{ json: { resumedBy: "webhook", approved: true, order } }]);
  assert.deepEqual(await run({ headers: {}, params: {}, query: {}, body: { approved: true } }), [{ json: { resumedBy: "webhook", approved: true, order } }]);
  assert.deepEqual(await run({ headers: {}, params: {}, query: { approved: "false" }, body: {} }), [{ json: { resumedBy: "webhook", approved: false, order } }]);
  assert.deepEqual(await run(order), [{ json: { resumedBy: "timeout", approved: false, order } }], "when the limit ends the wait the original items come through");
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
  assert.equal(ledger.slug, "n8n-wait-node-guide");
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*Daniil Komov \/ Pexels/);
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

console.log(`Runtime: Node ${process.version}; wake up calculation, sleep or suspend decision, tracker window, endpoint responses, suffix parsing and timeout arithmetic ported from n8n 2.47.4 sources; no n8n instance, network or database.`);
console.log(JSON.stringify(metrics));
