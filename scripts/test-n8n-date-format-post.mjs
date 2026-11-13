import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

const fixtureRequire = createRequire(new URL("../../.byteverse-n8n-item-linking-check/package.json", import.meta.url));
const { DateTime } = fixtureRequire("luxon");
const version = fixtureRequire("luxon/package.json").version;
assert.equal(version, "3.7.2", "Recheck the article examples before changing the fixture version");
const reference = DateTime.fromISO("2026-11-13T18:45:00Z", { setZone: true });
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/n8n-date-format-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const blocks = [...content.matchAll(/^```([^\n]+)\n([\s\S]*?)\n```/gm)].map((match) => ({ language: match[1], code: match[2] }));
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: wordCount,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(wordCount / 220)} min read`,
  codeBlocks: blocks.length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-date-format-keywords-2026-11-13.json", import.meta.url), "utf8"));
const jsonExamples = blocks.filter((block) => block.language === "json").map((block) => JSON.parse(block.code));
const codeExamples = blocks.filter((block) => block.language === "mjs");
const executeExample = (index, input, now = reference) => new Function("DateTime", "$input", "$now", codeExamples[index].code)(DateTime, { all: () => structuredClone(input) }, now);

test("draft JSON and JavaScript parse and FAQ structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert.equal(content.split("\n## Frequently Asked Questions")[1]?.split("\n## ")[0].match(/^### /gm)?.length, 5);
  for (const block of blocks) {
    assert(["mjs", "txt", "json"].includes(block.language));
    if (block.language === "json") JSON.parse(block.code);
    if (block.language === "mjs") assert.doesNotThrow(() => new Function("DateTime", "$input", "$now", block.code));
  }
});

if (process.argv.includes("--metrics")) console.log(JSON.stringify(metrics, null, 2));

test("format tokens distinguish month, minute, hours and literal text", () => {
  assert.equal(reference.toFormat("yyyy-MM-dd"), "2026-11-13");
  assert.equal(reference.toFormat("yyyy-mm-dd"), "2026-45-13");
  assert.equal(reference.toFormat("dd/MM/yyyy HH:mm"), "13/11/2026 18:45");
  assert.equal(reference.setLocale("en-US").toFormat("hh:mm a"), "06:45 PM");
  assert.equal(reference.toFormat("yyyy-MM-dd 'at' HH:mm"), "2026-11-13 at 18:45");
});

test("native Luxon differs from n8n-only expression shortcuts", () => {
  assert.equal(typeof reference.format, "undefined");
  assert.equal(reference.plus({ days: 7 }).toISODate(), "2026-11-20");
  assert.equal(reference.plus(7, "days").toMillis() - reference.toMillis(), 7);
  assert.equal(reference.toISO(), "2026-11-13T18:45:00.000Z");
});

test("parsing requires the source format and cannot resolve ambiguous dates by itself", () => {
  assert.equal(DateTime.fromISO("13/11/2026", { zone: "UTC" }).isValid, false);
  assert.equal(DateTime.fromFormat("13/11/2026", "dd/MM/yyyy", { zone: "UTC" }).toISODate(), "2026-11-13");
  assert.equal(DateTime.fromFormat("04/05/2026", "dd/MM/yyyy", { zone: "UTC" }).toISODate(), "2026-05-04");
  assert.equal(DateTime.fromFormat("04/05/2026", "MM/dd/yyyy", { zone: "UTC" }).toISODate(), "2026-04-05");
  const invalid = DateTime.fromFormat("31/02/2026", "dd/MM/yyyy", { zone: "UTC" });
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.toISO(), null);
  assert.equal(invalid.toFormat("yyyy-MM-dd"), "Invalid DateTime");
});

test("zone conversion keeps the instant but can change the calendar date", () => {
  const midnight = DateTime.fromISO("2026-11-13T01:30:00Z", { setZone: true });
  const newYork = midnight.setZone("America/New_York");
  assert.equal(newYork.toFormat("yyyy-MM-dd HH:mm ZZ"), "2026-11-12 20:30 -05:00");
  assert.equal(newYork.toMillis(), midnight.toMillis());
  assert.equal(DateTime.fromISO("2026-11-13T09:00:00", { zone: "Asia/Karachi" }).toUTC().toISO(), "2026-11-13T04:00:00.000Z");
  assert.notEqual(reference.setZone("America/New_York", { keepLocalTime: true }).toMillis(), reference.toMillis());
});

test("Unix seconds and milliseconds identify the same instant only with matching units", () => {
  const seconds = reference.toSeconds();
  const milliseconds = reference.toMillis();
  assert.equal(DateTime.fromSeconds(seconds, { zone: "UTC" }).toISO(), reference.toISO());
  assert.equal(DateTime.fromMillis(milliseconds, { zone: "UTC" }).toISO(), reference.toISO());
  assert.equal(DateTime.fromMillis(seconds, { zone: "UTC" }).year, 1970);
  assert.equal(DateTime.fromSeconds(0, { zone: "UTC" }).toISO(), "1970-01-01T00:00:00.000Z");
  assert.equal(Number(""), 0);
  assert.equal(Number(null), 0);
  assert.equal(Number.isFinite(Number("abc")), false);
});

test("calendar-day arithmetic and elapsed hours differ across DST", () => {
  const start = DateTime.fromISO("2026-03-07T12:00:00", { zone: "America/New_York" });
  const calendarDay = start.plus({ days: 1 });
  const elapsedDay = start.plus({ hours: 24 });
  assert.equal(calendarDay.toFormat("yyyy-MM-dd HH:mm ZZ"), "2026-03-08 12:00 -04:00");
  assert.equal(calendarDay.diff(start, "hours").hours, 23);
  assert.equal(elapsedDay.toFormat("yyyy-MM-dd HH:mm ZZ"), "2026-03-08 13:00 -04:00");
});

test("DST gaps normalize and repeated local times have two possible offsets", () => {
  const gap = DateTime.fromFormat("2026-03-08 02:30", "yyyy-MM-dd HH:mm", { zone: "America/New_York" });
  assert.equal(gap.isValid, true);
  assert.equal(gap.toFormat("yyyy-MM-dd HH:mm"), "2026-03-08 03:30");
  const repeated = DateTime.fromFormat("2026-11-01 01:30", "yyyy-MM-dd HH:mm", { zone: "America/New_York" });
  const possibilities = repeated.getPossibleOffsets();
  assert.deepEqual(possibilities.map((date) => date.offset).sort((left, right) => left - right), [-300, -240]);
  assert.equal(Math.abs(possibilities[0].toMillis() - possibilities[1].toMillis()), 3600000);
});

test("month arithmetic clamps to the month end and formatted strings are not chronology", () => {
  const endOfJanuary = DateTime.fromISO("2026-01-31T09:00:00Z", { setZone: true });
  assert.equal(endOfJanuary.plus({ months: 1 }).toISODate(), "2026-02-28");
  assert.equal(endOfJanuary.plus({ months: 1 }).plus({ months: 1 }).toISODate(), "2026-03-28");
  assert.equal(endOfJanuary.plus({ months: 2 }).toISODate(), "2026-03-31");
  const previousMonth = DateTime.fromFormat("31/10/2026", "dd/MM/yyyy", { zone: "UTC" });
  const nextMonth = DateTime.fromFormat("02/11/2026", "dd/MM/yyyy", { zone: "UTC" });
  assert("31/10/2026" > "02/11/2026");
  assert(previousMonth.toMillis() < nextMonth.toMillis());
});

console.log(JSON.stringify({ luxonVersion: version, reference: reference.toISO(), seconds: reference.toSeconds(), milliseconds: reference.toMillis(), scope: "Real locally installed Luxon with explicit zones; no n8n instance or external actions." }));

test("every expression printed in the article returns the documented value", () => {
  const input = {
    ...jsonExamples[0], ...jsonExamples[2],
    localDate: "13/11/2026", localDateTime: "13/11/2026 09:00",
  };
  const expected = new Map([
    ["DateTime.fromISO($json.eventAt, { setZone: true }).setZone('America/New_York').toFormat('dd/MM/yyyy HH:mm')", "13/11/2026 13:45"],
    ["$now.toISO()", "2026-11-13T18:45:00.000Z"],
    ["$today.toISODate()", "2026-11-13"],
    ["$now.toFormat('yyyy-MM-dd')", "2026-11-13"],
    ["$now.toFormat('dd/MM/yyyy')", "13/11/2026"],
    ["$now.plus({ days: 7 }).toISODate()", "2026-11-20"],
    ["$today.minus({ days: 7 }).toISODate()", "2026-11-06"],
    ["$now.startOf('month').plus({ months: 1 }).toISODate()", "2026-12-01"],
    ["DateTime.fromFormat($json.localDate, 'dd/MM/yyyy', { zone: 'Asia/Karachi' }).toISODate()", "2026-11-13"],
    ["DateTime.fromSeconds(Number($json.epochSeconds), { zone: 'UTC' }).toISO()", "2026-11-13T18:45:00.000Z"],
    ["DateTime.fromMillis(Number($json.epochMilliseconds), { zone: 'UTC' }).toISO()", "2026-11-13T18:45:00.000Z"],
    ["$json.eventAt", "2026-11-13T18:45:00Z"],
    ["DateTime.fromISO($json.eventAt, { setZone: true }).setLocale('en-US').toFormat('dd LLL yyyy, hh:mm a')", "13 Nov 2026, 06:45 PM"],
    ["DateTime.fromFormat($json.localDateTime, 'dd/MM/yyyy HH:mm', { zone: 'Asia/Karachi' }).toUTC().toISO()", "2026-11-13T04:00:00.000Z"],
    ["DateTime.fromISO('2026-11-13T01:30:00Z', { setZone: true }).setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm ZZ')", "2026-11-12 20:30 -05:00"],
  ]);
  const expressions = [...new Set([...content.matchAll(/\{\{ ([^\n]*?) \}\}/g)].map((match) => match[1]))];
  assert.equal(expressions.length, expected.size);
  for (const expression of expressions) {
    assert(expected.has(expression), `Unverified article expression: ${expression}`);
    const value = new Function("DateTime", "$json", "$now", "$today", `return ${expression};`)(DateTime, input, reference, reference.startOf("day"));
    assert.equal(value, expected.get(expression), expression);
  }
});

test("the exact timestamp-normalizer code preserves inputs and routes invalid dates without inventing a timestamp", () => {
  const binary = { file: { data: "YQ==", mimeType: "text/plain" } };
  const input = [{ json: jsonExamples[0], binary }, { json: { recordId: "other", eventAt: "2026-11-13T23:45:00+05:00" } }];
  const output = executeExample(0, input);
  assert.equal(output.length, 2);
  assert.deepEqual(output[0], {
    json: { ...jsonExamples[0], dateValid: true, dateError: null, eventAtUtc: reference.toISO(), eventAtDisplay: jsonExamples[1].eventAtDisplay },
    binary, pairedItem: { item: 0 },
  });
  assert.equal(output[1].json.eventAtUtc, reference.toISO());
  assert.deepEqual(output[1].pairedItem, { item: 1 });
  for (const eventAt of [null, undefined, 0, "", "  ", "2026-11-13", "2026-11-13T09:00:00", "13/11/2026", "2026-02-31T12:00:00Z", "not-a-dateT00:00Z"]) {
    const [invalid] = executeExample(0, [{ json: { eventAt } }]);
    assert.equal(invalid.json.dateValid, false);
    assert.equal(invalid.json.eventAtUtc, null);
    assert.equal(invalid.json.eventAtDisplay, null);
    assert.equal(typeof invalid.json.dateError, "string");
  }
  assert.equal(executeExample(0, [{ json: { eventAt: " 2026-11-13T18:45:00Z " } }])[0].json.dateValid, true);
});

test("the exact local-appointment code rejects impossible, skipped and ambiguous local times", () => {
  const output = executeExample(1, [
    { json: { appointmentLocal: "2026-11-13 09:00", recordId: 1 } },
    { json: { appointmentLocal: "2026-11-14 09:00", recordId: 2 } },
  ]);
  assert.equal(output[0].json.appointmentUtc, "2026-11-13T14:00:00.000Z");
  assert.equal(output[1].json.appointmentUtc, "2026-11-14T14:00:00.000Z");
  assert.deepEqual(output[1].pairedItem, { item: 1 });
  for (const appointmentLocal of ["2026-03-08 02:30", "2026-02-31 09:00", "13/11/2026 09:00"]) {
    assert.throws(() => executeExample(1, [{ json: { appointmentLocal } }]), /invalid or nonexistent local time/);
  }
  assert.throws(() => executeExample(1, [{ json: { appointmentLocal: "2026-11-01 01:30" } }]), /ambiguous local time/);
  assert.throws(() => executeExample(1, [{ json: {} }]), /appointmentLocal is required/);
});

test("the exact reporting-range code creates half-open local days across both DST transitions", () => {
  const [normal] = executeExample(2, []);
  assert.deepEqual(normal.json, { startInclusive: "2026-11-13T05:00:00.000Z", endExclusive: "2026-11-14T05:00:00.000Z" });
  for (const [instant, hours] of [["2026-03-08T18:00:00Z", 23], ["2026-11-01T18:00:00Z", 25]]) {
    const [range] = executeExample(2, [], DateTime.fromISO(instant, { setZone: true }));
    const start = DateTime.fromISO(range.json.startInclusive).toMillis();
    const end = DateTime.fromISO(range.json.endExclusive).toMillis();
    assert.equal((end - start) / 3600000, hours);
    const contains = (timestamp) => timestamp >= start && timestamp < end;
    assert.equal(contains(start), true);
    assert.equal(contains(end - 1), true);
    assert.equal(contains(end), false);
  }
});

const require = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("n8n examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and measured article figures are consistent without invented SEO metrics", () => {
  assert.equal(ledger.slug, "n8n-date-format-guide");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.equal(ledger.validation.luxonVersion, version);
  assert.equal(ledger.research.observations.length, 12);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/\ufffd|\0|\bTODO\b|\bTBD\b/.test(content));
});

test("the real renderer preserves code blocks, tables and the intended links", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), [...ledger.sources.map((source) => source.url), ledger.images.coverCredit, ledger.images.inlineCredit].sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
});

test("five visible FAQs match the existing schema extractor exactly", () => {
  const source = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const faqRegex =");
  const end = source.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (text) => text.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("photographs have valid files, credits and an honest scope disclosure", async () => {
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
  assert(content.includes("not a substitute for running the workflow in your own instance"));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-code-node-guide`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const liveDocument = parseDocument(await response.text());
  const styles = all(liveDocument, (node) => node.name === "link" && node.attribs.rel === "stylesheet")
    .map((node) => new URL(node.attribs.href, ledger.website).href);
  assert(styles.length > 0);
  const bodyClass = one(liveDocument, (node) => node.name === "body").attribs.class ?? "";
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: ledger.targeting.metaDescription }),
      element("base", { href: `${ledger.website}/` }),
      element("title", null, `${ledger.targeting.metaTitle} | ByteVerse Draft`),
      ...styles.map((href) => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, "html{scroll-behavior:auto}main{width:100%;min-width:0}h1{overflow-wrap:anywhere;letter-spacing:0}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}"),
    ),
    element("body", { className: bodyClass },
      element("header", { className: "border-b border-border" },
        element("nav", { className: "mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4", "aria-label": "Preview navigation" },
          element("a", { href: ledger.website, className: "font-bold text-xl" }, "ByteVerse"),
          element("span", { className: "text-sm text-muted-foreground" }, "Local draft"),
        ),
      ),
      element("main", { className: "mx-auto max-w-3xl px-4 sm:px-6 py-8" },
        element("article", null,
          element("p", { className: "text-sm text-primary mb-4" }, "Tech Guides"),
          element("h1", { className: "text-3xl sm:text-4xl font-extrabold leading-tight mb-6" }, ledger.targeting.title),
          element("p", { className: "text-lg text-muted-foreground leading-relaxed mb-6" }, ledger.targeting.excerpt),
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 13, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Code open on a laptop beside a cup of coffee", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, `Photo: ${ledger.images.coverPhotographer} / Pexels`),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-date-format-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "msedge", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
  const results = [];
  try {
    for (const [width, theme] of [[320, "light"], [375, "light"], [375, "dark"], [768, "light"], [1440, "light"]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
      try {
        await context.route("**/*", (route) => {
          const requestUrl = new URL(route.request().url());
          const local = requestUrl.protocol === "file:";
          const asset = requestUrl.origin === ledger.website && /\.(css|woff2?|jpg|png|webp)$/.test(requestUrl.pathname);
          return local || asset ? route.continue() : route.abort("blockedbyclient");
        });
        const preview = await context.newPage();
        const pageErrors = [];
        preview.on("pageerror", (error) => pageErrors.push(error.message));
        await preview.goto(output.href, { waitUntil: "load" });
        await preview.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
        const geometry = await preview.evaluate(async () => {
          await document.fonts.ready;
          const images = [...document.querySelectorAll("img")];
          await Promise.all(images.map((image) => image.decode()));
          const bounds = ["main", "article", "h1", ".blog-content"].map((selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return { selector, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          });
          const scrollers = [...document.querySelectorAll("table")].map((table) => {
            const parent = table.parentElement;
            parent.scrollLeft = parent.scrollWidth;
            const result = { width: parent.clientWidth, content: parent.scrollWidth, scroll: parent.scrollLeft };
            parent.scrollLeft = 0;
            return result;
          });
          return { overflow: document.documentElement.scrollWidth - innerWidth, bounds, images: images.length, scrollers };
        });
        assert(geometry.overflow <= 1, `${width}: horizontal page overflow`);
        assert.equal(geometry.images, 2);
        for (const bound of geometry.bounds) assert(bound.width > 0 && bound.height > 0 && bound.left >= -1 && bound.right <= width + 1, `${width}: ${bound.selector} is hidden or overflows`);
        assert.equal(geometry.scrollers.length, metrics.tables);
        for (const scroll of geometry.scrollers) if (scroll.content > scroll.width + 1) assert(scroll.scroll > 0, "An overflowing table must scroll");
        assert.equal(await preview.locator("pre").count(), metrics.codeBlocks);
        const question = preview.locator("details").first().locator("summary");
        await question.focus();
        await preview.keyboard.press("Enter");
        assert.equal(await preview.locator("details").first().evaluate((node) => node.open), true);
        await preview.evaluate(() => window.scrollTo(0, 0));
        await preview.screenshot({ path: fileURLToPath(new URL(`preview-${width}-${theme}.png`, directory)) });
        assert.deepEqual(pageErrors, []);
        results.push({ width, theme, overflow: geometry.overflow, images: geometry.images, tables: geometry.scrollers.length, faqKeyboard: "pass" });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ preview: output.href, results, scope: "Static noindex article preview using existing renderer and public CSS. No production scripts or database writes; copy buttons are inert here." }));
}

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record an approved publication before live verification");
  const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
  test("live article metadata, schema and body match the approved draft", async () => {
    const response = await fetch(articleUrl, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => {
      const schema = JSON.parse(DomUtils.textContent(node));
      return schema["@graph"] ?? [schema];
    });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq);
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    const actualCode = all(live, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
    assert.deepEqual(actualCode, blocks.map((block) => block.code.trim()));
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(live, (node) => node.name === "details").length, 5);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0);
  });
}