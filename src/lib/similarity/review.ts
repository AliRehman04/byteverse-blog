import type { MatchingPassage, ReviewNote, TextRange } from "./types";

export type EvidenceStatus = "all" | ReviewNote["status"];
export type EvidenceOrder = "document" | "longest" | "source";

export function selectPassages(passages: readonly MatchingPassage[], reviews: Record<string, ReviewNote>, sourceIds: readonly string[], sourceId: string, status: EvidenceStatus, order: EvidenceOrder): MatchingPassage[] {
  const sourceOrder = new Map(sourceIds.map((id, index) => [id, index]));
  return passages.filter((passage) => (sourceId === "all" || passage.sourceId === sourceId)
    && (status === "all" || (reviews[passage.id]?.status ?? "unreviewed") === status)).sort((a, b) => {
    const sourceDifference = (sourceOrder.get(a.sourceId) ?? 0) - (sourceOrder.get(b.sourceId) ?? 0);
    if (order === "longest" && a.words !== b.words) return b.words - a.words;
    if (order === "source" && sourceDifference) return sourceDifference;
    return a.draft.start - b.draft.start || b.words - a.words || sourceDifference;
  });
}

export function passageContext(text: string, range: TextRange): { before: string; match: string; after: string; leading: boolean; trailing: boolean; shortened: boolean } {
  const valid = Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end >= range.start && range.end <= text.length;
  if (!valid) throw new Error("The selected passage is outside the document.");
  let start = Math.max(0, range.start - 140);
  let end = Math.min(text.length, range.end + 140);
  let matchEnd = Math.min(range.end, range.start + 1_200);
  if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start]) && /[\uD800-\uDBFF]/.test(text[start - 1])) start++;
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end--;
  if (matchEnd < range.end && /[\uD800-\uDBFF]/.test(text[matchEnd - 1]) && /[\uDC00-\uDFFF]/.test(text[matchEnd])) matchEnd--;
  return {
    before: text.slice(start, range.start),
    match: text.slice(range.start, matchEnd),
    after: text.slice(range.end, end),
    leading: start > 0,
    trailing: end < text.length,
    shortened: matchEnd < range.end,
  };
}