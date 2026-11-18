import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "docs/content-research/2026-11-17-keywords-candidates.json");
const seeds = [
  "ollama error", "ollama model requires more system memory", "ollama connection refused", "ollama could not connect",
  "ollama port 11434", "ollama address already in use", "ollama slow", "ollama context length", "ollama num_ctx",
  "ollama keep alive", "ollama unload model", "ollama access from another computer", "ollama host 0.0.0.0",
  "ollama cors", "ollama not responding", "ollama out of memory", "ollama 500 internal server error", "ollama timeout",
  "ollama model not found", "ollama pull error", "ollama run multiple models", "ollama cpu only", "ollama windows",
  "claude code error", "claude code not working", "claude code usage limit", "claude code mcp not connecting", "claude code slow",
  "cursor not working", "cursor connection failed", "cursor agent not working", "cursor slow",
  "github copilot agent mode not showing", "copilot chat not responding", "vscode copilot rate limit",
  "gemini cli error", "gemini not working", "gemini gems not showing", "chatgpt memory not working", "chatgpt not saving chats",
  "notebooklm not working", "notebooklm audio overview not working", "perplexity not working", "lm studio error",
  "open webui ollama not connecting", "n8n error workflow", "n8n retry on fail",
];
const request = (url) => fetch(url, {
  headers: { "user-agent": "ByteVerse-Editorial-Research/1.0", "accept-language": "en-US,en;q=0.9" },
  signal: AbortSignal.timeout(25000),
});
const safeError = (error) => ({ error: error.code ?? error.name });
assert.equal(process.argv.length, 2, "No arguments; collect a new dated research report once");

async function suggest(seed, source) {
  try {
    if (source === "google") {
      const url = new URL("https://suggestqueries.google.com/complete/search");
      url.search = new URLSearchParams({ client: "firefox", hl: "en", gl: "us", q: seed });
      const data = await (await request(url)).json();
      return data[1];
    }
    const url = new URL("https://api.bing.com/osjson.aspx");
    url.search = new URLSearchParams({ query: seed, market: "en-US" });
    const data = await (await request(url)).json();
    return data[1];
  } catch (error) { return safeError(error); }
}

const observations = [];
for (let offset = 0; offset < seeds.length; offset += 4) {
  observations.push(...await Promise.all(seeds.slice(offset, offset + 4).map(async (seed) => ({
    seed, google: await suggest(seed, "google"), bing: await suggest(seed, "bing"),
  }))));
  await new Promise((done) => setTimeout(done, 400));
}
const inventory = JSON.parse(await readFile(resolve(root, "docs/content-research/2026-11-17-inventory.json"), "utf8"));
const coverage = Object.fromEntries(["ollama", "claude-code", "cursor", "copilot", "gemini", "chatgpt", "notebooklm", "perplexity", "lm-studio", "open-webui"].map((term) => [term, inventory.titles.filter((post) => post.slug.includes(term)).map((post) => post.slug)]));
await writeFile(output, JSON.stringify({
  checkedAt: new Date().toISOString(), sources: ["Google public autocomplete (hl=en, gl=us)", "Bing public autocomplete (en-US)"],
  context: "Wording evidence only, not measured demand.", coverage, observations,
  metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null },
}, null, 2) + "\n", { flag: "wx" });
console.log("COVERAGE", JSON.stringify(coverage, null, 1));
for (const item of observations) {
  const list = (value) => (Array.isArray(value) ? value.slice(0, 10).join(" | ") : JSON.stringify(value));
  console.log(`\n# ${item.seed}\n  G: ${list(item.google)}\n  B: ${list(item.bing)}`);
}
