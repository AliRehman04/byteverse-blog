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

// Source files, vendor pages, GitHub issues and competitor pages are saved outside the repository and read as text.
const sourceDir = new URL("../../.byteverse-ollama-runner-check/", import.meta.url);
const straight = (text) => text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ");
const read = (file) => readFileSync(new URL(file, sourceDir), "utf8");
const doc = (name) => straight(read(`docs/${name}.txt`));
const issue = (number) => JSON.parse(read(`issues/${number}.json`));
const issueText = (number) => { const saved = issue(number); return [saved.title, saved.body, ...saved.comments.map((comment) => comment.body)].join("\n").replace(/\r/g, ""); };
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/ollama-llama-runner-process-has-terminated.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const flat = content.replace(/\s+/g, " ");
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
const ledger = JSON.parse(readFileSync(new URL("../docs/ollama-runner-keywords-2026-11-28.json", import.meta.url), "utf8"));
const sha = (file) => createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex");
if (mode === "--metrics") console.log(JSON.stringify({ ...metrics, sourceSha256: Object.fromEntries(Object.keys(ledger.validation.sourceSha256).map((file) => [file, sha(file)])) }, null, 2));

const rows = (table) => table.split("\n").filter((line) => line.startsWith("|")).slice(2).map((line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
const tables = content.split(/\n\n/).filter((part) => part.startsWith("|"));
const unquote = (cell) => cell.replace(/^`|`$/g, "");

test("draft structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert(!/^#{2,3}\s+How\s+to\s/im.test(content), "No heading may look like a HowTo step list");
  assert.equal((content.split("\n## Frequently Asked Questions")[0].match(/^### /gm) ?? []).length, 0, "H3 headings are reserved for FAQ questions");
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.equal(faqSection.match(/^### /gm)?.length, ledger.faq.length);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>\\-]/.test(answer), "FAQ answers must survive the schema character filter");
  assert.deepEqual(blocks.map((block) => block.language), ["txt", "powershell", "bash", "bash", "txt", "txt"]);
  assert(!/[\u2012-\u2015\u2212\u2018\u2019\u201c\u201d]/.test(content), "No typographic dashes or curly quotes");
  assert(!/[^\x00-\x7f]/.test(content), "Plain ASCII only");
  for (const paragraph of content.split("\n## Sources and Further Reading")[0].split("\n\n")) {
    if (/^[|`#!]/.test(paragraph.trim())) continue;
    for (const part of /^(\d+\.|-) /.test(paragraph.trim()) ? paragraph.split("\n") : [paragraph]) assert(part.trim().split(/\s+/).length <= 75, `Paragraph too long: ${part.slice(0, 60)}`);
  }
  assert(!/<[^>\n]+>/.test(content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "")), "Angle brackets only inside code, or the sanitizer removes them");
  assert.equal(metrics.tables, 4);
  assert.equal(tables.length, 4);
  assert.deepEqual(rows(tables[0]).map((row) => row[0]), ["0.22 and older", "0.23 and 0.24", "0.30.0 and newer"]);
  assert.deepEqual(rows(tables[1]).map((row) => row[0]), ["Windows", "macOS", "Linux with systemd", "Docker", "`ollama serve` in a terminal"]);
  const endings = rows(tables[2]);
  assert.equal(endings.length, 13);
  const sections = { "Out of memory": "## Out of memory, including signal: killed", "Model file": "## The model file and your Ollama version", "Crash codes": "## Crash codes: 0xc0000409, aborted and segmentation fault", "GPU drivers": "## GPU driver and library errors", Timeouts: "## Timed out waiting for the runner to start", "Older versions": "## Older versions: exit status 2 and `%!w(<nil>)`" };
  for (const row of endings) assert(content.includes(`\n${sections[row[3]]}\n`), `Section ${row[3]} has a heading`);
  const windows = JSON.parse(read("windows-formatmessage-2026-11-28.json").replace(/^\uFEFF/, ""));
  const produced = new Map(windows.results.map((result) => [result.code, result.text.replace(/\r\n/g, " ")]));
  const codes = rows(tables[3]);
  assert.equal(codes.length, 5);
  for (const [code, , text] of codes) assert.equal(text, produced.get(unquote(code)), code);
});

test("saved sources are the files recorded in the ledger", () => {
  assert(Object.keys(ledger.validation.sourceSha256).length >= 60);
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) assert.equal(sha(file), hash, file);
});

test("message formats and capture rules match the Ollama 0.40.19 source", () => {
  const server = read("ollama-0.40.19/llm__llama_server.go");
  for (const needle of [
    'return fmt.Errorf("llama-server process has terminated: %s: %s", ExitStatus(s.cmd.ProcessState.ExitCode()), msg)',
    'return fmt.Errorf("llama-server process has terminated: %w: %s", s.doneErr, msg)',
    'return fmt.Errorf("llama-server process has terminated: %w", s.doneErr)',
    'slog.Error("llama-server terminated", "error", err, "exit", ExitStatusFromError(err))',
    "s.doneErr = errors.New(msg)",
    'return fmt.Errorf("timed out waiting for llama-server to start: %w", ctx.Err())',
    'return fmt.Errorf("timed out waiting for llama-server to start - %s", msg)',
    'return fmt.Errorf("llama-server reported out-of-memory during startup: %s", msg)',
    'slog.Info("starting llama-server", "cmd", cmd)',
    '"-c", strconv.Itoa(launch.opts.NumCtx * launch.numParallel)',
    'params = append(params, "-ngl", "0")',
    "retrying with projector CPU offload",
    'params = append(params, "--cache-type-k", launch.kvCacheType, "--cache-type-v", launch.kvCacheType)',
  ]) assert(server.includes(needle), needle);
  const status = read("ollama-0.40.19/llm__status.go");
  for (const needle of ["const maxCapturedErrorBytes = 8 * 1024", '"error:",', '"CUDA error",', '"ROCm error",', '"cudaMalloc failed",', '"error loading model",', '"GGML_ASSERT",', '"panic:",', '"llama_init_from_model:",', '"out of memory",', '"failed to allocate",', '"insufficient memory",', 'msg = current + "\\n" + msg']) assert(status.includes(needle), needle);
  assert(read("ollama-0.40.19/llm__exit_status_windows.go").includes('return fmt.Sprintf("exit status 0x%08x: %s", raw, windows.NTStatus(raw).Error())'));
  assert(read("golang-sys-v0.49.0/windows__syscall_windows.go").includes("FormatMessage(FORMAT_MESSAGE_FROM_SYSTEM|FORMAT_MESSAGE_FROM_HMODULE|FORMAT_MESSAGE_ARGUMENT_ARRAY, modntdll.Handle(), uint32(s), langID(LANG_ENGLISH, SUBLANG_ENGLISH_US), b, nil)"));
  const sched = read("ollama-0.40.19/server__sched.go");
  for (const needle of ["this model may be incompatible with your version of Ollama. If you previously pulled this model, try updating it by running `ollama pull %s`", 'slog.Info("Load failed"', "reducing automatic context and retrying once", "evicting all other models and retrying once", "if !req.numCtxAuto {", "case numCtx > 32768:\n\t\treturn 32768, true\n\tcase numCtx > 4096:\n\t\treturn 4096, true", "numParallel := max(int(envconfig.NumParallel()), 1)", "!req.oomRetryAttempted"]) assert(sched.includes(needle), needle);
  const config = read("ollama-0.40.19/envconfig__config.go");
  assert(config.includes("loadTimeout = 5 * time.Minute") && config.includes("time.ParseDuration(s)") && config.includes('"OLLAMA_KV_CACHE_TYPE", KvCacheType(), "Quantization type for the K/V cache (default: f16)"'));
  const routes = read("ollama-0.40.19/server__routes.go");
  assert(routes.includes("return 499, \"request canceled\"") && routes.includes("return http.StatusInternalServerError, err.Error()"));
  assert(read("ollama-0.40.19/api__types.go").includes('return fmt.Sprintf("%s: %s", e.Status, e.ErrorMessage)'));
  assert(read("ollama-0.40.19/go.mod").includes("go 1.26.10") && read("ollama-0.40.19/LLAMA_CPP_VERSION").includes("b12734"));
  for (const claim of ["Every matching line is kept, up to the last 8 KB", "anything above 32,768 tokens drops to 32,768, anything above 4,096 drops to 4,096", "Ollama then starts llama-server with `-ngl 0`", "With `OLLAMA_NUM_PARALLEL=4` and 8,192 tokens, llama-server is started with room for 32,768.", "Ollama 0.30 and later repeat that error and leave the signal out", "five minutes by default, and restarts the clock whenever the load shows activity"]) assert(flat.includes(claim), claim);
});

test("Ollama documentation statements match the saved pages", () => {
  const trouble = read("ollama-0.40.19/docs__troubleshooting.mdx");
  for (const needle of ["cat ~/.ollama/logs/server.log", "journalctl -u ollama --no-pager", "docker logs <container-name>", "If manually running `ollama serve` in a terminal, the logs will be on that terminal.", "explorer %LOCALAPPDATA%\\Ollama", '$env:OLLAMA_DEBUG="1"']) assert(trouble.includes(needle), needle);
  const faq = read("ollama-0.40.19/docs__faq.mdx");
  for (const needle of ["/set parameter num_ctx 4096", "a 2K context with 4 parallel requests will result in an 8K context", "other backends default to 1", "Ollama uses Flash Attention automatically when the selected backend and devices support it.", "To disable it, set `OLLAMA_FLASH_ATTENTION=0`.", "uses approximately 1/2 the memory of `f16` with a very small loss in precision"]) assert(faq.includes(needle), needle);
  const context = read("ollama-0.40.19/docs__context-length.mdx");
  for (const needle of ["< 24 GiB VRAM: 4k context", "24-48 GiB VRAM: 32k context", "should be set to at least 64000 tokens"]) assert(context.includes(needle), needle);
  const gpu = read("ollama-0.40.19/docs__gpu.mdx");
  for (const needle of ["compute capability 5.0+ and driver version 550 and newer", "compute capability 5.0 through 6.2 require driver version 570 or newer", "Ollama requires the AMD ROCm v7 driver on Linux.", "Ollama requires an AMD ROCm v7 / HIP7-capable driver stack on Windows."]) assert(gpu.includes(needle), needle);
  assert(flat.includes("Ollama's documentation recommends at least 64,000 tokens for coding and agent tools") && flat.includes("driver 570 or later for compute capability 5.0 to 6.2"));
});

test("older wordings and the 0.30.0 boundary come from the release tags", () => {
  const old = read("ollama-0.24.0/llm__server.go");
  for (const needle of ['return fmt.Errorf("llama runner process has terminated: %s", s.status.LastError())', 'return fmt.Errorf("llama runner process has terminated with exit code %d", s.cmd.ProcessState.ExitCode())', 'return fmt.Errorf("timed out waiting for llama runner to start: %w", ctx.Err())', 'return fmt.Errorf("timed out waiting for llama runner to start - progress %0.2f - %s", s.loadProgress, msg)', "model requires more system memory (%s) than is available (%s)", "this model is not supported by your version of Ollama. You may need to upgrade", "exe, err = os.Executable()", 'params := []string{"runner"}']) assert(old.includes(needle), needle);
  assert(/case <-s\.done:\s*\n\s*return fmt\.Errorf\("llama runner process has terminated: %w", s\.doneErr\)/.test(read("ollama-0.22.0/llm__server.go")));
  const dates = JSON.parse(read("issues/v0.30.0-dates.json"));
  assert(dates.rc0.startsWith("2026-05-07") && dates.final.startsWith("2026-06-01") && dates.releasePublishedAt.startsWith("2026-05-13"));
  assert(flat.includes("the final build is dated 1 June 2026") && flat.includes("test builds ran from 7 May and the v0.30.0 tag points to a build from 1 June 2026"));
  assert(doc("e01-go-runtime").includes("and then exits with exit code 2."));
  const print = read("golang-go1.26.10/src__fmt__print.go");
  assert(print.includes('nilAngleString    = "<nil>"') && print.includes('percentBangString = "%!"') && print.includes("p.badVerb(verb)"));
  const posix = read("golang-go1.26.10/src__os__exec_posix.go");
  assert(posix.includes('res = "signal: " + status.Signal().String()') && posix.includes('res += " (core dumped)"') && posix.includes('res = "exit status " + strconv.Itoa(code)'));
  const signals = read("golang-go1.26.10/src__syscall__zerrors_linux_amd64.go");
  for (const name of ['6:  "aborted"', '8:  "floating point exception"', '9:  "killed"', '11: "segmentation fault"']) assert(signals.includes(name), name);
});

test("llama.cpp b12734 statements match the saved source", () => {
  assert(read("llamacpp-b12734/ggml__include__ggml.h").includes('#define GGML_ASSERT(x) if (!(x)) GGML_ABORT("GGML_ASSERT(%s) failed", #x)'));
  assert(read("llamacpp-b12734/ggml__src__ggml.c").includes("    abort();"));
  const cuda = read("llamacpp-b12734/ggml__src__ggml-cuda__ggml-cuda.cu");
  assert(cuda.includes('GGML_LOG_ERROR(GGML_CUDA_NAME " error: %s\\n", msg);') && cuda.includes('GGML_ABORT(GGML_CUDA_NAME " error");'));
  assert(read("llamacpp-b12734/ggml__include__ggml-cuda.h").includes('#define GGML_CUDA_NAME "ROCm"'));
  assert(read("llamacpp-b12734/tools__server__server.cpp").includes('SRV_ERR("%s", "exiting due to model loading error\\n");\n        return 1;'));
  assert(read("llamacpp-b12734/src__llama.cpp").includes('LLAMA_LOG_ERROR("%s: error loading model: %s\\n", __func__, err.what());'));
  assert(read("llamacpp-b12734/src__llama-model.cpp").includes(`throw std::runtime_error("unknown model architecture: '" + ml.get_arch_name() + "'");`));
  const context = read("llamacpp-b12734/src__llama-context.cpp");
  assert(context.includes('LLAMA_LOG_ERROR("%s: quantized V cache requires flash_attn to be enabled\\n", __func__);') && context.includes("llama_context * llama_init_from_model("));
});

test("Windows, Linux, Docker, NVIDIA and Homebrew statements match the saved pages", () => {
  assert(doc("e03-ms-fastfail").includes("User-mode fast fail requests appear as a second chance non-continuable exception with exception code 0xC0000409"));
  assert(doc("e02-ms-abort").includes("If the Windows error reporting handler isn't invoked, then abort calls _exit to terminate the process with exit code 3"));
  const chen = doc("e04-oldnewthing-stack-overrun");
  assert(chen.includes("it doesn't actually mean that there is a stack buffer overrun") && chen.includes("This code is used when the C runtime function abort() gets called."));
  const ntstatus = doc("e05-ms-ntstatus");
  for (const name of ["STATUS_STACK_BUFFER_OVERRUN", "STATUS_ACCESS_VIOLATION", "STATUS_DLL_NOT_FOUND", "STATUS_ILLEGAL_INSTRUCTION", "STATUS_INTEGER_DIVIDE_BY_ZERO"]) assert(ntstatus.includes(name), name);
  const windows = JSON.parse(read("windows-formatmessage-2026-11-28.json").replace(/^\uFEFF/, ""));
  assert.deepEqual([windows.machine.caption, windows.machine.build, windows.machine.uiCulture], ["Microsoft Windows 11 Pro", "26300", "en-US"]);
  const oom = read("linux/v6.12-mm__oom_kill.c");
  assert(oom.includes('pr_err("%s: Killed process %d (%s)') && oom.includes('"Out of memory"') && oom.includes('"Memory cgroup out of memory"') && oom.includes("do_send_sig_info(SIGKILL"));
  assert(doc("e06-kernel-mm-concepts").includes("it invokes the OOM killer"));
  assert(doc("e07-wsl-config").includes("50% of total memory on Windows"));
  assert(doc("e09-docker-desktop-settings").includes("Memory limit RAM allocated to the Docker VM Mac, Linux, Windows Hyper-V"));
  assert(doc("e10-docker-desktop-wsl").includes("Docker Desktop WSL 2 backend on Windows"));
  assert(doc("e08-docker-resources").includes("OOM"));
  const nvidia = doc("e11-cuda-runtime-types");
  for (const needle of ["This indicates that the provided PTX was compiled with an unsupported toolchain.", "This indicates that there is no kernel image available that is suitable for the device.", "This indicates that initialization of a shared object failed."]) assert(nvidia.includes(needle), needle);
  const brew = read("docs/e12-homebrew-ollama-formula.rb");
  assert(/environment_variables OLLAMA_FLASH_ATTENTION: "1",\s+OLLAMA_KV_CACHE_TYPE:\s+"q8_0"/.test(brew) && brew.includes('run [opt_bin/"ollama", "serve"]'));
  assert(doc("e13-ms-vc-redist").includes("Visual C++ v14 Redistributable"));
  assert(flat.includes('the code "doesn\'t actually mean that there is a stack buffer overrun"'));
});

test("quoted error lines and report details match the saved GitHub issues", () => {
  assert(issueText(17627).includes(blocks[0].code), "#17627 line");
  assert(issueText(18924).includes(blocks[5].code), "#18924 repeated line");
  const division = issue(16479);
  assert(issueText(16479).includes("exit status 0xc0000094: {EXCEPTION}") && issueText(16479).includes("Integer division by zero."));
  assert(division.state === "closed" && division.created_at.startsWith("2026-06-03") && division.closed_at.startsWith("2026-06-04"));
  const fpe = issue(16495);
  assert(fpe.title.includes("gemma4:12b SIGFPE on Linux") && fpe.closed_at.startsWith("2026-06-04") && issueText(16495).includes("floating point exception"));
  const phi4 = issue(19905);
  assert(phi4.state === "open" && issueText(19905).includes("signal: abort trap") && issueText(19905).includes("OLLAMA_KV_CACHE_TYPE=q8_0") && phi4.fetched_at.startsWith("2026-11-28"));
  const gptoss = issue(16946);
  assert(gptoss.title.includes("OLLAMA_KV_CACHE_TYPE=q8_0") && issueText(16946).includes("0.30.6") && gptoss.comments.some((comment) => comment.author === gptoss.author && comment.body.includes("no longer occurs in Ollama v0.34.2")));
  const runtime = issue(17375);
  const resolution = runtime.comments.find((comment) => comment.author === runtime.author && comment.body.includes("### Resolution"));
  assert(resolution.body.includes("msvcp140.dll") && resolution.body.includes("Microsoft Visual C++ 2015-2022 Redistributable x64") && resolution.body.includes("fixed the issue"));
  assert(runtime.body.includes("GPU discovery") && runtime.body.includes("exit status 0xc0000005: The instruction at 0xp referenced memory at 0xp. The memory could not be s."));
  assert(issueText(18557).includes("0xc0000005") && issueText(18557).includes("Vulkan"));
  assert(issueText(15849).includes("%!w(<nil>)") && issueText(15849).includes("0.21.2") && issueText(15849).includes("M5"));
  assert(issueText(12314).includes("fatal error: fault") && issueText(12314).includes("[signal SIGSEGV: segmentation violation"));
  assert(issueText(7266).includes("0xc000001d") && issueText(7266).includes("ARM64"));
  assert(issueText(17012).includes("PTX was compiled with an unsupported toolchain") && issueText(17012).includes("0xc0000409"));
  assert(/segmentation fault/i.test(issueText(17205)) && /segfault/i.test(issueText(17249)));
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
  "@/components/code-playground": { CodePlayground() { throw new Error("This guide must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and measured article figures are consistent without invented SEO metrics", () => {
  assert.equal(ledger.slug, "ollama-llama-runner-process-has-terminated");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(!/20\d\d/.test(ledger.slug), "Fix guides use a slug without a year");
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
  assert(content.startsWith('**When Ollama says "llama runner process has terminated"'), "The primary keyword opens the article");
  assert(ledger.targeting.title.toLowerCase().startsWith("ollama llama runner process has terminated"));
  assert(ledger.targeting.metaTitle.toLowerCase().startsWith(ledger.research.keywordMap.primary));
  assert(ledger.targeting.keywords.startsWith(ledger.research.keywordMap.primary));
});

test("the real renderer preserves the tables, code blocks and the intended links", () => {
  assert.equal(all(document, (node) => node.name === "pre").length, metrics.codeBlocks);
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), ledger.sources.map((item) => item.url).sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener") && node.attribs.target === "_blank"));
  const code = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(node));
  assert(code[0].includes("exit status 0xc0000409") && code[5].includes("GGML_ASSERT(hparams.is_swa_any()) failed"));
  const text = DomUtils.textContent(document);
  for (const literal of ["%!w(<nil>)", "ollama run <model>", "docker logs <container-name>", "ollama pull <name>"]) assert(text.includes(literal), `${literal} survives the sanitizer`);
  // The site styles list items as flex rows, which splits bold text, code and links into columns, so this guide uses lead-in paragraphs instead of lists.
  assert.equal(all(document, (node) => ["ul", "ol", "li"].includes(node.name)).length, 0);
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /based on the Ollama 0\.40\.19 source code and the report in issue 17627, checked on 28 November 2026\. Diagram by ByteVerse\./);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const file = readFileSync(new URL(`../${path}`, import.meta.url));
    const info = await sharp(file).metadata();
    assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
    assert(file.length < 200 * 1024, "Illustrations stay small");
    assert.match(path, /^public\/blog\/ollama-runner\/ollama-[a-z-]+\.png$/);
  }
  assert(content.includes("Ollama is not installed on the PC I used, so no model was loaded for this guide.") && content.includes("so no model was loaded and there are no screenshots."));
});

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/ollama-pull-model-manifest-error`, { signal: AbortSignal.timeout(60000) });
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 28, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Terminal mock-up with an Ollama llama-server error and the captured CUDA error line highlighted", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, "Illustration: ByteVerse"),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-ollama-runner-preview/", import.meta.url);
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
          const bounds = ["main", "article", "h1", ".blog-content", ".blog-content pre"].map((selector) => {
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
        const question = preview.locator("details").first().locator("summary");
        await question.focus();
        await preview.keyboard.press("Enter");
        assert.equal(await preview.locator("details").first().evaluate((node) => node.open), true);
        await preview.evaluate(() => window.scrollTo(0, 0));
        await preview.screenshot({ path: fileURLToPath(new URL(`preview-${width}-${theme}.png`, directory)) });
        if (width === 375 && theme === "light") {
          await preview.locator(".blog-content table").nth(2).scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-table.png", directory)) });
          await preview.locator(".blog-content img").scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-diagram.png", directory)) });
          await preview.locator(".blog-content pre").first().scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-code.png", directory)) });
        }
        assert.deepEqual(pageErrors, []);
        results.push({ width, theme, overflow: geometry.overflow, images: geometry.images, tables: geometry.scrollers.length, faqKeyboard: "pass" });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ preview: output.href, results, scope: "Static noindex article preview using existing renderer and public CSS. No production scripts or database writes." }));
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
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(live, (node) => node.name === "details").length, ledger.faq.length);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0);
    const body = DomUtils.textContent(all(live, (node) => node.attribs?.class?.split(" ").includes("blog-content"))[0]);
    for (const sentence of ["Nobody attacked your PC.", "The repeat comes from the way Ollama builds the message.", "%!w(<nil>)"]) assert(body.includes(sentence), sentence);
  });
}
