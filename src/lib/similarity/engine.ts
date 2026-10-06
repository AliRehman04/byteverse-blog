import {
  SIMILARITY_LIMITS,
  type CheckRequest,
  type CompareResult,
  type MatchingPassage,
  type MatchOptions,
  type RepeatResult,
  type SimilarityResult,
  type SourceInput,
  type TextRange,
  type TextStats,
} from "./types";

/** Messages from this error are fixed validation messages, never supplied text. */
export class SimilarityInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimilarityInputError";
  }
}

interface WordToken extends TextRange {
  value: string;
}

interface TokenSpan {
  start: number;
  end: number;
}

interface PreparedText {
  tokens: WordToken[];
  /** Half-open token intervals; even an excluded empty quote splits a run. */
  runs: TokenSpan[];
  excludedRanges: TextRange[];
  stats: TextStats;
}

interface AutomatonState {
  length: number;
  link: number;
  firstEnd: number;
  next: Map<string | null, number>;
}

interface TokenMatch extends TokenSpan {
  sourceEnd: number;
}

interface MatchScan {
  mask: Uint8Array;
  matchedWords: number;
  matches: TokenMatch[];
  passageCount: number;
}

interface Sentence extends TextRange {
  firstToken: number;
  endToken: number;
  key: string;
}

const SEARCH_REVIEW_LIMITS = { passages: 5, wordsPerPassage: 32 } as const;
// Constructor syntax keeps the project's ES2017 TS target compatible. Runtime
// Unicode property escapes are required; no ASCII-only fallback is substituted.
const WORD_PATTERN = "[\\p{L}\\p{N}][\\p{L}\\p{N}\\p{M}]*(?:['\u2018\u2019][\\p{L}\\p{N}][\\p{L}\\p{N}\\p{M}]*)*";
const WORD_BEFORE = new RegExp("[\\p{L}\\p{N}\\p{M}]$", "u");
const WORD_AFTER = new RegExp("^[\\p{L}\\p{N}\\p{M}]", "u");
const REFERENCE_HEADING = /^[ \t]*(?:#{1,6}[ \t]+)?(?:references|bibliography|works[ \t]+cited)[ \t]*:?[ \t]*(?:#+[ \t]*)?$/i;
const MARKDOWN_HEADING = /^[ \t]*#{1,6}[ \t]+\S/;
const SENTENCE_ENDINGS = new Set([".", "!", "?", "…", "。", "！", "？", "؟", "۔", "।", "॥"]);
const SENTENCE_CLOSERS = new Set(['"', "'", "”", "’", "»", ")", "]", "}", "」", "』", "】", "》"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateOptions(options: MatchOptions): MatchOptions {
  if (!isRecord(options) || ![4, 6, 8, 12].includes(options.minWords as number)) {
    throw new SimilarityInputError("Choose a minimum match length of 4, 6, 8, or 12 words.");
  }
  for (const key of ["ignoreCase", "excludeQuotes", "excludeReferences"] as const) {
    if (typeof options[key] !== "boolean") {
      throw new SimilarityInputError("Case, quotation, and reference options must each be true or false.");
    }
  }
  if (Object.keys(options).some((key) => !["minWords", "ignoreCase", "excludeQuotes", "excludeReferences"].includes(key))) {
    throw new SimilarityInputError("Unsupported comparison option. Use only the documented match options.");
  }
  return {
    minWords: options.minWords,
    ignoreCase: options.ignoreCase,
    excludeQuotes: options.excludeQuotes,
    excludeReferences: options.excludeReferences,
  };
}

function normalizeWord(word: string, ignoreCase: boolean): string {
  const normalized = word.normalize("NFKC").replace(/[‘’]/g, "'");
  if (!ignoreCase) return normalized;
  // Locale-neutral caseless key: expand case pairs (including sharp s), collapse
  // final sigma, and retain the distinct dotless i. Work per code point after
  // lowercasing so final-sigma context cannot change equality. A second NFKC
  // composes any marks introduced by casing; accents are not stripped.
  let folded = "";
  for (const character of normalized.toLowerCase()) {
    folded += character === "ı" ? character : character.toUpperCase().toLowerCase();
  }
  return folded.normalize("NFKC");
}

/** Original UTF-16 offsets; normalization is applied only AFTER locating words. */
export function tokenizeText(text: string, ignoreCase = true): WordToken[] {
  if (typeof text !== "string") {
    throw new SimilarityInputError("Text must be a string.");
  }
  if (typeof ignoreCase !== "boolean") {
    throw new SimilarityInputError("The case option must be true or false.");
  }
  const pattern = new RegExp(WORD_PATTERN, "gu");
  const tokens: WordToken[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    tokens.push({ value: normalizeWord(match[0], ignoreCase), start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/** UI counters deliberately accept empty/over-limit text. Characters are UTF-16 units. */
export function getInputStats(text: string): { words: number; characters: number } {
  return { words: tokenizeText(text, false).length, characters: text.length };
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  const ordered = ranges.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextRange[] = [];
  for (const range of ordered) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
}

function quoteRanges(text: string): TextRange[] {
  const closers: Record<string, string> = { '"': '"', "“": "”", "«": "»", "‘": "’" };
  const stack: { start: number; closer: string }[] = [];
  const ranges: TextRange[] = [];
  let backslashes = 0;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === "\\") {
      backslashes++;
      continue;
    }
    const escaped = backslashes % 2 === 1;
    backslashes = 0;
    if (escaped) continue;
    // A curly apostrophe between word characters is not a quotation delimiter.
    if ((character === "‘" || character === "’")
      && WORD_BEFORE.test(text.slice(Math.max(0, index - 2), index))
      && WORD_AFTER.test(text.slice(index + 1, index + 3))) continue;
    const top = stack[stack.length - 1];
    if (top && character === top.closer) {
      ranges.push({ start: top.start, end: index + 1 });
      stack.pop();
    } else if (Object.prototype.hasOwnProperty.call(closers, character)) {
      stack.push({ start: index, closer: closers[character] });
    }
  }
  // Unclosed delimiters never exclude a remainder of the document.
  return mergeRanges(ranges);
}

function referenceRange(text: string, quotes: TextRange[]): TextRange | null {
  const lines = /[^\r\n\u2028\u2029]+/g;
  let candidate: TextRange | null = null;
  let quoteIndex = 0;
  let line: RegExpExecArray | null;
  while ((line = lines.exec(text)) !== null) {
    const start = line.index;
    const end = start + line[0].length;
    while (quoteIndex < quotes.length && quotes[quoteIndex].end <= start) quoteIndex++;
    if (quoteIndex < quotes.length && quotes[quoteIndex].start < end) continue;
    if (REFERENCE_HEADING.test(line[0])) {
      candidate = { start, end: text.length };
    } else if (MARKDOWN_HEADING.test(line[0])) {
      // A later explicit section means the bibliography is not the trailing one.
      candidate = null;
    }
  }
  return candidate;
}

function prepareText(text: string, options: MatchOptions, name: string): PreparedText {
  if (typeof text !== "string") throw new SimilarityInputError(`${name} must be text.`);
  if (text.length > SIMILARITY_LIMITS.maxChars) {
    throw new SimilarityInputError(`${name} exceeds the ${SIMILARITY_LIMITS.maxChars.toLocaleString("en-US")}-character limit (UTF-16 units). Shorten it; nothing was truncated.`);
  }
  const tokens = tokenizeText(text, options.ignoreCase);
  if (tokens.length === 0) {
    throw new SimilarityInputError(`${name} must contain at least one word with letters or numbers; empty or punctuation-only text cannot be checked.`);
  }
  if (tokens.length > SIMILARITY_LIMITS.maxWords) {
    throw new SimilarityInputError(`${name} exceeds the ${SIMILARITY_LIMITS.maxWords.toLocaleString("en-US")}-word limit. Shorten it; nothing was truncated.`);
  }
  const quotes = options.excludeQuotes || options.excludeReferences ? quoteRanges(text) : [];
  const references = options.excludeReferences ? referenceRange(text, quotes) : null;
  const excludedRanges = mergeRanges([
    ...(options.excludeQuotes ? quotes : []),
    ...(references ? [references] : []),
  ]);
  const runs: TokenSpan[] = [];
  let exclusionIndex = 0;
  let previousEnd = 0;
  let runStart = -1;
  let eligibleWords = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    let barrier = false;
    while (exclusionIndex < excludedRanges.length && excludedRanges[exclusionIndex].end <= token.start) {
      if (excludedRanges[exclusionIndex].end > previousEnd) barrier = true;
      exclusionIndex++;
    }
    const excluded = exclusionIndex < excludedRanges.length && excludedRanges[exclusionIndex].start < token.end;
    if ((barrier || excluded) && runStart !== -1) {
      runs.push({ start: runStart, end: index });
      runStart = -1;
    }
    if (!excluded) {
      if (runStart === -1) runStart = index;
      eligibleWords++;
    }
    previousEnd = token.end;
  }
  if (runStart !== -1) runs.push({ start: runStart, end: tokens.length });
  return {
    tokens,
    runs,
    excludedRanges,
    stats: { totalWords: tokens.length, eligibleWords, excludedWords: tokens.length - eligibleWords, characters: text.length },
  };
}

function validateSourceList(sources: SourceInput[], requireSource: boolean): void {
  if (!Array.isArray(sources)) throw new SimilarityInputError("Sources must be a list of supplied text documents.");
  if (sources.length > SIMILARITY_LIMITS.maxSources) {
    throw new SimilarityInputError(`Compare at most ${SIMILARITY_LIMITS.maxSources} supplied sources at a time.`);
  }
  if (requireSource && sources.length === 0) {
    throw new SimilarityInputError("Add at least one supplied source to compare, or use repeated-sentence mode for a single document.");
  }
  const ids = new Set<string>();
  for (const source of sources) {
    if (!isRecord(source) || typeof source.id !== "string" || !source.id.trim() || source.id !== source.id.trim()) {
      throw new SimilarityInputError("Every source needs a nonempty ID without leading or trailing whitespace.");
    }
    if (ids.has(source.id)) throw new SimilarityInputError("Source IDs must be unique; duplicate text or labels may use different IDs.");
    ids.add(source.id);
    if (typeof source.label !== "string" || !source.label.trim()) {
      throw new SimilarityInputError("Every source needs a nonempty text label.");
    }
    if (typeof source.text !== "string") throw new SimilarityInputError("Every source must supply its text as a string.");
  }
}

/**
 * Exact suffix automaton. A null separator is outside the word alphabet and
 * prevents a substring from crossing an exclusion, without resetting SAM
 * construction (resetting last to root would invalidate the ordinary algorithm).
 * State count and transition storage are linear in the indexed token stream.
 */
function buildAutomaton(document: PreparedText): AutomatonState[] {
  const states: AutomatonState[] = [{ length: 0, link: -1, firstEnd: -1, next: new Map() }];
  let last = 0;
  const append = (value: string | null, firstEnd: number) => {
    const current = states.length;
    states.push({ length: states[last].length + 1, link: 0, firstEnd, next: new Map() });
    let previous = last;
    while (previous !== -1 && !states[previous].next.has(value)) {
      states[previous].next.set(value, current);
      previous = states[previous].link;
    }
    if (previous !== -1) {
      const target = states[previous].next.get(value)!;
      if (states[previous].length + 1 === states[target].length) {
        states[current].link = target;
      } else {
        const clone = states.length;
        states.push({
          length: states[previous].length + 1,
          link: states[target].link,
          firstEnd: states[target].firstEnd,
          next: new Map(states[target].next),
        });
        while (previous !== -1 && states[previous].next.get(value) === target) {
          states[previous].next.set(value, clone);
          previous = states[previous].link;
        }
        states[target].link = clone;
        states[current].link = clone;
      }
    }
    last = current;
  };
  for (let runIndex = 0; runIndex < document.runs.length; runIndex++) {
    if (runIndex > 0) append(null, -1);
    const run = document.runs[runIndex];
    for (let index = run.start; index < run.end; index++) append(document.tokens[index].value, index);
  }
  return states;
}

/**
 * Longest matching suffix at every query position covers every possible match:
 * shorter matches ending there are contained in it. Starts are nondecreasing,
 * so keeping the last endpoint for a start yields maximal non-contained query
 * passages, in order, without enumerating occurrence pairs. Difference arrays
 * compute their complete union independently of the evidence display cap.
 */
function scanMatches(states: AutomatonState[], query: PreparedText, minWords: number, evidenceLimit: number): MatchScan {
  const difference = new Int32Array(query.tokens.length + 1);
  const matches: TokenMatch[] = [];
  let passageCount = 0;
  let pending: TokenMatch | null = null;
  const flush = () => {
    if (!pending) return;
    difference[pending.start]++;
    difference[pending.end]--;
    passageCount++;
    if (matches.length < evidenceLimit) matches.push(pending);
    pending = null;
  };
  for (const run of query.runs) {
    let state = 0;
    let length = 0;
    for (let index = run.start; index < run.end; index++) {
      const value = query.tokens[index].value;
      while (state !== 0 && !states[state].next.has(value)) {
        state = states[state].link;
        length = Math.min(length, states[state].length);
      }
      const next = states[state].next.get(value);
      if (next === undefined) {
        state = 0;
        length = 0;
      } else {
        state = next;
        length++;
      }
      if (length >= minWords) {
        const start = index - length + 1;
        if (pending && pending.start !== start) flush();
        pending = { start, end: index + 1, sourceEnd: states[state].firstEnd };
      } else {
        flush();
      }
    }
    flush();
  }
  const mask = new Uint8Array(query.tokens.length);
  let active = 0;
  let matchedWords = 0;
  for (let index = 0; index < mask.length; index++) {
    active += difference[index];
    if (active > 0) {
      mask[index] = 1;
      matchedWords++;
    }
  }
  return { mask, matchedWords, matches, passageCount };
}

function tokenRange(document: PreparedText, start: number, end: number): TextRange {
  return { start: document.tokens[start].start, end: document.tokens[end - 1].end };
}

function highlightRanges(document: PreparedText, mask: Uint8Array): TextRange[] {
  const ranges: TextRange[] = [];
  for (const run of document.runs) {
    let start = -1;
    for (let index = run.start; index < run.end; index++) {
      if (mask[index]) {
        if (start === -1) start = index;
      } else if (start !== -1) {
        ranges.push(tokenRange(document, start, index));
        start = -1;
      }
    }
    if (start !== -1) ranges.push(tokenRange(document, start, run.end));
  }
  return ranges;
}

function coverage(matchedWords: number, eligibleWords: number): number | null {
  return eligibleWords === 0 ? null : (matchedWords / eligibleWords) * 100;
}

function commonWarnings(options: MatchOptions): string[] {
  const warnings = [
    "Words are Unicode letter/number runs with internal apostrophes. Unspaced languages such as Chinese and Japanese may be under-segmented; this is not universal linguistic word counting.",
  ];
  if (options.excludeQuotes) warnings.push("Only balanced straight/curly double quotes, guillemets, and curly single quotes are excluded. Unbalanced quotes and other quotation styles need manual review.");
  if (options.excludeReferences) warnings.push("Reference exclusion recognizes the final standalone References, Bibliography, or Works Cited heading and the text after it, unless a later Markdown heading follows. It does not detect inline citations or infer unmarked section endings.");
  return warnings;
}

function addEligibilityWarning(warnings: string[], document: PreparedText, name: string, minWords: number): void {
  if (document.stats.eligibleWords === 0) {
    warnings.push(`${name}: no eligible words remain after exclusions. Coverage is unavailable, not a uniqueness score.`);
  } else if (document.stats.eligibleWords < minWords) {
    warnings.push(`${name}: fewer than ${minWords} eligible words. Add more text or choose a smaller supported minimum; no qualifying match is possible.`);
  } else if (!document.runs.some((run) => run.end - run.start >= minWords)) {
    warnings.push(`${name}: exclusions leave no uninterrupted run of ${minWords} eligible words. Matches cannot bridge excluded text.`);
  }
}

/** Exact local supplied-source comparison. Coverage values are percentages, not scores. */
export function compareSources(draft: string, sources: SourceInput[], options: MatchOptions): CompareResult {
  const checkedOptions = validateOptions(options);
  validateSourceList(sources, true);
  const document = prepareText(draft, checkedOptions, "Draft");
  const preparedSources = sources.map((source, index) => prepareText(source.text, checkedOptions, `Source ${index + 1}`));
  const warnings = [
    "Only supplied sources are compared locally; no web search or AI detection is performed. Matching coverage is not a plagiarism, originality, or authorship verdict.",
    ...commonWarnings(checkedOptions),
  ];
  addEligibilityWarning(warnings, document, "Draft", checkedOptions.minWords);
  if (new Set(sources.map((source) => source.label.trim())).size !== sources.length) {
    warnings.push("Some sources share a label. Their unique source IDs keep evidence separate; duplicate sources cannot increase overall matched-word coverage.");
  }
  const draftIndex = buildAutomaton(document);
  const union = new Uint8Array(document.tokens.length);
  const results = sources.map((source, sourceIndex) => {
    const prepared = preparedSources[sourceIndex];
    const name = `Source ${sourceIndex + 1}`;
    addEligibilityWarning(warnings, prepared, name, checkedOptions.minWords);
    const forward = scanMatches(buildAutomaton(prepared), document, checkedOptions.minWords, SIMILARITY_LIMITS.passagesPerSource);
    const reverse = scanMatches(draftIndex, prepared, checkedOptions.minWords, 0);
    for (let index = 0; index < union.length; index++) union[index] |= forward.mask[index];
    const passages: MatchingPassage[] = forward.matches.map((match) => {
      const words = match.end - match.start;
      const range = tokenRange(document, match.start, match.end);
      return {
        id: `match-${sourceIndex + 1}-${range.start}-${range.end}`,
        sourceId: source.id,
        draft: range,
        source: tokenRange(prepared, match.sourceEnd - words + 1, match.sourceEnd + 1),
        words,
      };
    });
    if (forward.passageCount > passages.length) {
      warnings.push(`${name}: ${forward.passageCount - passages.length} of ${forward.passageCount} maximal draft passages are omitted from review (limit ${SIMILARITY_LIMITS.passagesPerSource}). Coverage and highlights still include every qualifying match.`);
    }
    return {
      id: source.id,
      label: source.label,
      stats: prepared.stats,
      matchedWords: reverse.matchedWords,
      coverage: coverage(reverse.matchedWords, prepared.stats.eligibleWords),
      draftMatchedWords: forward.matchedWords,
      draftCoverage: coverage(forward.matchedWords, document.stats.eligibleWords),
      draftRanges: highlightRanges(document, forward.mask),
      sourceRanges: highlightRanges(prepared, reverse.mask),
      excludedRanges: prepared.excludedRanges,
      passages,
      passageCount: forward.passageCount,
    };
  });
  let matchedWords = 0;
  for (const matched of union) matchedWords += matched;
  if (matchedWords > 0) {
    warnings.push("Evidence shows one deterministic source occurrence per maximal, non-contained draft passage, not every occurrence pair. Source coverage/highlights use a separate reverse pass and include all qualifying source occurrences.");
  } else {
    warnings.push("No qualifying matches were found in the supplied sources. This is not evidence of uniqueness or originality.");
  }
  return {
    mode: "compare",
    options: checkedOptions,
    draft: {
      stats: document.stats,
      matchedWords,
      coverage: coverage(matchedWords, document.stats.eligibleWords),
      matchRanges: highlightRanges(document, union),
      excludedRanges: document.excludedRanges,
    },
    sources: results,
    warnings,
  };
}

function trimRange(text: string, start: number, end: number): TextRange | null {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return start < end ? { start, end } : null;
}

function splitAtPunctuation(text: string, start: number, end: number, ranges: TextRange[]): void {
  let sentenceStart = start;
  for (let index = start; index < end; index++) {
    if (!SENTENCE_ENDINGS.has(text[index])) continue;
    let after = index + 1;
    while (after < end && SENTENCE_ENDINGS.has(text[after])) after++;
    while (after < end && SENTENCE_CLOSERS.has(text[after])) after++;
    // Do not split decimals, URLs, or e.g. in the middle. A period followed by
    // whitespace DOES split even before lowercase text (some ICU versions do not).
    if (text[index] === "." && after < end && !/\s/.test(text[after])) continue;
    const range = trimRange(text, sentenceStart, after);
    if (range) ranges.push(range);
    sentenceStart = after;
    index = after - 1;
  }
  const remainder = trimRange(text, sentenceStart, end);
  if (remainder) ranges.push(remainder);
}

function sentenceRanges(text: string): TextRange[] {
  let segmenter: Intl.Segmenter | null = null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    }
  } catch {
    // Deterministic punctuation/newline fallback when ICU/Segmenter is unavailable.
  }
  const ranges: TextRange[] = [];
  const lines = /[^\r\n\u2028\u2029]+/g;
  let line: RegExpExecArray | null;
  while ((line = lines.exec(text)) !== null) {
    if (segmenter) {
      for (const segment of segmenter.segment(line[0])) {
        const start = line.index + segment.index;
        splitAtPunctuation(text, start, start + segment.segment.length, ranges);
      }
    } else {
      splitAtPunctuation(text, line.index, line.index + line[0].length, ranges);
    }
  }
  return ranges;
}

function eligibleSentences(text: string, document: PreparedText, minWords: number): Sentence[] {
  const sentences: Sentence[] = [];
  let tokenIndex = 0;
  let exclusionIndex = 0;
  for (const range of sentenceRanges(text)) {
    while (tokenIndex < document.tokens.length && document.tokens[tokenIndex].end <= range.start) tokenIndex++;
    const firstToken = tokenIndex;
    while (tokenIndex < document.tokens.length && document.tokens[tokenIndex].start < range.end) tokenIndex++;
    const endToken = tokenIndex;
    while (exclusionIndex < document.excludedRanges.length && document.excludedRanges[exclusionIndex].end <= range.start) exclusionIndex++;
    if (exclusionIndex < document.excludedRanges.length && document.excludedRanges[exclusionIndex].start < range.end) continue;
    if (endToken - firstToken < minWords) continue;
    if (document.tokens[firstToken].start < range.start || document.tokens[endToken - 1].end > range.end) continue;
    sentences.push({
      ...range,
      firstToken,
      endToken,
      key: JSON.stringify(document.tokens.slice(firstToken, endToken).map((token) => token.value)),
    });
  }
  return sentences;
}

function representativePassages(text: string, document: PreparedText, sentences: Sentence[]): RepeatResult["searchPassages"] {
  const count = Math.min(SEARCH_REVIEW_LIMITS.passages, sentences.length);
  const passages: RepeatResult["searchPassages"] = [];
  // Sample position, not a suspicion/risk score. Never launch or construct a search URL.
  for (let index = 0; index < count; index++) {
    const position = count === 1 ? 0 : Math.round((index * (sentences.length - 1)) / (count - 1));
    const sentence = sentences[position];
    const endToken = Math.min(sentence.endToken, sentence.firstToken + SEARCH_REVIEW_LIMITS.wordsPerPassage);
    const range = tokenRange(document, sentence.firstToken, endToken);
    passages.push({ id: `search-${range.start}-${range.end}`, text: text.slice(range.start, range.end), range, words: endToken - sentence.firstToken });
  }
  return passages;
}

/** Whole eligible sentences only. repeatedOccurrences counts copies AFTER each first. */
export function findRepeatedSentences(text: string, options: MatchOptions): RepeatResult {
  const checkedOptions = validateOptions(options);
  const document = prepareText(text, checkedOptions, "Document");
  const warnings = [
    "Only exact normalized whole-sentence repetitions in this document are grouped locally. No web search, AI detection, or authorship/plagiarism verdict is produced.",
    "Sentence boundaries use punctuation and line breaks, with Intl.Segmenter when available. Abbreviations and unusual punctuation need review; partly excluded sentences are never stitched together.",
    "Repeated occurrences counts copies beyond the first in each group, including groups omitted from review.",
    ...commonWarnings(checkedOptions),
  ];
  addEligibilityWarning(warnings, document, "Document", checkedOptions.minWords);
  const sentences = eligibleSentences(text, document, checkedOptions.minWords);
  const bySentence = new Map<string, { first: Sentence; occurrences: TextRange[] }>();
  for (const sentence of sentences) {
    let group = bySentence.get(sentence.key);
    if (!group) {
      group = { first: sentence, occurrences: [] };
      bySentence.set(sentence.key, group);
    }
    group.occurrences.push({ start: sentence.start, end: sentence.end });
  }
  const groups: RepeatResult["groups"] = [];
  const allRepeatedRanges: TextRange[] = [];
  let groupCount = 0;
  let repeatedOccurrences = 0;
  let omittedOccurrences = 0;
  for (const group of bySentence.values()) {
    const occurrenceCount = group.occurrences.length;
    if (occurrenceCount < 2) continue;
    groupCount++;
    repeatedOccurrences += occurrenceCount - 1;
    for (const range of group.occurrences) allRepeatedRanges.push(range);
    if (groups.length < SIMILARITY_LIMITS.repeatGroups) {
      groups.push({
        id: `repeat-${group.first.start}-${group.first.end}`,
        text: text.slice(group.first.start, group.first.end),
        words: group.first.endToken - group.first.firstToken,
        occurrences: group.occurrences.slice(0, SIMILARITY_LIMITS.occurrencesPerGroup),
        occurrenceCount,
      });
      omittedOccurrences += Math.max(0, occurrenceCount - SIMILARITY_LIMITS.occurrencesPerGroup);
    }
  }
  if (groupCount > groups.length) warnings.push(`${groupCount - groups.length} of ${groupCount} repeated-sentence groups are omitted from review (limit ${SIMILARITY_LIMITS.repeatGroups}). Totals and highlights still include them.`);
  if (omittedOccurrences > 0) warnings.push(`${omittedOccurrences} occurrence ranges in displayed groups are omitted from review (limit ${SIMILARITY_LIMITS.occurrencesPerGroup} per group). Occurrence counts and highlights remain complete.`);
  if (groupCount === 0) warnings.push(`No exact whole-sentence repetitions met the ${checkedOptions.minWords}-word minimum. This does not establish originality; short or partly excluded sentences are not grouped.`);
  const searchPassages = representativePassages(text, document, sentences);
  if (searchPassages.length > 0) warnings.push("Search passages are position-sampled eligible excerpts for optional manual review, not suspicious-text flags. They are returned only as text; no search is sent anywhere.");
  return {
    mode: "repeat",
    options: checkedOptions,
    stats: document.stats,
    groups,
    groupCount,
    repeatedOccurrences,
    excludedRanges: document.excludedRanges,
    matchRanges: mergeRanges(allRepeatedRanges),
    searchPassages,
    warnings,
  };
}

export function analyzeRequest(request: CheckRequest): SimilarityResult {
  if (!isRecord(request) || !Number.isSafeInteger(request.id) || request.id < 0) {
    throw new SimilarityInputError("A request needs a nonnegative safe-integer ID.");
  }
  if (request.mode === "compare") return compareSources(request.draft, request.sources, request.options);
  if (request.mode === "repeat") {
    // Retained sources are not compared in single-text mode, but every supplied
    // document must still obey the same input limits. A repeat-only UI can send [].
    validateSourceList(request.sources, false);
    const options = validateOptions(request.options);
    request.sources.forEach((source, index) => prepareText(source.text, options, `Source ${index + 1}`));
    return findRepeatedSentences(request.draft, options);
  }
  throw new SimilarityInputError("Choose compare or repeated-sentence mode.");
}