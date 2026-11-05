import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

const content = readFileSync(new URL("content/unexpected-token-html-not-valid-json.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
if (mode === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const ledger = JSON.parse(readFileSync(new URL("../docs/fetch-html-json-keywords-2026-11-05.json", import.meta.url), "utf8"));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const block = heading => {
  const section = content.split(`### ${heading}\n`)[1]?.split(/\n#{2,3} /)[0];
  const code = /```(?:mjs|powershell)\n([\s\S]*?)\n```/.exec(section ?? "")?.[1];
  assert(code, `Missing article example: ${heading}`);
  return code;
};
function loadBlock(heading, fetchImpl = () => { throw new Error("Unexpected network request"); }) {
  const compiled = ts.transpileModule(block(heading), {
    fileName: "example.js", reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const exports = {};
  new Function("exports", "fetch", "require", compiled.outputText)(exports, fetchImpl, name => {
    assert.equal(name, "vite");
    return { defineConfig: config => config };
  });
  return exports;
}

const html = '<!DOCTYPE html><html><body><h1>Sign in</h1></body></html>';

test("a successful HTTP status does not make HTML parseable as JSON", async () => {
  const response = new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  assert.equal(response.ok, true);
  await assert.rejects(response.json(), SyntaxError);
});

test("an HTML error response needs a status check before JSON parsing", async () => {
  const response = new Response(html, { status: 404 });
  assert.equal(response.ok, false);
  assert.equal(response.status, 404);
  await assert.rejects(response.json(), SyntaxError);
});

test("a JSON content type cannot fix an HTML body", async () => {
  const response = new Response(html, {
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(response.json(), SyntaxError);
});

test("Response.json parses JSON regardless of the advertised media type", async () => {
  const response = new Response('{"ok":true}', {
    headers: { "content-type": "text/plain" },
  });
  assert.deepEqual(await response.json(), { ok: true });
});

test("a legitimate 204 response has no JSON body", async () => {
  const response = new Response(null, { status: 204 });
  assert.equal(response.ok, true);
  assert.equal(response.body, null);
  await assert.rejects(response.json(), SyntaxError);
});

test("reading text first consumes the body and a second read fails", async () => {
  const response = new Response('{"ok":true}');
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { ok: true });
  assert.equal(response.bodyUsed, true);
  await assert.rejects(response.json(), TypeError);
});

test("the exact eight-case article reproduction produces the displayed outcomes", async () => {
  const results = await new AsyncFunction("console", `${block("Eight-Case Reproduction")}; return results;`)({ table() {} });
  assert.deepEqual(results, [
    { name: "json-200", status: 200, ok: true, result: "parsed" },
    { name: "html-200", status: 200, ok: true, result: "SyntaxError" },
    { name: "html-404", status: 404, ok: false, result: "SyntaxError" },
    { name: "json-401", status: 401, ok: false, result: "parsed" },
    { name: "mislabeled-html", status: 200, ok: true, result: "SyntaxError" },
    { name: "empty-204", status: 204, ok: true, result: "SyntaxError" },
    { name: "truncated-json", status: 200, ok: true, result: "SyntaxError" },
    { name: "json-as-text", status: 200, ok: true, result: "parsed" },
  ]);
});

test("the exact relative-URL example distinguishes directory and root paths", () => {
  const values = [];
  new Function("console", block("Relative URL Example"))({ log: value => values.push(value) });
  assert.deepEqual(values, ["/dashboard/api/products", "/api/products"]);
});

test("the metadata probe consumes once without logging query strings or bodies", async () => {
  const response = new Response(html, { headers: { "content-type": "text/html" } });
  Object.defineProperty(response, "url", { value: "https://app.example/sign-in?code=fictional-private-value" });
  const logged = [];
  const result = await new AsyncFunction("fetch", "console", `${block("Temporary Response Probe")}; return rawBody;`)(
    async () => response, { table: value => logged.push(value) },
  );
  assert.equal(result, html);
  assert.equal(logged[0].finalEndpoint, "https://app.example/sign-in");
  assert(!JSON.stringify(logged).includes("fictional-private-value"));
  assert(!JSON.stringify(logged).includes("<!DOCTYPE"));
  assert.equal(response.bodyUsed, true);
});

test("the exact App Router function returns demo JSON and the failure branch returns 401", async () => {
  const response = loadBlock("App Router JSON Handler").GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { items: [{ id: "demo-1", name: "Notebook" }] });
  const rejected = new Function(block("Unauthenticated API Branch"))();
  assert.equal(rejected.status, 401);
  assert.deepEqual(await rejected.json(), { error: "Authentication required" });
});

test("the Vite configuration preserves the backend's api path prefix", () => {
  const config = loadBlock("Vite Proxy Configuration").default;
  assert.equal(config.server.proxy["/api"].target, "http://127.0.0.1:4100");
  assert.equal(config.server.proxy["/api"].changeOrigin, true);
  assert.equal(config.server.proxy["/api"].rewrite, undefined);
});

test("the helper accepts JSON objects, scalars and application JSON suffixes", async () => {
  for (const mediaType of ["application/json", "application/json; charset=utf-8", "Application/Problem+Json"]) {
    for (const value of [{ items: [] }, [1, 2], null, false, 0, "text"]) {
      const signal = new AbortController().signal;
      const { getJson } = loadBlock("Checked JSON GET Helper", async (url, options) => {
        assert.equal(url, "https://fixture.invalid/data");
        assert.deepEqual(options.headers, { Accept: "application/json" });
        assert.equal(options.redirect, "error");
        assert.equal(options.signal, signal);
        return new Response(JSON.stringify(value), { headers: { "content-type": mediaType } });
      });
      assert.deepEqual(await getJson("https://fixture.invalid/data", { signal }), value);
    }
  }
});

test("the helper rejects error statuses and unexpected media types before parsing", async () => {
  for (const status of [401, 404, 500]) {
    const response = new Response(html, { status, headers: { "content-type": "text/html" } });
    const { getJson } = loadBlock("Checked JSON GET Helper", async () => response);
    await assert.rejects(getJson("https://fixture.invalid/data"), new RegExp(`HTTP ${status}:`));
    assert.equal(response.bodyUsed, true);
  }
  for (const headers of [{}, { "content-type": "text/html" }, { "content-type": "text/plain+json" }]) {
    const { getJson } = loadBlock("Checked JSON GET Helper", async () => new Response('{"items":[]}', { headers }));
    await assert.rejects(getJson("https://fixture.invalid/data"), /Expected a JSON media type/);
  }
});

test("the helper handles no content but does not hide empty or malformed JSON", async () => {
  for (const status of [204, 205]) {
    const { getJson } = loadBlock("Checked JSON GET Helper", async () => new Response(null, { status }));
    assert.equal(await getJson("https://fixture.invalid/data"), null);
  }
  for (const body of ["", '{"items":[', html]) {
    const { getJson } = loadBlock("Checked JSON GET Helper", async () => new Response(body, { headers: { "content-type": "application/json" } }));
    await assert.rejects(getJson("https://fixture.invalid/data"), error => error.message === "Response body is not valid JSON" && error.cause instanceof SyntaxError);
  }
});

test("network failures and body read failures keep their original cause", async () => {
  const networkError = new TypeError("Synthetic network failure");
  const { getJson } = loadBlock("Checked JSON GET Helper", async () => { throw networkError; });
  await assert.rejects(getJson("https://fixture.invalid/data"), error => error === networkError);
  const abortError = new DOMException("Synthetic abort", "AbortError");
  const body = new ReadableStream({ start(controller) { controller.error(abortError); } });
  const reader = loadBlock("Checked JSON GET Helper", async () => new Response(body, { headers: { "content-type": "application/json" } }));
  await assert.rejects(reader.getJson("https://fixture.invalid/data"), error => error === abortError);
});

test("native Fetch follows a loopback login redirect while the exact helper rejects it", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/api/products") {
      response.writeHead(302, { Location: "/sign-in" });
      response.end();
    } else {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(html);
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${origin}/api/products`);
    assert.equal(response.status, 200);
    assert.equal(response.redirected, true);
    assert.equal(response.url, `${origin}/sign-in`);
    await assert.rejects(response.json(), SyntaxError);
    const { getJson } = loadBlock("Checked JSON GET Helper", fetch);
    await assert.rejects(getJson(`${origin}/api/products`), TypeError);
    assert.equal(block("Inspect a Local Endpoint"), 'curl.exe --include --max-time 10 --header "Accept: application/json" http://127.0.0.1:4100/api/products');
    const { stdout } = await promisify(execFile)(process.platform === "win32" ? "curl.exe" : "curl", [
      "--include", "--max-time", "10", "--header", "Accept: application/json", `${origin}/api/products`,
    ], { windowsHide: true });
    assert.match(stdout, /^HTTP\/1\.1 302/m);
    assert.match(stdout, /Location: \/sign-in/i);
    assert(!stdout.includes("<h1>Sign in</h1>"), "The article curl command must not follow the redirect");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

const appRequire = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { fileName: path, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)(name => {
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
  "@/components/code-playground": { CodePlayground() { throw new Error("Server/module examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata and slug match the focused article without invented SEO metrics", () => {
  assert.equal(ledger.slug, "unexpected-token-html-not-valid-json");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  assert.equal(ledger.validation.contentSha256, metrics.contentSha256);
  assert.equal(ledger.validation.proseWords, metrics.proseWords);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.equal(ledger.research.observations.length, 20);
  assert.equal(ledger.research.observations.filter(row => row.suggestions.length).length, 8);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/^# |\ufffd|\0|\bTODO\b|\bTBD\b/m.test(content));
});

test("real MarkdownRenderer preserves all eight code examples and three tables", () => {
  const actual = all(document, node => node.name === "pre").map(node => DomUtils.textContent(one(node, child => child.name === "code")).trim());
  const expected = [...content.matchAll(/```(?:mjs|powershell)\n([\s\S]*?)\n```/g)].map(match => match[1].trim());
  assert.equal(actual.length, 8);
  assert.deepEqual(actual, expected);
  assert.equal(all(document, node => node.name === "table").length, 3);
  assert.equal(all(document, node => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, node => /^h[23]$/.test(node.name)).map(node => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const internal = [...new Set(all(document, node => node.name === "a" && node.attribs.href?.startsWith("/")).map(node => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = all(document, node => node.name === "a" && node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map(node => node.attribs.href))].sort(), [...ledger.sources.map(source => source.url), ledger.images.coverCredit, ledger.images.inlineCredit].sort());
  assert(external.every(node => node.attribs.rel.includes("noopener")));
});

test("five visible FAQs exactly match the existing blog schema extractor", () => {
  const source = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const faqRegex =");
  const end = source.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, node => node.name === "details");
  const collapse = value => value.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map(faq => faq.question), ledger.faq);
  assert.deepEqual(details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map(faq => collapse(faq.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
});

test("real photographs have valid files, accurate captions and an explicit testing boundary", async () => {
  const image = one(document, node => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert.equal(image.attribs.loading, "eager");
  assert.match(DomUtils.textContent(one(document, node => node.name === "figcaption")), /not a screenshot.*Daniil Komov \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not as a running Vite deployment"));
  assert(content.includes("not claimed as validated by Node's Fetch implementation"));
});

console.log(`Runtime: Node ${process.version}; synthetic responses and a loopback redirect; no external API or database calls.`);
console.log(JSON.stringify(metrics));

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record the actual publication receipt before live verification");
  const articlePath = `/blog/${ledger.slug}`;
  const articleUrl = ledger.website + articlePath;
  const get = async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    assert.equal(response.status, 200, url);
    return { response, text: await response.text() };
  };
  const { response, text } = await get(articleUrl);
  const live = parseDocument(text);
  const body = one(live, node => node.name === "div" && node.attribs.class?.split(/\s+/).includes("blog-content"));
  const meta = (attribute, name) => one(live, node => node.name === "meta" && node.attribs[attribute] === name).attribs.content;
  const collapse = value => value.replace(/\s+/g, " ").trim();
  assert.equal(DomUtils.textContent(one(live, node => node.name === "h1")), ledger.targeting.title);
  assert.equal(DomUtils.textContent(one(live, node => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
  assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
  assert.equal(meta("property", "og:title"), ledger.targeting.metaTitle);
  assert.equal(meta("property", "og:description"), ledger.targeting.metaDescription);
  assert.equal(meta("name", "twitter:title"), ledger.targeting.metaTitle);
  assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
  assert.equal(one(live, node => node.name === "link" && node.attribs.rel === "canonical").attribs.href, articleUrl);
  assert(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""));
  assert(all(live, node => node.name === "meta" && node.attribs.name === "robots").every(node => !/noindex/i.test(node.attribs.content)));
  const actualBlocks = all(body, node => node.name === "pre").map(node => DomUtils.textContent(one(node, child => child.name === "code")).trim());
  const expectedBlocks = [...content.matchAll(/```(?:mjs|powershell)\n([\s\S]*?)\n```/g)].map(match => match[1].trim());
  assert.deepEqual(actualBlocks, expectedBlocks);
  assert.equal(all(body, node => node.name === "table").length, 3);
  assert.equal(all(body, node => ["script", "iframe"].includes(node.name)).length, 0);
  for (const href of ledger.internalLinks) assert(all(body, node => node.name === "a").some(node => node.attribs.href === href), `Missing live internal link: ${href}`);
  const schema = all(live, node => node.name === "script" && node.attribs.type === "application/ld+json")
    .flatMap(node => { const value = JSON.parse(DomUtils.textContent(node)); return value["@graph"] ?? [value]; });
  const articleSchema = schema.find(item => item["@type"] === "BlogPosting");
  assert.equal(articleSchema?.headline, ledger.targeting.metaTitle);
  assert.equal(articleSchema?.datePublished, ledger.publication.publishedAt);
  assert.equal(articleSchema?.author?.name, ledger.targeting.author);
  const faq = schema.find(item => item["@type"] === "FAQPage");
  const details = all(body, node => node.name === "details");
  assert.equal(details.length, 5);
  assert.deepEqual(details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faq?.mainEntity.map(item => collapse(item.acceptedAnswer.text)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
  const inline = one(body, node => node.name === "img");
  assert.equal(inline.attribs.src, ledger.images.inline);
  assert.equal(all(live, node => node.name === "meta" && node.attribs.property === "og:image")[0]?.attribs.content, ledger.images.cover);
  const cover = all(live, node => node.name === "img").find(node => (node.attribs.src ?? "").includes(encodeURIComponent(ledger.images.cover)) || node.attribs.src === ledger.images.cover);
  assert(cover, "Rendered cover image missing");
  for (const image of [cover, inline]) {
    const imageResponse = await fetch(new URL(image.attribs.src, articleUrl), { signal: AbortSignal.timeout(30000) });
    assert.equal(imageResponse.status, 200);
    assert.match(imageResponse.headers.get("content-type") ?? "", /^image\//);
    await imageResponse.body?.cancel();
  }
  console.log("PASS live article", JSON.stringify({ url: articleUrl, publishedAt: ledger.publication.publishedAt, codeBlocks: actualBlocks.length, tables: 3, faqs: 5, images: 2 }));
  const discovery = [];
  for (const path of ["/", "/blog", `/category/${ledger.targeting.categorySlug}`, `/author/${ledger.targeting.authorSlug}`, "/sitemap.xml", "/feed.xml"]) {
    const { response: indexResponse, text: indexText } = await get(ledger.website + path);
    const xml = path.endsWith(".xml");
    const index = parseDocument(indexText, { xmlMode: xml });
    const linked = xml
      ? all(index, node => ["loc", "link"].includes(node.name)).some(node => DomUtils.textContent(node).trim() === articleUrl)
      : all(index, node => node.name === "a").some(node => [articlePath, articleUrl].includes(node.attribs.href));
    discovery.push({ path, linked, cache: indexResponse.headers.get("x-vercel-cache") });
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), discovery }, null, 2));
  assert(discovery.every(item => item.linked), "Discovery pages still need the new deployment or ISR refresh");
}

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-json-parameter-needs-to-be-valid-json`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const source = parseDocument(await response.text());
  const styles = all(source, node => node.name === "link" && node.attribs.rel === "stylesheet")
    .map(node => new URL(node.attribs.href, ledger.website).href);
  assert(styles.length > 0, "Existing site stylesheet is required for a faithful preview");
  const bodyClass = one(source, node => node.name === "body").attribs.class ?? "";
  const previewCss = "html{scroll-behavior:auto}h1{overflow-wrap:anywhere;letter-spacing:0}button[aria-label='Copy code']{opacity:1;min-width:32px;min-height:32px}.preview-status{min-height:1.5em}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}main{width:100%;min-width:0}";
  const previewScript = `document.addEventListener('click',async(event)=>{const button=event.target.closest('button[aria-label="Copy code"]');if(!button)return;const code=button.closest('.group')?.querySelector('pre code');const status=document.getElementById('preview-status');if(!code)return;try{await navigator.clipboard.writeText(code.textContent);status.textContent='Code copied';}catch{status.textContent='Clipboard unavailable. Select the code to copy it.';}});`;
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: ledger.targeting.metaDescription }),
      element("base", { href: `${ledger.website}/` }),
      element("title", null, `${ledger.targeting.metaTitle} | ByteVerse Draft`),
      ...styles.map(href => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, previewCss),
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 5, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Hands typing on a laptop with code open beside a second laptop", width: 1200, height: 675, className: "preview-cover rounded-lg", fetchPriority: "high" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, `Photo: ${ledger.images.coverPhotographer} / Pexels`),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
        element("p", { id: "preview-status", role: "status", className: "preview-status text-sm text-muted-foreground" }),
      ),
      element("script", { dangerouslySetInnerHTML: { __html: previewScript } }),
    ),
  );
  const directory = new URL("../../.byteverse-fetch-json-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  console.log(`PREVIEW ${output.href}`);
  console.log("Static noindex draft using the existing site CSS; no database writes or production client scripts.");
}