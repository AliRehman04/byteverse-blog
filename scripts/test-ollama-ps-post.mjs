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

// Ollama source files for the cited releases are saved outside the repository and read as text.
const sourceDir = new URL("../../.byteverse-ollama-check/", import.meta.url);
const source = (release, file) => readFileSync(new URL(`src-${release}/${file}`, sourceDir), "utf8");
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/ollama-ps-explained.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/ollama-ps-keywords-2026-11-19.json", import.meta.url), "utf8"));
const sha = (file) => createHash("sha256").update(readFileSync(new URL(file, sourceDir))).digest("hex");
if (mode === "--metrics") console.log(JSON.stringify({ ...metrics, sourceSha256: Object.fromEntries(Object.keys(ledger.validation.sourceSha256).map((file) => [file, sha(file)])) }, null, 2));

const markdownTables = [];
for (const line of content.split("\n")) {
  if (!line.startsWith("|")) { if (markdownTables.at(-1)?.length) markdownTables.push([]); continue; }
  if (!markdownTables.length) markdownTables.push([]);
  markdownTables.at(-1).push(line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
}
const tables = markdownTables.filter((rows) => rows.length).map((rows) => rows.slice(2));
const [columnTable, releaseTable, processorTable, untilTable, fieldTable] = tables;
const current = "v0.40.16";
const cmd = source(current, "cmd__cmd.go");
const sched = source(current, "server__sched.go");
const routes = source(current, "server__routes.go");
const plain = (cell) => cell.replaceAll("`", "");

test("draft blocks parse and FAQ structure matches the blog convention", () => {
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  assert.equal((content.split("\n## Frequently Asked Questions")[0].match(/^### /gm) ?? []).length, 0, "H3 headings are reserved for FAQ questions");
  const faqSection = content.split("\n## Frequently Asked Questions")[1].split("\n## ")[0];
  assert.equal(faqSection.match(/^### /gm)?.length, ledger.faq.length);
  for (const answer of faqSection.split(/^### .+$/m).slice(1)) assert(!/[#*_`>-]/.test(answer), "FAQ answers must survive the schema character filter");
  for (const block of blocks) assert(["txt", "bash", "powershell", "json"].includes(block.language), block.language);
  assert(!/\u2014/.test(content), "No em dashes in published content");
  for (const paragraph of content.split("\n## Sources and Further Reading")[0].split("\n\n")) {
    if (/^[|`#\-!\d]/.test(paragraph.trim())) continue;
    assert(paragraph.trim().split(/\s+/).length <= 75, `Paragraph too long: ${paragraph.slice(0, 60)}`);
  }
  assert.equal(tables.length, 5);
});

test("saved Ollama sources are the files recorded in the ledger", () => {
  assert(Object.keys(ledger.validation.sourceSha256).length >= 20);
  for (const [file, hash] of Object.entries(ledger.validation.sourceSha256)) assert.equal(sha(file), hash, file);
});

test("the column history matches the releases on each side of a change", () => {
  const header = (release) => /table\.SetHeader\(\[\]string\{("NAME"[^}]*)\}\)\n[\s\S]{0,400}?table\.AppendBulk\(data\)\n\ttable\.Render\(\)\n\n\treturn nil\n\}\n\nfunc DeleteHandler/.exec(source(release, "cmd__cmd.go"))?.[1].replaceAll('"', "");
  const five = "NAME, ID, SIZE, PROCESSOR, UNTIL";
  const six = "NAME, ID, SIZE, PROCESSOR, CONTEXT, UNTIL";
  const seven = "NAME, ID, SIZE, PROCESSOR, CONTEXT, RUNNER, UNTIL";
  assert(!source("v0.1.37", "cmd__cmd.go").includes("func ListRunningHandler"));
  assert.deepEqual(["v0.1.38", "v0.3.10", "v0.3.11", "v0.9.6"].map(header), [five, five, five, five]);
  assert.deepEqual(["v0.10.0", "v0.35.1"].map(header), [six, six]);
  assert.deepEqual(["v0.40.0", current].map(header), [seven, seven]);
  assert.deepEqual(releaseTable, [["0.1.38 to 0.9.6", five], ["0.10.0 to 0.35.1", "CONTEXT added after PROCESSOR"], ["0.40.0 and newer", "RUNNER added before UNTIL"]]);
  assert.deepEqual(columnTable.map((row) => row[0]).join(", "), seven);
  for (const [absent, present] of [["v0.3.10", "v0.3.11"]]) {
    assert(!source(absent, "cmd__cmd.go").includes("func StopHandler") && !source(absent, "cmd__cmd.go").includes('"Stopping..."'));
    assert(source(present, "cmd__cmd.go").includes("func StopHandler") && source(present, "cmd__cmd.go").includes('until = "Stopping..."'));
  }
  // Release timestamps read from the GitHub releases API on 19 November 2026.
  const published = { "0.1.38": "2024-05-15T00:28:00Z", "0.3.11": "2024-09-17T21:40:04Z", "0.10.0": "2025-07-18T00:23:58Z", "0.40.0": "2026-09-25T03:31:52Z", "0.40.16": "2026-11-09T18:21:19Z" };
  const day = (release) => new Date(published[release]).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  assert(content.includes(`release 0.1.38 on ${day("0.1.38")}`) && content.includes(`0.10.0 on ${day("0.10.0")}`) && content.includes(`0.40.0 on ${day("0.40.0")}`));
  assert.deepEqual([day("0.1.38"), day("0.10.0"), day("0.40.0")], ["15 May 2024", "18 July 2025", "25 September 2026"]);
  assert(content.includes("`ollama stop`, added in release 0.3.11"));
  assert(content.includes("Ollama 0.40.16, the latest release on 19 November 2026"));
});

// JavaScript ports of format.humanDuration, format.humanTime, format.HumanBytes and the label code in ListRunningHandler.
// They exist only to compute the article's tables; the assertions in the next test tie each branch to the Go source.
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const FOREVER = 9223372036854.775807; // math.MaxInt64 nanoseconds, in milliseconds
function humanDuration(ms) {
  const seconds = Math.trunc(ms / SECOND);
  if (seconds < 1) return "Less than a second";
  if (seconds === 1) return "1 second";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.trunc(ms / MINUTE);
  if (minutes === 1) return "About a minute";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(ms / HOUR);
  if (hours === 1) return "About an hour";
  if (hours < 48) return `${hours} hours`;
  if (hours < 24 * 7 * 2) return `${Math.trunc(hours / 24)} days`;
  if (hours < 24 * 30 * 2) return `${Math.trunc(Math.trunc(hours / 24) / 7)} weeks`;
  if (hours < 24 * 365 * 2) return `${Math.trunc(Math.trunc(hours / 24) / 30)} months`;
  return `${Math.trunc(Math.trunc(Math.trunc(ms / HOUR) / 24) / 365)} years`;
}
function until(leftMs) {
  if (leftMs < 0) return "Stopping...";
  if (Math.trunc(Math.trunc(Math.trunc(-leftMs / HOUR) / 24) / 365) < -20) return "Forever";
  return `${humanDuration(leftMs)} from now`;
}
function humanBytes(bytes) {
  let value;
  let unit;
  if (bytes >= 1e12) { value = bytes / 1e12; unit = "TB"; }
  else if (bytes >= 1e9) { value = bytes / 1e9; unit = "GB"; }
  else if (bytes >= 1e6) { value = bytes / 1e6; unit = "MB"; }
  else if (bytes >= 1e3) { value = bytes / 1e3; unit = "KB"; }
  else return `${bytes} B`;
  if (value >= 10) return `${Math.trunc(value)} ${unit}`;
  if (value !== Math.trunc(value)) return `${value.toFixed(1)} ${unit}`;
  return `${Math.trunc(value)} ${unit}`;
}
function processor(size, sizeVram) {
  if (sizeVram === 0) return "100% CPU";
  if (sizeVram === size) return "100% GPU";
  if (sizeVram > size || size === 0) return "Unknown";
  const cpuPercent = Math.round((size - sizeVram) / size * 100);
  return `${cpuPercent}%/${100 - cpuPercent}% CPU/GPU`;
}
// tablewriter v0.0.5 with SetNoWhiteSpace(true) and SetTablePadding("    "): cells padded to the column width, four spaces between columns.
function layout(header, rows) {
  const widths = header.map((name, index) => Math.max(name.length, ...rows.map((row) => row[index].length)));
  return [header, ...rows].map((row) => row.map((cell, index) => cell.padEnd(widths[index])).join("    ").trimEnd()).join("\n");
}
const HEADER = ["NAME", "ID", "SIZE", "PROCESSOR", "CONTEXT", "RUNNER", "UNTIL"];
const example = JSON.parse(blocks.find((block) => block.language === "json").code).models[0];

test("the ports follow the Go source they stand in for", () => {
  const time = source(current, "format__time.go");
  for (const needle of ['return "Less than a second"', 'return "1 second"', 'return fmt.Sprintf("%d seconds", seconds)', "minutes := int(d.Minutes())", 'return "About a minute"',
    "hours := int(math.Round(d.Hours()))", 'return "About an hour"', "case hours < 48:", "case hours < 24*7*2:", 'return fmt.Sprintf("%d days", hours/24)',
    "if int(delta.Hours())/24/365 < -20 {\n\t\treturn \"Forever\"", 'return humanDuration(-delta) + " from now"']) assert(time.includes(needle), needle);
  const bytes = source(current, "format__bytes.go");
  for (const needle of ["KiloByte = Byte * 1000", "GigaByte = MegaByte * 1000", "case value >= 10:\n\t\treturn fmt.Sprintf(\"%d %s\", int(value), unit)", 'return fmt.Sprintf("%.1f %s", value, unit)']) assert(bytes.includes(needle), needle);
  const handler = cmd.slice(cmd.indexOf("func ListRunningHandler"), cmd.indexOf("func DeleteHandler"));
  for (const needle of ['case m.SizeVRAM == 0:\n\t\t\t\tprocStr = "100% CPU"', 'case m.SizeVRAM == m.Size:\n\t\t\t\tprocStr = "100% GPU"', 'case m.SizeVRAM > m.Size || m.Size == 0:\n\t\t\t\tprocStr = "Unknown"',
    "cpuPercent := math.Round(float64(sizeCPU) / float64(m.Size) * 100)", 'fmt.Sprintf("%d%%/%d%% CPU/GPU", int(cpuPercent), int(100-cpuPercent))',
    'delta := time.Since(m.ExpiresAt)\n\t\t\tif delta > 0 {\n\t\t\t\tuntil = "Stopping..."', 'until = format.HumanTime(m.ExpiresAt, "Never")', 'ctxStr := "-"',
    "if len(args) == 0 || strings.HasPrefix(m.Name, args[0]) {", "m.Digest[:12], format.HumanBytes(m.Size), procStr, ctxStr, m.Runner, until", 'table.SetTablePadding("    ")', "table.SetNoWhiteSpace(true)"]) assert(handler.includes(needle), needle);
  assert(!handler.includes("ToLower"), "The ps name filter is case-sensitive");
  assert(cmd.includes("strings.HasPrefix(strings.ToLower(m.Name), strings.ToLower(args[0]))") && cmd.includes('data = append(data, []string{m.Name, m.Digest[:12], size, format.HumanTime(m.ModifiedAt, "Never")})'));
  assert(/psCmd := &cobra\.Command\{\n\t\tUse:\s+"ps",\n\t\tShort:\s+"List running models",\n\t\tPreRunE: checkServerHeartbeat,\n\t\tRunE:\s+ListRunningHandler,\n\t\}/.test(cmd), "ps takes no declared arguments or flags");
  const table = readFileSync(new URL("src-olekukonko__tablewriter-v0.0.5/table.go", sourceDir), "utf8");
  assert(source(current, "go.mod").includes("github.com/olekukonko/tablewriter v0.0.5"));
  assert(/func \(t \*Table\) Render\(\) \{\n\tif t\.borders\.Top \{\n\t\tt\.printLine\(true\)\n\t\}\n\tt\.printHeading\(\)/.test(table), "The header prints even without rows");
});

test("every label in the UNTIL, PROCESSOR and SIZE sections is the output of the ported code", () => {
  const amount = { day: 24 * HOUR, hour: HOUR, minute: MINUTE, second: SECOND };
  const left = (text) => {
    if (text === "Keep-alive is negative") return FOREVER;
    if (text === "The time has passed") return -SECOND;
    return [...text.matchAll(/(\d+) (day|hour|minute|second)s?/g)].reduce((sum, [, count, unit]) => sum + Number(count) * amount[unit], 0);
  };
  assert.equal(untilTable.length, 9);
  for (const [timeLeft, label] of untilTable) { assert(left(timeLeft) !== 0, timeLeft); assert.equal(until(left(timeLeft)), plain(label), timeLeft); }
  assert.equal(until(5 * MINUTE - SECOND), "4 minutes from now");
  assert.equal(until(5 * MINUTE), "5 minutes from now");
  assert.equal(until(0), "Less than a second from now");
  assert.equal(until(24 * HOUR - SECOND), "24 hours from now");
  assert.equal(until(21 * 365 * 24 * HOUR), "Forever");
  assert.equal(until(20 * 365 * 24 * HOUR), "20 years from now");

  assert.deepEqual(processorTable.map((row) => plain(row[1])), ["100% CPU", "100% GPU", "A split such as 38%/62% CPU/GPU", "Unknown"]);
  assert.equal(processor(example.size, 0), "100% CPU");
  assert.equal(processor(example.size, example.size), "100% GPU");
  assert.equal(processor(example.size, example.size_vram), "38%/62% CPU/GPU");
  assert.equal(processor(example.size, example.size + 1), "Unknown");
  const number = (value) => value.toLocaleString("en-US");
  for (const figure of [example.size, example.size_vram, example.size - example.size_vram]) assert(content.includes(`${number(figure)} bytes`), String(figure));
  assert.equal(Math.round((example.size - example.size_vram) / example.size * 100), 38);

  assert.equal(humanBytes(example.size), "5.1 GB");
  assert.equal(humanBytes(42.9e9), "42 GB");
  assert.equal(humanBytes(9.6e9), "9.6 GB");
  assert(content.includes("42.9 GB is shown as 42 GB") && content.includes("1 GB is 1,000,000,000 bytes") && content.includes("1 MiB is 1,048,576 bytes"));
  assert.equal(number(Math.round(5.1e9 / 1048576)), "4,864");
  assert(content.includes("a SIZE of 5.1 GB is about 4,864 MiB"));
});

test("the example table, the empty table and the JSON reply agree with each other", () => {
  const rows = [
    ["gemma4:latest", "c6eb396dbd59", humanBytes(9.6e9), processor(9.6e9, 9.6e9), "4096", "llamacpp", until(5 * MINUTE - SECOND)],
    [example.name, example.digest.slice(0, 12), humanBytes(example.size), processor(example.size, example.size_vram), String(example.context_length), example.runner, until(90 * SECOND)],
  ];
  const txt = blocks.filter((block) => block.language === "txt").map((block) => block.code);
  assert.equal(txt[0], layout(HEADER, rows));
  assert.equal(txt[1], layout(HEADER, []));
  assert.equal(txt[1], "NAME    ID    SIZE    PROCESSOR    CONTEXT    RUNNER    UNTIL");
  assert(content.includes("These two rows are an example of the layout.") && content.includes("They are not copied from a running machine."));
  const types = source(current, "api__types.go");
  const struct = types.slice(types.indexOf("type ProcessModelResponse struct"), types.indexOf("type TokenResponse struct"));
  const fields = [...struct.matchAll(/`json:"([a-z_]+)/g)].map((match) => match[1]);
  assert.deepEqual(fields, ["name", "model", "size", "digest", "details", "expires_at", "size_vram", "context_length", "runner"]);
  assert.deepEqual(Object.keys(example), fields.filter((field) => field !== "details"));
  assert(content.includes("I left out the `details` block"));
  assert.equal(example.digest.length, 64);
  assert(!Number.isNaN(Date.parse(example.expires_at)));
  assert.deepEqual(fieldTable.map((row) => [plain(row[0]), row[1]]), [["name", "NAME"], ["digest", "ID, first 12 characters"], ["size", "SIZE"], ["size and size_vram", "PROCESSOR"], ["context_length", "CONTEXT"], ["runner", "RUNNER"], ["expires_at", "UNTIL"]]);
  assert(routes.includes('r.GET("/api/ps", s.PsHandler)'));
});

test("the countdown rules, Stopping causes and empty-table causes are in the scheduler and server code", () => {
  const config = source(current, "envconfig__config.go");
  assert(config.includes("keepAlive = 5 * time.Minute") && config.includes("keepAlive = time.Duration(n) * time.Second") && config.includes("if keepAlive < 0 {\n\t\treturn time.Duration(math.MaxInt64)"));
  // Rule 1: request value, else the server setting.
  assert(sched.includes("sessionDuration := envconfig.KeepAlive()\n\tif req.sessionDuration != nil {\n\t\tsessionDuration = req.sessionDuration.Duration"));
  // Rules 2 and 4: a new request stops the timer, replaces the duration only when it carries one, and does not touch expiresAt.
  const use = sched.slice(sched.indexOf("func (pending *LlmRequest) useLoadedRunner"), sched.indexOf("// load creates a new model based on req"));
  assert(use.includes("runner.refCount++\n\tif runner.expireTimer != nil {\n\t\trunner.expireTimer.Stop()") && use.includes("if pending.sessionDuration != nil {\n\t\trunner.sessionDuration = pending.sessionDuration.Duration"));
  assert(!use.includes("expiresAt"), "expiresAt is not updated when a request starts");
  // Rule 3: the countdown restarts when the last request finishes.
  assert(sched.includes("runner.refCount--\n\t\t\tif runner.refCount <= 0 {") && sched.includes("runner.expireTimer.Reset(runner.sessionDuration)\n\t\t\t\t\trunner.expiresAt = time.Now().Add(runner.sessionDuration)"));
  assert.equal(sched.match(/expiresAt = time\.Now\(\)/g).length, 4, "expiresAt is written at finish (twice), on stop, and estimated while loading");
  assert(sched.includes("if runner.refCount > 0 {\n\t\t\t\tslog.Debug(\"expired event with positive ref count, retrying\""));
  // Stopping, cause one: ollama stop sends keep-alive 0 with an empty prompt, and the server expires the runner now.
  assert(cmd.includes("func StopHandler(cmd *cobra.Command, args []string) error {\n\topts := &runOptions{\n\t\tModel:     args[0],\n\t\tKeepAlive: &api.Duration{Duration: 0},"));
  assert(routes.includes('if req.Prompt == "" && req.KeepAlive != nil && req.KeepAlive.Duration == 0 {\n\t\ts.sched.expireRunner(m)'));
  const expire = sched.slice(sched.indexOf("func (s *Scheduler) expireRunner"), sched.indexOf("// loadedModel is a point-in-time snapshot"));
  assert(expire.includes("runner.expiresAt = time.Now()") && expire.includes("runner.sessionDuration = 0\n\t\tif runner.refCount <= 0 {\n\t\t\ts.expiredCh <- runner"));
  // Sorting, cloud models, speech models, runner names.
  assert(routes.includes("// longest duration remaining listed first\n\t\treturn cmp.Compare(j.ExpiresAt.Unix(), i.ExpiresAt.Unix())"));
  const generate = routes.slice(routes.indexOf('if m.Config.RemoteHost != "" && m.Config.RemoteModel != "" {'), routes.indexOf("// expire the runner if unload is requested"));
  assert(generate.includes("req.Model = m.Config.RemoteModel") && generate.includes("return") && !generate.includes("scheduleRunner"), "Cloud models are forwarded before any local scheduling");
  assert(routes.includes("// Speech-only models have no text context.\n\t\t\tcontextLength = 0"));
  const manifest = source(current, "manifest__manifest.go");
  assert(manifest.includes('RunnerMLX      = "mlx"') && manifest.includes('RunnerGGML     = "ggml"') && manifest.includes('RunnerLlamaCPP = "llamacpp"'));
  assert(manifest.includes('if runtime.GOOS == "darwin" && runtime.GOARCH == "arm64" {\n\t\treturn []string{RunnerMLX, RunnerLlamaCPP, RunnerGGML}') && manifest.includes("the legacy path are tagged ggml"));
  const llama = source(current, "llm__llama_server.go");
  assert(llama.includes("// post-load log output. Full model-layer offload is reported as 100% GPU.") && llama.includes("if totalLayers > 0 && gpuLayers >= totalLayers && gpuLayerOverflow == 0 {\n\t\t\ttotal = vram"));
  assert(llama.includes("// Fallback: use model file size as a rough proxy"));
  // The run flag and the API value.
  assert(cmd.includes('runCmd.Flags().String("keepalive", "", "Duration to keep a model loaded (e.g. 5m)")') && cmd.includes("d, err := time.ParseDuration(keepAlive)"));
  const types = source(current, "api__types.go");
  assert(types.includes("d.Duration = time.Duration(t * float64(time.Second))") && types.includes("d.Duration, err = time.ParseDuration(t)"));
  assert.equal((content.match(/^\d\. /gm) ?? []).length, 5, "Five countdown rules");
  assert.equal((content.split("## Why ollama ps shows nothing")[1].split("\n## ")[0].match(/^- \*\*/gm) ?? []).length, 7, "Seven causes of an empty table");
});

test("commands and settings come from the official documentation", () => {
  const faq = source(current, "docs__faq.mdx");
  const cli = source(current, "docs__cli.mdx");
  const contextDoc = source(current, "docs__context-length.mdx");
  const docker = source(current, "docs__docker.mdx");
  const code = blocks.map((block) => block.code).join("\n");
  assert(cli.includes("### List running models\n\n```\nollama ps\n```") && cli.includes("### Stop a running model"));
  assert(faq.includes("By default models are kept in memory for 5 minutes before being unloaded."));
  assert(faq.includes("ollama stop llama3.2") && code.includes("ollama stop llama3.2"));
  for (const command of [`curl http://localhost:11434/api/generate -d '{"model": "llama3.2", "keep_alive": -1}'`, `curl http://localhost:11434/api/generate -d '{"model": "llama3.2", "keep_alive": 0}'`]) assert(faq.includes(command) && code.includes(command), command);
  assert(faq.includes("will override the `OLLAMA_KEEP_ALIVE` setting") && faq.includes("a number in seconds (such as 3600)") && faq.includes('a duration string (such as "10m" or "24h")'));
  assert(faq.includes("systemctl edit ollama.service") && faq.includes('Environment="OLLAMA_HOST=0.0.0.0:11434"') && faq.includes("systemctl daemon-reload") && faq.includes("systemctl restart ollama"));
  assert(faq.includes('launchctl setenv OLLAMA_HOST "0.0.0.0:11434"') && faq.includes("First Quit Ollama by clicking on it in the task bar.") && faq.includes("Edit environment variables for your account"));
  assert(code.includes('[Service]\nEnvironment="OLLAMA_KEEP_ALIVE=30m"') && content.includes('`launchctl setenv OLLAMA_KEEP_ALIVE "30m"`'));
  assert(faq.includes("As prior models become idle, one or more will be unloaded to make room for the new model."));
  assert(contextDoc.includes("< 24 GiB VRAM: 4k context") && contextDoc.includes("24-48 GiB VRAM: 32k context") && contextDoc.includes("&gt;= 48 GiB VRAM: 256k context"));
  assert(contextDoc.includes("Setting a larger context length will increase the amount of memory required to run a model.") && contextDoc.includes("OLLAMA_CONTEXT_LENGTH=64000 ollama serve") && contextDoc.includes("Change the slider in the Ollama app under settings"));
  assert(docker.includes("docker exec -it ollama ollama run llama3.2") && content.includes("`docker exec -it ollama ollama ps`"));
  assert(code.includes("curl http://localhost:11434/api/ps") && code.includes("(Invoke-RestMethod http://localhost:11434/api/ps).models | Select-Object name, size, size_vram, context_length, expires_at"));
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
  assert.equal(ledger.slug, "ollama-ps-explained");
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
  assert(content.toLowerCase().startsWith("**`ollama ps`"), "The primary keyword opens the article");
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /based on the scheduler code in Ollama 0\.40\.16\. Diagram by ByteVerse\./);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const file = readFileSync(new URL(`../${path}`, import.meta.url));
    const info = await sharp(file).metadata();
    assert.deepEqual([info.width, info.height, info.format], [1200, 675, "png"]);
    assert(file.length < 200 * 1024, "Illustrations stay small");
    assert.match(path, /^public\/blog\/ollama-ps\/ollama-ps-[a-z-]+\.png$/);
  }
  assert(content.includes("I did not install or run Ollama while writing this"));
  assert(content.includes("compare the table on your own machine"));
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
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 19, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Terminal mock-up showing an example ollama ps table with SIZE, PROCESSOR and UNTIL columns", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, "Illustration: ByteVerse"),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-ollama-ps-preview/", import.meta.url);
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
          await preview.locator(".blog-content img").scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-diagram.png", directory)) });
          await preview.locator(".blog-content pre").nth(1).scrollIntoViewIfNeeded();
          await preview.screenshot({ path: fileURLToPath(new URL("preview-375-table.png", directory)) });
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
