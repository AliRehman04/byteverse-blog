import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isIP } from "node:net";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

// Ollama source files for the cited releases are saved outside the repository and read as text.
const sourceDir = new URL("../../.byteverse-ollama-check/", import.meta.url);
const source = (release, file) => readFileSync(new URL(`src-${release}/${file}`, sourceDir), "utf8");
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/could-not-connect-to-ollama-app-is-it-running.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/ollama-could-not-connect-keywords-2026-11-17.json", import.meta.url), "utf8"));
if (process.argv.includes("--metrics")) console.log(JSON.stringify(metrics, null, 2));

const markdownTables = [];
for (const line of content.split("\n")) {
  if (!line.startsWith("|")) { if (markdownTables.at(-1)?.length) markdownTables.push([]); continue; }
  if (!markdownTables.length) markdownTables.push([]);
  markdownTables.at(-1).push(line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
}
const tables = markdownTables.filter((rows) => rows.length).map((rows) => rows.slice(2));
const [messageTable, versionTable, hostTable] = tables;
const current = "v0.40.16";
const SERVE = "could not connect to ollama server, run 'ollama serve' to start it";
const OLD = "could not connect to ollama app, is it running?";

test("draft blocks parse and FAQ structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.equal(faqSection.match(/^### /gm)?.length, ledger.faq.length);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>-]/.test(answer), "FAQ answers must survive the schema character filter");
  for (const block of blocks) assert(["txt", "bash", "powershell"].includes(block.language), block.language);
  assert(!/\u2014/.test(content), "No em dashes in published content");
  for (const paragraph of content.split("\n## Sources and Further Reading")[0].split("\n\n")) {
    if (/^[|`#\-!\d]/.test(paragraph.trim())) continue;
    assert(paragraph.trim().split(/\s+/).length <= 75, `Paragraph too long: ${paragraph.slice(0, 60)}`);
  }
  assert.equal(tables.length, 3);
});

test("saved Ollama sources are the files recorded in the ledger", () => {
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex"), hash, file);
  }
});

test("the wording history matches releases 0.7.0, 0.7.1, 0.15.4, 0.15.5 and 0.40.16", () => {
  assert(source("v0.7.0", "cmd__cmd.go").includes(`return errors.New("${OLD}")`));
  for (const release of ["v0.7.1", "v0.15.4", "v0.15.5", current]) assert(!source(release, "cmd__cmd.go").includes("is it running"), release);
  for (const release of ["v0.7.1", "v0.15.4"]) assert(source(release, "cmd__cmd.go").includes('fmt.Errorf("ollama server not responding - %w", err)'), release);
  for (const release of ["v0.15.5", current]) assert(!source(release, "cmd__cmd.go").includes("ollama server not responding"), release);
  assert(source("v0.15.4", "cmd__start_darwin.go").includes('errors.New("could not find ollama app")') && !source("v0.15.4", "cmd__start_darwin.go").includes(SERVE));
  assert(source("v0.15.5", "cmd__start_darwin.go").includes(`errors.New("${SERVE}")`));
  assert.equal(source("v0.15.5", "cmd__start_darwin.go"), source(current, "cmd__start_darwin.go"));
  assert(content.includes('Version 0.15.4 said "could not find ollama app" at this point.'));
  assert.deepEqual(versionTable.map((row) => row[0]), ["0.7.0 and older", "0.7.1 to 0.15.4", "0.15.5 and newer"]);
  assert.deepEqual(versionTable.map((row) => row[1].replaceAll("`", "")), [`Error: ${OLD}`, `Error: ollama server not responding - ${SERVE}`, `Error: ${SERVE}`]);
  assert.equal(messageTable[1][1], "Ollama 0.7.1 to 0.15.4");
  assert(!/0\.16\.0|0\.15\.0/.test(content), "Superseded version boundaries must not remain");
  // Corrected on 22 November 2026: the GitHub field published_at is the day a release entry first appeared as a pre-release,
  // not the day of the final release (the final tags of 0.7.0, 0.7.1 and 0.15.5 point at commits dated one to three days later).
  // The article therefore names the releases without dates.
  assert(content.includes('Version 0.7.1, the next release, kept the real cause') && content.includes("Version 0.15.5 dropped that prefix."));
  assert(!/21 May 2025|3 February 2026|eight days later/.test(content), "Pre-release dates must not be presented as release dates");
  // The final 0.7.0 tag points at a commit dated 14 May 2025; the article date is 17 November 2026.
  assert(Date.UTC(2026, 10, 17) >= Date.UTC(2025, 4 + 18, 14));
  assert(content.includes("at least eighteen months old"));
});

test("the connection check works as the article and the diagram describe", () => {
  const cmd = source(current, "cmd__cmd.go");
  const lines = cmd.split("\n");
  const commands = lines.flatMap((line, index) => {
    if (!/PreRunE:\s+checkServerHeartbeat/.test(line)) return [];
    for (let back = index; back > index - 60; back--) { const use = lines[back].match(/Use:\s+"([a-z]+)/); if (use) return [use[1]]; }
    return ["?"];
  });
  assert.equal(commands.length, 13);
  for (const name of ["run", "pull", "list", "ps", "show"]) assert(commands.includes(name), name);
  assert(content.includes("thirteen commands begin with the same check"));
  assert(cmd.includes('if !(strings.Contains(err.Error(), " refused") || strings.Contains(err.Error(), "could not connect")) {\n\t\t\treturn err'));
  assert(cmd.includes('fmt.Println("Warning: could not connect to a running Ollama instance")'));
  assert(cmd.includes('ln, err := net.Listen("tcp", envconfig.Host().Host)'));
  const client = source(current, "api__client.go");
  assert(client.includes("base: envconfig.Host(),") && !/ClientFromEnvironment\(\)[\s\S]{0,120}ConnectableHost/.test(client));
  assert(client.includes('c.do(ctx, http.MethodHead, "/", nil, nil)'));
  assert(source(current, "server__routes.go").includes('r.HEAD("/", func(c *gin.Context) { c.String(http.StatusOK, "Ollama is running") })'));
  const start = source(current, "cmd__start.go");
  assert(start.includes("time.After(5 * time.Second)") && start.includes("time.Tick(500 * time.Millisecond)"));
  assert.equal(start, source("v0.7.0", "cmd__start.go"), "The wait has not changed since 0.7.0");
  const windows = source(current, "cmd__start_windows.go");
  const order = ['AppName := "ollama app.exe"', "filepath.Join(filepath.Dir(exe), AppName)", 'filepath.Join(localAppData, "Ollama", AppName)', "exec.LookPath(AppName)"].map((needle) => windows.indexOf(needle));
  assert(order.every((position, index) => position > 0 && (index === 0 || position > order[index - 1])), "Windows lookup order");
  assert(windows.includes('Installer = "OllamaSetup.exe"') && windows.includes('"--hide", "--fast-startup"'));
  const darwin = source(current, "cmd__start_darwin.go");
  assert(darwin.includes("os.Readlink(exe)") && darwin.includes("Ollama\\s?\\d*.app") && darwin.includes("waitForServer(ctx, client)"));
  assert(source(current, "cmd__start_default.go").includes(`return errors.New("${SERVE}")`));
});

test("every message in the lookup table exists in the source", () => {
  const where = {
    [OLD]: source("v0.7.0", "cmd__cmd.go"),
    "ollama server not responding - ...": source("v0.7.1", "cmd__cmd.go").replace("- %w", "- ..."),
    [SERVE]: source(current, "cmd__start_default.go"),
    "timed out waiting for server to start": source(current, "cmd__start.go"),
    "could not locate ollama app": source(current, "cmd__start_windows.go"),
    "unable to start ollama app": source(current, "cmd__start_windows.go"),
    "upgrade in progress...": source(current, "cmd__start_windows.go"),
    "Warning: could not connect to a running Ollama instance": source(current, "cmd__cmd.go"),
  };
  const messages = messageTable.map((row) => row[0].replaceAll("`", ""));
  assert.equal(messages.length, 9);
  assert.equal(messages.at(-1), "bind: address already in use", "The last row is an operating system message, not Ollama text");
  for (const message of messages.slice(0, -1)) assert(where[message]?.includes(message), message);
  assert(!source("v0.7.0", "cmd__start_windows.go").includes("upgrade in progress"), "Not claimed for 0.7.0");
});

// A line-for-line JavaScript port of envconfig.Host() used only to check the table; the assertions below tie it to the source.
function ollamaHost(value) {
  let defaultPort = "11434";
  const s = value.trim();
  let scheme = "http";
  let hostport = s;
  const cut = s.indexOf("://");
  if (cut === -1) {
    if (s === "ollama.com") { scheme = "https"; hostport = "ollama.com:443"; }
  } else {
    scheme = s.slice(0, cut);
    hostport = s.slice(cut + 3);
    if (scheme === "http") defaultPort = "80";
    if (scheme === "https") defaultPort = "443";
  }
  hostport = hostport.split("/")[0];
  let host;
  let port;
  const split = /^\[([^\]]+)\]:(.*)$/.exec(hostport) ?? /^([^:[\]]*):([^:]*)$/.exec(hostport);
  if (split) { [, host, port] = split; } else {
    host = "127.0.0.1";
    port = defaultPort;
    const bare = hostport.replace(/^\[|\]$/g, "");
    if (isIP(bare)) host = bare; else if (hostport !== "") host = hostport;
  }
  if (!/^\d+$/.test(port) || Number(port) > 65535) port = defaultPort;
  return `${scheme}://${host}:${port}`;
}

test("the OLLAMA_HOST table follows the parsing code", () => {
  const config = source(current, "envconfig__config.go");
  for (const needle of ['defaultPort := "11434"', 'scheme, hostport = "http", s', 'case scheme == "http":\n\t\tdefaultPort = "80"', 'case scheme == "https":\n\t\tdefaultPort = "443"', 'host, port = "127.0.0.1", defaultPort', "host, port, err := net.SplitHostPort(hostport)"]) assert(config.includes(needle), needle);
  assert(config.includes("// connecting as a client, which fails on Windows."));
  assert.equal(hostTable.length, 6);
  for (const [value, target] of hostTable) assert.equal(ollamaHost(value === "not set" ? "" : value.replaceAll("`", "")), target.replaceAll("`", ""), value);
  assert.equal(ollamaHost("0.0.0.0:11434"), "http://0.0.0.0:11434");
  assert.equal(ollamaHost("localhost"), "http://localhost:11434");
});

test("commands and platform facts come from the official documentation", () => {
  const faq = source(current, "docs__faq.mdx");
  const troubleshooting = source(current, "docs__troubleshooting.mdx");
  const linux = source(current, "docs__linux.mdx");
  const docker = source(current, "docs__docker.mdx");
  const windows = source(current, "docs__windows.mdx");
  const code = blocks.map((block) => block.code).join("\n");
  for (const command of ["sudo systemctl start ollama", "sudo systemctl status ollama", "sudo systemctl enable ollama"]) assert(linux.includes(command) && code.includes(command), command);
  assert(linux.includes("User=ollama") && linux.includes("ExecStart=/usr/bin/ollama serve"));
  assert(troubleshooting.includes("journalctl -u ollama --no-pager --follow --pager-end") && code.includes("journalctl -u ollama --no-pager --follow --pager-end"));
  assert(troubleshooting.includes("cat ~/.ollama/logs/server.log") && content.includes("`~/.ollama/logs/server.log`"));
  assert(troubleshooting.includes("explorer %LOCALAPPDATA%\\Ollama") && content.includes("`explorer %LOCALAPPDATA%\\Ollama`"));
  assert(troubleshooting.includes("(The installer adds this to your user PATH)") && troubleshooting.includes("docker logs <container-name>"));
  assert(windows.includes("_server.log_ contains the most recent server logs") && windows.includes("_app.log_"));
  for (const command of ["docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama", "docker exec -it ollama ollama run llama3.2"]) assert(docker.includes(command) && code.includes(command), command);
  assert(faq.includes("Ollama binds 127.0.0.1 port 11434 by default."));
  assert(faq.includes('launchctl setenv OLLAMA_HOST "0.0.0.0:11434"') && faq.includes("systemctl edit ollama.service") && faq.includes("First Quit Ollama by clicking on it in the task bar."));
  assert(faq.includes("Ollama on macOS and Windows will automatically download updates.") && faq.includes("curl -fsSL https://ollama.com/install.sh | sh"));
  assert(code.includes("curl http://localhost:11434") && code.includes("netstat -ano | findstr :11434"));
  assert(code.includes("Error: listen tcp 127.0.0.1:11434: bind: address already in use"));
  assert(content.includes('"Only one usage of each socket address (protocol/network address/port) is normally permitted."'));
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
  assert.equal(ledger.slug, "could-not-connect-to-ollama-app-is-it-running");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
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
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), ledger.sources.map((item) => item.url).sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
});

const pageSource = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
// The site-wide FAQPage schema only carries the first few visible questions.
const faqSchemaLimit = Number(pageSource.match(/mainEntity: faqs\.slice\(0, (\d+)\)/)?.[1]);

test("every visible FAQ matches the existing schema extractor exactly", () => {
  const start = pageSource.indexOf("  const faqRegex =");
  const end = pageSource.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  assert.equal(faqSchemaLimit, ledger.validation.faqSchemaLimit, "FAQPage schema cap changed in page.tsx");
  const compiled = ts.transpileModule(pageSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (text) => text.replace(/\s+/g, " ").trim();
  assert.equal(details.length, ledger.faq.length);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("illustrations are original 1200x675 PNG files with an honest caption", async () => {
  const image = one(document, (node) => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert(image.attribs.alt.length > 60 && !/screenshot/i.test(image.attribs.alt));
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /based on the Ollama 0\.40\.16 source code\. Diagram by ByteVerse\./);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const file = readFileSync(new URL(`../${path}`, import.meta.url));
    const info = await sharp(file).metadata();
    assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
    assert(file.length < 200 * 1024, "Illustrations stay small");
    assert.match(path, /^public\/blog\/ollama-could-not-connect\/ollama-[a-z-]+\.png$/);
  }
  assert(content.includes("Ollama itself was not installed or run for this guide"));
  assert(content.includes("Check the result on your own machine"));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-merge-node-guide`, { signal: AbortSignal.timeout(30000) });
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 17, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Terminal mock-up showing the error could not connect to ollama app, is it running", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, "Illustration: ByteVerse"),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-ollama-preview/", import.meta.url);
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
    assert.equal(meta("name", "robots")?.includes("noindex") ?? false, false);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => {
      const schema = JSON.parse(DomUtils.textContent(node));
      return schema["@graph"] ?? [schema];
    });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq.slice(0, faqSchemaLimit));
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    const actualCode = all(live, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
    assert.deepEqual(actualCode, blocks.map((block) => block.code.trim()));
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(live, (node) => node.name === "details").length, ledger.faq.length);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0);
  });
}
