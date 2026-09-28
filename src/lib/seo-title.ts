export const PREVIEW_FONT = "400 20px Arial, sans-serif";
export const TITLE_INPUT_LIMIT = 300;
export const BRAND_INPUT_LIMIT = 60;
export const KEYWORD_INPUT_LIMIT = 120;
export const DESCRIPTION_INPUT_LIMIT = 500;

// These are preview design choices, not Google limits.
export const PREVIEW_MODELS = {
  desktop: { width: 580, lines: 1, label: "Desktop" },
  mobile: { width: 360, lines: 2, label: "Mobile" },
} as const;

export type PreviewDevice = keyof typeof PREVIEW_MODELS;
export type TitleSeparator = " | " | " - " | " · ";
export type MeasureText = (text: string) => number;

export interface TitleDraft {
  title: string;
  brand: string;
  separator: TitleSeparator;
  keyword: string;
}

export interface TitleCheck {
  id: string;
  label: string;
  status: "ok" | "review" | "info";
  note: string;
}

const segmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("en", { granularity: "grapheme" })
  : null;

export function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
}

export function normalizeTitle(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

export function buildFullTitle(draft: TitleDraft): string {
  const title = normalizeTitle(draft.title);
  const brand = normalizeTitle(draft.brand);
  return title ? `${title}${brand ? draft.separator + brand : ""}` : "";
}

export function titleWords(text: string): string[] {
  return text.match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu) || [];
}

export function hasLiteralPhrase(text: string, phrase: string): boolean {
  const normalized = normalizeTitle(phrase).normalize("NFC");
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escaped}(?![\\p{L}\\p{M}\\p{N}])`, "iu").test(normalizeTitle(text).normalize("NFC"));
}

export function analyzeTitle(draft: TitleDraft) {
  const core = normalizeTitle(draft.title);
  const brand = normalizeTitle(draft.brand);
  const keyword = normalizeTitle(draft.keyword);
  const fullTitle = buildFullTitle(draft);
  const words = titleWords(core);
  const stopWords = new Set(["the", "and", "for", "with", "from", "your", "that", "this", "are", "how", "into"]);
  const frequency = new Map<string, number>();
  for (const word of words) {
    const key = word.normalize("NFC").toLowerCase();
    if (key.length > 2 && !stopWords.has(key)) frequency.set(key, (frequency.get(key) || 0) + 1);
  }
  const repeated = [...frequency].filter(([, count]) => count >= 3).map(([word]) => word);
  const keywordMatch = keyword ? hasLiteralPhrase(core, keyword) : null;
  const duplicateBrand = Boolean(brand && hasLiteralPhrase(core, brand));
  const generic = /^(home|untitled|welcome|page|blog|products|services|article)$/i.test(core);
  const checks: TitleCheck[] = [
    {
      id: "specific",
      label: "Page-specific wording",
      status: !core || generic ? "review" : "info",
      note: !core ? "Add the page topic before checking or copying a title." : generic ? "Name the topic or task instead of using a generic page label." : "Does this title describe this page, rather than every page on the site? Only you can verify the promise.",
    },
    {
      id: "keyword",
      label: "Target phrase in main title",
      status: !keyword || !core ? "info" : keywordMatch ? "ok" : "review",
      note: !keyword ? "Optional: add a target phrase to check a literal match. No keyword research is performed on your input." : !core ? "Enter a title to compare with the target phrase." : keywordMatch ? "Literal match found, ignoring case. This does not establish search intent or ranking potential." : "No literal match found. A natural synonym may still be appropriate; do not force the phrase in.",
    },
    {
      id: "repetition",
      label: "Repeated words",
      status: repeated.length ? "review" : "ok",
      note: repeated.length ? `Used three or more times: ${repeated.join(", ")}. Review unnecessary repetition.` : "No long word appears three times in the main title after common English words are excluded. This is a simple writing check.",
    },
    {
      id: "brand",
      label: "Brand suffix",
      status: duplicateBrand ? "review" : "info",
      note: duplicateBrand ? "The brand already appears in the main title. Remove the extra suffix if it is redundant." : brand ? "The separator and brand are included in the full character and pixel counts. Keep branding concise." : "No brand added. Branding is optional; it is not required for a good title.",
    },
  ];

  return {
    core, fullTitle, words: words.length, characters: graphemes(fullTitle).length,
    coreCharacters: graphemes(core).length, repeated, keywordMatch, duplicateBrand, checks,
    reviewCount: checks.filter(check => check.status === "review").length,
  };
}

export interface TitleLayout {
  lines: string[];
  truncated: boolean;
  fullWidth: number;
}

export function layoutTitle(text: string, width: number, maxLines: number, measure: MeasureText): TitleLayout {
  const normalized = normalizeTitle(text);
  const fullWidth = measure(normalized);
  if (!normalized) return { lines: [], truncated: false, fullWidth: 0 };
  if (width <= 0 || maxLines < 1) return { lines: [], truncated: true, fullWidth };
  const lines: string[] = [];
  let rest = normalized;
  for (let line = 0; line < maxLines && rest; line++) {
    if (measure(rest) <= width) { lines.push(rest); rest = ""; break; }
    const parts = graphemes(rest);
    const lastLine = line === maxLines - 1;
    const suffix = lastLine ? "…" : "";
    if (measure(suffix) > width) break;
    let low = 0;
    let high = parts.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (measure(parts.slice(0, middle).join("") + suffix) <= width) low = middle;
      else high = middle - 1;
    }
    if (lastLine) { lines.push(parts.slice(0, low).join("").trimEnd() + suffix); break; }
    if (low === 0) break;
    const prefix = parts.slice(0, low).join("");
    const lastSpace = prefix.lastIndexOf(" ");
    const splitAtSpace = lastSpace > 0 && parts[low] !== " ";
    const lineText = splitAtSpace ? prefix.slice(0, lastSpace) : prefix;
    lines.push(lineText.trimEnd());
    rest = rest.slice(lineText.length).trimStart();
  }
  return { lines, truncated: Boolean(rest), fullWidth };
}

export function escapeTitleHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function titleTag(draft: TitleDraft): string {
  const fullTitle = buildFullTitle(draft);
  return fullTitle ? `<title>${escapeTitleHtml(fullTitle)}</title>` : "";
}

export function previewAddress(value: string) {
  if (!value.trim()) return { host: "example.com", path: "/your-page", valid: true };
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid preview URL");
    return { host: url.host, path: url.pathname || "/", valid: true };
  } catch {
    return { host: "example.com", path: "/your-page", valid: false };
  }
}

export const titleExamples = [
  { label: "How-to", title: "How to Compress a JPG to Under 100KB", brand: "ByteVerse", keyword: "compress a jpg", separator: " | " as const, description: "Adjust image quality and dimensions, then check the file size before downloading your compressed photo." },
  { label: "Product", title: "Canvas Tote Bag with Zip & Inside Pocket", brand: "North Studio", keyword: "canvas tote bag", separator: " - " as const, description: "A zip-top canvas tote with an inside pocket. Check the dimensions, materials and available colors." },
  { label: "Comparison", title: "JSON vs YAML: Syntax, Comments & Use Cases", brand: "ByteVerse", keyword: "json vs yaml", separator: " | " as const, description: "Compare readable examples of JSON and YAML, including comments, nesting and configuration use cases." },
  { label: "Overlong", title: "SEO Title Checker: Check Your SEO Title Length, SEO Title Keywords and SEO Title Examples for Every Page", brand: "ByteVerse", keyword: "seo title checker", separator: " | " as const, description: "Use this deliberately repetitive example to see how wording and available space affect the preview." },
];