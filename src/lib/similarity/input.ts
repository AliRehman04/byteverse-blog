import { getInputStats } from "./engine";
import { SIMILARITY_LIMITS } from "./types";

export function inputProblem(text: string): string | null {
  if (text.length > SIMILARITY_LIMITS.maxChars) return "Use at most 60,000 characters per text. Nothing is truncated.";
  const { words } = getInputStats(text);
  if (words > SIMILARITY_LIMITS.maxWords) return "Use at most 10,000 words per text. Shorten this text before checking.";
  if (!words) return "Add text containing words, not just punctuation.";
  return null;
}

export async function readTextFile(file: Pick<File, "name" | "size" | "arrayBuffer">): Promise<string> {
  if (!/\.(txt|md)$/i.test(file.name)) throw new Error("Choose a UTF-8 .txt or .md file. PDF and Word files are not supported; copy their text instead.");
  if (file.size > SIMILARITY_LIMITS.fileBytes) throw new Error("This file exceeds 256 KB. Import a smaller text file; nothing was replaced.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error("This file could not be read as UTF-8 text. Export a UTF-8 text copy and try again.");
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error("This appears to contain binary data, not a plain text document.");
  const problem = inputProblem(text);
  if (problem) throw new Error(problem);
  return text;
}

export function manualSearchUrl(phrase: string): { phrase: string; url: string; shortened: boolean } {
  const clean = phrase.replace(/["“”«»]/g, " ").replace(/\s+/g, " ").trim();
  const points = Array.from(clean);
  let excerpt = points.slice(0, 180).join("");
  if (points.length > 180 && excerpt.includes(" ")) excerpt = excerpt.slice(0, excerpt.lastIndexOf(" "));
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", `"${excerpt}"`);
  return { phrase: excerpt, url: url.href, shortened: excerpt !== clean };
}