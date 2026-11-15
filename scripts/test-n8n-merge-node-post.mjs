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

const fixtureRequire = createRequire(new URL("../../.byteverse-merge-check/package.json", import.meta.url));
const alasql = fixtureRequire("alasql");
const alasqlVersion = fixtureRequire("alasql/package.json").version;
assert.equal(alasqlVersion, "4.4.0", "Recheck the SQL examples before changing the fixture version");
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/n8n-merge-node-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-merge-node-keywords-2026-11-15.json", import.meta.url), "utf8"));
const jsonBlocks = blocks.filter((block) => block.language === "json").map((block) => JSON.parse(block.code));
const sqlBlocks = blocks.filter((block) => block.language === "sql").map((block) => block.code);
const codeBlocks = blocks.filter((block) => block.language === "mjs");

// Mirrors the Merge node sandbox: one table per input, filled directly from the items.
function runSql(inputs, query, params = []) {
  const db = new alasql.Database(`t${Math.random().toString(36).slice(2)}`);
  try {
    inputs.forEach((rows, index) => {
      db.exec(`CREATE TABLE input${index + 1}`);
      db.tables[`input${index + 1}`].data = structuredClone(rows);
    });
    // The node serialises the result across the isolate boundary, which drops undefined columns.
    return JSON.parse(JSON.stringify(db.exec(query, params)));
  } finally { delete alasql.databases[db.databaseid]; }
}

test("draft blocks parse and FAQ structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert.equal(content.split("\n## Frequently Asked Questions")[1]?.split("\n## ")[0].match(/^### /gm)?.length, 5);
  for (const block of blocks) assert(["mjs", "txt", "json", "sql"].includes(block.language), block.language);
  assert.equal(jsonBlocks.length, 3);
  assert.equal(sqlBlocks.length, 4);
  assert.equal(codeBlocks.length, 1);
  assert(!/\u2014/.test(content), "No em dashes in published content");
});

if (process.argv.includes("--metrics")) console.log(JSON.stringify(metrics, null, 2));

const [appendInput1, appendInput2, dataset] = jsonBlocks;
const { customers, orders } = dataset;

test("append sample data is shaped as described", () => {
  assert.equal(appendInput1.length, 2);
  assert.equal(appendInput2.length, 1);
  assert.deepEqual([...appendInput1, ...appendInput2].map((item) => item.ticketId), ["T-301", "T-305", "T-302"]);
  assert.equal(customers.length, 3);
  assert.equal(orders.length, 3);
  assert.equal(orders.filter((order) => order.customerId === 101).length, 2);
  assert.equal(orders.filter((order) => order.customerId === 102).length, 0);
});

test("the left join keeps every customer and the inner join drops the one without orders", () => {
  const leftJoin = runSql([customers, orders], sqlBlocks[0]);
  assert.equal(leftJoin.length, 4);
  assert.deepEqual(leftJoin.map((row) => row.name), ["Ayesha Khan", "Ayesha Khan", "Daniel Reyes", "Mei Lin"]);
  assert.equal(leftJoin.find((row) => row.name === "Daniel Reyes").orderId, undefined);
  const innerJoin = runSql([customers, orders], sqlBlocks[0].replace("LEFT JOIN", "JOIN"));
  assert.equal(innerJoin.length, 3);
  assert(!innerJoin.some((row) => row.name === "Daniel Reyes"));
  assert.throws(() => runSql([customers, orders], sqlBlocks[0].replace("[total]", "total")), /Parse error/);
});

test("grouping with COALESCE returns the documented totals and null without it", () => {
  const grouped = runSql([customers, orders], sqlBlocks[1]);
  assert.deepEqual(grouped, [
    { name: "Ayesha Khan", orderCount: 2, spent: 200 },
    { name: "Daniel Reyes", orderCount: 0, spent: 0 },
    { name: "Mei Lin", orderCount: 1, spent: 45 },
  ]);
  const plain = runSql([customers, orders], sqlBlocks[1].replace("COALESCE(SUM(input2.[total]), 0)", "SUM(input2.[total])"));
  assert.equal(plain.find((row) => row.name === "Daniel Reyes").spent, null);
});

test("three inputs join and SELECT * loses a shared column while aliases keep both", () => {
  const refunds = [{ refundId: "RF-77", customerId: 103, amount: 45 }];
  const three = runSql([customers, orders, refunds], "SELECT input1.name, input2.orderId, input3.refundId FROM input1 LEFT JOIN input2 ON input1.customerId = input2.customerId LEFT JOIN input3 ON input1.customerId = input3.customerId");
  assert.equal(three.length, 4);
  assert.deepEqual(three.find((row) => row.name === "Mei Lin"), { name: "Mei Lin", orderId: "ORD-5002", refundId: "RF-77" });
  assert.deepEqual(three.find((row) => row.name === "Daniel Reyes"), { name: "Daniel Reyes" });
  const a = [{ id: 1, name: "Customer One", status: "active" }];
  const b = [{ id: 1, name: "Order One", status: "shipped" }];
  assert.deepEqual(runSql([a, b], "SELECT * FROM input1 JOIN input2 ON input1.id = input2.id"), [{ id: 1, name: "Order One", status: "shipped" }]);
  assert.deepEqual(runSql([a, b], sqlBlocks[2]), [{ customerName: "Customer One", orderName: "Order One", orderStatus: "shipped" }]);
});

test("AlaSQL equality is loose and query parameters filter as documented", () => {
  const textIds = orders.map((order) => ({ ...order, customerId: String(order.customerId) }));
  assert.equal(runSql([customers, textIds], "SELECT input1.name FROM input1 JOIN input2 ON input1.customerId = input2.customerId").length, 3);
  assert.deepEqual(runSql([customers, orders], sqlBlocks[3], ["pro", 101]), [{ customerId: 103, name: "Mei Lin", plan: "pro" }]);
  assert.throws(() => runSql([customers, orders], sqlBlocks[3].replace("[plan]", "plan"), ["pro", 101]), /Parse error/);
  assert.deepEqual(runSql([customers, []], "SELECT input1.name FROM input1 JOIN input2 ON input1.customerId = input2.customerId"), []);
  assert.equal(runSql([customers, []], "SELECT input1.name FROM input1 LEFT JOIN input2 ON input1.customerId = input2.customerId").length, 3);
});

test("the Code node append example concatenates both nodes in order", () => {
  const nodes = { "Fetch Users": customers.map((json) => ({ json })), "Fetch Orders": orders.map((json) => ({ json })) };
  const result = new Function("$", codeBlocks[0].code)((name) => ({ all: () => structuredClone(nodes[name]) }));
  assert.equal(result.length, 6);
  assert.deepEqual(result.map((item) => item.json.customerId), [101, 102, 103, 101, 103, 101]);
});

test("the Merge node source facts quoted in the article match the pinned commit", () => {
  const description = readFileSync(new URL("../../.byteverse-merge-check/src/versionDescription.ts", import.meta.url), "utf8");
  const quoted = blocks.find((block) => block.language === "txt").code.trim();
  assert(description.includes(quoted), "requiredInputs line changed");
  assert(description.includes("version: [3, 3.1, 3.2]"));
  const sql = readFileSync(new URL("../../.byteverse-merge-check/src/combineBySql.ts", import.meta.url), "utf8");
  for (const message of ["Dataset too large for the SQL sandbox", "SQL query exceeded the 30 second execution limit", "Issue while executing query"]) {
    assert(sql.includes(message));
    assert(content.includes(message));
  }
  assert(sql.includes("node.typeVersion <= 3.1 ? true : options.emptyQueryResult === 'success'"));
  const position = readFileSync(new URL("../../.byteverse-merge-check/src/combineByPosition.ts", import.meta.url), "utf8");
  assert(position.includes("Consider enabling \"Include Any Unpaired Items\""));
  assert(position.includes("default: { values: { resolveClash: 'addSuffix' } }"));
  const engine = readFileSync(new URL("../../.byteverse-merge-check/src/workflow-execute.ts", import.meta.url), "utf8");
  assert(engine.includes("return data === null ? [] : data;"));
  assert(engine.includes("nodeSuccessData![outputIndex].length !== 0 ||"));
  for (const file of ["versionDescription.ts", "combineBySql.ts", "combineByPosition.ts", "combineByFields.ts", "workflow-execute.ts"]) {
    const hash = createHash("sha256").update(readFileSync(new URL(`../../.byteverse-merge-check/src/${file}`, import.meta.url))).digest("hex");
    assert.equal(ledger.validation.sourceSha256[file], hash, file);
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
  assert.equal(ledger.slug, "n8n-merge-node-guide");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.equal(ledger.validation.alasqlVersion, alasqlVersion);
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*Wolf Art \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not a substitute for running the workflow in your own instance"));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-date-format-guide`, { signal: AbortSignal.timeout(30000) });
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 15, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "A woman reviewing spreadsheet data on a laptop beside office folders", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, `Photo: ${ledger.images.coverPhotographer} / Pexels`),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-merge-preview/", import.meta.url);
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
