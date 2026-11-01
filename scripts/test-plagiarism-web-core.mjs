import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Transpiles only the trusted plagiarism helper modules; no route, network, or env access is loaded.
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();

function load(relativePath) {
  if (cache.has(relativePath)) return cache.get(relativePath).exports;
  const filename = path.join(root, relativePath);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true, isolatedModules: true },
  });
  assert.equal(output.diagnostics?.length ?? 0, 0, `${relativePath}: transpile diagnostics`);
  const module = { exports: {} };
  cache.set(relativePath, module);
  const requireLocal = (specifier) => {
    assert.ok(specifier.startsWith("./"), `Unexpected import ${specifier}`);
    return load(path.posix.join(path.posix.dirname(relativePath), `${specifier.slice(2)}.ts`));
  };
  new Function("exports", "require", "module", output.outputText)(module.exports, requireLocal, module);
  return module.exports;
}

const webCheck = load("src/lib/plagiarism/web-check.ts");
const brave = load("src/lib/plagiarism/brave-search.ts");
const handoff = load("src/lib/plagiarism/remover-handoff.ts");

test("tokenize keeps letters and numbers and drops apostrophes", () => {
  assert.deepEqual(webCheck.tokenize("Don\u2019t stop, Ali's caf\u00e9 \u2014 2026!"), ["dont", "stop", "alis", "caf\u00e9", "2026"]);
});

test("plainText removes highlight tags and decodes entities", () => {
  const markup = 'Use <strong>AI</strong> &amp; tools &#8211; &quot;quoted&quot; &#x27;x&#x27;<br>next &unknown;';
  assert.deepEqual(webCheck.tokenize(webCheck.plainText(markup)), ["use", "ai", "tools", "quoted", "x", "next", "unknown"]);
});

test("splitSentences breaks on sentence punctuation and line breaks", () => {
  assert.deepEqual(
    webCheck.splitSentences("First one. Second one!\r\nThird line\n\nFourth?"),
    ["First one.", "Second one!", "Third line", "Fourth?"],
  );
});

test("selectCheckSentences skips short sentences and caps long ones", () => {
  const short = "Too short here.";
  const eight = "This sentence has exactly eight words in it.";
  const long = `${Array.from({ length: 40 }, (_, index) => `word${index}`).join(" ")}.`;
  const { picked, eligibleCount } = webCheck.selectCheckSentences([short, eight, long].join(" "));
  assert.equal(eligibleCount, 2);
  assert.equal(picked[0].text, eight);
  assert.equal(picked[1].tokens.length, 30);
  assert.equal(picked[1].truncated, true);
});

test("selectCheckSentences spreads twelve picks across a long text", () => {
  const sentences = Array.from({ length: 30 }, (_, index) => `Sentence number ${index} has enough plain words to count.`);
  const { picked, eligibleCount } = webCheck.selectCheckSentences(sentences.join(" "));
  assert.equal(eligibleCount, 30);
  assert.equal(picked.length, 12);
  assert.equal(picked[0].text, sentences[0]);
  assert.equal(picked[11].text, sentences[27]);
});

test("runWebCheck scores matched words and keeps only verified http sources", async () => {
  const matched = "This exact sentence appears on a public page today.";
  const missing = "Another sentence here is not present in any result.";
  const failing = "The third sentence will fail during the search request.";
  const seenPhrases = [];

  const report = await webCheck.runWebCheck([matched, missing, failing].join(" "), async (phrase) => {
    seenPhrases.push(phrase);
    if (phrase === webCheck.tokenize(failing).join(" ")) throw new Error("provider down");
    if (phrase === webCheck.tokenize(matched).join(" ")) {
      return [
        {
          url: "https://example.com/post",
          title: "Example &amp; Co",
          snippets: ["Read: <strong>This exact sentence</strong> appears on a public page today."],
        },
        { url: "ftp://files.example/old", title: "FTP copy", snippets: [matched] },
        { url: "https://example.com/post", title: "Duplicate", snippets: [matched] },
      ];
    }
    return [{ url: "https://other.example/b", title: "Other page", snippets: ["Nothing matches here."] }];
  });

  assert.equal(seenPhrases.length, 3);
  assert.equal(report.score, 50);
  assert.equal(report.matchedWords, 9);
  assert.equal(report.checkedWords, 18);
  assert.equal(report.totalWords, 27);
  assert.equal(report.checkedSentences, 2);
  assert.equal(report.unavailableSentences, 1);
  assert.equal(report.sampled, false);
  assert.deepEqual(report.sentences.map((sentence) => sentence.status), ["matched", "not-found", "unavailable"]);
  const [source] = JSON.parse(JSON.stringify(report.sentences[0].sources));
  assert.deepEqual(source, { url: "https://example.com/post", title: "Example & Co", hostname: "example.com" });
  assert.equal(report.sentences[0].sources.length, 1);
});

test("runWebCheck reports no score when every search fails", async () => {
  const text = "One sentence with enough words to be checked here. Another sentence with enough words to be checked too.";
  const report = await webCheck.runWebCheck(text, async () => {
    throw new Error("offline");
  });
  assert.equal(report.score, null);
  assert.equal(report.checkedSentences, 0);
  assert.equal(report.unavailableSentences, 2);
});

test("Brave adapter sends an exact phrase and the key only in a header", async () => {
  let captured;
  const search = brave.createBraveExactPhraseSearch({
    apiKey: "test-key-123",
    fetchImpl: async (url, init) => {
      captured = { url, init };
      const body = {
        web: {
          results: [
            { url: "https://a.example/p", title: "Title", description: "Desc", extra_snippets: ["Extra", 5] },
            { title: "no url" },
          ],
        },
      };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  const hits = await search("alpha beta gamma delta epsilon zeta eta theta");
  const target = new URL(captured.url);
  assert.equal(`${target.origin}${target.pathname}`, "https://api.search.brave.com/res/v1/web/search");
  assert.equal(target.searchParams.get("q"), '"alpha beta gamma delta epsilon zeta eta theta"');
  assert.equal(target.searchParams.get("count"), "5");
  assert.equal(target.searchParams.get("extra_snippets"), "true");
  assert.equal(captured.init.headers["X-Subscription-Token"], "test-key-123");
  assert.ok(!captured.url.includes("test-key-123"));
  assert.deepEqual(JSON.parse(JSON.stringify(hits)), [{ url: "https://a.example/p", title: "Title", snippets: ["Desc", "Extra"] }]);
});

test("Brave adapter maps HTTP and network failures without leaking the key", async () => {
  const phrase = "one two three four five six seven eight";
  const limited = brave.createBraveExactPhraseSearch({
    apiKey: "secret-key-xyz",
    fetchImpl: async () => new Response("slow down", { status: 429 }),
  });
  await assert.rejects(limited(phrase), (error) =>
    error instanceof brave.SearchUnavailableError && error.status === 429 && !error.message.includes("secret-key-xyz"),
  );

  const offline = brave.createBraveExactPhraseSearch({
    apiKey: "secret-key-xyz",
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  await assert.rejects(offline(phrase), (error) => error instanceof brave.SearchUnavailableError && error.status === null);
});

test("remover handoff is one-time and expires", () => {
  const storage = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  };
  try {
    const savedAt = 1_000_000;
    handoff.saveRemoverHandoff("Checked draft text", savedAt);
    assert.equal(handoff.takeRemoverHandoff(savedAt + 1000), "Checked draft text");
    assert.equal(handoff.takeRemoverHandoff(savedAt + 1000), null);
    handoff.saveRemoverHandoff("Old draft", savedAt);
    assert.equal(handoff.takeRemoverHandoff(savedAt + 11 * 60 * 1000), null);
  } finally {
    delete globalThis.window;
  }
});
