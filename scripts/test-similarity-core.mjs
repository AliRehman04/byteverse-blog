import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

// Only these trusted local modules are transpiled in memory. No app entry point,
// dotenv, provider, database, browser, temporary output, or network is needed.
const root = fileURLToPath(new URL("../", import.meta.url));
const similarity = path.join(root, "src", "lib", "similarity");
const allowedModules = new Set(["types", "samples", "engine", "worker"]);
const moduleSources = new Map();
const compiledModules = new Map();

function compile(name) {
  assert.ok(allowedModules.has(name), "Only similarity modules may be loaded");
  if (compiledModules.has(name)) return compiledModules.get(name);
  const filename = path.join(similarity, `${name}.ts`);
  const source = readFileSync(filename, "utf8");
  moduleSources.set(name, source);
  const output = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, strict: true, isolatedModules: true },
  });
  assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
  compiledModules.set(name, output.outputText);
  return output.outputText;
}

function loadCore({ withoutIntl = false, withoutSegmenter = false } = {}) {
  const blocked = () => { throw new Error("Unexpected environment, network, DOM, or logging access"); };
  const sandbox = { console: { log: blocked, warn: blocked, error: blocked, info: blocked } };
  for (const name of ["fetch", "process", "window", "document", "XMLHttpRequest", "WebSocket", "localStorage"]) {
    Object.defineProperty(sandbox, name, { get: blocked });
  }
  const context = vm.createContext(sandbox);
  if (withoutIntl) vm.runInContext("globalThis.Intl = undefined", context);
  if (withoutSegmenter) vm.runInContext("Intl.Segmenter = undefined", context);
  const cache = new Map();
  function load(name) {
    assert.ok(allowedModules.has(name), "Unapproved similarity import");
    if (cache.has(name)) return cache.get(name).exports;
    const moduleRecord = { exports: {} };
    cache.set(name, moduleRecord);
    const wrapper = new vm.Script(`(function(exports, require, module) {\n${compile(name)}\n})`, {
      filename: path.join(similarity, `${name}.ts`),
    }).runInContext(context);
    wrapper(moduleRecord.exports, (specifier) => {
      assert.match(specifier, /^\.\/(types|engine)$/);
      return load(specifier.slice(2));
    }, moduleRecord);
    return moduleRecord.exports;
  }
  const engine = load("engine");
  context.engine = engine;
  return { engine, context, load };
}

const core = loadCore();
const { engine } = core;
const { SIMILARITY_LIMITS, DEFAULT_MATCH_OPTIONS } = core.load("types");
const defaults = { ...DEFAULT_MATCH_OPTIONS, minWords: 4 };
const plain = (value) => JSON.parse(JSON.stringify(value));
const source = (text, index = 0, label = `Fixture ${index + 1}`) => ({ id: `fixture-${index + 1}`, label, text });
const sourcesOf = (texts) => texts.map((text, index) => typeof text === "string" ? source(text, index) : text);
const compare = (draft, texts, options = {}) => engine.compareSources(draft, sourcesOf(texts), { ...defaults, ...options });
const repeat = (text, options = {}) => engine.findRepeatedSentences(text, { ...defaults, ...options });
const occurrences = (text, passage, options = {}) => engine.findSourceOccurrences(text, passage, { ...defaults, ...options });
const wordsOf = (text, ignoreCase = true) => Array.from(engine.tokenizeText(text, ignoreCase), (token) => token.value);
const slices = (text, ranges) => Array.from(ranges, (range) => text.slice(range.start, range.end));
const warningHas = (result, pattern) => result.warnings.some((warning) => pattern.test(warning));
const request = (draft, mode = "repeat") => ({ id: 42, mode, draft, sources: [], options: { ...defaults } });

function assertPercentage(actual, matched, eligible) {
  if (eligible === 0) assert.equal(actual, null);
  else assert.ok(Math.abs(actual - (100 * matched) / eligible) < 1e-10, "Expected matched / eligible percentage");
}

function assertOverlapCounts(result, expected, expectedSources) {
  const overlap = result.draft.sourceOverlap;
  assert.deepEqual(Object.keys(overlap).sort(), ["multiSourceWords", "singleSourceWords", "unmatchedWords"]);
  for (const value of Object.values(overlap)) assert.ok(Number.isSafeInteger(value) && value >= 0);
  assert.equal(overlap.singleSourceWords + overlap.multiSourceWords, result.draft.matchedWords);
  assert.equal(overlap.singleSourceWords + overlap.multiSourceWords + overlap.unmatchedWords, result.draft.stats.eligibleWords);
  let exclusiveTotal = 0;
  let sharedTotal = 0;
  for (const entry of result.sources) {
    for (const value of [entry.exclusiveDraftWords, entry.sharedDraftWords]) assert.ok(Number.isSafeInteger(value) && value >= 0);
    assert.equal(entry.exclusiveDraftWords + entry.sharedDraftWords, entry.draftMatchedWords);
    assert.ok(entry.exclusiveDraftWords <= overlap.singleSourceWords);
    assert.ok(entry.sharedDraftWords <= overlap.multiSourceWords);
    exclusiveTotal += entry.exclusiveDraftWords;
    sharedTotal += entry.sharedDraftWords;
  }
  assert.equal(exclusiveTotal, overlap.singleSourceWords);
  assert.ok(sharedTotal >= 2 * overlap.multiSourceWords);
  assert.ok(sharedTotal <= result.sources.length * overlap.multiSourceWords);
  if (expected) assert.deepEqual(plain(overlap), expected);
  if (expectedSources) {
    assert.deepEqual(Array.from(result.sources, (entry) => [entry.exclusiveDraftWords, entry.sharedDraftWords]), expectedSources);
  }
}

function assertSafeRanges(text, ranges) {
  let previousEnd = -1;
  for (const range of ranges) {
    assert.ok(Number.isInteger(range.start) && Number.isInteger(range.end));
    assert.ok(range.start >= 0 && range.start < range.end && range.end <= text.length);
    assert.ok(range.start >= previousEnd, "Ranges must be sorted and nonoverlapping");
    for (const offset of [range.start, range.end]) {
      const before = text.charCodeAt(offset - 1);
      const after = text.charCodeAt(offset);
      assert.ok(!(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff), "Range split a surrogate pair");
    }
    previousEnd = range.end;
  }
}

function assertOccurrenceEvidence(text, passage, result, options = defaults) {
  assert.deepEqual(Object.keys(result).sort(), ["ranges", "total", "truncated"]);
  assert.ok(Number.isSafeInteger(result.total) && result.total >= 0);
  assert.equal(result.ranges.length, Math.min(result.total, SIMILARITY_LIMITS.sourceOccurrences));
  assert.equal(result.truncated, result.total > SIMILARITY_LIMITS.sourceOccurrences);
  let previousStart = -1;
  for (const range of result.ranges) {
    // Occurrence ranges may overlap; only their starting positions are ordered.
    assertSafeRanges(text, [range]);
    assert.ok(range.start > previousStart);
    previousStart = range.start;
    assert.deepEqual(wordsOf(text.slice(range.start, range.end), options.ignoreCase), wordsOf(passage, options.ignoreCase));
  }
}

function assertEvidence(draft, inputSources, result) {
  assertOverlapCounts(result);
  const ids = new Set();
  for (let index = 0; index < result.sources.length; index++) {
    const entry = result.sources[index];
    const text = inputSources[index].text;
    assertSafeRanges(draft, entry.draftRanges);
    assertSafeRanges(text, entry.sourceRanges);
    for (const passage of entry.passages) {
      assert.equal(passage.sourceId, inputSources[index].id);
      assert.ok(!ids.has(passage.id), "Evidence IDs must be unique");
      ids.add(passage.id);
      const left = wordsOf(draft.slice(passage.draft.start, passage.draft.end), result.options.ignoreCase);
      const right = wordsOf(text.slice(passage.source.start, passage.source.end), result.options.ignoreCase);
      assert.deepEqual(left, right, "Evidence must pair original equal word sequences");
      assert.equal(left.length, passage.words);
      assert.ok(passage.words >= result.options.minWords);
      for (const [range, excluded] of [[passage.draft, result.draft.excludedRanges], [passage.source, entry.excludedRanges]]) {
        assert.ok(!excluded.some((gap) => range.start < gap.end && range.end > gap.start), "Evidence crossed an exclusion");
      }
    }
  }
  assertSafeRanges(draft, result.draft.matchRanges);
}

function withRunawayGuard(draft, texts, options = {}, mode = "compare") {
  core.context.fixture = { draft, sources: sourcesOf(texts), options: { ...defaults, ...options }, mode, id: 1 };
  try {
    // A generous CPU safety guard, not a performance benchmark or latency promise.
    return vm.runInContext("engine.analyzeRequest(fixture)", core.context, { timeout: 20_000 });
  } finally {
    delete core.context.fixture;
  }
}

function occurrencesWithRunawayGuard(text, passage, options = {}) {
  core.context.fixture = { text, passage, options: { ...defaults, ...options } };
  try {
    return vm.runInContext("engine.findSourceOccurrences(fixture.text, fixture.passage, fixture.options)", core.context, { timeout: 20_000 });
  } finally {
    delete core.context.fixture;
  }
}

test("scoped TypeScript checks use the project target with DOM and with worker-only libraries", () => {
  const config = JSON.parse(readFileSync(path.join(root, "tsconfig.json"), "utf8"));
  const converted = ts.convertCompilerOptionsFromJson(config.compilerOptions, root);
  assert.equal(converted.errors.length, 0);
  for (const lib of [converted.options.lib, ["lib.esnext.d.ts", "lib.webworker.d.ts"]]) {
    const program = ts.createProgram([path.join(similarity, "engine.ts"), path.join(similarity, "worker.ts")], {
      ...converted.options,
      lib,
      types: [],
      plugins: [],
      incremental: false,
      noEmit: true,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (filename) => filename,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n",
    }));
    const userFiles = program.getSourceFiles().filter((file) => !file.isDeclarationFile).map((file) => path.basename(file.fileName)).sort();
    assert.deepEqual(userFiles, ["engine.ts", "types.ts", "worker.ts"]);
  }
});

test("required exports and UI counters accept empty and over-limit editing states", () => {
  for (const name of ["tokenizeText", "getInputStats", "compareSources", "findSourceOccurrences", "findRepeatedSentences", "analyzeRequest"]) {
    assert.equal(typeof engine[name], "function");
  }
  assert.equal(SIMILARITY_LIMITS.sourceOccurrences, 20);
  assert.deepEqual(plain(engine.getInputStats("")), { words: 0, characters: 0 });
  assert.deepEqual(plain(engine.getInputStats("🙂 Café 2026!")), { words: 2, characters: 13 });
  assert.deepEqual(plain(engine.getInputStats(" !?… ")), { words: 0, characters: 5 });
  assert.equal(engine.getInputStats("a ".repeat(10_001)).words, 10_001);
  assert.equal(engine.getInputStats("x".repeat(60_001)).characters, 60_001);
});

test("tokenization preserves original UTF-16 spans across NFKC and lowercase expansion", () => {
  const text = "🙂 İ CAFÉ Cafe\u0301 ＦＯＯ ﬃ １２３ Don't don’t don‘t 𐐀";
  const tokens = engine.tokenizeText(text);
  assert.deepEqual(Array.from(tokens, (token) => token.value), ["i\u0307", "café", "café", "foo", "ffi", "123", "don't", "don't", "don't", "𐐨"]);
  assert.deepEqual(slices(text, tokens), ["İ", "CAFÉ", "Cafe\u0301", "ＦＯＯ", "ﬃ", "１２３", "Don't", "don’t", "don‘t", "𐐀"]);
  assertSafeRanges(text, tokens);
  assert.equal(tokens[0].start, 3);
  assert.equal(tokens[0].end, 4);
  assert.equal(tokens[3].end - tokens[3].start, 3);
  assert.equal(tokens[4].end - tokens[4].start, 1);
  assert.equal(tokens[tokens.length - 1].end, text.length);
});

test("locale-neutral folding, retained accents, numbers, and apostrophes are explicit", () => {
  assert.deepEqual(wordsOf("Straße STRASSE ẞ ß Σ σ ς İ i\u0307 I ı"), ["strasse", "strasse", "ss", "ss", "σ", "σ", "σ", "i\u0307", "i\u0307", "i", "ı"]);
  assert.deepEqual(wordsOf("Café cafe １２ 12", false), ["Café", "cafe", "12", "12"]);
  assert.deepEqual(wordsOf("don't don’t cant can't"), ["don't", "don't", "cant", "can't"]);
  assert.equal(compare("café beta gamma delta", ["cafe beta gamma delta"]).draft.matchedWords, 0);
  assert.equal(compare("don't stop making clear notes", ["don’t stop making clear notes"]).draft.matchedWords, 5);
});

test("Arabic, combining marks, astral letters, emoji boundaries, and unspaced CJK are honest", () => {
  const phrase = "اَلْعَرَبِيَّةُ لغة جميلة حقا";
  const draft = `🧪 ${phrase} 🙂`;
  const result = compare(draft, [phrase]);
  assert.equal(result.draft.stats.totalWords, 4);
  assert.equal(result.draft.matchedWords, 4);
  assert.deepEqual(slices(draft, result.draft.matchRanges), [phrase]);
  assertSafeRanges(draft, result.draft.matchRanges);
  assert.deepEqual(wordsOf("中文文本没有空格。日本語も空白なし。"), ["中文文本没有空格", "日本語も空白なし"]);
  const cjk = repeat("中文文本没有空格。日本語も空白なし。");
  assert.equal(cjk.groupCount, 0);
  assert.ok(warningHas(cjk, /under-segmented/));
  assert.ok(warningHas(cjk, /fewer than 4 eligible/));
  assert.equal(engine.tokenizeText("\u0301\u0308 🙂").length, 0);
});

test("fictional supplied samples produce real paired matches and repeat groups", () => {
  const { COMPARISON_SAMPLE, REPETITION_SAMPLE } = core.load("samples");
  const result = engine.compareSources(COMPARISON_SAMPLE.draft, COMPARISON_SAMPLE.sources, DEFAULT_MATCH_OPTIONS);
  assert.equal(result.draft.matchedWords, 22);
  assert.equal(result.sources[0].draftMatchedWords, 10);
  assert.equal(result.sources[1].draftMatchedWords, 12);
  assertEvidence(COMPARISON_SAMPLE.draft, COMPARISON_SAMPLE.sources, result);
  const repeated = engine.findRepeatedSentences(REPETITION_SAMPLE, DEFAULT_MATCH_OPTIONS);
  assert.equal(repeated.groupCount, 2);
  assert.equal(repeated.repeatedOccurrences, 2);
});

test("qualifying identical wording produces one maximal passage, not one per prefix", () => {
  const text = "alpha beta gamma delta epsilon zeta eta theta";
  const result = compare(text, [text]);
  assert.equal(result.draft.matchedWords, 8);
  assert.equal(result.draft.coverage, 100);
  assert.equal(result.sources[0].passageCount, 1);
  assert.equal(result.sources[0].passages[0].words, 8);
  assert.deepEqual(plain(result.draft.matchRanges), [{ start: 0, end: text.length }]);
  assertEvidence(text, [source(text)], result);
});

test("all four minimum lengths count qualifying sequences, never isolated shared words", () => {
  const twelve = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
  for (const minWords of [4, 6, 8, 12]) {
    assert.equal(compare(twelve, [twelve], { minWords }).draft.matchedWords, 12);
    assert.equal(compare("alpha beta gamma left", ["alpha beta gamma right"], { minWords }).draft.matchedWords, 0);
  }
  assert.equal(compare("alpha beta gamma delta epsilon", ["alpha beta gamma delta epsilon"], { minWords: 6 }).draft.matchedWords, 0);
});

test("source attribution follows the selected minimum, not isolated shared words", () => {
  const draft = "a b c d e f g h i j k l";
  const texts = [4, 6, 8].map((length) => draft.split(" ").slice(0, length).join(" "));
  for (const [minWords, expected, expectedSources] of [
    [4, { singleSourceWords: 2, multiSourceWords: 6, unmatchedWords: 4 }, [[0, 4], [0, 6], [2, 6]]],
    [6, { singleSourceWords: 2, multiSourceWords: 6, unmatchedWords: 4 }, [[0, 0], [0, 6], [2, 6]]],
    [8, { singleSourceWords: 8, multiSourceWords: 0, unmatchedWords: 4 }, [[0, 0], [0, 0], [8, 0]]],
    [12, { singleSourceWords: 0, multiSourceWords: 0, unmatchedWords: 12 }, [[0, 0], [0, 0], [0, 0]]],
  ]) {
    const result = compare(draft, texts, { minWords });
    assertOverlapCounts(result, expected, expectedSources);
    assertEvidence(draft, sourcesOf(texts), result);
  }
});

test("punctuation and spacing normalize without shifting highlight offsets", () => {
  const draft = "🙂 İ, TWO—three...four?! extra";
  const supplied = "i\u0307 two three four";
  const result = compare(draft, [supplied]);
  assert.equal(result.draft.matchedWords, 4);
  assert.deepEqual(slices(draft, result.draft.matchRanges), ["İ, TWO—three...four"]);
  assert.equal(result.draft.matchRanges[0].start, 3);
  assertEvidence(draft, [source(supplied)], result);
});

test("one changed word breaks a chain and unmatched gaps are never colored", () => {
  const draft = "one two three four five CHANGED six seven eight nine ten";
  const supplied = "one two three four five ORIGINAL six seven eight nine ten";
  const result = compare(draft, [supplied]);
  assert.equal(result.draft.matchedWords, 10);
  assertPercentage(result.draft.coverage, 10, 11);
  assert.equal(result.sources[0].passageCount, 2);
  assert.deepEqual(slices(draft, result.draft.matchRanges), ["one two three four five", "six seven eight nine ten"]);
  assertEvidence(draft, [source(supplied)], result);
});

test("coverage unions overlaps across sources and counts each draft position once", () => {
  const draft = "a b c d e f g h i j";
  const texts = ["a b c d e f", "e f g h i j", "c d e f g h"];
  const result = compare(draft, texts);
  assert.equal(result.draft.matchedWords, 10);
  assert.equal(result.draft.coverage, 100);
  assert.deepEqual(Array.from(result.sources, (entry) => entry.draftMatchedWords), [6, 6, 6]);
  assert.deepEqual(slices(draft, result.draft.matchRanges), [draft]);
  assertOverlapCounts(result, { singleSourceWords: 4, multiSourceWords: 6, unmatchedWords: 0 }, [[2, 4], [2, 4], [0, 6]]);
  assertEvidence(draft, sourcesOf(texts), result);
});

test("five partially overlapping source records partition eligible positions regardless of source order", () => {
  const draft = "a b c d e f g h i j k l m n";
  const inputs = sourcesOf(["a b c d e f", "e f g h i j", "e f g h", "i j k l", "a b c d e f"]);
  const result = compare(draft, inputs);
  assertOverlapCounts(result, { singleSourceWords: 2, multiSourceWords: 10, unmatchedWords: 2 }, [[0, 6], [0, 6], [0, 4], [2, 2], [0, 6]]);
  assert.equal(result.draft.matchedWords, 12);
  assertEvidence(draft, inputs, result);
  const reordered = compare(draft, inputs.slice().reverse());
  assert.deepEqual(plain(reordered.draft), plain(result.draft));
  for (const entry of reordered.sources) {
    const original = result.sources.find((candidate) => candidate.id === entry.id);
    assert.equal(entry.exclusiveDraftWords, original.exclusiveDraftWords);
    assert.equal(entry.sharedDraftWords, original.sharedDraftWords);
  }
});

test("short-source copying has directional, not averaged or cosine, coverage", () => {
  const draft = "a b c d e f g h i j";
  const result = compare(draft, ["c d e f"]);
  assert.equal(result.draft.coverage, 40);
  assert.equal(result.sources[0].draftCoverage, 40);
  assert.equal(result.sources[0].coverage, 100);
  assert.equal(result.sources[0].matchedWords, 4);
  const inverse = compare("c d e f", [draft]);
  assert.equal(inverse.draft.coverage, 100);
  assert.equal(inverse.sources[0].coverage, 40);
});

test("overlapping matches within one source and all reverse occurrences form exact unions", () => {
  const draft = "a b c d e f";
  const text = "a b c d STOP c d e f STOP a b c d";
  const result = compare(draft, [text]);
  assert.equal(result.draft.matchedWords, 6);
  assert.equal(result.sources[0].matchedWords, 12);
  assertPercentage(result.sources[0].coverage, 12, 14);
  assertOverlapCounts(result, { singleSourceWords: 6, multiSourceWords: 0, unmatchedWords: 0 }, [[6, 0]]);
  assert.deepEqual(slices(text, result.sources[0].sourceRanges), ["a b c d", "c d e f", "a b c d"]);
  assert.equal(result.sources[0].passageCount, 2);
  assertEvidence(draft, [source(text)], result);
  assert.ok(warningHas(result, /one deterministic source occurrence/));
});

test("duplicate documents and duplicate labels cannot inflate overall coverage", () => {
  const draft = "a b c d e f g h";
  const single = compare(draft, ["a b c d"]);
  const inputs = [source("a b c d", 0, "Same label"), source("a b c d", 1, "Same label")];
  const duplicate = compare(draft, inputs);
  assert.equal(duplicate.draft.matchedWords, single.draft.matchedWords);
  assert.equal(duplicate.draft.coverage, 50);
  assertOverlapCounts(single, { singleSourceWords: 4, multiSourceWords: 0, unmatchedWords: 4 }, [[4, 0]]);
  assertOverlapCounts(duplicate, { singleSourceWords: 0, multiSourceWords: 4, unmatchedWords: 4 }, [[0, 4], [0, 4]]);
  assert.ok(warningHas(duplicate, /share a label/));
  assertEvidence(draft, inputs, duplicate);
  const doubled = compare(`${draft} ${draft}`, ["a b c d"]);
  assert.equal(doubled.draft.coverage, single.draft.coverage);
  assertOverlapCounts(doubled, { singleSourceWords: 8, multiSourceWords: 0, unmatchedWords: 8 }, [[8, 0]]);
});

test("case-sensitive mode still performs NFKC but does not silently lowercase", () => {
  assert.equal(compare("Ａlpha beta gamma delta", ["Alpha beta gamma delta"], { ignoreCase: false }).draft.coverage, 100);
  assert.equal(compare("Alpha beta gamma delta", ["alpha beta gamma delta"], { ignoreCase: false }).draft.matchedWords, 0);
  assert.equal(compare("Alpha beta gamma delta", ["alpha beta gamma delta"], { ignoreCase: true }).draft.matchedWords, 4);
  const draft = "Ａlpha beta gamma delta tail";
  const texts = ["Alpha beta gamma delta", "alpha beta gamma delta"];
  assertOverlapCounts(compare(draft, texts, { ignoreCase: false }), { singleSourceWords: 4, multiSourceWords: 0, unmatchedWords: 1 }, [[4, 0], [0, 0]]);
  assertOverlapCounts(compare(draft, texts), { singleSourceWords: 0, multiSourceWords: 4, unmatchedWords: 1 }, [[0, 4], [0, 4]]);
});

test("Unicode attribution counts original tokens across NFKC, case expansion, and retained accents", () => {
  const draft = "🙂 Cafe\u0301 ＳＴＲＡＳＳＥ İ 𐐀 extra";
  const texts = ["café Straße i\u0307 𐐨", "CAFÉ STRASSE İ 𐐀", "cafe strasse i\u0307 𐐨"];
  const result = compare(draft, texts);
  assert.equal(result.draft.stats.eligibleWords, 5);
  assertOverlapCounts(result, { singleSourceWords: 0, multiSourceWords: 4, unmatchedWords: 1 }, [[0, 4], [0, 4], [0, 0]]);
  assertEvidence(draft, sourcesOf(texts), result);
});

test("all recognized balanced quote pairs exclude words in both documents", () => {
  for (const [open, close] of [['"', '"'], ["“", "”"], ["«", "»"], ["‘", "’"]]) {
    const text = `${open}skip these four words${close} alpha beta gamma delta`;
    const result = compare(text, [text], { excludeQuotes: true });
    assert.deepEqual(plain(result.draft.stats), { totalWords: 8, eligibleWords: 4, excludedWords: 4, characters: text.length });
    assert.equal(result.draft.coverage, 100);
    assert.equal(result.sources[0].matchedWords, 4);
    assert.equal(result.sources[0].stats.excludedWords, 4);
    assert.deepEqual(slices(text, result.draft.excludedRanges), [`${open}skip these four words${close}`]);
    assert.deepEqual(slices(text, result.draft.matchRanges), ["alpha beta gamma delta"]);
  }
});

test("curly contractions, combining marks, and possessive apostrophes are not false openers", () => {
  const text = "Don’t change our team’s careful notes";
  const result = compare(text, [text], { excludeQuotes: true });
  assert.equal(result.draft.stats.excludedWords, 0);
  assert.equal(result.draft.matchedWords, 6);
  assert.equal(result.draft.excludedRanges.length, 0);
  const combining = "a\u0301’b and 𐐀’𐐁 form words";
  assert.equal(compare(combining, [combining], { excludeQuotes: true }).draft.stats.excludedWords, 0);
  const quoted = "‘Don’t change our team’s notes’ alpha beta gamma delta";
  assert.equal(compare(quoted, [quoted], { excludeQuotes: true }).draft.stats.eligibleWords, 4);
});

test("nested balanced quotes merge, escaped quotes are literal, and unbalanced tails remain eligible", () => {
  const nested = "“one «two three» four” alpha beta gamma delta";
  const result = compare(nested, [nested], { excludeQuotes: true });
  assert.deepEqual(slices(nested, result.draft.excludedRanges), ["“one «two three» four”"]);
  for (const opener of ['"', "“", "«", "‘"]) {
    const unbalanced = `${opener}alpha beta gamma delta`;
    assert.equal(compare(unbalanced, [unbalanced], { excludeQuotes: true }).draft.stats.excludedWords, 0);
  }
  const escaped = '\\"alpha beta gamma delta\\"';
  assert.equal(compare(escaped, [escaped], { excludeQuotes: true }).draft.stats.excludedWords, 0);
});

test("excluded words and empty excluded quotes are hard match barriers on either side", () => {
  for (const gap of ['"hidden"', '""', "“”", "«»", "‘’"]) {
    const split = `one two ${gap} three four`;
    const forward = compare(split, ["one two three four"], { excludeQuotes: true });
    assert.equal(forward.draft.matchedWords, 0);
    assert.equal(forward.draft.stats.eligibleWords, 4);
    assertOverlapCounts(forward, { singleSourceWords: 0, multiSourceWords: 0, unmatchedWords: 4 }, [[0, 0]]);
    assert.equal(compare("one two three four", [split], { excludeQuotes: true }).draft.matchedWords, 0);
    assert.equal(compare(split, [split], { excludeQuotes: true }).draft.matchedWords, 0);
  }
  const split = 'one two three four "" five six seven eight';
  const result = compare(split, [split], { excludeQuotes: true });
  assert.equal(result.draft.matchedWords, 8);
  assert.equal(result.draft.matchRanges.length, 2);
  assert.deepEqual(slices(split, result.draft.matchRanges), ["one two three four", "five six seven eight"]);
  assertOverlapCounts(result, { singleSourceWords: 8, multiSourceWords: 0, unmatchedWords: 0 }, [[8, 0]]);
});

test("source attribution excludes quoted/reference words and never bridges empty quote gaps", () => {
  const draft = 'one two "" three four five six "hidden quoted words here"\nReferences\none two three four';
  const texts = [
    "one two three four five six",
    "three four five six",
    'three four "" five six',
    'one two "three four five six"\nReferences\nthree four five six',
  ];
  const result = compare(draft, texts, { excludeQuotes: true, excludeReferences: true });
  assert.equal(result.draft.stats.eligibleWords, 6);
  assert.equal(result.draft.stats.excludedWords, 9);
  assertOverlapCounts(result, { singleSourceWords: 0, multiSourceWords: 4, unmatchedWords: 2 }, [[0, 4], [0, 4], [0, 0], [0, 0]]);
  assertEvidence(draft, sourcesOf(texts), result);
});

test("references detector accepts explicit terminal headings, including Markdown and case variants", () => {
  for (const heading of ["References", "BIBLIOGRAPHY", "Works Cited", "## rEfErEnCeS", "  ### Works Cited: ###", "References:"]) {
    const text = `alpha beta gamma delta\r\n${heading}\r\nother cited source words`;
    const result = compare(text, [text], { excludeReferences: true });
    assert.equal(result.draft.stats.eligibleWords, 4);
    assert.equal(result.sources[0].stats.eligibleWords, 4);
    assert.equal(result.draft.matchedWords, 4);
    assert.deepEqual(slices(text, result.draft.excludedRanges), [`${heading}\r\nother cited source words`]);
  }
});

test("inline citations, prose references, and later Markdown sections are not trailing bibliographies", () => {
  for (const text of [
    "These references describe useful work [1] (Author, 2026).",
    "References to other work are useful here.",
    "alpha beta gamma delta\n## References\nsource words\n## Appendix\nmore words here now",
    "“\nReferences\nquoted discussion\n”\nalpha beta gamma delta",
  ]) {
    assert.equal(compare(text, [text], { excludeReferences: true }).draft.excludedRanges.length, 0);
  }
  const text = "a b c d\n## References\nold notes\n## Appendix\nnew notes\nBibliography\nfinal notes";
  assert.deepEqual(slices(text, compare(text, [text], { excludeReferences: true }).draft.excludedRanges), ["Bibliography\nfinal notes"]);
});

test("combined exclusions are merged and do not double-count excluded words", () => {
  const text = 'alpha beta gamma delta\nReferences\n"one two three four"';
  const result = compare(text, [text], { excludeQuotes: true, excludeReferences: true });
  assert.equal(result.draft.stats.totalWords, 9);
  assert.equal(result.draft.stats.excludedWords, 5);
  assert.equal(result.draft.stats.eligibleWords, 4);
  assert.equal(result.draft.excludedRanges.length, 1);
  assert.equal(result.draft.coverage, 100);
});

test("zero eligible denominators are null; short valid text returns help, not 100 unique", () => {
  const text = '"one two three four"';
  const both = compare(text, [text], { excludeQuotes: true });
  assert.equal(both.draft.coverage, null);
  assert.equal(both.sources[0].coverage, null);
  assert.equal(both.sources[0].draftCoverage, null);
  assert.equal(both.draft.matchedWords, 0);
  assertOverlapCounts(both, { singleSourceWords: 0, multiSourceWords: 0, unmatchedWords: 0 }, [[0, 0]]);
  assert.ok(warningHas(both, /no eligible words/));
  const zeroSource = compare("one two three four", [text], { excludeQuotes: true });
  assert.equal(zeroSource.draft.coverage, 0);
  assert.equal(zeroSource.sources[0].coverage, null);
  assertOverlapCounts(zeroSource, { singleSourceWords: 0, multiSourceWords: 0, unmatchedWords: 4 }, [[0, 0]]);
  const zeroDraft = compare(text, ["one two three four"], { excludeQuotes: true });
  assert.equal(zeroDraft.draft.coverage, null);
  assert.equal(zeroDraft.sources[0].coverage, 0);
  assertOverlapCounts(zeroDraft, { singleSourceWords: 0, multiSourceWords: 0, unmatchedWords: 0 }, [[0, 0]]);
  const short = compare("one two", ["one two"]);
  assert.equal(short.draft.coverage, 0);
  assertOverlapCounts(short, { singleSourceWords: 0, multiSourceWords: 0, unmatchedWords: 2 }, [[0, 0]]);
  assertOverlapCounts(compare("one two three four", ["one two three four", "one two"]), { singleSourceWords: 4, multiSourceWords: 0, unmatchedWords: 0 }, [[4, 0], [0, 0]]);
  assert.ok(warningHas(short, /fewer than 4 eligible words/));
  assert.equal(repeat("one two").groupCount, 0);
  assert.equal(repeat(text, { excludeQuotes: true }).searchPassages.length, 0);
  assert.equal(compare("References\nnotes", ["References\nnotes"], { excludeReferences: true }).draft.coverage, null);
});

test("empty, whitespace, punctuation-only, wrong-type, and combining-mark-only documents reject clearly", () => {
  for (const value of ["", " \r\n\t ", "!?…—🙂", "\u0301\u0308"]) {
    assert.throws(() => compare(value, ["one two three four"]), /must contain at least one word/);
    assert.throws(() => compare("one two three four", [value]), /Source 1 must contain/);
    assert.throws(() => repeat(value), /must contain at least one word/);
  }
  for (const value of [null, undefined, 123, {}, []]) {
    assert.throws(() => engine.tokenizeText(value), /must be a string/);
    assert.throws(() => compare(value, ["one two three four"]), /Draft must be text/);
    assert.throws(() => repeat(value), /Document must be text/);
  }
  assert.throws(() => engine.tokenizeText("text", "yes"), /case option/);
});

test("invalid and duplicate IDs reject, while labels are nonempty and never used as identity", () => {
  const text = "one two three four";
  for (const id of ["", " ", " padded ", null, 12]) {
    assert.throws(() => compare(text, [{ id, label: "Safe label", text }]), /nonempty ID/);
  }
  for (const label of ["", " ", null, 12]) {
    assert.throws(() => compare(text, [{ id: "safe", label, text }]), /nonempty text label/);
  }
  assert.throws(() => compare(text, [source(text), source(text)]), /IDs must be unique/);
  assert.throws(() => compare(text, [{ id: "a", label: "a", text: null }]), /text as a string/);
  assert.throws(() => engine.compareSources(text, [null], defaults), /nonempty ID/);
});

test("invalid options, source counts, and source-list shapes fail instead of silently defaulting", () => {
  const text = "one two three four";
  for (const options of [null, {}, [], { ...defaults, minWords: 3 }, { ...defaults, minWords: "4" }, { ...defaults, minWords: NaN }]) {
    assert.throws(() => engine.compareSources(text, [source(text)], options), /minimum match length/);
  }
  for (const key of ["ignoreCase", "excludeQuotes", "excludeReferences"]) {
    for (const invalid of [undefined, null, 0, "false"]) {
      assert.throws(() => engine.findRepeatedSentences(text, { ...defaults, [key]: invalid }), /true or false/);
    }
  }
  assert.throws(() => repeat(text, { aiDetection: true }), /Unsupported comparison option/);
  assert.throws(() => engine.compareSources(text, null, defaults), /Sources must be a list/);
  assert.throws(() => compare(text, []), /at least one supplied source/);
  assert.throws(() => compare(text, Array(6).fill(text)), /at most 5/);
  assert.equal(compare(text, Array(5).fill(text)).sources.length, 5);
});

test("per-document character and word limits reject before returning partial results", () => {
  const valid = "one two three four";
  const charBoundary = `${valid}${" ".repeat(SIMILARITY_LIMITS.maxChars - valid.length)}`;
  assert.equal(compare(charBoundary, [valid]).draft.stats.characters, 60_000);
  assert.equal(compare(valid, [charBoundary]).sources[0].stats.characters, 60_000);
  for (const text of ["x".repeat(60_001), `${charBoundary} `]) {
    assert.throws(() => compare(text, [valid]), /Draft exceeds the 60,000-character limit/);
    assert.throws(() => compare(valid, [valid, text]), /Source 2 exceeds the 60,000-character limit/);
    assert.throws(() => repeat(text), /60,000-character limit/);
  }
  const tooMany = Array(10_001).fill("a").join(" ");
  assert.throws(() => compare(tooMany, [valid]), /Draft exceeds the 10,000-word limit/);
  assert.throws(() => compare(valid, [tooMany]), /Source 1 exceeds the 10,000-word limit/);
  assert.throws(() => repeat(tooMany), /10,000-word limit/);
});

test("10,000 identical-token documents and five sources are bounded and exact", () => {
  const text = Array(10_000).fill("a").join(" ");
  const result = withRunawayGuard(text, Array(5).fill(text));
  assert.equal(result.draft.stats.totalWords, 10_000);
  assert.equal(result.draft.matchedWords, 10_000);
  assert.equal(result.draft.coverage, 100);
  assertOverlapCounts(result, { singleSourceWords: 0, multiSourceWords: 10_000, unmatchedWords: 0 }, Array(5).fill([0, 10_000]));
  for (const entry of result.sources) {
    assert.equal(entry.matchedWords, 10_000);
    assert.equal(entry.passageCount, 1);
    assert.equal(entry.passages[0].words, 10_000);
  }
  assertEvidence(text, sourcesOf(Array(5).fill(text)), result);
});

test("pathological overlapping windows cap evidence but not coverage or passage counts", () => {
  const text = Array(10_000).fill("a").join(" ");
  const result = withRunawayGuard(text, ["a a a a"]);
  const entry = result.sources[0];
  assert.equal(entry.passages.length, 150);
  assert.equal(entry.passageCount, 9_997);
  assert.equal(result.draft.matchedWords, 10_000);
  assert.equal(entry.matchedWords, 4);
  assertOverlapCounts(result, { singleSourceWords: 10_000, multiSourceWords: 0, unmatchedWords: 0 }, [[10_000, 0]]);
  assert.equal(result.draft.matchRanges.length, 1);
  assert.ok(warningHas(result, /9847 of 9997/));
  assertEvidence(text, [source("a a a a")], result);
  const reverse = withRunawayGuard("a a a a", [text]);
  assert.equal(reverse.sources[0].matchedWords, 10_000);
  assert.equal(reverse.sources[0].sourceRanges[0].end, text.length);
  assert.equal(reverse.sources[0].passageCount, 1);
  assertOverlapCounts(reverse, { singleSourceWords: 4, multiSourceWords: 0, unmatchedWords: 0 }, [[4, 0]]);
});

test("disjoint passage caps retain late matches, their counts, and exact highlight gaps", () => {
  const draft = Array(175).fill("one two three four gap").join(" ");
  const result = compare(draft, ["one two three four"]);
  assert.equal(result.sources[0].passageCount, 175);
  assert.equal(result.sources[0].passages.length, 150);
  assert.equal(result.draft.matchedWords, 700);
  assert.equal(result.draft.matchRanges.length, 175);
  assert.equal(result.draft.coverage, 80);
  assertOverlapCounts(result, { singleSourceWords: 700, multiSourceWords: 0, unmatchedWords: 175 }, [[700, 0]]);
  assert.ok(warningHas(result, /25 of 175/));
  assert.ok(slices(draft, result.draft.matchRanges).every((slice) => slice === "one two three four"));
});

test("late shared matches remain in attribution even when absent from a source's capped evidence", () => {
  const blocks = Array.from({ length: 175 }, (_, index) => `topic${index} has clear notes`);
  const draft = blocks.map((block) => `${block} gap`).join(" ");
  const texts = [blocks.join(" BREAK "), blocks.slice(150).join(" PAUSE ")];
  const result = compare(draft, texts);
  assert.equal(result.sources[0].passageCount, 175);
  assert.equal(result.sources[0].passages.length, SIMILARITY_LIMITS.passagesPerSource);
  assert.equal(result.sources[0].draftRanges.length, 175);
  assert.ok(result.sources[0].passages.every((passage) => passage.draft.end < draft.indexOf(blocks[150])));
  assertOverlapCounts(result, { singleSourceWords: 600, multiSourceWords: 100, unmatchedWords: 175 }, [[600, 100], [0, 100]]);
  assertEvidence(draft, sourcesOf(texts), result);
  const duplicate = compare(draft, [...texts, texts[0]]);
  assert.equal(duplicate.draft.matchedWords, result.draft.matchedWords);
  assertOverlapCounts(duplicate, { singleSourceWords: 0, multiSourceWords: 700, unmatchedWords: 175 }, [[0, 700], [0, 100], [0, 700]]);
});

test("long varied inputs exercise suffix clones and exclusions without pair enumeration", () => {
  const tokens = Array.from({ length: 9_000 }, (_, index) => `w${(index * 29) % 97}`);
  const draft = tokens.join(" ");
  const cut = tokens.slice();
  cut[4_500] = "changed";
  const result = withRunawayGuard(draft, [cut.join(" ")]);
  assert.equal(result.draft.matchedWords, 9_000);
  // Periodicity makes every draft position match elsewhere; the new source word
  // does not. This checks coverage is positional, not one chosen alignment.
  assert.equal(result.sources[0].matchedWords, 8_999);
  assertEvidence(draft, [source(cut.join(" "))], result);
  const separated = Array(2_000).fill('a b c d ""').join(" ");
  const excluded = withRunawayGuard(separated, ["a b c d"], { excludeQuotes: true });
  assert.equal(excluded.draft.matchedWords, 8_000);
  assert.equal(excluded.draft.matchRanges.length, 2_000);
});

test("source occurrence lookup retains overlapping full matches in original source order", () => {
  const text = "a b a b a b a b";
  const passage = "a b a b";
  const result = occurrences(text, passage);
  assert.deepEqual(plain(result), {
    ranges: [{ start: 0, end: 7 }, { start: 4, end: 11 }, { start: 8, end: 15 }],
    total: 3,
    truncated: false,
  });
  assertOccurrenceEvidence(text, passage, result);
  const fallbackText = "a b a b a b c d a b a b c d";
  const fallbackPassage = "a b a b c d";
  const fallback = occurrences(fallbackText, fallbackPassage);
  assert.deepEqual(Array.from(fallback.ranges, (range) => range.start), [4, 16]);
  assert.equal(fallback.total, 2);
  assertOccurrenceEvidence(fallbackText, fallbackPassage, fallback);
});

test("source occurrence lookup requires the whole selected passage, not minimum-length subphrases", () => {
  const passage = "alpha beta gamma delta epsilon zeta";
  const partial = "alpha beta gamma delta STOP gamma delta epsilon zeta";
  assert.deepEqual(plain(occurrences(partial, passage)), { ranges: [], total: 0, truncated: false });
  const text = `${partial} STOP ${passage}`;
  const result = occurrences(text, passage);
  assert.deepEqual(plain(result.ranges), [{ start: text.length - passage.length, end: text.length }]);
  assert.equal(result.total, 1);
  assertOccurrenceEvidence(text, passage, result);
  const twelve = "a b c d e f g h i j k l";
  for (const minWords of [4, 6, 8, 12]) {
    assert.equal(occurrences(`${twelve} STOP ${twelve}`, twelve, { minWords }).total, 2);
    assert.equal(occurrences("a b c d", "a b c d", { minWords }).total, minWords === 4 ? 1 : 0);
  }
  assert.equal(occurrences("someone two three fourish", "one two three four").total, 0);
});

test("source occurrences normalize NFKC, expansions, apostrophes, and punctuation without losing UTF-16 offsets", () => {
  for (const [first, second, nonmatch, passage] of [
    ["Cafe\u0301 ＳＴＲＡＳＳＥ i\u0307 𐐀", "CAFÉ Straße İ 𐐨", "cafe STRASSE i\u0307 𐐨", "café strasse İ 𐐀"],
    ["ＦＯＯ, ﬃ—１２３ don’t", "FOO ffi 123 don't", "foo ffi 123 dont", "foo ffi 123 don‘t"],
  ]) {
    const text = `🙂 ${first} / ${second} / ${nonmatch}`;
    const result = occurrences(text, passage);
    assert.deepEqual(slices(text, result.ranges), [first, second]);
    assert.deepEqual(plain(result.ranges), [first, second].map((value) => ({ start: text.indexOf(value), end: text.indexOf(value) + value.length })));
    assert.equal(result.total, 2);
    assertOccurrenceEvidence(text, passage, result);
  }
});

test("case-sensitive occurrence lookup still normalizes compatibility characters", () => {
  const passage = "Alpha beta gamma delta";
  const text = `Ａlpha beta gamma delta / alpha beta gamma delta / ${passage}`;
  const sensitive = occurrences(text, passage, { ignoreCase: false });
  assert.deepEqual(slices(text, sensitive.ranges), ["Ａlpha beta gamma delta", passage]);
  assert.equal(sensitive.total, 2);
  assert.equal(occurrences(text, passage).total, 3);
  assertOccurrenceEvidence(text, passage, sensitive, { ...defaults, ignoreCase: false });
  const sharpS = "Straße beta gamma delta / STRASSE beta gamma delta";
  assert.equal(occurrences(sharpS, "Straße beta gamma delta", { ignoreCase: false }).total, 1);
  assert.equal(occurrences(sharpS, "Straße beta gamma delta").total, 2);
});

test("source occurrences respect balanced quotes and empty quote barriers without stitching either side", () => {
  const passage = "one two three four";
  for (const [open, close] of [['"', '"'], ["“", "”"], ["«", "»"], ["‘", "’"]]) {
    const text = `${open}${passage}${close} / one two ${open}${close} three four / ${passage}`;
    const result = occurrences(text, passage, { excludeQuotes: true });
    assert.deepEqual(plain(result), { ranges: [{ start: text.length - passage.length, end: text.length }], total: 1, truncated: false });
    assert.equal(occurrences(text, passage).total, 3);
    assertOccurrenceEvidence(text, passage, result);
    for (const gap of [`${open}${close}`, `${open}hidden${close}`]) {
      const split = `one two ${gap} three four`;
      assert.deepEqual(plain(occurrences(split, passage, { excludeQuotes: true })), { ranges: [], total: 0, truncated: false });
      assert.deepEqual(plain(occurrences(passage, split, { excludeQuotes: true })), { ranges: [], total: 0, truncated: false });
    }
  }
  for (const text of ['"one two three four', '\\"one two three four\\"', "Don’t change our team’s careful notes"]) {
    const phrase = text.includes("Don’t") ? "don't change our team's careful notes" : passage;
    assert.equal(occurrences(text, phrase, { excludeQuotes: true }).total, 1);
  }
  assert.equal(occurrences('“one «two three» four” one two three four', passage, { excludeQuotes: true }).total, 1);
});

test("source occurrence lookup applies full-source reference exclusions and later-section rules", () => {
  const passage = "one two three four";
  for (const heading of ["References", "## Bibliography", "  ### Works Cited: ###"]) {
    const text = `${passage}\n${heading}\n${passage}\n${passage}`;
    const result = occurrences(text, passage, { excludeReferences: true });
    assert.deepEqual(plain(result), { ranges: [{ start: 0, end: passage.length }], total: 1, truncated: false });
    assert.equal(occurrences(text, passage).total, 3);
    assertOccurrenceEvidence(text, passage, result);
  }
  assert.equal(occurrences("one two\nReferences\nthree four", "one two references three four", { excludeReferences: true }).total, 0);
  const laterSection = `## References\n${passage}\n## Appendix\n${passage}`;
  assert.equal(occurrences(laterSection, passage, { excludeReferences: true }).total, 2);
  const quotedHeading = `“\nReferences\n${passage}\n”\n${passage}`;
  assert.equal(occurrences(quotedHeading, passage, { excludeReferences: true }).total, 2);
  assert.equal(occurrences(quotedHeading, passage, { excludeReferences: true, excludeQuotes: true }).total, 1);
  const both = `${passage}\n"${passage}"\nReferences\n${passage}`;
  assert.equal(occurrences(both, passage, { excludeReferences: true, excludeQuotes: true }).total, 1);
});

test("on-demand lookup preserves engine evidence and does not reclassify reference headings inside an eligible excerpt", () => {
  const prefix = "alpha beta gamma delta\nReferences\nthese are source notes";
  const draft = `${prefix}\n## Appendix\ndraft ending`;
  const text = `${prefix}\n## Notes\nsource ending`;
  const options = Object.freeze({ ...defaults, excludeReferences: true });
  const result = engine.compareSources(draft, [source(text)], options);
  const before = JSON.stringify(result);
  const passage = result.sources[0].passages.find((entry) => draft.slice(entry.draft.start, entry.draft.end) === prefix);
  assert.ok(passage, "The later Markdown sections keep the common prefix eligible in both full documents");
  const found = engine.findSourceOccurrences(text, draft.slice(passage.draft.start, passage.draft.end), options);
  assert.deepEqual(plain(found), { ranges: [{ start: 0, end: prefix.length }], total: 1, truncated: false });
  assert.deepEqual(plain(found.ranges[0]), plain(passage.source));
  assert.deepEqual(plain(engine.findSourceOccurrences(text, prefix, options)), plain(found));
  assert.equal(JSON.stringify(result), before, "Lookup must not alter the comparison or its deterministic source occurrence");
  assert.deepEqual(options, { ...defaults, excludeReferences: true });
  assertOccurrenceEvidence(text, prefix, found, options);
  assertEvidence(draft, [source(text)], result);
});

test("occurrence range caps preserve exact totals below, at, and above twenty overlapping matches", () => {
  const passage = "a a a a";
  for (const count of [19, 20, 21, 137, 9_997]) {
    const text = Array(count + 3).fill("a").join(" ");
    const result = occurrencesWithRunawayGuard(text, passage);
    assert.deepEqual(plain(result), {
      ranges: Array.from({ length: Math.min(count, 20) }, (_, index) => ({ start: index * 2, end: index * 2 + 7 })),
      total: count,
      truncated: count > 20,
    });
    assertOccurrenceEvidence(text, passage, result);
  }
  const separated = Array(23).fill(passage).join(' "" ');
  const acrossRuns = occurrences(separated, passage, { excludeQuotes: true });
  assert.equal(acrossRuns.total, 23);
  assert.equal(acrossRuns.truncated, true);
  assert.ok(slices(separated, acrossRuns.ranges).every((slice) => slice === passage));
  assertOccurrenceEvidence(separated, passage, acrossRuns);
  assert.equal(occurrences(separated, passage).total, 89);
});

test("long occurrence patterns handle repeated prefix fallback and maximum-length full passages", () => {
  const text = [...Array(9_999).fill("a"), "b"].join(" ");
  const passage = [...Array(4_999).fill("a"), "b"].join(" ");
  const result = occurrencesWithRunawayGuard(text, passage, { minWords: 12 });
  assert.deepEqual(plain(result), { ranges: [{ start: text.length - passage.length, end: text.length }], total: 1, truncated: false });
  assertOccurrenceEvidence(text, passage, result);
  assert.deepEqual(plain(occurrencesWithRunawayGuard(text, text)), { ranges: [{ start: 0, end: text.length }], total: 1, truncated: false });
});

test("empty occurrence inputs are documented domain errors; short and fully excluded text produce no matches", () => {
  const passage = "one two three four";
  const emptyResult = { ranges: [], total: 0, truncated: false };
  for (const value of ["", " \r\n\t ", "!?…🙂", "\u0301\u0308"]) {
    assert.throws(() => occurrences(value, passage), /Source must contain at least one word/);
    assert.throws(() => occurrences(passage, value), /Passage must contain at least one word/);
  }
  for (const value of [null, undefined, 123, {}, []]) {
    assert.throws(() => occurrences(value, passage), /Source must be text/);
    assert.throws(() => occurrences(passage, value), /Passage must be text/);
  }
  for (const value of ["one", "one two", "one two three"]) {
    assert.deepEqual(plain(occurrences(passage, value)), emptyResult);
    assert.deepEqual(plain(occurrences(value, passage)), emptyResult);
  }
  assert.deepEqual(plain(occurrences(`"${passage}"`, passage, { excludeQuotes: true })), emptyResult);
  assert.deepEqual(plain(occurrences(passage, `"${passage}"`, { excludeQuotes: true })), emptyResult);
  assert.deepEqual(plain(occurrences(`References\n${passage}`, passage, { excludeReferences: true })), emptyResult);
});

test("occurrence lookup validates options and both text limits before returning partial or empty results", () => {
  const passage = "one two three four";
  for (const options of [null, {}, [], { ...defaults, minWords: 3 }, { ...defaults, minWords: "4" }, { ...defaults, minWords: NaN }]) {
    assert.throws(() => engine.findSourceOccurrences(passage, passage, options), /minimum match length/);
  }
  for (const key of ["ignoreCase", "excludeQuotes", "excludeReferences"]) {
    for (const invalid of [undefined, null, 0, "false"]) {
      assert.throws(() => occurrences(passage, passage, { [key]: invalid }), /true or false/);
    }
  }
  assert.throws(() => occurrences(passage, passage, { unexpected: true }), /Unsupported comparison option/);
  const charBoundary = `${passage}${" ".repeat(SIMILARITY_LIMITS.maxChars - passage.length)}`;
  assert.equal(occurrences(charBoundary, passage).total, 1);
  assert.equal(occurrences(passage, charBoundary).total, 1);
  const tooLong = `${charBoundary} `;
  const tooMany = Array(SIMILARITY_LIMITS.maxWords + 1).fill("a").join(" ");
  for (const [text, message] of [[tooLong, "60,000-character limit"], [tooMany, "10,000-word limit"]]) {
    assert.throws(() => occurrences(text, passage), new RegExp(`Source exceeds the ${message}`));
    assert.throws(() => occurrences(passage, text), new RegExp(`Passage exceeds the ${message}`));
    assert.throws(() => occurrences(text, "one"), new RegExp(`Source exceeds the ${message}`));
    assert.throws(() => occurrences(`"${passage}"`, text, { excludeQuotes: true }), new RegExp(`Passage exceeds the ${message}`));
  }
});

test("repeat grouping compares entire normalized sentences and counts copies beyond the first", () => {
  const text = "Alpha beta gamma delta.\nALPHA, beta gamma delta!\nAlpha beta gamma delta?\nOther clear source notes.\nother clear source notes.";
  const result = repeat(text);
  assert.equal(result.groupCount, 2);
  assert.equal(result.repeatedOccurrences, 3);
  assert.deepEqual(Array.from(result.groups, (group) => group.occurrenceCount), [3, 2]);
  assert.equal(result.groups[0].text, "Alpha beta gamma delta.");
  assert.equal(result.groups[0].words, 4);
  assert.ok(warningHas(result, /beyond the first/));
  assertSafeRanges(text, result.matchRanges);
  for (const group of result.groups) {
    for (const occurrence of group.occurrences) assert.deepEqual(wordsOf(text.slice(occurrence.start, occurrence.end)), wordsOf(group.text));
  }
  assert.equal(repeat(text, { ignoreCase: false }).groupCount, 1);
});

test("shared phrases in distinct sentences are not repeated whole sentences", () => {
  const text = "We keep clear source notes for editors. We keep clear source notes for readers.";
  assert.equal(repeat(text).groupCount, 0);
  assert.equal(repeat("Only three words. Only three words.").groupCount, 0);
  assert.equal(repeat("one two three four. one two three four.", { minWords: 6 }).groupCount, 0);
});

test("lowercase sentence starts, paragraphs, CRLF, Unicode line breaks, and heavy punctuation work", () => {
  for (const separator of [". ", ".\n\n", "!\r\n", "?\u2028", "…\u2029", "?!? "]) {
    const text = `one two three four${separator}one two three four.`;
    const result = repeat(text);
    assert.equal(result.groupCount, 1, JSON.stringify(separator));
    assert.equal(result.repeatedOccurrences, 1);
    assert.equal(result.groups[0].occurrenceCount, 2);
    assertSafeRanges(text, result.matchRanges);
  }
  assert.equal(repeat("one two three four\none two three four").groupCount, 1);
  assert.equal(repeat("هذه جملة عربية واضحة؟هذه جملة عربية واضحة۔").groupCount, 1);
  assert.equal(repeat("one two three four。one two three four。").groupCount, 1);
});

test("deterministic sentence fallback works without Intl or without Segmenter", () => {
  const text = "one two three four. one two three four!\nOther clear source notes?\nother clear source notes…";
  const expected = plain(repeat(text));
  for (const config of [{ withoutIntl: true }, { withoutSegmenter: true }]) {
    const fallback = loadCore(config).engine;
    assert.deepEqual(plain(fallback.findRepeatedSentences(text, defaults)), expected);
  }
});

test("repeat normalization retains accented/combining original ranges and emoji safely", () => {
  const text = "🙂 Cafe\u0301 Straße İ notes!\nCAFÉ STRASSE i\u0307 notes?";
  const result = repeat(text);
  assert.equal(result.groupCount, 1);
  assert.equal(result.groups[0].words, 4);
  assert.equal(result.groups[0].occurrenceCount, 2);
  assertSafeRanges(text, result.groups[0].occurrences);
  assert.deepEqual(slices(text, result.groups[0].occurrences), ["🙂 Cafe\u0301 Straße İ notes!", "CAFÉ STRASSE i\u0307 notes?"]);
});

test("quotes, references, and partial exclusions cannot manufacture repeated sentences", () => {
  const plainSentence = "one two three four.";
  const quoted = `“one two three four.”\n${plainSentence}`;
  assert.equal(repeat(quoted).groupCount, 1);
  assert.equal(repeat(quoted, { excludeQuotes: true }).groupCount, 0);
  for (const gap of ['"hidden words"', '""']) {
    const text = `one two ${gap} three four.\n${plainSentence}`;
    assert.equal(repeat(text, { excludeQuotes: true }).groupCount, 0);
    assert.equal(repeat(text, { excludeQuotes: true }).searchPassages.length, 1);
  }
  const references = `${plainSentence}\nBibliography\n${plainSentence}\n${plainSentence}`;
  const result = repeat(references, { excludeReferences: true });
  assert.equal(result.groupCount, 0);
  assert.equal(result.stats.eligibleWords, 4);
  assert.ok(result.searchPassages.every((passage) => passage.range.end < references.indexOf("Bibliography")));
});

test("repeat occurrence caps preserve all counts and all highlighted occurrences", () => {
  const text = Array(137).fill("one two three four.").join("\n");
  const result = repeat(text);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].occurrences.length, 100);
  assert.equal(result.groups[0].occurrenceCount, 137);
  assert.equal(result.repeatedOccurrences, 136);
  assert.equal(result.matchRanges.length, 137);
  assert.ok(warningHas(result, /37 occurrence ranges/));
});

test("repeat group caps preserve omitted-group totals and highlight ranges", () => {
  const sentences = Array.from({ length: 163 }, (_, index) => `Topic${index} has clear notes.`);
  const text = [...sentences, ...sentences].join("\n");
  const result = repeat(text);
  assert.equal(result.groups.length, 150);
  assert.equal(result.groupCount, 163);
  assert.equal(result.repeatedOccurrences, 163);
  assert.equal(result.matchRanges.length, 326);
  assert.ok(warningHas(result, /13 of 163/));
  assert.equal(new Set(result.groups.map((group) => group.id)).size, 150);
});

test("a long repetitive paragraph is not a repeated whole sentence or a style score", () => {
  const text = Array(10_000).fill("word").join(" ");
  const result = withRunawayGuard(text, [], {}, "repeat");
  assert.equal(result.groupCount, 0);
  assert.equal(result.repeatedOccurrences, 0);
  assert.equal(result.searchPassages.length, 1);
  assert.equal(result.searchPassages[0].words, 32);
  for (const absent of ["score", "uniqueness", "aiScore", "humanScore", "verdict", "coverage"]) assert.ok(!(absent in result));
});

test("search passages are up to five position-sampled original excerpts, not external URLs", () => {
  const lines = Array.from({ length: 9 }, (_, index) => `Section${index} provides clear original notes.`);
  const text = lines.join("\n");
  const result = repeat(text);
  assert.equal(result.searchPassages.length, 5);
  assert.deepEqual(Array.from(result.searchPassages, (passage) => passage.text), [0, 2, 4, 6, 8].map((index) => lines[index].slice(0, -1)));
  for (const passage of result.searchPassages) {
    assert.equal(passage.text, text.slice(passage.range.start, passage.range.end));
    assert.ok(passage.words >= defaults.minWords);
    assert.equal(wordsOf(passage.text).length, passage.words);
    assert.deepEqual(Object.keys(passage).sort(), ["id", "range", "text", "words"]);
  }
  assert.ok(warningHas(result, /not suspicious-text flags/));
  const excluded = repeat('"hidden search passage text."\none two three four.', { excludeQuotes: true });
  assert.deepEqual(Array.from(excluded.searchPassages, (passage) => passage.text), ["one two three four"]);
  assert.equal(repeat("one two three").searchPassages.length, 0);
});

test("request routing validates every supplied document but compares no sources in repeat mode", () => {
  const text = "one two three four. one two three four.";
  assert.equal(engine.analyzeRequest(request(text)).mode, "repeat");
  assert.equal(engine.analyzeRequest({ ...request(text, "compare"), sources: [source(text)] }).mode, "compare");
  const unused = { ...request(text), sources: [source("Source content never changes single document repetition.")] };
  assert.deepEqual(plain(engine.analyzeRequest(unused)), plain(repeat(text)));
  for (const invalid of ["", "x".repeat(60_001), Array(10_001).fill("x").join(" ")]) {
    assert.throws(() => engine.analyzeRequest({ ...request(text), sources: [source(invalid)] }), /Source 1.*(?:must contain|exceeds)/);
  }
  assert.throws(() => engine.analyzeRequest({ ...request(text), sources: Array.from({ length: 6 }, (_, index) => source(text, index)) }), /at most 5/);
  for (const id of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1"]) {
    assert.throws(() => engine.analyzeRequest({ ...request(text), id }), /safe-integer ID/);
  }
  for (const value of [null, [], {}, { ...request(text), mode: "ai" }]) {
    assert.throws(() => engine.analyzeRequest(value), /ID|mode/);
  }
  assert.equal(engine.analyzeRequest({ ...request(text), id: 0 }).mode, "repeat");
});

test("inputs remain unchanged, results are deterministic, and only supplied text is compared", () => {
  const draft = "Compare only these supplied words https://example.invalid/private";
  const inputs = Object.freeze([Object.freeze(source("Completely different wording exists somewhere else"))]);
  const options = Object.freeze({ ...defaults });
  const before = JSON.stringify({ draft, inputs, options });
  const first = engine.compareSources(draft, inputs, options);
  const second = engine.compareSources(draft, inputs, options);
  assert.deepEqual(plain(first), plain(second));
  assert.equal(first.draft.matchedWords, 0);
  assert.equal(JSON.stringify({ draft, inputs, options }), before);
  assert.ok(warningHas(first, /no web search or AI detection/));
  assert.ok(warningHas(first, /not evidence of uniqueness/));
});

test("worker echoes request IDs and returns only contract results or safe validation errors", () => {
  const worker = loadCore();
  const messages = [];
  worker.context.postMessage = (message) => messages.push(plain(message));
  worker.load("worker");
  worker.context.onmessage({ data: request("one two three four. one two three four.") });
  assert.equal(messages[0].id, 42);
  assert.equal(messages[0].result.repeatedOccurrences, 1);
  assert.deepEqual(Object.keys(messages[0]).sort(), ["id", "result"]);
  worker.context.onmessage({ data: { ...request(""), id: 43 } });
  assert.equal(messages[1].id, 43);
  assert.match(messages[1].error, /must contain at least one word/);
  assert.deepEqual(Object.keys(messages[1]).sort(), ["error", "id"]);
  worker.context.onmessage({ data: null });
  assert.equal(messages[2].id, -1);
  assert.match(messages[2].error, /safe-integer ID/);
  worker.context.onmessage({ data: { ...request("one two three four", "compare"), id: 44, sources: [source("one two three four")] } });
  assert.equal(messages[3].id, 44);
  assert.equal(messages[3].result.draft.matchedWords, 4);
  assertOverlapCounts(messages[3].result, { singleSourceWords: 4, multiSourceWords: 0, unmatchedWords: 0 }, [[4, 0]]);
});

test("worker never exposes unknown exception details, source labels, input, or stack traces", () => {
  const worker = loadCore();
  const messages = [];
  worker.context.postMessage = (message) => messages.push(plain(message));
  worker.load("worker");
  const secret = "SYNTHETIC_PRIVATE_TEXT_123";
  const data = request("one two three four");
  Object.defineProperty(data, "draft", { get() { throw new Error(secret); } });
  worker.context.onmessage({ data });
  assert.equal(messages[0].id, 42);
  assert.equal(messages[0].error, "Unable to analyze this text. Check the inputs and try again.");
  const invalid = { ...request("one two three four", "compare"), sources: [{ id: "id", label: secret, text: "" }] };
  worker.context.onmessage({ data: invalid });
  assert.match(messages[1].error, /Source 1 must contain/);
  assert.ok(!JSON.stringify(messages).includes(secret));
  assert.ok(messages.every((message) => !("stack" in message)));
});

// An intentionally simple independent oracle. Random fixtures use ASCII words;
// Unicode normalization and offsets have separate explicit tests above. This
// enumerates all occurrence pairs (small inputs ONLY), unlike the production SAM.
function oracleDocument(fixture, options) {
  const tokens = Array.from(fixture.text.matchAll(/[A-Za-z][A-Za-z0-9]*/g), (match) => ({
    value: options.ignoreCase ? match[0].toLowerCase() : match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
  const excluded = [
    ...(options.excludeQuotes ? fixture.quotes : []),
    ...(options.excludeReferences && fixture.reference ? [fixture.reference] : []),
  ].sort((a, b) => a.start - b.start);
  const intersects = (start, end) => excluded.some((range) => start < range.end && end > range.start);
  const eligible = tokens.map((token) => !intersects(token.start, token.end));
  const joinsPrevious = tokens.map((token, index) => index > 0 && eligible[index - 1] && eligible[index]
    && !intersects(tokens[index - 1].end, token.start));
  return { text: fixture.text, tokens, eligible, joinsPrevious, excluded };
}

function oraclePair(draft, supplied, minWords) {
  const draftMask = Array(draft.tokens.length).fill(false);
  const sourceMask = Array(supplied.tokens.length).fill(false);
  const candidates = new Map();
  for (let left = 0; left < draft.tokens.length; left++) {
    for (let right = 0; right < supplied.tokens.length; right++) {
      let length = 0;
      while (left + length < draft.tokens.length && right + length < supplied.tokens.length
        && draft.eligible[left + length] && supplied.eligible[right + length]
        && (length === 0 || (draft.joinsPrevious[left + length] && supplied.joinsPrevious[right + length]))
        && draft.tokens[left + length].value === supplied.tokens[right + length].value) length++;
      if (length < minWords) continue;
      candidates.set(`${left}:${left + length}`, { start: left, end: left + length });
      for (let offset = 0; offset < length; offset++) {
        draftMask[left + offset] = true;
        sourceMask[right + offset] = true;
      }
    }
  }
  const intervals = [...candidates.values()];
  const passages = intervals.filter((range) => !intervals.some((other) => other !== range && other.start <= range.start && other.end >= range.end))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  return { draftMask, sourceMask, passages };
}

function oracleRanges(document, mask) {
  const ranges = [];
  let current = null;
  for (let index = 0; index < document.tokens.length; index++) {
    const token = document.tokens[index];
    if (mask[index]) {
      if (!current || !document.joinsPrevious[index]) {
        current = { start: token.start, end: token.end };
        ranges.push(current);
      } else current.end = token.end;
    } else current = null;
  }
  return ranges;
}

function oracleOccurrences(document, values) {
  const ranges = [];
  for (let start = 0; start + values.length <= document.tokens.length; start++) {
    let length = 0;
    while (length < values.length && document.eligible[start + length]
      && (length === 0 || document.joinsPrevious[start + length])
      && document.tokens[start + length].value === values[length]) length++;
    if (length === values.length) {
      ranges.push({ start: document.tokens[start].start, end: document.tokens[start + length - 1].end });
    }
  }
  return ranges;
}

function randomGenerator(seed) {
  let state = seed >>> 0;
  return (maximum) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % maximum;
  };
}

function randomFixture(words, random) {
  const pairs = [['"', '"'], ["“", "”"], ["«", "»"], ["‘", "’"]];
  const pair = pairs[random(pairs.length)];
  const quoteStart = random(3) === 0 ? -1 : random(words.length + 1);
  const quoteEnd = quoteStart === -1 ? -1 : quoteStart + random(words.length - quoteStart + 1);
  const separators = [" ", ", ", " — ", "\n", "...\t"];
  let text = random(2) ? "🙂 " : "";
  const quotes = [];
  let start = 0;
  for (let index = 0; index <= words.length; index++) {
    if (index === quoteStart) {
      start = text.length;
      text += pair[0];
    }
    if (index === quoteEnd) {
      text += pair[1];
      quotes.push({ start, end: text.length });
    }
    if (index < words.length) {
      const word = random(4) === 0 ? words[index].toUpperCase() : words[index];
      text += word;
      if (index + 1 < words.length) text += separators[random(separators.length)];
    }
  }
  let reference = null;
  if (random(2)) {
    const headings = ["References", "## Bibliography", "### WORKS CITED:"];
    text += "\n";
    start = text.length;
    text += `${headings[random(headings.length)]}\n${words.slice(0, 6).join(" ")}`;
    reference = { start, end: text.length };
  }
  return { text, quotes, reference };
}

function verifyWithOracle(draftFixture, sourceFixtures, options) {
  const draft = oracleDocument(draftFixture, options);
  const inputs = sourceFixtures.map((fixture, index) => source(fixture.text, index));
  const result = engine.compareSources(draft.text, inputs, options);
  const union = Array(draft.tokens.length).fill(false);
  const multiplicity = Array(draft.tokens.length).fill(0);
  const draftMasks = [];
  const eligibleDraft = draft.eligible.filter(Boolean).length;
  assert.equal(result.draft.stats.totalWords, draft.tokens.length);
  assert.equal(result.draft.stats.eligibleWords, eligibleDraft);
  assert.equal(result.draft.stats.excludedWords, draft.tokens.length - eligibleDraft);
  for (let index = 0; index < sourceFixtures.length; index++) {
    const supplied = oracleDocument(sourceFixtures[index], options);
    const expected = oraclePair(draft, supplied, options.minWords);
    const actual = result.sources[index];
    const draftCount = expected.draftMask.filter(Boolean).length;
    const sourceCount = expected.sourceMask.filter(Boolean).length;
    const eligibleSource = supplied.eligible.filter(Boolean).length;
    assert.equal(actual.draftMatchedWords, draftCount);
    assert.equal(actual.matchedWords, sourceCount);
    assert.equal(actual.stats.totalWords, supplied.tokens.length);
    assert.equal(actual.stats.eligibleWords, eligibleSource);
    assert.equal(actual.stats.excludedWords, supplied.tokens.length - eligibleSource);
    assertPercentage(actual.draftCoverage, draftCount, eligibleDraft);
    assertPercentage(actual.coverage, sourceCount, eligibleSource);
    assert.deepEqual(plain(actual.draftRanges), oracleRanges(draft, expected.draftMask));
    assert.deepEqual(plain(actual.sourceRanges), oracleRanges(supplied, expected.sourceMask));
    assert.equal(actual.passageCount, expected.passages.length);
    assert.deepEqual(Array.from(actual.passages, (passage) => ({ ...plain(passage.draft), words: passage.words })), expected.passages.map((span) => ({
      start: draft.tokens[span.start].start, end: draft.tokens[span.end - 1].end, words: span.end - span.start,
    })));
    for (const span of expected.passages) {
      const passage = draft.text.slice(draft.tokens[span.start].start, draft.tokens[span.end - 1].end);
      const values = draft.tokens.slice(span.start, span.end).map((token) => token.value);
      const ranges = oracleOccurrences(supplied, values);
      const found = engine.findSourceOccurrences(supplied.text, passage, options);
      assert.deepEqual(plain(found), {
        ranges: ranges.slice(0, SIMILARITY_LIMITS.sourceOccurrences),
        total: ranges.length,
        truncated: ranges.length > SIMILARITY_LIMITS.sourceOccurrences,
      });
      assertOccurrenceEvidence(supplied.text, passage, found, options);
    }
    draftMasks.push(expected.draftMask);
    for (let position = 0; position < union.length; position++) {
      union[position] ||= expected.draftMask[position];
      if (expected.draftMask[position]) multiplicity[position]++;
    }
  }
  const count = union.filter(Boolean).length;
  assert.equal(result.draft.matchedWords, count);
  assertPercentage(result.draft.coverage, count, eligibleDraft);
  assert.deepEqual(plain(result.draft.matchRanges), oracleRanges(draft, union));
  assertOverlapCounts(result, {
    singleSourceWords: multiplicity.filter((value) => value === 1).length,
    multiSourceWords: multiplicity.filter((value) => value >= 2).length,
    unmatchedWords: multiplicity.filter((value, position) => value === 0 && draft.eligible[position]).length,
  }, draftMasks.map((mask) => [
    mask.filter((matched, position) => matched && multiplicity[position] === 1).length,
    mask.filter((matched, position) => matched && multiplicity[position] >= 2).length,
  ]));
  assertEvidence(draft.text, inputs, result);
}

test("512 seeded comparisons agree with independent coverage, attribution, range, and occurrence oracles across every option", () => {
  const random = randomGenerator(0x51a11a);
  const vocabulary = ["alpha", "beta", "gamma", "delta"];
  const sourceCounts = new Set();
  let duplicateChecks = 0;
  let checks = 0;
  for (let round = 0; round < 16; round++) {
    for (const minWords of [4, 6, 8, 12]) {
      for (const ignoreCase of [false, true]) {
        for (const excludeQuotes of [false, true]) {
          for (const excludeReferences of [false, true]) {
            const words = Array.from({ length: 6 + random(19) }, () => vocabulary[random(vocabulary.length)]);
            const draft = randomFixture(words, random);
            const variants = [words.slice()];
            const sourceCount = 1 + (checks % SIMILARITY_LIMITS.maxSources);
            while (variants.length < sourceCount) {
              const modified = words.slice();
              modified[random(modified.length)] = "changed";
              variants.push(random(2) ? modified : Array.from({ length: 4 + random(16) }, () => vocabulary[random(vocabulary.length)]));
            }
            const fixtures = variants.map((variant) => randomFixture(variant, random));
            if (fixtures.length > 1 && round % 2 === 0) {
              fixtures[fixtures.length - 1] = fixtures[0];
              duplicateChecks++;
            }
            sourceCounts.add(fixtures.length);
            verifyWithOracle(draft, fixtures, { minWords, ignoreCase, excludeQuotes, excludeReferences });
            checks++;
          }
        }
      }
    }
  }
  assert.equal(checks, 512);
  assert.deepEqual([...sourceCounts].sort(), [1, 2, 3, 4, 5]);
  assert.ok(duplicateChecks > 0);
});

test("pure implementation imports stay within the similarity contract and use no unbounded spread maximum", () => {
  compile("worker");
  for (const name of ["engine", "worker"]) {
    const text = moduleSources.get(name);
    const parsed = ts.createSourceFile(`${name}.ts`, text, ts.ScriptTarget.Latest, true);
    for (const statement of parsed.statements) {
      if (ts.isImportDeclaration(statement)) assert.ok(["./types", "./engine"].includes(statement.moduleSpecifier.text));
    }
    assert.doesNotMatch(text, /Math\.max\(\s*\.\.\./);
    assert.doesNotMatch(text, /reference\s+lib=["']webworker/);
  }
});