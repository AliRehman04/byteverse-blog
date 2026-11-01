export const WEB_CHECK_LIMITS = {
  minChars: 80,
  maxChars: 9000,
  minWordsPerSentence: 8,
  maxWordsPerSentence: 30,
  maxSentences: 12,
  maxSourcesPerSentence: 3,
  concurrency: 6,
} as const;

export type WebSearchHit = {
  url: string;
  title: string;
  snippets: string[];
};

export type WebSearchFn = (phrase: string) => Promise<WebSearchHit[]>;

export type SentenceStatus = "matched" | "not-found" | "unavailable";

export type SentenceSource = {
  url: string;
  title: string;
  hostname: string;
};

export type SentenceResult = {
  text: string;
  words: number;
  truncated: boolean;
  status: SentenceStatus;
  sources: SentenceSource[];
};

export type WebCheckReport = {
  score: number | null;
  matchedWords: number;
  checkedWords: number;
  totalWords: number;
  eligibleSentences: number;
  checkedSentences: number;
  unavailableSentences: number;
  sampled: boolean;
  sentences: SentenceResult[];
};

export type CheckSentence = {
  text: string;
  tokens: string[];
  truncated: boolean;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function tokenize(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['\u2018\u2019\u02bc]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function plainText(markup: string): string {
  return markup
    .replace(/<\/?(?:strong|em|b|i|mark|span)\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
      if (body.startsWith("#")) {
        const code =
          body[1] === "x" || body[1] === "X"
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    });
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/(?<=[.!?])\s+|(?<=[。！？۔])|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function selectCheckSentences(text: string): {
  picked: CheckSentence[];
  eligibleCount: number;
  totalWords: number;
} {
  const eligible: CheckSentence[] = [];
  for (const sentence of splitSentences(text)) {
    const tokens = tokenize(sentence);
    if (tokens.length < WEB_CHECK_LIMITS.minWordsPerSentence) continue;
    eligible.push({
      text: sentence,
      tokens: tokens.slice(0, WEB_CHECK_LIMITS.maxWordsPerSentence),
      truncated: tokens.length > WEB_CHECK_LIMITS.maxWordsPerSentence,
    });
  }
  const limit = WEB_CHECK_LIMITS.maxSentences;
  const picked =
    eligible.length <= limit
      ? eligible
      : Array.from({ length: limit }, (_, index) => eligible[Math.floor((index * eligible.length) / limit)]);
  return { picked, eligibleCount: eligible.length, totalWords: tokenize(text).length };
}

export function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return false;
  const lastStart = haystack.length - needle.length;
  for (let start = 0; start <= lastStart; start += 1) {
    let offset = 0;
    while (offset < needle.length && haystack[start + offset] === needle[offset]) offset += 1;
    if (offset === needle.length) return true;
  }
  return false;
}

function sourceFromHit(hit: WebSearchHit): SentenceSource | null {
  let parsed: URL;
  try {
    parsed = new URL(hit.url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const title = plainText(hit.title).replace(/\s+/g, " ").trim().slice(0, 160);
  return { url: parsed.href, title: title || parsed.hostname, hostname: parsed.hostname };
}

async function checkSentence(sentence: CheckSentence, search: WebSearchFn): Promise<SentenceResult> {
  const base = { text: sentence.text, words: sentence.tokens.length, truncated: sentence.truncated };
  let hits: WebSearchHit[];
  try {
    hits = await search(sentence.tokens.join(" "));
  } catch {
    return { ...base, status: "unavailable", sources: [] };
  }

  const sources: SentenceSource[] = [];
  for (const hit of hits) {
    if (sources.length >= WEB_CHECK_LIMITS.maxSourcesPerSentence) break;
    const found = [hit.title, ...hit.snippets].some((excerpt) =>
      containsSequence(tokenize(plainText(excerpt)), sentence.tokens),
    );
    const source = found ? sourceFromHit(hit) : null;
    if (source && !sources.some((existing) => existing.url === source.url)) sources.push(source);
  }
  return { ...base, status: sources.length > 0 ? "matched" : "not-found", sources };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function runWebCheck(text: string, search: WebSearchFn): Promise<WebCheckReport> {
  const { picked, eligibleCount, totalWords } = selectCheckSentences(text);
  const sentences = await mapWithConcurrency(picked, WEB_CHECK_LIMITS.concurrency, (sentence) =>
    checkSentence(sentence, search),
  );
  const checked = sentences.filter((sentence) => sentence.status !== "unavailable");
  const checkedWords = checked.reduce((sum, sentence) => sum + sentence.words, 0);
  const matchedWords = checked
    .filter((sentence) => sentence.status === "matched")
    .reduce((sum, sentence) => sum + sentence.words, 0);

  return {
    score: checkedWords > 0 ? Math.round((matchedWords / checkedWords) * 100) : null,
    matchedWords,
    checkedWords,
    totalWords,
    eligibleSentences: eligibleCount,
    checkedSentences: checked.length,
    unavailableSentences: sentences.length - checked.length,
    sampled: picked.length < eligibleCount,
    sentences,
  };
}
