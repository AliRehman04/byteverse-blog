import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import ts from "typescript";

// Checks the 23 November 2026 rewrite of post 235 against the saved Ollama 0.40.17 sources, the real renderer and, with --live, the deployed page.
// Ollama source files, docs and issue pages live outside the repository and are read as text.
const evidenceDir = new URL("../../.byteverse-ollama-check/", import.meta.url);
const saved = (file) => readFileSync(new URL(file, evidenceDir), "utf8");
const src = (file) => saved(`src-v0.40.17/${file}`);
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const record = JSON.parse(readFileSync(new URL("../docs/ollama-gpu-update-2026-11-23.json", import.meta.url), "utf8"));
const content = readFileSync(new URL(`../${record.contentFile}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const blocks = [...content.matchAll(/^```([^\n]+)\n([\s\S]*?)\n```/gm)].map((match) => ({ language: match[1], code: match[2] }));
const code = blocks.map((block) => block.code).join("\n");
const body = content.split("\n## Sources and Image Credits")[0];
const prose = body.replace(/```[\s\S]*?```/g, "").replace(/!\[[^\]]*\]\([^\n]+\)/g, "").replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  words,
  sha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(words / 220)} min read`,
  codeBlocks: blocks.length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
if (mode === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }

const tables = [];
for (const line of content.split("\n")) {
  if (!line.startsWith("|")) { if (tables.at(-1)?.length) tables.push([]); continue; }
  if (!tables.length) tables.push([]);
  tables.at(-1).push(line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
}
const [processorTable, logTable, supportTable] = tables.filter((rows) => rows.length).map((rows) => rows.slice(2));

test("structure follows the blog conventions", () => {
  assert(content.startsWith("**If Ollama is not using your GPU on Windows, load a model and run `ollama ps`."), "The primary keyword opens the article");
  assert(!/^# /m.test(content));
  const headings = content.match(/^## .+$/gm);
  assert(headings.every((heading) => !heading.endsWith("?")), "Only FAQ questions may end with a question mark");
  assert.deepEqual(headings.filter((heading) => /^## Fix \d+: /.test(heading)).map((heading) => Number(heading.match(/\d+/)[0])), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert(!/^#{2,3} How to /mi.test(content), "No HowTo-style headings");
  assert.equal((content.split("\n## Frequently Asked Questions")[0].match(/^### /gm) ?? []).length, 0, "H3 headings are reserved for FAQ questions");
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.deepEqual([...faqSection.matchAll(/^### (.+)$/gm)].map((match) => match[1]), record.faq);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>-]/.test(answer), "FAQ answers must survive the schema character filter");
  for (const block of blocks) assert(["txt", "bash", "powershell"].includes(block.language), block.language);
  assert(!/[\u2013\u2014\u2010\u2011\u00a0\u202f\u200b\ufffd\0]|\bTODO\b|\bTBD\b/.test(content), "No dashes, look-alike characters or placeholders");
  for (const paragraph of body.split("\n\n")) {
    if (/^[|`#\-!\d]/.test(paragraph.trim())) continue;
    assert(paragraph.trim().split(/\s+/).length <= 75, `Paragraph too long: ${paragraph.slice(0, 60)}`);
  }
  assert.equal(metrics.tables, 3);
  assert.equal(processorTable.length, 5);
  assert.equal(logTable.length, 8);
  assert.equal(supportTable.length, 6);
});

test("metadata and the record agree with the measured article", () => {
  const { targeting } = record;
  assert.equal(record.slug, "ollama-not-using-gpu-windows-2026");
  assert.equal(record.postId, 235);
  assert.equal(record.previous.post.slug, record.slug);
  assert.equal(record.previous.post.title, "Ollama Not Using GPU on Windows? 7 Checks Before Reinstalling");
  assert([...targeting.title].length <= 60);
  assert([...`${targeting.metaTitle} | ByteVerse`].length <= 60, "The meta title must not be cut off with the site suffix");
  assert(targeting.metaDescription.length >= 120 && targeting.metaDescription.length <= 160);
  assert(targeting.excerpt.length >= 120 && targeting.excerpt.length <= 300);
  assert.equal(targeting.summary.split("|").length, 3);
  assert.equal(targeting.author, record.previous.post.author);
  assert.equal(targeting.readingTime, metrics.readingTime);
  for (const key of ["words", "sha256", "codeBlocks", "tables"]) assert.equal(record.validation[key], metrics[key], key);
  const photo = (text) => text.match(/^!\[[^\n]+$/gm);
  assert.deepEqual(photo(content), photo(record.previous.post.content), "The inline photo and its caption are kept unchanged");
  assert(content.includes("Ollama was not installed for this article, which is why it has no screenshots."));
  assert(content.includes("[Andrey Matveev](https://www.pexels.com/@zeleboba/)"), "Photo credit kept");
});

test("saved evidence files are the ones recorded", () => {
  assert(Object.keys(record.validation.sourceSha256).length >= 24);
  for (const [file, hash] of Object.entries(record.validation.sourceSha256)) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(file, evidenceDir))).digest("hex"), hash, file);
  }
});

test("every server.log message in the article is written by the 0.40.17 source", () => {
  const sources = ["discover__cuda_compat.go", "discover__llama_server.go", "discover__runner.go", "discover__amd.go"].map(src).join("\n");
  const quoted = logTable.map((row) => [...row[0].matchAll(/`([^`]+)`/g)].map((match) => match[1]).filter((text) => !text.startsWith("required_driver") && !text.startsWith('"')));
  assert.equal(quoted.flat().length, 9);
  for (const message of quoted.flat()) assert(sources.includes(message), `Not in the source: ${message}`);
  const compat = src("discover__cuda_compat.go");
  assert(compat.includes('"required_driver", "550 or newer"') && compat.includes('"required_driver", "570 or newer"'));
  assert(compat.includes("dev.ComputeMajor < 7"), "The 570 floor applies to compute capability below 7");
  const types = src("discover__types.go");
  for (const field of ['"id", "cpu"', '"library", "cpu"', '"compute", ""', '"name", "cpu"', '"description", "cpu"', '"libdirs", "ollama"', '"driver", ""', '"pci_id", ""', '"type", ""', '"available"', 'typeStr = "iGPU"', 'typeStr := "discrete"']) assert(types.includes(field), field);
  assert(code.includes('msg="inference compute" id=cpu library=cpu compute="" name=cpu description=cpu libdirs=ollama driver="" pci_id="" type=""'));
  const runner = src("discover__runner.go");
  assert(runner.includes("if GPUs are not correctly discovered, unset and try again") && content.includes("`if GPUs are not correctly discovered, unset and try again`"));
  assert(runner.includes('exec.LookPath("ggml-base.dll")'));
  assert(runner.includes("bootstrapTimeout = 90 * time.Second") && runner.includes("Defender"));
  for (const name of ["CUDA_VISIBLE_DEVICES", "HIP_VISIBLE_DEVICES", "ROCR_VISIBLE_DEVICES", "GGML_VK_VISIBLE_DEVICES", "GPU_DEVICE_ORDINAL", "HSA_OVERRIDE_GFX_VERSION"]) assert(runner.includes(`"${name}",`) && code.includes(name), name);
  assert(runner.includes('!strings.HasPrefix(requested, "mlx_") && filepath.Base(dir) != requested'), "OLLAMA_LLM_LIBRARY skips other library folders");
  const amd = src("discover__amd.go");
  assert(amd.includes('exec.LookPath("amdhip64_6.dll")') && amd.includes('exec.LookPath("amdhip64_7.dll")'));
  assert(amd.includes('"set HSA_OVERRIDE_GFX_VERSION to map to a supported target"'));
  assert(src("discover__llama_server.go").includes('return "Vulkan"') && src("discover__llama_server.go").includes('return "CUDA"'));
});

test("the integrated GPU rule arrived in 0.30 and is only documented in the CLI help", () => {
  assert(!saved("src-v0.24.0/discover__runner.go").includes("filterIntegratedGPUs"));
  assert(saved("src-v0.30.0/discover__runner.go").includes("func filterIntegratedGPUs"));
  const runner = src("discover__runner.go");
  assert(runner.includes("devices = filterIntegratedGPUs(devices)") && runner.includes('case "CUDA":\n\t\treturn true'));
  assert(content.includes("Since version 0.30, Ollama leaves out graphics that are built into the processor"));
  assert(src("cmd__cmd.go").includes('envVars["OLLAMA_IGPU_ENABLE"],') && src("envconfig__config.go").includes('"Enable integrated GPUs"'));
  for (const doc of ["gpu", "windows", "faq", "troubleshooting", "docker", "context-length"]) assert(!src(`docs__${doc}.mdx`).includes("OLLAMA_IGPU_ENABLE"), doc);
  assert(content.includes("The variable appears in `ollama serve --help`, but not yet on the documentation pages."));
});

test("documentation facts match the saved pages", () => {
  const windows = src("docs__windows.mdx");
  const gpu = src("docs__gpu.mdx");
  assert(windows.includes("NVIDIA 551.61 or newer Drivers") && content.includes("asks for driver 551.61 or newer"));
  assert(windows.includes("AMD ROCm v7 / HIP7-capable driver stack for ROCm acceleration"));
  assert(windows.includes("RX 6800-class cards, may not\n  expose ROCm v7") && windows.includes("Vulkan is enabled by default"));
  assert(windows.includes("**MLX (CUDA)**: `ollama-windows-amd64-mlx.zip`") && windows.includes("you should remove the old directories first"));
  assert(windows.includes("explorer %LOCALAPPDATA%\\Programs\\Ollama") && windows.includes("Edit environment variables for your account"));
  assert(gpu.includes("Nvidia GPUs with compute capability 5.0 through 6.2 require driver version 570 or newer."));
  assert(gpu.includes("`GTX 750 Ti` `GTX 750` `NVS 810`") && gpu.includes("| 6.1                | NVIDIA TITAN"));
  const windowsRocm = gpu.split("### Windows Support")[1].split("###")[0];
  for (const card of ["7900 XTX", "7900 XT", "7900 GRE", "7800 XT", "7700 XT", "7600 XT", "7600", "W7900", "W7800", "W7700", "W7600", "W7500"]) assert(windowsRocm.includes(`\`${card}\``), card);
  assert(!windowsRocm.includes("6800") && !windowsRocm.includes("9070"));
  assert(supportTable[1][0].includes("7900 XTX") && supportTable[2][0].includes("W7500"));
  assert(gpu.includes("### Overrides on Linux") && gpu.includes('use an invalid GPU ID (e.g., "-1")'));
  assert(gpu.includes("`OLLAMA_VULKAN=0` or `GGML_VK_VISIBLE_DEVICES=-1`") && gpu.includes("use `GGML_VK_VISIBLE_DEVICES=1` when `Vulkan1` is the discrete"));
  assert(gpu.includes("On Windows most GPU vendors drivers come\nbundled with Vulkan support") && gpu.includes("sudo rmmod nvidia_uvm"));
  const context = src("docs__context-length.mdx");
  assert(context.includes("< 24 GiB VRAM: 4k context") && context.includes("24-48 GiB VRAM: 32k context") && context.includes("256k context"));
  const troubleshooting = src("docs__troubleshooting.mdx");
  assert(troubleshooting.includes('OLLAMA_LLM_LIBRARY="cpu_avx2" ollama serve') && troubleshooting.includes('$env:OLLAMA_DEBUG="1"'));
  assert(troubleshooting.includes("Ollama bundles\nROCm 7 linux libraries") && troubleshooting.includes("`video` and/or `render` group membership"));
  assert(src("docs__faq.mdx").includes("By default models are kept in memory for 5 minutes before being unloaded."));
  const docker = src("docs__docker.mdx");
  assert(docker.includes("docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama") && code.includes("docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama"));
  assert(docker.includes("--device /dev/kfd --device /dev/dri") && docker.includes("docker exec -it ollama ollama run llama3.2"));
  assert(src("app__ollama.iss").includes('Excludes: "\\mlx_*\\*"'));
  assert(src("server__images.go").includes('"this model requires MLX support, but the MLX runtime is not available"') && code.includes("Error: this model requires MLX support, but the MLX runtime is not available"));
  assert(src("ml__path.go").includes("cuda_v12, rocm_v7_2, vulkan, and mlx_cuda_v13"));
  assert(JSON.parse(src("release-assets.json")).some((asset) => asset.name === "ollama-windows-amd64-mlx.zip"));
  const issue = saved("issues/19343.html");
  assert(issue.includes("If you have an Nvidia device, install the") && issue.includes("issue resolved"));
  const dockerDesktop = saved("docs-other/docker-desktop-gpu.html");
  assert(/only available on Windows with the WSL 2 backend/.test(dockerDesktop) && dockerDesktop.includes("NVIDIA GPU Paravirtualization"));
  assert(dockerDesktop.includes("docker run --rm -it --gpus=all nvcr.io/nvidia/k8s/cuda-sample:nbody nbody -gpu -benchmark") && code.includes("docker run --rm -it --gpus=all nvcr.io/nvidia/k8s/cuda-sample:nbody nbody -gpu -benchmark"));
  const nvidia = saved("docs-other/nvidia-cuda-wsl-user-guide.html");
  assert(nvidia.includes("Do not install any Linux display driver in WSL") && nvidia.includes("WSL 1 does not support GPU acceleration"));
});

const require = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(text, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const loaded = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const siteConfig = { url: record.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("Terminal examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: record.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("the real renderer keeps code blocks, tables, links and the photo", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...record.internalLinks].sort());
  for (const slug of ["ollama-ps-explained", "could-not-connect-to-ollama-app-is-it-running", "ollama-pull-model-manifest-error", "ollama-models-folder-windows-move-2026"]) assert(internal.includes(`/blog/${slug}`), slug);
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), [...record.sources].sort());
  assert(external.every((node) => node.attribs.rel?.includes("noopener")));
  const image = one(document, (node) => node.name === "img");
  assert.equal(image.attribs.src, "https://www.byteverse.fyi/blog/ollama-gpu/photo-inline.jpg");
  assert(image.attribs.alt.length > 40);
});

const pageSource = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
const faqSchemaLimit = Number(pageSource.match(/mainEntity: faqs\.slice\(0, (\d+)\)/)?.[1]);

test("visible FAQs match the schema extractor exactly", () => {
  const start = pageSource.indexOf("  const faqRegex =");
  const end = pageSource.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  assert.equal(faqSchemaLimit, 5, "FAQPage schema cap changed in page.tsx");
  const compiled = ts.transpileModule(pageSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (text) => text.replace(/\s+/g, " ").trim();
  assert.deepEqual(faqs.map((faq) => faq.question), record.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), record.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

console.log(JSON.stringify(metrics));

if (mode === "--preview") {
  const response = await fetch(`${record.website}/blog/${record.slug}`, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200);
  const current = parseDocument(await response.text());
  const styles = all(current, (node) => node.name === "link" && node.attribs.rel === "stylesheet").map((node) => new URL(node.attribs.href, record.website).href);
  assert(styles.length > 0);
  const bodyClass = one(current, (node) => node.name === "body").attribs.class ?? "";
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: record.targeting.metaDescription }),
      element("base", { href: `${record.website}/` }),
      element("title", null, `${record.targeting.metaTitle} | ByteVerse Draft`),
      ...styles.map((href) => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, "html{scroll-behavior:auto}main{width:100%;min-width:0}h1{overflow-wrap:anywhere;letter-spacing:0}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}"),
    ),
    element("body", { className: bodyClass },
      element("main", { className: "mx-auto max-w-3xl px-4 sm:px-6 py-8" },
        element("article", null,
          element("p", { className: "text-sm text-primary mb-4" }, "Tech Guides"),
          element("h1", { className: "text-3xl sm:text-4xl font-extrabold leading-tight mb-6" }, record.targeting.title),
          element("p", { className: "text-lg text-muted-foreground leading-relaxed mb-6" }, record.targeting.excerpt),
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${record.targeting.author} | Updated November 23, 2026 | ${metrics.readingTime}`),
          element("img", { src: record.previous.post.cover_image, alt: "Graphics card inside a desktop PC", width: 1200, height: 675, className: "preview-cover rounded-lg mb-10" }),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-ollama-gpu-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const results = [];
  try {
    for (const [width, theme] of [[320, "light"], [375, "dark"], [768, "light"], [1440, "light"]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
      try {
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          const allowed = url.protocol === "file:" || (url.origin === record.website && /\.(css|woff2?|jpg|png|webp)$/.test(url.pathname));
          return allowed ? route.continue() : route.abort("blockedbyclient");
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
          const scrollers = [...document.querySelectorAll("table")].map((table) => {
            const parent = table.parentElement;
            parent.scrollLeft = parent.scrollWidth;
            const result = { width: parent.clientWidth, content: parent.scrollWidth, scroll: parent.scrollLeft };
            parent.scrollLeft = 0;
            return result;
          });
          const pres = [...document.querySelectorAll("pre")].map((pre) => ({ width: pre.clientWidth, content: pre.scrollWidth, overflowX: getComputedStyle(pre).overflowX }));
          return { overflow: document.documentElement.scrollWidth - innerWidth, images: images.length, scrollers, pres };
        });
        assert(geometry.overflow <= 1, `${width}: horizontal page overflow`);
        assert.equal(geometry.images, 2);
        assert.equal(geometry.scrollers.length, metrics.tables);
        for (const scroll of geometry.scrollers) if (scroll.content > scroll.width + 1) assert(scroll.scroll > 0, "An overflowing table must scroll");
        for (const pre of geometry.pres) if (pre.content > pre.width + 1) assert(["auto", "scroll"].includes(pre.overflowX), "Long commands must scroll inside their block");
        assert.equal(await preview.locator("pre").count(), metrics.codeBlocks);
        const question = preview.locator("details").first().locator("summary");
        await question.focus();
        await preview.keyboard.press("Enter");
        assert.equal(await preview.locator("details").first().evaluate((node) => node.open), true);
        await preview.evaluate(() => window.scrollTo(0, 0));
        await preview.screenshot({ path: fileURLToPath(new URL(`preview-${width}-${theme}.png`, directory)) });
        if (width === 375) {
          await preview.locator(".blog-content table").nth(1).scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-log-table.png", directory)) });
        }
        assert.deepEqual(pageErrors, []);
        results.push({ width, theme, overflow: geometry.overflow, tables: geometry.scrollers.length, codeBlocks: geometry.pres.length, faqKeyboard: "pass" });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ preview: output.href, results, scope: "Static noindex preview using the real renderer and the live CSS. No production scripts or database writes." }));
}

if (mode === "--live") {
  assert(record.publication.modifiedAt, "Record the successful database update before live verification");
  const url = `${record.website}/blog/${record.slug}`;
  test("live article metadata, schema and body match the validated draft", async () => {
    const response = await fetch(`${url}?v=${Date.now()}`, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => one(live, (node) => node.name === "meta" && node.attribs[attribute] === value).attribs.content;
    const collapse = (text) => text.replace(/\s+/g, " ").trim();
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), record.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${record.targeting.metaTitle} | ByteVerse`);
    assert.equal(one(live, (node) => node.name === "link" && node.attribs.rel === "canonical").attribs.href, url);
    assert.equal(meta("name", "description"), record.targeting.metaDescription);
    assert.equal(meta("property", "og:title"), record.targeting.metaTitle);
    assert.equal(meta("property", "article:published_time"), record.publication.originalPublishedAt);
    assert.equal(meta("property", "article:modified_time"), record.publication.modifiedAt);
    assert(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""));
    assert(all(live, (node) => node.name === "meta" && node.attribs.name === "robots").every((node) => !/noindex/i.test(node.attribs.content)));
    const liveBody = one(live, (node) => node.name === "div" && node.attribs.class?.split(/\s+/).includes("blog-content"));
    assert.equal(collapse(DomUtils.textContent(liveBody)), collapse(DomUtils.textContent(document)), "Live article text must equal the validated renderer output");
    assert.equal(all(liveBody, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(liveBody, (node) => node.name === "pre").length, metrics.codeBlocks);
    for (const href of record.internalLinks) assert(all(liveBody, (node) => node.name === "a" && node.attribs.href === href).length > 0, href);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => {
      const data = JSON.parse(DomUtils.textContent(node));
      return data["@graph"] ?? [data];
    });
    const article = schemas.find((item) => item["@type"] === "BlogPosting");
    assert.equal(article?.headline, record.targeting.metaTitle);
    assert.equal(article?.datePublished, record.publication.originalPublishedAt);
    assert.equal(article?.dateModified, record.publication.modifiedAt);
    assert.deepEqual(schemas.find((item) => item["@type"] === "FAQPage")?.mainEntity.map((item) => item.name), record.faq.slice(0, faqSchemaLimit));
    const sitemapResponse = await fetch(`${record.website}/sitemap.xml?v=${Date.now()}`, { signal: AbortSignal.timeout(30000) });
    assert.equal(sitemapResponse.status, 200);
    const sitemap = parseDocument(await sitemapResponse.text(), { xmlMode: true });
    const entry = one(sitemap, (node) => node.name === "url" && all(node, (child) => child.name === "loc").some((child) => DomUtils.textContent(child) === url));
    const lastmod = DomUtils.textContent(one(entry, (node) => node.name === "lastmod"));
    assert(lastmod.startsWith(record.publication.modifiedAt.slice(0, 10)), "Sitemap still has the old modification date");
    console.log("PASS live Ollama GPU update", JSON.stringify({ checkedAt: new Date().toISOString(), url, title: record.targeting.title, modifiedAt: record.publication.modifiedAt, sitemapLastmod: lastmod, faqs: record.faq.length }));
  });
}
