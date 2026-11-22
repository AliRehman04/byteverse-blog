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

// Ollama source files, saved GitHub issue pages and the Hugging Face guide live outside the repository and are read as text.
const sourceDir = new URL("../../.byteverse-ollama-check/", import.meta.url);
const saved = (file) => readFileSync(new URL(file, sourceDir), "utf8");
const source = (release, file) => saved(`src-${release}/${file}`);
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/ollama-pull-model-manifest-error.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const blocks = [...content.matchAll(/^```([^\n]+)\n([\s\S]*?)\n```/gm)].map((match) => ({ language: match[1], code: match[2] }));
const code = blocks.map((block) => block.code).join("\n");
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: wordCount,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(wordCount / 220)} min read`,
  codeBlocks: blocks.length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const ledger = JSON.parse(readFileSync(new URL("../docs/ollama-pull-manifest-keywords-2026-11-22.json", import.meta.url), "utf8"));
const sha = (file) => createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex");
if (mode === "--metrics") console.log(JSON.stringify({ ...metrics, sourceSha256: Object.fromEntries(Object.keys(ledger.validation.sourceSha256).map((file) => [file, sha(file)])) }, null, 2));

const markdownTables = [];
for (const line of content.split("\n")) {
  if (!line.startsWith("|")) { if (markdownTables.at(-1)?.length) markdownTables.push([]); continue; }
  if (!markdownTables.length) markdownTables.push([]);
  markdownTables.at(-1).push(line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
}
const tables = markdownTables.filter((rows) => rows.length).map((rows) => rows.slice(2));
const [lookupTable, probeTable, folderTable] = tables;
const current = "v0.40.17";
const images = source(current, "server__images.go");
const cmd = source(current, "cmd__cmd.go");
const probes = (name) => JSON.parse(readFileSync(new URL(`../docs/content-research/2026-11-22-registry-probes-${name}.json`, import.meta.url), "utf8")).results;
const currentRun = Object.fromEntries(probes("f").map((item) => [item.label, item]));
const legacyRun = Object.fromEntries(probes("e").map((item) => [item.label, item]));

test("draft blocks parse and FAQ structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert.equal((content.split("\n## Frequently Asked Questions")[0].match(/^### /gm) ?? []).length, 0, "H3 headings are reserved for FAQ questions");
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

test("saved sources are the files recorded in the ledger", () => {
  assert(Object.keys(ledger.validation.sourceSha256).length >= 25);
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) assert.equal(sha(file), hash, file);
  assert.equal(source("v0.40.16", "server__images.go"), images, "The pull code did not change between 0.40.16 and 0.40.17");
});

test("the message format, name defaults and token step are in the 0.40.17 source", () => {
  assert(images.includes('fn(api.ProgressResponse{Status: "pulling manifest"})\n\n\tmf, manifestData, err := pullModelManifest(ctx, n, regOpts)\n\tif err != nil {\n\t\treturn fmt.Errorf("pull model manifest: %s", err)'));
  assert(images.includes('requestURL := n.BaseURL().JoinPath("v2", n.DisplayNamespaceModel(), "manifests", n.Tag)'));
  assert(images.includes("case resp.StatusCode == http.StatusNotFound:\n\t\t\tresp.Body.Close()\n\t\t\treturn nil, os.ErrNotExist"));
  assert(images.includes('return nil, fmt.Errorf("%d: %s", resp.StatusCode, responseBody)'));
  assert(images.includes('var errUnauthorized = errors.New("unauthorized: access denied")') && images.includes("for range 2 {"));
  assert(images.includes("token, err := getAuthorizationToken(ctx, challenge, requestURL.Host)"));
  assert(images.includes('slog.Info(fmt.Sprintf("request failed: %v", err))') && content.includes('logged with the words "request failed"'));
  assert(images.includes('req.Header.Set("User-Agent", fmt.Sprintf("ollama/%s (%s %s) Go/%s", version.Version, runtime.GOARCH, runtime.GOOS, runtime.Version()))'));
  const name = source(current, "types__model__name.go");
  for (const needle of ['defaultHost           = "registry.ollama.ai"', 'defaultNamespace      = "library"', 'defaultTag            = "latest"', 'defaultProtocolScheme = "https"']) assert(name.includes(needle), needle);
  assert(code.includes("https://registry.ollama.ai/v2/library/llama3.2/manifests/latest"));
  const routes = source(current, "server__routes.go");
  assert.equal(routes.match(/PullModel\(/g).length, 1, "Only the pull handler of the server starts a registry pull");
  assert(!source(current, "server__create.go").includes("PullModel("), "ollama create is not claimed to pull");
  assert(!/ollama create/.test(content));
  assert(cmd.includes('info, name, err := showOrPullModel(cmd, client, args[0], opts.Runner, insecure, "run")'));
  assert(cmd.includes("if !errors.As(err, &se) || se.StatusCode != http.StatusNotFound || modelref.HasExplicitCloudSource(name) {\n\t\treturn nil, name, err"));
  const suggest = source(current, "cmd__cloud_suggest.go");
  assert(suggest.includes('const pullModelNotFoundMessage = "pull model manifest: file does not exist"'));
  assert(suggest.includes('confirmCloudSuggestion(fmt.Sprintf("Did you mean %q?", cloudName))') && content.includes('`Did you mean "name:cloud"?`'));
  assert(suggest.includes("is available as a cloud model. Try:") && suggest.includes("if modelref.HasExplicitTag(ref.Base) {\n\t\treturn \"\", false"));
  assert(cmd.includes('fmt.Printf("ollama version is %s\\n", serverVersion)') && cmd.includes('fmt.Printf("Warning: client version is %s\\n", version.Version)'));
  assert(content.includes('an "ollama version is" line and a "Warning: client version is" line'));
  const download = source(current, "server__download.go");
  assert(download.includes("const maxRetries = 6") && download.includes('errMaxRetriesExceeded   = errors.New("max retries exceeded")') && download.includes("for try := 0; try < maxRetries; try++ {"));
  assert(content.includes("when one part of the download has failed six times"));
});

test("the key handling and the realm host check match the source and the cited releases", () => {
  assert(cmd.includes("func RunServer(_ *cobra.Command, _ []string) error {\n\tif err := initializeKeypair(); err != nil {"));
  assert(cmd.includes('privKeyPath := filepath.Join(home, ".ollama", "id_ed25519")') && cmd.includes("_, err = os.Stat(privKeyPath)\n\tif os.IsNotExist(err) {"));
  const auth = source(current, "auth__auth.go");
  assert(auth.includes('const defaultPrivateKey = "id_ed25519"') && auth.includes('keyPath := filepath.Join(home, ".ollama", defaultPrivateKey)') && auth.includes("privateKey, err := ssh.ParsePrivateKey(privateKeyFile)"));
  assert(source(current, "go.mod").includes("golang.org/x/crypto v0.58.0"));
  assert(saved("src-golang__crypto-v0.58.0/ssh__keys.go").includes('block, _ := pem.Decode(pemBytes)\n\tif block == nil {\n\t\treturn nil, errors.New("ssh: no key found")'));
  const token = source(current, "server__auth.go");
  assert(token.includes("signature, err := auth.Sign(ctx, data)"));
  const check = 'return "", fmt.Errorf("realm host %q does not match original host %q", redirectURL.Host, originalHost)';
  assert(token.includes(check) && source("v0.14.3", "server__auth.go").includes(check) && !source("v0.14.2", "server__auth.go").includes("does not match original host"));
  assert(source("v0.14.2", "server__auth.go").includes('return "", fmt.Errorf("%d: %s", response.StatusCode, body)'));
  assert(content.includes("Up to 0.14.2") && content.includes("From 0.14.3") && lookupTable.some((row) => row[1] === "The same situation on Ollama 0.14.3 and newer"));
  const list = 'headers.Set("Accept", strings.Join([]string{manifest.MediaTypeManifestList, manifest.MediaTypeManifest}, ", "))';
  const legacy = 'headers.Set("Accept", "application/vnd.docker.distribution.manifest.v2+json")';
  for (const release of ["v0.1.30", "v0.20.0", "v0.35.1"]) assert(source(release, "server__images.go").includes(legacy), release);
  for (const release of ["v0.40.0", "v0.40.16", current]) assert(source(release, "server__images.go").includes(list), release);
  assert(source(current, "scripts__install.sh").includes("useradd -r -s /bin/false -U -m -d /usr/share/ollama ollama"));
});

test("every row of the test table is a recorded registry answer", () => {
  const all = [...Object.values(currentRun), ...Object.values(legacyRun)];
  assert.equal(all.length, 22);
  assert(content.includes("come from 22 test requests"));
  const listAccept = "application/vnd.ollama.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json";
  for (const item of Object.values(currentRun)) assert.equal(item.accept, listAccept, item.label);
  for (const item of Object.values(legacyRun)) assert.equal(item.accept, "application/vnd.docker.distribution.manifest.v2+json", item.label);
  const official = all.filter((item) => item.url.startsWith("https://registry.ollama.ai/"));
  assert.equal(official.length, 17);
  for (const item of official) {
    assert(/^ollama\/\d/.test(item.agent), item.label);
    assert.equal(item.firstStatus, 401, item.label);
    assert.equal(item.challenge, 'Bearer realm="https://registry.ollama.ai/v2/token",service="ollama",scope="-"', item.label);
    assert.equal(item.tokenStatus, 200, item.label);
  }
  const status = (item) => item.status;
  const expected = [
    ["`llama3.2`", currentRun.exists, 200],
    ["`llama3.2:99b`, a tag that does not exist", currentRun["bad-tag"], 404],
    ["`llama3.2x-notreal`, a name that does not exist", currentRun["bad-name"], 404],
    ["`Llama3.2` with a capital L", currentRun.uppercase, 200],
    ["`gemma4`, sent the way Ollama 0.20.0 sends it", legacyRun["gemma4-0.20.0-legacy"], 412],
    ["`gemma4`, sent the way Ollama 0.35.1 sends it", legacyRun["gemma4-0.35.1-legacy"], 200],
    ["`llama3.2`, sent the way Ollama 0.1.30 sends it", legacyRun["llama3.2-0.1.30-legacy"], 200],
    ["`hf.co/openai-community/gpt2`", currentRun["hf-not-gguf"], 400],
    ["`hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF:Q99_Z`", currentRun["hf-bad-quant"], 400],
    ["`hf.co/nouser-zz91/nomodel-zz91`, which does not exist", currentRun["hf-missing"], 401],
  ];
  assert.equal(probeTable.length, expected.length);
  for (const [index, [request, record, code]] of expected.entries()) {
    assert.equal(probeTable[index][0], request);
    assert.equal(status(record), code, request);
    assert(probeTable[index][1].startsWith(String(code)), request);
    const [, model, tag] = /^`(?:hf\.co\/)?([^`:]+)(?::([^`]+))?`/.exec(request);
    assert(record.url.endsWith(`/${model}/manifests/${tag ?? "latest"}`), record.url);
  }
  assert.match(legacyRun["gemma4-0.20.0-legacy"].agent, /^ollama\/0\.20\.0 /);
  assert.match(legacyRun["gemma4-0.35.1-legacy"].agent, /^ollama\/0\.35\.1 /);
  assert.match(legacyRun["llama3.2-0.1.30-legacy"].agent, /^ollama\/0\.1\.30 /);
  for (const label of ["bad-tag", "bad-name"]) assert(currentRun[label].body.includes("MANIFEST_UNKNOWN"));
  assert.equal(currentRun.exists.bodyLength, 1005);
  assert(content.includes("was 1,005 bytes long"));
  // The 412 block is the source format plus the body the registry sent.
  const body412 = legacyRun["gemma4-0.20.0-legacy"].body;
  const block412 = blocks.find((block) => block.code.includes("412:")).code;
  assert.equal(block412, `Error: pull model manifest: 412:${body412}`.trimEnd());
  // Hugging Face replies, token host and the working tag.
  const replies = blocks.find((block) => block.code.startsWith("400: ")).code.split("\n");
  assert.deepEqual(replies, [`400: ${currentRun["hf-not-gguf"].body}`, `400: ${currentRun["hf-bad-quant"].body}`, `401: ${currentRun["hf-missing"].body}`]);
  assert.equal(currentRun["hf-quant-ok"].status, 200);
  assert(currentRun["hf-quant-ok"].url.endsWith("/manifests/Q8_0"));
  for (const label of ["hf-missing", "hf-full-host-missing"]) assert.match(legacyRun[label]?.challenge ?? currentRun[label].challenge, /^Basic realm="https:\/\/huggingface\.co\/api\/models\//);
  assert(code.includes('Error: pull model manifest: realm host "huggingface.co" does not match original host "hf.co"'));
});

const decode = (html) => html.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&").replace(/\\"/g, '"')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

test("quoted GitHub issue lines are in the saved issue pages", () => {
  const issue = (number) => decode(saved(`issues/${number}.html`));
  const network = blocks.find((block) => block.code.includes("i/o timeout")).code.split("\n");
  assert.equal(network.length, 2);
  assert(issue(2818).includes(network[0]), "issue 2818");
  assert(issue(1798).includes(network[1]), "issue 1798");
  assert(issue(8045).includes('Error: pull model manifest: 401: {"error":"Invalid username or password."}'));
  assert(issue(15661).includes('Error: pull model manifest: realm host "huggingface.co" does not match original host "hf.co"') && /"state":"OPEN"/.test(saved("issues/15661.html")));
  assert(issue(17361).includes('realm host "ollama.com" does not match original host "registry.ollama.ai"') && issue(17361).includes("The error stopped happening."));
  assert(issue(10412).includes("after deleting that SSH key"));
});

test("commands and settings come from the official documentation", () => {
  const faq = source(current, "docs__faq.mdx");
  const troubleshooting = source(current, "docs__troubleshooting.mdx");
  assert(faq.includes('click "Restart to update" to apply the update') && faq.includes("On Linux, re-run the install script:\n\n```shell\ncurl -fsSL https://ollama.com/install.sh | sh"));
  assert(code.includes("curl -fsSL https://ollama.com/install.sh | sh"));
  assert(faq.includes("Use the preview channel to install the latest pre-release."));
  assert(faq.includes("Use `HTTPS_PROXY` to redirect outbound requests through the proxy. Ensure the proxy certificate is installed as a system certificate."));
  assert(faq.includes("Avoid setting `HTTP_PROXY`.") && faq.includes("-e HTTPS_PROXY=https://proxy.example.com"));
  assert(faq.includes("FROM ollama/ollama\nCOPY my-ca.pem /usr/local/share/ca-certificates/my-ca.crt\nRUN update-ca-certificates") && code.includes("FROM ollama/ollama\nCOPY my-ca.pem /usr/local/share/ca-certificates/my-ca.crt\nRUN update-ca-certificates"));
  assert(faq.includes("systemctl edit ollama.service") && faq.includes("systemctl daemon-reload") && faq.includes("systemctl restart ollama") && code.includes('[Service]\nEnvironment="HTTPS_PROXY=https://proxy.example.com"'));
  assert(faq.includes("Pull private models from Ollama to your machine") && faq.includes("ollama signin"));
  for (const path of ["`~/.ollama/id_ed25519.pub`", "`/usr/share/ollama/.ollama/id_ed25519.pub`", "`C:\\Users\\<username>\\.ollama\\id_ed25519.pub`"]) assert(faq.includes(path), path);
  assert.deepEqual(folderTable.map((row) => row[1]), ["`C:\\Users\\<username>\\.ollama`", "`~/.ollama`", "`/usr/share/ollama/.ollama`", "`/root/.ollama` inside the container"]);
  assert(source(current, "docs__docker.mdx").includes("-v ollama:/root/.ollama"));
  assert(troubleshooting.includes("journalctl -u ollama --no-pager --follow --pager-end") && troubleshooting.includes("explorer %LOCALAPPDATA%\\Ollama"));
  const guide = saved("docs-other/huggingface-docs-hub-ollama.html").replace(/<[^>]+>/g, "");
  assert(guide.includes("ollama run hf.co/{username}/{repository}") && guide.includes("Please note that you can use both") && guide.includes("Add new SSH key"));
  assert(code.includes("curl -I https://registry.ollama.ai/v2/library/llama3.2/manifests/latest") && content.includes("`HTTP/1.1 200 OK`"));
  assert(code.includes('Rename-Item "$env:USERPROFILE\\.ollama\\id_ed25519" id_ed25519.bak'));
  assert.equal(lookupTable.length, 11);
});

const require = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(text, {
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
  "@/components/code-playground": { CodePlayground() { throw new Error("Terminal examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and measured article figures are consistent without invented SEO metrics", () => {
  assert.equal(ledger.slug, "ollama-pull-model-manifest-error");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 60);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/\ufffd|\0|\bTODO\b|\bTBD\b/.test(content));
  assert(content.startsWith('**"Error: pull model manifest"'), "The primary keyword opens the article");
  assert(!/published_at|released on \d/.test(content), "No release dates taken from the GitHub publish field");
});

test("the real renderer preserves code blocks, tables and the intended links", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const cells = all(document, (node) => node.name === "td").map((node) => DomUtils.textContent(node));
  assert(cells.includes("C:\\Users\\<username>\\.ollama"), "The Windows path keeps its placeholder");
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /based on the Ollama 0\.40\.17 source code and registry answers on 22 November 2026\. Diagram by ByteVerse\./);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const file = readFileSync(new URL(`../${path}`, import.meta.url));
    const info = await sharp(file).metadata();
    assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
    assert(file.length < 200 * 1024, "Illustrations stay small");
    assert.match(path, /^public\/blog\/ollama-pull-manifest\/ollama-pull-manifest-[a-z-]+\.png$/);
  }
  assert(content.includes("Ollama was not installed for this article, which is why it has no screenshots."));
  assert(content.includes("treat the test table as a snapshot of one day"));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-merge-node-guide`, { signal: AbortSignal.timeout(60000) });
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 22, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Terminal mock-up showing the error pull model manifest: file does not exist", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, "Illustration: ByteVerse"),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-ollama-pull-preview/", import.meta.url);
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
        if (width === 375 && theme === "light") {
          await preview.locator(".blog-content table").first().scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-lookup.png", directory)) });
          await preview.locator(".blog-content img").scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-diagram.png", directory)) });
        }
        if (width === 1440) {
          await preview.locator(".blog-content table").first().scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-1440-lookup.png", directory)) });
        }
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
    const response = await fetch(articleUrl, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    assert.equal(meta("name", "robots")?.includes("noindex") ?? false, false);
    assert.equal(meta("property", "og:image"), ledger.images.cover);
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
