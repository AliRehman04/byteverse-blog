import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n").trim();
const sha = value => createHash("sha256").update(value).digest("hex");
const slug = "best-ai-tools-for-youtube-creators-2026";
const content = read(`scripts/content/${slug}.md`);
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: words,
  contentSha256: sha(content),
  readingTime: `${Math.ceil(words / 220)} min read`,
  tableCount: (content.match(/^\|---/gm) ?? []).length,
};
assert(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === "--metrics"));
if (process.argv[2] === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const fetchOriginal = globalThis.fetch;
const connectOriginal = Socket.prototype.connect;
const deny = () => { throw new Error("Network disabled during article validation"); };
globalThis.fetch = deny;
Socket.prototype.connect = deny;
after(() => { globalThis.fetch = fetchOriginal; Socket.prototype.connect = connectOriginal; });

const ledger = JSON.parse(read("docs/youtube-video-tools-update-2026-11-04.json"));
const target = ledger.targeting;
const sources = content.split("\n## Sources and Further Reading")[1] ?? "";

test("metadata uses the owner's recommended title, H1 and description within display limits", () => {
  assert.equal(ledger.slug, slug);
  assert.equal(target.metaTitle, "Best AI Video Creation Tools for YouTube in 2026");
  assert.equal(target.title, "Best AI Video Creation Tools for YouTube Creators in 2026");
  assert.equal(target.metaDescription, "Discover the best AI video creation tools for YouTube in 2026. Compare AI video generators, editors, voiceover tools, captions, and free options for creators.");
  assert(`${target.metaTitle} | ByteVerse`.length <= 60);
  assert(target.title.length <= 70 && target.metaDescription.length >= 120 && target.metaDescription.length <= 160);
  assert(target.excerpt.length >= 120 && target.excerpt.length <= 300);
  assert.equal(target.summary.split("|").length, 3);
  for (const query of ledger.searchConsole.queries) assert(target.keywords.includes(query.query), `Keyword field misses ${query.query}`);
  assert.equal(target.readingTime, metrics.readingTime);
  assert.equal(ledger.validation.contentSha256, metrics.contentSha256);
  assert.equal(ledger.validation.proseWords, metrics.proseWords);
  assert.equal(sha(readFileSync(resolve(root, ledger.previous.backupFile))), ledger.previous.backupSha256);
});

test("comparison table covers the requested tools with a free-option column", () => {
  const header = "| Tool | Best for | Free option? | Lowest paid plan (checked Nov 4, 2026) |";
  const table = content.split(`${header}\n|---|---|---|---|\n`)[1]?.split("\n\n")[0];
  assert(table, "Comparison table missing");
  const rows = table.split("\n").map(line => line.split("|").slice(1, -1).map(cell => cell.trim()));
  assert.deepEqual(rows.map(row => row[0]), ["Runway", "CapCut", "Descript", "OpusClip", "Canva", "ElevenLabs", "YouTube Studio"]);
  assert(rows.every(row => row.length === 4 && row.every(Boolean)));
  assert.equal(content.indexOf(header) < content.indexOf("\n## How We Checked"), true);
});

test("paid comparison rows state currency and billing without disguising annual commitments", () => {
  const rows = content.split("|---|---|---|---|\n")[1].split("\n\n")[0].split("\n");
  for (const row of rows.slice(0, 6)) {
    const price = row.split("|")[4];
    assert.match(price, /\b(?:USD|PKR)\s[\d,]+\/(?:month|year)/);
    assert.match(price, /billed (?:monthly|yearly)|monthly plan/);
  }
  assert(content.includes("USD 12/month equivalent, billed USD 144 yearly"));
  assert(content.includes("USD 16/month equivalent, billed USD 192 yearly"));
  assert(content.includes("temporary introductory offers are excluded"));
  assert(!/\$\d|\bRs\s?\d/.test(content), "Prices must use explicit ISO currency codes");
});

test("policy distinguishes AI assistance from disclosure and monetization violations", () => {
  assert(content.includes("Not every AI-assisted video needs disclosure."));
  assert(content.includes("AI-generated or meaningfully altered content that seems realistic"));
  assert(content.includes("AI use alone is not a monetization violation."));
  assert(content.includes("Original commentary, substantive editing and value for viewers matter"));
  assert(!content.includes("Only when it looks realistic."));
  assert(content.includes("Its policy also covers generated music when music is the main focus."));
});

test("search intent is answered without promising unlimited free generation", () => {
  assert(content.includes("## Choose Between Video Generation and Video Editing"));
  assert(content.includes("### Free AI Video Creation Without a Watermark"));
  assert(content.includes("not a measured weekly output promise"));
  assert(content.includes("ten complete five-second Gen-4.5 generations with 25 credits left"));
  assert.equal(Math.floor(625 / 60), 10);
  assert.equal(625 % 60, 25);
  assert(content.includes("discarded takes and retries can consume it"));
});

test("every recorded price, limit and policy fact appears verbatim and is sourced", () => {
  assert(ledger.verifiedFacts.length >= 12);
  for (const fact of ledger.verifiedFacts) {
    assert.equal(fact.checkedAt, "2026-11-04");
    assert(sources.includes(`](${fact.url})`), `Source link missing: ${fact.url}`);
    for (const phrase of fact.articlePhrases) assert(content.includes(phrase), `Article lacks verified phrase: ${phrase}`);
  }
});

test("the rewrite keeps the structure honest and drops unverifiable claims", () => {
  assert(!/^# |\ufffd|\0|<!--|\bTODO\b|\bTBD\b/m.test(content));
  assert(!/tested and ranked|unlimited voiceover|game-changer|transformative|guaranteed (?:rankings?|clicks|traffic)/i.test(content));
  assert(!/!\[/.test(content), "Generic stock photos were removed; add only accurate, credited images");
  assert(content.includes("November 4, 2026") && content.includes("We did not run paid, side-by-side output tests"));
  assert(metrics.proseWords >= 1800);
  assert.equal(metrics.tableCount, 4);
  const faqBlock = content.split("## Frequently Asked Questions")[1]?.split("\n## ")[0] ?? "";
  assert.equal((faqBlock.match(/^### /gm) ?? []).length, 5);
  const questionHeadings = content.match(/^#{2,3} .+\?\s*$/gm) ?? [];
  assert.deepEqual(questionHeadings.map(line => line.replace(/^#{2,3} /, "").trim()), ledger.faq);
});

function transpile(source, fileName) {
  const compiled = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  return compiled.outputText;
}
const appRequire = createRequire(import.meta.url);
function load(path, overrides = {}) {
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", transpile(read(path), path))(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer import: ${name}`);
    return appRequire(name);
  }, record, record.exports);
  return record.exports;
}
const all = (node, predicate) => DomUtils.findAll(predicate, node.children ?? []);
const one = (node, predicate) => { const matches = all(node, predicate); assert.equal(matches.length, 1); return matches[0]; };
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = load("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const copy = load("src/components/copy-button.tsx");
const { MarkdownRenderer } = load("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo, "@/lib/config": { siteConfig }, "@/components/copy-button": copy,
  "@/components/code-playground": { CodePlayground() { throw new Error("This article has no runnable code"); } },
});
const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: slug }));
const document = parseDocument(html);

test("actual MarkdownRenderer output has four tables, unique headings and only listed internal links", () => {
  assert.equal(all(document, node => node.name === "table").length, 4);
  assert.equal(all(document, node => ["h1", "iframe", "script", "img"].includes(node.name)).length, 0);
  const ids = all(document, node => /^h[23]$/.test(node.name)).map(node => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const internal = [...new Set(all(document, node => node.name === "a" && node.attribs.href?.startsWith("/")).map(node => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  assert(!internal.includes(`/blog/${slug}`));
  for (const link of internal.filter(href => href.startsWith("/tools/"))) {
    assert(existsSync(resolve(root, `src/app${link}/page.tsx`)), `Missing tool route ${link}`);
  }
  const external = all(document, node => node.name === "a" && node.attribs.href?.startsWith("https://"));
  assert.equal(external.length, ledger.verifiedFacts.map(fact => fact.url).filter((url, index, list) => list.indexOf(url) === index).length);
  for (const link of external) assert(link.attribs.rel.includes("noopener"));
});

test("all five visible FAQ answers exactly match the blog route's schema extractor", () => {
  const route = read("src/app/blog/[slug]/page.tsx");
  const start = route.indexOf("  const faqRegex =");
  const end = route.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const faqs = new Function("post", `${transpile(route.slice(start, end), "faq.ts")}; return faqs;`)({ content });
  const details = all(document, node => node.name === "details");
  const collapse = value => value.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map(item => item.question), ledger.faq);
  assert.deepEqual(faqs.map(item => item.question), details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))));
  assert.deepEqual(faqs.map(item => collapse(item.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
  assert(!/^#{2,3} How to /mi.test(content), "A 'How to' heading would trigger the route's HowTo schema");
});

console.log(JSON.stringify(metrics));
